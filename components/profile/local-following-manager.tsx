"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { addDemoFollowersAndFollowingLocal, listFollowingLocal, toggleUnfollowLocal } from "@/lib/follows/local";
import { messagesThreadHrefForProfileAccount } from "@/lib/messages/profile-link";

type Props = {
  viewerKey: string;
};

function initial(handle: string) {
  return (handle.trim()[0] ?? "?").toUpperCase();
}

export function LocalFollowingManager({ viewerKey }: Props) {
  const [following, setFollowing] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const viewerLabel = useMemo(() => viewerKey.split("@")[0] ?? viewerKey, [viewerKey]);

  function refresh() {
    setFollowing(listFollowingLocal(viewerKey));
  }

  useEffect(() => {
    refresh();
    function onUpdated() {
      refresh();
    }
    window.addEventListener("orbit:follows-updated", onUpdated);
    return () => window.removeEventListener("orbit:follows-updated", onUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return following;
    return following.filter((h) => h.toLowerCase().includes(q));
  }, [following, query]);

  return (
    <div className="max-w-xl space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Following</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Keep your feed clean — unfollow anytime.{" "}
            <span className="text-zinc-600 dark:text-zinc-300">Click an account to open Messages.</span>
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          {viewerLabel}
        </span>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">You follow ({following.length})</p>
          {following.length ? (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 sm:w-44"
            />
          ) : null}
        </div>
        {filtered.length ? (
          <div className="mt-2 space-y-2">
            {filtered.slice(0, 50).map((h) => (
              <div key={h} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 dark:bg-zinc-950">
                <Link
                  href={messagesThreadHrefForProfileAccount(h)}
                  title="Open Messages with this account"
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-0.5 outline-none ring-offset-2 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:hover:bg-zinc-900/60"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    {initial(h)}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">@{h}</p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      Local preview · <span className="text-violet-600 dark:text-violet-400">tap to message</span>
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    toggleUnfollowLocal(viewerKey, h);
                    window.dispatchEvent(new Event("orbit:follows-updated"));
                    refresh();
                  }}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Unfollow
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 rounded-xl bg-white px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
            <p className="font-medium text-zinc-900 dark:text-zinc-50">You’re not following anyone yet</p>
            <p className="mt-1">Open a public profile and tap Follow to start building your feed.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/feed"
                className="inline-flex rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Browse Feed
              </Link>
              <Link
                href="/explore"
                className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Explore users
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type DemoToolsProps = {
  viewerKey: string;
  /** Used to prefix fake `@handle_follow_001` rows; falls back to email local-part. */
  profileHandle?: string | null;
};

function parseDemoCount(raw: number): number {
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.min(1000, Math.floor(raw));
}

function handleForDemoFollowing(profileHandle: string | null | undefined, viewerKey: string): string {
  const h = profileHandle?.trim();
  if (h) return h;
  const local = viewerKey.split("@")[0]?.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return local && local.length >= 1 ? local.slice(0, 30) : "user";
}

export function LocalFollowingDemoTools({ viewerKey, profileHandle }: DemoToolsProps) {
  const [demoFollowing, setDemoFollowing] = useState(1);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoSuccess, setDemoSuccess] = useState<string | null>(null);
  return (
    <div className="max-w-xl rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Bulk-add following</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Optional: generate demo accounts you follow for testing.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={1}
          max={1000}
          value={demoFollowing}
          onChange={(e) => {
            const v = Number(e.target.value);
            setDemoFollowing(Number.isFinite(v) ? v : 1);
          }}
          className="w-28 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <button
          type="button"
          onClick={() => {
            setDemoError(null);
            setDemoSuccess(null);
            const res = addDemoFollowersAndFollowingLocal({
              viewerKey,
              handle: handleForDemoFollowing(profileHandle, viewerKey),
              followersToAdd: 0,
              followingToAdd: parseDemoCount(demoFollowing),
            });
            if (!res.ok) {
              setDemoError(res.error);
              return;
            }
            setDemoSuccess(`Added ${res.addedFollowing} account${res.addedFollowing === 1 ? "" : "s"}.`);
            window.dispatchEvent(new CustomEvent("orbit:follows-updated"));
          }}
          className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add following
        </button>
      </div>
      {demoSuccess ? <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">{demoSuccess}</p> : null}
      {demoError ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {demoError}
        </p>
      ) : null}
    </div>
  );
}

