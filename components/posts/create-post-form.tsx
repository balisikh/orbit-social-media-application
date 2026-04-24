"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";
import { addLocalPost } from "@/lib/posts/local";
import type { PostAudience } from "@/lib/posts/types";
import { ORBIT_DEMO_SLIDESHOW_POST_ID, upsertLocalDemoFeedExamples } from "@/lib/posts/sample-posts";

type Props = {
  ownerKey: string;
  onCreatedHref?: string;
};

function cleanCaption(s: string): string {
  return s.trim().slice(0, 2200);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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

function isHeicLike(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return type === "image/heic" || type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");
}

async function normalizeToBrowserFriendlyImage(file: File): Promise<{ file: File; dataUrl: string; mime: string }> {
  if (typeof window === "undefined") {
    return { file, dataUrl: "", mime: file.type || "image/jpeg" };
  }

  // HEIC/HEIF needs conversion in most browsers (especially Windows).
  if (isHeicLike(file)) {
    const { default: heic2any } = await import("heic2any");
    const converted = (await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    })) as Blob | Blob[];
    const blob = Array.isArray(converted) ? converted[0]! : converted;
    const outFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: blob.type || "image/jpeg" });
    return { file: outFile, dataUrl: await fileToDataUrl(outFile), mime: outFile.type || "image/jpeg" };
  }

  return { file, dataUrl: await fileToDataUrl(file), mime: file.type || "image/jpeg" };
}

async function drawEditedImage(opts: {
  dataUrl: string;
  overlayText: string;
  fontSize: number;
  outputMime?: string;
}): Promise<string> {
  const img = new Image();
  img.decoding = "async";
  img.src = opts.dataUrl;
  try {
    await img.decode();
  } catch {
    return opts.dataUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return opts.dataUrl;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const text = opts.overlayText.trim();
  if (text.length) {
    const fontSize = clamp(opts.fontSize, 14, 80);
    ctx.font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    const padding = Math.round(fontSize * 0.8);
    const boxH = Math.round(fontSize * 2.2);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, canvas.height - boxH, canvas.width, boxH);

    ctx.fillStyle = "white";
    ctx.fillText(text.slice(0, 60), canvas.width / 2, canvas.height - padding);
  }

  const mime = opts.outputMime?.startsWith("image/") ? opts.outputMime : "image/jpeg";
  try {
    if (mime === "image/png") return canvas.toDataURL("image/png");
    if (mime === "image/webp") return canvas.toDataURL("image/webp", 0.9);
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    return canvas.toDataURL("image/jpeg", 0.9);
  }
}

