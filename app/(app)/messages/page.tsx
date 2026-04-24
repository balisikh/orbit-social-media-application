import { MessagesPreview } from "@/components/messages/messages-preview";
import { readDevSessionFromCookies } from "@/lib/auth/dev-session";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesPage() {
  const configured = getSupabasePublicConfig().ready;
  let ownerKey = "local";

  if (configured) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) ownerKey = user.id;
    } catch {
      ownerKey = "local";
    }
  } else {
    const dev = await readDevSessionFromCookies();
    ownerKey = dev?.email ?? "local";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Messages</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          Direct conversations in a split inbox + thread layout. Explore the preview below; delivery and storage connect
          when Orbit&apos;s messaging layer is hooked to your backend.
        </p>
      </div>
      <MessagesPreview ownerKey={ownerKey} showSimulatePeerReply={!configured} />
    </div>
  );
}
