export type LocalFollowV1 = Record<string, string[]>; // followerKey -> followedHandles

export type FollowRequest = {
  id: string;
  fromViewerKey: string;
  toHandle: string;
  createdAt: string;
};

export type LocalFollowV2 = {
  followingByViewer: Record<string, string[]>;
  requestsByHandle: Record<string, FollowRequest[]>;
  blockedByHandle: Record<string, string[]>; // handle -> blocked viewer keys
};

const STORAGE_KEY = "orbit:follows:v2";
const ACTIONS_KEY = "orbit:follows:actions:v1";

export type LocalFollowAction = {
  id: string;
  type: "requested" | "accepted" | "declined" | "removed" | "blocked" | "unblocked";
  handle: string;
  viewerKey: string;
  createdAt: string;
};

function nowIso() {
  return new Date().toISOString();
}

function readStoreV1(): LocalFollowV1 {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("orbit:follows:v1");
    if (!raw) return {};
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return {};
    return data as LocalFollowV1;
  } catch {
    return {};
  }
}

function readStore(): LocalFollowV2 {
  if (typeof window === "undefined") return { followingByViewer: {}, requestsByHandle: {}, blockedByHandle: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as unknown;
      if (data && typeof data === "object") return data as LocalFollowV2;
    }
  } catch {
    // ignore
  }

  const v1 = readStoreV1();
  const migrated: LocalFollowV2 = {
    followingByViewer: v1,
    requestsByHandle: {},
    blockedByHandle: {},
  };
  writeStore(migrated);
  return migrated;
}

function writeStore(store: LocalFollowV2) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  // Keep UI in sync in the same tab (storage doesn't fire here).
  window.dispatchEvent(new CustomEvent("orbit:follows-updated"));
}

function normalizeHandle(h: string): string {
  return h.trim().toLowerCase().replace(/^@/, "");
}

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
}

export function isFollowingLocal(followerKey: string, followedHandle: string): boolean {
  const store = readStore();
  const h = normalizeHandle(followedHandle);
  const list = store.followingByViewer[followerKey] ?? [];
  return list.includes(h);
}

export function hasPendingRequestLocal(viewerKey: string, targetHandle: string): boolean {
  const store = readStore();
  const h = normalizeHandle(targetHandle);
  return (store.requestsByHandle[h] ?? []).some((r) => r.fromViewerKey === viewerKey);
}

export function isBlockedLocal(targetHandle: string, viewerKey: string): boolean {
  const store = readStore();
  const h = normalizeHandle(targetHandle);
  return (store.blockedByHandle[h] ?? []).includes(viewerKey);
}

function readActions(): LocalFollowAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACTIONS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? (data as LocalFollowAction[]) : [];
  } catch {
    return [];
  }
}

function writeActions(actions: LocalFollowAction[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIONS_KEY, JSON.stringify(actions.slice(0, 200)));
}

function logAction(a: Omit<LocalFollowAction, "id" | "createdAt">) {
  const actions = readActions();
  actions.unshift({ id: crypto.randomUUID(), createdAt: nowIso(), ...a });
  writeActions(actions);
}

export function listBlockedLocal(handle: string): string[] {
  const store = readStore();
  const h = normalizeHandle(handle);
  return (store.blockedByHandle[h] ?? []).slice();
}

export function unblockLocal(handle: string, viewerKey: string) {
  const store = readStore();
  const h = normalizeHandle(handle);
  store.blockedByHandle[h] = (store.blockedByHandle[h] ?? []).filter((k) => k !== viewerKey);
  logAction({ type: "unblocked", handle: h, viewerKey });
  writeStore(store);
}

export function listRecentFollowActions(handle: string, opts?: { limit?: number }) {
  const h = normalizeHandle(handle);
  const limit = Math.max(1, Math.min(50, opts?.limit ?? 20));
  return readActions().filter((a) => a.handle === h).slice(0, limit);
}

export function requestFollowLocal(viewerKey: string, targetHandle: string) {
  const store = readStore();
  const h = normalizeHandle(targetHandle);
  if (isBlockedLocal(h, viewerKey)) return { ok: false as const, reason: "blocked" as const };
  if (isFollowingLocal(viewerKey, h)) return { ok: true as const };
  if (hasPendingRequestLocal(viewerKey, h)) return { ok: true as const };

  const req: FollowRequest = {
    id: crypto.randomUUID(),
    fromViewerKey: viewerKey,
    toHandle: h,
    createdAt: nowIso(),
  };
  store.requestsByHandle[h] = [...(store.requestsByHandle[h] ?? []), req];
  logAction({ type: "requested", handle: h, viewerKey });
  writeStore(store);
  return { ok: true as const };
}

export function toggleUnfollowLocal(followerKey: string, followedHandle: string): { following: boolean } {
  const store = readStore();
  const h = normalizeHandle(followedHandle);
  const list = Array.isArray(store.followingByViewer[followerKey]) ? [...store.followingByViewer[followerKey]!] : [];
  const idx = list.indexOf(h);
  let following: boolean;
  if (idx >= 0) {
    list.splice(idx, 1);
    following = false;
  } else {
    list.unshift(h);
    following = true;
  }
  store.followingByViewer[followerKey] = Array.from(new Set(list));
  writeStore(store);
  return { following };
}

