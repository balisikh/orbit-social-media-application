"use client";

import { useEffect, useMemo, useState } from "react";
import { getReelVideoBlob } from "@/lib/reels/idb";
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

  useEffect(() => {
    if (dataUrlSrc || !reel.videoBlobInIdb) {
      queueMicrotask(() => {
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      });
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      const blob = await getReelVideoBlob(ownerKey, reel.id);
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setBlobUrl(objectUrl);
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [dataUrlSrc, ownerKey, reel.id, reel.videoBlobInIdb]);

  const src = dataUrlSrc ?? blobUrl;

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-zinc-900 text-xs text-white/70 ${className ?? ""}`}>
        Loading video…
      </div>
    );
  }

  return <video src={src} className={className} controls={controls} playsInline={playsInline} />;
}
