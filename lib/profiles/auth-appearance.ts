import type { User } from "@supabase/supabase-js";

/** Display name from Supabase Auth `user_metadata` (common provider keys). */
export function displayNameFromAuthUser(user: User): string | null {
  const m = user.user_metadata ?? {};
  for (const key of ["full_name", "name", "display_name"] as const) {
    const v = m[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

/** Avatar / picture URL from Auth metadata (OAuth or custom). */
export function avatarUrlFromAuthUser(user: User): string | null {
  const m = user.user_metadata ?? {};
  for (const key of ["avatar_url", "picture", "image"] as const) {
    const v = m[key];
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (!t) continue;
    if (t.startsWith("http://") || t.startsWith("https://") || t.startsWith("data:image/")) return t;
  }
  return null;
}

/** Bio copied into `user_metadata.bio` on save so it survives profile row read issues. */
export function bioFromAuthUser(user: User): string | null {
  const m = user.user_metadata ?? {};
  const v = m.bio;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t.slice(0, 280) : null;
}
