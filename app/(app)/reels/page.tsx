export default function ReelsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Reels</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          Vertical short video in a swipeable, full-screen player. Below is a layout preview; upload, audio, and
          recommendations ship when you wire media and APIs.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          For you
        </span>
        <span className="rounded-full px-3 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Following</span>
        <span className="ml-auto rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          Preview
        </span>
      </div>
      <div className="mx-auto flex max-w-sm flex-col gap-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-zinc-900 shadow-lg ring-1 ring-black/5 dark:ring-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-700 via-zinc-900 to-zinc-950" aria-hidden />
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-4 text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold backdrop-blur">
                ♥
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold backdrop-blur">
                ↗
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-16 text-white">
              <p className="text-sm font-semibold">Reel preview {n}</p>
              <p className="mt-0.5 text-xs text-white/75">@orbit · sample caption and audio will appear here</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
