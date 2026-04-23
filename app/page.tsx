import type { Metadata } from "next";
import Link from "next/link";
import { HeaderAuthActions } from "@/components/header-auth-actions";
import { getHeaderSession } from "@/lib/auth/header-session";

export const metadata: Metadata = {
  title: "Orbit — home",
  description: "Welcome to Orbit. Open your feed, reels, messages, and profile when you are ready.",
};

const destinations = [
  {
    href: "/feed",
    title: "Feed",
    description:
      "Scroll posts, like, comment, and share — in local preview your uploads live here; with cloud hosting this becomes your real follow graph.",
  },
  {
    href: "/reels",
    title: "Reels",
    description: "Full-height short video with swipe, sound, and reactions — add reels locally today, sync later when you wire up storage.",
  },
  {
    href: "/messages",
    title: "Messages",
    description: "Thread-style inbox you can open now; delivery and read receipts ship when messaging is connected to your backend.",
  },
  {
    href: "/me",
    title: "Profile",
    description: "Display name, @handle, avatar, and your post grid — edit locally now, then persist to the cloud when hosting is on.",
  },
] as const;

export default async function HomePage() {
  const { email, mode, handle, displayName } = await getHeaderSession();
  const signedIn = Boolean(email);

  return (
    <div className="flex min-h-full flex-col bg-[color:var(--orbit-surface)]">
      <header className="border-b border-zinc-200/80 bg-[color:var(--orbit-surface)]/90 backdrop-blur-md dark:border-zinc-800/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Orbit
          </Link>
          <HeaderAuthActions
            signedInEmail={email}
            sessionMode={mode}
            signedInHandle={handle}
            signedInDisplayName={displayName}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
            Photo-first social
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
            {signedIn ? "Welcome back" : "Welcome to Orbit"}
          </h1>
          {signedIn ? (
            <>
              <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
                {"You're signed in as "}
                <strong className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {handle ? `@${handle}` : email}
                </strong>
                . Pick up where you left off — posts and reels in the feed, short video in Reels, chats in Messages, and
                your look on Profile.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/feed"
                  className="inline-flex min-h-11 min-w-[10rem] items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Open Feed
                </Link>
                <Link
                  href="/reels"
                  className="inline-flex min-h-11 min-w-[10rem] items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Open Reels
                </Link>
                <Link
                  href="/messages"
                  className="inline-flex min-h-11 min-w-[10rem] items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Messages
                </Link>
                <Link
                  href="/me"
                  className="inline-flex min-h-11 min-w-[10rem] items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Your profile
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
                Orbit is the app shell: use this home to sign in, then jump into Feed, Reels, Messages, or Profile. Each
                area shows what&apos;s live today and what&apos;s on the roadmap.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/auth/login"
                  className="inline-flex min-h-11 min-w-[7.5rem] items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex min-h-11 min-w-[7.5rem] items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Sign up
                </Link>
              </div>
            </>
          )}
        </div>

        <ul className="mx-auto mt-12 grid w-full max-w-4xl gap-4 sm:grid-cols-2">
          {destinations.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-700/60"
              >
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{item.title}</span>
                <span className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {item.description}
                </span>
                <span className="mt-4 text-sm font-medium text-violet-600 dark:text-violet-400">
                  Open {item.title} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
