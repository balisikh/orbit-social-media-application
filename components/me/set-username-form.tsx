"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseUsername } from "@/lib/auth/username";

export function SetUsernameForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const handle = parseUsername(value);
    if (!handle) {
      setError("Username must be 3–30 characters: letters, numbers, and underscores only.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        data: { username: handle },
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      const sync = await fetch("/api/profile/sync", { method: "POST" });
      if (!sync.ok) {
        const j = (await sync.json().catch(() => null)) as { error?: string } | null;
        setError(
          j?.error ??
            "Username saved, but Orbit couldn’t sync your profile. Open Profile again or finish the hosting checklist.",
        );
        router.refresh();
        return;
      }
      setValue("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 max-w-md space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Choose your @username</p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Saves on your Orbit account so Profile and your public page use the same handle.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="me-set-username" className="sr-only">
            Username
          </label>
          <input
            id="me-set-username"
            name="username"
            type="text"
            autoComplete="username"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\s/g, ""))}
            disabled={loading}
            placeholder="your_handle"
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
