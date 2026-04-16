type PageProps = {
  params: Promise<{ handle: string }>;
};

export default async function PublicProfilePage({ params }: PageProps) {
  const { handle } = await params;
  const display = decodeURIComponent(handle);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-violet-400 to-amber-300 ring-4 ring-white dark:ring-zinc-950" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            @{display}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Public profile — followers, following, and media grid will load from
            your API.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span>
              <strong className="text-zinc-900 dark:text-zinc-50">0</strong>{" "}
              posts
            </span>
            <span>
              <strong className="text-zinc-900 dark:text-zinc-50">0</strong>{" "}
              followers
            </span>
            <span>
              <strong className="text-zinc-900 dark:text-zinc-50">0</strong>{" "}
              following
            </span>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Follow
            </button>
            <button
              type="button"
              className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
            >
              Message
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-zinc-100 dark:bg-zinc-900"
          />
        ))}
      </div>
    </div>
  );
}
