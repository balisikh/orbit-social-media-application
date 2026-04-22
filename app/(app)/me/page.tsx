import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

export default async function MePage() {
  let email: string | null = null;
  let username: string | null = null;
  const configured = getSupabasePublicConfig().ready;

  try {
    if (configured) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      email = user?.email ?? null;
      const raw = user?.user_metadata?.username;
      username = typeof raw === "string" && raw.length > 0 ? raw : null;
    }
  } catch {
    email = null;
    username = null;
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
        {!configured ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Add{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-900">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-900">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            to{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-900">
              .env.local
            </code>{" "}
            to enable Supabase auth.
          </p>
        ) : email ? (
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
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You are not signed in.{" "}
            <Link
              href="/auth/login"
              className="font-medium text-violet-600 underline dark:text-violet-400"
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
