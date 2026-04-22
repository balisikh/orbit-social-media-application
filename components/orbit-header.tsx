"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/feed", label: "Feed" },
  { href: "/reels", label: "Reels" },
  { href: "/messages", label: "Messages" },
  { href: "/me", label: "Profile" },
] as const;

function isNavActive(pathname: string, href: string) {
  if (href === "/feed") {
    return pathname === "/feed" || pathname.startsWith("/feed/");
  }
  if (href === "/me") {
    return pathname === "/me" || pathname.startsWith("/me/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function linkClass(active: boolean) {
  return active
    ? "rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
    : "rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50";
}

export function OrbitHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-[color:var(--orbit-surface)]/90 backdrop-blur-md dark:border-zinc-800/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Orbit
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          {nav.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={linkClass(active)}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/auth/login"
            className="ml-1 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}
