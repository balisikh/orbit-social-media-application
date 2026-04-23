export function normalizeAudioLabel(label: string): string {
  return (label || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

