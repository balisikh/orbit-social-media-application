import Link from "next/link";

type ProfilePostGridProps = {
  isOwner: boolean;
  posts: Array<{
    id: string;
    imageUrl: string | null;
    videoUrl?: string | null;
    media?: Array<{ kind: "image" | "video"; url: string }>;
  }> | null;
  onDeletePost?: ((id: string) => void) | null;
  /** When true, each tile links to `/feed#post-{id}` to match `FeedPostList` anchors. */
  linkPostsToFeed?: boolean;
};

export function ProfilePostGrid({
  isOwner,
  posts,
  onDeletePost = null,
  linkPostsToFeed = true,
}: ProfilePostGridProps) {
  const count = posts?.length ?? 0;
  if (count === 0) {
    return (
      <div>
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Posts</h2>
        <div className="mt-2 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {isOwner ? "No posts yet" : "No posts to show"}
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {isOwner
              ? "Tap “New post” to publish your first post."
              : "This profile hasn’t published any posts yet."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Posts</h2>
      <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-2 lg:grid-cols-4">
        {(posts ?? []).slice(0, 30).map((post) => {
          const feedHref = linkPostsToFeed ? `/feed#post-${post.id}` : null;
          const isVideo = post.media?.[0]?.kind === "video" || Boolean(post.videoUrl);
          const isSlideshow = (post.media?.length ?? 0) > 1;
          const isSingleImage = !isVideo && !isSlideshow && Boolean(post.media?.[0]?.kind === "image" || post.imageUrl);
          const tileFrameClass = isSingleImage ? "aspect-[4/5] sm:aspect-square" : "aspect-square";
          const tile = (
            <>
              {isVideo ? (
                <div className="relative h-full w-full">
                  <video
                    src={post.media?.[0]?.url ?? post.videoUrl ?? ""}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute inset-0 grid place-items-center bg-black/10">
                    <span className="rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">Video</span>
                  </div>
                </div>
              ) : post.media?.[0]?.kind === "image" || post.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote image URLs
                <img
                  src={post.media?.[0]?.url ?? post.imageUrl ?? ""}
                  alt=""
                  className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full" aria-hidden />
              )}
              {post.media && post.media.length > 1 ? (
                <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
                  +{post.media.length - 1}
                </span>
              ) : null}
            </>
          );
          return (
            <div
              key={post.id}
              className={`group relative ${tileFrameClass} overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900`}
            >
              {feedHref ? (
                <Link
                  href={feedHref}
                  scroll={false}
                  className="relative block h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100 dark:focus-visible:ring-offset-zinc-900"
                  aria-label="View post on feed"
                >
                  {tile}
                </Link>
              ) : (
                <div className="relative block h-full w-full">{tile}</div>
              )}
              {isOwner && onDeletePost ? (
                <button
                  type="button"
                  onClick={() => onDeletePost(post.id)}
                  className="absolute right-2 top-2 z-10 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white opacity-0 backdrop-blur transition group-hover:opacity-100"
                >
                  Delete
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
