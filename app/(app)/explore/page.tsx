import Link from "next/link";
import { SupabaseFollowButton } from "@/components/profile/supabase-follow-button";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";
import { createClient } from "@/lib/supabase/server";

type ExploreProfile = {
  id: string;
  handle: string;
  display_name: string | null;
};

function initialFromHandle(handle: string) {
  return (handle[0] ?? "?").toUpperCase();
}

export default async function ExploreUsersPage() {
  const configured = getSupabasePublicConfig().ready;
  if (!configured) {
    return (
      <div className="mx-auto max-w-xl space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">Explore users</p>
        <p>Explore is available when Supabase is configured.</p>
        <Link href="/me" className="inline-flex font-semibold text-violet-600 underline dark:text-violet-400">
          Go to your profile
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return (
      <div className="mx-auto max-w-xl space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">Explore users</p>
        <p>
          Sign in to follow people.{" "}
          <Link href="/auth/login" className="font-semibold text-violet-600 underline dark:text-violet-400">
            Log in
          </Link>
          .
        </p>
      </div>
    );
  }

  const { data: rawProfiles } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .not("handle", "is", null)
    .order("updated_at", { ascending: false })
    .limit(60);

  const profiles: ExploreProfile[] = (rawProfiles ?? [])
    .map((p) => ({
      id: p.id as string,
      handle: (p.handle as string | null) ?? "",
      display_name: (p.display_name as string | null) ?? null,
    }))
    .filter((p) => p.id !== user.id && p.handle.trim().length > 0)
    .slice(0, 50);

  const { data: follows } = await supabase.from("follows").select("followed_id").eq("follower_id", user.id).limit(1000);
  const followingIds = new Set((follows ?? []).map((f) => f.followed_id as string).filter(Boolean));

  const { data: pending } = await supabase
    .from("follow_requests")
    .select("followed_id")
    .eq("follower_id", user.id)
    .eq("status", "pending")
    .limit(1000);
  const requestedIds = new Set((pending ?? []).map((r) => r.followed_id as string).filter(Boolean));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Explore users</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Follow accounts to personalize your feed and “Following” reels.
          </p>
        </div>
        <Link
          href="/feed"
          className="self-start rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Back to feed
        </Link>
      </div>

      {profiles.length === 0 ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">No users to explore yet</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create another account (or ask a friend) and set a username to see them here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => {
            const following = followingIds.has(p.id);
            const requested = requestedIds.has(p.id);
            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <Link href={`/u/${encodeURIComponent(p.handle)}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    {initialFromHandle(p.handle)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {p.display_name?.trim() || `@${p.handle}`}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">@{p.handle}</p>
                  </div>
                </Link>
                <div className="shrink-0">
                  <SupabaseFollowButton followedId={p.id} initialFollowing={following} initialRequested={requested} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

