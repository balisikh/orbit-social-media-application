import Link from "next/link";
import { EmailPasswordForm } from "@/components/auth/email-password-form";
import { SupabaseEnvSetup } from "@/components/auth/supabase-env-setup";
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
          {!ready ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Registration will match the form below once this app is connected on this machine.
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Choose your email, username, and password.
            </p>
          )}
        </div>
        {!ready ? <SupabaseEnvSetup variant="signup" /> : <EmailPasswordForm mode="signup" />}
        <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/" className="font-medium text-violet-600 underline dark:text-violet-400">
            Back to home
          </Link>
          {ready ? (
            <p>
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
                Sign in to Orbit
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