export function followingCountLocal(followerKey: string): number {
  const store = readStore();
  return (store.followingByViewer[followerKey] ?? []).length;
}

export function followersCountLocal(handle: string): number {
  const store = readStore();
  const h = normalizeHandle(handle);
  let count = 0;
  for (const key of Object.keys(store.followingByViewer)) {
    if ((store.followingByViewer[key] ?? []).includes(h)) count += 1;
  }
  return count;
}

export function listFollowingLocal(followerKey: string): string[] {
  const store = readStore();
  return (store.followingByViewer[followerKey] ?? []).slice();
}

export function listFollowersLocal(handle: string): string[] {
  const store = readStore();
  const h = normalizeHandle(handle);
  return Object.keys(store.followingByViewer).filter((k) => (store.followingByViewer[k] ?? []).includes(h));
}

export function listPendingRequestsLocal(targetHandle: string): FollowRequest[] {
  const store = readStore();
  const h = normalizeHandle(targetHandle);
  return (store.requestsByHandle[h] ?? []).slice();
}

export function acceptRequestLocal(targetHandle: string, requestId: string) {
  const store = readStore();
  const h = normalizeHandle(targetHandle);
  const reqs = store.requestsByHandle[h] ?? [];
  const req = reqs.find((r) => r.id === requestId);
  if (!req) return;
  store.requestsByHandle[h] = reqs.filter((r) => r.id !== requestId);
  const viewer = req.fromViewerKey;
  const list = Array.isArray(store.followingByViewer[viewer]) ? [...store.followingByViewer[viewer]!] : [];
  if (!list.includes(h)) list.unshift(h);
  store.followingByViewer[viewer] = Array.from(new Set(list));
  logAction({ type: "accepted", handle: h, viewerKey: viewer });
  writeStore(store);
}

export function declineRequestLocal(targetHandle: string, requestId: string) {
  const store = readStore();
  const h = normalizeHandle(targetHandle);
  const reqs = store.requestsByHandle[h] ?? [];
  const req = reqs.find((r) => r.id === requestId);
  store.requestsByHandle[h] = (store.requestsByHandle[h] ?? []).filter((r) => r.id !== requestId);
  if (req) logAction({ type: "declined", handle: h, viewerKey: req.fromViewerKey });
  writeStore(store);
}

export function removeFollowerLocal(targetHandle: string, followerKey: string) {
  const store = readStore();
  const h = normalizeHandle(targetHandle);
  const list = Array.isArray(store.followingByViewer[followerKey]) ? [...store.followingByViewer[followerKey]!] : [];
  store.followingByViewer[followerKey] = list.filter((x) => x !== h);
  // also remove pending requests
  store.requestsByHandle[h] = (store.requestsByHandle[h] ?? []).filter((r) => r.fromViewerKey !== followerKey);
  logAction({ type: "removed", handle: h, viewerKey: followerKey });
  writeStore(store);
}

export function blockFollowerLocal(targetHandle: string, followerKey: string) {
  const store = readStore();
  const h = normalizeHandle(targetHandle);
  const blocked = Array.isArray(store.blockedByHandle[h]) ? [...store.blockedByHandle[h]!] : [];
  if (!blocked.includes(followerKey)) blocked.unshift(followerKey);
  store.blockedByHandle[h] = Array.from(new Set(blocked));
  // remove follow + request
  removeFollowerLocal(h, followerKey);
  logAction({ type: "blocked", handle: h, viewerKey: followerKey });
  writeStore(store);
}

export function addDemoFollowersAndFollowingLocal(opts: {
  viewerKey: string;
  handle: string;
  followersToAdd: number;
  followingToAdd: number;
}) {
  const store = readStore();
  const targetHandle = normalizeHandle(opts.handle);

  // Add followers: create fake viewerKeys that follow targetHandle
  const followersN = Math.max(0, Math.min(1000, Math.floor(opts.followersToAdd)));
  for (let i = 0; i < followersN; i++) {
    const fk = `demo_${targetHandle}_${String(i + 1).padStart(3, "0")}@local`;
    const list = Array.isArray(store.followingByViewer[fk]) ? [...store.followingByViewer[fk]!] : [];
    if (!list.includes(targetHandle)) list.unshift(targetHandle);
    store.followingByViewer[fk] = Array.from(new Set(list));
  }

  // Add following: make current viewerKey follow fake handles
  const followingN = Math.max(0, Math.min(1000, Math.floor(opts.followingToAdd)));
  const base = slugify(targetHandle) || "user";
  const curList = Array.isArray(store.followingByViewer[opts.viewerKey])
    ? [...store.followingByViewer[opts.viewerKey]!]
    : [];
  for (let i = 0; i < followingN; i++) {
    curList.unshift(`${base}_follow_${String(i + 1).padStart(3, "0")}`);
  }
  store.followingByViewer[opts.viewerKey] = Array.from(new Set(curList.map(normalizeHandle)));

  writeStore(store);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("orbit:follows-updated"));
  }
}

