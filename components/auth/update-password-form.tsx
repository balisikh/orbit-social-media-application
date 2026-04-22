"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(Boolean(data.user));
      setChecking(false);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Type the same new password twice.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await supabase.auth.signOut();
      router.push("/auth/login?message=password-updated");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-zinc-500">
        Checking session…
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="mx-auto max-w-sm space-y-4 px-4 py-16 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This link is invalid or has expired. Request a new reset link from the sign-in page.
        </p>
        <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          New password
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter and confirm your new password. You will be signed out and can log in again with this password.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 text-left">
        <div>
          <label
            htmlFor="new-password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
        <div>
          <label
            htmlFor="confirm-new-password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Confirm new password
          </label>
          <input
            id="confirm-new-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? "Saving…" : "Save password and return to sign in"}
        </button>
      </form>
    </div>
  );
}
