import Link from "next/link";

export type ProfileHeaderProps = {
  handle: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  initialLetter: string;
  avatar?: React.ReactNode;
  /** Owner-only row (e.g. email on /me). */
  ownerMeta?: { label: string; value: string } | null;
  eyebrow?: string;
  stats: {
    posts: number | React.ReactNode;
    followers: number | React.ReactNode;
    following: number | React.ReactNode;
  };
  /** Hide followers/following row (use when counts are client-only). */
  showFollowCounts?: boolean;
  /** Optional username label shown under the stats row (e.g. "@bal"). */
  usernameUnderStats?: string | null;
  actions?: React.ReactNode;
};

export function ProfileHeader({
  handle,
  displayName,
  bio,
  avatarUrl,
  initialLetter,
  avatar,
  ownerMeta,
  eyebrow,
  stats,
  showFollowCounts = true,
  usernameUnderStats,
  actions,
}: ProfileHeaderProps) {
  const cleanedDisplayName = displayName?.trim() || null;
  const title = cleanedDisplayName ?? (handle ? `@${handle}` : "Your account");
  const subtitle = cleanedDisplayName && handle ? `@${handle}` : null;

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-violet-400 to-amber-300 ring-4 ring-white dark:ring-zinc-950">
        {avatar ? (
          avatar
        ) : avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote avatar URLs
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-3xl font-semibold text-white"
            aria-hidden
          >
            {initialLetter}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">{subtitle}</p>
        ) : null}
        {ownerMeta ? (
          <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400" title={ownerMeta.value}>
            <span className="text-zinc-500 dark:text-zinc-500">{ownerMeta.label}</span>
            <span className="mx-1.5 text-zinc-400 dark:text-zinc-600">·</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{ownerMeta.value}</span>
          </p>
        ) : null}
        {bio ? (
          <p className="mt-2 max-w-xl whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{bio}</p>
        ) : handle ? (
          <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            No bio yet{ownerMeta ? " — add one from your account settings when available." : "."}
          </p>
        ) : null}
        <div
          className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
          title="Counts will update from your database when posts and follows are connected."
        >
          <span className="inline-flex items-baseline gap-1">
            <strong className="text-zinc-900 dark:text-zinc-50">{stats.posts}</strong>
            <span className="text-zinc-600 dark:text-zinc-400">posts</span>
          </span>
          {showFollowCounts ? (
            <>
              <span className="hidden h-4 w-px bg-zinc-200 dark:bg-zinc-800 sm:block" aria-hidden />
              <span className="inline-flex items-baseline gap-1">
                <strong className="text-zinc-900 dark:text-zinc-50">{stats.followers}</strong>
                <span className="text-zinc-600 dark:text-zinc-400">followers</span>
              </span>
              <span className="hidden h-4 w-px bg-zinc-200 dark:bg-zinc-800 sm:block" aria-hidden />
              <span className="inline-flex items-baseline gap-1">
                <strong className="text-zinc-900 dark:text-zinc-50">{stats.following}</strong>
                <span className="text-zinc-600 dark:text-zinc-400">following</span>
              </span>
            </>
          ) : null}
        </div>
        {usernameUnderStats ? (
          <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">{usernameUnderStats}</p>
        ) : null}
        {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function profileDefaultActions(opts: {
  viewerIsOwner: boolean;
  publicHref: string | null;
  showFollowMessage?: boolean;
}) {
  const { viewerIsOwner, publicHref, showFollowMessage = true } = opts;
  if (viewerIsOwner) {
    return (
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
    );
  }
  if (!showFollowMessage) return null;
  return (
    <>
      <button
        type="button"
        disabled
        title="Coming soon"
        className="cursor-not-allowed rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Follow
      </button>
      <button
        type="button"
        disabled
        title="Coming soon"
        className="cursor-not-allowed rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-800 opacity-60 dark:border-zinc-600 dark:text-zinc-200"
      >
        Message
      </button>
    </>
  );
}
