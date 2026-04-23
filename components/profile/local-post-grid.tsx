"use client";

import { useMemo, useSyncExternalStore } from "react";
import { deleteLocalPost, readLocalPosts, type LocalPost } from "@/lib/posts/local";
import { ProfilePostGrid } from "@/components/profile/profile-post-grid";

type Props = {
  ownerKey: string;
  isOwner: boolean;
};

export function LocalPostGrid({ ownerKey, isOwner }: Props) {
  const storageKey = useMemo(() => `orbit:posts:${ownerKey}`, [ownerKey]);

  const raw = useSyncExternalStore(
    (onStoreChange) => {
      function onStorage(e: StorageEvent) {
        if (e.key === storageKey) onStoreChange();
      }
      function onUpdated(e: Event) {
        const detailOwnerKey = (e as CustomEvent<{ ownerKey?: string }>)?.detail?.ownerKey;
        if (!detailOwnerKey || detailOwnerKey === ownerKey) onStoreChange();
      }
      window.addEventListener("storage", onStorage);
      window.addEventListener("orbit:posts-updated", onUpdated as EventListener);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("orbit:posts-updated", onUpdated as EventListener);
      };
    },
    () => {
      try {
        return window.localStorage.getItem(storageKey) ?? "";
      } catch {
        return "";
      }
    },
    () => "",
  );

  const posts = useMemo<LocalPost[]>(() => {
    try {
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? (parsed as LocalPost[]) : [];
    } catch {
      return readLocalPosts(ownerKey);
    }
  }, [raw, ownerKey]);

  return (
    <ProfilePostGrid
      isOwner={isOwner}
      posts={posts.map((p) => ({
        id: p.id,
        imageUrl: p.imageUrl,
        videoUrl: p.videoUrl ?? null,
        media: p.media,
      }))}
      onDeletePost={(id) => {
        deleteLocalPost(ownerKey, id);
      }}
    />
  );
}

