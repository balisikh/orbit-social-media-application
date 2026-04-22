import type { SupabaseClient, User } from "@supabase/supabase-js";
import { usernameFromUserMetadata } from "@/lib/auth/username";
import type { ProfileRow } from "@/lib/profiles/types";

function displayNameFromUser(user: User): string | null {
  const m = user.user_metadata ?? {};
  for (const key of ["full_name", "name", "display_name"] as const) {
    const v = m[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

/** Upsert `public.profiles` from the current auth user (metadata + existing row). */
export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User,
): Promise<{ error: string | null }> {
  const metaHandle = usernameFromUserMetadata(user.user_metadata ?? undefined);
  const displayName = displayNameFromUser(user);

  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("handle, display_name, bio, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    return { error: readError.message };
  }

  const row = existing as Pick<ProfileRow, "handle" | "display_name" | "bio" | "avatar_url"> | null;

  const nextHandle = metaHandle ?? row?.handle ?? null;
  const nextDisplayName = displayName ?? row?.display_name ?? null;

  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      handle: nextHandle,
      display_name: nextDisplayName,
      bio: row?.bio ?? null,
      avatar_url: row?.avatar_url ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (upsertError) {
    return { error: upsertError.message };
  }
  return { error: null };
}
