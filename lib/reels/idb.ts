const DB_NAME = "orbit-preview-media";
const DB_VERSION = 1;
const STORE_REEL_VIDEOS = "reelVideos";

function compositeKey(ownerKey: string, reelId: string): string {
  return `${ownerKey}::${reelId}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_REEL_VIDEOS)) {
        db.createObjectStore(STORE_REEL_VIDEOS);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open IndexedDB."));
  });
}

export async function putReelVideoBlob(ownerKey: string, reelId: string, blob: Blob): Promise<void> {
  const db = await openDb();
  const key = compositeKey(ownerKey, reelId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REEL_VIDEOS, "readwrite");
    const req = tx.objectStore(STORE_REEL_VIDEOS).put(blob, key);
    req.onerror = () => reject(req.error ?? new Error("Could not save reel video."));
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Could not save reel video."));
    };
  });
}

export async function getReelVideoBlob(ownerKey: string, reelId: string): Promise<Blob | null> {
  const db = await openDb();
  const key = compositeKey(ownerKey, reelId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REEL_VIDEOS, "readonly");
    const req = tx.objectStore(STORE_REEL_VIDEOS).get(key);
    req.onsuccess = () => {
      db.close();
      const v = req.result;
      resolve(v instanceof Blob ? v : null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error ?? new Error("Could not read reel video."));
    };
  });
}

export async function deleteReelVideoBlob(ownerKey: string, reelId: string): Promise<void> {
  const db = await openDb();
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
