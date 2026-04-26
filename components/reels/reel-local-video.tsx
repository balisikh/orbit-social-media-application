"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deleteOrbitReelMediaDatabase,
  formatIndexedDbStorageError,
  isIndexedDbQuotaOrDiskError,
  getReelVideoBlob,
} from "@/lib/reels/idb";
import type { LocalReel } from "@/lib/reels/local";

type Props = {
  ownerKey: string;
  reel: LocalReel;
  className?: string;
  controls?: boolean;
  playsInline?: boolean;
};

export function ReelLocalVideo({ ownerKey, reel, className, controls = true, playsInline = true }: Props) {
  const dataUrlSrc = useMemo(
    () => (reel.videoDataUrl?.startsWith("data:video/") ? reel.videoDataUrl : null),
    [reel.videoDataUrl],
  );
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (dataUrlSrc || !reel.videoBlobInIdb) {
      queueMicrotask(() => {
        setLoadError(null);
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      });
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;
    queueMicrotask(() => setLoadError(null));

    const loadTimeoutMs = 15_000;
    (async () => {
      try {
        const blob = await Promise.race([
          getReelVideoBlob(ownerKey, reel.id),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Timed out loading video from browser storage.")), loadTimeoutMs),
          ),
        ]);
        if (cancelled) return;
        if (!blob) {
          setLoadError(
            "Could not load this reel’s video from browser storage (disk full, storage blocked, or the file was removed).",
          );
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (e) {
        if (!cancelled) setLoadError(formatIndexedDbStorageError(e));
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [dataUrlSrc, ownerKey, reel.id, reel.videoBlobInIdb]);

  const src = dataUrlSrc ?? blobUrl;

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-900 px-3 text-center text-xs text-white/70 ${className ?? ""}`}
      >
        {loadError ? (
          <span className="space-y-2 text-white/80">
            <span className="block">{loadError}</span>
            {isIndexedDbQuotaOrDiskError(loadError) || loadError.toLowerCase().includes("disk") ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await deleteOrbitReelMediaDatabase();
                    setLoadError("Cleared local reel video cache. Refresh the page and re-upload if needed.");
                  } catch (e) {
                    setLoadError(formatIndexedDbStorageError(e));
                  }
                }}
                className="mx-auto block rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
              >
                Clear local video cache
              </button>
            ) : null}
          </span>
        ) : (
          <span>Loading video…</span>
        )}
      </div>
    );
  }

  return <video src={src} className={className} controls={controls} playsInline={playsInline} />;
}
