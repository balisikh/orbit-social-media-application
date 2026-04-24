export type PostAudience = "public" | "followers";

export type PostRow = {
  id: string;
  user_id: string;
  caption: string | null;
  image_url: string | null;
  audience: PostAudience;
  created_at: string;
  updated_at: string;
};

/** Post row plus author handle for feed UI (joined from profiles). */
export type PostFeedRow = PostRow & { author_handle: string | null };

