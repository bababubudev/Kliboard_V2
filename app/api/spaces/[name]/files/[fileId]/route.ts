import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string; fileId: string }> }
) {
  const { fileId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: file } = await supabase
    .from("files")
    .select("id, storage_path, space_id")
    .eq("id", fileId)
    .single();

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const { data: space } = await supabase
    .from("spaces")
    .select("owner_id")
    .eq("id", file.space_id)
    .single();

  if (!space || space.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: deleted, error } = await supabase
    .from("files")
    .delete()
    .eq("id", file.id)
    .select()
    .single();

  if (error || !deleted) {
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }

  await supabase.storage.from("space-files").remove([file.storage_path]);

  return NextResponse.json({ deleted: true });
}
