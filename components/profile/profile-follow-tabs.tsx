"use client";

import { useCallback, useEffect, useState } from "react";
import { LocalFollowersDemoTools, LocalFollowManager } from "@/components/profile/local-follow-manager";
import { LocalFollowingDemoTools, LocalFollowingManager } from "@/components/profile/local-following-manager";

type Tab = "followers" | "following" | "demo";

function tabFromHash(hash: string): Tab | null {
  const h = hash.trim().toLowerCase();
  if (h === "#followers") return "followers";
  if (h === "#following") return "following";
  if (h === "#demo" || h === "#follow-demo") return "demo";
  return null;
}

type Props = {
  viewerKey: string;
  handle: string | null;
};

export function ProfileFollowTabs({ viewerKey, handle }: Props) {
  const showFollowers = Boolean(handle);
  const fallbackTab: Tab = showFollowers ? "followers" : "following";
  const [tab, setTab] = useState<Tab>(fallbackTab);

  const syncFromHash = useCallback(() => {
    const fromHash = tabFromHash(typeof window !== "undefined" ? window.location.hash : "");
    if (!fromHash) return;
    if (fromHash === "followers" && !showFollowers) {
      setTab("following");
      return;
    }
    setTab(fromHash);
  }, [showFollowers]);

  useEffect(() => {
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [syncFromHash]);

  function selectTab(next: Tab) {
    setTab(next);
    const hash = next === "demo" ? "demo" : next;
    window.history.replaceState(null, "", `#${hash}`);
  }

  return (
    <div id="follow-tabs" className="max-w-xl scroll-mt-24 space-y-0">
      <div
        role="tablist"
        aria-label="Followers, following, and demo tools"
        className="flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800"
      >
        {showFollowers ? (
          <button
            type="button"
            role="tab"
            aria-selected={tab === "followers"}
            onClick={() => selectTab("followers")}
            className={`relative shrink-0 rounded-t-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
              tab === "followers"
                ? "text-zinc-900 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-violet-600 dark:text-zinc-50 dark:after:bg-violet-400"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Followers
          </button>
        ) : null}
        <button
          type="button"
          role="tab"
          aria-selected={tab === "following"}
          onClick={() => selectTab("following")}
          className={`relative shrink-0 rounded-t-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
            tab === "following"
              ? "text-zinc-900 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-violet-600 dark:text-zinc-50 dark:after:bg-violet-400"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Following
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "demo"}
          onClick={() => selectTab("demo")}
          className={`relative shrink-0 rounded-t-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
            tab === "demo"
              ? "text-zinc-900 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-violet-600 dark:text-zinc-50 dark:after:bg-violet-400"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Demo tools
        </button>
      </div>

      <div className="pt-4">
        {showFollowers ? (
          <div id="followers" className={tab === "followers" ? "" : "hidden"}>
            <LocalFollowManager viewerKey={viewerKey} handle={handle!} />
          </div>
        ) : null}

        <div id="following" className={tab === "following" ? "" : "hidden"}>
          <LocalFollowingManager viewerKey={viewerKey} />
        </div>

        <div id="follow-demo" className={tab === "demo" ? "space-y-4" : "hidden"}>
          {showFollowers ? (
            <LocalFollowersDemoTools viewerKey={viewerKey} handle={handle!} />
          ) : (
            <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
              Set a username in Edit profile to use follower demo tools here.
            </p>
          )}
          <LocalFollowingDemoTools viewerKey={viewerKey} />
        </div>
      </div>
    </div>
  );
}
