export default function ReelsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Reels
        </h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          Short vertical video. This route is ready for a full-screen swipe player
          and upload pipeline.
        </p>
      </div>
      <div className="mx-auto flex max-w-sm flex-col gap-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-zinc-900 shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p className="text-sm font-medium">Reel preview {n}</p>
              <p className="text-xs text-white/70">@orbit</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
