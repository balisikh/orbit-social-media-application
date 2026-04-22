import { readDevSessionFromCookies } from "@/lib/auth/dev-session";
import { parseUsername, usernameFromUserMetadata } from "@/lib/auth/username";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";
import { getProfileByUserId } from "@/lib/profiles/queries";
import { createClient } from "@/lib/supabase/server";

export type HeaderSessionMode = "supabase" | "dev" | null;

export type HeaderSession = {
  email: string | null;
  mode: HeaderSessionMode;
  /** Signup @handle from profile row and/or auth metadata (for nav + menu). */
  handle: string | null;
};

/** Who is signed in for header UI (Supabase session or local dev cookie), including @handle when known. */
export async function getHeaderSession(): Promise<HeaderSession> {
  const configured = getSupabasePublicConfig().ready;
  if (configured) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        const metaHandle = usernameFromUserMetadata(user.user_metadata ?? undefined);
        const profile = await getProfileByUserId(supabase, user.id);
        const dbHandle = profile?.handle ?? null;
        const handle = dbHandle ?? metaHandle;
        return { email: user.email, mode: "supabase", handle };
      }
    } catch {
      /* ignore */
    }
  }
  const dev = await readDevSessionFromCookies();
  if (dev?.email) {
    const handle = dev.username ? parseUsername(dev.username) : null;
    return { email: dev.email, mode: "dev", handle };
  }
  return { email: null, mode: null, handle: null };
}
