/**
 * Reads public Supabase env used by Next.js (NEXT_PUBLIC_*).
 * Values are trimmed so accidental whitespace in .env.local does not break auth.
 */
export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  return {
    url,
    anonKey,
    ready: url.length > 0 && anonKey.length > 0,
  };
}

/** Short, user-facing hint when only part of the public Supabase config is present. */
export function describeSupabaseEnvGap(url: string, anonKey: string): string {
  if (url && anonKey) return "";
  if (url && !anonKey) {
    return "The public API key for sign-in is still missing from this app’s local settings.";
  }
  if (!url && anonKey) {
    return "The project web address is still missing from this app’s local settings.";
  }
  return "Sign-in is not available on this copy of the app until it is linked to your Supabase project.";
}
