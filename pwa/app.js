/* Poppy — PWA build
   Vanilla in-browser React (via Babel standalone). No bundler.
   Persistence: metadata in localStorage, images as Blobs in IndexedDB.
   The `images` map passed through React props is {itemId: objectURL} — tiny pointers
   into IDB-backed blobs, generated on load and revoked on delete/unmount.
*/

const { useState, useEffect, useMemo, useRef } = React;

function useBodyScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
}

// --- Inline SVG icons (replaces lucide-react) -------------------------------
const Icon = ({ d, size = 16, stroke = 2, fill = "none", className = "", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
       fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
       className={className} {...props}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);
const I = {
  shirt:    (p) => <Icon {...p} d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />,
  tag:      (p) => <Icon {...p} d={<><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2z"/><circle cx="7" cy="7" r="0.5" fill="currentColor"/></>} />,
  layers:   (p) => <Icon {...p} d={<><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></>} />,
  plus:     (p) => <Icon {...p} d={<><path d="M12 5v14"/><path d="M5 12h14"/></>} />,
  x:        (p) => <Icon {...p} d={<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>} />,
  upload:   (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></>} />,
  trash:    (p) => <Icon {...p} d={<><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>} />,
  pencil:   (p) => <Icon {...p} d={<><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></>} />,
  check:    (p) => <Icon {...p} d="M20 6 9 17l-5-5" />,
  search:   (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>} />,
  sparkles: (p) => <Icon {...p} d={<><path d="M9.94 14.34 12 21l2.06-6.66L21 12.28l-6.94-2.06L12 3l-2.06 6.66L3 12.28z"/></>} />,
  chevron:  (p) => <Icon {...p} d="m9 18 6-6-6-6" />,
  download: (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></>} />,
  install:  (p) => <Icon {...p} d={<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></>} />,
  archive:  (p) => <Icon {...p} d={<><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><line x1="10" x2="14" y1="12" y2="12"/></>} />,
  alert:    (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></>} />,
  folder:   (p) => <Icon {...p} d="M4 4h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />,
  bookmark: (p) => <Icon {...p} d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  grip:     (p) => <Icon {...p} d={<><circle cx="9" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="15" cy="18" r="1.2"/></>} />,
  camera:   (p) => <Icon {...p} d={<><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></>} />,
  flower:   (p) => <Icon {...p} fill="currentColor" stroke="none" d={<><circle cx="12" cy="12" r="3"/><path d="M12 2a3.5 3.5 0 0 0-3 5.3A3.5 3.5 0 0 0 7.3 9 3.5 3.5 0 0 0 5 12c0 1.13.54 2.13 1.37 2.77A3.5 3.5 0 0 0 6 17a3.5 3.5 0 0 0 5.3 3 3.5 3.5 0 0 0 1.7 1.7A3.5 3.5 0 0 0 18 17a3.5 3.5 0 0 0-.37-2.23A3.5 3.5 0 0 0 19 12a3.5 3.5 0 0 0-2.3-3.3A3.5 3.5 0 0 0 17 7a3.5 3.5 0 0 0-5-5z"/></>} />,
  sun:      (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.93 19.07 1.41-1.41"/><path d="m17.66 6.34 1.41-1.41"/></>} />,
  heart:    (p) => <Icon {...p} d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />,
  sunglasses: (p) => <Icon {...p} d={<><path d="M14 18a2 2 0 0 0-4 0"/><path d="m19 11-2.11-6.657a2 2 0 0 0-2.752-1.148l-1.276.61A2 2 0 0 1 12 4H8.5a2 2 0 0 0-1.925 1.456L5 11"/><path d="M2 11h20"/><circle cx="17" cy="18" r="3"/><circle cx="7" cy="18" r="3"/></>} />,
  suitcase:   (p) => <Icon {...p} d={<><path d="M8 16V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v12"/><rect x="4" y="6" width="16" height="10" rx="2"/></>} />,
};

// The Poppy brand mark — embedded raster of the watercolor poppy from poppy-icon.jpg
// (cropped tight on the flower for legibility at small sizes). The image is inlined
// as a base64 PNG so the PWA stays self-contained.
const POPPY_MARK_SRC = "data:image/png;base64,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";
function PoppyMark({ size = 24, color, className = "" }) {
  // `color` is accepted for backwards compatibility but ignored — the artwork is pre-colored.
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 128 128" className={className} aria-hidden="true">
      <image x="0" y="0" width="128" height="128" href={POPPY_MARK_SRC} preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}

const toTitle = s => s ? s.replace(/(?<!')\b\w/g, c => c.toUpperCase()) : s;

const CATEGORY_OPTIONS = ["top", "bottom", "dress", "outerwear", "shoes", "accessory"];
const SEASON_OPTIONS = ["spring", "summer", "fall", "winter"];
const OCCASION_OPTIONS = ["casual", "work", "weekend", "evening", "athletic", "loungewear", "formal"];
const STATUS_OPTIONS = ["planned", "owned", "donated"];

const STORAGE_KEYS = {
  items: "closet:items:v1",
  outfits: "closet:outfits:v1",
  customTags: "closet:custom_tags:v1",
  brands: "closet:brands:v1",
  collections: "closet:collections:v1",
  seeded: "closet:seeded:v1",
  imagesMigrated: "closet:images_migrated:v1", // set to true once legacy localStorage images have been moved to IDB
};

// Legacy localStorage key — only read once during one-time migration, then deleted
const LEGACY_IMAGES_KEY = "closet:images:v1";

const BACKUP_FORMAT = "wardrobe-backup-v1";

// --- localStorage helpers --------------------------------------------------
function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) {
    // Quota exceeded — surface a single alert
    if (!window.__quotaWarned) {
      window.__quotaWarned = true;
      alert("Storage is full. Phones limit a website to roughly 5MB. Try deleting some items or use smaller photos.");
    }
    console.error("localStorage set failed", e);
  }
}

// --- image helpers ---------------------------------------------------------
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Detect WebP encode support once. Some old WebViews don't support it; fall back to JPEG.
const SUPPORTS_WEBP = (() => {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    return c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch { return false; }
})();

// Resize and re-encode an image to a Blob. WebP by default (handles transparency
// at ~30–50% the size of JPEG/PNG); JPEG fallback for ancient browsers.
async function resizeImageToBlob(source, maxDim = 640, quality = 0.85) {
  // `source` may be a File, a Blob, or a data URL string.
  const srcUrl = typeof source === 'string' ? source : URL.createObjectURL(source);
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = srcUrl;
    });
    const longest = Math.max(img.width, img.height);
    const scale = longest > maxDim ? maxDim / longest : 1;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const type = SUPPORTS_WEBP ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    return blob; // may be null if encoding failed; callers handle that.
  } finally {
    if (typeof source !== 'string') URL.revokeObjectURL(srcUrl);
  }
}

