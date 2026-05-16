import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createSpaceSchema } from "@/lib/schemas/space.schema";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeRateLimiter, anonCreateRateLimiter } from "@/lib/rate-limit";
import { generateClaimToken, hashClaimToken } from "@/lib/claim-token";
import { addMinutes } from "date-fns";
import {
  GLOBAL_ANON_SPACE_CAP,
  MAX_ANON_DURATION_MINUTES,
  MAX_SPACE_STORAGE_BYTES,
} from "@/lib/constants";

async function removeStorage(paths: string[]) {
  if (!paths.length) return;
  const admin = createAdminClient();
  const { error } = await admin.storage.from("space-files").remove(paths);
  if (error) console.error("storage.remove failed", { paths, error });
}

async function insertFiles(
  spaceId: string,
  files: { filename: string; storage_path: string; mime_type: string; size_bytes: number }[]
) {
  const totalSize = files.reduce((sum, f) => sum + f.size_bytes, 0);
  if (totalSize > MAX_SPACE_STORAGE_BYTES) {
    await removeStorage(files.map((f) => f.storage_path));
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("files").insert(
    files.map((f) => ({
      space_id: spaceId,
      filename: f.filename,
      storage_path: f.storage_path,
      mime_type: f.mime_type,
      size_bytes: f.size_bytes,
    }))
  );

  if (error) {
    await removeStorage(files.map((f) => f.storage_path));
    throw new Error(error.message);
  }
}

export async function POST(request: Request) {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") ?? "anonymous";
  const { success } = await writeRateLimiter.limit(ip);

  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = createSpaceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, content, duration, files } = parsed.data;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && duration > MAX_ANON_DURATION_MINUTES) {
    return NextResponse.json(
      { error: "Sign in to keep spaces longer than 1 day" },
      { status: 403 }
    );
  }

  if (!user) {
    const { success: anonOk } = await anonCreateRateLimiter.limit(ip);
    if (!anonOk) {
      return NextResponse.json(
        {
          error:
            "Anonymous users can create up to 5 spaces per day. Sign in for higher limits.",
        },
        { status: 429 }
      );
    }

    const admin = createAdminClient();
    const { count } = await admin
      .from("spaces")
      .select("id", { count: "exact", head: true })
      .is("owner_id", null)
      .gt("expires_at", new Date().toISOString());

    if ((count ?? 0) >= GLOBAL_ANON_SPACE_CAP) {
      return NextResponse.json(
        {
          error:
            "Service is at capacity for guest spaces. Sign in or try again later.",
        },
        { status: 503 }
      );
    }
  }

  const claimToken = user ? null : generateClaimToken();
  const claimTokenHash = claimToken ? hashClaimToken(claimToken) : null;

  const expiresAt = addMinutes(new Date(), duration).toISOString();
  const normalizedName = name.toLowerCase();

  const insertPayload = {
    name: normalizedName,
    content,
    duration,
    expires_at: expiresAt,
    is_locked: true,
    owner_id: user?.id ?? null,
    claim_token_hash: claimTokenHash,
  };

  const { data, error } = await supabase
    .from("spaces")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      const admin = createAdminClient();
      const { data: existing } = await admin
        .from("spaces")
        .select("id")
        .eq("name", normalizedName)
        .lt("expires_at", new Date().toISOString())
        .single();

      if (!existing) {
        return NextResponse.json(
          { error: "A space with this name already exists" },
          { status: 409 }
        );
      }

      const { data: oldFiles } = await admin
        .from("files")
        .select("storage_path")
        .eq("space_id", existing.id);

      if (oldFiles?.length) {
        await removeStorage(oldFiles.map((f) => f.storage_path));
      }

      const { error: deleteError } = await admin
        .from("spaces")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        return NextResponse.json(
          { error: "A space with this name already exists" },
          { status: 409 }
        );
      }

      const { data: retryData, error: retryError } = await supabase
        .from("spaces")
        .insert(insertPayload)
        .select()
        .single();

      if (retryError) {
        return NextResponse.json(
          { error: "A space with this name already exists" },
          { status: 409 }
        );
      }

      if (files?.length && retryData) {
        await insertFiles(retryData.id, files);
      }

      const { claim_token_hash: _retryHash, ...safeRetry } = retryData;
      return NextResponse.json(
        claimToken ? { ...safeRetry, claim_token: claimToken } : safeRetry,
        { status: 201 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (files?.length && data) {
    await insertFiles(data.id, files);
  }

  const { claim_token_hash: _hash, ...safeData } = data;
  return NextResponse.json(
    claimToken ? { ...safeData, claim_token: claimToken } : safeData,
    { status: 201 }
  );
}
