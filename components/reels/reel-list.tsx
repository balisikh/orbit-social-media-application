"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getReelVideoBlob } from "@/lib/reels/idb";
import { deleteLocalReel, readLocalReels, type LocalReel } from "@/lib/reels/local";
import { addComment, deleteComment, readReactions, toggleLike } from "@/lib/reactions/local";
import { ShareButton } from "@/components/share/share-button";
import { EmojiPicker } from "@/components/emoji/emoji-picker";

type ReelItem = {
  id: string;
  videoUrl: string;
  caption: string | null;
  audioLabel?: string | null;
};

type Props =
  | { mode: "local"; ownerKey: string; isOwner: boolean }
  | { mode: "supabase"; reels: ReelItem[]; isOwner: boolean };

function ActionButton({
  label,
  count,
  active = false,
  onClick,
}: {
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-full text-xs font-semibold text-white backdrop-blur ${
        active ? "bg-violet-500/40" : "bg-white/10"
      }`}
    >
      {label}
      {typeof count === "number" && count > 0 ? (
        <span className="sr-only">{count}</span>
      ) : null}
    </button>
  );
}

export function ReelList(props: Props) {
  const localOwnerKey = props.mode === "local" ? props.ownerKey : null;

  const [localReels, setLocalReels] = useState<LocalReel[]>(() => {
    if (typeof window === "undefined") return [];
    if (props.mode !== "local") return [];
    return readLocalReels(props.ownerKey);
  });
  /** Resolved playback URLs (object URLs for IndexedDB reels, or legacy data URLs). */
  const [resolvedVideoUrls, setResolvedVideoUrls] = useState<Record<string, string>>({});
  const resolveGenerationRef = useRef(0);
  const resolvedVideoUrlsRef = useRef<Record<string, string>>({});
  const [muted, setMuted] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [version, setVersion] = useState(0);
  const [emojiOpenForId, setEmojiOpenForId] = useState<string | null>(null);
  const emojiBtnRef = useRef<HTMLButtonElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const viewerKey = localOwnerKey ?? "viewer";

  useEffect(() => {
    if (!localOwnerKey) return;
    const ownerKey = localOwnerKey;
    function onStorage(e: StorageEvent) {
      if (e.key && e.key.includes(`orbit:reels:${ownerKey}`)) {
        setLocalReels(readLocalReels(ownerKey));
      }
    }
    window.addEventListener("storage", onStorage);
    function onUpdated() {
      setLocalReels(readLocalReels(ownerKey));
      // snap to top so the newest reel is clearly separate
      scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.addEventListener("orbit:reels-updated", onUpdated);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("orbit:reels-updated", onUpdated);
    };
  }, [localOwnerKey]);

  useEffect(() => {
    resolvedVideoUrlsRef.current = resolvedVideoUrls;
  }, [resolvedVideoUrls]);

  useEffect(() => {
    if (!localOwnerKey) {
      queueMicrotask(() => setResolvedVideoUrls({}));
      return;
    }
    const ownerKey = localOwnerKey;
    const gen = ++resolveGenerationRef.current;
    const objectUrlsThisRun: string[] = [];

    void (async () => {
      const next: Record<string, string> = {};
      for (const r of localReels) {
        if (resolveGenerationRef.current !== gen) {
          for (const u of objectUrlsThisRun) URL.revokeObjectURL(u);
          objectUrlsThisRun.length = 0;
          return;
        }
        if (r.videoDataUrl?.startsWith("data:video/")) {
          next[r.id] = r.videoDataUrl;
          continue;
        }
        if (r.videoBlobInIdb) {
          const blob = await getReelVideoBlob(ownerKey, r.id);
          if (resolveGenerationRef.current !== gen) {
            for (const u of objectUrlsThisRun) URL.revokeObjectURL(u);
            objectUrlsThisRun.length = 0;
            return;
          }
          if (blob) {
            const u = URL.createObjectURL(blob);
            objectUrlsThisRun.push(u);
            next[r.id] = u;
          }
        }
      }
      if (resolveGenerationRef.current !== gen) {
        for (const u of objectUrlsThisRun) URL.revokeObjectURL(u);
        objectUrlsThisRun.length = 0;
        return;
      }
      setResolvedVideoUrls(next);
    })();

    return () => {
      const urlsSnapshot = resolvedVideoUrlsRef.current;
      const genRef = resolveGenerationRef;
      genRef.current += 1;
      for (const u of Object.values(urlsSnapshot)) {
        if (u.startsWith("blob:")) URL.revokeObjectURL(u);
      }
      queueMicrotask(() => setResolvedVideoUrls({}));
    };
  }, [localOwnerKey, localReels]);

  const items = useMemo<ReelItem[]>(() => {
    if (props.mode === "supabase") return props.reels;
    return localReels.map((r) => ({
      id: r.id,
      videoUrl: r.videoDataUrl?.startsWith("data:video/")
        ? r.videoDataUrl
        : resolvedVideoUrls[r.id] ?? "",
      caption: r.caption,
      audioLabel: r.audioLabel ?? null,
    }));
  }, [props, localReels, resolvedVideoUrls]);
  const effectiveActiveId = useMemo(() => {
    if (items.length === 0) return null;
    if (activeId && items.some((r) => r.id === activeId)) return activeId;
    return items[0]!.id;
  }, [activeId, items]);

  useEffect(() => {
    if (items.length === 0) return;
    const els = items
      .map((r) => sectionRefs.current[r.id])
      .filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        let best: { id: string; ratio: number } | null = null;
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.reelId;
          if (!id) continue;
          const ratio = e.intersectionRatio ?? 0;
          if (!best || ratio > best.ratio) best = { id, ratio };
        }
        if (best && best.ratio >= 0.6) setActiveId(best.id);
      },
      { threshold: [0, 0.25, 0.5, 0.6, 0.75, 1] },
    );

    for (const el of els) obs.observe(el);
    return () => obs.disconnect();
  }, [items]);

  useEffect(() => {
    // Autoplay the active reel, pause others.
    for (const r of items) {
      const el = videoRefs.current[r.id];
      if (!el) continue;
      el.muted = muted;
      if (effectiveActiveId === r.id) {
        const p = el.play();
        // ignore autoplay errors (browser policies)
        void p?.catch(() => {});
      } else {
        el.pause();
      }
    }
  }, [effectiveActiveId, muted, items]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">No reels yet</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Upload your first reel to see it here.</p>
        <Link
          href="/reels/new"
          className="mt-4 inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New reel
        </Link>
      </div>
    );
  }

  return (
    <div className="-mx-4 sm:mx-0">
      <div className="mx-auto max-w-sm overflow-hidden rounded-2xl bg-zinc-900 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
        <div
          ref={scrollerRef}
          className="h-[min(85vh,52rem)] snap-y snap-mandatory overflow-y-auto overscroll-contain"
        >
          {items.map((r) => (
            <section
              key={r.id}
              className="relative h-[min(85vh,52rem)] snap-start overflow-hidden"
              aria-label="Reel"
              data-reel-id={r.id}
              ref={(el) => {
                sectionRefs.current[r.id] = el;
              }}
            >
              <video
                ref={(el) => {
                  videoRefs.current[r.id] = el;
                }}
                src={r.videoUrl || undefined}
                className="absolute inset-0 h-full w-full object-cover"
                playsInline
                muted={muted}
                loop
                controls={false}
                onClick={(e) => {
                  const el = e.currentTarget;
                  if (el.paused) {
                    void el.play().catch(() => {});
                    setActiveId(r.id);
                  } else {
                    el.pause();
                  }
                }}
                onEnded={() => {
                  // keep looping feel even if loop isn't honored
                  const el = videoRefs.current[r.id];
                  if (el) {
                    el.currentTime = 0;
                    void el.play().catch(() => {});
                  }
                }}
                onLoadedData={() => {
                  // mark active when first visible-ish
                  if (!effectiveActiveId) setActiveId(r.id);
                }}
              />

              {/* Right-side action stack */}
              <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-3 text-white">
                {(() => {
                  void version;
                  const reactions = readReactions(viewerKey, "reel", r.id);
                  return (
                    <>
                      <ActionButton
                        label="♥"
                        count={reactions.likeCount}
                        active={reactions.liked}
                        onClick={() => {
                          toggleLike(viewerKey, "reel", r.id);
                          setVersion((v) => v + 1);
                        }}
                      />
                      <ActionButton
                        label="💬"
                        count={reactions.comments.length}
                        active={commentingId === r.id}
                        onClick={() => {
                          setCommentingId((cur) => (cur === r.id ? null : r.id));
                          setCommentText("");
                        }}
                      />
                      <ShareButton
                        label="↗"
                        variant="icon"
                        title="Orbit reel"
                        text={r.caption ?? null}
                        urlPath={`/share/reel/${encodeURIComponent(r.id)}`}
                      />
                      {!props.isOwner ? (
                        <Link
                          href={`/messages?handle=${encodeURIComponent("orbit")}&name=${encodeURIComponent("Orbit")}`}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white backdrop-blur"
                          title="Message"
                        >
                          ✉
                        </Link>
                      ) : null}
                    </>
                  );
                })()}
              </div>

              {/* Top controls */}
              <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-3">
                <span className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  Reels
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMuted((m) => !m)}
                    className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
                  >
                    {muted ? "Muted" : "Sound on"}
                  </button>
                  {props.isOwner ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (props.mode === "supabase") {
                          await fetch("/api/reels/delete", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ id: r.id }),
                          });
                          window.location.reload();
                        } else {
                          await deleteLocalReel(props.ownerKey, r.id);
                          const next = readLocalReels(props.ownerKey);
                          setLocalReels(next);
                          setActiveId((prev) => (prev === r.id ? null : prev));
                        }
                      }}
                      className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Bottom caption */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-16 text-white">
                <p className="text-sm font-semibold">@orbit</p>
                <p className="mt-1 text-sm text-white/90">{r.caption?.trim() ? r.caption : " "}</p>
                <Link
                  href={`/audio/${encodeURIComponent(r.audioLabel || "Original audio · Orbit")}`}
                  className="mt-1 inline-block text-xs text-white/70 underline decoration-white/30 underline-offset-2 hover:text-white/85 hover:decoration-white/60"
                >
                  {r.audioLabel || "Original audio · Orbit"}
                </Link>
              </div>

              {commentingId === r.id ? (
                <div className="absolute inset-x-3 bottom-24 rounded-2xl bg-black/55 p-3 backdrop-blur">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment…"
                      className="min-w-0 flex-1 rounded-full border border-white/20 bg-black/30 px-4 py-2 text-sm text-white outline-none placeholder:text-white/60 focus:border-violet-300"
                    />
                    <button
                      ref={emojiBtnRef}
                      type="button"
                      onClick={() => setEmojiOpenForId((cur) => (cur === r.id ? null : r.id))}
                      className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/15"
                      aria-label="Open emoji picker"
                      title="Emoji"
                    >
                      🙂
                    </button>
                    <button
                      type="button"
                      disabled={!commentText.trim()}
                      onClick={() => {
                        addComment(viewerKey, "reel", r.id, commentText);
                        setCommentText("");
                        setEmojiOpenForId(null);
                        setVersion((v) => v + 1);
                      }}
                      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Send
                    </button>
                  </div>
                  {emojiOpenForId === r.id ? (
                    <EmojiPicker
                      anchorRef={emojiBtnRef as unknown as React.RefObject<HTMLElement | null>}
                      onClose={() => setEmojiOpenForId(null)}
                      onPick={(em) => setCommentText((t) => `${t}${em}`)}
                    />
                  ) : null}
                  {(() => {
                    void version;
                    const reactions = readReactions(viewerKey, "reel", r.id);
                    const last = reactions.comments.slice(-3);
                    if (!last.length) return null;
                    return (
                      <div className="mt-3 space-y-2">
                        {last.map((c) => (
                          <div key={c.id} className="flex items-start justify-between gap-2">
                            <p className="text-sm text-white/90">{c.text}</p>
                            <button
                              type="button"
                              onClick={() => {
                                deleteComment(viewerKey, "reel", r.id, c.id);
                                setVersion((v) => v + 1);
                              }}
                              className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </div>
      <p className="mx-auto mt-3 max-w-sm text-center text-xs text-zinc-500 dark:text-zinc-400">
        Scroll to switch reels · Tap video to pause/play
      </p>
    </div>
  );
}

