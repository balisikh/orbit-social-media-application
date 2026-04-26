const DB_NAME = "orbit-preview-media";
const DB_VERSION = 1;
const STORE_REEL_VIDEOS = "reelVideos";

function compositeKey(ownerKey: string, reelId: string): string {
  return `${ownerKey}::${reelId}`;
}

/** True when the browser cannot grow IndexedDB (disk full, profile quota, etc.). */
export function isIndexedDbQuotaOrDiskError(err: unknown): boolean {
  if (!err) return false;
  const name = err instanceof DOMException ? err.name : (err as Error).name ?? "";
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (name === "QuotaExceededError") return true;
  if (
    message.includes("quota") ||
    message.includes("storage is full") ||
    message.includes("full disk") ||
    message.includes("backing store") ||
    message.includes("encountered full disk")
  ) {
    return true;
  }
  return false;
}

export function formatIndexedDbStorageError(err: unknown): string {
  if (isIndexedDbQuotaOrDiskError(err)) {
    return (
      "Orbit could not save the video: your device or browser storage is full (or the disk is full). " +
      "Free some disk space, delete older reels on the Reels page, or clear this site’s data for Orbit in your browser settings, then try again."
    );
  }
  if (err instanceof Error && err.message) return err.message;
  return "Could not use browser storage for reel videos.";
}

function rejectIdb(err: unknown): Error {
  if (err instanceof Error && err.message.startsWith("Orbit could not save")) return err;
  return new Error(formatIndexedDbStorageError(err));
}

/** Deletes all locally cached reel video blobs (IndexedDB only). Metadata in localStorage is unchanged. */
export function deleteOrbitReelMediaDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onblocked = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("Could not delete reel media database."));
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }
    const timeout = setTimeout(() => {
      reject(new Error("Orbit could not open browser storage for videos (timed out)."));
    }, 6000);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_REEL_VIDEOS)) {
        db.createObjectStore(STORE_REEL_VIDEOS);
      }
    };
    req.onsuccess = () => {
      clearTimeout(timeout);
      resolve(req.result);
    };
    req.onblocked = () => {
      clearTimeout(timeout);
      reject(
        rejectIdb(
          new Error(
            "Orbit could not open video storage (blocked). Close other Orbit tabs/windows and try again.",
          ),
        ),
      );
    };
    req.onerror = () => {
      clearTimeout(timeout);
      reject(rejectIdb(req.error));
    };
  });
}

export async function putReelVideoBlob(ownerKey: string, reelId: string, blob: Blob): Promise<void> {
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch (e) {
    throw rejectIdb(e);
  }
  const key = compositeKey(ownerKey, reelId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REEL_VIDEOS, "readwrite");
    const req = tx.objectStore(STORE_REEL_VIDEOS).put(blob, key);
    req.onerror = () => reject(rejectIdb(req.error));
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(rejectIdb(tx.error));
    };
  });
}

export async function getReelVideoBlob(ownerKey: string, reelId: string): Promise<Blob | null> {
  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    const key = compositeKey(ownerKey, reelId);
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db!.transaction(STORE_REEL_VIDEOS, "readonly");
      const req = tx.objectStore(STORE_REEL_VIDEOS).get(key);
      req.onsuccess = () => {
        const v = req.result;
        resolve(v instanceof Blob ? v : null);
      };
      req.onerror = () => reject(req.error ?? new Error("Could not read reel video."));
      tx.onerror = () => reject(tx.error ?? new Error("Could not read reel video."));
    });
  } catch {
    return null;
  } finally {
    try {
      db?.close();
    } catch {
      // ignore
    }
  }
}

export async function deleteReelVideoBlob(ownerKey: string, reelId: string): Promise<void> {
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return;
  }
  const key = compositeKey(ownerKey, reelId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REEL_VIDEOS, "readwrite");
    tx.objectStore(STORE_REEL_VIDEOS).delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Could not delete reel video."));
    };
  });
}
