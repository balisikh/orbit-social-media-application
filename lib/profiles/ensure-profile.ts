import type { SupabaseClient, User } from "@supabase/supabase-js";
import { parseUsername, usernameFromUserMetadata } from "@/lib/auth/username";
import { avatarUrlFromAuthUser, bioFromAuthUser, displayNameFromAuthUser } from "@/lib/profiles/auth-appearance";
import type { ProfileRow } from "@/lib/profiles/types";

/** Email local-part as a valid handle (Supabase often seeds `user_metadata.username` with this). */
function emailLocalHandleCandidate(email: string | undefined): string | null {
  if (!email) return null;
  const local = email.split("@")[0] ?? "";
  return parseUsername(local);
}

/**
 * Prefer auth metadata for handles the user just set, but do not let the default
 * email-prefix username overwrite an existing custom handle in `profiles`.
 */
function mergeHandleForUpsert(email: string | undefined, metaHandle: string | null, rowHandleRaw: string | null): string | null {
  const fromRow = rowHandleRaw?.trim() ? parseUsername(rowHandleRaw.trim()) : null;
  const next = metaHandle ?? fromRow ?? null;
  const autoLocal = emailLocalHandleCandidate(email);
  if (
    fromRow &&
    metaHandle &&
    metaHandle !== fromRow &&
    autoLocal &&
    metaHandle === autoLocal
  ) {
    return fromRow;
  }
  return next;
}

/**
 * Same idea as {@link mergeHandleForUpsert}: avoid clobbering a saved display name
 * with metadata that is only the email local part (common provider default).
 */
function mergeDisplayNameForUpsert(
  email: string | undefined,
  metaName: string | null,
  rowNameRaw: string | null,
): string | null {
  const fromRow = rowNameRaw?.trim() || null;
  const meta = metaName?.trim() || null;
  const next = meta ?? fromRow ?? null;
  const autoLocal = email?.split("@")[0]?.trim().toLowerCase() ?? "";
  if (fromRow && meta && meta !== fromRow && autoLocal && meta.toLowerCase() === autoLocal) {
    return fromRow;
  }
  return next;
}

/** Upsert `public.profiles` from the current auth user (metadata + existing row). */
export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User,
): Promise<{ error: string | null }> {
  const metaHandle = usernameFromUserMetadata(user.user_metadata ?? undefined);
  const metaDisplayName = displayNameFromAuthUser(user);

  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("handle, display_name, bio, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    return { error: readError.message };
  }

  const row = existing as Pick<ProfileRow, "handle" | "display_name" | "bio" | "avatar_url"> | null;

  const nextHandle = mergeHandleForUpsert(user.email, metaHandle, row?.handle ?? null);
  const nextDisplayName = mergeDisplayNameForUpsert(user.email, metaDisplayName, row?.display_name ?? null);
  const savedAvatar = row?.avatar_url?.trim() ? row.avatar_url.trim() : null;
  const metaAvatar = avatarUrlFromAuthUser(user);
  const nextAvatarUrl = savedAvatar ?? metaAvatar ?? null;
  const savedBio = row?.bio?.trim() ? row.bio.trim() : null;
  const metaBio = bioFromAuthUser(user);
  const nextBio = savedBio ?? metaBio ?? null;

  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      handle: nextHandle,
      display_name: nextDisplayName,
      bio: nextBio,
      avatar_url: nextAvatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (upsertError) {
    return { error: upsertError.message };
  }
  return { error: null };
}
