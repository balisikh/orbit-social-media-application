"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMessage,
  createThread,
  deleteThread,
  deleteMessage,
  getOrCreateThreadByHandle,
  getThreadPreview,
  markThreadRead,
  readLocalThreads,
  unreadCount,
  type LocalThread,
} from "@/lib/messages/local";
import { isBlockedLocal } from "@/lib/follows/local";

type Props = {
  ownerKey: string;
};

function clampText(s: string) {
  return s.replace(/\s+/g, " ").trim().slice(0, 2000);
}

export function MessagesPreview({ ownerKey }: Props) {
  const [threads, setThreads] = useState<LocalThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [composer, setComposer] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  function refresh() {
    const next = readLocalThreads(ownerKey);
    setThreads(next);
    setActiveId((prev) => prev ?? next[0]?.id ?? null);
  }

  useEffect(() => {
    refresh();
    function onStorage(e: StorageEvent) {
      if (e.key && e.key.includes(`orbit:messages:${ownerKey}`)) refresh();
    }
    function onUpdated(e: Event) {
      const detailOwnerKey = (e as CustomEvent<{ ownerKey?: string }>)?.detail?.ownerKey;
      if (!detailOwnerKey || detailOwnerKey === ownerKey) refresh();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("orbit:messages-updated", onUpdated as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("orbit:messages-updated", onUpdated as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ownerKey switches reset state
  }, [ownerKey]);

  useEffect(() => {
    const handle = searchParams.get("handle");
    if (!handle) return;
    const name = searchParams.get("name");
    const th = getOrCreateThreadByHandle(ownerKey, { handle, name });
    refresh();
    setActiveId(th.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: react to URL changes
  }, [searchParams, ownerKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const nameMatch = t.name.toLowerCase().includes(q);
      const handleMatch = (t.handle ?? "").toLowerCase().includes(q);
      const messageMatch = t.messages.some((m) => m.text.toLowerCase().includes(q));
      return nameMatch || handleMatch || messageMatch;
    });
  }, [threads, query]);

  const active = useMemo(() => threads.find((t) => t.id === activeId) ?? null, [threads, activeId]);

  function ensureActiveThread(): LocalThread | null {
    const current = threads.find((t) => t.id === activeId) ?? null;
    if (current) return current;
    if (threads[0]) {
      setActiveId(threads[0].id);
      return threads[0];
    }
    const th = createThread(ownerKey, { name: "New chat", handle: null });
    refresh();
    setActiveId(th.id);
    return th;
  }

  useEffect(() => {
    if (!active) return;
    markThreadRead(ownerKey, active.id);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const messagingBlocked = useMemo(() => {
    const h = active?.handle;
    if (!h) return false;
    return isBlockedLocal(h, ownerKey);
  }, [active?.handle, ownerKey]);

  return (
    <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-[minmax(0,240px)_1fr] sm:p-0">
      <aside className="sm:border-r sm:border-zinc-200 sm:dark:border-zinc-800">
        <div className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Inbox</p>
          <div className="mt-3 space-y-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>

          <div ref={listRef} className="mt-3 max-h-[55vh] overflow-y-auto pr-1">
            <ul className="space-y-1" role="list">
              {filtered.map((t) => {
                const on = t.id === activeId;
                const unread = unreadCount(t);
                const preview = getThreadPreview(t);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      on
                        ? "bg-violet-100 font-medium text-violet-950 dark:bg-violet-950/50 dark:text-violet-100"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    }`}
                  >
                      <span className="flex items-center justify-between gap-2">
                        <span className="block truncate">{t.name}</span>
                        {unread ? (
                          <span className="shrink-0 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-violet-500">
                            {unread}
                          </span>
                        ) : null}
                      </span>
                    <span className="mt-0.5 block truncate text-xs font-normal text-zinc-500 dark:text-zinc-400">
                        {preview}
                    </span>
                  </button>
                </li>
              );
              })}
            </ul>
          </div>
        </div>
      </aside>
      <div className="flex min-h-[300px] flex-col rounded-xl border border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40 sm:border-0 sm:rounded-none">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          {active ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{active.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {active.handle ? `@${active.handle}` : "Local preview conversation"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  deleteThread(ownerKey, active.id);
                  setActiveId(null);
                  refresh();
                }}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Delete chat
              </button>
            </div>
          ) : (
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Select a conversation</p>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {active ? (
            active.messages.length ? (
              active.messages.map((m) => (
                <div
                  key={m.id}
                  className={`group relative max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.from === "you"
                      ? "ml-auto bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "mr-auto bg-white text-zinc-800 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  {m.text}
                  <button
                    type="button"
                    onClick={() => {
                      deleteMessage(ownerKey, active.id, m.id);
                      refresh();
                    }}
                    className="absolute -right-2 -top-2 rounded-full bg-black/50 px-2 py-1 text-[10px] font-semibold text-white opacity-0 backdrop-blur transition group-hover:opacity-100"
                    title="Delete message"
                  >
                    Delete
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">No messages yet. Say hi.</p>
            )
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Choose a chat from the inbox.</p>
          )}
        </div>
        <div className="mt-auto border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Message…"
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const text = clampText(composer);
                  if (!text) return;
                  if (messagingBlocked) return;
                  const th = ensureActiveThread();
                  if (!th) return;
                  addMessage(ownerKey, th.id, { from: "you", text });
                  setComposer("");
                  refresh();
                }
              }}
              disabled={messagingBlocked}
              className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
            <button
              type="button"
              disabled={!clampText(composer) || messagingBlocked}
              onClick={() => {
                const text = clampText(composer);
                if (!text) return;
                if (messagingBlocked) return;
                const th = ensureActiveThread();
                if (!th) return;
                addMessage(ownerKey, th.id, { from: "you", text });
                setComposer("");
                refresh();
              }}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Send
            </button>
          </div>
          {messagingBlocked ? (
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">You can’t message this user (you’re blocked).</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
