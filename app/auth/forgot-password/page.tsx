import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

export default function ForgotPasswordPage() {
  const { ready } = getSupabasePublicConfig();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      {ready ? (
        <ForgotPasswordForm />
      ) : (
        <div className="mx-auto max-w-sm space-y-4 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Password reset is only available when Supabase is configured. This deployment is running in local mode (browser-only),
            so password reset emails are not supported.
          </p>
          <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
            Back to sign in
          </Link>
        </div>
      )}
    </div>
  );
}
