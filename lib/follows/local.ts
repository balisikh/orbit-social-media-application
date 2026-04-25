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

function isFollowRequestRecord(x: unknown): x is FollowRequest {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.fromViewerKey === "string" &&
    typeof r.toHandle === "string" &&
    typeof r.createdAt === "string"
  );
}

/** Recover a valid store from partial/corrupt JSON (avoids runtime throws in demo + follow helpers). */
function coerceLocalFollowV2(data: unknown): LocalFollowV2 {
  const base: LocalFollowV2 = { followingByViewer: {}, requestsByHandle: {}, blockedByHandle: {} };
  if (!data || typeof data !== "object" || Array.isArray(data)) return base;
  const o = data as Record<string, unknown>;

  const fv = o.followingByViewer;
  if (fv && typeof fv === "object" && !Array.isArray(fv)) {
    for (const [k, v] of Object.entries(fv)) {
      if (Array.isArray(v)) base.followingByViewer[k] = v.filter((x): x is string => typeof x === "string");
    }
  }

  const rq = o.requestsByHandle;
  if (rq && typeof rq === "object" && !Array.isArray(rq)) {
    for (const [k, v] of Object.entries(rq)) {
      if (Array.isArray(v)) base.requestsByHandle[k] = v.filter(isFollowRequestRecord);
    }
  }

  const bl = o.blockedByHandle;
  if (bl && typeof bl === "object" && !Array.isArray(bl)) {
    for (const [k, v] of Object.entries(bl)) {
      if (Array.isArray(v)) base.blockedByHandle[k] = v.filter((x): x is string => typeof x === "string");
    }
  }

  return base;
}

