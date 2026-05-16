import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
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
    .select("id, owner_id, is_locked")
    .eq("name", name.toLowerCase())
    .single();

  if (!space) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (space.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("spaces")
    .update({ is_locked: !space.is_locked })
    .eq("id", space.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to update lock state" }, { status: 500 });
  }

  const { password_hash: _, claim_token_hash: __, ...safeSpace } = data;
  return NextResponse.json(safeSpace);
}
