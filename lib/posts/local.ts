export type LocalPost = {
  id: string;
  caption: string | null;
  imageUrl: string | null;
  videoUrl?: string | null;
  media?: Array<{ kind: "image" | "video"; url: string }>;
  audioLabel?: string | null;
  createdAt: string;
};

function storageKey(ownerKey: string): string {
  return `orbit:posts:${ownerKey}`;
}

export function readLocalPosts(ownerKey: string): LocalPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(ownerKey));
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((p) => {
        if (!p || typeof p !== "object") return null;
        const id = (p as { id?: unknown }).id;
        const caption = (p as { caption?: unknown }).caption;
        const imageUrl = (p as { imageUrl?: unknown }).imageUrl;
        const videoUrl = (p as { videoUrl?: unknown }).videoUrl;
        const media = (p as { media?: unknown }).media;
        const audioLabel = (p as { audioLabel?: unknown }).audioLabel;
        const createdAt = (p as { createdAt?: unknown }).createdAt;
        if (typeof id !== "string" || typeof createdAt !== "string") return null;
        let normalizedMedia: Array<{ kind: "image" | "video"; url: string }> | null = null;
        if (Array.isArray(media)) {
          normalizedMedia = media
            .map((m) => {
              if (!m || typeof m !== "object") return null;
              const kind = (m as { kind?: unknown }).kind;
              const url = (m as { url?: unknown }).url;
              if ((kind !== "image" && kind !== "video") || typeof url !== "string" || !url) return null;
              return { kind, url } as { kind: "image" | "video"; url: string };
            })
            .filter(Boolean) as Array<{ kind: "image" | "video"; url: string }>;
          if (!normalizedMedia.length) normalizedMedia = null;
        }

        // Backwards compatible migration: imageUrl/videoUrl -> media[]
        if (!normalizedMedia) {
          const img = typeof imageUrl === "string" && imageUrl ? imageUrl : null;
          const vid = typeof videoUrl === "string" && videoUrl ? videoUrl : null;
          if (vid) normalizedMedia = [{ kind: "video", url: vid }];
          else if (img) normalizedMedia = [{ kind: "image", url: img }];
        }
        return {
          id,
          createdAt,
          caption: typeof caption === "string" ? caption : null,
          imageUrl: typeof imageUrl === "string" ? imageUrl : null,
          videoUrl: typeof videoUrl === "string" ? videoUrl : null,
          media: normalizedMedia ?? undefined,
          audioLabel: typeof audioLabel === "string" ? audioLabel : null,
        } satisfies LocalPost;
      })
      .filter(Boolean) as LocalPost[];
  } catch {
    return [];
  }
}

export function writeLocalPosts(ownerKey: string, posts: LocalPost[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(ownerKey), JSON.stringify(posts));
  // `storage` doesn't fire in the same tab; this keeps UI in sync.
  window.dispatchEvent(new CustomEvent("orbit:posts-updated", { detail: { ownerKey } }));
}

export function addLocalPost(ownerKey: string, post: Omit<LocalPost, "id" | "createdAt"> & { id?: string }) {
  const next: LocalPost = {
    id: post.id ?? crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    caption: post.caption ?? null,
    imageUrl: post.imageUrl ?? null,
    videoUrl: post.videoUrl ?? null,
    media: post.media,
    audioLabel: post.audioLabel ?? null,
  };
  const posts = readLocalPosts(ownerKey);
  writeLocalPosts(ownerKey, [next, ...posts]);
  return next;
}

export function deleteLocalPost(ownerKey: string, postId: string) {
  const posts = readLocalPosts(ownerKey);
  writeLocalPosts(
    ownerKey,
    posts.filter((p) => p.id !== postId),
  );
}

