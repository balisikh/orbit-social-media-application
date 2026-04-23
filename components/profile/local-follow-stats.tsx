"use client";

import { useEffect, useState } from "react";
import { followersCountLocal, followingCountLocal } from "@/lib/follows/local";

type Props = {
  viewerKey: string;
  handle: string | null;
  onCounts?: (counts: { followers: number; following: number }) => void;
  followersHref?: string;
  followingHref?: string;
};

export function LocalFollowStats({ viewerKey, handle, onCounts, followersHref, followingHref }: Props) {
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  function refresh() {
    const f1 = handle ? followersCountLocal(handle) : 0;
    const f2 = followingCountLocal(viewerKey);
    setFollowers(f1);
    setFollowing(f2);
    onCounts?.({ followers: f1, following: f2 });
  }

  useEffect(() => {
    refresh();
    function onUpdated() {
      refresh();
    }
    window.addEventListener("orbit:follows-updated", onUpdated);
    return () => window.removeEventListener("orbit:follows-updated", onUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerKey, handle]);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      {followersHref ? (
        <a
          href={followersHref}
          className="inline-flex items-baseline gap-1 rounded-md px-1 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          <strong className="text-zinc-900 dark:text-zinc-50">{followers}</strong>
          <span className="text-zinc-600 dark:text-zinc-400">followers</span>
        </a>
      ) : (
        <span className="inline-flex items-baseline gap-1">
          <strong className="text-zinc-900 dark:text-zinc-50">{followers}</strong>
          <span className="text-zinc-600 dark:text-zinc-400">followers</span>
        </span>
      )}
      <span className="hidden h-4 w-px bg-zinc-200 dark:bg-zinc-800 sm:block" aria-hidden />
      {followingHref ? (
        <a
          href={followingHref}
          className="inline-flex items-baseline gap-1 rounded-md px-1 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          <strong className="text-zinc-900 dark:text-zinc-50">{following}</strong>
          <span className="text-zinc-600 dark:text-zinc-400">following</span>
        </a>
      ) : (
        <span className="inline-flex items-baseline gap-1">
          <strong className="text-zinc-900 dark:text-zinc-50">{following}</strong>
          <span className="text-zinc-600 dark:text-zinc-400">following</span>
        </span>
      )}
    </div>
  );
}

