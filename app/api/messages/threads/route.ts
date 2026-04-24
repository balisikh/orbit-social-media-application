import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDmThreadIfParticipant,
  getOrCreateDmThreadRpc,
  getPeerProfileForThread,
  listDmThreadsForViewer,
  resolveDmPeerId,
} from "@/lib/messages/server-queries";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const threads = await listDmThreadsForViewer(supabase, user.id);
  return NextResponse.json({ threads });
}

type PostBody = {
  peerHandle?: string | null;
  peerUserId?: string | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const resolved = await resolveDmPeerId(supabase, {
    peerHandle: body.peerHandle,
    peerUserId: body.peerUserId,
  });
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  if (resolved.peerId === user.id) {
    return NextResponse.json({ error: "Cannot message yourself." }, { status: 400 });
  }

  const created = await getOrCreateDmThreadRpc(supabase, resolved.peerId);
  if ("error" in created) {
    return NextResponse.json({ error: created.error }, { status: 422 });
  }

  const thread = await getDmThreadIfParticipant(supabase, created.threadId, user.id);
  if (!thread) return NextResponse.json({ error: "Thread not found." }, { status: 404 });

  const peer = await getPeerProfileForThread(supabase, thread, user.id);
  return NextResponse.json({
    thread: {
      id: thread.id,
      peer: {
        id: peer?.id ?? resolved.peerId,
        handle: peer?.handle ?? null,
        display_name: peer?.display_name ?? null,
      },
    },
  });
}
