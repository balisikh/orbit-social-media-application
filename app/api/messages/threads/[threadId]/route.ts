import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDmThreadIfParticipant } from "@/lib/messages/server-queries";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ threadId: string }> };

export async function DELETE(_request: Request, context: Ctx) {
  const { threadId } = await context.params;
  if (!uuidRe.test(threadId)) return NextResponse.json({ error: "Invalid thread." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const thread = await getDmThreadIfParticipant(supabase, threadId, user.id);
  if (!thread) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { error } = await supabase.from("dm_threads").delete().eq("id", threadId);
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });

  return NextResponse.json({ ok: true });
}
