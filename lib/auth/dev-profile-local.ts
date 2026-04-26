/** Browser backup for local-preview profile (dev only). Survives sign-out; merged on next dev sign-in. */

export type DevProfileLocalBackup = {
  username: string | null;
  displayName: string | null;
  bio: string | null;
};

export function devProfileLocalStorageKey(email: string): string {
  return `orbit:devProfile:${email.trim().toLowerCase()}`;
}

export function readDevProfileLocalBackup(email: string): DevProfileLocalBackup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(devProfileLocalStorageKey(email));
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== "object") return null;
    const username = o.username;
    const displayName = o.displayName;
    const bio = o.bio;
    return {
      username: typeof username === "string" && username.length > 0 ? username : null,
      displayName: typeof displayName === "string" && displayName.trim().length > 0 ? displayName.trim() : null,
      bio: typeof bio === "string" && bio.trim().length > 0 ? bio.trim() : null,
    };
  } catch {
    return null;
  }
}

export function writeDevProfileLocalBackup(email: string, data: DevProfileLocalBackup): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(devProfileLocalStorageKey(email), JSON.stringify(data));
  } catch {
    // quota or private mode
  }
}
