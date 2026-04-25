"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { HeaderSessionMode } from "@/lib/auth/header-session";
import { HeaderAuthActions } from "@/components/header-auth-actions";

const nav = [
  { href: "/feed", label: "Feed" },
  { href: "/explore", label: "Explore" },
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
    ? "shrink-0 rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
    : "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50";
}

type OrbitHeaderProps = {
  signedInEmail: string | null;
  sessionMode: HeaderSessionMode;
  signedInHandle: string | null;
  signedInDisplayName: string | null;
};

export function OrbitHeader({
  signedInEmail,
  sessionMode,
  signedInHandle,
  signedInDisplayName,
}: OrbitHeaderProps) {
  const pathname = usePathname();
  const signedIn = Boolean(signedInEmail && sessionMode);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-[color:var(--orbit-surface)]/90 backdrop-blur-md dark:border-zinc-800/80">
      <div className="mx-auto flex h-14 min-h-14 max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Link
          href="/"
          className="shrink-0 font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Orbit
        </Link>
        <nav
          aria-label="Main"
          className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3"
        >
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-1.5 [&::-webkit-scrollbar]:hidden">
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
          </div>
          {signedIn ? (
            <div
              className="hidden h-7 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700 sm:block"
              aria-hidden
            />
          ) : null}
          <HeaderAuthActions
            signedInEmail={signedInEmail}
            sessionMode={sessionMode}
            signedInHandle={signedInHandle}
            signedInDisplayName={signedInDisplayName}
          />
        </nav>
      </div>
    </header>
  );
}
