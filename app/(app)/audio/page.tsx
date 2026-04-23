import Link from "next/link";
import { AudioLibraryPage } from "@/components/audio/audio-library-page";
import { readDevSessionFromCookies } from "@/lib/auth/dev-session";

export default async function AudioHomePage() {
  const dev = await readDevSessionFromCookies();
  if (!dev?.email) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Audio library</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You need to sign in to view your audio library.{" "}
          <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
            Sign in
          </Link>
          .
        </p>
      </div>
    );
  }

  return <AudioLibraryPage ownerKey={dev.email} />;
}

