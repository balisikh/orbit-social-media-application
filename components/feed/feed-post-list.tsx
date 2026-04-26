"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { readLocalPosts, type LocalPost } from "@/lib/posts/local";
import { formatShortTime } from "@/lib/posts/format";
import { addComment, deleteComment, readReactions, toggleLike } from "@/lib/reactions/local";
import { ShareButton } from "@/components/share/share-button";
import { EmojiPicker } from "@/components/emoji/emoji-picker";

type PostItem = {
  id: string;
  imageUrl: string | null;
  videoUrl?: string | null;
  media?: Array<{ kind: "image" | "video"; url: string }>;
  audioLabel?: string | null;
  caption: string | null;
  createdAt: string;
  authorLabel: string;
};

type Props =
  | {
      mode: "local";
      ownerKey: string;
      handle: string | null;
    }
  | {
      mode: "supabase";
      posts: Array<{ id: string; imageUrl: string | null; caption: string | null; createdAt: string; authorLabel: string }>;
    };

function mapLocalPosts(posts: LocalPost[], handle: string | null): PostItem[] {
  return posts.map((p) => ({
    id: p.id,
    imageUrl: p.imageUrl,
    videoUrl: p.videoUrl ?? null,
    media: p.media,
    audioLabel: p.audioLabel ?? null,
    caption: p.caption,
    createdAt: p.createdAt,
    authorLabel: handle ? `@${handle}` : "You",
  }));
}

