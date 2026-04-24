import type { SupabaseClient } from "@supabase/supabase-js";
import type { DmMessageRow, DmThreadRow, DmThreadSummary } from "@/lib/messages/dm-types";
import { getProfileByHandle, getProfileByUserId } from "@/lib/profiles/queries";

function peerIdForThread(t: DmThreadRow, viewerId: string): string {
  return t.user_low === viewerId ? t.user_high : t.user_low;
}

/**
 * Threads the viewer participates in, newest activity first, with peer profile + last message preview.
 */
export async function listDmThreadsForViewer(
  supabase: SupabaseClient,
  viewerId: string,
  opts?: { limit?: number },
): Promise<DmThreadSummary[]> {
  const limit = opts?.limit ?? 40;
  const { data: threads, error } = await supabase
    .from("dm_threads")
    .select("id, user_low, user_high, created_at, updated_at")
    .or(`user_low.eq.${viewerId},user_high.eq.${viewerId}`)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !threads?.length) return [];

  const typed = threads as DmThreadRow[];
  const threadIds = typed.map((t) => t.id);
  const peerIds = Array.from(new Set(typed.map((t) => peerIdForThread(t, viewerId))));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .in("id", peerIds);

  const profileById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      { handle: (p as { handle: string | null }).handle, display_name: (p as { display_name: string | null }).display_name },
    ]),
  );

  const { data: recentMsgs } = await supabase
    .from("dm_messages")
    .select("thread_id, body, created_at")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false })
    .limit(500);

  const lastByThread = new Map<string, { body: string; created_at: string }>();
  for (const m of recentMsgs ?? []) {
    const tid = (m as { thread_id: string }).thread_id;
    if (!lastByThread.has(tid)) {
      lastByThread.set(tid, { body: (m as { body: string }).body, created_at: (m as { created_at: string }).created_at });
    }
  }

  return typed.map((t) => {
    const peer_id = peerIdForThread(t, viewerId);
    const prof = profileById.get(peer_id);
    const last = lastByThread.get(t.id);
    const peer_handle = prof?.handle ?? null;
    const peer_display_name = prof?.display_name ?? null;
    const last_preview = last?.body?.trim() ? last.body.trim().slice(0, 120) : "No messages yet.";
    return {
      ...t,
      peer_id,
      peer_handle,
      peer_display_name,
      last_preview,
      last_at: last?.created_at ?? null,
    } satisfies DmThreadSummary;
  });
}

export async function listDmMessages(
  supabase: SupabaseClient,
  threadId: string,
  opts?: { limit?: number },
): Promise<DmMessageRow[]> {
  const limit = opts?.limit ?? 200;
  const { data, error } = await supabase
    .from("dm_messages")
    .select("id, thread_id, sender_id, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data as DmMessageRow[];
}

export async function insertDmMessage(
  supabase: SupabaseClient,
  threadId: string,
  senderId: string,
  body: string,
): Promise<DmMessageRow | null> {
  const trimmed = body.trim().slice(0, 2000);
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from("dm_messages")
    .insert({ thread_id: threadId, sender_id: senderId, body: trimmed })
    .select("id, thread_id, sender_id, body, created_at")
    .single();

  if (error || !data) return null;
  return data as DmMessageRow;
}

/** Resolves peer by handle or returns existing profile row for peerUserId. */
export async function resolveDmPeerId(
  supabase: SupabaseClient,
  input: { peerHandle?: string | null; peerUserId?: string | null },
): Promise<{ peerId: string } | { error: string }> {
  if (input.peerUserId && typeof input.peerUserId === "string") {
    const trimmed = input.peerUserId.trim();
    if (trimmed) return { peerId: trimmed };
  }
  const handle = typeof input.peerHandle === "string" ? input.peerHandle.trim().replace(/^@/, "") : "";
  if (!handle) return { error: "Missing peer handle or user id." };
  const profile = await getProfileByHandle(supabase, handle);
  if (!profile?.id) return { error: "User not found." };
  return { peerId: profile.id };
}

export async function getOrCreateDmThreadRpc(
  supabase: SupabaseClient,
  peerId: string,
): Promise<{ threadId: string } | { error: string }> {
  const { data, error } = await supabase.rpc("orbit_get_or_create_dm_thread", { peer_id: peerId });
  if (error) return { error: error.message };
  if (typeof data !== "string") return { error: "Could not open conversation." };
  return { threadId: data };
}

export async function getDmThreadIfParticipant(
  supabase: SupabaseClient,
  threadId: string,
  viewerId: string,
): Promise<DmThreadRow | null> {
  const { data, error } = await supabase
    .from("dm_threads")
    .select("id, user_low, user_high, created_at, updated_at")
    .eq("id", threadId)
    .maybeSingle();

  if (error || !data) return null;
  const t = data as DmThreadRow;
  if (t.user_low !== viewerId && t.user_high !== viewerId) return null;
  return t;
}

export async function getPeerProfileForThread(
  supabase: SupabaseClient,
  thread: DmThreadRow,
  viewerId: string,
) {
  const peerId = peerIdForThread(thread, viewerId);
  return getProfileByUserId(supabase, peerId);
}
