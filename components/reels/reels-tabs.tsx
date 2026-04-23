"use client";

import { useState } from "react";
import { ReelList } from "@/components/reels/reel-list";

type ReelItem = { id: string; videoUrl: string; caption: string | null };

type Props =
  | { mode: "local"; ownerKey: string }
  | { mode: "supabase"; reels: ReelItem[]; isOwner: boolean };

export function ReelsTabs(props: Props) {
  const [tab, setTab] = useState<"forYou" | "following">("forYou");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setTab("forYou")}
          className={
            tab === "forYou"
              ? "rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "rounded-full px-3 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400"
          }
        >
          For you
        </button>
        <button
          type="button"
          onClick={() => setTab("following")}
          className={
            tab === "following"
              ? "rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "rounded-full px-3 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400"
          }
        >
          Following
        </button>
      </div>

      {tab === "following" ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Following is coming soon</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Once we add follow relationships, this tab will show reels from people you follow.
          </p>
        </div>
      ) : props.mode === "supabase" ? (
        <ReelList mode="supabase" reels={props.reels} isOwner={props.isOwner} />
      ) : (
        <ReelList mode="local" ownerKey={props.ownerKey} isOwner />
      )}
    </div>
  );
}

