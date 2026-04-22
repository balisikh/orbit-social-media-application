import { FeedPlaceholder } from "@/components/feed-placeholder";

export default function FeedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Feed
        </h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          Photo-first posts from people you follow. When Orbit is connected to your backend, this feed will fill with real posts.
        </p>
      </div>
      <FeedPlaceholder />
    </div>
  );
}
