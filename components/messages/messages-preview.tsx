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
  type LocalMessage,
  type LocalThread,
  type MessageAttachment,
} from "@/lib/messages/local";
import { isBlockedLocal } from "@/lib/follows/local";
import { EmojiPicker } from "@/components/emoji/emoji-picker";
import { MESSAGE_STICKERS } from "@/lib/messages/stickers";

type Props = {
  ownerKey: string;
  /** Local preview only: lets you append a message as “them” to test bubbles and unread (no real delivery). */
  showSimulatePeerReply?: boolean;
};

function clampText(s: string) {
  return s.replace(/\s+/g, " ").trim().slice(0, 2000);
}

const MAX_IMAGE_BYTES = 1_400_000;

function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("Image is too large for local preview (try under ~1.3MB)."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") resolve(r);
      else reject(new Error("Could not read image."));
    };
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

function messageMatchesQuery(m: LocalMessage, q: string): boolean {
  if (m.text.toLowerCase().includes(q)) return true;
  return (
    m.attachments?.some((a: MessageAttachment) => {
      if (a.kind === "sticker") return a.emoji.toLowerCase().includes(q);
      return false;
    }) ?? false
  );
}

function MessageAttachments({ attachments }: { attachments: MessageAttachment[] }) {
  return (
    <div className="flex flex-col gap-2">
      {attachments.map((a, i) => {
        if (a.kind === "image") {
          return (
            // eslint-disable-next-line @next/next/no-img-element -- data URLs / blob URLs
            <img
              key={i}
              src={a.url}
              alt=""
              className="max-h-48 w-full max-w-[240px] rounded-xl object-cover"
            />
          );
        }
        if (a.kind === "audio") {
          return <audio key={i} src={a.url} controls className="w-full max-w-[260px]" />;
        }
        return (
          <span key={i} className="select-none text-5xl leading-none" aria-hidden>
            {a.emoji}
          </span>
        );
      })}
    </div>
  );
}

