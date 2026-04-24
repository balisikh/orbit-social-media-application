export type ProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  require_follow_approval: boolean;
  created_at: string;
  updated_at: string;
};
