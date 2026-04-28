import Link from "next/link";
import { NewPostButton } from "@/components/posts/new-post-button";
import { CopyProfileLinkButton } from "@/components/profile/copy-profile-link-button";
import { LocalPostGrid } from "@/components/profile/local-post-grid";
import { LocalPostCount } from "@/components/profile/local-post-count";
import { LocalAvatar } from "@/components/profile/local-avatar";
import { ProfileHeader, profileDefaultActions } from "@/components/profile/profile-header";
import { SupabasePostGrid } from "@/components/profile/supabase-post-grid";
import { readDevSessionFromCookies } from "@/lib/auth/dev-session";
import { parseUsername, usernameFromUserMetadata } from "@/lib/auth/username";
import { countFollowers, countFollowing, countPendingIncomingFollowRequests } from "@/lib/follows/queries";
import { getPostsByUserId } from "@/lib/posts/queries";
import { avatarUrlFromAuthUser, bioFromAuthUser, displayNameFromAuthUser } from "@/lib/profiles/auth-appearance";
import { ensureProfileForUser } from "@/lib/profiles/ensure-profile";
import { getProfileByUserId } from "@/lib/profiles/queries";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";
import { LocalFollowStats } from "@/components/profile/local-follow-stats";
import { ProfileFollowTabs } from "@/components/profile/profile-follow-tabs";
import { SupabaseIncomingFollowRequests } from "@/components/profile/supabase-incoming-follow-requests";

function avatarInitial(email: string, handle: string | null): string {
  if (handle?.length) return handle[0]!.toUpperCase();
  const local = email.split("@")[0] ?? email;
  return local[0]!.toUpperCase();
}

export default async function MePage() {
  const configured = getSupabasePublicConfig().ready;
  const devSession = await readDevSessionFromCookies();

  let email: string | null = null;
  let metaHandle: string | null = null;
  let source: "supabase" | "dev" | null = null;
  let profileSyncError: string | null = null;
  let displayName: string | null = null;
  let bio: string | null = null;
  let avatarUrl: string | null = null;
  let dbHandle: string | null = null;
  let postPreviews: Array<{ id: string; imageUrl: string | null }> | null = null;
  let followers = 0;
  let following = 0;
  let pendingRequests = 0;

  if (configured) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        source = "supabase";
        email = user.email;
        metaHandle = usernameFromUserMetadata(user.user_metadata ?? undefined);
        const sync = await ensureProfileForUser(supabase, user);
        profileSyncError = sync.error;
        const profile = await getProfileByUserId(supabase, user.id);
        dbHandle = profile?.handle ?? null;
        displayName = profile?.display_name?.trim() || displayNameFromAuthUser(user) || null;
        bio = profile?.bio?.trim() || bioFromAuthUser(user) || null;
        avatarUrl = profile?.avatar_url?.trim() || avatarUrlFromAuthUser(user) || null;
        const posts = await getPostsByUserId(supabase, user.id, { limit: 60 });
        postPreviews = posts.map((p) => ({ id: p.id, imageUrl: p.image_url ?? null }));
        followers = await countFollowers(supabase, user.id);
        following = await countFollowing(supabase, user.id);
        pendingRequests = await countPendingIncomingFollowRequests(supabase, user.id);
      }
    } catch {
      email = null;
      metaHandle = null;
    }
  }

  if (!email && devSession) {
    source = "dev";
    email = devSession.email;
    metaHandle = devSession.username ? parseUsername(devSession.username) : null;
    displayName = devSession.displayName?.trim() || null;
    bio = devSession.bio?.trim() || null;
  }

  const signedIn = Boolean(email);
  const handle = source === "supabase" ? (dbHandle ?? metaHandle) : metaHandle;
  const publicHref = handle ? `/u/${encodeURIComponent(handle)}` : null;
  const postCount = configured ? (postPreviews?.length ?? 0) : 0;

  return (
    <div className="space-y-8">
      {signedIn ? (
        <>
          {profileSyncError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-medium">Orbit couldn&apos;t save your profile yet.</p>
              <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">{profileSyncError}</p>
              <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-200/80">
                Apply the SQL migration from <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/80">supabase/migrations/</code> in your database console, then refresh this page.
              </p>
            </div>
          ) : null}

          <ProfileHeader
            handle={handle}
            displayName={displayName}
            bio={bio}
            avatarUrl={avatarUrl}
            initialLetter={avatarInitial(email!, handle)}
            avatar={
              !configured ? (
                <LocalAvatar ownerKey={email!} initialLetter={avatarInitial(email!, handle)} />
              ) : null
            }
            eyebrow="Your profile"
            stats={{
              posts: configured ? postCount : <LocalPostCount ownerKey={email!} />,
              followers,
              following,
            }}
            showFollowCounts={configured}
            usernameUnderStats={handle ? `@${handle}` : null}
            actions={
              <div className="flex flex-wrap gap-2">
                <NewPostButton />
                {publicHref ? <CopyProfileLinkButton href={publicHref} /> : null}
                {configured && source === "supabase" ? (
                  <Link
                    href="/me#follow-requests"
                    className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    title="View follow requests"
                  >
                    Requests
                    {pendingRequests > 0 ? (
                      <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                        {pendingRequests}
                      </span>
                    ) : null}
                  </Link>
                ) : null}
                {profileDefaultActions({ viewerIsOwner: true, publicHref })}
              </div>
            }
          />
          {!configured ? (
            <LocalFollowStats viewerKey={email!} handle={handle} followersHref="#followers" followingHref="#following" />
          ) : null}
          {configured && source === "supabase" ? <SupabaseIncomingFollowRequests /> : null}
          {!configured ? <ProfileFollowTabs viewerKey={email!} handle={handle ?? null} /> : null}

          {configured ? (
            <SupabasePostGrid isOwner posts={postPreviews} />
          ) : (
            <LocalPostGrid ownerKey={email!} isOwner />
          )}
        </>
      ) : !configured ? (
        <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Your profile</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You are not signed in.{" "}
            <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
              Sign in
            </Link>{" "}
            to start a local-mode session (saved to this browser only).
          </p>
        </div>
      ) : (
        <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Your profile</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You are not signed in.{" "}
            <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
              Sign in
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
