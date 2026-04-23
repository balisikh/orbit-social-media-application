"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { normalizeAudioLabel } from "@/lib/audio/label";
import { replaceLocalAudioLabel, trySwapTitleArtistOrder } from "@/lib/audio/rename";
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

type AudioRow = {
  label: string;
  norm: string;
  reelsCount: number;
  videoPostsCount: number;
  total: number;
};

export function AudioLibraryPage({ ownerKey }: { ownerKey: string }) {
  const [q, setQ] = useState("");
  const [renameTarget, setRenameTarget] = useState<AudioRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameNotice, setRenameNotice] = useState<string | null>(null);
  const qNorm = useMemo(() => normalizeAudioLabel(q), [q]);

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

  const rows = useMemo<AudioRow[]>(() => {
    const map = new Map<
      string,
      { label: string; reelsCount: number; videoPostsCount: number; labelScore: number }
    >();

    function considerLabel(norm: string, rawLabel: string, bump: "reel" | "post") {
      if (!norm) return;
      const trimmed = (rawLabel || "").trim();
      const score = trimmed.length; // prefer more descriptive labels
      const existing = map.get(norm);
      if (!existing) {
        map.set(norm, {
          label: trimmed || rawLabel,
          reelsCount: bump === "reel" ? 1 : 0,
          videoPostsCount: bump === "post" ? 1 : 0,
          labelScore: score,
        });
        return;
      }
      if (bump === "reel") existing.reelsCount += 1;
      else existing.videoPostsCount += 1;
      if (score > existing.labelScore) {
        existing.label = trimmed || rawLabel;
        existing.labelScore = score;
      }
    }

    for (const r of reels) {
      const raw = r.audioLabel || "";
      const norm = normalizeAudioLabel(raw);
      considerLabel(norm, raw, "reel");
    }

    for (const p of posts) {
      const hasVideo = Boolean(p.videoUrl) || Boolean(p.media?.some((m) => m.kind === "video"));
      if (!hasVideo) continue;
      const raw = p.audioLabel || "";
      const norm = normalizeAudioLabel(raw);
      considerLabel(norm, raw, "post");
    }

    const out: AudioRow[] = Array.from(map.entries()).map(([norm, v]) => ({
      norm,
      label: v.label,
      reelsCount: v.reelsCount,
      videoPostsCount: v.videoPostsCount,
      total: v.reelsCount + v.videoPostsCount,
    }));

    out.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
    return out;
  }, [posts, reels]);

  const filtered = useMemo(() => {
    if (!qNorm) return rows;
    return rows.filter((r) => r.norm.includes(qNorm) || normalizeAudioLabel(r.label).includes(qNorm));
  }, [rows, qNorm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Audio library</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Every song label you’ve used on your reels and video posts. Prefer a consistent format like{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Song — Artists</span> so titles are easy to
            scan. Use <span className="font-medium">Rename</span> to fix old labels in one go.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/reels"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Reels
          </Link>
          <Link
            href="/feed"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Feed
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <label htmlFor="audio-search" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Search
        </label>
        <input
          id="audio-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Try "barota"'
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {filtered.length} audio label{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length ? (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.norm}
              className="flex flex-wrap items-stretch justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <Link
                href={`/audio/${encodeURIComponent(r.label)}`}
                className="min-w-0 flex-1 rounded-xl py-0.5 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <p className="truncate font-semibold">{r.label}</p>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  {r.reelsCount} reels · {r.videoPostsCount} video posts
                </p>
              </Link>
              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                  {r.total}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRenameNotice(null);
                    setRenameTarget(r);
                    setRenameValue(r.label);
                  }}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Rename
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">No audio labels yet</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create a reel and set the Audio label (e.g. “Sidhu Moose Wala - Barota”).
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/reels/new"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              New reel
            </Link>
            <Link
              href="/me/post/new"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              New post
            </Link>
          </div>
        </div>
      )}

      {renameTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => {
            setRenameTarget(null);
            setRenameNotice(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            role="dialog"
            aria-label="Rename audio label"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Rename audio</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Updates every reel and video post that uses this label (matched after normalizing spaces).
            </p>
            <label htmlFor="rename-audio" className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              New label
            </label>
            <textarea
              id="rename-audio"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              rows={3}
              className="mt-1 w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
            {trySwapTitleArtistOrder(renameValue) || trySwapTitleArtistOrder(renameTarget.label) ? (
              <button
                type="button"
                onClick={() => {
                  const s =
                    trySwapTitleArtistOrder(renameValue) || trySwapTitleArtistOrder(renameTarget.label);
                  if (s) setRenameValue(s);
                }}
                className="mt-2 text-xs font-semibold text-violet-700 underline underline-offset-2 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200"
              >
                Try song first (swap around the separator)
              </button>
            ) : null}
            {renameNotice ? (
              <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300" role="status">
                {renameNotice}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRenameTarget(null);
                  setRenameNotice(null);
                }}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!renameTarget) return;
                  const next = renameValue.trim();
                  if (!next) {
                    setRenameNotice("Please enter a new label (or cancel).");
                    return;
                  }
                  const { reelsUpdated, postsUpdated } = replaceLocalAudioLabel(
                    ownerKey,
                    renameTarget.norm,
                    next,
                  );
                  setRenameNotice(`Updated ${reelsUpdated} reel(s) and ${postsUpdated} video post(s).`);
                  setTimeout(() => {
                    setRenameTarget(null);
                    setRenameNotice(null);
                  }, 1200);
                }}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

