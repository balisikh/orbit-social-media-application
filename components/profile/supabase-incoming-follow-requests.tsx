"use client";

import { useCallback, useEffect, useState } from "react";
import type { IncomingFollowRequestRow } from "@/lib/follows/queries";

function labelForFollower(r: IncomingFollowRequestRow): string {
  if (r.follower_handle) return `@${r.follower_handle}`;
  if (r.follower_display_name?.trim()) return r.follower_display_name.trim();
  return `${r.follower_id.slice(0, 8)}…`;
}

function initialFromRow(r: IncomingFollowRequestRow): string {
  const s = labelForFollower(r).replace(/^@/, "");
  return (s[0] ?? "?").toUpperCase();
}

export function SupabaseIncomingFollowRequests() {
  const [requests, setRequests] = useState<IncomingFollowRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/follows/requests");
    const j = (await res.json().catch(() => null)) as { requests?: IncomingFollowRequestRow[]; error?: string } | null;
    if (!res.ok) {
      setError(j?.error ?? "Couldn’t load requests.");
      setRequests([]);
      return;
    }
    setRequests(Array.isArray(j?.requests) ? j.requests : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function accept(id: string) {
    const res = await fetch(`/api/follows/requests/${encodeURIComponent(id)}/accept`, { method: "POST" });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(j?.error ?? "Couldn’t accept.");
      return;
    }
    setError(null);
    await load();
  }

  async function decline(id: string) {
    const res = await fetch(`/api/follows/requests/${encodeURIComponent(id)}/decline`, { method: "POST" });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(j?.error ?? "Couldn’t decline.");
      return;
    }
    setError(null);
    await load();
  }

  if (loading) {
    return (
      <div
        id="follow-requests"
        className="max-w-xl rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400"
      >
        Loading follow requests…
      </div>
    );
  }

  return (
    <div
      id="follow-requests"
      className="max-w-xl space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Follow requests</p>
        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
          When someone follows you and you require approval, their request appears here until you accept or decline.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {requests.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No pending requests.</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-amber-400 text-sm font-semibold text-white">
                  {initialFromRow(r)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{labelForFollower(r)}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">wants to follow you</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => accept(r.id)}
                  className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => decline(r.id)}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
