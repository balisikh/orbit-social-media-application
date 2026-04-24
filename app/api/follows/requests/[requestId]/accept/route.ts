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

  const { error } = await supabase.rpc("orbit_accept_follow_request", { request_id: id });
  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("not_found")) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }
    if (msg.includes("not_pending") || msg.includes("no_data")) {
      return NextResponse.json({ error: "Request is no longer pending." }, { status: 409 });
    }
    if (msg.includes("forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
