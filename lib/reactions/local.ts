export type ReactionItemType = "post" | "reel";

export type LocalComment = {
  id: string;
  text: string;
  createdAt: string;
};

export type LocalReactions = {
  liked: boolean;
  likeCount: number;
  comments: LocalComment[];
};

type Store = Record<string, LocalReactions>;

function storageKey(viewerKey: string): string {
  return `orbit:reactions:${viewerKey}`;
}

function itemKey(type: ReactionItemType, id: string): string {
  return `${type}:${id}`;
}

function nowIso() {
  return new Date().toISOString();
}

function readStore(viewerKey: string): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(viewerKey));
    if (!raw) return {};
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return {};
    return data as Store;
  } catch {
    return {};
  }
}

function writeStore(viewerKey: string, store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(viewerKey), JSON.stringify(store));
}

export function readReactions(viewerKey: string, type: ReactionItemType, id: string): LocalReactions {
  const store = readStore(viewerKey);
  const key = itemKey(type, id);
  const v = store[key];
  if (!v) return { liked: false, likeCount: 0, comments: [] };
  return {
    liked: Boolean(v.liked),
    likeCount: typeof v.likeCount === "number" ? v.likeCount : 0,
    comments: Array.isArray(v.comments) ? (v.comments as LocalComment[]) : [],
  };
}

export function toggleLike(viewerKey: string, type: ReactionItemType, id: string): LocalReactions {
  const store = readStore(viewerKey);
  const key = itemKey(type, id);
  const cur = readReactions(viewerKey, type, id);
  const nextLiked = !cur.liked;
  const nextCount = Math.max(0, cur.likeCount + (nextLiked ? 1 : -1));
  const next: LocalReactions = { ...cur, liked: nextLiked, likeCount: nextCount };
  store[key] = next;
  writeStore(viewerKey, store);
  return next;
}

export function addComment(viewerKey: string, type: ReactionItemType, id: string, text: string): LocalReactions {
  const store = readStore(viewerKey);
  const key = itemKey(type, id);
  const cur = readReactions(viewerKey, type, id);
  const cleaned = text.replace(/\s+/g, " ").trim().slice(0, 400);
  if (!cleaned) return cur;
  const next: LocalReactions = {
    ...cur,
    comments: [
      ...cur.comments,
      {
        id: crypto.randomUUID(),
        text: cleaned,
        createdAt: nowIso(),
      },
    ],
  };
  store[key] = next;
  writeStore(viewerKey, store);
  return next;
}

export function deleteComment(
  viewerKey: string,
  type: ReactionItemType,
  id: string,
  commentId: string,
): LocalReactions {
  const store = readStore(viewerKey);
  const key = itemKey(type, id);
  const cur = readReactions(viewerKey, type, id);
  const next: LocalReactions = {
    ...cur,
    comments: cur.comments.filter((c) => c.id !== commentId),
  };
  store[key] = next;
  writeStore(viewerKey, store);
  return next;
}

