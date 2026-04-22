import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileRow } from "@/lib/profiles/types";

const profileSelect = "id, handle, display_name, bio, avatar_url, created_at, updated_at";

export async function getProfileByHandle(
  supabase: SupabaseClient,
  handle: string,
): Promise<ProfileRow | null> {
  const normalized = handle.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("handle", normalized)
    .maybeSingle();

  if (error || !data?.handle) return null;
  return data as ProfileRow;
}

export async function getProfileByUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from("profiles").select(profileSelect).eq("id", userId).maybeSingle();

  if (error || !data) return null;
  return data as ProfileRow;
}
