import { normalizeAudioLabel } from "@/lib/audio/label";
import { readLocalPosts, writeLocalPosts } from "@/lib/posts/local";
import { readLocalReels, writeLocalReels } from "@/lib/reels/local";

/**
 * If the label looks like "Left — Right" (or similar separators), return "Right — Left"
 * using a normalized em dash between parts. Returns null if no safe split is found.
 */
export function trySwapTitleArtistOrder(label: string): string | null {
  const t = label.trim();
  if (!t) return null;
  const seps = [" — ", " – ", " - ", " —", "— ", "—", " –", "– ", "–", " -", "- "] as const;
  for (const sep of seps) {
    const i = t.indexOf(sep);
    if (i === -1) continue;
    const left = t.slice(0, i).trim();
    const right = t.slice(i + sep.length).trim();
    if (!left || !right) continue;
    return `${right} — ${left}`;
  }
  return null;
}

export function replaceLocalAudioLabel(
  ownerKey: string,
  fromNorm: string,
  newLabel: string,
): { reelsUpdated: number; postsUpdated: number } {
  const targetNorm = normalizeAudioLabel(fromNorm);
  const trimmed = newLabel.trim();
  if (!targetNorm) return { reelsUpdated: 0, postsUpdated: 0 };

  let reelsUpdated = 0;
  const reels = readLocalReels(ownerKey);
  const nextReels = reels.map((r) => {
    if (normalizeAudioLabel(r.audioLabel || "") !== targetNorm) return r;
    reelsUpdated++;
    return { ...r, audioLabel: trimmed || null };
  });
  if (reelsUpdated) writeLocalReels(ownerKey, nextReels);

  let postsUpdated = 0;
  const posts = readLocalPosts(ownerKey);
  const nextPosts = posts.map((p) => {
    const hasVideo = Boolean(p.videoUrl) || Boolean(p.media?.some((m) => m.kind === "video"));
    if (!hasVideo) return p;
    if (normalizeAudioLabel(p.audioLabel || "") !== targetNorm) return p;
    postsUpdated++;
    return { ...p, audioLabel: trimmed || null };
  });
  if (postsUpdated) writeLocalPosts(ownerKey, nextPosts);

  return { reelsUpdated, postsUpdated };
}
