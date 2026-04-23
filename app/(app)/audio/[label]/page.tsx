import Link from "next/link";
import { AudioPage } from "@/components/audio/audio-page";
import { readDevSessionFromCookies } from "@/lib/auth/dev-session";

export default async function AudioLabelPage({ params }: { params: Promise<{ label: string }> }) {
  const { label } = await params;
  const dev = await readDevSessionFromCookies();

  if (!dev?.email) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Audio</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You need to sign in to view audio details.{" "}
          <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
            Sign in
          </Link>
          .
        </p>
      </div>
    );
  }

  return <AudioPage ownerKey={dev.email} label={decodeURIComponent(label)} />;
}

