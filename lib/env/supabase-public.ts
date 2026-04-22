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
