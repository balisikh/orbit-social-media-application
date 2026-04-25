"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { messagesThreadHrefForProfileAccount } from "@/lib/messages/profile-link";
import {
  acceptRequestLocal,
  addDemoFollowerRequestsLocal,
  blockFollowerLocal,
  declineRequestLocal,
  listBlockedLocal,
  listRecentFollowActions,
  unblockLocal,
  listFollowersLocal,
  listPendingRequestsLocal,
  removeFollowerLocal,
  type FollowRequest,
  type LocalFollowAction,
} from "@/lib/follows/local";

type Props = {
  viewerKey: string;
  handle: string;
};

function shortKey(k: string) {
  return (k.split("@")[0] ?? k).slice(0, 40);
}

function initial(k: string) {
  const s = shortKey(k).trim();
  return (s[0] ?? "?").toUpperCase();
}

export function LocalFollowManager({ viewerKey, handle }: Props) {
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [recent, setRecent] = useState<LocalFollowAction[]>([]);
  const [recentRequests, setRecentRequests] = useState<LocalFollowAction[]>([]);
  const [query, setQuery] = useState("");

  function refresh() {
    setRequests(listPendingRequestsLocal(handle));
    setFollowers(listFollowersLocal(handle));
    setBlocked(listBlockedLocal(handle));
    const actions = listRecentFollowActions(handle, { limit: 12 });
    setRecent(actions);
    setRecentRequests(actions.filter((a) => ["requested", "accepted", "declined"].includes(a.type)));
  }

  useEffect(() => {
    refresh();
    function onUpdated() {
      refresh();
    }
    window.addEventListener("orbit:follows-updated", onUpdated);
    return () => window.removeEventListener("orbit:follows-updated", onUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  const followerCount = followers.length;
  const requestCount = requests.length;
  const blockedCount = blocked.length;
  const viewerLabel = useMemo(() => viewerKey.split("@")[0] ?? viewerKey, [viewerKey]);
  const filteredFollowers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return followers;
    return followers.filter((fk) => fk.toLowerCase().includes(q));
  }, [followers, query]);

  return (
    <div className="max-w-xl space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Followers</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Approve requests, remove followers, or block accounts you don’t want.{" "}
            <span className="text-zinc-600 dark:text-zinc-300">Click a follower’s name to open Messages.</span>
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          @{handle} · {viewerLabel}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/30">
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Requests</p>
          <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{requestCount}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/30">
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Followers</p>
          <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{followerCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Requests</p>
        {requestCount ? (
          <div className="mt-2 space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 dark:bg-zinc-950">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-amber-400 text-sm font-semibold text-white">
                    {initial(r.fromViewerKey)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{shortKey(r.fromViewerKey)}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">wants to follow</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      acceptRequestLocal(handle, r.id);
                      refresh();
                    }}
                    className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      declineRequestLocal(handle, r.id);
                      refresh();
                    }}
                    className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No requests right now.</p>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Recent request actions</p>
        {recentRequests.length ? (
          <div className="mt-2 space-y-2">
            {recentRequests.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm dark:bg-zinc-950">
                <p className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {a.type === "requested" ? "Requested" : a.type === "accepted" ? "Accepted" : "Declined"}
                  </span>{" "}
                  {shortKey(a.viewerKey)}
                </p>
                <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Nothing yet.</p>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Blocked ({blockedCount})</p>
        {blockedCount ? (
          <div className="mt-2 space-y-2">
            {blocked.slice(0, 20).map((fk) => (
              <div key={fk} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 dark:bg-zinc-950">
                <p className="min-w-0 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{shortKey(fk)}</p>
                <button
                  type="button"
                  onClick={() => {
                    unblockLocal(handle, fk);
                    refresh();
                  }}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No blocked accounts.</p>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Recent actions</p>
        {recent.length ? (
          <div className="mt-2 space-y-2">
            {recent.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm dark:bg-zinc-950">
                <p className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {a.type === "removed" ? "Removed" : a.type === "blocked" ? "Blocked" : "Unblocked"}
                  </span>{" "}
                  {shortKey(a.viewerKey)}
                </p>
                <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Nothing yet.</p>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Current followers ({followerCount})</p>
          {followerCount ? (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 sm:w-44"
            />
          ) : null}
        </div>
        {filteredFollowers.length ? (
          <div className="mt-2 space-y-2">
            {filteredFollowers.slice(0, 20).map((fk) => (
              <div key={fk} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 dark:bg-zinc-950">
                <Link
                  href={messagesThreadHrefForProfileAccount(fk)}
                  title="Open Messages with this follower"
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-0.5 outline-none ring-offset-2 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:hover:bg-zinc-900/60"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    {initial(fk)}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{shortKey(fk)}</p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      Local preview · <span className="text-violet-600 dark:text-violet-400">tap to message</span>
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      removeFollowerLocal(handle, fk);
                      window.dispatchEvent(new Event("orbit:follows-updated"));
                      refresh();
                    }}
                    className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      blockFollowerLocal(handle, fk);
                      window.dispatchEvent(new Event("orbit:follows-updated"));
                      refresh();
                    }}
                    className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Block
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 rounded-xl bg-white px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
            <p className="font-medium text-zinc-900 dark:text-zinc-50">No followers yet</p>
            <p className="mt-1">
              In local preview, followers appear when someone visits your public profile and taps Follow.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/feed"
                className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Go to Feed
              </Link>
              <Link
                href={`/u/${encodeURIComponent(handle)}`}
                className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                View your public profile
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function parseDemoCount(raw: number): number {
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.min(1000, Math.floor(raw));
}

export function LocalFollowersDemoTools({ viewerKey, handle }: Props) {
  const [demoFollowers, setDemoFollowers] = useState(1);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoSuccess, setDemoSuccess] = useState<string | null>(null);
  return (
    <div className="max-w-xl rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Bulk-add follow requests</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Optional: generate demo accounts that have requested to follow you (so Requests count increases).
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={1}
          max={1000}
          value={demoFollowers}
          onChange={(e) => {
            const v = Number(e.target.value);
            setDemoFollowers(Number.isFinite(v) ? v : 1);
          }}
          className="w-28 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <button
          type="button"
          onClick={() => {
            setDemoError(null);
            setDemoSuccess(null);
            void viewerKey;
            const res = addDemoFollowerRequestsLocal({
              handle,
              requestsToAdd: parseDemoCount(demoFollowers),
            });
            if (!res.ok) {
              setDemoError(res.error);
              return;
            }
            setDemoSuccess(`Added ${res.addedRequests} request${res.addedRequests === 1 ? "" : "s"}.`);
            window.dispatchEvent(new CustomEvent("orbit:follows-updated"));
          }}
          className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add requests
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

