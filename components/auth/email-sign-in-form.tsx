"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function EmailSignInForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error: signError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/me`,
        },
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    setOauthLoading(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=/me`,
        },
      });
      if (oauthError) {
        setError(oauthError.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setOauthLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-left text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
        <p className="font-medium">Check your email</p>
        <p className="mt-2 text-emerald-800/90 dark:text-emerald-200/90">
          We sent a magic link to <span className="font-medium">{email}</span>.
          Click the link in the email to sign in. You can close this tab.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
          className="mt-4 text-sm font-medium text-emerald-800 underline dark:text-emerald-200"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={sendMagicLink} className="space-y-3 text-left">
        <label htmlFor="orbit-email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          id="orbit-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={loading}
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none ring-violet-500/0 transition placeholder:text-zinc-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Sending link…" : "Email me a magic link"}
        </button>
      </form>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide text-zinc-500">
          <span className="bg-[var(--background)] px-2">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={oauthLoading || loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
      >
        {oauthLoading ? "Redirecting…" : "Continue with Google"}
      </button>

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        In Supabase: Authentication → URL configuration — add{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">
          …/auth/callback
        </code>{" "}
        to Redirect URLs (include your port, e.g. 3001).
      </p>
    </div>
  );
}
