"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { normalizeAudioLabel } from "@/lib/audio/label";
import { ReelLocalVideo } from "@/components/reels/reel-local-video";
import { readLocalPosts, type LocalPost } from "@/lib/posts/local";
import { readLocalReels, type LocalReel } from "@/lib/reels/local";

function getLocalStorageString(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function useLocalStorageKeyRaw(key: string, eventName: string) {
  return useSyncExternalStore(
    (onStoreChange) => {
      function onStorage(e: StorageEvent) {
        if (e.key === key) onStoreChange();
      }
      function onUpdated() {
        onStoreChange();
      }
      window.addEventListener("storage", onStorage);
      window.addEventListener(eventName, onUpdated);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(eventName, onUpdated);
      };
    },
    () => getLocalStorageString(key),
    () => "",
  );
}

export function AudioPage({ ownerKey, label }: { ownerKey: string; label: string }) {
  const labelNorm = useMemo(() => normalizeAudioLabel(label), [label]);

  const postsRaw = useLocalStorageKeyRaw(`orbit:posts:${ownerKey}`, "orbit:posts-updated");
  const reelsRaw = useLocalStorageKeyRaw(`orbit:reels:${ownerKey}`, "orbit:reels-updated");

  const posts = useMemo<LocalPost[]>(() => {
    try {
      const parsed = JSON.parse(postsRaw || "[]");
      return Array.isArray(parsed) ? (parsed as LocalPost[]) : [];
    } catch {
      return readLocalPosts(ownerKey);
    }
  }, [postsRaw, ownerKey]);

  const reels = useMemo<LocalReel[]>(() => {
    try {
      const parsed = JSON.parse(reelsRaw || "[]");
      return Array.isArray(parsed) ? (parsed as LocalReel[]) : [];
    } catch {
      return readLocalReels(ownerKey);
    }
  }, [reelsRaw, ownerKey]);

  const matchingReels = useMemo(() => {
    return reels.filter((r) => normalizeAudioLabel(r.audioLabel || "") === labelNorm);
  }, [reels, labelNorm]);

  const matchingVideoPosts = useMemo(() => {
    return posts.filter((p) => {
      const hasVideo = Boolean(p.videoUrl) || Boolean(p.media?.some((m) => m.kind === "video"));
      if (!hasVideo) return false;
      return normalizeAudioLabel(p.audioLabel || "") === labelNorm;
    });
  }, [posts, labelNorm]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Audio</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{label}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-zinc-100 px-3 py-1.5 font-semibold text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
            {matchingReels.length} reels
          </span>
          <span className="rounded-full bg-zinc-100 px-3 py-1.5 font-semibold text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
            {matchingVideoPosts.length} video posts
          </span>
          <Link
            href="/audio"
            className="rounded-full border border-zinc-300 px-3 py-1.5 font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Audio library
          </Link>
          <Link
            href="/reels"
            className="rounded-full border border-zinc-300 px-3 py-1.5 font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Open Reels
          </Link>
          <Link
            href="/feed"
            className="rounded-full border border-zinc-300 px-3 py-1.5 font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Open Feed
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Reels using this audio</h2>
        {matchingReels.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matchingReels.map((r) => (
              <div
                key={r.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-black dark:border-zinc-800"
              >
                <ReelLocalVideo ownerKey={ownerKey} reel={r} className="aspect-[9/16] w-full object-cover" />
                <div className="bg-white p-3 text-sm text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
                  <p className="font-semibold">Reel</p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{r.caption ?? " "}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No reels found for this audio yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Video posts using this audio</h2>
        {matchingVideoPosts.length ? (
          <div className="space-y-2">
            {matchingVideoPosts.map((p) => (
              <Link
                key={p.id}
                href={`/feed#post-${encodeURIComponent(p.id)}`}
                className="block rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                <p className="font-semibold">Open post</p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{p.caption ?? " "}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No video posts found for this audio yet.</p>
        )}
      </section>
    </div>
  );
}

