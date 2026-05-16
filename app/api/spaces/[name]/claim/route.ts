import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimSpaceSchema } from "@/lib/schemas/space.schema";
import { claimRateLimiter } from "@/lib/rate-limit";
import { verifyClaimToken } from "@/lib/claim-token";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { success } = await claimRateLimiter.limit(user.id);
  if (!success) {
    return NextResponse.json(
      { error: "Too many claims. Try again tomorrow." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = claimSpaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: space } = await admin
    .from("spaces")
    .select("id, owner_id, claim_token_hash, expires_at")
    .eq("name", name.toLowerCase())
    .single();

  if (!space) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (new Date(space.expires_at) < new Date()) {
    return NextResponse.json({ error: "Space expired" }, { status: 404 });
  }

  if (space.owner_id) {
    return NextResponse.json({ error: "Space already claimed" }, { status: 409 });
  }

  if (!space.claim_token_hash || !verifyClaimToken(parsed.data.token, space.claim_token_hash)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const { data: updated, error } = await admin
    .from("spaces")
    .update({ owner_id: user.id, claim_token_hash: null })
    .eq("id", space.id)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Failed to claim space" }, { status: 500 });
  }

  const { password_hash: _, claim_token_hash: __, ...safeSpace } = updated;
  return NextResponse.json(safeSpace);
}