export function MessagesPreview({ ownerKey, showSimulatePeerReply = false }: Props) {
  const [threads, setThreads] = useState<LocalThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [composer, setComposer] = useState("");
  const [theirReplyDraft, setTheirReplyDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [peerEmojiOpen, setPeerEmojiOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [peerStickerOpen, setPeerStickerOpen] = useState(false);
  const [recording, setRecording] = useState<"idle" | "composer" | "peer">("idle");

  const emojiBtnRef = useRef<HTMLButtonElement | null>(null);
  const peerEmojiBtnRef = useRef<HTMLButtonElement | null>(null);
  const stickerBtnRef = useRef<HTMLButtonElement | null>(null);
  const peerStickerBtnRef = useRef<HTMLButtonElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const peerImageInputRef = useRef<HTMLInputElement | null>(null);
  const stickerWrapRef = useRef<HTMLDivElement | null>(null);
  const peerStickerWrapRef = useRef<HTMLDivElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<BlobPart[]>([]);
  const recordStopTimerRef = useRef<number | null>(null);
  const recordingTargetRef = useRef<{ threadId: string; from: "you" | "them" } | null>(null);
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
      const messageMatch = t.messages.some((m) => messageMatchesQuery(m, q));
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

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        stickerOpen &&
        stickerWrapRef.current &&
        !stickerWrapRef.current.contains(t) &&
        stickerBtnRef.current &&
        !stickerBtnRef.current.contains(t)
      ) {
        setStickerOpen(false);
      }
      if (
        peerStickerOpen &&
        peerStickerWrapRef.current &&
        !peerStickerWrapRef.current.contains(t) &&
        peerStickerBtnRef.current &&
        !peerStickerBtnRef.current.contains(t)
      ) {
        setPeerStickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [stickerOpen, peerStickerOpen]);

  useEffect(() => {
    return () => {
      if (recordStopTimerRef.current) window.clearTimeout(recordStopTimerRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  const messagingBlocked = useMemo(() => {
    const h = active?.handle;
    if (!h) return false;
    return isBlockedLocal(h, ownerKey);
  }, [active?.handle, ownerKey]);

  function stopRecorderAndFinalize() {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") {
      setRecording("idle");
      recordingTargetRef.current = null;
      return;
    }
    mr.onstop = () => {
      mr.stream.getTracks().forEach((tr) => tr.stop());
      const blob = new Blob(recordChunksRef.current, { type: mr.mimeType || "audio/webm" });
      recordChunksRef.current = [];
      mediaRecorderRef.current = null;
      if (recordStopTimerRef.current) {
        window.clearTimeout(recordStopTimerRef.current);
        recordStopTimerRef.current = null;
      }
      const meta = recordingTargetRef.current;
      recordingTargetRef.current = null;
      setRecording("idle");
      if (blob.size < 32) return;
      if (!meta) return;
      const url = URL.createObjectURL(blob);
      addMessage(ownerKey, meta.threadId, {
        from: meta.from,
        text: "",
        attachments: [{ kind: "audio", url }],
      });
      refresh();
    };
    mr.stop();
  }

  async function startRecording(target: "composer" | "peer") {
    if (messagingBlocked) return;
    if (recording !== "idle") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      window.alert("Microphone recording is not supported in this browser.");
      return;
    }
    let meta: { threadId: string; from: "you" | "them" };
    if (target === "composer") {
      const th = ensureActiveThread();
      if (!th) return;
      meta = { threadId: th.id, from: "you" };
    } else {
      if (!active) return;
      meta = { threadId: active.id, from: "them" };
    }
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingTargetRef.current = meta;
      const preferred = "audio/webm;codecs=opus";
      const mimeType = MediaRecorder.isTypeSupported(preferred) ? preferred : "";
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) recordChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = mr;
      setRecording(target);
      mr.start();
      recordStopTimerRef.current = window.setTimeout(() => {
        stopRecorderAndFinalize();
      }, 60_000);
    } catch {
      stream?.getTracks().forEach((tr) => tr.stop());
      window.alert("Could not access the microphone. Check browser permissions.");
      recordingTargetRef.current = null;
      setRecording("idle");
    }
  }

  function toggleMic(target: "composer" | "peer") {
    if (messagingBlocked) return;
    if (recording === target) {
      stopRecorderAndFinalize();
      return;
    }
    if (recording !== "idle") {
      stopRecorderAndFinalize();
      return;
    }
    void startRecording(target);
  }

  async function onPickImage(file: File | null, from: "you" | "them") {
    if (!file || messagingBlocked) return;
    try {
      const url = await readImageFileAsDataUrl(file);
      const caption = from === "you" ? clampText(composer) : clampText(theirReplyDraft);
      if (from === "you") {
        const th = ensureActiveThread();
        if (!th) return;
        addMessage(ownerKey, th.id, {
          from: "you",
          text: caption,
          attachments: [{ kind: "image", url }],
        });
        setComposer("");
      } else if (active) {
        addMessage(ownerKey, active.id, {
          from: "them",
          text: caption,
          attachments: [{ kind: "image", url }],
        });
        setTheirReplyDraft("");
      }
      setEmojiOpen(false);
      setPeerEmojiOpen(false);
      setStickerOpen(false);
      setPeerStickerOpen(false);
      refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not add image.");
    }
  }

  function sendSticker(emoji: string, from: "you" | "them") {
    if (messagingBlocked) return;
    if (from === "you") {
      const th = ensureActiveThread();
      if (!th) return;
      addMessage(ownerKey, th.id, { from: "you", text: "", attachments: [{ kind: "sticker", emoji }] });
      setStickerOpen(false);
    } else if (active) {
      addMessage(ownerKey, active.id, { from: "them", text: "", attachments: [{ kind: "sticker", emoji }] });
      setPeerStickerOpen(false);
    }
    refresh();
  }

  const messagingDisabled = messagingBlocked;

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
                  {m.attachments?.length ? (
                    <MessageAttachments attachments={m.attachments} />
                  ) : null}
                  {m.text ? <p className={m.attachments?.length ? "mt-2 whitespace-pre-wrap break-words" : "whitespace-pre-wrap break-words"}>{m.text}</p> : null}
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
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              void onPickImage(f, "you");
            }}
          />
          <div className="relative flex flex-wrap items-center gap-2">
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
                  setEmojiOpen(false);
                  refresh();
                }
              }}
              disabled={messagingDisabled}
              className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
            <button
              type="button"
              disabled={messagingDisabled}
              onClick={() => imageInputRef.current?.click()}
              className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
              aria-label="Attach image"
              title="Image"
            >
              🖼
            </button>
            <button
              type="button"
              disabled={messagingDisabled}
              onClick={() => toggleMic("composer")}
              className={`rounded-full border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                recording === "composer"
                  ? "border-red-400 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                  : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
              }`}
              aria-label={recording === "composer" ? "Stop recording and send" : "Record voice"}
              title={recording === "composer" ? "Stop" : "Mic"}
            >
              {recording === "composer" ? "■" : "🎤"}
            </button>
            <div className="relative">
              <button
                ref={stickerBtnRef}
                type="button"
                disabled={messagingDisabled}
                onClick={() => setStickerOpen((o) => !o)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                aria-label="Stickers"
                title="Stickers"
              >
                🎟
              </button>
              {stickerOpen && !messagingDisabled ? (
                <div
                  ref={stickerWrapRef}
                  className="absolute bottom-[calc(100%+0.5rem)] right-0 z-20 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
                  role="dialog"
                  aria-label="Sticker picker"
                >
                  <div className="grid grid-cols-5 gap-1">
                    {MESSAGE_STICKERS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        className="rounded-xl p-2 text-2xl transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        onClick={() => sendSticker(em, "you")}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              ref={emojiBtnRef}
              type="button"
              disabled={messagingDisabled}
              onClick={() => setEmojiOpen((o) => !o)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
              aria-label="Open emoji picker"
              title="Emoji"
            >
              🙂
            </button>
            <button
              type="button"
              disabled={!clampText(composer) || messagingDisabled}
              onClick={() => {
                const text = clampText(composer);
                if (!text) return;
                if (messagingDisabled) return;
                const th = ensureActiveThread();
                if (!th) return;
                addMessage(ownerKey, th.id, { from: "you", text });
                setComposer("");
                setEmojiOpen(false);
                refresh();
              }}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Send
            </button>
          </div>
          {emojiOpen && !messagingDisabled ? (
            <EmojiPicker
              anchorRef={emojiBtnRef as unknown as React.RefObject<HTMLElement | null>}
              onClose={() => setEmojiOpen(false)}
              onPick={(em) => setComposer((t) => `${t}${em}`)}
            />
          ) : null}
          {messagingBlocked ? (
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">You can’t message this user (you’re blocked).</p>
          ) : null}
          {showSimulatePeerReply && active && !messagingBlocked ? (
            <div className="mt-3 border-t border-dashed border-zinc-200 pt-3 dark:border-zinc-700">
              <input
                ref={peerImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  void onPickImage(f, "them");
                }}
              />
              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Real replies need a server: the other person&apos;s app never reads this browser&apos;s storage. For
                layout testing only, add a message as <span className="font-medium text-zinc-700 dark:text-zinc-300">them</span>{" "}
                (incoming bubble + unread).
              </p>
              <div className="relative mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={theirReplyDraft}
                  onChange={(e) => setTheirReplyDraft(e.target.value)}
                  placeholder="Their reply (preview)…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const text = clampText(theirReplyDraft);
                      if (!text) return;
                      addMessage(ownerKey, active.id, { from: "them", text });
                      setTheirReplyDraft("");
                      setPeerEmojiOpen(false);
                      refresh();
                    }
                  }}
                  className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                />
                <button
                  type="button"
                  onClick={() => peerImageInputRef.current?.click()}
                  className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  aria-label="Attach image as them"
                  title="Image"
                >
                  🖼
                </button>
                <button
                  type="button"
                  onClick={() => toggleMic("peer")}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    recording === "peer"
                      ? "border-red-400 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                      : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                  aria-label={recording === "peer" ? "Stop recording as them" : "Record voice as them"}
                  title={recording === "peer" ? "Stop" : "Mic"}
                >
                  {recording === "peer" ? "■" : "🎤"}
                </button>
                <div className="relative">
                  <button
                    ref={peerStickerBtnRef}
                    type="button"
                    onClick={() => setPeerStickerOpen((o) => !o)}
                    className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    aria-label="Stickers as them"
                    title="Stickers"
                  >
                    🎟
                  </button>
                  {peerStickerOpen ? (
                    <div
                      ref={peerStickerWrapRef}
                      className="absolute bottom-[calc(100%+0.5rem)] right-0 z-20 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
                      role="dialog"
                      aria-label="Sticker picker"
                    >
                      <div className="grid grid-cols-5 gap-1">
                        {MESSAGE_STICKERS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            className="rounded-xl p-2 text-2xl transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            onClick={() => sendSticker(em, "them")}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <button
                  ref={peerEmojiBtnRef}
                  type="button"
                  onClick={() => setPeerEmojiOpen((o) => !o)}
                  className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  aria-label="Open emoji picker"
                  title="Emoji"
                >
                  🙂
                </button>
                <button
                  type="button"
                  disabled={!clampText(theirReplyDraft)}
                  onClick={() => {
                    const text = clampText(theirReplyDraft);
                    if (!text) return;
                    addMessage(ownerKey, active.id, { from: "them", text });
                    setTheirReplyDraft("");
                    setPeerEmojiOpen(false);
                    refresh();
                  }}
                  className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Add as them
                </button>
              </div>
              {peerEmojiOpen ? (
                <EmojiPicker
                  anchorRef={peerEmojiBtnRef as unknown as React.RefObject<HTMLElement | null>}
                  onClose={() => setPeerEmojiOpen(false)}
                  onPick={(em) => setTheirReplyDraft((t) => `${t}${em}`)}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
