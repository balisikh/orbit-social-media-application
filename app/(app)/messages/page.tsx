export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Messages
        </h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          Direct messages and live delivery will plug in here as Orbit&apos;s messaging layer ships.
        </p>
      </div>
      <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-[minmax(0,220px)_1fr] sm:p-0">
        <aside className="hidden sm:block sm:border-r sm:border-zinc-200 sm:dark:border-zinc-800">
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Inbox
            </p>
            <ul className="mt-3 space-y-1">
              {["Orbit team", "Camera club", "Weekend hike"].map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <div className="flex min-h-[280px] flex-col justify-end rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/50">
          <p className="mb-4 text-center text-sm text-zinc-500">
            Select a conversation to start messaging.
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
