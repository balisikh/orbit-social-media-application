"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  followedId: string;
  initialFollowing: boolean;
};

export function SupabaseFollowButton({ followedId, initialFollowing }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

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
          const j = (await res.json().catch(() => null)) as { following?: boolean } | null;
          if (res.ok && typeof j?.following === "boolean") {
            setFollowing(j.following);
            router.refresh();
          }
        } finally {
          setLoading(false);
        }
      }}
      className={
        following
          ? "rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          : "rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      }
    >
      {loading ? "…" : following ? "Following" : "Follow"}
    </button>
  );
}

