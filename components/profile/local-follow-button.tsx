"use client";

import { useEffect, useState } from "react";
import { hasPendingRequestLocal, isBlockedLocal, isFollowingLocal, requestFollowLocal, toggleUnfollowLocal } from "@/lib/follows/local";

type Props = {
  viewerKey: string;
  targetHandle: string;
};

export function LocalFollowButton({ viewerKey, targetHandle }: Props) {
  const [following, setFollowing] = useState(false);
  const [requested, setRequested] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    setFollowing(isFollowingLocal(viewerKey, targetHandle));
    setRequested(hasPendingRequestLocal(viewerKey, targetHandle));
    setBlocked(isBlockedLocal(targetHandle, viewerKey));
  }, [viewerKey, targetHandle]);

  return (
    <button
      type="button"
      onClick={() => {
        if (blocked) return;
        if (following) {
          const next = toggleUnfollowLocal(viewerKey, targetHandle);
          setFollowing(next.following);
        } else if (!requested) {
          const res = requestFollowLocal(viewerKey, targetHandle);
          if (res.ok) setRequested(true);
        }
        window.dispatchEvent(new Event("orbit:follows-updated"));
      }}
      disabled={blocked}
      className={
        blocked
          ? "cursor-not-allowed rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-500 opacity-70 dark:border-zinc-700 dark:text-zinc-400"
          : following
          ? "rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          : requested
            ? "rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
            : "rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      }
    >
      {blocked ? "Blocked" : following ? "Following" : requested ? "Requested" : "Follow"}
    </button>
  );
}

