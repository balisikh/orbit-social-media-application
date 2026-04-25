import type { SupabaseClient } from "@supabase/supabase-js";

export type ReelItemRow = { id: string; videoUrl: string; caption: string | null };

export async function listRecentReels(
  supabase: SupabaseClient,
  opts?: { limit?: number },
): Promise<ReelItemRow[]> {
  const limit = Math.max(1, Math.min(50, opts?.limit ?? 30));
  const { data, error } = await supabase
    .from("reels")
    .select("id, caption, video_url, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data ?? [])
    .map((r) => ({
      id: r.id as string,
      caption: (r.caption as string | null) ?? null,
      videoUrl: (r.video_url as string | null) ?? "",
    }))
    .filter((r) => typeof r.videoUrl === "string" && r.videoUrl.length > 0);
}

export async function listFollowingReels(
  supabase: SupabaseClient,
  followerId: string,
  opts?: { limit?: number },
): Promise<ReelItemRow[]> {
  const limit = Math.max(1, Math.min(50, opts?.limit ?? 30));
  const { data: follows, error: fErr } = await supabase
    .from("follows")
    .select("followed_id")
    .eq("follower_id", followerId)
    .limit(500);
  if (fErr || !follows?.length) return [];
  const followedIds = [...new Set(follows.map((f) => f.followed_id as string).filter(Boolean))];
  if (!followedIds.length) return [];

  const { data, error } = await supabase
    .from("reels")
    .select("id, caption, video_url, created_at")
    .in("user_id", followedIds)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data ?? [])
    .map((r) => ({
      id: r.id as string,
      caption: (r.caption as string | null) ?? null,
      videoUrl: (r.video_url as string | null) ?? "",
    }))
    .filter((r) => typeof r.videoUrl === "string" && r.videoUrl.length > 0);
}

