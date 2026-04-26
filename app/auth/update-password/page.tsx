import Link from "next/link";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

export default function UpdatePasswordPage() {
  const { ready } = getSupabasePublicConfig();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      {ready ? (
        <UpdatePasswordForm />
      ) : (
        <div className="mx-auto max-w-sm space-y-4 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Setting a new password needs Supabase environment variables on this server. In Vercel → Project →
            Settings → Environment Variables, set{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-900">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-900">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> for
            Production, then redeploy.
          </p>
          <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
            Back to sign in
          </Link>
        </div>
      )}
    </div>
  );
}
