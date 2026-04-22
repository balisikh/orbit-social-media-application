import Link from "next/link";
import { FeedPlaceholder } from "@/components/feed-placeholder";

export default function FeedPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Feed</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            A photo-first stream from people you follow. Connect your backend to show real posts, likes, and comments.
          </p>
        </div>
        <Link
          href="/me"
          className="shrink-0 self-start rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Your profile
        </Link>
      </div>
      <FeedPlaceholder />
    </div>
  );
}
