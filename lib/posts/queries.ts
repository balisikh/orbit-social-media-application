import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostRow } from "@/lib/posts/types";

const postSelect = "id, user_id, caption, image_url, created_at, updated_at";

export async function getRecentPosts(
  supabase: SupabaseClient,
  opts?: { limit?: number },
): Promise<PostRow[]> {
  const limit = opts?.limit ?? 60;
  const { data, error } = await supabase.from("posts").select(postSelect).order("created_at", { ascending: false }).limit(limit);
  if (error || !data) return [];
  return data as PostRow[];
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
  return data as PostRow[];
}

