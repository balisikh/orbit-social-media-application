"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProfilePostGrid } from "@/components/profile/profile-post-grid";

type Props = {
  isOwner: boolean;
  posts: Array<{ id: string; imageUrl: string | null }> | null;
};

export function SupabasePostGrid({ isOwner, posts }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  return (
    <ProfilePostGrid
      isOwner={isOwner}
      posts={posts}
      onDeletePost={
        isOwner
          ? async (id) => {
              if (deleting) return;
              setDeleting(id);
              try {
                await fetch("/api/posts/delete", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ id }),
                });
                router.refresh();
              } finally {
                setDeleting(null);
              }
            }
          : null
      }
    />
  );
}

