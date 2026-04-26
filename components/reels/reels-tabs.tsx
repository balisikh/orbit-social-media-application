"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ReelList } from "@/components/reels/reel-list";

const LocalReelListClient = dynamic(() => import("@/components/reels/local-reel-list-client"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Loading reels…</p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Reading saved reels from this browser.</p>
    </div>
  ),
});

type ReelItem = { id: string; videoUrl: string; caption: string | null };

type Props =
  | { mode: "local"; ownerKey: string }
  | { mode: "supabase"; forYouReels: ReelItem[]; followingReels: ReelItem[]; isOwner: boolean };

export function ReelsTabs(props: Props) {
  const [tab, setTab] = useState<"forYou" | "following">("forYou");
  const followingEmpty = props.mode === "supabase" ? props.followingReels.length === 0 : false;

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

      {props.mode === "supabase" ? (
        tab === "following" ? (
          followingEmpty ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">No reels from following yet</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Follow someone who has posted a reel, or check back after they upload.
              </p>
            </div>
          ) : (
            <ReelList mode="supabase" reels={props.followingReels} isOwner={props.isOwner} />
          )
        ) : (
          <ReelList mode="supabase" reels={props.forYouReels} isOwner={props.isOwner} />
        )
      ) : (
        <LocalReelListClient ownerKey={props.ownerKey} />
      )}
    </div>
  );
}

