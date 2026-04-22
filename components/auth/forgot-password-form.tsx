"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
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
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Reset password
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          We will email you a link to choose a new password.
        </p>
      </div>
      {sent ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
          If an account exists for <span className="font-medium">{email}</span>, you will receive an email
          with a link. Open it, set a new password (twice to confirm), then sign in on the login page with
          your email and new password.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 text-left">
          <div>
            <label
              htmlFor="forgot-email"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
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
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
