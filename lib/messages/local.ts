export type LocalMessage = {
  id: string;
  from: "you" | "them";
  text: string;
  createdAt: string;
  readAt: string | null;
};

export type LocalThread = {
  id: string;
  name: string;
  handle: string | null;
  messages: LocalMessage[];
  createdAt: string;
  updatedAt: string;
};

function storageKey(ownerKey: string): string {
  return `orbit:messages:${ownerKey}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeHandle(h: string | null | undefined): string | null {
  const cleaned = (h ?? "").trim().toLowerCase().replace(/^@/, "");
  return cleaned ? cleaned.slice(0, 30) : null;
}

function seedThreads(): LocalThread[] {
  const t = nowIso();
  return [
    {
      id: "orbit",
      name: "Orbit team",
      handle: "orbit",
      createdAt: t,
      updatedAt: t,
      messages: [
        {
          id: crypto.randomUUID(),
          from: "them",
          text: "Welcome to Orbit! This inbox is stored locally so you can test messaging now.",
          createdAt: t,
          readAt: null,
        },
      ],
    },
  ];
}

export function readLocalThreads(ownerKey: string): LocalThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(ownerKey));
    if (!raw) return seedThreads();
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return seedThreads();
    return data as LocalThread[];
  } catch {
    return seedThreads();
  }
}

export function writeLocalThreads(ownerKey: string, threads: LocalThread[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(ownerKey), JSON.stringify(threads));
  // `storage` doesn't fire in the same tab; keep UI in sync.
  window.dispatchEvent(new CustomEvent("orbit:messages-updated", { detail: { ownerKey } }));
}

export function getThreadPreview(thread: LocalThread): string {
  const last = thread.messages[thread.messages.length - 1];
  return last?.text ?? "No messages yet.";
}

export function unreadCount(thread: LocalThread): number {
  return thread.messages.filter((m) => m.from === "them" && !m.readAt).length;
}

export function createThread(ownerKey: string, input: { name: string; handle?: string | null }): LocalThread {
  const threads = readLocalThreads(ownerKey);
  const t = nowIso();
  const next: LocalThread = {
    id: crypto.randomUUID(),
    name: input.name.trim().slice(0, 60) || "New chat",
    handle: normalizeHandle(input.handle),
    createdAt: t,
    updatedAt: t,
    messages: [],
  };
  writeLocalThreads(ownerKey, [next, ...threads]);
  return next;
}

export function getOrCreateThreadByHandle(
  ownerKey: string,
  input: { handle: string; name?: string | null },
): LocalThread {
  const handle = normalizeHandle(input.handle);
  const threads = readLocalThreads(ownerKey);
  if (handle) {
    const existing = threads.find((t) => normalizeHandle(t.handle) === handle) ?? null;
    if (existing) return existing;
  }
  return createThread(ownerKey, {
    name: input.name?.trim().slice(0, 60) || (handle ? `@${handle}` : "New chat"),
    handle,
  });
}

export function deleteThread(ownerKey: string, threadId: string) {
  const threads = readLocalThreads(ownerKey);
  writeLocalThreads(
    ownerKey,
    threads.filter((t) => t.id !== threadId),
  );
}

export function addMessage(
  ownerKey: string,
  threadId: string,
  msg: { from: "you" | "them"; text: string },
) {
  const threads = readLocalThreads(ownerKey);
  const t = nowIso();
  const nextThreads = threads.map((th) => {
    if (th.id !== threadId) return th;
    const next: LocalThread = {
      ...th,
      updatedAt: t,
      messages: [
        ...th.messages,
        {
          id: crypto.randomUUID(),
          from: msg.from,
          text: msg.text.trim().slice(0, 2000),
          createdAt: t,
          readAt: msg.from === "them" ? null : t,
        },
      ],
    };
    return next;
  });
  // keep most recently updated on top
  nextThreads.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : a.updatedAt < b.updatedAt ? 1 : 0));
  writeLocalThreads(ownerKey, nextThreads);
}

export function deleteMessage(ownerKey: string, threadId: string, messageId: string) {
  const threads = readLocalThreads(ownerKey);
  const next = threads.map((th) => {
    if (th.id !== threadId) return th;
    const msgs = th.messages.filter((m) => m.id !== messageId);
    return { ...th, messages: msgs } satisfies LocalThread;
  });
  writeLocalThreads(ownerKey, next);
}

export function markThreadRead(ownerKey: string, threadId: string) {
  const threads = readLocalThreads(ownerKey);
  const t = nowIso();
  const next = threads.map((th) => {
    if (th.id !== threadId) return th;
    return {
      ...th,
      messages: th.messages.map((m) =>
        m.from === "them" && !m.readAt ? { ...m, readAt: t } : m,
      ),
    } satisfies LocalThread;
  });
  writeLocalThreads(ownerKey, next);
}

