"use client";

import { useMemo, useRef, useState } from "react";
import { getReelVideoBlob, putReelVideoBlob } from "@/lib/reels/idb";
import type { LocalReel } from "@/lib/reels/local";

type ExportPayload = {
  schema: "orbit-local-export-v1";
  exportedAt: string;
  identity: {
    email: string;
    handle: string | null;
  };
  localStorage: Record<string, string>;
  reelsIdb: Array<{ ownerKey: string; reelId: string; mime: string; dataUrl: string }>;
};

function safeEmailKey(email: string): string {
  return email.trim().toLowerCase();
}

function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string) {
  window.localStorage.setItem(key, value);
}

function fireUpdatedEvents(opts: { ownerKey: string; handle: string | null }) {
  const ownerKey = opts.ownerKey;
  window.dispatchEvent(new CustomEvent("orbit:avatar-updated", { detail: { ownerKey } }));
  window.dispatchEvent(new CustomEvent("orbit:posts-updated", { detail: { ownerKey } }));
  window.dispatchEvent(new CustomEvent("orbit:messages-updated", { detail: { ownerKey } }));
  window.dispatchEvent(new CustomEvent("orbit:reels-updated", { detail: { ownerKey } }));
  window.dispatchEvent(new CustomEvent("orbit:follows-updated"));
  // Some pages also listen to storage snapshots; refresh handles edge cases.
  void opts.handle;
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result ?? "null")) as unknown);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsText(file);
  });
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) throw new Error("Invalid data URL");
  const mime = m[1] ?? "application/octet-stream";
  const b64 = m[2] ?? "";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mime, blob: new Blob([bytes], { type: mime }) };
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read blob"));
    reader.readAsDataURL(blob);
  });
}

export function LocalDataTransfer({ ownerEmail, handle }: { ownerEmail: string; handle: string | null }) {
  const ownerKey = useMemo(() => safeEmailKey(ownerEmail), [ownerEmail]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const keys = useMemo(() => {
    return [
      `orbit:devProfile:${ownerKey}`,
      `orbit:avatar:${ownerKey}`,
      `orbit:posts:${ownerKey}`,
      `orbit:messages:${ownerKey}`,
      `orbit:reels:${ownerKey}`,
      "orbit:follows:v2",
      "orbit:follows:actions:v1",
    ] as const;
  }, [ownerKey]);

  async function onExport() {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const localStorageDump: Record<string, string> = {};
      for (const k of keys) {
        const v = lsGet(k);
        if (typeof v === "string" && v.length) localStorageDump[k] = v;
      }

      // Optional: include IndexedDB reel videos (can be large). We cap total exported bytes.
      const reelsIdb: ExportPayload["reelsIdb"] = [];
      let totalBytes = 0;
      const reelsRaw = localStorageDump[`orbit:reels:${ownerKey}`];
      if (reelsRaw) {
        try {
          const parsed = JSON.parse(reelsRaw) as unknown;
          const reels = Array.isArray(parsed) ? (parsed as LocalReel[]) : [];
          for (const r of reels.slice(0, 12)) {
            if (!r || typeof r !== "object") continue;
            if (!("videoBlobInIdb" in r) || r.videoBlobInIdb !== true) continue;
            const reelId = (r as { id?: unknown }).id;
            if (typeof reelId !== "string" || !reelId) continue;
            const blob = await getReelVideoBlob(ownerKey, reelId);
            if (!blob) continue;
            totalBytes += blob.size;
            if (totalBytes > 15 * 1024 * 1024) break; // 15MB cap
            const dataUrl = await blobToDataUrl(blob);
            reelsIdb.push({ ownerKey, reelId, mime: blob.type || "video/mp4", dataUrl });
          }
        } catch {
          // ignore
        }
      }

      const payload: ExportPayload = {
        schema: "orbit-local-export-v1",
        exportedAt: new Date().toISOString(),
        identity: { email: ownerKey, handle: handle?.trim() ? handle.trim().toLowerCase() : null },
        localStorage: localStorageDump,
        reelsIdb,
      };

      downloadJson(`orbit-local-export-${ownerKey}-${new Date().toISOString().slice(0, 10)}.json`, payload);
      setSuccess("Exported. Check your downloads.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export.");
    } finally {
      setBusy(false);
    }
  }

  async function onImportFile(file: File) {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const raw = await parseJsonFile(file);
      if (!raw || typeof raw !== "object") throw new Error("Invalid export file.");
      const payload = raw as Partial<ExportPayload>;
      if (payload.schema !== "orbit-local-export-v1") throw new Error("Unsupported export format.");

      const map = payload.localStorage ?? {};
      if (!map || typeof map !== "object") throw new Error("Invalid export payload.");

      // Write localStorage values.
      const written: string[] = [];
      for (const [k, v] of Object.entries(map)) {
        if (typeof k !== "string" || typeof v !== "string") continue;
        // Safety: only allow Orbit keys.
        if (!k.startsWith("orbit:")) continue;
        lsSet(k, v);
        written.push(k);
      }

      // Restore IndexedDB reel videos (if present).
      const reels = Array.isArray(payload.reelsIdb) ? payload.reelsIdb : [];
      for (const r of reels) {
        if (!r || typeof r !== "object") continue;
        const reelId = (r as { reelId?: unknown }).reelId;
        const dataUrl = (r as { dataUrl?: unknown }).dataUrl;
        if (typeof reelId !== "string" || typeof dataUrl !== "string") continue;
        if (!dataUrl.startsWith("data:video/")) continue;
        const { blob } = dataUrlToBlob(dataUrl);
        await putReelVideoBlob(ownerKey, reelId, blob);
      }

      fireUpdatedEvents({ ownerKey, handle });
      setSuccess(`Imported (${written.length} item${written.length === 1 ? "" : "s"}). Refreshing…`);
      window.setTimeout(() => window.location.reload(), 350);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Transfer local data (Export / Import)</p>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        Use this to copy your exact Cursor/localhost Orbit setup to your Vercel site. This only affects local-mode data
        stored in this browser.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void onExport()}
          disabled={busy}
          className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {busy ? "Working…" : "Export data"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImportFile(f);
          }}
          className="block w-full max-w-xs rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </div>
      {success ? <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">{success}</p> : null}
      {error ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

