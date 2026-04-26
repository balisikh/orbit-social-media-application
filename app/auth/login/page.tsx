import Link from "next/link";
import { EmailPasswordForm } from "@/components/auth/email-password-form";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

type LoginPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { ready } = getSupabasePublicConfig();
  const { message } = await searchParams;
  const showPasswordUpdated = ready && message === "password-updated";
  const isDev = process.env.NODE_ENV === "development";
  const canUseEmailPassword = ready || isDev;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Sign in to Orbit
          </h1>
          {!ready && process.env.NODE_ENV === "development" ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Running <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-900">npm run dev</code> without
              cloud credentials? You can still sign in with a <strong className="font-medium text-zinc-800 dark:text-zinc-200">local preview</strong> session to try Orbit.
            </p>
          ) : !ready ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Sign-in needs Supabase environment variables on this server. In Vercel → Project → Settings → Environment
              Variables, set{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-900">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-900">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
              for Production, then redeploy.
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Enter your email and password, then submit. If your password is wrong, use{" "}
              <Link href="/auth/forgot-password" className="font-medium text-violet-600 underline dark:text-violet-400">
                Reset password
              </Link>
              .
            </p>
          )}
        </div>
        {showPasswordUpdated ? (
          <p
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100"
            role="status"
          >
            Your password was updated. Sign in below with your email and new password.
          </p>
        ) : null}
        {canUseEmailPassword ? <EmailPasswordForm mode="signin" /> : null}
        <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/" className="font-medium text-violet-600 underline dark:text-violet-400">
            Back to home
          </Link>
          <p>
            New to Orbit?{" "}
            <Link href="/auth/signup" className="font-medium text-violet-600 underline dark:text-violet-400">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
