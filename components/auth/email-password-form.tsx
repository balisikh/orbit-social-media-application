"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { readDevProfileLocalBackup } from "@/lib/auth/dev-profile-local";
import { friendlySignInError } from "@/lib/auth/sign-in-errors";
import { parseUsername } from "@/lib/auth/username";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";
import { createClient } from "@/lib/supabase/client";

export type EmailPasswordMode = "signin" | "signup";

type EmailPasswordFormProps = {
  mode: EmailPasswordMode;
};

export function EmailPasswordForm({ mode }: EmailPasswordFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Enter your email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (mode === "signup") {
      if (!parseUsername(username)) {
        setError("Username must be 3–30 characters: letters, numbers, and underscores only.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    const ready = getSupabasePublicConfig().ready;
    const isDev = process.env.NODE_ENV === "development";

    if (!ready && !isDev) {
      setError(
        "Sign-in needs Supabase on this server. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel (Production), then redeploy.",
      );
      return;
    }

    setLoading(true);
    try {
      if (!ready && isDev) {
        const backup = readDevProfileLocalBackup(trimmedEmail);
        const signupHandle = mode === "signup" ? parseUsername(username) : null;
        const res = await fetch("/api/orbit-dev-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmedEmail,
            ...(signupHandle ? { username: signupHandle } : backup?.username ? { username: backup.username } : {}),
            ...(backup?.displayName ? { displayName: backup.displayName } : {}),
            ...(backup?.bio ? { bio: backup.bio } : {}),
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(j?.error ?? "Could not start a local session.");
          return;
        }
        router.push("/feed");
        router.refresh();
        return;
      }

      const supabase = createClient();
      const origin = window.location.origin;

      if (mode === "signup") {
        const handle = parseUsername(username);
        if (!handle) {
          setError("Username must be 3–30 characters: letters, numbers, and underscores only.");
          return;
        }
        const { data, error: signError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=/feed`,
            data: {
              username: handle,
            },
          },
        });
        if (signError) {
          setError(signError.message);
          return;
        }
        if (data.session) {
          await fetch("/api/profile/sync", { method: "POST" }).catch(() => {});
          router.push("/feed");
          router.refresh();
          return;
        }
        setInfo(
          "Check your email to confirm your account, then sign in. If your project does not require email confirmation, you can sign in right away.",
        );
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInError) {
        setError(friendlySignInError(signInError.message));
        return;
      }
      await fetch("/api/profile/sync", { method: "POST" }).catch(() => {});
      router.push("/feed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-4 text-left">
      <div>
        <label
          htmlFor="orbit-pw-email"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Email
        </label>
        <input
          id="orbit-pw-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </div>

      {mode === "signup" ? (
        <div>
          <label
            htmlFor="orbit-username"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Username
          </label>
          <input
            id="orbit-username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            disabled={loading}
            placeholder="your_handle"
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            3–30 characters: letters, numbers, underscores.
          </p>
        </div>
      ) : null}

      <div>
        <label
          htmlFor="orbit-pw-password"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Password
        </label>
        <input
          id="orbit-pw-password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </div>

      {mode === "signup" ? (
        <div>
          <label
            htmlFor="orbit-pw-confirm"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Confirm password
          </label>
          <input
            id="orbit-pw-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
      ) : null}

      {mode === "signin" ? (
        <p className="text-right text-sm">
          <Link
            href="/auth/forgot-password"
            className="font-medium text-violet-600 underline dark:text-violet-400"
          >
            Reset password
          </Link>
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="text-sm text-emerald-800 dark:text-emerald-200" role="status">
          {info}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full cursor-pointer rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Submit"}
      </button>
    </form>
  );
}
