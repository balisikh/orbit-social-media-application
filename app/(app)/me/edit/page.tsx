import Link from "next/link";
import { RequireFollowApprovalField } from "@/components/me/require-follow-approval-field";
import { SetProfileBasicsForm } from "@/components/me/set-profile-basics-form";
import { readDevSessionFromCookies } from "@/lib/auth/dev-session";
import { parseUsername, usernameFromUserMetadata } from "@/lib/auth/username";
import { ensureProfileForUser } from "@/lib/profiles/ensure-profile";
import { getProfileByUserId } from "@/lib/profiles/queries";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";
import { createClient } from "@/lib/supabase/server";

export default async function EditProfilePage() {
  const configured = getSupabasePublicConfig().ready;
  const devSession = await readDevSessionFromCookies();

  let email: string | null = null;
  let metaHandle: string | null = null;
  let source: "supabase" | "dev" | null = null;
  let displayName: string | null = null;
  let bio: string | null = null;
  let dbHandle: string | null = null;
  let requireFollowApproval = false;

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
        await ensureProfileForUser(supabase, user);
        const profile = await getProfileByUserId(supabase, user.id);
        dbHandle = profile?.handle ?? null;
        displayName = profile?.display_name ?? null;
        bio = profile?.bio ?? null;
        requireFollowApproval = profile?.require_follow_approval ?? false;
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

  if (!email || !source) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Edit profile</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You need to sign in to edit your profile.{" "}
          <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
            Sign in
          </Link>
          .
        </p>
      </div>
    );
  }

  const handle = source === "supabase" ? (dbHandle ?? metaHandle) : metaHandle;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Edit profile</h1>
          {handle ? <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">@{handle}</p> : null}
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="text-zinc-500 dark:text-zinc-500">Email</span>
            <span className="mx-1.5 text-zinc-400 dark:text-zinc-600">·</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{email}</span>
          </p>
        </div>
        <Link
          href="/me"
          className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Back to profile
        </Link>
      </div>

      <SetProfileBasicsForm
        mode={source}
        email={email}
        currentHandle={handle}
        currentDisplayName={displayName}
        currentBio={bio}
      />

      {source === "supabase" ? <RequireFollowApprovalField initialRequireApproval={requireFollowApproval} /> : null}
    </div>
  );
}

