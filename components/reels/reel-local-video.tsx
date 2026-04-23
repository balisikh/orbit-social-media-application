"use client";

import { useEffect, useState } from "react";
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
  const [src, setSrc] = useState<string | null>(() =>
    reel.videoDataUrl?.startsWith("data:video/") ? reel.videoDataUrl : null,
  );

  useEffect(() => {
    if (reel.videoDataUrl?.startsWith("data:video/")) {
      setSrc(reel.videoDataUrl);
      return;
    }
    if (!reel.videoBlobInIdb) {
      setSrc(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      const blob = await getReelVideoBlob(ownerKey, reel.id);
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [ownerKey, reel.id, reel.videoBlobInIdb, reel.videoDataUrl]);

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-zinc-900 text-xs text-white/70 ${className ?? ""}`}>
        Loading video…
      </div>
    );
  }

  return <video src={src} className={className} controls={controls} playsInline={playsInline} />;
}
