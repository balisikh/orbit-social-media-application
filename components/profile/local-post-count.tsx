"use client";

import { useMemo, useSyncExternalStore } from "react";

function readRaw(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function countFromRaw(raw: string): number {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function LocalPostCount({ ownerKey }: { ownerKey: string }) {
  const storageKey = useMemo(() => `orbit:posts:${ownerKey}`, [ownerKey]);

  const raw = useSyncExternalStore(
    (onStoreChange) => {
      function onStorage(e: StorageEvent) {
        if (e.key === storageKey) onStoreChange();
      }
      function onUpdated() {
        onStoreChange();
      }
      window.addEventListener("storage", onStorage);
      window.addEventListener("orbit:posts-updated", onUpdated);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("orbit:posts-updated", onUpdated);
      };
    },
    () => readRaw(storageKey),
    () => "",
  );

  return <>{countFromRaw(raw)}</>;
}

