"use client";

import { useMemo, useSyncExternalStore } from "react";

function readRaw(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function LocalAvatar({
  ownerKey,
  initialLetter,
}: {
  ownerKey: string;
  initialLetter: string;
}) {
  const storageKey = useMemo(() => `orbit:avatar:${ownerKey}`, [ownerKey]);

  const raw = useSyncExternalStore(
    (onStoreChange) => {
      function onStorage(e: StorageEvent) {
        if (e.key === storageKey) onStoreChange();
      }
      function onUpdated(e: Event) {
        const detailOwnerKey = (e as CustomEvent<{ ownerKey?: string }>)?.detail?.ownerKey;
        if (!detailOwnerKey || detailOwnerKey === ownerKey) onStoreChange();
      }
      window.addEventListener("storage", onStorage);
      window.addEventListener("orbit:avatar-updated", onUpdated as EventListener);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("orbit:avatar-updated", onUpdated as EventListener);
      };
    },
    () => readRaw(storageKey),
    () => "",
  );

  const url = raw && raw.startsWith("data:image/") ? raw : null;

  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- data URL
    <img src={url} alt="" className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-white" aria-hidden>
      {initialLetter}
    </div>
  );
}

