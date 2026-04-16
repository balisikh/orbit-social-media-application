const tiles = Array.from({ length: 12 }, (_, i) => i);

export function FeedPlaceholder() {
  return (
    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:gap-2 lg:grid-cols-4">
      {tiles.map((i) => (
        <article
          key={i}
          className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900"
        >
          <div
            className="absolute inset-0 bg-gradient-to-br from-violet-200/40 via-transparent to-amber-200/30 opacity-80 transition group-hover:opacity-100 dark:from-violet-500/20 dark:to-amber-500/15"
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-3 pt-12 opacity-0 transition group-hover:opacity-100">
            <p className="truncate text-xs font-medium text-white">Photo {i + 1}</p>
            <p className="text-[11px] text-white/80">@orbit</p>
          </div>
        </article>
      ))}
    </div>
  );
}
