import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { addMinutes } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { updateSpaceSchema } from "@/lib/schemas/space.schema";
import { readRateLimiter, updateRateLimiter } from "@/lib/rate-limit";

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

  const { data: space, error } = await supabase
    .from("spaces")
    .select("*")
    .eq("name", name.toLowerCase())
    .single();

  if (error || !space) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (new Date(space.expires_at) < new Date()) {
    await supabase.from("spaces").delete().eq("id", space.id);
    const { data: files } = await supabase
      .from("files")
      .select("storage_path")
      .eq("space_id", space.id);

    if (files?.length) {
      await supabase.storage
        .from("space-files")
        .remove(files.map((f) => f.storage_path));
    }
    return NextResponse.json({ error: "Space expired" }, { status: 404 });
  }

  const { password_hash: _, ...safeSpace } = space;
  return NextResponse.json(safeSpace);
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

  const { data: space } = await supabase
    .from("spaces")
    .select("id, owner_id, is_locked")
    .eq("name", name.toLowerCase())
    .single();

  if (!space) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = space.owner_id === user.id;
  if (space.is_locked && !isOwner) {
    return NextResponse.json({ error: "Space is locked" }, { status: 403 });
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
    updateData.duration = parsed.data.duration;
    updateData.expires_at = addMinutes(
      new Date(),
      parsed.data.duration
    ).toISOString();
  }

  const { data, error } = await supabase
    .from("spaces")
    .update(updateData)
    .eq("name", name.toLowerCase())
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { password_hash: _, ...safeSpace } = data;
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

  const { data: space } = await supabase
    .from("spaces")
    .select("id, owner_id")
    .eq("name", name.toLowerCase())
    .single();

  if (!space) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (space.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: files } = await supabase
    .from("files")
    .select("storage_path")
    .eq("space_id", space.id);

  if (files?.length) {
    await supabase.storage
      .from("space-files")
      .remove(files.map((f) => f.storage_path));
  }

  const { error } = await supabase
    .from("spaces")
    .delete()
    .eq("id", space.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
