import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileHeader, profileDefaultActions } from "@/components/profile/profile-header";
import { ProfilePostGrid } from "@/components/profile/profile-post-grid";
import { getProfileByHandle } from "@/lib/profiles/queries";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

type PageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle: raw } = await params;
  const display = decodeURIComponent(raw);
  const configured = getSupabasePublicConfig().ready;

  if (!configured) {
    return {
      title: `@${display} · Orbit`,
      description: `View @${display} on Orbit.`,
    };
  }

  const supabase = await createClient();
  const profile = await getProfileByHandle(supabase, display);
  if (!profile?.handle) {
    return { title: `@${display} · Orbit`, description: `View @${display} on Orbit.` };
  }

  const titleBase = profile.display_name
    ? `${profile.display_name} (@${profile.handle})`
    : `@${profile.handle}`;
  return {
    title: `${titleBase} · Orbit`,
    description: profile.bio?.trim().slice(0, 160) || `View @${profile.handle} on Orbit.`,
  };
}

function initialFromHandle(handle: string): string {
  return handle[0]?.toUpperCase() ?? "?";
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { handle: raw } = await params;
  const display = decodeURIComponent(raw).trim().toLowerCase();
  if (!display) notFound();

  const configured = getSupabasePublicConfig().ready;
  if (!configured) {
    return (
      <div className="space-y-8">
        <ProfileHeader
          handle={display}
          displayName={null}
          bio={null}
          avatarUrl={null}
          initialLetter={initialFromHandle(display)}
          stats={{ posts: 0, followers: 0, following: 0 }}
          actions={profileDefaultActions({ viewerIsOwner: false, publicHref: null })}
        />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Orbit isn&apos;t connected to cloud data in this environment yet. When hosting is configured, public profiles load from your Orbit database — see the hosting checklist in the account menu (top right).
        </p>
        <ProfilePostGrid isOwner={false} postCount={0} />
      </div>
    );
  }

  const supabase = await createClient();
  const profile = await getProfileByHandle(supabase, display);
  if (!profile?.handle) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerIsOwner = Boolean(user?.id && user.id === profile.id);

  return (
    <div className="space-y-8">
      <ProfileHeader
        handle={profile.handle}
        displayName={profile.display_name}
        bio={profile.bio}
        avatarUrl={profile.avatar_url}
        initialLetter={initialFromHandle(profile.handle)}
        stats={{ posts: 0, followers: 0, following: 0 }}
        actions={
          viewerIsOwner ? (
            <>
              <Link
                href="/me"
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Edit profile
              </Link>
              <Link
                href="/feed"
                className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Back to feed
              </Link>
            </>
          ) : (
            profileDefaultActions({ viewerIsOwner: false, publicHref: null })
          )
        }
      />
      <ProfilePostGrid isOwner={viewerIsOwner} postCount={0} />
    </div>
  );
}
