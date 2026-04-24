import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDmThreadIfParticipant, insertDmMessage, listDmMessages } from "@/lib/messages/server-queries";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ threadId: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { threadId } = await context.params;
  if (!uuidRe.test(threadId)) return NextResponse.json({ error: "Invalid thread." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const thread = await getDmThreadIfParticipant(supabase, threadId, user.id);
  if (!thread) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const messages = await listDmMessages(supabase, threadId);
  return NextResponse.json({ messages, viewerId: user.id });
}

type PostBody = { body?: string | null };

export async function POST(request: Request, context: Ctx) {
  const { threadId } = await context.params;
  if (!uuidRe.test(threadId)) return NextResponse.json({ error: "Invalid thread." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const thread = await getDmThreadIfParticipant(supabase, threadId, user.id);
  if (!thread) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body : "";
  const row = await insertDmMessage(supabase, threadId, user.id, text);
  if (!row) {
    return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  }

  return NextResponse.json({ message: row });
}