export function CreatePostForm({ ownerKey, onCreatedHref }: Props) {
  const router = useRouter();
  const configured = useMemo(() => getSupabasePublicConfig().ready, []);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [caption, setCaption] = useState("");
  const [audioLabel, setAudioLabel] = useState("Original audio · Orbit");
  const [files, setFiles] = useState<File[]>([]);
  const [overlayText, setOverlayText] = useState("");
  const [fontSize, setFontSize] = useState(34);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audience, setAudience] = useState<PostAudience>("public");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!files.length) {
      setPreviewUrls([]);
      return;
    }
    const urls = files.slice(0, 10).map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [files]);

  const canSubmit = useMemo(() => {
    return Boolean(cleanCaption(caption).length || files.length);
  }, [caption, files.length]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const nextCaption = cleanCaption(caption);
    if (!nextCaption && !files.length) {
      setError("Add a caption or upload photos/videos.");
      return;
    }

    setLoading(true);
    try {
      if (configured && files.some((f) => f.type?.startsWith("video/"))) {
        setError("Video posts aren’t enabled for cloud mode yet. Use images for now.");
        return;
      }
      if (!configured && files.some((f) => f.type?.startsWith("video/") && f.size > 12 * 1024 * 1024)) {
        setError("One of your videos is too large for preview mode (max 12MB each).");
        return;
      }

      const media: Array<{ kind: "image" | "video"; url: string }> = [];
      for (const f of files.slice(0, 10)) {
        const isVideo = Boolean(f.type?.startsWith("video/"));
        // Don't hard-block uploads based on canPlayType — codec support varies by browser/OS.
        if (isVideo) {
          media.push({ kind: "video", url: await fileToDataUrl(f) });
          continue;
        }
        const normalized = await normalizeToBrowserFriendlyImage(f);
        const imageDataUrl = normalized.dataUrl;
        const wantsEdit = Boolean(imageDataUrl && (overlayText.trim().length || fontSize !== 34));
        const editedDataUrl = wantsEdit
          ? await drawEditedImage({
              dataUrl: imageDataUrl,
              overlayText,
              fontSize,
              outputMime: normalized.mime || undefined,
            })
          : imageDataUrl;
        media.push({ kind: "image", url: editedDataUrl });
      }

      if (configured) {
        const firstImage = media.find((m) => m.kind === "image")?.url ?? null;
        const res = await fetch("/api/posts/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            caption: nextCaption || null,
            imageDataUrl: firstImage,
            audience,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(j?.error ?? "Couldn’t create post.");
          return;
        }
      } else {
        const hasVideo = media.some((m) => m.kind === "video");
        const created = addLocalPost(ownerKey, {
          caption: nextCaption || null,
          imageUrl: media[0]?.kind === "image" ? media[0]?.url ?? null : null,
          videoUrl: media[0]?.kind === "video" ? media[0]?.url ?? null : null,
          media,
          audioLabel: hasVideo ? audioLabel.trim() || null : null,
        });
        if (onCreatedHref) {
          router.push(`${onCreatedHref}#post-${created.id}`);
        }
      }

      setCaption("");
      setFiles([]);
      setAudioLabel("Original audio · Orbit");
      setAudience("public");
      setOverlayText("");
      setFontSize(34);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (configured && onCreatedHref) router.push(onCreatedHref);
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
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">New post</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Upload photos or videos, add optional text on images, then post. You can try different styles on different
          posts and see how they look in your feed.
        </p>
      </div>

      <div>
        <label htmlFor="new-post-image-file" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Upload photos or videos
        </label>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">One file</span> → a normal single post.{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Several files</span> (up to 10) → one post
          with a slideshow (dots, swipe, and arrows in the feed). Mix both across posts whenever you like.
        </p>
        <input
          ref={fileInputRef}
          id="new-post-image-file"
          type="file"
          accept="image/*,video/*"
          multiple
          disabled={loading}
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 10))}
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900 hover:file:bg-zinc-200 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:file:bg-zinc-900 dark:file:text-zinc-50 dark:hover:file:bg-zinc-800"
        />
        {previewUrls.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {previewUrls.map((u, idx) => {
              const f = files[idx];
              const isVideo = Boolean(f?.type?.startsWith("video/"));
              return (
                <div
                  key={u}
                  className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30"
                >
                  {isVideo ? (
                    <video src={u} className="h-auto w-full" controls playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- local preview
                    <img src={u} alt="" className="h-auto w-full object-cover" />
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="new-post-overlay" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Text on image
          </label>
          <input
            id="new-post-overlay"
            type="text"
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            disabled={loading || files.some((f) => f.type?.startsWith("video/"))}
            placeholder="Type text to add…"
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
        <div>
          <label htmlFor="new-post-fontsize" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Text size
          </label>
          <input
            id="new-post-fontsize"
            type="range"
            min={14}
            max={80}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            disabled={loading || files.some((f) => f.type?.startsWith("video/"))}
            className="mt-3 w-full"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{fontSize}px</p>
        </div>
      </div>

      <div>
        <label htmlFor="new-post-caption" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Caption
        </label>
        <textarea
          id="new-post-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={loading}
          rows={4}
          placeholder="Write something…"
          className="mt-1 w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </div>

      {configured ? (
        <fieldset className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-900/30">
          <legend className="px-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">Who can see this?</legend>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Public posts appear on your profile for everyone. Followers-only posts show there only to people who follow
            you, and appear in their home feed when they follow you.
          </p>
          <div className="mt-3 space-y-2" role="radiogroup" aria-label="Post visibility">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-2 py-2 has-[:checked]:border-violet-300 has-[:checked]:bg-white dark:has-[:checked]:border-violet-800 dark:has-[:checked]:bg-zinc-950">
              <input
                type="radio"
                name="post-audience"
                className="mt-1"
                checked={audience === "public"}
                onChange={() => setAudience("public")}
                disabled={loading}
              />
              <span>
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">Public</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">Anyone can view on your profile.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-2 py-2 has-[:checked]:border-violet-300 has-[:checked]:bg-white dark:has-[:checked]:border-violet-800 dark:has-[:checked]:bg-zinc-950">
              <input
                type="radio"
                name="post-audience"
                className="mt-1"
                checked={audience === "followers"}
                onChange={() => setAudience("followers")}
                disabled={loading}
              />
              <span>
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">Followers only</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  Hidden from non-followers; shown in followers’ feeds.
                </span>
              </span>
            </label>
          </div>
        </fieldset>
      ) : null}

      {files.some((f) => f.type?.startsWith("video/")) ? (
        <div>
          <label htmlFor="new-post-audio" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Audio label
          </label>
          <input
            id="new-post-audio"
            value={audioLabel}
            onChange={(e) => setAudioLabel(e.target.value)}
            disabled={loading}
            placeholder="Original audio · Orbit"
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            This appears as the “Original audio …” line on your video.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {!configured ? (
        <div className="rounded-2xl border border-dashed border-violet-200/80 bg-violet-50/40 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Try examples (local preview)</p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Adds <span className="font-medium text-zinc-800 dark:text-zinc-200">one single-image post</span> and{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">one three-slide slideshow</span> so you can
            compare them on your feed. Safe to click again — it replaces the same two demos.
          </p>
          <button
            type="button"
            disabled={loading || sampleBusy}
            onClick={() => {
              setSampleBusy(true);
              try {
                upsertLocalDemoFeedExamples(ownerKey);
                router.push(`/feed#post-${ORBIT_DEMO_SLIDESHOW_POST_ID}`);
                router.refresh();
              } finally {
                setSampleBusy(false);
              }
            }}
            className="mt-3 rounded-full border border-violet-300 bg-white px-4 py-2 text-xs font-semibold text-violet-900 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-100 dark:hover:bg-violet-900/40"
          >
            {sampleBusy ? "Adding…" : "Add example posts"}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Posting…" : "Post"}
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

