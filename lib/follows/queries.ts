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

