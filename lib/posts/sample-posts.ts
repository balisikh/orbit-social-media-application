import { readLocalPosts, writeLocalPosts, type LocalPost } from "@/lib/posts/local";

/** Stable ids so “Add examples” can replace the same demos without duplicates. */
export const ORBIT_DEMO_SINGLE_POST_ID = "orbit-demo-single-post-v1";
export const ORBIT_DEMO_SLIDESHOW_POST_ID = "orbit-demo-slideshow-post-v1";

function demoSvgDataUrl(label: string, fillHex: string): string {
  const safe = label.replace(/</g, "").replace(/&/g, "and");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="900"><rect fill="${fillHex}" width="100%" height="100%"/><text x="50%" y="48%" text-anchor="middle" fill="#fafafa" font-size="30" font-family="system-ui,sans-serif">${safe}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Inserts (or replaces) two tiny demo posts: one single-image post and one 3-slide slideshow.
 * Uses SVG data URLs only — keeps localStorage small.
 */
export function upsertLocalDemoFeedExamples(ownerKey: string): void {
  if (typeof window === "undefined") return;

  const rest = readLocalPosts(ownerKey).filter(
    (p) => p.id !== ORBIT_DEMO_SINGLE_POST_ID && p.id !== ORBIT_DEMO_SLIDESHOW_POST_ID,
  );

  const now = new Date().toISOString();

  const slideA = demoSvgDataUrl("Slide 1", "#6366f1");
  const slideB = demoSvgDataUrl("Slide 2", "#a855f7");
  const slideC = demoSvgDataUrl("Slide 3", "#f97316");

  const slideshow: LocalPost = {
    id: ORBIT_DEMO_SLIDESHOW_POST_ID,
    createdAt: now,
    caption: "[Orbit demo] Slideshow — three slides. Swipe on the photo, use dots, or Back/Next.",
    imageUrl: slideA,
    videoUrl: null,
    media: [
      { kind: "image", url: slideA },
      { kind: "image", url: slideB },
      { kind: "image", url: slideC },
    ],
    audioLabel: null,
  };

  const singleImg = demoSvgDataUrl("Single post", "#3f3f46");
  const single: LocalPost = {
    id: ORBIT_DEMO_SINGLE_POST_ID,
    createdAt: new Date(Date.now() - 1).toISOString(),
    caption: "[Orbit demo] Single post — one image, no slideshow controls.",
    imageUrl: singleImg,
    videoUrl: null,
    media: [{ kind: "image", url: singleImg }],
    audioLabel: null,
  };

  writeLocalPosts(ownerKey, [slideshow, single, ...rest]);
}
