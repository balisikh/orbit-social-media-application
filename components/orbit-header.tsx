import Link from "next/link";

const nav = [
  { href: "/", label: "Feed" },
  { href: "/reels", label: "Reels" },
  { href: "/messages", label: "Messages" },
  { href: "/me", label: "Profile" },
] as const;

export function OrbitHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-[color:var(--orbit-surface)]/90 backdrop-blur-md dark:border-zinc-800/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Orbit
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/auth/login"
            className="ml-1 rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
