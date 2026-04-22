import Link from "next/link";
import { EmailPasswordForm } from "@/components/auth/email-password-form";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

export default function SignupPage() {
  const { ready } = getSupabasePublicConfig();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Create your Orbit account
          </h1>
          {!ready && process.env.NODE_ENV === "development" ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Local development: you can create an account without Supabase keys (preview session only).
            </p>
          ) : !ready ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Registration needs the app to be configured on this server.
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              One-time registration: email, username, password, and confirm password. After that, use Log in on the home
              page; use Reset password if you forget your password.
            </p>
          )}
        </div>
        <EmailPasswordForm mode="signup" />
        <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/" className="font-medium text-violet-600 underline dark:text-violet-400">
            Back to home
          </Link>
          <p>
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
              Sign in to Orbit
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
