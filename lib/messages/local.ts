export type MessageAttachment =
  | { kind: "image"; url: string }
  | { kind: "audio"; url: string }
  | { kind: "sticker"; emoji: string };

export type LocalMessage = {
  id: string;
  from: "you" | "them";
  text: string;
  attachments?: MessageAttachment[];
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

function normalizeAttachment(raw: unknown): MessageAttachment | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { kind?: unknown; url?: unknown; emoji?: unknown };
  if (o.kind === "image" && typeof o.url === "string" && o.url) return { kind: "image", url: o.url };
  if (o.kind === "audio" && typeof o.url === "string" && o.url) return { kind: "audio", url: o.url };
  if (o.kind === "sticker" && typeof o.emoji === "string" && o.emoji) return { kind: "sticker", emoji: o.emoji };
  return null;
}

function normalizeMessage(raw: unknown): LocalMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const id = m.id;
  const from = m.from;
  const text = m.text;
  const createdAt = m.createdAt;
  const readAt = m.readAt;
  if (typeof id !== "string" || (from !== "you" && from !== "them")) return null;
  if (typeof text !== "string" || typeof createdAt !== "string") return null;
  const read =
    readAt === null || readAt === undefined
      ? null
      : typeof readAt === "string"
        ? readAt
        : null;
  let attachments: MessageAttachment[] | undefined;
  if (Array.isArray(m.attachments)) {
    const list = m.attachments.map(normalizeAttachment).filter(Boolean) as MessageAttachment[];
    if (list.length) attachments = list;
  }
  return {
    id,
    from,
    text,
    createdAt,
    readAt: read,
    attachments,
  };
}

function normalizeThread(raw: unknown): LocalThread | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const id = t.id;
  const name = t.name;
  const handle = t.handle;
  const createdAt = t.createdAt;
  const updatedAt = t.updatedAt;
  const messagesRaw = t.messages;
  if (typeof id !== "string" || typeof name !== "string" || typeof createdAt !== "string" || typeof updatedAt !== "string")
    return null;
  if (!Array.isArray(messagesRaw)) return null;
  const messages = messagesRaw.map(normalizeMessage).filter(Boolean) as LocalMessage[];
  return {
    id,
    name,
    handle: typeof handle === "string" ? handle : null,
    messages,
    createdAt,
    updatedAt,
  };
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
    const threads = data.map(normalizeThread).filter(Boolean) as LocalThread[];
    return threads.length ? threads : seedThreads();
  } catch {
    return seedThreads();
  }
}

export function writeLocalThreads(ownerKey: string, threads: LocalThread[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(ownerKey), JSON.stringify(threads));
  window.dispatchEvent(new CustomEvent("orbit:messages-updated", { detail: { ownerKey } }));
}

export function getThreadPreview(thread: LocalThread): string {
  const last = thread.messages[thread.messages.length - 1];
  if (!last) return "No messages yet.";
  const atts = last.attachments;
  if (atts?.length) {
    const a = atts[atts.length - 1]!;
    if (a.kind === "image") return last.text.trim() ? `${last.text.trim()} · Photo` : "Photo";
    if (a.kind === "audio") return last.text.trim() ? `${last.text.trim()} · Voice` : "Voice message";
    if (a.kind === "sticker") return last.text.trim() || `Sticker ${a.emoji}`;
  }
  return last.text || "Message";
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
  const removed = threads.find((t) => t.id === threadId);
  removed?.messages.forEach((m) => {
    m.attachments?.forEach((a) => {
      if ((a.kind === "image" || a.kind === "audio") && a.url.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(a.url);
        } catch {
          /* ignore */
        }
      }
    });
  });
  writeLocalThreads(
    ownerKey,
    threads.filter((t) => t.id !== threadId),
  );
}

export function addMessage(
  ownerKey: string,
  threadId: string,
  msg: {
    from: "you" | "them";
    text?: string;
    attachments?: MessageAttachment[];
  },
) {
  const text = (msg.text ?? "").trim().slice(0, 2000);
  const attachments = (msg.attachments ?? []).filter(Boolean);
  if (!text && attachments.length === 0) return;

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
          text,
          attachments: attachments.length ? attachments : undefined,
          createdAt: t,
          readAt: msg.from === "them" ? null : t,
        },
      ],
    };
    return next;
  });
  nextThreads.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : a.updatedAt < b.updatedAt ? 1 : 0));
  writeLocalThreads(ownerKey, nextThreads);
}

export function deleteMessage(ownerKey: string, threadId: string, messageId: string) {
  const threads = readLocalThreads(ownerKey);
  const th = threads.find((t) => t.id === threadId);
  const msg = th?.messages.find((m) => m.id === messageId);
  msg?.attachments?.forEach((a) => {
    if ((a.kind === "image" || a.kind === "audio") && a.url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(a.url);
      } catch {
        /* ignore */
      }
    }
  });
  const next = threads.map((thread) => {
    if (thread.id !== threadId) return thread;
    const msgs = thread.messages.filter((m) => m.id !== messageId);
    return { ...thread, messages: msgs } satisfies LocalThread;
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