function readStore(): LocalFollowV2 {
  if (typeof window === "undefined") return { followingByViewer: {}, requestsByHandle: {}, blockedByHandle: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as unknown;
      if (data && typeof data === "object") return coerceLocalFollowV2(data);
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
  const h = normalizeHandle(targetHandle);
  // Remove follow + pending requests first (persists). Must run before mutating `blocked` on a stale
  // in-memory store — otherwise a final writeStore(stale) would undo the unfollow.
  removeFollowerLocal(targetHandle, followerKey);
  const store = readStore();
  const blocked = Array.isArray(store.blockedByHandle[h]) ? [...store.blockedByHandle[h]!] : [];
  if (!blocked.includes(followerKey)) blocked.unshift(followerKey);
  store.blockedByHandle[h] = Array.from(new Set(blocked));
  logAction({ type: "blocked", handle: h, viewerKey: followerKey });
  writeStore(store);
}

export function addDemoFollowerRequestsLocal(opts: {
  handle: string;
  requestsToAdd: number;
}): { ok: true; addedRequests: number } | { ok: false; error: string } {
  try {
    const store = readStore();
    if (!store.followingByViewer || typeof store.followingByViewer !== "object") store.followingByViewer = {};
    if (!store.requestsByHandle || typeof store.requestsByHandle !== "object") store.requestsByHandle = {};
    if (!store.blockedByHandle || typeof store.blockedByHandle !== "object") store.blockedByHandle = {};

    const h = normalizeHandle(opts.handle);
    if (!h) return { ok: false, error: "Missing handle." };

    const n = Math.floor(Number(opts.requestsToAdd));
    const requestsN = Number.isFinite(n) ? Math.max(0, Math.min(1000, n)) : 0;

    const existing = store.requestsByHandle[h] ?? [];
    const existingFrom = new Set(existing.map((r) => r.fromViewerKey));

    const demoPrefix = `demo_${h}_`;
    const demoSuffix = "@local";
    const escapedSuffix = demoSuffix.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
    const demoIndexRe = new RegExp(`^${demoPrefix}(\\d{3,})${escapedSuffix}$`);
    let maxDemoIdx = 0;
    for (const key of Object.keys(store.followingByViewer)) {
      const m = key.match(demoIndexRe);
      if (!m) continue;
      const idx = Number(m[1]);
      if (Number.isFinite(idx) && idx > maxDemoIdx) maxDemoIdx = idx;
    }
    for (const key of existingFrom) {
      const m = key.match(demoIndexRe);
      if (!m) continue;
      const idx = Number(m[1]);
      if (Number.isFinite(idx) && idx > maxDemoIdx) maxDemoIdx = idx;
    }

    const next = [...existing];
    let addedRequests = 0;
    let cursor = maxDemoIdx + 1;
    while (addedRequests < requestsN && cursor <= maxDemoIdx + requestsN + 100) {
      const fk = `${demoPrefix}${String(cursor).padStart(3, "0")}${demoSuffix}`;
      cursor += 1;
      if (existingFrom.has(fk)) continue;
      const followingList = store.followingByViewer[fk] ?? [];
      if (Array.isArray(followingList) && followingList.includes(h)) continue;

      next.unshift({
        id: crypto.randomUUID(),
        fromViewerKey: fk,
        toHandle: h,
        createdAt: nowIso(),
      });
      existingFrom.add(fk);
      logAction({ type: "requested", handle: h, viewerKey: fk });
      addedRequests += 1;
    }

    store.requestsByHandle[h] = next;
    writeStore(store);
    return { ok: true, addedRequests };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

export function addDemoFollowersAndFollowingLocal(opts: {
  viewerKey: string;
  handle: string;
  followersToAdd: number;
  followingToAdd: number;
}):
  | { ok: true; addedFollowers: number; addedFollowing: number }
  | { ok: false; error: string } {
  try {
    const store = readStore();
    if (!store.followingByViewer || typeof store.followingByViewer !== "object") store.followingByViewer = {};
    if (!store.requestsByHandle || typeof store.requestsByHandle !== "object") store.requestsByHandle = {};
    if (!store.blockedByHandle || typeof store.blockedByHandle !== "object") store.blockedByHandle = {};

    const targetHandle = normalizeHandle(opts.handle);
    if (!opts.viewerKey.trim()) {
      return { ok: false, error: "Missing viewer key." };
    }

    const safeCount = (raw: unknown, cap: number) => {
      const n = Math.floor(Number(raw));
      if (!Number.isFinite(n) || n < 0) return 0;
      return Math.min(cap, n);
    };

    const demoPrefix = `demo_${targetHandle}_`;
    const demoSuffix = "@local";
    const demoIndexRe = new RegExp(`^${demoPrefix}(\\d{3,})${demoSuffix.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}$`);
    let maxDemoIdx = 0;
    for (const k of Object.keys(store.followingByViewer)) {
      const m = k.match(demoIndexRe);
      if (!m) continue;
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > maxDemoIdx) maxDemoIdx = n;
    }

    // Add followers: create fake viewerKeys that follow targetHandle
    const followersN = safeCount(opts.followersToAdd, 1000);
    let addedFollowers = 0;
    for (let i = 0; i < followersN; i++) {
      const idx = maxDemoIdx + i + 1;
      const fk = `${demoPrefix}${String(idx).padStart(3, "0")}${demoSuffix}`;
      const list = Array.isArray(store.followingByViewer[fk]) ? [...store.followingByViewer[fk]!] : [];
      if (!list.includes(targetHandle)) list.unshift(targetHandle);
      store.followingByViewer[fk] = Array.from(new Set(list));
      addedFollowers += 1;
    }

    // Add following: make current viewerKey follow fake handles
    const followingN = safeCount(opts.followingToAdd, 1000);
    const base = slugify(targetHandle) || "user";
    const curList = Array.isArray(store.followingByViewer[opts.viewerKey])
      ? [...store.followingByViewer[opts.viewerKey]!]
      : [];
    const existing = new Set(curList.map(normalizeHandle));
    let addedFollowing = 0;
    let cursor = 1;
    while (addedFollowing < followingN && cursor <= 5000) {
      const h = normalizeHandle(`${base}_follow_${String(cursor).padStart(3, "0")}`);
      cursor += 1;
      if (existing.has(h)) continue;
      existing.add(h);
      curList.unshift(h);
      addedFollowing += 1;
    }
    store.followingByViewer[opts.viewerKey] = Array.from(new Set(curList.map(normalizeHandle)));

    writeStore(store);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("orbit:follows-updated"));
    }
    return { ok: true, addedFollowers, addedFollowing };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

