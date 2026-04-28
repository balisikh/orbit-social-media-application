"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { writeDevProfileLocalBackup } from "@/lib/auth/dev-profile-local";
import { parseUsername } from "@/lib/auth/username";
import { LocalDataTransfer } from "@/components/me/local-data-transfer";

type Props = {
  mode: "supabase" | "dev";
  email: string;
  currentHandle: string | null;
  currentDisplayName: string | null;
  currentBio: string | null;
};

function cleanName(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

async function fileToDataUrl(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const base64 = btoa(binary);
  const mime = file.type?.trim() || "application/octet-stream";
  return `data:${mime};base64,${base64}`;
}

function isHeicLike(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return type === "image/heic" || type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");
}

async function normalizeAvatarFile(file: File): Promise<File> {
  if (!isHeicLike(file)) return file;
  const { default: heic2any } = await import("heic2any");
  const converted = (await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  })) as Blob | Blob[];
  const blob = Array.isArray(converted) ? converted[0]! : converted;
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: blob.type || "image/jpeg" });
}

async function downscaleAvatar(dataUrl: string): Promise<string> {
  const img = new Image();
  img.decoding = "async";
  img.src = dataUrl;
  try {
    await img.decode();
  } catch {
    return dataUrl;
  }
  const max = 256;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return dataUrl;
  const scale = Math.min(1, max / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, cw, ch);
  try {
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return dataUrl;
  }
}

export function SetProfileBasicsForm({ mode, email, currentHandle, currentDisplayName, currentBio }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(currentDisplayName ?? "");
  const [username, setUsername] = useState(currentHandle ?? "");
  const [bio, setBio] = useState(currentBio ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(currentDisplayName ?? "");
  }, [currentDisplayName]);

  useEffect(() => {
    setUsername(currentHandle ?? "");
  }, [currentHandle]);

  useEffect(() => {
    setBio(currentBio ?? "");
  }, [currentBio]);

  const canSave = useMemo(() => {
    const nextName = cleanName(displayName);
    const nextHandle = username.length ? parseUsername(username) : null;
    const nextBio = bio.trim();
    return Boolean(nextName.length || nextHandle || nextBio.length || avatarFile);
  }, [displayName, username, bio, avatarFile]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const nextName = cleanName(displayName);
    const nextHandle = username.length ? parseUsername(username) : null;
    const nextBio = bio.trim();
    if (username.length && !nextHandle) {
      setError("Username must be 3–30 characters: letters, numbers, and underscores only.");
      return;
    }

    setLoading(true);
    try {
      const keyEmail = email.trim().toLowerCase();
      if (mode === "dev" && avatarFile) {
        const normalized = await normalizeAvatarFile(avatarFile);
        const raw = await fileToDataUrl(normalized);
        const small = await downscaleAvatar(raw);
        window.localStorage.setItem(`orbit:avatar:${keyEmail}`, small);
        window.dispatchEvent(new CustomEvent("orbit:avatar-updated", { detail: { ownerKey: keyEmail } }));
      }

      if (mode === "supabase") {
        let avatarDataUrl: string | null = null;
        if (avatarFile) {
          const normalized = await normalizeAvatarFile(avatarFile);
          const raw = await fileToDataUrl(normalized);
          avatarDataUrl = await downscaleAvatar(raw);
        }

        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            ...(nextHandle ? { username: nextHandle } : {}),
            ...(nextName ? { full_name: nextName } : {}),
            bio: nextBio.length ? nextBio : "",
          },
        });
        if (updateError) {
          setError(updateError.message);
          return;
        }

        const wantsBioUpdate = nextBio.length > 0 || Boolean(currentBio);
        const wantsAvatarUpdate = Boolean(avatarDataUrl);
        if (wantsBioUpdate || wantsAvatarUpdate) {
          const payload: { bio?: string | null; avatarUrl?: string | null } = {};
          if (wantsBioUpdate) payload.bio = nextBio.length ? nextBio : null;
          if (wantsAvatarUpdate) payload.avatarUrl = avatarDataUrl;
          const update = await fetch("/api/profile/update", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!update.ok) {
            const j = (await update.json().catch(() => null)) as { error?: string } | null;
            setError(j?.error ?? "Saved, but Orbit couldn’t update your profile yet.");
            router.refresh();
            return;
          }
        }

        const sync = await fetch("/api/profile/sync", { method: "POST" });
        if (!sync.ok) {
          const j = (await sync.json().catch(() => null)) as { error?: string } | null;
          setError(j?.error ?? "Saved, but Orbit couldn’t sync your profile yet. Refresh and try again.");
          router.refresh();
          return;
        }
      } else {
        const res = await fetch("/api/orbit-dev-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            username: nextHandle,
            displayName: nextName || null,
            bio: nextBio.length ? nextBio : null,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(j?.error ?? "Couldn’t update local preview profile.");
          return;
        }
        writeDevProfileLocalBackup(keyEmail, {
          username: nextHandle,
          displayName: nextName.length ? nextName : null,
          bio: nextBio.length ? nextBio : null,
        });
      }

      setSuccess("Saved.");
      setAvatarFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      id="profile-basics"
      className="mt-4 scroll-mt-24 max-w-xl space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <div>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Profile basics</p>
        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
          {mode === "supabase"
            ? "Updates your Orbit account and syncs to your public profile."
            : "Updates your local preview profile for this browser."}
        </p>
      </div>

      <div>
        <label htmlFor="me-avatar" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Profile photo
        </label>
        <input
          id="me-avatar"
          type="file"
          accept="image/*"
          disabled={loading}
          onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900 hover:file:bg-zinc-200 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:file:bg-zinc-900 dark:file:text-zinc-50 dark:hover:file:bg-zinc-800"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          {mode === "supabase"
            ? "Upload a photo to save it to your profile (shows on /me and your public profile after you sign in again)."
            : "Upload a photo to replace your initial (saved in this browser)."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="me-display-name" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Display name
          </label>
          <input
            id="me-display-name"
            name="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            placeholder="Baljinder Singh Rai"
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>

        <div className="min-w-0">
          <label htmlFor="me-username" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Username
          </label>
          <input
            id="me-username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            disabled={loading}
            placeholder="balisikhjatt27"
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
      </div>

      <div className="min-w-0">
        <label htmlFor="me-bio" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Bio
        </label>
        <textarea
          id="me-bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={loading}
          placeholder="Write a short bio…"
          rows={3}
          className="mt-1 w-full resize-y rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{bio.trim().length}/280</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading || !canSave}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Saving…" : "Save"}
        </button>
        {success ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p> : null}
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {mode === "dev" ? <LocalDataTransfer ownerEmail={email} handle={currentHandle ?? null} /> : null}
    </form>
  );
}

