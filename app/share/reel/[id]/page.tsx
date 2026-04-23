import Link from "next/link";

type PageProps = { params: Promise<{ id: string }> };

export default async function ShareReelPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Shared reel</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Reel id: <span className="font-mono text-xs">{id}</span>
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Open the reels viewer to watch:</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/reels"
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Open Reels
        </Link>
      </div>
    </div>
  );
}

