"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  followedId: string;
  initialFollowing: boolean;
  /** Viewer already has a pending follow request to this profile. */
  initialRequested?: boolean;
};

export function SupabaseFollowButton({
  followedId,
  initialFollowing,
  initialRequested = false,
}: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [requested, setRequested] = useState(initialRequested);
  const [loading, setLoading] = useState(false);

  const label = following ? "Following" : requested ? "Requested" : "Follow";
  const outlined = following || requested;

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/follows/toggle", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ followedId }),
          });
          const j = (await res.json().catch(() => null)) as {
            following?: boolean;
            requested?: boolean;
          } | null;
          if (res.ok && j && typeof j.following === "boolean" && typeof j.requested === "boolean") {
            setFollowing(j.following);
            setRequested(j.requested);
            router.refresh();
          }
        } finally {
          setLoading(false);
        }
      }}
      className={
        outlined
          ? "rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          : "rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      }
    >
      {loading ? "…" : label}
    </button>
  );
}