// data URL <-> Blob conversion, for backup compatibility (backups stay JSON).
function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',');
  const mime = (meta.match(/data:([^;]+)/) || [, 'image/jpeg'])[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// --- IndexedDB image store -------------------------------------------------
// Single store keyed by item id, values are Blobs. No schema, no migrations
// beyond the one-time localStorage → IDB import below.
const IDB = (() => {
  const DB_NAME = 'wardrobe';
  const DB_VERSION = 1;
  const STORE = 'images';
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
      try { req = fn(store); }
      catch (e) { reject(e); return; }
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
      try { acc = fn(store); }
      catch (e) { reject(e); return; }
      tx.oncomplete = () => resolve(acc);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  return {
    get(id)         { return run('readonly',  s => s.get(id)); },
    put(id, blob)   { return run('readwrite', s => s.put(blob, id)); },
    delete(id)      { return run('readwrite', s => s.delete(id)); },
    keys()          { return run('readonly',  s => s.getAllKeys()); },
    entries() {
      return runCollect('readonly', (s) => {
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
      return runCollect('readwrite', (s) => {
        for (const [id, blob] of entries) s.put(blob, id);
        return entries.length;
      });
    },
    clear()         { return run('readwrite', s => s.clear()); },
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
    get(id) { return urls.get(id); },
    delete(id) {
      const url = urls.get(id);
      if (url) URL.revokeObjectURL(url);
      urls.delete(id);
    },
    snapshot() { return Object.fromEntries(urls); },
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

// One-time migration: legacy localStorage `closet:images:v1` (data URLs) → IDB blobs.
// Safe to call repeatedly; the migrated flag stops re-runs.
async function migrateLegacyImagesIfNeeded() {
  if (lsGet(STORAGE_KEYS.imagesMigrated, false)) return { migrated: 0 };
  const legacy = (() => {
    try {
      const v = localStorage.getItem(LEGACY_IMAGES_KEY);
      return v == null ? null : JSON.parse(v);
    } catch { return null; }
  })();
  if (!legacy || typeof legacy !== 'object') {
    lsSet(STORAGE_KEYS.imagesMigrated, true);
    return { migrated: 0 };
  }
  const entries = [];
  for (const [id, dataUrl] of Object.entries(legacy)) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) continue;
    try { entries.push([id, dataUrlToBlob(dataUrl)]); }
    catch (e) { console.error("legacy image decode failed for", id, e); }
  }
  let migrated = 0;
  if (entries.length) {
    try { migrated = await IDB.putMany(entries); }
    catch (e) { console.error("legacy migration write failed", e); }
  }
  // Free the ~1MB the legacy key occupies before marking migrated.
  try { localStorage.removeItem(LEGACY_IMAGES_KEY); } catch {}
  lsSet(STORAGE_KEYS.imagesMigrated, true);
  return { migrated };
}

// --- Backup / restore -----------------------------------------------------
// Backups remain a single portable JSON with data URLs inside (format unchanged),
// so backups written on the old build still restore, and backups written here
// restore anywhere. The on-device representation is blobs; we convert at the
// boundary.
async function exportBackup({ items, outfits, customTags, brands, collections }) {
  // Read blobs straight from IDB so we don't depend on what's currently in
  // React state (defensive: if the cache is partial for any reason).
  const blobs = await IDB.entries();
  const images = {};
  for (const [id, blob] of Object.entries(blobs)) {
    images[id] = await blobToDataUrl(blob);
  }
  const payload = {
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    counts: { items: items.length, outfits: outfits.length, collections: (collections || []).length },
    data: { items, images, outfits, customTags, brands: brands || [], collections: collections || [] },
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `poppy-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { sizeBytes: blob.size };
}

function validateBackup(parsed) {
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: "File is not a valid JSON object." };
  if (parsed.format !== BACKUP_FORMAT) {
    return { ok: false, error: `Unknown backup format${parsed.format ? `: "${parsed.format}"` : ""}. Expected "${BACKUP_FORMAT}".` };
  }
  const d = parsed.data;
  if (!d || typeof d !== 'object') return { ok: false, error: "Backup is missing its data section." };
  if (!Array.isArray(d.items)) return { ok: false, error: "Backup items are malformed." };
  if (!Array.isArray(d.outfits)) return { ok: false, error: "Backup outfits are malformed." };
  if (!Array.isArray(d.customTags)) return { ok: false, error: "Backup custom tags are malformed." };
  if (!d.images || typeof d.images !== 'object') return { ok: false, error: "Backup images are malformed." };
  // light per-item check
  for (const it of d.items) {
    if (!it.id || !it.name) return { ok: false, error: `An item is missing id or name (id: ${it.id || '?'}).` };
  }
  // collections and brands are optional for backward compatibility with older backups
  if (d.collections !== undefined && !Array.isArray(d.collections)) {
    return { ok: false, error: "Backup collections are malformed." };
  }
  if (d.brands !== undefined && !Array.isArray(d.brands)) {
    return { ok: false, error: "Backup brands are malformed." };
  }
  if (!d.collections) d.collections = [];
  if (!d.brands) d.brands = [];
  // Normalize items missing the new fields
  d.items = d.items.map(i => ({
    ...i,
    status: i.status || "owned",
    brand: i.brand === undefined ? "" : i.brand,
  }));
  return { ok: true, data: d };
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsText(file);
  });
}

// Merge: keep existing, add anything new (by id). Replace: throw away current.
// `current` no longer carries images — they live in IDB. `images` in the return
// value is what needs to be WRITTEN to IDB (always the incoming set; existing
// IDB blobs are left in place for merge, cleared first for replace).
function mergeBackup(current, incoming) {
  const itemMap = new Map(current.items.map(i => [i.id, i]));
  for (const it of incoming.items) if (!itemMap.has(it.id)) itemMap.set(it.id, it);
  const items = Array.from(itemMap.values());

  const images = incoming.images || {}; // data-URL map; caller writes these to IDB

  const outfitMap = new Map(current.outfits.map(o => [o.id, o]));
  for (const o of incoming.outfits) if (!outfitMap.has(o.id)) outfitMap.set(o.id, o);
  const outfits = Array.from(outfitMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const tagSet = new Set([...(current.customTags || []), ...(incoming.customTags || [])]);
  const customTags = Array.from(tagSet);

  // Brands: case-insensitive union, keeping the first-seen casing
  const brandLowerSeen = new Map();
  for (const b of [...(current.brands || []), ...(incoming.brands || [])]) {
    const key = b.toLowerCase();
    if (!brandLowerSeen.has(key)) brandLowerSeen.set(key, b);
  }
  const brands = Array.from(brandLowerSeen.values());

  const collectionMap = new Map((current.collections || []).map(c => [c.id, c]));
  for (const c of (incoming.collections || [])) {
    if (collectionMap.has(c.id)) {
      // merge item lists for collections with the same id
      const existing = collectionMap.get(c.id);
      const merged = Array.from(new Set([...existing.itemIds, ...c.itemIds]));
      collectionMap.set(c.id, { ...existing, itemIds: merged });
    } else {
      collectionMap.set(c.id, c);
    }
  }
  const collections = Array.from(collectionMap.values());

  return { items, images, outfits, customTags, brands, collections };
}

// --- UI primitives ---------------------------------------------------------
// Color tones — each pairs a vibrant "active" with a soft pastel "inactive".
// Six distinct hues plus the brand poppy red-orange, so categories read at a glance.
function Chip({ children, active, onClick, tone = "default" }) {
  const tones = {
    default:    active ? "bg-poppy-500 text-white border-poppy-500 shadow-pop"     : "bg-poppy-50 text-poppy-700 border-poppy-100",
    category:   active ? "bg-amber-500 text-white border-amber-500 shadow-pop"     : "bg-amber-50 text-amber-800 border-amber-100",
    season:     active ? "bg-leaf-500 text-white border-leaf-500 shadow-pop"       : "bg-leaf-50 text-leaf-700 border-leaf-100",
    occasion:   active ? "bg-petal-500 text-white border-petal-500 shadow-pop"     : "bg-petal-50 text-petal-700 border-petal-100",
    custom:     active ? "bg-plum-500 text-white border-plum-500 shadow-pop"       : "bg-plum-50 text-plum-700 border-plum-100",
    collection: active ? "bg-sky2-500 text-white border-sky2-500 shadow-pop"       : "bg-sky2-50 text-sky2-700 border-sky2-100",
    status:     active ? "bg-ink-500 text-white border-ink-500 shadow-pop" : "bg-ink-50 text-ink-700 border-ink-400",
    brand:      active ? "bg-petal-600 text-white border-petal-600 shadow-pop"     : "bg-petal-50 text-petal-700 border-petal-100",
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full transition-all active:scale-95 ${tones[tone]}`}
    >
      <span>{children}</span>
    </button>
  );
}

// A pill showing an active filter with an inline × to remove it.
function RemovableChip({ children, tone = "default", onRemove }) {
  const tones = {
    default:    "bg-poppy-500 text-white border-poppy-500",
    category:   "bg-amber-500 text-white border-amber-500",
    season:     "bg-leaf-500 text-white border-leaf-500",
    occasion:   "bg-petal-500 text-white border-petal-500",
    custom:     "bg-plum-500 text-white border-plum-500",
    collection: "bg-sky2-500 text-white border-sky2-500",
    status:     "bg-buttercup-500 text-white border-buttercup-500",
    brand:      "bg-petal-600 text-white border-petal-600",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full shadow-pop ${tones[tone]}`}>
      <span className="inline-flex items-center gap-1.5">{children}</span>
      <button
        onClick={onRemove}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/25 hover:bg-white/40 active:scale-90 transition-colors"
        aria-label="Remove filter"
      >
        <I.x size={10} />
      </button>
    </span>
  );
}

function SectionLabel({ children, count }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-2 h-2 rounded-full bg-poppy-500"></span>
      <h2 className="font-display font-bold text-xl text-ink-800">{children}</h2>
      {count !== undefined && (
        <span className="text-[11px] font-bold tracking-widest uppercase text-poppy-600 bg-poppy-50 px-2 py-0.5 rounded-full">{count}</span>
      )}
      <div className="flex-1 h-px bg-cream-200"></div>
    </div>
  );
}

// --- Drag-reorder hook -----------------------------------------------------
// Pointer-based reorder for a grid of items. Each item gets a ref attached via
// register(index, element); the drag handle on the card calls onHandlePointerDown.
// While dragging, hoverIndex updates as the pointer crosses other items.
// On pointer-up, onCommit(fromIndex, toIndex) fires (toIndex is where the item
// should land in the original list; if no movement, toIndex === fromIndex).
function useDragReorder(onCommit) {
  const itemRefs = useRef(new Map()); // index -> element
  const [dragIndex, setDragIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const grabOffsetRef = useRef({ x: 0, y: 0 }); // pointer offset from card top-left at grab time
  const startRectRef = useRef(null);             // card dimensions at grab time
  const lastPointerRef = useRef({ x: 0, y: 0 }); // current pointer (no state = no re-renders)
  const ghostRef = useRef(null);                  // attached to the ghost DOM node
  const pendingRef = useRef(null);                // pending drag before movement threshold

  const register = (index, el) => {
    if (el) itemRefs.current.set(index, el);
    else itemRefs.current.delete(index);
  };

  const findIndexAt = (clientX, clientY) => {
    for (const [idx, el] of itemRefs.current.entries()) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        return idx;
      }
    }
    return null;
  };

  useEffect(() => {
    if (dragIndex === null) return;
    const handleMove = (e) => {
      const x = e.clientX, y = e.clientY;
      lastPointerRef.current = { x, y };
      if (ghostRef.current) {
        const tx = x - grabOffsetRef.current.x;
        const ty = y - grabOffsetRef.current.y;
        ghostRef.current.style.transform = `translate(${tx}px, ${ty}px) rotate(1.5deg) scale(1.05)`;
      }
      const over = findIndexAt(x, y);
      if (over !== null) setHoverIndex(over);
      e.preventDefault();
    };
    const handleUp = () => {
      const from = dragIndex;
      const to = hoverIndex !== null ? hoverIndex : dragIndex;
      setDragIndex(null);
      setHoverIndex(null);
      if (onCommit && from !== null) onCommit(from, to);
    };
    const handleCancel = () => { setDragIndex(null); setHoverIndex(null); };
    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
    };
  }, [dragIndex, hoverIndex, onCommit]);

  const onHandlePointerDown = (index) => (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    const el = itemRefs.current.get(index);
    if (!el) return;
    const r = el.getBoundingClientRect();
    pendingRef.current = {
      index,
      startX: e.clientX,
      startY: e.clientY,
      grabOffset: { x: e.clientX - r.left, y: e.clientY - r.top },
      rect: { width: r.width },
    };

    const activate = (me) => {
      const p = pendingRef.current;
      if (!p) return;
      pendingRef.current = null;
      startRectRef.current = p.rect;
      grabOffsetRef.current = p.grabOffset;
      lastPointerRef.current = { x: me.clientX, y: me.clientY };
      setDragIndex(p.index);
      setHoverIndex(p.index);
    };

    const onPendingMove = (me) => {
      if (!pendingRef.current) return;
      const dx = me.clientX - pendingRef.current.startX;
      const dy = me.clientY - pendingRef.current.startY;
      if (Math.sqrt(dx * dx + dy * dy) > 8) {
        me.preventDefault();
        cleanup();
        activate(me);
      }
    };
    const onPendingEnd = () => { cleanup(); pendingRef.current = null; };
    const cleanup = () => {
      window.removeEventListener('pointermove', onPendingMove);
      window.removeEventListener('pointerup', onPendingEnd);
      window.removeEventListener('pointercancel', onPendingEnd);
    };
    window.addEventListener('pointermove', onPendingMove, { passive: false });
    window.addEventListener('pointerup', onPendingEnd);
    window.addEventListener('pointercancel', onPendingEnd);
  };

  return { register, dragIndex, hoverIndex, ghostRef, startRectRef, grabOffsetRef, lastPointerRef, onHandlePointerDown };
}

// --- Install prompt --------------------------------------------------------
function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
  );
  useEffect(() => {
    const onBeforeInstall = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const promptInstall = async () => {
    if (!deferred) return false;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') { setDeferred(null); return true; }
    return false;
  };
  return { canInstall: !!deferred && !installed, installed, promptInstall };
}

// --- Main App --------------------------------------------------------------
function ClosetApp() {
  const [view, setView] = useState("closet");
  const [items, setItems] = useState([]);
  const [images, setImages] = useState({});
  const [outfits, setOutfits] = useState([]);
  const [customTags, setCustomTags] = useState([]);
  const [brands, setBrands] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState(null); // outfit being edited (full object) or null
  const [builderOpen, setBuilderOpen] = useState(false);
  const [headerAction, setHeaderAction] = useState(null);
  const [activeCollection, setActiveCollection] = useState(null); // currently selected collection id (closet filter)
  const [scrollToOutfitId, setScrollToOutfitId] = useState(null);

  useEffect(() => { setHeaderAction(null); window.scrollTo(0, 0); }, [view]);
  const { canInstall, promptInstall } = useInstallPrompt();

  // Load — seed if first run, importing SEED_ITEMS + SEED_IMAGES from seed.js (loaded by index.html)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seeded = lsGet(STORAGE_KEYS.seeded, false);
      if (!seeded && typeof SEED_ITEMS !== 'undefined' && typeof SEED_IMAGES !== 'undefined') {
        const seedItems = SEED_ITEMS.map(i => ({ ...i, custom: [], status: "owned", brand: "" }));
        lsSet(STORAGE_KEYS.items, seedItems);
        // Seed images: convert each data URL to a Blob in IDB. Mark images as
        // already migrated so we don't try to migrate legacy localStorage data
        // on a fresh install.
        const seedEntries = [];
        for (const [id, dataUrl] of Object.entries(SEED_IMAGES)) {
          try { seedEntries.push([id, dataUrlToBlob(dataUrl)]); }
          catch (e) { console.error("seed image decode failed", id, e); }
        }
        if (seedEntries.length) {
          try { await IDB.putMany(seedEntries); }
          catch (e) { console.error("seed image batch write failed", e); }
        }
        lsSet(STORAGE_KEYS.outfits, []);
        lsSet(STORAGE_KEYS.customTags, []);
        lsSet(STORAGE_KEYS.brands, []);
        lsSet(STORAGE_KEYS.collections, []);
        lsSet(STORAGE_KEYS.imagesMigrated, true);
        lsSet(STORAGE_KEYS.seeded, true);
      } else {
        // One-time migration for existing installs: localStorage data URLs → IDB blobs.
        await migrateLegacyImagesIfNeeded();
      }

      // Migration: backfill status="owned" and brand="" on any existing items that pre-date these fields
      const rawItems = lsGet(STORAGE_KEYS.items, []);
      let migrated = false;
      const items2 = rawItems.map(i => {
        const next = { ...i };
        if (!next.status) { next.status = "owned"; migrated = true; }
        if (next.brand === undefined) { next.brand = ""; migrated = true; }
        return next;
      });
      if (migrated) lsSet(STORAGE_KEYS.items, items2);

      // Hydrate object URLs from IDB into the cache and state.
      const urlMap = await hydrateImages();

      if (cancelled) return;
      setItems(items2);
      setImages(urlMap);
      setOutfits(lsGet(STORAGE_KEYS.outfits, []));
      setCustomTags(lsGet(STORAGE_KEYS.customTags, []));
      setBrands(lsGet(STORAGE_KEYS.brands, []));
      setCollections(lsGet(STORAGE_KEYS.collections, []));
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const saveItems = (n) => { setItems(n); lsSet(STORAGE_KEYS.items, n); };
  const saveOutfits = (n) => { setOutfits(n); lsSet(STORAGE_KEYS.outfits, n); };
  const saveCustomTags = (n) => { setCustomTags(n); lsSet(STORAGE_KEYS.customTags, n); };
  const saveBrands = (n) => { setBrands(n); lsSet(STORAGE_KEYS.brands, n); };
  const saveCollections = (n) => { setCollections(n); lsSet(STORAGE_KEYS.collections, n); };

  // Image writes go to IDB; React state holds object URLs only.
  const putImage = async (id, blob) => {
    try {
      await IDB.put(id, blob);
      const url = ObjectUrlCache.set(id, blob); // revokes any old URL for this id
      setImages(prev => ({ ...prev, [id]: url }));
    } catch (e) {
      console.error("putImage failed", id, e);
      if (!window.__quotaWarned) {
        window.__quotaWarned = true;
        alert("Couldn't save that image. You may be out of device storage.");
      }
    }
  };
  const deleteImage = async (id) => {
    try { await IDB.delete(id); } catch (e) { console.error("deleteImage failed", id, e); }
    ObjectUrlCache.delete(id);
    setImages(prev => { const n = { ...prev }; delete n[id]; return n; });
  };
  // For import: write a batch of {id: dataUrl} into IDB, optionally clearing first.
  const replaceAllImages = async (dataUrlMap, { clearFirst = false } = {}) => {
    if (clearFirst) {
      try {
        const existingIds = await IDB.keys();
        for (const id of existingIds) ObjectUrlCache.delete(id);
        await IDB.clear();
      } catch (e) { console.error("clear IDB failed", e); }
    }
    const entries = [];
    for (const [id, dataUrl] of Object.entries(dataUrlMap || {})) {
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) continue;
      try { entries.push([id, dataUrlToBlob(dataUrl)]); }
      catch (e) { console.error("import image decode failed", id, e); }
    }
    if (entries.length) {
      try { await IDB.putMany(entries); }
      catch (e) { console.error("import batch write failed", e); }
    }
    // Refresh object URL cache from the written blobs.
    for (const [id, blob] of entries) ObjectUrlCache.set(id, blob);
    setImages(ObjectUrlCache.snapshot());
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-full bg-poppy-500 flex items-center justify-center bloom shadow-poppy">
          <PoppyMark size={28} color="#FFFBF6" />
        </div>
        <div className="text-ink-500 text-xs font-bold tracking-[0.2em] uppercase">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 text-ink-900 pb-24 poppy-wash">
      {/* HEADER */}
      <header className="bg-white/95 backdrop-blur border-b border-cream-100 z-30 sticky top-0 shadow-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-poppy-500 flex items-center justify-center shadow-poppy">
              <PoppyMark size={22} color="#FFFBF6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-ink-900 leading-none">Poppy</h1>
              <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-poppy-600 hidden sm:inline">Wardrobe curation</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canInstall && (
              <button
                onClick={promptInstall}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-poppy-500 text-white text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-poppy"
              >
                <I.install size={12} /> Install
              </button>
            )}
            {headerAction && (
              <button
                onClick={headerAction.onClick}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-white text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop ${
                  headerAction.tone === 'petal' ? 'bg-petal-500' :
                  headerAction.tone === 'sky2' ? 'bg-sky2-500' :
                  'bg-poppy-500'
                }`}
              >
                <I.plus size={12} /> {headerAction.label}
              </button>
            )}
            <button
              onClick={() => setShowBackup(true)}
              aria-label="Backup and restore"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-cream-50 border-2 border-cream-100 text-ink-700 text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95"
            >
              <I.archive size={12} />
              <span className="hidden sm:inline">Save</span>
            </button>
          </div>
        </div>
      </header>

      {view === "closet" && (
        <ClosetView
          items={items} images={images} customTags={customTags} brands={brands} collections={collections} outfits={outfits}
          activeCollection={activeCollection} onSetActiveCollection={setActiveCollection}
          onSaveItems={saveItems} onPutImage={putImage} onDeleteImage={deleteImage} onSaveCustomTags={saveCustomTags} onSaveBrands={saveBrands} onSaveCollections={saveCollections} onSaveOutfits={saveOutfits}
          onSetHeaderAction={setHeaderAction}
        />
      )}
      {view === "collections" && (
        <CollectionsView
          collections={collections} items={items} images={images} outfits={outfits}
          onSave={saveCollections}
          onViewCollection={(id) => { setActiveCollection(id); setView("closet"); }}
          onOpenOutfit={(id) => { setScrollToOutfitId(id); setView("outfits"); }}
          onSetHeaderAction={setHeaderAction}
        />
      )}
      {view === "outfits" && (
        <OutfitsView
          outfits={outfits} items={items} images={images}
          onSave={saveOutfits}
          onPutImage={putImage} onDeleteImage={deleteImage}
          onNewOutfit={() => { setEditingOutfit(null); setBuilderOpen(true); }}
          onEditOutfit={(o) => { setEditingOutfit(o); setBuilderOpen(true); }}
          scrollToId={scrollToOutfitId}
          onScrolled={() => setScrollToOutfitId(null)}
          onSetHeaderAction={setHeaderAction}
        />
      )}
      {builderOpen && (
        <BuilderView
          items={items} images={images} collections={collections}
          outfit={editingOutfit}
          onSaveOutfit={(o) => {
            if (editingOutfit) {
              const next = outfits.map(x => x.id === o.id ? { ...o, updatedAt: Date.now() } : x);
              saveOutfits(next);
            } else {
              const next = [{ ...o, id: `o_${Date.now()}`, createdAt: Date.now() }, ...outfits];
              saveOutfits(next);
            }
            setEditingOutfit(null);
            setBuilderOpen(false);
          }}
          onCancel={() => { setEditingOutfit(null); setBuilderOpen(false); }}
        />
      )}

      {/* BOTTOM NAV — mobile-first, Poppy-style: chunky, colorful, with a soft pill on the active tab */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-cream-100 shadow-card-hi" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-3 px-3 pt-2 pb-1">
          <BottomTab IconC={I.shirt}  label="Closet"      tone="poppy"  active={view === "closet"}      onClick={() => setView("closet")} />
          <BottomTab IconC={I.sunglasses} label="Looks"       tone="petal"  active={view === "outfits"}     onClick={() => setView("outfits")} />
          <BottomTab IconC={I.suitcase}   label="Collections" tone="sky2"   active={view === "collections"} onClick={() => setView("collections")} />
        </div>
      </nav>

      {showBackup && (
        <BackupModal
          items={items}
          images={images}
          outfits={outfits}
          customTags={customTags}
          brands={brands}
          collections={collections}
          onClose={() => setShowBackup(false)}
          onImport={async (next, strategy) => {
            saveItems(next.items);
            saveOutfits(next.outfits);
            saveCustomTags(next.customTags);
            if (next.brands) saveBrands(next.brands);
            if (next.collections) saveCollections(next.collections);
            await replaceAllImages(next.images, { clearFirst: strategy === 'replace' });
          }}
        />
      )}
    </div>
  );
}

function BottomTab({ IconC, label, active, onClick, count, tone = "poppy" }) {
  // Each tab has its own accent color, so the bar reads as a colorful row
  const toneMap = {
    poppy: { bg: "bg-poppy-50",  text: "text-poppy-600",  pill: "bg-poppy-500" },
    petal: { bg: "bg-petal-50",  text: "text-petal-600",  pill: "bg-petal-500" },
    sky2:  { bg: "bg-sky2-50",   text: "text-sky2-600",   pill: "bg-sky2-500" },
  };
  const t = toneMap[tone] || toneMap.poppy;
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl transition-all ${active ? t.bg : "bg-transparent"} active:scale-95`}
    >
      <div className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-colors ${active ? `${t.pill} text-white shadow-pop` : "text-ink-400"}`}>
        <IconC size={20} stroke={active ? 2.4 : 2} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-poppy-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none border-2 border-white">{count}</span>
        )}
      </div>
      <span className={`text-[10px] font-bold tracking-[0.1em] uppercase ${active ? t.text : "text-ink-400"}`}>{label}</span>
    </button>
  );
}

