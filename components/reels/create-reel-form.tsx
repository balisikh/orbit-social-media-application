"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";
import { addLocalReel } from "@/lib/reels/local";

type Props = {
  ownerKey: string;
  onCreatedHref?: string;
};

function cleanCaption(s: string): string {
  return s.trim().slice(0, 2200);
}

async function fileToDataUrl(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const base64 = btoa(binary);
  const mime = file.type?.trim() || "application/octet-stream";
  return `data:${mime};base64,${base64}`;
}

function canBrowserPlayVideo(file: File): boolean {
  if (typeof document === "undefined") return true;
  const type = file.type?.trim();
  if (!type) return true; // unknown type, allow and hope for the best
  const el = document.createElement("video");
  return Boolean(el.canPlayType(type));
}

export function CreateReelForm({ ownerKey, onCreatedHref }: Props) {
  const router = useRouter();
  const [caption, setCaption] = useState("");
  const [audioLabel, setAudioLabel] = useState("Original audio · Orbit");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playWarning, setPlayWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canSubmit = useMemo(() => Boolean(file), [file]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPlayWarning(null);
    if (!file) {
      setError("Upload a video.");
      return;
    }
    if (file.type && !file.type.startsWith("video/")) {
      setError("Please choose a video file.");
      return;
    }
    if (!canBrowserPlayVideo(file)) {
      setPlayWarning(
        "This video might not play in this browser. For best results, use MP4 (H.264) or WebM. We’ll still post it.",
      );
    }
    if (file.size > 40 * 1024 * 1024) {
      setError("Video is too large for preview mode. Please use a smaller file (max 40MB).");
      return;
    }

    setLoading(true);
    try {
      const configured = getSupabasePublicConfig().ready;
      const nextCaption = cleanCaption(caption);

      if (configured) {
        const videoDataUrl = await fileToDataUrl(file);
        const res = await fetch("/api/reels/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ caption: nextCaption || null, videoDataUrl }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(j?.error ?? "Couldn’t create reel.");
          return;
        }
      } else {
        await addLocalReel(ownerKey, {
          caption: nextCaption || null,
          videoFile: file,
          audioLabel: audioLabel.trim() || null,
        });
      }

      setCaption("");
      setAudioLabel("Original audio · Orbit");
      setFile(null);
      setPlayWarning(null);
      if (inputRef.current) inputRef.current.value = "";
      if (onCreatedHref) router.push(onCreatedHref);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">New reel</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Upload a short video and post it. Videos are stored in your browser’s IndexedDB (not localStorage), so you’re
          much less likely to hit storage limits.
        </p>
      </div>

      <div>
        <label htmlFor="new-reel-file" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Upload video
        </label>
        <input
          ref={inputRef}
          id="new-reel-file"
          type="file"
          accept="video/*"
          disabled={loading}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900 hover:file:bg-zinc-200 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:file:bg-zinc-900 dark:file:text-zinc-50 dark:hover:file:bg-zinc-800"
        />
        {previewUrl ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-black dark:border-zinc-800">
            <video src={previewUrl} className="aspect-[9/16] w-full object-cover" controls playsInline />
          </div>
        ) : null}
      </div>

      <div>
        <label htmlFor="new-reel-caption" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Caption
        </label>
        <textarea
          id="new-reel-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={loading}
          rows={3}
          placeholder="Write something…"
          className="mt-1 w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </div>

      <div>
        <label htmlFor="new-reel-audio" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Audio label
        </label>
        <input
          id="new-reel-audio"
          value={audioLabel}
          onChange={(e) => setAudioLabel(e.target.value)}
          disabled={loading}
          placeholder="Original audio · Orbit"
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          This appears as the “Original audio …” line on your reel.
        </p>
      </div>

      {playWarning ? (
        <p className="text-sm text-amber-700 dark:text-amber-300" role="status">
          {playWarning}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Posting…" : "Post reel"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

