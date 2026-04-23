import { deleteReelVideoBlob, putReelVideoBlob } from "@/lib/reels/idb";

export type LocalReel = {
  id: string;
  caption: string | null;
  audioLabel?: string | null;
  createdAt: string;
  /** Legacy: entire video embedded in localStorage (hits quota quickly) */
  videoDataUrl?: string | null;
  /** Preferred: video bytes in IndexedDB */
  videoBlobInIdb?: boolean;
  videoMimeType?: string | null;
};

function storageKey(ownerKey: string): string {
  return `orbit:reels:${ownerKey}`;
}

function parseReelRow(r: unknown): LocalReel | null {
  if (!r || typeof r !== "object") return null;
  const id = (r as { id?: unknown }).id;
  const caption = (r as { caption?: unknown }).caption;
  const audioLabel = (r as { audioLabel?: unknown }).audioLabel;
  const createdAt = (r as { createdAt?: unknown }).createdAt;
  const videoDataUrl = (r as { videoDataUrl?: unknown }).videoDataUrl;
  const videoBlobInIdb = (r as { videoBlobInIdb?: unknown }).videoBlobInIdb;
  const videoMimeType = (r as { videoMimeType?: unknown }).videoMimeType;

  if (typeof id !== "string" || typeof createdAt !== "string") return null;

  if (videoBlobInIdb === true) {
    return {
      id,
      createdAt,
      caption: typeof caption === "string" ? caption : null,
      audioLabel: typeof audioLabel === "string" ? audioLabel : null,
      videoBlobInIdb: true,
      videoMimeType: typeof videoMimeType === "string" && videoMimeType ? videoMimeType : "video/mp4",
    };
  }

  if (typeof videoDataUrl === "string" && videoDataUrl.startsWith("data:video/")) {
    return {
      id,
      createdAt,
      caption: typeof caption === "string" ? caption : null,
      audioLabel: typeof audioLabel === "string" ? audioLabel : null,
      videoDataUrl,
    };
  }

  return null;
}

export function readLocalReels(ownerKey: string): LocalReel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(ownerKey));
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.map(parseReelRow).filter(Boolean) as LocalReel[];
  } catch {
    return [];
  }
}

export function writeLocalReels(ownerKey: string, reels: LocalReel[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(ownerKey), JSON.stringify(reels));
  } catch (e) {
    const domName = e instanceof DOMException ? e.name : "";
    const msg = e instanceof Error ? e.message : "";
    if (domName === "QuotaExceededError" || msg.toLowerCase().includes("quota")) {
      throw new Error(
        "Browser storage is full. Try deleting older reels or posts, or use a smaller video. New reels are saved to IndexedDB so this should be rare.",
      );
    }
    throw e;
  }
  window.dispatchEvent(new CustomEvent("orbit:reels-updated", { detail: { ownerKey } }));
}

/**
 * Saves reel metadata in localStorage and the video file in IndexedDB (avoids localStorage quota).
 */
export async function addLocalReel(
  ownerKey: string,
  reel: { caption: string | null; audioLabel?: string | null; videoFile: File },
): Promise<LocalReel> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const mime = reel.videoFile.type?.trim() || "video/mp4";

  await putReelVideoBlob(ownerKey, id, reel.videoFile);

  const next: LocalReel = {
    id,
    createdAt,
    caption: reel.caption,
    audioLabel: reel.audioLabel ?? null,
    videoBlobInIdb: true,
    videoMimeType: mime,
  };

  const reels = readLocalReels(ownerKey);
  try {
    writeLocalReels(ownerKey, [next, ...reels]);
  } catch (e) {
    try {
      await deleteReelVideoBlob(ownerKey, id);
    } catch {
      // ignore cleanup errors
    }
    throw e;
  }
  return next;
}

export async function deleteLocalReel(ownerKey: string, reelId: string) {
  const reels = readLocalReels(ownerKey);
  const target = reels.find((r) => r.id === reelId);
  if (target?.videoBlobInIdb) {
    try {
      await deleteReelVideoBlob(ownerKey, reelId);
    } catch {
      // still remove metadata so UI doesn’t get stuck
    }
  }
  writeLocalReels(
    ownerKey,
    reels.filter((r) => r.id !== reelId),
  );
}