// --- CLOSET VIEW ----------------------------------------------------------
function ClosetView({ items, images, customTags, brands, collections, outfits, activeCollection, onSetActiveCollection, onSaveItems, onPutImage, onDeleteImage, onSaveCustomTags, onSaveBrands, onSaveCollections, onSaveOutfits, onSetHeaderAction }) {
  const [activeCategories, setActiveCategories] = useState([]);
  const [activeSeasons, setActiveSeasons] = useState([]);
  const [activeOccasions, setActiveOccasions] = useState([]);
  const [activeCustom, setActiveCustom] = useState([]);
  const [activeStatuses, setActiveStatuses] = useState(["owned"]);
  const [activeBrands, setActiveBrands] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const addButtonRef = useRef(null);
  useEffect(() => {
    const el = addButtonRef.current;
    if (!el || !onSetHeaderAction) return;
    const obs = new IntersectionObserver(
      ([entry]) => onSetHeaderAction(entry.isIntersecting ? null : { label: "Add a Piece", tone: "poppy", onClick: () => setAdding(true) }),
      { threshold: 0.5, rootMargin: "-68px 0px 0px 0px" }
    );
    obs.observe(el);
    return () => { obs.disconnect(); onSetHeaderAction(null); };
  }, []);
  const [viewing, setViewing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkSheet, setBulkSheet] = useState(null); // "tags" | "collections" | "outfits"
  const setActiveCollection = onSetActiveCollection;

  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); setBulkSheet(null); };
  const toggleItemSelect = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
    if (next.size === 0) { setSelectMode(false); setBulkSheet(null); }
    else setSelectMode(true);
  };

  const activeCollectionObj = activeCollection ? collections.find(c => c.id === activeCollection) : null;

  const filtered = useMemo(() => items.filter(it => {
    if (activeCollectionObj && !activeCollectionObj.itemIds.includes(it.id)) return false;
    if (activeStatuses.length && !activeStatuses.includes(it.status || "owned")) return false;
    if (activeBrands.length && !activeBrands.includes(it.brand || "")) return false;
    if (activeCategories.length && !activeCategories.includes(it.category)) return false;
    if (activeSeasons.length && !activeSeasons.every(s => it.seasons?.includes(s))) return false;
    if (activeOccasions.length && !activeOccasions.every(o => it.occasions?.includes(o))) return false;
    if (activeCustom.length && !activeCustom.every(t => it.custom?.includes(t))) return false;
    if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, activeCollectionObj, activeStatuses, activeBrands, activeCategories, activeSeasons, activeOccasions, activeCustom, search]);

  const selectAll = () => setSelectedIds(new Set(filtered.map(i => i.id)));

  const handleAddItem = async (file) => {
    if (!file) return;
    const blob = await resizeImageToBlob(file, 640, 0.85);
    const id = `i_${Date.now()}`;
    const newItem = {
      id,
      name: file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "New Item",
      category: "top",
      seasons: [],
      occasions: [],
      custom: [],
      status: "owned",
      brand: "",
    };
    onSaveItems([newItem, ...items]);
    if (blob) await onPutImage(id, blob);
    setAdding(false);
    setEditing(id);
  };

  const handleDelete = (id) => {
    onSaveItems(items.filter(i => i.id !== id));
    onDeleteImage(id);
    // Remove the deleted item from any collection it belongs to
    onSaveCollections((collections || []).map(c => ({ ...c, itemIds: c.itemIds.filter(x => x !== id) })));
    if (editing === id) setEditing(null);
  };

  const handleUpdate = (updated) => onSaveItems(items.map(i => i.id === updated.id ? updated : i));

  // Reorder within the visible filtered list. fromVisible/toVisible are indices into `filtered`.
  // We translate them into master-array positions, preserving the position of filtered-out items.
  const handleReorder = (fromVisible, toVisible) => {
    if (fromVisible === toVisible) return;
    const visibleIds = filtered.map(i => i.id);
    const movingId = visibleIds[fromVisible];
    if (!movingId) return;

    // Step 1: figure out where the moving id should land in the master array.
    // We want it positioned just before the item currently at `toVisible` in the visible list,
    // unless we're moving down past it — in which case, after it.
    const targetVisibleId = visibleIds[toVisible];
    const masterFromIndex = items.findIndex(i => i.id === movingId);

    // Remove the moving item from the master array first
    const without = items.filter(i => i.id !== movingId);

    // Find target's index in the new (without) array
    let masterToIndex;
    if (!targetVisibleId || targetVisibleId === movingId) {
      // Should not normally happen, but fall back to original position
      masterToIndex = masterFromIndex;
    } else {
      const targetIndexInWithout = without.findIndex(i => i.id === targetVisibleId);
      // If we moved DOWN (fromVisible < toVisible), the item should appear AFTER the target.
      // If we moved UP, it should appear BEFORE.
      masterToIndex = fromVisible < toVisible ? targetIndexInWithout + 1 : targetIndexInWithout;
    }

    const next = [...without];
    next.splice(masterToIndex, 0, items[masterFromIndex]);
    onSaveItems(next);
  };

  const { register, dragIndex, hoverIndex, ghostRef, startRectRef, grabOffsetRef, lastPointerRef, onHandlePointerDown } = useDragReorder(handleReorder);

  const counts = useMemo(() => ({
    total: items.length,
    tops: items.filter(i => i.category === "top").length,
    bottoms: items.filter(i => i.category === "bottom").length,
  }), [items]);

  const filterCount =
    activeCategories.length
    + activeSeasons.length
    + activeOccasions.length
    + activeCustom.length
    + (activeCollection ? 1 : 0)
    + (activeStatuses.length === 1 && activeStatuses[0] === "owned" ? 0 : 1)
    + activeBrands.length;

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="fade-up">
      <div className="mb-6 sm:mb-10">
        {/* <div className="inline-flex items-center gap-2 px-3 py-1 bg-poppy-50 rounded-full mb-3">
          <I.flower size={12} className="text-poppy-500" />
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-poppy-700">Your Closet</p>
        </div> */}
        <h2 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900 mb-2">Your closet,</h2>
        <div className="mb-6 sm:mb-10 flex items-end justify-between gap-4">
        <h3 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900"><em className="text-poppy-600">at a glance.</em></h3>
        {!selectMode && <button
            ref={addButtonRef}
            onClick={() => setAdding(true)}
            style={{flexShrink: 0}}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-poppy-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-poppy"
          >
            <I.plus size={16} /> Add a Piece
          </button>}
        </div>
        <p className="mt-3 sm:mt-4 text-ink-600 text-sm sm:text-base max-w-xl">
          <span className="font-bold text-ink-800">{counts.total}</span> pieces · <span className="font-bold text-ink-800">{counts.tops}</span> tops · <span className="font-bold text-ink-800">{counts.bottoms}</span> bottoms
        </p>
      </div>

      {activeCollectionObj && activeCollectionObj.description && (
        <p className="text-sm italic text-ink-500 mb-4">"{activeCollectionObj.description}"</p>
      )}

      {/* Add button / select mode bar */}
      <div className="mb-3">
        {selectMode  && (
          <div className="flex items-center gap-3 py-1 bg-poppy-50 px-4 py-2.5 rounded-full">
            <span className="text-sm font-bold text-poppy-700">{selectedIds.size} selected</span>
            <button onClick={selectAll} className="text-[10px] font-bold tracking-[0.15em] uppercase text-poppy-600 underline active:text-poppy-700">All</button>
            <button onClick={exitSelectMode} className="text-[10px] font-bold tracking-[0.15em] uppercase text-poppy-600 underline active:text-poppy-700">None</button>
          </div>
        ) }
      </div>

      {/* Search + filter toggle */}
      <div className="mb-4 flex gap-2">
        {/* <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-cream-100 rounded-full min-w-0 shadow-card">
          <I.search size={15} className="text-poppy-500 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search your closet…"
            className="flex-1 bg-transparent outline-none text-sm placeholder-ink-400 min-w-0 font-medium"
          />
        </div> */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`relative px-4 py-2.5 border-2 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase active:scale-95 shrink-0 transition-colors ${filterCount > 0 ? "bg-poppy-500 text-white border-poppy-500 shadow-pop" : "bg-white border-cream-100 text-ink-700"}`}
        >
          Filters{filterCount > 0 && ` · ${filterCount}`}
        </button>
      </div>

      {/* Collapsible filters */}
      {showFilters && (
        <div className="mb-6 p-4 sm:p-5 bg-white border-2 border-cream-100 rounded-3xl fade-up shadow-card">
          <FilterRow label="Status">
            {STATUS_OPTIONS.map(s => (
              <Chip key={s} tone="status" active={activeStatuses.includes(s)} onClick={() => toggle(activeStatuses, setActiveStatuses, s)}>{s}</Chip>
            ))}
          </FilterRow>
          {collections.length > 0 && (
            <FilterRow label="Collection">
              <Chip tone="collection" active={activeCollection === null} onClick={() => setActiveCollection(null)}>Entire Closet</Chip>
              {collections.map(c => (
                <Chip key={c.id} tone="collection" active={activeCollection === c.id} onClick={() => setActiveCollection(activeCollection === c.id ? null : c.id)}>
                  {toTitle(c.name)}
                </Chip>
              ))}
            </FilterRow>
          )}
          <FilterRow label="Category">
            {CATEGORY_OPTIONS.map(c => (
              <Chip key={c} tone="category" active={activeCategories.includes(c)} onClick={() => toggle(activeCategories, setActiveCategories, c)}>{c}</Chip>
            ))}
          </FilterRow>
          <FilterRow label="Season">
            {SEASON_OPTIONS.map(s => (
              <Chip key={s} tone="season" active={activeSeasons.includes(s)} onClick={() => toggle(activeSeasons, setActiveSeasons, s)}>{s}</Chip>
            ))}
          </FilterRow>
          <FilterRow label="Occasion">
            {OCCASION_OPTIONS.map(o => (
              <Chip key={o} tone="occasion" active={activeOccasions.includes(o)} onClick={() => toggle(activeOccasions, setActiveOccasions, o)}>{o}</Chip>
            ))}
          </FilterRow>
          {brands.length > 0 && (
            <FilterRow label="Brand">
              {brands.map(b => (
                <Chip key={b} tone="brand" active={activeBrands.includes(b)} onClick={() => toggle(activeBrands, setActiveBrands, b)}>{b}</Chip>
              ))}
            </FilterRow>
          )}
          {customTags.length > 0 && (
            <FilterRow label="Custom">
              {customTags.map(t => (
                <Chip key={t} tone="custom" active={activeCustom.includes(t)} onClick={() => toggle(activeCustom, setActiveCustom, t)}>{t}</Chip>
              ))}
            </FilterRow>
          )}
          {filterCount > 0 && (
            <button
              onClick={() => { setActiveCategories([]); setActiveSeasons([]); setActiveOccasions([]); setActiveCustom([]); setActiveCollection(null); setActiveStatuses(["owned"]); setActiveBrands([]); }}
              className="mt-2 text-[10px] tracking-[0.2em] uppercase text-ink-500 underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Active filters summary — shown when the drawer is closed */}
      {!showFilters && filterCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeCollection && activeCollectionObj && (
            <RemovableChip tone="collection" onRemove={() => setActiveCollection(null)}>
              <I.folder size={11} /> {toTitle(activeCollectionObj.name)}
            </RemovableChip>
          )}
          {!(activeStatuses.length === 1 && activeStatuses[0] === "owned") && (
            activeStatuses.length === 0
              ? <RemovableChip tone="status" onRemove={() => setActiveStatuses(["owned"])}>All statuses</RemovableChip>
              : activeStatuses.map(s => (
                  <RemovableChip key={`st-${s}`} tone="status" onRemove={() => toggle(activeStatuses, setActiveStatuses, s)}>{s}</RemovableChip>
                ))
          )}
          {activeBrands.map(b => (
            <RemovableChip key={`b-${b}`} tone="brand" onRemove={() => toggle(activeBrands, setActiveBrands, b)}>
              {b}
            </RemovableChip>
          ))}
          {activeCategories.map(c => (
            <RemovableChip key={`cat-${c}`} tone="category" onRemove={() => toggle(activeCategories, setActiveCategories, c)}>
              {c}
            </RemovableChip>
          ))}
          {activeSeasons.map(s => (
            <RemovableChip key={`s-${s}`} tone="season" onRemove={() => toggle(activeSeasons, setActiveSeasons, s)}>
              {s}
            </RemovableChip>
          ))}
          {activeOccasions.map(o => (
            <RemovableChip key={`o-${o}`} tone="occasion" onRemove={() => toggle(activeOccasions, setActiveOccasions, o)}>
              {o}
            </RemovableChip>
          ))}
          {activeCustom.map(t => (
            <RemovableChip key={`c-${t}`} tone="custom" onRemove={() => toggle(activeCustom, setActiveCustom, t)}>
              {t}
            </RemovableChip>
          ))}
          <button
            onClick={() => { setActiveCategories([]); setActiveSeasons([]); setActiveOccasions([]); setActiveCustom([]); setActiveCollection(null); setActiveStatuses(["owned"]); setActiveBrands([]); }}
            className="text-[10px] tracking-[0.2em] uppercase text-ink-500 underline active:text-poppy-600 ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex-1 h-px bg-cream-200 mb-3"></div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-cream-200 bg-cream-50/50 rounded-3xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-poppy-100 flex items-center justify-center">
            <I.search size={26} className="text-poppy-500" />
          </div>
          <p className="font-display font-bold text-xl text-ink-900">Nothing matches.</p>
          <p className="text-xs font-bold tracking-widest uppercase text-poppy-600 mt-2">Try clearing a filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {filtered.map((item, i) => (
            <ItemCard
              key={item.id}
              item={item}
              image={images[item.id]}
              onClick={() => setViewing(item.id)}
              onSelectToggle={() => toggleItemSelect(item.id)}
              isSelected={selectedIds.has(item.id)}
              delay={i * 40}
              cardRef={(el) => register(i, el)}
              reorderHandle={selectMode ? null : onHandlePointerDown(i)}
              isDragging={!selectMode && dragIndex === i}
              isDropTarget={!selectMode && dragIndex !== null && hoverIndex === i && dragIndex !== i}
            />
          ))}
        </div>
      )}

      </div>
      </main>

      {dragIndex !== null && filtered[dragIndex] && (() => {
        const item = filtered[dragIndex];
        const image = images[item.id];
        const tx = lastPointerRef.current.x - grabOffsetRef.current.x;
        const ty = lastPointerRef.current.y - grabOffsetRef.current.y;
        return (
          <div
            ref={(el) => {
              ghostRef.current = el;
              if (el) el.style.transform = `translate(${tx}px, ${ty}px) rotate(1.5deg) scale(1.05)`;
            }}
            className="pointer-events-none fixed left-0 top-0 z-50 bg-white border-2 border-poppy-300 rounded-3xl overflow-hidden"
            style={{ width: startRectRef.current?.width, willChange: 'transform', boxShadow: '0 22px 60px rgba(255, 90, 54, 0.35)' }}
          >
            <div className="aspect-[3/4] bg-gradient-to-br from-cream-100 to-poppy-100 flex items-center justify-center overflow-hidden">
              {image ? <img src={image} alt={item.name} className="w-full h-full object-contain p-2 sm:p-3" /> : <I.shirt size={32} className="text-poppy-300" />}
            </div>
            <div className="p-3">
              <p className="font-display font-semibold text-sm sm:text-base leading-tight truncate text-ink-900">{toTitle(item.name)}</p>
              <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase text-poppy-600 mt-0.5">{item.category}</p>
            </div>
          </div>
        );
      })()}

      {viewing && !editing && (
        <ViewDrawer
          item={items.find(i => i.id === viewing)}
          image={images[viewing]}
          collections={collections}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); }}
        />
      )}

      {editing && (
        <EditDrawer
          item={items.find(i => i.id === editing)}
          image={images[editing]}
          customTags={customTags}
          brands={brands}
          collections={collections}
          onCustomTagsChange={onSaveCustomTags}
          onBrandsChange={onSaveBrands}
          onCollectionsChange={onSaveCollections}
          onReplaceImage={(id, blob) => onPutImage(id, blob)}
          onClose={() => { setEditing(null); setViewing(null); }}
          onSave={(u) => { handleUpdate(u); setEditing(null); }}
          onDelete={() => { handleDelete(editing); setViewing(null); }}
        />
      )}
      {adding && <AddItemModal onClose={() => setAdding(false)} onFile={handleAddItem} />}

      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t-2 border-cream-100 shadow-card-hi" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
            <span className="text-sm font-bold text-poppy-700 mr-auto">{selectedIds.size} selected</span>
            <button onClick={() => setBulkSheet("tags")} className="px-3.5 py-2 bg-plum-50 text-plum-700 text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 active:bg-plum-100">Tags</button>
            <button onClick={() => setBulkSheet("outfits")} className="px-3.5 py-2 bg-petal-50 text-petal-700 text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 active:bg-petal-100">Looks</button>
            <button onClick={() => setBulkSheet("collections")} className="px-3.5 py-2 bg-sky2-50 text-sky2-700 text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 active:bg-sky2-100">Collections</button>
          </div>
        </div>
      )}

      {bulkSheet && (
        <BulkSheet
          type={bulkSheet}
          selectedIds={selectedIds}
          items={items}
          customTags={customTags}
          collections={collections}
          outfits={outfits}
          onSaveItems={onSaveItems}
          onSaveCustomTags={onSaveCustomTags}
          onSaveCollections={onSaveCollections}
          onSaveOutfits={onSaveOutfits}
          onClose={() => setBulkSheet(null)}
        />
      )}
    </>
  );
}

