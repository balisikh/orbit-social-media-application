import Link from "next/link";
import { SignOutDevButton } from "@/components/auth/sign-out-dev-button";
import { SetUsernameForm } from "@/components/me/set-username-form";
import { ProfileHeader, profileDefaultActions } from "@/components/profile/profile-header";
import { ProfilePostGrid } from "@/components/profile/profile-post-grid";
import { readDevSessionFromCookies } from "@/lib/auth/dev-session";
import { parseUsername, usernameFromUserMetadata } from "@/lib/auth/username";
import { ensureProfileForUser } from "@/lib/profiles/ensure-profile";
import { getProfileByUserId } from "@/lib/profiles/queries";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

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
        displayName = profile?.display_name ?? null;
        bio = profile?.bio ?? null;
        avatarUrl = profile?.avatar_url ?? null;
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
  }

  const signedIn = Boolean(email);
  const handle = source === "supabase" ? (dbHandle ?? metaHandle) : metaHandle;
  const publicHref = handle ? `/u/${encodeURIComponent(handle)}` : null;

  return (
    <div className="space-y-8">
      {signedIn ? (
        <>
          {source === "dev" ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              <span className="mr-1.5 inline-block rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                Local
              </span>
              Same <strong className="font-medium text-zinc-800 dark:text-zinc-200">local preview</strong> session described in your account menu (top right). Turn on cloud hosting there when you want accounts and profiles saved remotely.
            </p>
          ) : null}

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
            ownerMeta={{ label: "Email", value: email! }}
            eyebrow="Your profile"
            stats={{ posts: 0, followers: 0, following: 0 }}
            actions={profileDefaultActions({ viewerIsOwner: true, publicHref })}
          />

          {!handle && source === "supabase" ? (
            <div className="max-w-xl space-y-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Your @username is stored on your account separately from your email. If it is missing, set it below —
                it will sync to your public Orbit profile.
              </p>
              <SetUsernameForm />
            </div>
          ) : null}

          <ProfilePostGrid isOwner postCount={0} />

          {source === "dev" ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <SignOutDevButton />
            </div>
          ) : null}
        </>
      ) : !configured ? (
        <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Your profile</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You are not signed in.{" "}
            <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
              Sign in
            </Link>{" "}
            — while running <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-900">npm run dev</code> you
            can still use a local preview sign-in.
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