function MediaCarousel({
  media,
  audioLabel = "Original audio · Orbit",
}: {
  media: Array<{ kind: "image" | "video"; url: string }>;
  audioLabel?: string;
}) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const n = media.length;
  const safeIdx = idx >= 0 && idx < n ? idx : 0;
  const item = media[safeIdx]!;

  function goPrev() {
    setIdx((cur) => (cur - 1 + n) % n);
  }
  function goNext() {
    setIdx((cur) => (cur + 1) % n);
  }

  return (
    <div>
      <div
        className="relative outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100 dark:focus-visible:ring-offset-zinc-900"
        tabIndex={n > 1 ? 0 : undefined}
        role={n > 1 ? "region" : undefined}
        aria-label={n > 1 ? `Post slideshow, slide ${safeIdx + 1} of ${n}. Use arrow keys when focused.` : undefined}
        onKeyDown={(e) => {
          if (n <= 1) return;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            goPrev();
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            goNext();
          }
        }}
        onTouchStart={(e) => {
          if (n <= 1) return;
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (n <= 1 || touchStartX.current == null) return;
          const x = e.changedTouches[0]?.clientX;
          if (x == null) {
            touchStartX.current = null;
            return;
          }
          const dx = x - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(dx) < 56) return;
          if (dx > 0) goPrev();
          else goNext();
        }}
      >
        {item.kind === "video" ? (
          <video src={item.url} className="h-auto w-full" controls playsInline preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- remote or data URLs
          <img src={item.url} alt="" className="h-auto w-full object-cover" loading="lazy" />
        )}
        {item.kind === "video" ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-3 pt-10 text-white">
            <Link
              href={`/audio/${encodeURIComponent(audioLabel)}`}
              className="text-xs font-semibold text-white/90 underline decoration-white/40 underline-offset-2 hover:decoration-white/70"
            >
              {audioLabel}
            </Link>
          </div>
        ) : null}
        {n > 1 ? (
          <>
            <div className="absolute left-2 top-2 flex max-w-[min(100%,14rem)] flex-wrap items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
              {media.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`rounded-full px-1.5 py-0.5 transition ${
                    i === safeIdx ? "bg-white/25" : "bg-transparent hover:bg-white/15"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                  title={`Slide ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 z-[1] -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-black/65"
              aria-label="Previous slide"
            >
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-black/65"
              aria-label="Next slide"
            >
              Next
            </button>
            <div className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
              {safeIdx + 1}/{n}
            </div>
          </>
        ) : null}
      </div>
      {n > 1 ? (
        <div className="flex flex-col items-center gap-1.5 border-t border-zinc-200/80 bg-zinc-50/90 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center justify-center gap-1.5" role="tablist" aria-label="Slide indicators">
            {media.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === safeIdx}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIdx(i)}
                className={`h-2 rounded-full transition-all ${
                  i === safeIdx ? "w-6 bg-zinc-800 dark:bg-zinc-100" : "w-2 bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-600 dark:hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>
          <p className="px-3 text-center text-[10px] text-zinc-500 dark:text-zinc-400">
            Swipe left or right on the photo · Tap the carousel, then use ← → keys
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function FeedPostList(props: Props) {
  const localOwnerKey = props.mode === "local" ? props.ownerKey : null;

  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [version, setVersion] = useState(0);
  const viewerKey = localOwnerKey ?? "viewer";
  const [emojiOpenForId, setEmojiOpenForId] = useState<string | null>(null);
  const emojiBtnRef = useRef<HTMLButtonElement | null>(null);

  const localPostsRaw = useSyncExternalStore(
    (onStoreChange) => {
      if (!localOwnerKey) return () => {};
      function onStorage(e: StorageEvent) {
        if (e.key && e.key.includes(`orbit:posts:${localOwnerKey}`)) onStoreChange();
      }
      // Also handle same-tab updates (localStorage doesn't fire `storage` in same tab)
      function onUpdated() {
        onStoreChange();
      }
      window.addEventListener("storage", onStorage);
      window.addEventListener("orbit:posts-updated", onUpdated);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("orbit:posts-updated", onUpdated);
      };
    },
    () => {
      if (!localOwnerKey) return "";
      try {
        return window.localStorage.getItem(`orbit:posts:${localOwnerKey}`) ?? "";
      } catch {
        return "";
      }
    },
    () => "",
  );

  const localPosts = useMemo<LocalPost[]>(() => {
    if (props.mode !== "local") return [];
    // Parse the raw storage string so the snapshot is stable/cached.
    try {
      const parsed = JSON.parse(localPostsRaw || "[]");
      return Array.isArray(parsed) ? (parsed as LocalPost[]) : [];
    } catch {
      // fallback to existing helper if the stored value isn't JSON
      return localOwnerKey ? readLocalPosts(localOwnerKey) : [];
    }
  }, [localPostsRaw, props.mode, localOwnerKey]);

  const items = useMemo<PostItem[]>(() => {
    if (props.mode === "supabase") return props.posts;
    return mapLocalPosts(localPosts, props.handle);
  }, [props, localPosts]);

  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/feed") return;
    function scrollToPostHash() {
      const id = window.location.hash.replace(/^#/, "");
      if (!id.startsWith("post-")) return;
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    const tid = window.setTimeout(scrollToPostHash, 0);
    window.addEventListener("hashchange", scrollToPostHash);
    return () => {
      window.clearTimeout(tid);
      window.removeEventListener("hashchange", scrollToPostHash);
    };
  }, [pathname, items.length]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Your feed is empty</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create a post to see it here.
        </p>
        <Link
          href="/me/post/new"
          className="mt-4 inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New post
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 lg:max-w-3xl">
      {items.map((p) => (
        (() => {
          void version; // rerender when reactions change
          const reactions = readReactions(viewerKey, "post", p.id);
          const isOpen = commentingId === p.id;
          return (
        <article
          key={p.id}
          id={`post-${p.id}`}
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{p.authorLabel}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatShortTime(p.createdAt)}</p>
            </div>
            <Link
              href="/me"
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Profile
            </Link>
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-900">
            {p.media?.length ? (
              <MediaCarousel media={p.media} audioLabel={p.audioLabel || "Original audio · Orbit"} />
            ) : p.videoUrl ? (
              <div className="relative">
                <video src={p.videoUrl} className="h-auto w-full" controls playsInline preload="metadata" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-3 pt-10 text-white">
                  <Link
                    href={`/audio/${encodeURIComponent(p.audioLabel || "Original audio · Orbit")}`}
                    className="text-xs font-semibold text-white/90 underline decoration-white/40 underline-offset-2 hover:decoration-white/70"
                  >
                    {p.audioLabel || "Original audio · Orbit"}
                  </Link>
                </div>
              </div>
            ) : p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote or data URLs
              <img src={p.imageUrl} alt="" className="h-auto w-full object-cover" loading="lazy" />
            ) : (
              <div className="aspect-[4/5]" aria-hidden />
            )}
          </div>

          {p.caption ? (
            <p className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{p.caption}</p>
          ) : null}

          <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <div className="flex items-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => {
                  toggleLike(viewerKey, "post", p.id);
                    setVersion((v) => v + 1);
                }}
                className={`font-semibold transition ${
                  reactions.liked ? "text-violet-700 dark:text-violet-300" : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                Like{reactions.likeCount ? ` (${reactions.likeCount})` : ""}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCommentingId((cur) => (cur === p.id ? null : p.id));
                  setCommentText("");
                }}
                className="font-semibold text-zinc-700 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Comment{reactions.comments.length ? ` (${reactions.comments.length})` : ""}
              </button>
              <ShareButton
                title="Orbit post"
                text={p.caption ?? null}
                urlPath={`/share/post/${encodeURIComponent(p.id)}`}
              />
              {props.mode === "local" && props.handle ? (
                <Link
                  href={`/messages?handle=${encodeURIComponent(props.handle)}&name=${encodeURIComponent(`@${props.handle}`)}`}
                  className="font-semibold text-zinc-700 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                  title="Message the author"
                >
                  Message
                </Link>
              ) : null}
            </div>

            {isOpen ? (
              <div className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                  <button
                    ref={emojiBtnRef}
                    type="button"
                    onClick={() => setEmojiOpenForId((cur) => (cur === p.id ? null : p.id))}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                    aria-label="Open emoji picker"
                    title="Emoji"
                  >
                    🙂
                  </button>
                  <button
                    type="button"
                    disabled={!commentText.trim()}
                    onClick={() => {
                      addComment(viewerKey, "post", p.id, commentText);
                      setCommentText("");
                      setCommentingId(p.id);
                      setEmojiOpenForId(null);
                      setVersion((v) => v + 1);
                    }}
                    className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Send
                  </button>
                </div>
                {emojiOpenForId === p.id ? (
                  <EmojiPicker
                    anchorRef={emojiBtnRef as unknown as React.RefObject<HTMLElement | null>}
                    onClose={() => setEmojiOpenForId(null)}
                    onPick={(em) => setCommentText((t) => `${t}${em}`)}
                  />
                ) : null}

                {reactions.comments.length ? (
                  <div className="space-y-2">
                    {reactions.comments.slice(-3).map((c) => (
                      <div key={c.id} className="flex items-start justify-between gap-2">
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{c.text}</p>
                        <button
                          type="button"
                          onClick={() => {
                            deleteComment(viewerKey, "post", p.id, c.id);
                            setVersion((v) => v + 1);
                          }}
                          className="shrink-0 rounded-full border border-zinc-300 px-2 py-0.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </article>
          );
        })()
      ))}
    </div>
  );
}

