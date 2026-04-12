import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readRateLimiter, uploadRateLimiter } from "@/lib/rate-limit";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_SPACE,
  MAX_SPACE_STORAGE_BYTES,
} from "@/lib/constants";

const fileMetadataSchema = z.object({
  filename: z.string().min(1).max(255),
  storage_path: z.string().min(1),
  mime_type: z
    .string()
    .refine((v) => ALLOWED_MIME_TYPES.includes(v), "File type not allowed"),
  size_bytes: z
    .number()
    .positive()
    .max(MAX_FILE_SIZE_BYTES, "File too large (max 10MB)"),
  space_id: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") ?? "anonymous";
  const { success } = await uploadRateLimiter.limit(ip);

  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { name } = await params;
  const body = await request.json();
  const parsed = fileMetadataSchema.safeParse(body);

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
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  const isOwner = space.owner_id === user.id;
  if (space.is_locked && !isOwner) {
    return NextResponse.json({ error: "Space is locked" }, { status: 403 });
  }

  const { data: existingFiles } = await supabase
    .from("files")
    .select("size_bytes")
    .eq("space_id", space.id);

  const fileCount = existingFiles?.length ?? 0;
  if (fileCount >= MAX_FILES_PER_SPACE) {
    return NextResponse.json(
      { error: `File limit reached (max ${MAX_FILES_PER_SPACE} files per space)` },
      { status: 413 }
    );
  }

  const currentTotal = existingFiles?.reduce((sum, f) => sum + f.size_bytes, 0) ?? 0;
  if (currentTotal + parsed.data.size_bytes > MAX_SPACE_STORAGE_BYTES) {
    return NextResponse.json(
      { error: "Space storage limit exceeded (max 50MB total)" },
      { status: 413 }
    );
  }

  const { data, error } = await supabase
    .from("files")
    .insert({
      space_id: space.id,
      filename: parsed.data.filename,
      storage_path: parsed.data.storage_path,
      mime_type: parsed.data.mime_type,
      size_bytes: parsed.data.size_bytes,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(
  _request: Request,
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

  const { data: space } = await supabase
    .from("spaces")
    .select("id")
    .eq("name", name.toLowerCase())
    .single();

  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  const { data: files, error } = await supabase
    .from("files")
    .select("*")
    .eq("space_id", space.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(files);
}
