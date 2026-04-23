import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileHeader, profileDefaultActions } from "@/components/profile/profile-header";
import { ProfilePostGrid } from "@/components/profile/profile-post-grid";
import { LocalFollowButton } from "@/components/profile/local-follow-button";
import { LocalFollowStats } from "@/components/profile/local-follow-stats";
import { SupabaseFollowButton } from "@/components/profile/supabase-follow-button";
import { countFollowers, countFollowing, isFollowing } from "@/lib/follows/queries";
import { getPostsByUserId } from "@/lib/posts/queries";
import { getProfileByHandle } from "@/lib/profiles/queries";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";
import { readDevSessionFromCookies } from "@/lib/auth/dev-session";

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
    const dev = await readDevSessionFromCookies();
    const viewerKey = dev?.email ?? "local";
    return (
      <div className="space-y-8">
        <ProfileHeader
          handle={display}
          displayName={null}
          bio={null}
          avatarUrl={null}
          initialLetter={initialFromHandle(display)}
          stats={{ posts: 0, followers: 0, following: 0 }}
        showFollowCounts={false}
        actions={
          <div className="flex flex-wrap gap-2">
            <LocalFollowButton viewerKey={viewerKey} targetHandle={display} />
            <Link
              href={`/messages?handle=${encodeURIComponent(display)}&name=${encodeURIComponent(`@${display}`)}`}
              className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Message
            </Link>
          </div>
        }
        />
      <LocalFollowStats viewerKey={viewerKey} handle={display} />
        <ProfilePostGrid isOwner={false} posts={null} />
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
  const posts = await getPostsByUserId(supabase, profile.id, { limit: 60 });
  const postPreviews = posts.map((p) => ({ id: p.id, imageUrl: p.image_url ?? null }));
  const followers = await countFollowers(supabase, profile.id);
  const following = await countFollowing(supabase, profile.id);
  const viewerFollows = user?.id ? await isFollowing(supabase, user.id, profile.id) : false;

  return (
    <div className="space-y-8">
      <ProfileHeader
        handle={profile.handle}
        displayName={profile.display_name}
        bio={profile.bio}
        avatarUrl={profile.avatar_url}
        initialLetter={initialFromHandle(profile.handle)}
        stats={{ posts: postPreviews.length, followers, following }}
        actions={
          viewerIsOwner ? (
            <>
              <Link
                href="/me/edit#profile-basics"
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
            <div className="flex flex-wrap gap-2">
              {user?.id ? <SupabaseFollowButton followedId={profile.id} initialFollowing={viewerFollows} /> : null}
              {profileDefaultActions({ viewerIsOwner: false, publicHref: null, showFollowMessage: false })}
            </div>
          )
        }
      />
      <ProfilePostGrid isOwner={viewerIsOwner} posts={postPreviews} />
    </div>
  );
}
