import { LEGACY_IMAGES_KEY, STORAGE_KEYS } from "./constants.js";
import { dataUrlToBlob } from "./images.js";
import { Log } from "./log.js";

// --- localStorage helpers --------------------------------------------------
function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Quota exceeded — surface a single alert
    if (!window.__quotaWarned) {
      window.__quotaWarned = true;
      alert(
        "Storage is full. Phones limit a website to roughly 5MB. Try deleting some items or use smaller photos.",
      );
    }
    Log.error("localStorage.setFailed", { key, error: String(e) });
  }
}

// --- IndexedDB image store -------------------------------------------------
// Single store keyed by item id, values are Blobs. No schema, no migrations
// beyond the one-time localStorage → IDB import below.
const IDB = (() => {
  const DB_NAME = "wardrobe";
  const DB_VERSION = 1;
  const STORE = "images";
  let _dbPromise = null;

  function open() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return _dbPromise;
  }

  // Run a callback inside a fresh transaction. The callback runs synchronously
  // after the store is obtained, so the IDB transaction stays open for the
  // duration of the request — transactions auto-close once control returns to
  // the event loop with no pending requests. The callback returns the IDB
  // request whose .result we want surfaced when the transaction completes.
  async function run(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let req;
      try {
        req = fn(store);
      } catch (e) {
        reject(e);
        return;
      }
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  // For multi-step reads (like entries via cursor), we collect into an
  // accumulator and resolve to that after the transaction completes.
  async function runCollect(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let acc;
      try {
        acc = fn(store);
      } catch (e) {
        reject(e);
        return;
      }
      tx.oncomplete = () => resolve(acc);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  return {
    get(id) {
      return run("readonly", (s) => s.get(id));
    },
    put(id, blob) {
      return run("readwrite", (s) => s.put(blob, id));
    },
    delete(id) {
      return run("readwrite", (s) => s.delete(id));
    },
    keys() {
      return run("readonly", (s) => s.getAllKeys());
    },
    entries() {
      return runCollect("readonly", (s) => {
        const out = {};
        const req = s.openCursor();
        req.onsuccess = () => {
          const cur = req.result;
          if (!cur) return;
          out[cur.key] = cur.value;
          cur.continue();
        };
        return out;
      });
    },
    // Write many blobs in one transaction. `entries` is an array of [id, blob].
    putMany(entries) {
      return runCollect("readwrite", (s) => {
        for (const [id, blob] of entries) s.put(blob, id);
        return entries.length;
      });
    },
    clear() {
      return run("readwrite", (s) => s.clear());
    },
  };
})();

// --- object URL cache ------------------------------------------------------
// Keeps a {itemId: objectURL} map alive for the lifetime of the app session
// so we don't regenerate URLs on every render. Revoke explicitly on delete.
const ObjectUrlCache = (() => {
  const urls = new Map();
  return {
    set(id, blob) {
      const old = urls.get(id);
      if (old) URL.revokeObjectURL(old);
      const url = URL.createObjectURL(blob);
      urls.set(id, url);
      return url;
    },
    get(id) {
      return urls.get(id);
    },
    delete(id) {
      const url = urls.get(id);
      if (url) URL.revokeObjectURL(url);
      urls.delete(id);
    },
    snapshot() {
      return Object.fromEntries(urls);
    },
  };
})();

// Load all images from IDB and seed the object URL cache. Returns {itemId: url}.
async function hydrateImages() {
  const blobs = await IDB.entries();
  for (const [id, blob] of Object.entries(blobs)) {
    ObjectUrlCache.set(id, blob);
  }
  return ObjectUrlCache.snapshot();
}

// Ask the browser to make this origin's storage persistent. By default, PWA
// storage is "best-effort" and the browser may evict IndexedDB (where photos
// live) under storage pressure or time-based policies — which silently wipes
// every photo while leaving localStorage metadata intact. Requesting
// persistence opts us out of that eviction. Safe to call repeatedly; resolves
// to whether storage is persistent afterwards.
async function ensurePersistentStorage() {
  try {
    if (!navigator.storage || !navigator.storage.persist) {
      Log.warn("persist.unsupported");
      return false;
    }
    if (await navigator.storage.persisted()) return true;
    const granted = await navigator.storage.persist();
    Log[granted ? "info" : "warn"]("persist.request", { granted });
    return granted;
  } catch (e) {
    Log.error("persist.failed", e);
    return false;
  }
}

// One-time migration: legacy localStorage `closet:images:v1` (data URLs) → IDB blobs.
// Safe to call repeatedly; the migrated flag stops re-runs.
async function migrateLegacyImagesIfNeeded() {
  if (lsGet(STORAGE_KEYS.imagesMigrated, false)) return { migrated: 0 };
  const legacy = (() => {
    try {
      const v = localStorage.getItem(LEGACY_IMAGES_KEY);
      return v == null ? null : JSON.parse(v);
    } catch {
      return null;
    }
  })();
  if (!legacy || typeof legacy !== "object") {
    lsSet(STORAGE_KEYS.imagesMigrated, true);
    return { migrated: 0 };
  }
  const entries = [];
  for (const [id, dataUrl] of Object.entries(legacy)) {
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) continue;
    try {
      entries.push([id, dataUrlToBlob(dataUrl)]);
    } catch (e) {
      Log.error("migrate.decodeFailed", { id, error: String(e) });
    }
  }
  let migrated = 0;
  if (entries.length) {
    try {
      migrated = await IDB.putMany(entries);
    } catch (e) {
      Log.error("migrate.writeFailed", e);
    }
  }
  // Free the ~1MB the legacy key occupies before marking migrated.
  try {
    localStorage.removeItem(LEGACY_IMAGES_KEY);
  } catch {}
  lsSet(STORAGE_KEYS.imagesMigrated, true);
  Log.info("migrate.done", { migrated, attempted: entries.length });
  return { migrated };
}

export { lsGet, lsSet, IDB, ObjectUrlCache, hydrateImages, ensurePersistentStorage, migrateLegacyImagesIfNeeded };
