"use client";

import { ReelList } from "@/components/reels/reel-list";

/** Client-only entry so `/reels` local mode never SSR-renders reel storage (avoids hydration mismatch). */
export default function LocalReelListClient({ ownerKey }: { ownerKey: string }) {
  return <ReelList mode="local" ownerKey={ownerKey} isOwner />;
}
