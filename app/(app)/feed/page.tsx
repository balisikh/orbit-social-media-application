import Link from "next/link";
import { FeedPostList } from "@/components/feed/feed-post-list";
import { getRecentPosts } from "@/lib/posts/queries";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";
import { createClient } from "@/lib/supabase/server";
import { readDevSessionFromCookies } from "@/lib/auth/dev-session";
import { parseUsername } from "@/lib/auth/username";

export default async function FeedPage() {
  const configured = getSupabasePublicConfig().ready;
  const devSession = await readDevSessionFromCookies();

  let feed: React.ReactNode;
  if (configured) {
    const supabase = await createClient();
    const posts = await getRecentPosts(supabase, { limit: 60 });
    feed = (
      <FeedPostList
        mode="supabase"
        posts={posts.map((p) => ({
          id: p.id,
          imageUrl: p.image_url ?? null,
          caption: p.caption ?? null,
          createdAt: p.created_at,
          authorLabel: "Orbit",
        }))}
      />
    );
  } else {
    feed = (
      <FeedPostList
        mode="local"
        ownerKey={devSession?.email ?? "local"}
        handle={devSession?.username ? parseUsername(devSession.username) : null}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Feed</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            A photo-first stream from people you follow. Posts, likes, and comments will expand as you connect more features.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/me/post/new"
            className="shrink-0 self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            New post
          </Link>
          <Link
            href="/me"
            className="shrink-0 self-start rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Your profile
          </Link>
        </div>
      </div>

      {feed}
    </div>
  );
}