function FilterRow({ label, children }) {
  return (
    <div className="py-2">
      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ItemCard({ item, image, onClick, onSelectToggle, delay = 0, reorderHandle, isDragging, isDropTarget, cardRef, isSelected }) {
  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={`item-card cursor-pointer fade-up bg-white border-2 rounded-3xl overflow-hidden active:scale-[0.98] relative transition-all shadow-card ${isDragging ? "opacity-0" : isDropTarget ? "border-poppy-500 ring-4 ring-poppy-500/25" : isSelected ? "border-poppy-500 ring-4 ring-poppy-500/25" : "border-cream-100"}`}
      style={{ animationDelay: `${delay}ms`, ...(isDragging && { animation: 'none', opacity: 0 }) }}
    >
      <div className="aspect-[3/4] flex items-center justify-center overflow-hidden relative">
        {image ? (
          <img src={image} alt={item.name} className="w-full h-full object-contain p-2 sm:p-3" />
        ) : (
          <I.shirt size={32} className="text-poppy-300" />
        )}
        {reorderHandle && (
          <button
            onPointerDown={reorderHandle}
            onClick={(e) => { e.stopPropagation(); }}
            aria-label="Drag to reorder"
            className="absolute top-1.5 left-1.5 p-1.5 bg-white/95 backdrop-blur rounded-full text-ink-600 cursor-grab active:cursor-grabbing shadow-card"
            style={{ touchAction: 'none' }}
          >
            <I.grip size={14} />
          </button>
        )}
        {onSelectToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelectToggle(); }}
            aria-label={isSelected ? "Deselect item" : "Select item"}
            className={`absolute top-1.5 right-1.5 rounded-full w-6 h-6 flex items-center justify-center transition-colors shadow-card ${isSelected ? "bg-poppy-500 text-white" : "bg-white/95 backdrop-blur text-ink-300 border border-cream-200"}`}
          >
            <I.check size={12} />
          </button>
        )}
      </div>
      <div className="p-3 border-t-2 border-cream-100">
        <p className="font-display font-semibold text-sm sm:text-base leading-tight truncate text-ink-900">{toTitle(item.name)}</p>
        <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase text-poppy-600 mt-0.5">{item.category}</p>
      </div>
    </div>
  );
}

