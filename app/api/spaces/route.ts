import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createSpaceSchema } from "@/lib/schemas/space.schema";
import { createClient } from "@/lib/supabase/server";
import { writeRateLimiter } from "@/lib/rate-limit";
import { addMinutes } from "date-fns";

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

  const { name, content, duration } = parsed.data;
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
      const { error: deleteError } = await supabase
        .from("spaces")
        .delete()
        .eq("name", normalizedName)
        .lt("expires_at", new Date().toISOString());

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

      return NextResponse.json(retryData, { status: 201 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
