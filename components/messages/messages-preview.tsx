"use client";

import { useState } from "react";

const THREADS = [
  {
    id: "orbit",
    name: "Orbit team",
    preview: "Welcome to Orbit — messaging will go live in a future update.",
    messages: [
      { from: "them", text: "Welcome to Orbit! Direct messages will arrive here once the messaging layer is connected." },
      { from: "them", text: "For now, this is a layout preview so you can see how conversations will feel." },
    ],
  },
  {
    id: "club",
    name: "Camera club",
    preview: "Weekend walk at the lake?",
    messages: [
      { from: "them", text: "Weekend walk at the lake? Thinking Saturday morning." },
      { from: "you", text: "I'm in — send a time when you have one." },
      { from: "them", text: "Placeholder thread — no data is stored yet." },
    ],
  },
  {
    id: "hike",
    name: "Weekend hike",
    preview: "Trail notes in the doc…",
    messages: [
      { from: "them", text: "Trail notes are in the shared doc. Meet at the north lot?" },
      { from: "you", text: "Sounds good. Preview only — not sent to a server." },
    ],
  },
] as const;

export function MessagesPreview() {
  const [activeId, setActiveId] = useState<string>(THREADS[0]!.id);
  const active = THREADS.find((t) => t.id === activeId) ?? THREADS[0]!;

  return (
    <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-[minmax(0,240px)_1fr] sm:p-0">
      <aside className="sm:border-r sm:border-zinc-200 sm:dark:border-zinc-800">
        <div className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Inbox</p>
          <ul className="mt-3 space-y-1" role="list">
            {THREADS.map((t) => {
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
                    <span className="block truncate">{t.name}</span>
                    <span className="mt-0.5 block truncate text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      {t.preview}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
      <div className="flex min-h-[300px] flex-col rounded-xl border border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40 sm:border-0 sm:rounded-none">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{active.name}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Preview conversation — not saved or delivered.</p>
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {active.messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.from === "you"
                  ? "ml-auto bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "mr-auto bg-white text-zinc-800 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>
        <div className="mt-auto border-t border-zinc-200 p-4 dark:border-zinc-800">
          <p className="mb-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Composer is disabled until Orbit messaging is connected to your backend.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Message…"
              disabled
              className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button
              type="button"
              disabled
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
