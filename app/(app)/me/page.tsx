import Link from "next/link";
import { SignOutDevButton } from "@/components/auth/sign-out-dev-button";
import { readDevSessionFromCookies } from "@/lib/auth/dev-session";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

export default async function MePage() {
  const configured = getSupabasePublicConfig().ready;
  const devSession = await readDevSessionFromCookies();

  let email: string | null = null;
  let username: string | null = null;
  let source: "supabase" | "dev" | null = null;

  if (configured) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        source = "supabase";
        email = user.email;
        const raw = user.user_metadata?.username;
        username = typeof raw === "string" && raw.length > 0 ? raw : null;
      }
    } catch {
      email = null;
      username = null;
    }
  }

  if (!email && devSession) {
    source = "dev";
    email = devSession.email;
    username = devSession.username;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Your profile
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          This becomes your editable profile and settings hub once auth is wired.
        </p>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        {email ? (
          <div className="space-y-2">
            {source === "dev" ? (
              <p className="text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Local preview (no Supabase keys in .env.local)
              </p>
            ) : null}
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Signed in as <span className="font-medium">{email}</span>
              {username ? (
                <>
                  {" "}
                  (<span className="font-medium">@{username}</span>)
                </>
              ) : null}
              . Open{" "}
              <Link
                href={username ? `/u/${encodeURIComponent(username)}` : "/u/you"}
                className="font-medium text-violet-600 underline dark:text-violet-400"
              >
                your public page
              </Link>
              .
            </p>
            {source === "dev" ? <SignOutDevButton /> : null}
          </div>
        ) : !configured ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You are not signed in.{" "}
            <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
              Sign in
            </Link>{" "}
            — with <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-900">npm run dev</code> you can use
            the form without Supabase (local preview only).
          </p>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You are not signed in.{" "}
            <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
