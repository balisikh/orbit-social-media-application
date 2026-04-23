"use client";

import Link from "next/link";

export function NewPostButton() {
  return (
    <Link
      href="/me/post/new"
      className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      New post
    </Link>
  );
}

