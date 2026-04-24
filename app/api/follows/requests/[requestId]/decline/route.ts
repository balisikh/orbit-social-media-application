import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ requestId: string }> };

export async function POST(_request: Request, context: Ctx) {
  const { requestId } = await context.params;
  const id = typeof requestId === "string" ? requestId.trim() : "";
  if (!id) return NextResponse.json({ error: "requestId required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("follow_requests")
    .update({ status: "declined", resolved_at: now })
    .eq("id", id)
    .eq("followed_id", user.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  if (!data) return NextResponse.json({ error: "Request is no longer pending." }, { status: 409 });

  return NextResponse.json({ ok: true });
}
