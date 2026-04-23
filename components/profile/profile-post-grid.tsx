type ProfilePostGridProps = {
  isOwner: boolean;
  postCount: number;
};

export function ProfilePostGrid({ isOwner, postCount }: ProfilePostGridProps) {
  if (postCount === 0) {
    return (
      <div>
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Posts</h2>
        <div className="mt-2 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {isOwner ? "No posts yet" : "No posts to show"}
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {isOwner
              ? "Your posts will show up here as soon as your feed is connected."
              : "This profile hasn’t published any posts yet."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Posts</h2>
      <div className="mt-2 grid grid-cols-3 gap-1 sm:gap-2">
        {Array.from({ length: Math.min(postCount, 9) }, (_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-zinc-100 dark:bg-zinc-900" aria-hidden />
        ))}
      </div>
    </div>
  );
}