// --- VIEW DRAWER (read-only details) --------------------------------------
function ViewDrawer({ item, image, collections, onClose, onEdit }) {
  useBodyScrollLock();
  if (!item) return null;
  const inCollections = (collections || []).filter(c => c.itemIds.includes(item.id));

  return (
    <div className="fixed inset-0 z-50 flex sm:justify-end">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full sm:max-w-md bg-white h-full overflow-y-auto shadow-2xl fade-up" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="p-4 sm:p-6 border-b border-cream-100 flex items-center justify-between bg-white">
          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500">Details</p>
          <button onClick={onClose} className="text-ink-500 p-2 -m-2" aria-label="Close"><I.x size={20} /></button>
        </div>

        <div className="px-4 sm:px-6 pt-6 pb-4 flex flex-col items-center">
          <div className="w-full max-w-xs aspect-[3/4] bg-gradient-to-br from-cream-100 to-poppy-100 rounded-2xl overflow-hidden flex items-center justify-center">
            {image
              ? <img src={image} alt={item.name} className="w-full h-full object-contain p-4" />
              : <I.shirt size={48} className="text-ink-400" />
            }
          </div>
          <h3 className="font-display text-3xl mt-5 text-center">{toTitle(item.name)}</h3>
          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mt-1">{item.category}</p>
        </div>

        <div className="px-4 sm:px-6 pb-6 space-y-5">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full bg-buttercup-500 text-white border-buttercup-500 shadow-pop">
                {item.status || "owned"}
              </span>
            </div>
          </div>

          {item.brand && (
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Brand</p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full bg-petal-600 text-white border-petal-600 shadow-pop">{item.brand}</span>
              </div>
            </div>
          )}

          {(item.seasons && item.seasons.length > 0) && (
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Seasons</p>
              <div className="flex flex-wrap gap-2">
                {item.seasons.map(s => (
                  <span key={s} className="inline-flex items-center px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full bg-leaf-500 text-white border-leaf-500 shadow-pop">{s}</span>
                ))}
              </div>
            </div>
          )}

          {(item.occasions && item.occasions.length > 0) && (
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Occasions</p>
              <div className="flex flex-wrap gap-2">
                {item.occasions.map(o => (
                  <span key={o} className="inline-flex items-center px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full bg-petal-500 text-white border-petal-500 shadow-pop">{o}</span>
                ))}
              </div>
            </div>
          )}

          {(item.custom && item.custom.length > 0) && (
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {item.custom.map(t => (
                  <span key={t} className="inline-flex items-center px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full bg-plum-500 text-white border-plum-500 shadow-pop">{t}</span>
                ))}
              </div>
            </div>
          )}

          {inCollections.length > 0 && (
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">In Collections</p>
              <div className="flex flex-wrap gap-2">
                {inCollections.map(c => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full bg-sky2-500 text-white border-sky2-500 shadow-pop">
                    <I.folder size={11} /> {toTitle(c.name)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* No tags at all? friendly hint */}
          {((!item.seasons || item.seasons.length === 0) &&
            (!item.occasions || item.occasions.length === 0) &&
            (!item.custom || item.custom.length === 0) &&
            inCollections.length === 0) && (
            <p className="text-sm italic text-ink-500 text-center">No tags or collections yet — tap Edit to add some.</p>
          )}

          <button
            onClick={onEdit}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 bg-poppy-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-poppy"
          >
            <I.pencil size={14} /> Edit Piece
          </button>
        </div>
      </div>
    </div>
  );
}

// --- EDIT DRAWER ----------------------------------------------------------
function EditDrawer({ item, image, customTags, brands, collections, onCustomTagsChange, onBrandsChange, onCollectionsChange, onReplaceImage, onClose, onSave, onDelete }) {
  useBodyScrollLock();
  const [draft, setDraft] = useState(item);
  const [newTag, setNewTag] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const imageInputRef = useRef();
  const [replacing, setReplacing] = useState(false);

  if (!item) return null;
  const toggle = (key, v) => {
    const cur = draft[key] || [];
    setDraft({ ...draft, [key]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] });
  };
  const addCustom = () => {
    const t = newTag.trim().toLowerCase();
    if (!t) return;
    if (!customTags.includes(t)) onCustomTagsChange([...customTags, t]);
    const cur = draft.custom || [];
    if (!cur.includes(t)) setDraft({ ...draft, custom: [...cur, t] });
    setNewTag("");
  };
  const addBrand = () => {
    const b = newBrand.trim();
    if (!b) return;
    // Brands are case-preserved but uniqued case-insensitively
    const existing = (brands || []).find(x => x.toLowerCase() === b.toLowerCase());
    const canonical = existing || b;
    if (!existing && onBrandsChange) onBrandsChange([...(brands || []), canonical]);
    setDraft({ ...draft, brand: canonical });
    setNewBrand("");
  };
  const pickExistingBrand = (b) => {
    setDraft({ ...draft, brand: draft.brand === b ? "" : b });
  };
  const toggleCollection = (collectionId) => {
    const next = (collections || []).map(c => {
      if (c.id !== collectionId) return c;
      const inIt = c.itemIds.includes(item.id);
      return { ...c, itemIds: inIt ? c.itemIds.filter(x => x !== item.id) : [...c.itemIds, item.id] };
    });
    onCollectionsChange(next);
  };
  const handleReplaceImage = async (file) => {
    if (!file) return;
    setReplacing(true);
    try {
      const blob = await resizeImageToBlob(file, 640, 0.85);
      if (blob) await onReplaceImage(item.id, blob);
    } catch (e) {
      console.error("replace image failed", e);
    } finally {
      setReplacing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex sm:justify-end">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full sm:max-w-md bg-white h-full overflow-y-auto shadow-2xl fade-up" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="p-4 sm:p-6 border-b border-cream-100 flex items-center justify-between bg-white">
          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500">Editing</p>
          <button onClick={onClose} className="text-ink-500 p-2 -m-2"><I.x size={20} /></button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-xs aspect-[3/4] bg-gradient-to-br from-cream-100 to-poppy-100 rounded-2xl overflow-hidden mb-3 flex items-center justify-center">
              {image && <img src={image} alt={draft.name} className="w-full h-full object-contain p-4" />}
              {replacing && (
                <div className="absolute inset-0 bg-white/85 flex items-center justify-center text-[10px] tracking-[0.3em] uppercase text-ink-600">
                  Updating photo…
                </div>
              )}
            </div>
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={replacing}
              className="w-full max-w-xs mb-6 flex items-center justify-center gap-2 py-2.5 bg-cream-50 border-2 border-cream-100 text-ink-700 text-[10px] font-bold tracking-[0.2em] uppercase rounded-full active:scale-95 disabled:opacity-40"
            >
              <I.upload size={12} /> Replace Photo
            </button>
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => { handleReplaceImage(e.target.files?.[0]); e.target.value = ""; }}
            className="hidden"
          />

          <label className="block text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-1">Name</label>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="w-full bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none font-display text-xl py-1 mb-6"
          />

          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Category</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORY_OPTIONS.map(c => (
              <Chip key={c} tone="category" active={draft.category === c} onClick={() => setDraft({ ...draft, category: c })}>{c}</Chip>
            ))}
          </div>

          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Status</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {STATUS_OPTIONS.map(s => (
              <Chip key={s} tone="status" active={(draft.status || "owned") === s} onClick={() => setDraft({ ...draft, status: s })}>{s}</Chip>
            ))}
          </div>

          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Brand</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {(brands || []).length === 0 && !draft.brand && (
              <span className="text-xs text-ink-400 italic">no brands yet — type one below</span>
            )}
            {(brands || []).map(b => (
              <Chip key={b} tone="brand" active={draft.brand === b} onClick={() => pickExistingBrand(b)}>{b}</Chip>
            ))}
          </div>
          <div className="flex gap-2 mb-6">
            <input
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBrand()}
              placeholder="new brand…"
              className="flex-1 bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none text-sm py-1"
            />
            <button onClick={addBrand} className="px-4 py-1.5 bg-poppy-500 text-white text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop">Add</button>
          </div>

          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Seasons</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {SEASON_OPTIONS.map(s => (
              <Chip key={s} tone="season" active={(draft.seasons || []).includes(s)} onClick={() => toggle("seasons", s)}>{s}</Chip>
            ))}
          </div>

          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Occasions</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {OCCASION_OPTIONS.map(o => (
              <Chip key={o} tone="occasion" active={(draft.occasions || []).includes(o)} onClick={() => toggle("occasions", o)}>{o}</Chip>
            ))}
          </div>

          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Custom Tags</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {customTags.map(t => (
              <Chip key={t} tone="custom" active={(draft.custom || []).includes(t)} onClick={() => toggle("custom", t)}>{t}</Chip>
            ))}
            {customTags.length === 0 && <span className="text-xs text-ink-400 italic">none yet — add one below</span>}
          </div>
          <div className="flex gap-2 mb-8">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              placeholder="new tag…"
              className="flex-1 bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none text-sm py-1"
            />
            <button onClick={addCustom} className="px-4 py-1.5 bg-poppy-500 text-white text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop">Add</button>
          </div>

          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Collections</p>
          <div className="flex flex-wrap gap-2 mb-8">
            {(collections || []).length === 0 && (
              <span className="text-xs text-ink-400 italic">no collections yet — create one from the Closet</span>
            )}
            {(collections || []).map(c => {
              const inIt = c.itemIds.includes(item.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCollection(c.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full transition-all ${inIt ? "bg-sky2-500 text-white border-sky2-500 shadow-pop" : "bg-sky2-50 text-sky2-700 border-sky2-100"}`}
                >
                  <I.folder size={11} />
                  {toTitle(c.name)}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 pt-6 border-t-2 border-cream-100">
            <button
              onClick={() => onSave(draft)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-poppy-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-poppy"
            >
              <I.check size={14} /> Save
            </button>
            <button
              onClick={() => { if (confirm(`Remove "${draft.name}"?`)) onDelete(); }}
              className="px-5 py-3.5 bg-petal-50 border-2 border-petal-100 text-petal-600 rounded-full active:scale-95"
              aria-label="Delete piece"
            >
              <I.trash size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddItemModal({ onClose, onFile }) {
  useBodyScrollLock();
  const inputRef = useRef();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white max-w-md w-full p-6 sm:p-8 rounded-2xl shadow-2xl fade-up">
        <button onClick={onClose} className="absolute top-3 right-3 text-ink-500 p-2"><I.x size={18} /></button>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-poppy-50 rounded-full mb-3">
          <I.plus size={12} className="text-poppy-500" />
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-poppy-700">New Piece</p>
        </div>
        <h3 className="font-display font-bold text-2xl sm:text-3xl mb-3 sm:mb-4 text-ink-900">Add to your closet</h3>
        <p className="text-sm text-ink-600 mb-6">Pick from your gallery or snap a new photo. We'll resize it to save space.</p>
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-poppy-200 bg-poppy-50/50 active:border-poppy-500 active:bg-poppy-50 transition-colors rounded-3xl py-8 sm:py-10 flex flex-col items-center gap-3 text-poppy-600"
        >
          <div className="w-12 h-12 rounded-full bg-poppy-100 flex items-center justify-center">
            <I.upload size={22} />
          </div>
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase">Choose a photo</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="hidden"
        />
      </div>
    </div>
  );
}

// --- BULK ACTION SHEET ----------------------------------------------------
function BulkSheet({ type, selectedIds, items, customTags, collections, outfits, onSaveItems, onSaveCustomTags, onSaveCollections, onSaveOutfits, onClose }) {
  useBodyScrollLock();
  const count = selectedIds.size;

  // Tags: which to add
  const [addSeasons, setAddSeasons] = useState([]);
  const [addOccasions, setAddOccasions] = useState([]);
  const [addCustom, setAddCustom] = useState([]);
  const [newTag, setNewTag] = useState("");

  const toggleTag = (list, setList, v) => setList(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const addNewTag = () => {
    const t = newTag.trim().toLowerCase();
    if (!t) return;
    if (!customTags.includes(t)) onSaveCustomTags([...customTags, t]);
    if (!addCustom.includes(t)) setAddCustom(prev => [...prev, t]);
    setNewTag("");
  };

  // Collections / Outfits: track desired state per id ("all" | "some" | "none")
  const [collState, setCollState] = useState(() => {
    const ids = [...selectedIds];
    const m = {};
    (collections || []).forEach(c => {
      const allIn = ids.every(id => c.itemIds.includes(id));
      m[c.id] = allIn ? "all" : ids.some(id => c.itemIds.includes(id)) ? "some" : "none";
    });
    return m;
  });
  const [outfitState, setOutfitState] = useState(() => {
    const ids = [...selectedIds];
    const m = {};
    (outfits || []).forEach(o => {
      const allIn = ids.every(id => o.itemIds.includes(id));
      m[o.id] = allIn ? "all" : ids.some(id => o.itemIds.includes(id)) ? "some" : "none";
    });
    return m;
  });

  const toggleColl = (id) => setCollState(prev => ({ ...prev, [id]: prev[id] === "all" ? "none" : "all" }));
  const toggleOutfit = (id) => setOutfitState(prev => ({ ...prev, [id]: prev[id] === "all" ? "none" : "all" }));

  const apply = () => {
    const arr = [...selectedIds];
    if (type === "tags") {
      onSaveItems(items.map(it => {
        if (!selectedIds.has(it.id)) return it;
        return {
          ...it,
          seasons: [...new Set([...(it.seasons || []), ...addSeasons])],
          occasions: [...new Set([...(it.occasions || []), ...addOccasions])],
          custom: [...new Set([...(it.custom || []), ...addCustom])],
        };
      }));
    } else if (type === "collections") {
      onSaveCollections((collections || []).map(c => {
        const d = collState[c.id];
        if (d === "all") return { ...c, itemIds: [...new Set([...c.itemIds, ...arr])] };
        if (d === "none") return { ...c, itemIds: c.itemIds.filter(id => !selectedIds.has(id)) };
        return c;
      }));
    } else if (type === "outfits") {
      onSaveOutfits((outfits || []).map(o => {
        const d = outfitState[o.id];
        if (d === "all") return { ...o, itemIds: [...new Set([...o.itemIds, ...arr])] };
        if (d === "none") return { ...o, itemIds: o.itemIds.filter(id => !selectedIds.has(id)) };
        return o;
      }));
    }
    onClose();
  };

  const titles = { tags: "Apply Tags", collections: "Collections", outfits: "Outfits" };

  return (
    <div className="fixed inset-0 z-50 flex sm:justify-end">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full sm:max-w-md bg-white shadow-2xl fade-up flex flex-col h-full">
        <div className="p-4 sm:p-6 border-b border-cream-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500">{count} item{count !== 1 ? "s" : ""} selected</p>
            <h3 className="font-display text-2xl">{titles[type]}</h3>
          </div>
          <button onClick={onClose} className="text-ink-500 p-2 -m-2"><I.x size={20} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {type === "tags" && (
            <>
              <p className="text-sm text-ink-600">Selected tags will be added to all {count} items. Existing tags are preserved.</p>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Seasons</p>
                <div className="flex flex-wrap gap-2">
                  {SEASON_OPTIONS.map(s => <Chip key={s} tone="season" active={addSeasons.includes(s)} onClick={() => toggleTag(addSeasons, setAddSeasons, s)}>{s}</Chip>)}
                </div>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Occasions</p>
                <div className="flex flex-wrap gap-2">
                  {OCCASION_OPTIONS.map(o => <Chip key={o} tone="occasion" active={addOccasions.includes(o)} onClick={() => toggleTag(addOccasions, setAddOccasions, o)}>{o}</Chip>)}
                </div>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Custom Tags</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {customTags.length === 0 && <span className="text-xs text-ink-400 italic">none yet — add one below</span>}
                  {customTags.map(t => <Chip key={t} tone="custom" active={addCustom.includes(t)} onClick={() => toggleTag(addCustom, setAddCustom, t)}>{t}</Chip>)}
                </div>
                <div className="flex gap-2">
                  <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNewTag()} placeholder="new tag…" className="flex-1 bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none text-sm py-1" />
                  <button onClick={addNewTag} className="px-4 py-1.5 bg-poppy-500 text-white text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop">Add</button>
                </div>
              </div>
            </>
          )}

          {type === "collections" && (
            (collections || []).length === 0
              ? <p className="text-sm text-ink-500 italic">No collections yet.</p>
              : <div className="space-y-2">
                  {(collections || []).map(c => {
                    const st = collState[c.id] || "none";
                    return (
                      <button key={c.id} onClick={() => toggleColl(c.id)} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${st === "all" ? "bg-sky2-500 text-white border-sky2-500 shadow-pop" : "bg-white border-cream-100 text-ink-700 active:border-sky2-200"}`}>
                        <I.suitcase size={16} className="shrink-0" />
                        <span className="flex-1 font-display font-bold text-lg truncate">{toTitle(c.name)}</span>
                        {st === "some" && <span className="text-[9px] font-bold tracking-[0.15em] uppercase opacity-70">partial</span>}
                        {st === "all" && <I.check size={16} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
          )}

          {type === "outfits" && (
            (outfits || []).length === 0
              ? <p className="text-sm text-ink-500 italic">No outfits yet.</p>
              : <div className="space-y-2">
                  {(outfits || []).map(o => {
                    const st = outfitState[o.id] || "none";
                    return (
                      <button key={o.id} onClick={() => toggleOutfit(o.id)} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${st === "all" ? "bg-petal-500 text-white border-petal-500 shadow-pop" : "bg-white border-cream-100 text-ink-700 active:border-petal-200"}`}>
                        <I.sunglasses size={16} className="shrink-0" />
                        <span className="flex-1 font-display font-bold text-lg truncate">{toTitle(o.name)}</span>
                        {st === "some" && <span className="text-[9px] font-bold tracking-[0.15em] uppercase opacity-70">partial</span>}
                        {st === "all" && <I.check size={16} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-cream-100 bg-white shrink-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}>
          <button onClick={apply} className="w-full flex items-center justify-center gap-2 py-3.5 bg-poppy-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-poppy">
            <I.check size={14} /> Apply to {count} item{count !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MANAGE COLLECTIONS ---------------------------------------------------
function ManageCollectionsModal({ collections, items, images, onSave, onClose, initialEditingId }) {
  useBodyScrollLock();
  // If we opened straight into an edit/new flow, remember that — Cancel should close instead of returning to the list
  const directEdit = !!initialEditingId;

  const initialDraft = () => {
    if (initialEditingId === "new" || !initialEditingId) return { name: "", description: "", itemIds: [] };
    const c = collections.find(x => x.id === initialEditingId);
    return c ? { name: c.name, description: c.description || "", itemIds: [...c.itemIds] } : { name: "", description: "", itemIds: [] };
  };

  const [editingId, setEditingId] = useState(initialEditingId || null);
  const [draft, setDraft] = useState(initialDraft);
  const [filterStatus, setFilterStatus] = useState("owned");

  const startNew = () => {
    setDraft({ name: "", description: "", itemIds: [] });
    setEditingId("new");
  };
  const startEdit = (c) => {
    setDraft({ name: c.name, description: c.description || "", itemIds: [...c.itemIds] });
    setEditingId(c.id);
  };
  const cancelEdit = () => {
    if (directEdit) { onClose(); return; }
    setEditingId(null);
    setDraft({ name: "", description: "", itemIds: [] });
  };
  const saveDraft = () => {
    if (!draft.name.trim()) return;
    let next;
    if (editingId === "new") {
      const id = `c_${Date.now()}`;
      next = [...collections, { id, name: draft.name.trim(), description: draft.description.trim(), itemIds: draft.itemIds, createdAt: Date.now() }];
    } else {
      next = collections.map(c => c.id === editingId ? { ...c, name: draft.name.trim(), description: draft.description.trim(), itemIds: draft.itemIds } : c);
    }
    onSave(next);
    if (directEdit) { onClose(); return; }
    setEditingId(null);
    setDraft({ name: "", description: "", itemIds: [] });
  };
  const deleteCollection = (id) => {
    if (!confirm("Delete this collection? The items themselves stay in your closet.")) return;
    onSave(collections.filter(c => c.id !== id));
    if (editingId === id) cancelEdit();
  };
  const toggleItem = (itemId) => {
    setDraft({
      ...draft,
      itemIds: draft.itemIds.includes(itemId) ? draft.itemIds.filter(x => x !== itemId) : [...draft.itemIds, itemId]
    });
  };

  const isEditing = editingId !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div
        className="relative bg-white w-full sm:max-w-2xl sm:max-h-[85vh] sm:rounded-2xl flex flex-col shadow-2xl fade-up overflow-hidden"
        style={{ height: '100dvh', maxHeight: '100dvh' }}
      >
        <div
          className="p-4 sm:p-6 border-b border-cream-100 flex items-center justify-between bg-white shrink-0"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
        >
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500">Collections</p>
            <h3 className="font-display text-2xl sm:text-3xl">{isEditing ? (editingId === "new" ? "New Collection" : "Edit Collection") : "Your Collections"}</h3>
          </div>
          <button onClick={onClose} className="text-ink-500 p-2"><I.x size={18} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          {!isEditing && (
            <div className="space-y-3">
              <p className="text-sm text-ink-600">Group items into themed collections — a packing list for a trip, a capsule, a season's rotation. Pieces can live in multiple collections.</p>
              {collections.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-cream-200 rounded-3xl bg-cream-50/50">
                  <p className="font-display italic text-ink-500 text-lg mb-2">No collections yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {collections.map(c => (
                    <div key={c.id} className="flex items-center gap-3 p-3.5 bg-cream-50 border-2 border-cream-100 rounded-2xl">
                      <div className="w-9 h-9 rounded-full bg-sky2-100 flex items-center justify-center shrink-0">
                        <I.suitcase size={15} className="text-sky2-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-lg leading-tight truncate text-ink-900">{toTitle(c.name)}</p>
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-sky2-600">{c.itemIds.length} {c.itemIds.length === 1 ? "piece" : "pieces"}</p>
                        {c.description && <p className="text-xs italic text-ink-500 mt-1 truncate">"{c.description}"</p>}
                      </div>
                      <button onClick={() => startEdit(c)} className="w-8 h-8 flex items-center justify-center rounded-full text-ink-600 active:bg-poppy-100 active:text-poppy-600 transition-colors" aria-label="Edit"><I.pencil size={14} /></button>
                      <button onClick={() => deleteCollection(c.id)} className="w-8 h-8 flex items-center justify-center rounded-full text-ink-500 active:bg-petal-100 active:text-petal-600 transition-colors" aria-label="Delete"><I.trash size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={startNew}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 bg-sky2-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop"
              >
                <I.plus size={16} /> New Collection
              </button>
            </div>
          )}

          {isEditing && (
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-1">Name</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Italy Packing List"
                  className="w-full bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none font-display text-xl py-1"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-1">Description (optional)</label>
                <input
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="A short note about this collection"
                  className="w-full bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none text-sm italic py-1"
                />
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Pieces ({draft.itemIds.length})</p>
                <div className="flex gap-2 flex-wrap mb-3">
                  <Chip tone="status" active={!filterStatus} onClick={() => setFilterStatus(null)}>All</Chip>
                  {STATUS_OPTIONS.map(s => (
                    <Chip key={s} tone="status" active={filterStatus === s} onClick={() => setFilterStatus(filterStatus === s ? null : s)}>{s}</Chip>
                  ))}
                </div>
                {items.length === 0 ? (
                  <p className="text-sm text-ink-500 italic">No items in your closet yet.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {items.filter(it => !filterStatus || (it.status || "owned") === filterStatus).map(it => {
                      const active = draft.itemIds.includes(it.id);
                      return (
                        <button
                          key={it.id}
                          onClick={() => toggleItem(it.id)}
                          className={`relative rounded-2xl overflow-hidden border-2 transition-all active:scale-[0.97] ${active ? "border-poppy-500 ring-2 ring-poppy-500/25 shadow-pop" : "border-cream-100 bg-white"}`}
                        >
                          <div className="aspect-square bg-gradient-to-br from-cream-100 to-poppy-100 flex items-center justify-center">
                            {images[it.id] && <img src={images[it.id]} alt={it.name} className="w-full h-full object-contain p-2" />}
                            {active && (
                              <div className="absolute top-1.5 right-1.5 bg-poppy-500 text-white rounded-full p-1 shadow-pop">
                                <I.check size={10} />
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] font-bold font-display text-ink-800 truncate px-1.5 py-1">{toTitle(it.name)}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <div
            className="p-4 sm:p-6 border-t-2 border-cream-100 bg-white flex gap-2 shrink-0"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
          >
            <button onClick={cancelEdit} className="flex-1 py-3.5 bg-cream-50 border-2 border-cream-100 text-ink-700 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95">Cancel</button>
            <button
              onClick={saveDraft}
              disabled={!draft.name.trim()}
              className="flex-[2] flex items-center justify-center gap-2 py-3.5 bg-sky2-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 disabled:opacity-40 shadow-pop"
            >
              <I.check size={14} /> {editingId === "new" ? "Create Collection" : "Save Collection"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- OUTFITS VIEW ----------------------------------------------------------
function OutfitsView({ outfits, items, images, onSave, onNewOutfit, onEditOutfit, onPutImage, onDeleteImage, scrollToId, onScrolled, onSetHeaderAction }) {
  const [selfieModal, setSelfieModal] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeSeasons, setActiveSeasons] = useState([]);
  const [activeOccasions, setActiveOccasions] = useState([]);
  const [activeStatuses, setActiveStatuses] = useState([]);
  const newLookButtonRef = useRef(null);

  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  const filterCount = activeSeasons.length + activeOccasions.length + activeStatuses.length;

  const filteredOutfits = outfits.filter(o => {
    const pieces = items.filter(i => o.itemIds.includes(i.id));
    if (pieces.length === 0) return true;
    if (activeSeasons.length && !activeSeasons.every(s => pieces.every(p => p.seasons?.includes(s)))) return false;
    if (activeOccasions.length && !activeOccasions.every(oc => pieces.every(p => p.occasions?.includes(oc)))) return false;
    if (activeStatuses.length && !pieces.every(p => activeStatuses.includes(p.status || "owned"))) return false;
    return true;
  });

  const handleDelete = (id) => {
    if (!confirm("Delete this outfit?")) return;
    onDeleteImage(`selfie_${id}`);
    onSave(outfits.filter(o => o.id !== id));
  };

  useEffect(() => {
    if (!scrollToId) return;
    const el = document.getElementById(`outfit-${scrollToId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    onScrolled?.();
  }, [scrollToId]);

  useEffect(() => {
    const el = newLookButtonRef.current;
    if (!el || !onSetHeaderAction) return;
    const obs = new IntersectionObserver(
      ([entry]) => onSetHeaderAction(entry.isIntersecting ? null : { label: "New Look", tone: "petal", onClick: onNewOutfit }),
      { threshold: 0.5, rootMargin: "-68px 0px 0px 0px" }
    );
    obs.observe(el);
    return () => { obs.disconnect(); onSetHeaderAction?.(null); };
  }, []);

  return (
    <>
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
    <div className="fade-up">
      <div className="mb-6 sm:mb-10">
        <h2 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900 mb-2">Looks</h2>
        <div className="flex items-end justify-between gap-4">
          <h3 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900"><em className="text-petal-600">worth keeping.</em></h3>
          <button
            ref={newLookButtonRef}
            onClick={onNewOutfit}
            style={{flexShrink: 0}}
            className="flex items-center gap-2 px-5 py-3 bg-petal-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop"
          >
            <I.plus size={16} /> New Look
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`relative px-4 py-2.5 border-2 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase active:scale-95 shrink-0 transition-colors ${filterCount > 0 ? "bg-petal-500 text-white border-petal-500 shadow-pop" : "bg-white border-cream-100 text-ink-700"}`}
        >
          Filters{filterCount > 0 && ` · ${filterCount}`}
        </button>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 sm:p-5 bg-white border-2 border-cream-100 rounded-3xl fade-up shadow-card">
          <FilterRow label="Status">
            {STATUS_OPTIONS.map(s => (
              <Chip key={s} tone="status" active={activeStatuses.includes(s)} onClick={() => toggle(activeStatuses, setActiveStatuses, s)}>{s}</Chip>
            ))}
          </FilterRow>
          <FilterRow label="Season">
            {SEASON_OPTIONS.map(s => (
              <Chip key={s} tone="season" active={activeSeasons.includes(s)} onClick={() => toggle(activeSeasons, setActiveSeasons, s)}>{s}</Chip>
            ))}
          </FilterRow>
          <FilterRow label="Occasion">
            {OCCASION_OPTIONS.map(o => (
              <Chip key={o} tone="occasion" active={activeOccasions.includes(o)} onClick={() => toggle(activeOccasions, setActiveOccasions, o)}>{o}</Chip>
            ))}
          </FilterRow>
          {filterCount > 0 && (
            <button
              onClick={() => { setActiveSeasons([]); setActiveOccasions([]); setActiveStatuses([]); }}
              className="mt-2 text-[10px] tracking-[0.2em] uppercase text-ink-500 underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {outfits.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-petal-200 bg-petal-50/40 rounded-3xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-petal-100 flex items-center justify-center">
            <I.sunglasses size={28} className="text-petal-500" />
          </div>
          <p className="font-display font-bold text-2xl mb-2 text-ink-900">No looks yet.</p>
          <p className="text-xs font-bold tracking-widest uppercase text-petal-600 mb-6">Compose your first one</p>
          <button onClick={onNewOutfit} className="inline-flex items-center gap-2 px-5 py-2.5 bg-petal-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full shadow-pop active:scale-95">
            Open Builder <I.chevron size={14} />
          </button>
        </div>
      ) : filteredOutfits.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-cream-200 bg-cream-50/50 rounded-3xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-poppy-100 flex items-center justify-center">
            <I.search size={26} className="text-poppy-500" />
          </div>
          <p className="font-display font-bold text-xl text-ink-900">Nothing matches.</p>
          <p className="text-xs font-bold tracking-widest uppercase text-poppy-600 mt-2">Try clearing a filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {filteredOutfits.map((o, i) => (
            <OutfitCard
              key={o.id}
              id={`outfit-${o.id}`}
              outfit={o}
              items={items}
              images={images}
              onDelete={() => handleDelete(o.id)}
              onEdit={onEditOutfit ? () => onEditOutfit(o) : undefined}
              onPutImage={onPutImage}
              onDeleteImage={onDeleteImage}
              onOpenSelfie={() => setSelfieModal({ outfitId: o.id, outfitName: o.name })}
              delay={i * 80}
            />
          ))}
        </div>
      )}
    </div>
    </main>
    {selfieModal && (
      <SelfieModal
        outfitName={selfieModal.outfitName}
        selfieUrl={images[`selfie_${selfieModal.outfitId}`]}
        onFile={async (file) => {
          if (!file) return;
          const blob = await resizeImageToBlob(file, 1200, 0.88);
          if (blob) { onPutImage(`selfie_${selfieModal.outfitId}`, blob); setSelfieModal(null); }
        }}
        onRemove={() => { onDeleteImage(`selfie_${selfieModal.outfitId}`); setSelfieModal(null); }}
        onClose={() => setSelfieModal(null)}
      />
    )}
    </>
  );
}

function SelfieModal({ outfitName, selfieUrl, onFile, onRemove, onClose }) {
  useBodyScrollLock();
  const inputRef = useRef(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white max-w-sm w-full p-6 sm:p-8 rounded-3xl shadow-2xl fade-up">
        <button onClick={onClose} className="absolute top-3 right-3 text-ink-500 p-2"><I.x size={18} /></button>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-buttercup-50 rounded-full mb-3">
          <I.camera size={12} className="text-buttercup-600" />
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-buttercup-700">Look selfie</p>
        </div>
        <h3 className="font-display font-bold text-2xl mb-5 text-ink-900">{toTitle(outfitName)}</h3>
        {selfieUrl ? (
          <div className="mb-5">
            <div className="relative inline-block w-full">
              <img src={selfieUrl} alt="Outfit selfie" className="w-full max-h-64 object-contain rounded-2xl bg-cream-50" />
            </div>
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => inputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-cream-50 border-2 border-cream-100 text-ink-700 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95"
              >
                <I.camera size={13} /> Replace
              </button>
              <button
                onClick={onRemove}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-petal-50 border-2 border-petal-100 text-petal-600 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95"
              >
                <I.trash size={13} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-buttercup-200 bg-buttercup-50/40 active:border-buttercup-500 active:bg-buttercup-50 transition-colors rounded-3xl py-8 flex flex-col items-center gap-3 text-buttercup-700 mb-5"
          >
            <div className="w-12 h-12 rounded-full bg-buttercup-100 flex items-center justify-center">
              <I.camera size={22} />
            </div>
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase">Choose a photo</span>
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
    </div>
  );
}

function OutfitCard({ outfit, items, images, onDelete, onEdit, onPutImage, onDeleteImage, onOpenSelfie, delay = 0, id }) {
  const pieces = items.filter(i => outfit.itemIds.includes(i.id));
  const selfieKey = `selfie_${outfit.id}`;
  const selfieUrl = images[selfieKey];

  return (
    <div id={id} className="fade-up bg-white border-2 border-cream-100 rounded-3xl overflow-hidden shadow-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="p-4 sm:p-5 border-b-2 border-petal-50 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-petal-100 flex items-center justify-center shrink-0">
              <I.sunglasses size={14} className="text-petal-600" />
            </div>
            <h3 className="font-display font-bold text-xl sm:text-2xl truncate text-ink-900">{toTitle(outfit.name)}</h3>
          </div>
          {outfit.note && <p className="text-sm italic text-ink-500 mt-1 pl-10">"{outfit.note}"</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onOpenSelfie} className="w-9 h-9 flex items-center justify-center rounded-full text-ink-500 active:bg-buttercup-50 active:text-buttercup-600 transition-colors" aria-label="Outfit selfie">
            <I.camera size={15} />
          </button>
          {onEdit && (
            <button onClick={onEdit} className="w-9 h-9 flex items-center justify-center rounded-full text-ink-500 active:bg-poppy-50 active:text-poppy-600 transition-colors" aria-label="Edit outfit">
              <I.pencil size={15} />
            </button>
          )}
          <button onClick={onDelete} className="w-9 h-9 flex items-center justify-center rounded-full text-ink-400 active:bg-petal-50 active:text-petal-600 transition-colors" aria-label="Delete outfit">
            <I.trash size={15} />
          </button>
        </div>
      </div>
      <div className="p-4 bg-petal-50 grid grid-cols-3 gap-2 min-h-[200px]">
        {selfieUrl && (
          <div className="row-span-2 overflow-hidden rounded-2xl relative bg-white">
            <img src={selfieUrl} alt="Outfit selfie" className="absolute inset-0 w-full h-full object-contain" />
          </div>
        )}
        {pieces.map(p => (
          <div key={p.id} className="bg-white rounded-2xl overflow-hidden flex items-center justify-center aspect-square shadow-card">
            <img src={images[p.id]} alt={p.name} className="w-full h-full object-contain p-2" />
          </div>
        ))}
      </div>
      <div className="p-3 sm:p-4 flex flex-wrap gap-1.5">
        {pieces.map(p => (
          <span key={p.id} className="text-[10px] font-bold tracking-[0.1em] uppercase text-ink-700 bg-cream-50 px-2.5 py-1 rounded-full">{toTitle(p.name)}</span>
        ))}
      </div>
    </div>
  );
}

// --- COLLECTIONS VIEW -----------------------------------------------------
function CollectionsView({ collections, items, images, outfits, onSave, onViewCollection, onOpenOutfit, onSetHeaderAction }) {
  const [editingId, setEditingId] = useState(null);
  const [showManager, setShowManager] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeSeasons, setActiveSeasons] = useState([]);
  const [activeOccasions, setActiveOccasions] = useState([]);
  const [activeStatuses, setActiveStatuses] = useState([]);

  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  const filterCount = activeSeasons.length + activeOccasions.length + activeStatuses.length;

  const filteredCollections = collections.filter(c => {
    const pieces = items.filter(i => c.itemIds.includes(i.id));
    if (pieces.length === 0) return true;
    if (activeSeasons.length && !activeSeasons.every(s => pieces.every(p => p.seasons?.includes(s)))) return false;
    if (activeOccasions.length && !activeOccasions.every(oc => pieces.every(p => p.occasions?.includes(oc)))) return false;
    if (activeStatuses.length && !pieces.every(p => activeStatuses.includes(p.status || "owned"))) return false;
    return true;
  });

  const startNew = () => { setEditingId("new"); setShowManager(true); };
  const addButtonRef = useRef(null);
  useEffect(() => {
    const el = addButtonRef.current;
    if (!el || !onSetHeaderAction) return;
    const obs = new IntersectionObserver(
      ([entry]) => onSetHeaderAction(entry.isIntersecting ? null : { label: "New Collection", tone: "sky2", onClick: startNew }),
      { threshold: 0.5, rootMargin: "-68px 0px 0px 0px" }
    );
    obs.observe(el);
    return () => { obs.disconnect(); onSetHeaderAction(null); };
  }, []);
  const startEdit = (id) => { setEditingId(id); setShowManager(true); };
  const handleDelete = (id) => {
    if (!confirm("Delete this collection? The items themselves stay in your closet.")) return;
    onSave(collections.filter(c => c.id !== id));
  };

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="fade-up">
      <div className="mb-6 sm:mb-10">
        <h2 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900 mb-2">Collections</h2>
        <div className="flex items-end justify-between gap-4">
          <h3 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900"><em className="text-sky2-600">you've curated.</em></h3>
          <button
            ref={addButtonRef}
            onClick={startNew}
            style={{flexShrink: 0}}
            className="flex items-center gap-2 px-5 py-3 bg-sky2-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop"
          >
            <I.plus size={16} /> New Collection
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`relative px-4 py-2.5 border-2 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase active:scale-95 shrink-0 transition-colors ${filterCount > 0 ? "bg-sky2-500 text-white border-sky2-500 shadow-pop" : "bg-white border-cream-100 text-ink-700"}`}
        >
          Filters{filterCount > 0 && ` · ${filterCount}`}
        </button>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 sm:p-5 bg-white border-2 border-cream-100 rounded-3xl fade-up shadow-card">
          <FilterRow label="Status">
            {STATUS_OPTIONS.map(s => (
              <Chip key={s} tone="status" active={activeStatuses.includes(s)} onClick={() => toggle(activeStatuses, setActiveStatuses, s)}>{s}</Chip>
            ))}
          </FilterRow>
          <FilterRow label="Season">
            {SEASON_OPTIONS.map(s => (
              <Chip key={s} tone="season" active={activeSeasons.includes(s)} onClick={() => toggle(activeSeasons, setActiveSeasons, s)}>{s}</Chip>
            ))}
          </FilterRow>
          <FilterRow label="Occasion">
            {OCCASION_OPTIONS.map(o => (
              <Chip key={o} tone="occasion" active={activeOccasions.includes(o)} onClick={() => toggle(activeOccasions, setActiveOccasions, o)}>{o}</Chip>
            ))}
          </FilterRow>
          {filterCount > 0 && (
            <button
              onClick={() => { setActiveSeasons([]); setActiveOccasions([]); setActiveStatuses([]); }}
              className="mt-2 text-[10px] tracking-[0.2em] uppercase text-ink-500 underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {collections.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-sky2-200 bg-sky2-50/40 rounded-3xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sky2-100 flex items-center justify-center">
            <I.suitcase size={28} className="text-sky2-500" />
          </div>
          <p className="font-display font-bold text-2xl mb-2 text-ink-900">No collections yet.</p>
          <p className="text-xs font-bold tracking-widest uppercase text-sky2-600 mb-6 px-4">
            Group pieces — a packing list, a capsule, a season
          </p>
          <button onClick={startNew} className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky2-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full shadow-pop active:scale-95">
            Create your first <I.chevron size={14} />
          </button>
        </div>
      ) : filteredCollections.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-cream-200 bg-cream-50/50 rounded-3xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-poppy-100 flex items-center justify-center">
            <I.search size={26} className="text-poppy-500" />
          </div>
          <p className="font-display font-bold text-xl text-ink-900">Nothing matches.</p>
          <p className="text-xs font-bold tracking-widest uppercase text-poppy-600 mt-2">Try clearing a filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {filteredCollections.map((c, i) => (
            <CollectionCard
              key={c.id}
              collection={c}
              items={items}
              images={images}
              outfits={outfits}
              onOpen={() => onViewCollection(c.id)}
              onOpenOutfit={onOpenOutfit}
              onEdit={() => startEdit(c.id)}
              onDelete={() => handleDelete(c.id)}
              delay={i * 80}
            />
          ))}
        </div>
      )}

      </div>
      </main>

      {showManager && (
        <ManageCollectionsModal
          collections={collections}
          items={items}
          images={images}
          initialEditingId={editingId}
          onSave={onSave}
          onClose={() => { setShowManager(false); setEditingId(null); }}
        />
      )}
    </>
  );
}

function CollectionCard({ collection, items, images, outfits, onOpen, onOpenOutfit, onEdit, onDelete, delay = 0 }) {
  const pieces = items.filter(i => collection.itemIds.includes(i.id));
  const collectionOutfits = (outfits || []).filter(o =>
    o.itemIds.length > 0 && o.itemIds.every(id => collection.itemIds.includes(id))
  );
  // Show up to 9 in a 3×3 grid; truncate only when there are 10+
  const TRUNCATE_AT = 10;
  const preview = pieces.length >= TRUNCATE_AT ? pieces.slice(0, 8) : pieces;
  const remaining = pieces.length - preview.length;
  return (
    <div className="fade-up bg-white border-2 border-cream-100 rounded-3xl overflow-hidden shadow-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="p-4 sm:p-5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-sky2-100 flex items-center justify-center shrink-0">
              <I.suitcase size={14} className="text-sky2-600" />
            </div>
            <h3 className="font-display font-bold text-xl sm:text-2xl truncate text-ink-900">{toTitle(collection.name)}</h3>
          </div>
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-sky2-700 mt-1 pl-10">
            {pieces.length} {pieces.length === 1 ? "piece" : "pieces"}
          </p>
          {collection.description && (
            <p className="text-sm italic text-ink-500 mt-1 pl-10">"{collection.description}"</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="w-9 h-9 flex items-center justify-center rounded-full text-ink-500 active:bg-sky2-50 active:text-sky2-600 transition-colors" aria-label="Edit collection">
            <I.pencil size={15} />
          </button>
          <button onClick={onDelete} className="w-9 h-9 flex items-center justify-center rounded-full text-ink-400 active:bg-petal-50 active:text-petal-600 transition-colors" aria-label="Delete collection">
            <I.trash size={15} />
          </button>
        </div>
      </div>
      {preview.length === 0 ? (
        <div className="p-4 bg-sky2-50 min-h-[120px] flex items-center justify-center">
          <p className="font-display italic text-ink-500 text-sm">no pieces yet</p>
        </div>
      ) : (
        <div className="p-4 bg-sky2-50 grid grid-cols-3 gap-2 min-h-[200px]">
          {preview.map(p => (
            <div key={p.id} className="bg-white rounded-2xl overflow-hidden flex items-center justify-center aspect-square shadow-card">
              <img src={images[p.id]} alt={p.name} className="w-full h-full object-contain p-2" />
            </div>
          ))}
          {remaining > 0 && (
            <div className="bg-white/80 rounded-2xl flex items-center justify-center aspect-square border-2 border-dashed border-sky2-200">
              <p className="font-display font-bold italic text-sky2-600 text-sm">+{remaining} more</p>
            </div>
          )}
        </div>
      )}
      {collectionOutfits.length > 0 && (
        <div className="px-4 py-3 border-t-2 border-sky2-50">
          <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-petal-600 mb-2"><span className="inline-flex items-center justify-center bg-petal-500 text-white rounded-full w-5 h-5 text-[10px] font-bold tracking-normal normal-case">{collectionOutfits.length}</span> Look{collectionOutfits.length > 1 ? 's' : ''} in this collection</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {collectionOutfits.map(o => {
              const opieces = items.filter(i => o.itemIds.includes(i.id));
              return (
                <button
                  key={o.id}
                  onClick={() => onOpenOutfit?.(o.id)}
                  className="shrink-0 w-28 border-2 border-cream-100 rounded-2xl p-1.5 text-left active:scale-95 active:border-petal-200 transition-all bg-white"
                >
                  <div className="grid grid-cols-3 gap-0.5 rounded-xl overflow-hidden mb-1 bg-cream-50">
                    {opieces.slice(0, 3).map(p => (
                      <div key={p.id} className="bg-cream-50 aspect-square flex items-center justify-center overflow-hidden">
                        <img src={images[p.id]} alt={p.name} className="w-full h-full object-contain p-0.5" />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] font-bold tracking-[0.05em] uppercase text-ink-700 truncate">{toTitle(o.name)}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="p-3 sm:p-4 border-t-2 border-cream-100">
        <button
          onClick={onOpen}
          className="w-full flex items-center justify-center gap-2 py-3 bg-sky2-50 text-sky2-700 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 active:bg-sky2-100 transition-colors"
        >
          Open in Closet <I.chevron size={12} />
        </button>
      </div>
    </div>
  );
}

// --- BUILDER VIEW ----------------------------------------------------------
function BuilderView({ items, images, collections, outfit, onSaveOutfit, onCancel }) {
  useBodyScrollLock();
  const isEdit = !!outfit;
  const [selected, setSelected] = useState(outfit ? [...outfit.itemIds] : []);
  const [name, setName] = useState(outfit ? outfit.name : "");
  const [note, setNote] = useState(outfit ? outfit.note || "" : "");
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [activeStatuses, setActiveStatuses] = useState(["owned"]);
  const [scopeCollection, setScopeCollection] = useState(null);
  const toggleSelect = (id) => setSelected(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  const scopeObj = scopeCollection ? (collections || []).find(c => c.id === scopeCollection) : null;
  const scopedItems = scopeObj ? items.filter(i => scopeObj.itemIds.includes(i.id)) : items;
  const filtered = scopedItems.filter(i =>
    (!categoryFilter || i.category === categoryFilter) &&
    (activeStatuses.length === 0 || activeStatuses.includes(i.status || "owned"))
  );
  const chosenItems = selected.map(id => items.find(i => i.id === id)).filter(Boolean);
  const canSave = selected.length > 0 && name.trim();
  const handleSave = () => {
    if (!canSave) return;
    if (isEdit) {
      onSaveOutfit({ ...outfit, name: name.trim(), note: note.trim(), itemIds: selected });
    } else {
      onSaveOutfit({ name: name.trim(), note: note.trim(), itemIds: selected });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl flex flex-col shadow-2xl fade-up overflow-hidden"
        style={{ height: '100dvh', maxHeight: '100dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 sm:p-6 border-b border-cream-100 bg-white shrink-0"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500">Look Builder</p>
              <h3 className="font-display text-2xl sm:text-3xl">{isEdit ? "Edit Look" : "New Look"}</h3>
            </div>
            <button onClick={onCancel} className="text-ink-500 p-2"><I.x size={18} /></button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-buttercup-700 shrink-0">
              {selected.length} {selected.length === 1 ? "piece" : "pieces"}
            </p>
            {chosenItems.length === 0 ? (
              <span className="text-xs italic text-ink-400 font-display">nothing selected yet…</span>
            ) : (
              chosenItems.map(p => (
                <div key={p.id} className="bg-white border-2 border-buttercup-100 rounded-2xl shrink-0 w-12 h-12 flex items-center justify-center relative shadow-card">
                  <img src={images[p.id]} alt={p.name} className="w-full h-full object-contain p-1" />
                  <button onClick={() => toggleSelect(p.id)} className="absolute -top-1.5 -right-1.5 bg-poppy-500 text-white rounded-full p-1 shadow-pop">
                    <I.x size={9} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
          {(collections || []).length > 0 && (
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-sky2-700 mb-2">Choose from</p>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                <button
                  onClick={() => setScopeCollection(null)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full transition-all ${scopeCollection === null ? "bg-sky2-500 text-white border-sky2-500 shadow-pop" : "bg-sky2-50 text-sky2-700 border-sky2-100"}`}
                >
                  Entire Closet
                </button>
                {collections.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setScopeCollection(c.id)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full transition-all ${scopeCollection === c.id ? "bg-sky2-500 text-white border-sky2-500 shadow-pop" : "bg-sky2-50 text-sky2-700 border-sky2-100"}`}
                  >
                    <I.suitcase size={11} />
                    {c.name}
                    <span className="opacity-70">·{c.itemIds.length}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink-500 mb-2">Status</p>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(s => (
                <Chip key={s} tone="status" active={activeStatuses.includes(s)} onClick={() =>
                  setActiveStatuses(activeStatuses.includes(s) ? activeStatuses.filter(x => x !== s) : [...activeStatuses, s])
                }>{s}</Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink-500 mb-2">Category</p>
            <div className="flex flex-wrap gap-2">
              <Chip tone="category" active={!categoryFilter} onClick={() => setCategoryFilter(null)}>All</Chip>
              {CATEGORY_OPTIONS.map(c => (
                <Chip key={c} tone="category" active={categoryFilter === c} onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}>{c}</Chip>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {filtered.map((it, i) => {
              const active = selected.includes(it.id);
              return (
                <div
                  key={it.id}
                  onClick={() => toggleSelect(it.id)}
                  className={`cursor-pointer fade-up rounded-2xl overflow-hidden border-2 transition-all active:scale-[0.97] ${active ? "border-poppy-500 ring-2 ring-poppy-500/25 shadow-pop" : "border-cream-100 bg-white"}`}
                  style={{ animationDelay: `${i * 20}ms` }}
                >
                  <div className="aspect-square bg-gradient-to-br from-cream-100 to-poppy-100 flex items-center justify-center relative">
                    {images[it.id] && <img src={images[it.id]} alt={it.name} className="w-full h-full object-contain p-1.5" />}
                    {active && (
                      <div className="absolute top-1.5 right-1.5 bg-poppy-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-pop">
                        <I.check size={11} />
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] font-bold font-display text-ink-800 truncate px-1.5 py-1">{toTitle(it.name)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-4 sm:p-6 border-t-2 border-cream-100 bg-white shrink-0 space-y-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this look…"
            className="w-full bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none font-display font-bold text-lg py-1"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="a vibe, a memory… (optional)"
            className="w-full bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none text-sm italic py-1"
          />
          <div className="flex gap-2 pt-1">
            <button onClick={onCancel} className="flex-1 py-3 bg-cream-50 border-2 border-cream-100 text-ink-700 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95">Cancel</button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="flex-[2] flex items-center justify-center gap-2 py-3 bg-petal-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase disabled:opacity-40 rounded-full active:scale-95 shadow-pop"
            >
              <I.check size={14} /> {isEdit ? "Save Changes" : "Save Look"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Backup Modal ---------------------------------------------------------
function BackupModal({ items, images, outfits, customTags, brands, collections, onClose, onImport }) {
  useBodyScrollLock();
  const fileRef = useRef();
  const [status, setStatus] = useState(null); // {kind: 'info'|'error'|'success', message}
  const [pending, setPending] = useState(null); // parsed valid backup awaiting strategy choice
  const [storageEstimate, setStorageEstimate] = useState(null); // {usage, quota} in bytes

  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(setStorageEstimate).catch(() => {});
    }
  }, [images]);

  const handleExport = async () => {
    try {
      const { sizeBytes } = await exportBackup({ items, outfits, customTags, brands, collections });
      const kb = Math.round(sizeBytes / 1024);
      setStatus({ kind: 'success', message: `Backup saved (${kb.toLocaleString()} KB). Check your Downloads folder.` });
    } catch (e) {
      setStatus({ kind: 'error', message: "Could not create the backup file: " + (e.message || e) });
    }
  };

  const handlePickFile = async (file) => {
    if (!file) return;
    setStatus(null);
    setPending(null);
    try {
      const text = await readFileAsText(file);
      let parsed;
      try { parsed = JSON.parse(text); }
      catch { setStatus({ kind: 'error', message: "That file isn't valid JSON." }); return; }
      const result = validateBackup(parsed);
      if (!result.ok) { setStatus({ kind: 'error', message: result.error }); return; }
      setPending({ filename: file.name, data: result.data, counts: parsed.counts || {}, exportedAt: parsed.exportedAt });
      const colsCount = result.data.collections?.length || 0;
      setStatus({
        kind: 'info',
        message: `Found ${result.data.items.length} items, ${result.data.outfits.length} outfits${colsCount ? `, ${colsCount} collections` : ""}. Choose how to apply it.`
      });
    } catch (e) {
      setStatus({ kind: 'error', message: "Could not read the file: " + (e.message || e) });
    }
  };

  const applyStrategy = (strategy) => {
    if (!pending) return;
    // Build a `current` snapshot without the images map — images live in IDB now.
    const current = { items, outfits, customTags, brands: brands || [], collections: collections || [] };
    const next = strategy === 'replace' ? pending.data : mergeBackup(current, pending.data);
    onImport(next, strategy);
    setStatus({ kind: 'success', message: strategy === 'replace' ? "Closet replaced with the backup." : "Backup merged into your closet." });
    setPending(null);
  };

  // Storage line — show real device usage if available, else fall back to item count.
  const storageLine = (() => {
    if (storageEstimate && storageEstimate.quota) {
      const usedMB = (storageEstimate.usage || 0) / (1024 * 1024);
      const quotaMB = storageEstimate.quota / (1024 * 1024);
      const fmt = (n) => n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString();
      return `Using ${fmt(usedMB)} MB of ${fmt(quotaMB)} MB available`;
    }
    return `${Object.keys(images).length} images stored`;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white max-w-md w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-2xl shadow-2xl fade-up" style={{ paddingBottom: `max(env(safe-area-inset-bottom), 24px)` }}>
        <button onClick={onClose} className="absolute top-3 right-3 text-ink-500 p-2"><I.x size={18} /></button>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-leaf-50 rounded-full mb-3">
          <I.archive size={12} className="text-leaf-600" />
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-leaf-700">Save & Restore</p>
        </div>
        <h3 className="font-display font-bold text-2xl sm:text-3xl mb-4 text-ink-900">Keep your closet<br/><em className="text-leaf-600">safe and sound.</em></h3>

        <div className="mb-6 p-3 bg-cream-50 border-2 border-cream-100 rounded-2xl text-xs text-ink-600 leading-relaxed">
          <span className="font-bold text-ink-800">{items.length}</span> pieces · <span className="font-bold text-ink-800">{outfits.length}</span> outfits · {storageLine}
        </div>

        {/* EXPORT */}
        <div className="mb-8">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-leaf-700 mb-2">Export</p>
          <p className="text-sm text-ink-600 mb-3">Download everything as a single JSON file. Keep it somewhere safe — Google Drive, email to yourself, anywhere.</p>
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-leaf-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop"
          >
            <I.download size={14} /> Export Backup
          </button>
        </div>

        {/* IMPORT */}
        <div className="mb-2">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-leaf-700 mb-2">Import</p>
          <p className="text-sm text-ink-600 mb-3">Restore from a backup file. You'll be asked whether to merge or replace.</p>
          {!pending && (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-leaf-200 bg-leaf-50/50 active:border-leaf-500 active:bg-leaf-50 transition-colors rounded-3xl py-6 flex flex-col items-center gap-2 text-leaf-700"
            >
              <I.upload size={20} />
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase">Choose backup file</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => { handlePickFile(e.target.files?.[0]); e.target.value = ""; }}
            className="hidden"
          />

          {pending && (
            <div className="border-2 border-cream-100 rounded-3xl p-4 mb-3 bg-white">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink-500 mb-1">From file</p>
              <p className="font-display font-bold text-base truncate text-ink-900">{pending.filename}</p>
              {pending.exportedAt && (
                <p className="text-[10px] text-ink-500 mt-1">Exported {new Date(pending.exportedAt).toLocaleString()}</p>
              )}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => applyStrategy('merge')}
                  className="w-full py-3.5 bg-leaf-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop"
                >
                  Merge (keep current, add new)
                </button>
                <button
                  onClick={() => {
                    if (confirm("Replace your entire closet with this backup? Your current items and outfits will be deleted.")) {
                      applyStrategy('replace');
                    }
                  }}
                  className="w-full py-3.5 bg-petal-50 border-2 border-petal-100 text-petal-700 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95"
                >
                  Replace everything
                </button>
                <button
                  onClick={() => { setPending(null); setStatus(null); }}
                  className="text-[10px] font-bold tracking-[0.15em] uppercase text-ink-500 underline pt-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {status && (
          <div className={`mt-3 p-3.5 rounded-2xl border-2 text-sm flex items-start gap-2 ${
            status.kind === 'error'   ? "bg-petal-50 border-petal-200 text-petal-700" :
            status.kind === 'success' ? "bg-leaf-50 border-leaf-200 text-leaf-700" :
                                        "bg-cream-50 border-cream-100 text-ink-700"
          }`}>
            <I.alert size={14} className="shrink-0 mt-0.5" />
            <span>{status.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Mount ----------------------------------------------------------------
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ClosetApp />);
