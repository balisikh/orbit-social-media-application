import Link from "next/link";
import { ReelsTabs } from "@/components/reels/reels-tabs";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";
import { createClient } from "@/lib/supabase/server";
import { readDevSessionFromCookies } from "@/lib/auth/dev-session";

export default async function ReelsPage() {
  const configured = getSupabasePublicConfig().ready;
  const devSession = await readDevSessionFromCookies();
  let reelItems: Array<{ id: string; videoUrl: string; caption: string | null }> = [];
  let viewerIsOwner = false;

  if (configured) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        viewerIsOwner = true;
        const { data } = await supabase
          .from("reels")
          .select("id, caption, video_url, created_at")
          .order("created_at", { ascending: false })
          .limit(30);
        reelItems =
          (data ?? []).map((r) => ({
            id: r.id as string,
            caption: (r.caption as string | null) ?? null,
            videoUrl: (r.video_url as string | null) ?? "",
          })) ?? [];
        // filter invalid
        reelItems = reelItems.filter((r) => typeof r.videoUrl === "string" && r.videoUrl.length > 0);
      }
    } catch {
      reelItems = [];
      viewerIsOwner = false;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Reels</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Vertical short video in a swipeable, full-screen player.
        </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/reels/new"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            New reel
          </Link>
          <Link
            href="/me"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Your profile
          </Link>
        </div>
      </div>
      {configured ? (
        <ReelsTabs mode="supabase" reels={reelItems} isOwner={viewerIsOwner} />
      ) : (
        <ReelsTabs mode="local" ownerKey={devSession?.email ?? "local"} />
      )}
    </div>
  );
}
