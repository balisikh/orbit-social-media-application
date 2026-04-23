"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  label?: string;
  title: string;
  text?: string | null;
  urlPath: string;
  className?: string;
  variant?: "text" | "icon";
};

function absoluteUrl(urlPath: string): string {
  if (typeof window === "undefined") return urlPath;
  try {
    return new URL(urlPath, window.location.origin).toString();
  } catch {
    return urlPath;
  }
}

export function ShareButton({ label = "Share", title, text, urlPath, className, variant = "text" }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; align: "left" | "right" }>({
    top: 0,
    left: 0,
    align: "right",
  });
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const url = useMemo(() => absoluteUrl(urlPath), [urlPath]);
  const urlDisplay = useMemo(() => {
    try {
      const u = new URL(url);
      return `${u.origin}${u.pathname}`;
    } catch {
      return url;
    }
  }, [url]);
  const body = text?.trim() ? `${text.trim()}\n\n${url}` : url;
  const subject = title;

  async function onShare() {
    setShareError(null);
    const el = btnRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const margin = 8;
      const width = Math.min(320, window.innerWidth - margin * 2);
      const alignRight = rect.right >= window.innerWidth / 2;
      const left = alignRight ? rect.right - width : rect.left;
      const approxMenuHeight = Math.min(window.innerHeight * 0.75, 520);
      const preferBelow = rect.bottom + margin + approxMenuHeight <= window.innerHeight - margin;
      const unclampedTop = preferBelow ? rect.bottom + margin : rect.top - margin - approxMenuHeight;
      const top = Math.max(margin, Math.min(unclampedTop, window.innerHeight - margin - 120));
      setPos({
        top,
        left: Math.max(margin, Math.min(left, window.innerWidth - width - margin)),
        align: alignRight ? "right" : "left",
      });
    }
    setOpen(true);
  }

  async function onNativeShare() {
    setShareError(null);
    if (typeof navigator === "undefined" || !("share" in navigator)) {
      setShareError("Share sheet is not available in this browser.");
      return;
    }
    try {
      const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
      await nav.share?.({ title, text: text ?? undefined, url });
    } catch {
      // user cancelled or browser rejected
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  const mailtoHref = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const outlookHref = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const yahooHref = `https://compose.mail.yahoo.com/?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text?.trim() ? text.trim() : title)}&url=${encodeURIComponent(url)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(body)}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text?.trim() ? text.trim() : title)}`;
  const redditHref = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onResize() {
      setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => void onShare()}
        className={
          variant === "icon"
            ? "flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white backdrop-blur"
            : "font-semibold text-zinc-700 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
        }
      >
        {label}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[1000]">
              <button
                type="button"
                aria-label="Close share menu"
                className="absolute inset-0 cursor-default bg-transparent"
                onClick={() => setOpen(false)}
              />
              <div
                className="absolute w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
                style={{
                  top: `${pos.top}px`,
                  left: `${pos.left}px`,
                  maxHeight: "calc(100vh - 1rem)",
                }}
                role="dialog"
                aria-label="Share menu"
              >
                <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">Share this post</p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400" title={url}>
                      {urlDisplay}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void onCopy()}
                      className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      {copied ? "Copied" : "Copy link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="max-h-[min(65vh,28rem)] overflow-y-auto p-2">
                  {"share" in navigator ? (
                    <div className="mb-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900/30">
                      <p className="px-2 pb-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">Apps</p>
                      <button
                        type="button"
                        onClick={() => void onNativeShare()}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-white dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        Share to apps (Instagram, TikTok, etc.)
                      </button>
                      <button
                        type="button"
                        onClick={() => void onNativeShare()}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-white dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        Instagram (via share sheet)
                      </button>
                      <button
                        type="button"
                        onClick={() => void onNativeShare()}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-white dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        TikTok (via share sheet)
                      </button>
                    </div>
                  ) : null}

                  <p className="px-3 pt-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email</p>

                  <a
                    href={mailtoHref}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Email (default app)
                  </a>

                  <a
                    href={gmailHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Gmail
                  </a>

                  <a
                    href={outlookHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Outlook / Hotmail
                  </a>

                  <a
                    href={yahooHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Yahoo Mail
                  </a>

                  <p className="px-3 pt-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300">Social</p>
                  <a
                    href={facebookHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Share to Facebook
                  </a>

                  <a
                    href={xHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Share to X
                  </a>

                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Share to WhatsApp
                  </a>

                  <a
                    href={telegramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Share to Telegram
                  </a>

                  <a
                    href={linkedinHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Share to LinkedIn
                  </a>

                  <a
                    href={redditHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Share to Reddit
                  </a>

                  {shareError ? (
                    <div className="mt-1 rounded-xl px-3 py-2 text-xs text-red-600 dark:text-red-400">
                      {shareError}
                    </div>
                  ) : (
                    <div className="mt-1 rounded-xl px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                      Tip: Instagram/TikTok sharing works via “Share to apps”.
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

