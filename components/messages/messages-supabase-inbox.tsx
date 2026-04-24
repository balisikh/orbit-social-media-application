"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DmMessageRow, DmThreadSummary } from "@/lib/messages/dm-types";
import { formatShortTime } from "@/lib/posts/format";

type Props = {
  viewerUserId: string;
};

function peerTitle(t: DmThreadSummary): string {
  const dn = t.peer_display_name?.trim();
  if (dn) return dn;
  if (t.peer_handle) return `@${t.peer_handle}`;
  return "Unknown user";
}

function clampComposer(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 2000);
}

export function MessagesSupabaseInbox({ viewerUserId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<DmThreadSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessageRow[]>([]);
  const [composer, setComposer] = useState("");
  const [query, setQuery] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [busyList, setBusyList] = useState(false);
  const [busyMessages, setBusyMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const loadThreads = useCallback(async () => {
    setBusyList(true);
    setListError(null);
    try {
      const res = await fetch("/api/messages/threads", { method: "GET" });
      const j = (await res.json().catch(() => null)) as { threads?: DmThreadSummary[]; error?: string } | null;
      if (!res.ok) {
        setListError(j?.error ?? "Could not load conversations.");
        setThreads([]);
        return;
      }
      const next = j?.threads ?? [];
      setThreads(next);
      setActiveId((prev) => {
        if (prev && next.some((t) => t.id === prev)) return prev;
        return next[0]?.id ?? null;
      });
    } finally {
      setBusyList(false);
    }
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    setBusyMessages(true);
    setThreadError(null);
    try {
      const res = await fetch(`/api/messages/threads/${threadId}/messages`, { method: "GET" });
      const j = (await res.json().catch(() => null)) as { messages?: DmMessageRow[]; error?: string } | null;
      if (!res.ok) {
        setThreadError(j?.error ?? "Could not load messages.");
        setMessages([]);
        return;
      }
      setMessages(j?.messages ?? []);
    } finally {
      setBusyMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    void loadMessages(activeId);
  }, [activeId, loadMessages]);

  const active = useMemo(() => threads.find((t) => t.id === activeId) ?? null, [threads, activeId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const title = peerTitle(t).toLowerCase();
      const handle = (t.peer_handle ?? "").toLowerCase();
      return title.includes(q) || handle.includes(q) || t.last_preview.toLowerCase().includes(q);
    });
  }, [threads, query]);

  const openThreadByHandle = useCallback(
    async (handle: string) => {
      setListError(null);
      const res = await fetch("/api/messages/threads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ peerHandle: handle }),
      });
      const j = (await res.json().catch(() => null)) as { thread?: { id: string }; error?: string } | null;
      if (!res.ok) {
        setListError(j?.error ?? "Could not open conversation.");
        return;
      }
      await loadThreads();
      if (j?.thread?.id) setActiveId(j.thread.id);
      router.replace("/messages");
    },
    [loadThreads, router],
  );

  const handleFromUrl = searchParams.get("handle")?.trim().replace(/^@/, "").toLowerCase() ?? "";

  useEffect(() => {
    if (!handleFromUrl) return;
    void openThreadByHandle(handleFromUrl);
  }, [handleFromUrl, openThreadByHandle]);

  async function sendMessage() {
    const text = clampComposer(composer);
    if (!text || !activeId || sending) return;
    setSending(true);
    setThreadError(null);
    try {
      const res = await fetch(`/api/messages/threads/${activeId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const j = (await res.json().catch(() => null)) as { message?: DmMessageRow; error?: string } | null;
      if (!res.ok) {
        setThreadError(j?.error ?? "Could not send.");
        return;
      }
      if (j?.message) setMessages((prev) => [...prev, j.message!]);
      setComposer("");
      void loadThreads();
    } finally {
      setSending(false);
    }
  }

  async function deleteThread() {
    if (!activeId) return;
    if (!window.confirm("Delete this conversation for you? Messages will be removed.")) return;
    const res = await fetch(`/api/messages/threads/${activeId}`, { method: "DELETE" });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setThreadError(j?.error ?? "Could not delete.");
      return;
    }
    setActiveId(null);
    setMessages([]);
    void loadThreads();
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-[minmax(0,240px)_1fr] sm:p-0">
      <aside className="sm:border-r sm:border-zinc-200 sm:dark:border-zinc-800">
        <div className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Inbox</p>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Saved to your Supabase project with RLS. Text only for now — attachments and realtime come later.
          </p>
          <div className="mt-3 space-y-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          {listError ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
              {listError}
            </p>
          ) : null}
          <div className="mt-3 max-h-[55vh] overflow-y-auto pr-1">
            {busyList && !threads.length ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
            ) : filtered.length ? (
              <ul className="space-y-1" role="list">
                {filtered.map((t) => {
                  const on = t.id === activeId;
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
                        <span className="block truncate">{peerTitle(t)}</span>
                        <span className="mt-0.5 block truncate text-xs font-normal text-zinc-500 dark:text-zinc-400">
                          {t.last_preview}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No conversations yet. Open a profile and tap <span className="font-medium">Message</span> to start
                one.
              </p>
            )}
          </div>
        </div>
      </aside>
      <div className="flex min-h-[300px] flex-col rounded-xl border border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40 sm:border-0 sm:rounded-none">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          {active ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{peerTitle(active)}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {active.peer_handle ? `@${active.peer_handle}` : "Direct message"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void deleteThread()}
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
          {threadError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {threadError}
            </p>
          ) : null}
          {busyMessages && activeId ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading messages…</p>
          ) : active ? (
            messages.length ? (
              messages.map((m) => {
                const isYou = m.sender_id === viewerUserId;
                return (
                  <div
                    key={m.id}
                    className={`flex max-w-[min(100%,22rem)] flex-col ${isYou ? "ml-auto items-end" : "mr-auto items-start"}`}
                  >
                    <div
                      className={`rounded-2xl border px-3 py-2 text-sm shadow-sm ${
                        isYou
                          ? "border-zinc-700 bg-zinc-900 text-white dark:border-zinc-600 dark:bg-zinc-100 dark:text-zinc-900"
                          : "border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p
                        className={`mt-1 text-[10px] ${isYou ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-500 dark:text-zinc-400"}`}
                      >
                        {formatShortTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">No messages yet. Say hi.</p>
            )
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Choose a chat from the inbox.</p>
          )}
        </div>
        <div className="mt-auto border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder={active ? "Message…" : "Select a chat first"}
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              disabled={!active || sending}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
            <button
              type="button"
              disabled={!active || !clampComposer(composer) || sending}
              onClick={() => void sendMessage()}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Signed in as user id <span className="font-mono text-[10px]">{viewerUserId.slice(0, 8)}…</span> —{" "}
            <Link href="/me" className="font-medium text-violet-600 underline dark:text-violet-400">
              Your profile
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
