import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { addMinutes } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateSpaceSchema } from "@/lib/schemas/space.schema";
import { readRateLimiter, updateRateLimiter } from "@/lib/rate-limit";
import { isAdmin } from "@/lib/admin";
import { MAX_ANON_DURATION_MINUTES } from "@/lib/constants";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") ?? "anonymous";
  const { success } = await readRateLimiter.limit(ip);

  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { name } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIsAdmin = user ? await isAdmin(user.id) : false;

  const client = userIsAdmin ? createAdminClient() : supabase;
  const { data: space, error } = await client
    .from("spaces")
    .select("*")
    .eq("name", name.toLowerCase())
    .single();

  if (error || !space) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (new Date(space.expires_at) < new Date() && !userIsAdmin) {
    const admin = createAdminClient();
    const { data: files } = await admin
      .from("files")
      .select("storage_path")
      .eq("space_id", space.id);

    if (files?.length) {
      const paths = files.map((f) => f.storage_path);
      const { error: removeError } = await admin.storage
        .from("space-files")
        .remove(paths);
      if (removeError) {
        console.error("storage.remove failed (lazy delete)", { paths, removeError });
      }
    }

    await admin.from("spaces").delete().eq("id", space.id);
    return NextResponse.json({ error: "Space expired" }, { status: 404 });
  }

  const { password_hash: _, claim_token_hash: __, ...safeSpace } = space;
  return NextResponse.json({ ...safeSpace, is_admin: userIsAdmin });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") ?? "anonymous";
  const { success } = await updateRateLimiter.limit(ip);

  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { name } = await params;
  const body = await request.json();
  const parsed = updateSpaceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userIsAdmin = await isAdmin(user.id);

  const admin = createAdminClient();
  const { data: space } = await admin
    .from("spaces")
    .select("id, owner_id, is_locked")
    .eq("name", name.toLowerCase())
    .single();

  if (!space) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!userIsAdmin) {
    const isOwner = space.owner_id === user.id;
    if (space.is_locked && !isOwner) {
      return NextResponse.json({ error: "Space is locked" }, { status: 403 });
    }
  }

  const updateData: {
    content?: string;
    duration?: number;
    expires_at?: string;
  } = {};
  if (parsed.data.content !== undefined) {
    updateData.content = parsed.data.content;
  }
  if (parsed.data.duration !== undefined) {
    if (parsed.data.duration === 0 && !userIsAdmin) {
      return NextResponse.json({ error: "Unlimited duration requires admin" }, { status: 403 });
    }
    if (
      !space.owner_id &&
      !userIsAdmin &&
      parsed.data.duration > MAX_ANON_DURATION_MINUTES
    ) {
      return NextResponse.json(
        { error: "Guest spaces are limited to 1 day" },
        { status: 403 }
      );
    }
    updateData.duration = parsed.data.duration;
    updateData.expires_at =
      parsed.data.duration === 0
        ? "9999-12-31T23:59:59.999Z"
        : addMinutes(new Date(), parsed.data.duration).toISOString();
  }

  const { data, error } = await admin
    .from("spaces")
    .update(updateData)
    .eq("name", name.toLowerCase())
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { password_hash: _, claim_token_hash: __, ...safeSpace } = data;
  return NextResponse.json(safeSpace);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIsAdmin = await isAdmin(user.id);
  const admin = createAdminClient();

  const { data: space } = await admin
    .from("spaces")
    .select("id, owner_id")
    .eq("name", name.toLowerCase())
    .single();

  if (!space) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (space.owner_id !== user.id && !userIsAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: files } = await admin
    .from("files")
    .select("storage_path")
    .eq("space_id", space.id);

  if (files?.length) {
    const paths = files.map((f) => f.storage_path);
    const { error: removeError } = await admin.storage
      .from("space-files")
      .remove(paths);
    if (removeError) {
      console.error("storage.remove failed (DELETE space)", { paths, removeError });
    }
  }

  const { error } = await admin
    .from("spaces")
    .delete()
    .eq("id", space.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
