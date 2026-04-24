import type { SupabaseClient } from "@supabase/supabase-js";

export async function countFollowers(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("followed_id", userId);
  if (error) return 0;
  return count ?? 0;
}

export async function countFollowing(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("follows")
    .select("followed_id", { count: "exact", head: true })
    .eq("follower_id", userId);
  if (error) return 0;
  return count ?? 0;
}

export async function isFollowing(supabase: SupabaseClient, followerId: string, followedId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("followed_id", followedId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export type IncomingFollowRequestRow = {
  id: string;
  follower_id: string;
  created_at: string;
  follower_handle: string | null;
  follower_display_name: string | null;
};

export async function hasPendingOutgoingFollowRequest(
  supabase: SupabaseClient,
  followerId: string,
  followedId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("follow_requests")
    .select("id")
    .eq("follower_id", followerId)
    .eq("followed_id", followedId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export async function countPendingIncomingFollowRequests(
  supabase: SupabaseClient,
  followedId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("follow_requests")
    .select("id", { count: "exact", head: true })
    .eq("followed_id", followedId)
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}

export async function listPendingIncomingFollowRequests(
  supabase: SupabaseClient,
  followedId: string,
): Promise<IncomingFollowRequestRow[]> {
  const { data: reqs, error } = await supabase
    .from("follow_requests")
    .select("id, follower_id, created_at")
    .eq("followed_id", followedId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error || !reqs?.length) return [];

  const followerIds = [...new Set(reqs.map((r) => r.follower_id as string))];
  const { data: profs, error: pErr } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .in("id", followerIds);
  if (pErr || !profs) {
    return reqs.map((r) => ({
      id: r.id as string,
      follower_id: r.follower_id as string,
      created_at: r.created_at as string,
      follower_handle: null,
      follower_display_name: null,
    }));
  }
  const byId = new Map(profs.map((p) => [p.id as string, p]));
  return reqs.map((r) => {
    const p = byId.get(r.follower_id as string);
    return {
      id: r.id as string,
      follower_id: r.follower_id as string,
      created_at: r.created_at as string,
      follower_handle: (p?.handle as string | null) ?? null,
      follower_display_name: (p?.display_name as string | null) ?? null,
    };
  });
}

