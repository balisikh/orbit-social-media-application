"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseUsername } from "@/lib/auth/username";

type Props = {
  mode: "supabase" | "dev";
  email: string;
  currentHandle: string | null;
  currentDisplayName: string | null;
};

function cleanName(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function SetProfileBasicsForm({ mode, email, currentHandle, currentDisplayName }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(currentDisplayName ?? "");
  const [username, setUsername] = useState(currentHandle ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(currentDisplayName ?? "");
  }, [currentDisplayName]);

  useEffect(() => {
    setUsername(currentHandle ?? "");
  }, [currentHandle]);

  const canSave = useMemo(() => {
    const nextName = cleanName(displayName);
    const nextHandle = username.length ? parseUsername(username) : null;
    return Boolean(nextName.length || nextHandle);
  }, [displayName, username]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const nextName = cleanName(displayName);
    const nextHandle = username.length ? parseUsername(username) : null;
    if (username.length && !nextHandle) {
      setError("Username must be 3–30 characters: letters, numbers, and underscores only.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "supabase") {
        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            ...(nextHandle ? { username: nextHandle } : {}),
            ...(nextName ? { full_name: nextName } : {}),
          },
        });
        if (updateError) {
          setError(updateError.message);
          return;
        }
        const sync = await fetch("/api/profile/sync", { method: "POST" });
        if (!sync.ok) {
          const j = (await sync.json().catch(() => null)) as { error?: string } | null;
          setError(j?.error ?? "Saved, but Orbit couldn’t sync your profile yet. Refresh and try again.");
          router.refresh();
          return;
        }
      } else {
        const res = await fetch("/api/orbit-dev-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            username: nextHandle,
            displayName: nextName || null,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(j?.error ?? "Couldn’t update local preview profile.");
          return;
        }
      }

      setSuccess("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 max-w-xl space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <div>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Profile basics</p>
        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
          {mode === "supabase"
            ? "Updates your Orbit account and syncs to your public profile."
            : "Updates your local preview profile for this browser."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="me-display-name" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Display name
          </label>
          <input
            id="me-display-name"
            name="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            placeholder="Baljinder Singh Rai"
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>

        <div className="min-w-0">
          <label htmlFor="me-username" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Username
          </label>
          <input
            id="me-username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            disabled={loading}
            placeholder="balisikhjatt27"
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading || !canSave}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Saving…" : "Save"}
        </button>
        {success ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p> : null}
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

