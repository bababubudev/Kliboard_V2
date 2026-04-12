import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createSpaceSchema } from "@/lib/schemas/space.schema";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeRateLimiter } from "@/lib/rate-limit";
import { addMinutes } from "date-fns";
import { MAX_SPACE_STORAGE_BYTES } from "@/lib/constants";

async function insertFiles(
  spaceId: string,
  files: { filename: string; storage_path: string; mime_type: string; size_bytes: number }[]
) {
  const totalSize = files.reduce((sum, f) => sum + f.size_bytes, 0);
  if (totalSize > MAX_SPACE_STORAGE_BYTES) return;

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

  if (error) throw new Error(error.message);
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

  const expiresAt = addMinutes(new Date(), duration).toISOString();
  const normalizedName = name.toLowerCase();

  const insertPayload = {
    name: normalizedName,
    content,
    duration,
    expires_at: expiresAt,
    is_locked: true,
    owner_id: user?.id ?? null,
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
        await admin.storage
          .from("space-files")
          .remove(oldFiles.map((f) => f.storage_path));
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

      return NextResponse.json(retryData, { status: 201 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (files?.length && data) {
    await insertFiles(data.id, files);
  }

  return NextResponse.json(data, { status: 201 });
}
