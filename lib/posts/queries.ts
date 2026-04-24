import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostFeedRow, PostRow } from "@/lib/posts/types";

const postSelect = "id, user_id, caption, image_url, audience, created_at, updated_at";

/**
 * Feed for a signed-in user: posts from people they follow, plus their own posts.
 * RLS still enforces who may read each row (`audience` + follows); this query scopes the feed.
 */
export async function getFollowersFeedPosts(
  supabase: SupabaseClient,
  viewerUserId: string,
  opts?: { limit?: number },
): Promise<PostFeedRow[]> {
  const limit = opts?.limit ?? 60;

  const { data: followRows, error: followErr } = await supabase
    .from("follows")
    .select("followed_id")
    .eq("follower_id", viewerUserId);
  if (followErr) return [];

  const authorIds = Array.from(
    new Set([viewerUserId, ...((followRows ?? []) as { followed_id: string }[]).map((r) => r.followed_id)]),
  );

  const { data: posts, error: postsErr } = await supabase
    .from("posts")
    .select(postSelect)
    .in("user_id", authorIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (postsErr || !posts?.length) return [];

  const { data: profiles } = await supabase.from("profiles").select("id, handle").in("id", authorIds);
  const handleById = new Map((profiles ?? []).map((p) => [p.id as string, (p as { handle: string | null }).handle]));

  return (posts as PostRow[]).map((p) => ({
    ...p,
    audience: (p as { audience?: PostRow["audience"] }).audience ?? "public",
    author_handle: handleById.get(p.user_id) ?? null,
  }));
}

/** Unscoped recent posts (e.g. admin tools). Prefer {@link getFollowersFeedPosts} for the home feed. */
export async function getRecentPosts(
  supabase: SupabaseClient,
  opts?: { limit?: number },
): Promise<PostRow[]> {
  const limit = opts?.limit ?? 60;
  const { data, error } = await supabase
    .from("posts")
    .select(postSelect)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as PostRow[]).map((p) => ({
    ...p,
    audience: (p as { audience?: PostRow["audience"] }).audience ?? "public",
  }));
}

export async function getPostsByUserId(
  supabase: SupabaseClient,
  userId: string,
  opts?: { limit?: number },
): Promise<PostRow[]> {
  const limit = opts?.limit ?? 60;
  const { data, error } = await supabase
    .from("posts")
    .select(postSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as PostRow[]).map((p) => ({
    ...p,
    audience: (p as { audience?: PostRow["audience"] }).audience ?? "public",
  }));
}

