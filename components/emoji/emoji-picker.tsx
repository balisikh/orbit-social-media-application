"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";

type EmojiPickerProps = {
  onPick: (emoji: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
};

const RECENTS_KEY = "orbit:emoji:recent:v1";

type Category = { id: string; label: string; items: string[] };

const CATEGORIES: Category[] = [
  {
    id: "recent",
    label: "Recent",
    items: [],
  },
  {
    id: "smileys",
    label: "Smileys",
    items: ["😀", "😁", "😂", "🤣", "😊", "😍", "😎", "😮", "😢", "😭", "😡", "🤯", "🥳", "😴", "🤔", "🙃", "😉", "😅"],
  },
  {
    id: "hearts",
    label: "Hearts",
    items: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "🖤", "💔", "💕", "💖", "💗", "💘"],
  },
  {
    id: "gestures",
    label: "Gestures",
    items: ["👍", "👎", "👏", "🙏", "🤝", "🫶", "👌", "✌️", "🤟", "👊", "🙌"],
  },
  {
    id: "objects",
    label: "Objects",
    items: ["🔥", "💯", "✨", "🎉", "🎁", "📌", "📷", "🎬", "🎵", "⚡", "🌟"],
  },
];

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed.filter((x) => typeof x === "string") as string[]) : [];
  } catch {
    return [];
  }
}

function writeRecent(next: string[]) {
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next.slice(0, 30)));
  } catch {
    // ignore
  }
}

function addRecent(emoji: string) {
  const cur = readRecent();
  const next = [emoji, ...cur.filter((e) => e !== emoji)];
  writeRecent(next);
}

export function EmojiPicker({ onPick, onClose, anchorRef }: EmojiPickerProps) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("recent");
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 320 });
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // position next to anchor
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(360, window.innerWidth - margin * 2);
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
    const preferAbove = rect.bottom + margin + 360 > window.innerHeight && rect.top - margin - 360 > margin;
    const top = preferAbove ? rect.top - margin - 360 : rect.bottom + margin;
    setPos({ top: Math.max(margin, Math.min(top, window.innerHeight - margin - 120)), left, width });
  }, [anchorRef]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const recent = useMemo(() => readRecent(), []);

  const cats = useMemo(() => {
    return CATEGORIES.map((c) => (c.id === "recent" ? { ...c, items: recent } : c));
  }, [recent]);

  const all = useMemo(() => cats.flatMap((c) => c.items), [cats]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    // simple search: filter by emoji itself (so user can paste emoji) or show all when query is non-empty but no match
    return all.filter((e) => e.includes(q));
  }, [query, all]);

  const active = useMemo(() => cats.find((c) => c.id === activeCat) ?? cats[0]!, [cats, activeCat]);
  const items = filtered ?? active.items;

  function pick(e: string) {
    addRecent(e);
    onPick(e);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <button
        type="button"
        aria-label="Close emoji picker"
        className="absolute inset-0 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        className="absolute overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
        style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: "min(70vh, 420px)" }}
        role="dialog"
        aria-label="Emoji picker"
      >
        <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Close
          </button>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-zinc-100 px-2 py-2 dark:border-zinc-800">
          {cats
            .filter((c) => c.id !== "recent" || c.items.length)
            .map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveCat(c.id);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  activeCat === c.id
                    ? "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }`}
              >
                {c.label}
              </button>
            ))}
        </div>

        <div className="max-h-[min(60vh,340px)] overflow-y-auto p-2">
          {items.length ? (
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
              {items.map((e) => (
                <button
                  key={`${active.id}-${e}`}
                  type="button"
                  onClick={() => pick(e)}
                  className="rounded-lg p-2 text-lg transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  aria-label={`Insert ${e}`}
                  title={`Insert ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          ) : (
            <p className="px-2 py-4 text-sm text-zinc-600 dark:text-zinc-400">No matches.</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

