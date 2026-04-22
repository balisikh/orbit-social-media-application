/** Orbit handle rules (signup and profile). */
export const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

export function parseUsername(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!USERNAME_RE.test(s)) return null;
  return s;
}

const META_KEYS = ["username", "user_name", "preferred_username", "handle"] as const;

/** Resolve @handle from Supabase Auth user_metadata (and common aliases). */
export function usernameFromUserMetadata(
  meta: Record<string, unknown> | null | undefined,
): string | null {
  if (!meta || typeof meta !== "object") return null;
  for (const key of META_KEYS) {
    const v = meta[key];
    if (typeof v !== "string") continue;
    const parsed = parseUsername(v);
    if (parsed) return parsed;
  }
  return null;
}
