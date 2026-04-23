"use client";

import { useMemo, useState } from "react";

type Props = {
  href: string;
};

export function CopyProfileLinkButton({ href }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const absoluteUrl = useMemo(() => {
    if (href.startsWith("http://") || href.startsWith("https://")) return href;
    if (typeof window === "undefined") return href;
    try {
      return new URL(href, window.location.origin).toString();
    } catch {
      return href;
    }
  }, [href]);

  async function onCopy() {
    setStatus("idle");
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1200);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 1500);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
    >
      {status === "copied" ? "Copied" : status === "error" ? "Copy failed" : "Copy profile link"}
    </button>
  );
}

