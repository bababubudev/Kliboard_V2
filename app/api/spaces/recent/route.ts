import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { readRateLimiter } from "@/lib/rate-limit";

export async function GET() {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") ?? "anonymous";
  const { success } = await readRateLimiter.limit(ip);

  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("spaces")
    .select("id, name, content, duration, expires_at, created_at, updated_at, owner_id, is_locked, files(count)")
    .gt("expires_at", new Date().toISOString())
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = data.map(({ files, ...space }) => ({
    ...space,
    file_count: files[0]?.count ?? 0,
  }));

  return NextResponse.json(result);
}
