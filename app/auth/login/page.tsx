import Link from "next/link";
import { EmailSignInForm } from "@/components/auth/email-sign-in-form";

export default function LoginPage() {
  const ready =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Sign in to Orbit
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Magic link by email, or Google if you enable it in Supabase.
          </p>
        </div>
        {!ready ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            Copy{" "}
            <code className="rounded bg-amber-100/80 px-1 text-xs dark:bg-amber-900/80">
              .env.example
            </code>{" "}
            to{" "}
            <code className="rounded bg-amber-100/80 px-1 text-xs dark:bg-amber-900/80">
              .env.local
            </code>{" "}
            and set{" "}
            <code className="rounded bg-amber-100/80 px-1 text-xs dark:bg-amber-900/80">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="rounded bg-amber-100/80 px-1 text-xs dark:bg-amber-900/80">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            from your Supabase project (Settings → API). Restart{" "}
            <code className="rounded bg-amber-100/80 px-1 text-xs dark:bg-amber-900/80">
              npm run dev
            </code>{" "}
            after saving.
          </p>
        ) : (
          <EmailSignInForm />
        )}
        <Link
          href="/"
          className="inline-block text-sm font-medium text-violet-600 underline dark:text-violet-400"
        >
          Back to feed
        </Link>
      </div>
    </div>
  );
}
