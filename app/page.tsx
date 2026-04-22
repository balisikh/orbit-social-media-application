import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Orbit — home",
  description: "Welcome to Orbit. Open your feed, reels, messages, and profile when you are ready.",
};

const destinations = [
  {
    href: "/feed",
    title: "Feed",
    description: "Posts from people you follow in a photo-first grid.",
  },
  {
    href: "/reels",
    title: "Reels",
    description: "Short vertical video and clips in a reels-style experience.",
  },
  {
    href: "/messages",
    title: "Messages",
    description: "Direct conversations and threads with people you connect with.",
  },
  {
    href: "/me",
    title: "Profile",
    description: "Your account, settings, and public presence — followers and following live here.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col bg-[color:var(--orbit-surface)]">
      <header className="border-b border-zinc-200/80 bg-[color:var(--orbit-surface)]/90 backdrop-blur-md dark:border-zinc-800/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Orbit</span>
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
            Photo-first social
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
            Welcome to Orbit
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
            Start from this home page, then open Feed, Reels, Messages, or your Profile when you want
            to use the app.
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

        <p className="mx-auto mt-10 max-w-lg text-center text-sm text-zinc-500 dark:text-zinc-400">
          Public profiles (for example{" "}
          <Link href="/u/you" className="font-medium text-violet-600 underline dark:text-violet-400">
            @you
          </Link>
          ) show followers, following, and a media grid once wired to your API.
        </p>
      </main>
    </div>
  );
}
