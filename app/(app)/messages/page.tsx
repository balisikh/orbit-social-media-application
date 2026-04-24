import Link from "next/link";
import { Suspense } from "react";
import { MessagesPreview } from "@/components/messages/messages-preview";
import { MessagesSupabaseInbox } from "@/components/messages/messages-supabase-inbox";
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
      if (user?.id) {
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Messages</h1>
              <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                Direct conversations stored in your database with row-level security. Open a profile and use{" "}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">Message</span> to start a chat.
              </p>
            </div>
            <Suspense
              fallback={
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-8 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                  Loading messages…
                </div>
              }
            >
              <MessagesSupabaseInbox viewerUserId={user.id} />
            </Suspense>
          </div>
        );
      }
    } catch {
      ownerKey = "local";
    }
  } else {
    const dev = await readDevSessionFromCookies();
    ownerKey = dev?.email ?? "local";
  }

  if (configured) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Messages</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Sign in to use cloud direct messages with your Supabase project. Below is the local preview inbox (stored in
            your browser only).
          </p>
          <p className="mt-3 text-sm">
            <Link href="/auth/login" className="font-semibold text-violet-600 underline dark:text-violet-400">
              Log in
            </Link>{" "}
            or{" "}
            <Link href="/auth/signup" className="font-semibold text-violet-600 underline dark:text-violet-400">
              create an account
            </Link>
            .
          </p>
        </div>
        <MessagesPreview ownerKey={ownerKey} showSimulatePeerReply />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Messages</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          Direct conversations in a split inbox + thread layout. This preview stores data in your browser; connect
          Supabase to use server-backed DMs with RLS.
        </p>
      </div>
      <MessagesPreview ownerKey={ownerKey} showSimulatePeerReply />
    </div>
  );
}
