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
};

// The Poppy brand mark — a stylized blossom built from three soft petals
function PoppyMark({ size = 24, color = "#FF5A36", className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      {/* outer petals */}
      <ellipse cx="16" cy="9.5" rx="6.5" ry="7.5" fill={color} opacity="0.95" />
      <ellipse cx="9.5" cy="18" rx="7" ry="6.2" fill={color} opacity="0.85" transform="rotate(-22 9.5 18)" />
      <ellipse cx="22.5" cy="18" rx="7" ry="6.2" fill={color} opacity="0.85" transform="rotate(22 22.5 18)" />
      {/* center disc */}
      <circle cx="16" cy="15.5" r="3.4" fill="#FFFBF6" />
      <circle cx="16" cy="15.5" r="1.7" fill={color} />
    </svg>
  );
}

const toTitle = s => s ? s.replace(/\b\w/g, c => c.toUpperCase()) : s;

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
    status:     active ? "bg-buttercup-500 text-white border-buttercup-500 shadow-pop" : "bg-buttercup-50 text-buttercup-700 border-buttercup-100",
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
    e.preventDefault();
    e.stopPropagation();
    const el = itemRefs.current.get(index);
    if (el) {
      const r = el.getBoundingClientRect();
      startRectRef.current = { width: r.width };
      grabOffsetRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    setDragIndex(index);
    setHoverIndex(index);
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
  const [activeCollection, setActiveCollection] = useState(null); // currently selected collection id (closet filter)
  const [scrollToOutfitId, setScrollToOutfitId] = useState(null);
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
        <div className="text-ink-500 text-xs font-bold tracking-[0.2em] uppercase">Poppy is blooming…</div>
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
              <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-poppy-600 hidden sm:inline">Your closet, blooming</span>
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
        />
      )}
      {view === "collections" && (
        <CollectionsView
          collections={collections} items={items} images={images} outfits={outfits}
          onSave={saveCollections}
          onViewCollection={(id) => { setActiveCollection(id); setView("closet"); }}
          onOpenOutfit={(id) => { setScrollToOutfitId(id); setView("outfits"); }}
        />
      )}
      {view === "outfits" && (
        <OutfitsView
          outfits={outfits} items={items} images={images}
          onSave={saveOutfits}
          onPutImage={putImage} onDeleteImage={deleteImage}
          onNewOutfit={() => { setEditingOutfit(null); setView("builder"); }}
          onEditOutfit={(o) => { setEditingOutfit(o); setView("builder"); }}
          scrollToId={scrollToOutfitId}
          onScrolled={() => setScrollToOutfitId(null)}
        />
      )}
      {view === "builder" && (
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
            setView("outfits");
          }}
          onCancel={() => { setEditingOutfit(null); setView("outfits"); }}
        />
      )}

      {/* BOTTOM NAV — mobile-first, Poppy-style: chunky, colorful, with a soft pill on the active tab */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-cream-100 shadow-card-hi" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-3 px-3 pt-2 pb-1">
          <BottomTab IconC={I.shirt}  label="Closet"      tone="poppy"  active={view === "closet"}      onClick={() => setView("closet")} />
          <BottomTab IconC={I.layers} label="Looks"       tone="petal"  active={view === "outfits"}     onClick={() => setView("outfits")} />
          <BottomTab IconC={I.folder} label="Sets"        tone="sky2"   active={view === "collections"} onClick={() => setView("collections")} />
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
function ClosetView({ items, images, customTags, brands, collections, outfits, activeCollection, onSetActiveCollection, onSaveItems, onPutImage, onDeleteImage, onSaveCustomTags, onSaveBrands, onSaveCollections, onSaveOutfits }) {
  const [activeCategories, setActiveCategories] = useState([]);
  const [activeSeasons, setActiveSeasons] = useState([]);
  const [activeOccasions, setActiveOccasions] = useState([]);
  const [activeCustom, setActiveCustom] = useState([]);
  const [activeStatuses, setActiveStatuses] = useState(["owned"]);
  const [activeBrands, setActiveBrands] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
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
        <h2 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900">Your closet,<br/><em className="text-poppy-600">all in one place.</em></h2>
        <p className="mt-3 sm:mt-4 text-ink-600 text-sm sm:text-base max-w-xl">
          <span className="font-bold text-ink-800">{counts.total}</span> pieces · <span className="font-bold text-ink-800">{counts.tops}</span> tops · <span className="font-bold text-ink-800">{counts.bottoms}</span> bottoms
        </p>
      </div>

      {activeCollectionObj && activeCollectionObj.description && (
        <p className="text-sm italic text-ink-500 mb-4">"{activeCollectionObj.description}"</p>
      )}

      {/* Add button / select mode bar */}
      <div className="mb-3">
        {selectMode ? (
          <div className="flex items-center gap-3 py-1 bg-poppy-50 px-4 py-2.5 rounded-full">
            <span className="text-sm font-bold text-poppy-700">{selectedIds.size} selected</span>
            <button onClick={selectAll} className="text-[10px] font-bold tracking-[0.15em] uppercase text-poppy-600 underline active:text-poppy-700">All</button>
            <button onClick={exitSelectMode} className="text-[10px] font-bold tracking-[0.15em] uppercase text-poppy-600 underline active:text-poppy-700">None</button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-poppy-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-poppy"
          >
            <I.plus size={16} /> Add a Piece
          </button>
        )}
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
          <FilterRow label="Status">
            {STATUS_OPTIONS.map(s => (
              <Chip key={s} tone="status" active={activeStatuses.includes(s)} onClick={() => toggle(activeStatuses, setActiveStatuses, s)}>{s}</Chip>
            ))}
          </FilterRow>
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
            onClick={() => { setActiveCategory(null); setActiveSeasons([]); setActiveOccasions([]); setActiveCustom([]); setActiveCollection(null); setActiveStatus("owned"); setActiveBrands([]); }}
            className="text-[10px] tracking-[0.2em] uppercase text-ink-500 underline active:text-poppy-600 ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex-1 h-px bg-cream-200"></div>
      
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
            <button onClick={() => setBulkSheet("collections")} className="px-3.5 py-2 bg-sky2-50 text-sky2-700 text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 active:bg-sky2-100">Sets</button>
            <button onClick={() => setBulkSheet("outfits")} className="px-3.5 py-2 bg-petal-50 text-petal-700 text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 active:bg-petal-100">Looks</button>
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
      <div className="aspect-[3/4] bg-gradient-to-br from-cream-100 to-poppy-100 flex items-center justify-center overflow-hidden relative">
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
      <div className="p-3">
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
                        <I.folder size={16} className="shrink-0" />
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
                        <I.layers size={16} className="shrink-0" />
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
              <p className="text-sm text-ink-600">Group items into themed sets — a packing list for a trip, a capsule, a season's rotation. Pieces can live in multiple sets.</p>
              {collections.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-cream-200 rounded-3xl bg-cream-50/50">
                  <p className="font-display italic text-ink-500 text-lg mb-2">No collections yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {collections.map(c => (
                    <div key={c.id} className="flex items-center gap-3 p-3.5 bg-cream-50 border-2 border-cream-100 rounded-2xl">
                      <div className="w-9 h-9 rounded-full bg-sky2-100 flex items-center justify-center shrink-0">
                        <I.folder size={15} className="text-sky2-600" />
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
                <I.plus size={16} /> New Set
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
                  placeholder="A short note about this set"
                  className="w-full bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none text-sm italic py-1"
                />
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Pieces ({draft.itemIds.length})</p>
                {items.length === 0 ? (
                  <p className="text-sm text-ink-500 italic">No items in your closet yet.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {items.map(it => {
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
              <I.check size={14} /> {editingId === "new" ? "Create Set" : "Save Set"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- OUTFITS VIEW ----------------------------------------------------------
function OutfitsView({ outfits, items, images, onSave, onNewOutfit, onEditOutfit, onPutImage, onDeleteImage, scrollToId, onScrolled }) {
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

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
    <div className="fade-up">
      <div className="mb-6 sm:mb-10 flex items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-petal-50 rounded-full mb-3">
            <I.heart size={12} className="text-petal-500" />
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-petal-700">Your Looks</p>
          </div>
          <h2 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900">Looks<br/><em className="text-petal-600">worth keeping.</em></h2>
        </div>
        <button
          onClick={onNewOutfit}
          className="flex items-center gap-2 px-5 py-3 bg-petal-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shrink-0 shadow-pop"
        >
          <I.plus size={14} /> New Look
        </button>
      </div>

      {outfits.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-petal-200 bg-petal-50/40 rounded-3xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-petal-100 flex items-center justify-center">
            <I.layers size={28} className="text-petal-500" />
          </div>
          <p className="font-display font-bold text-2xl mb-2 text-ink-900">No looks yet.</p>
          <p className="text-xs font-bold tracking-widest uppercase text-petal-600 mb-6">Compose your first one</p>
          <button onClick={onNewOutfit} className="inline-flex items-center gap-2 px-5 py-2.5 bg-petal-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full shadow-pop active:scale-95">
            Open Builder <I.chevron size={14} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {outfits.map((o, i) => (
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
              delay={i * 80}
            />
          ))}
        </div>
      )}
    </div>
    </main>
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

function OutfitCard({ outfit, items, images, onDelete, onEdit, onPutImage, onDeleteImage, delay = 0, id }) {
  const pieces = outfit.itemIds.map(id => items.find(i => i.id === id)).filter(Boolean);
  const selfieKey = `selfie_${outfit.id}`;
  const selfieUrl = images[selfieKey];
  const [showSelfieModal, setShowSelfieModal] = useState(false);

  const handleSelfieFile = async (file) => {
    if (!file) return;
    const blob = await resizeImageToBlob(file, 1200, 0.88);
    if (blob) { onPutImage(selfieKey, blob); setShowSelfieModal(false); }
  };

  return (
    <div id={id} className="fade-up bg-white border-2 border-petal-50 rounded-3xl overflow-hidden shadow-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="p-4 sm:p-5 border-b-2 border-petal-50 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-petal-100 flex items-center justify-center shrink-0">
              <I.layers size={14} className="text-petal-600" />
            </div>
            <h3 className="font-display font-bold text-xl sm:text-2xl truncate text-ink-900">{toTitle(outfit.name)}</h3>
          </div>
          {outfit.note && <p className="text-sm italic text-ink-500 mt-1 pl-10">"{outfit.note}"</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setShowSelfieModal(true)} className="w-9 h-9 flex items-center justify-center rounded-full text-ink-500 active:bg-buttercup-50 active:text-buttercup-600 transition-colors" aria-label="Outfit selfie">
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
      {showSelfieModal && (
        <SelfieModal
          outfitName={outfit.name}
          selfieUrl={selfieUrl}
          onFile={handleSelfieFile}
          onRemove={() => { onDeleteImage(selfieKey); setShowSelfieModal(false); }}
          onClose={() => setShowSelfieModal(false)}
        />
      )}
    </div>
  );
}

// --- COLLECTIONS VIEW -----------------------------------------------------
function CollectionsView({ collections, items, images, outfits, onSave, onViewCollection, onOpenOutfit }) {
  const [editingId, setEditingId] = useState(null); // collection id being edited, 'new', or null
  const [showManager, setShowManager] = useState(false); // open manager modal directly to a target

  const startNew = () => { setEditingId("new"); setShowManager(true); };
  const startEdit = (id) => { setEditingId(id); setShowManager(true); };
  const handleDelete = (id) => {
    if (!confirm("Delete this collection? The items themselves stay in your closet.")) return;
    onSave(collections.filter(c => c.id !== id));
  };

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="fade-up">
      <div className="mb-6 sm:mb-10 flex items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky2-50 rounded-full mb-3">
            <I.folder size={12} className="text-sky2-500" />
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-sky2-700">Your Sets</p>
          </div>
          <h2 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900">Bundles<br/><em className="text-sky2-600">you've gathered.</em></h2>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-5 py-3 bg-sky2-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shrink-0 shadow-pop"
        >
          <I.plus size={14} /> New Set
        </button>
      </div>

      {collections.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-sky2-200 bg-sky2-50/40 rounded-3xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sky2-100 flex items-center justify-center">
            <I.folder size={28} className="text-sky2-500" />
          </div>
          <p className="font-display font-bold text-2xl mb-2 text-ink-900">No sets yet.</p>
          <p className="text-xs font-bold tracking-widest uppercase text-sky2-600 mb-6 px-4">
            Group pieces — a packing list, a capsule, a season
          </p>
          <button onClick={startNew} className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky2-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full shadow-pop active:scale-95">
            Create your first <I.chevron size={14} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {collections.map((c, i) => (
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
    <div className="fade-up bg-white border-2 border-sky2-50 rounded-3xl overflow-hidden shadow-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="p-4 sm:p-5 border-b-2 border-sky2-50 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-sky2-100 flex items-center justify-center shrink-0">
              <I.folder size={14} className="text-sky2-600" />
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
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-petal-600 mb-2">Looks in this set</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {collectionOutfits.map(o => {
              const opieces = o.itemIds.map(id => items.find(i => i.id === id)).filter(Boolean);
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
      <div className="p-3 sm:p-4 border-t-2 border-sky2-50">
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
  const isEdit = !!outfit;
  const [selected, setSelected] = useState(outfit ? [...outfit.itemIds] : []);
  const [name, setName] = useState(outfit ? outfit.name : "");
  const [note, setNote] = useState(outfit ? outfit.note || "" : "");
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [scopeCollection, setScopeCollection] = useState(null); // null = entire wardrobe
  const toggleSelect = (id) => setSelected(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  const scopeObj = scopeCollection ? (collections || []).find(c => c.id === scopeCollection) : null;
  const scopedItems = scopeObj ? items.filter(i => scopeObj.itemIds.includes(i.id)) : items;
  const filtered = scopedItems.filter(i => !categoryFilter || i.category === categoryFilter);
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
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
    <div className="fade-up">
      <div className="mb-3 sm:mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-buttercup-50 rounded-full mb-3">
            <I.sparkles size={12} className="text-buttercup-500" />
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-buttercup-700">{isEdit ? "Edit Look" : "Build a Look"}</p>
          </div>
          <h2 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900">
            {isEdit ? <>Refresh<br/><em className="text-buttercup-600">the look.</em></> : <>Plant<br/><em className="text-buttercup-600">a new look.</em></>}
          </h2>
          <p className="mt-3 text-ink-600 text-sm sm:text-base max-w-xl">
            {isEdit ? "Swap pieces, rename it, or update the note. Save when you're happy." : "Tap pieces to add them. Name the look and save it for later."}
          </p>
        </div>
        {isEdit && onCancel && (
          <button
            onClick={onCancel}
            className="text-[10px] font-bold tracking-[0.15em] uppercase text-ink-500 underline active:text-poppy-600 shrink-0 pt-2"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Preview at top on mobile (sticky) */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-white/95 backdrop-blur border-b border-cream-200 mb-4">
        <div className="flex items-center gap-3 overflow-x-auto py-2">
          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 shrink-0">{selected.length} {selected.length === 1 ? "piece" : "pieces"}</p>
          {chosenItems.length === 0 ? (
            <span className="text-xs italic text-ink-400 font-display">nothing selected yet…</span>
          ) : (
            chosenItems.map(p => (
              <div key={p.id} className="bg-white border border-cream-100 rounded-2xl shrink-0 w-14 h-14 flex items-center justify-center relative">
                <img src={images[p.id]} alt={p.name} className="w-full h-full object-contain p-1" />
                <button onClick={() => toggleSelect(p.id)} className="absolute -top-1 -right-1 bg-poppy-500 text-white rounded-full p-0.5">
                  <I.x size={10} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Scope picker: entire closet or a collection */}
      {(collections || []).length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">Choose from</p>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setScopeCollection(null)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] border rounded-full transition-colors ${scopeCollection === null ? "bg-poppy-500 text-white border-poppy-500" : "bg-transparent text-ink-700 border-cream-200"}`}
            >
              Entire Closet
            </button>
            {collections.map(c => (
              <button
                key={c.id}
                onClick={() => setScopeCollection(c.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] border rounded-full transition-colors ${scopeCollection === c.id ? "bg-poppy-500 text-white border-poppy-500" : "bg-transparent text-ink-700 border-cream-200"}`}
              >
                <I.folder size={11} />
                {c.name}
                <span className="opacity-60">·{c.itemIds.length}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-8">
        <div>
          <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto">
            <Chip tone="category" active={!categoryFilter} onClick={() => setCategoryFilter(null)}>All</Chip>
            {CATEGORY_OPTIONS.map(c => (
              <Chip key={c} tone="category" active={categoryFilter === c} onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}>{c}</Chip>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map((it, i) => {
              const active = selected.includes(it.id);
              return (
                <div
                  key={it.id}
                  onClick={() => toggleSelect(it.id)}
                  className={`item-card cursor-pointer fade-up rounded-2xl overflow-hidden border-2 transition-all active:scale-[0.97] ${active ? "border-poppy-500" : "border-cream-100 bg-white"}`}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="aspect-[3/4] bg-gradient-to-br from-cream-100 to-poppy-100 flex items-center justify-center relative">
                    <img src={images[it.id]} alt={it.name} className="w-full h-full object-contain p-2 sm:p-3" />
                    {active && (
                      <div className="absolute top-2 right-2 bg-poppy-500 text-white rounded-full p-1.5">
                        <I.check size={12} />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="font-display text-sm truncate">{toTitle(it.name)}</p>
                    <p className="text-[9px] tracking-[0.2em] uppercase text-ink-500">{it.category}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 self-start">
          <div className="bg-white border-2 border-cream-100 rounded-3xl p-4 sm:p-5 shadow-card">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-buttercup-700 mb-3">Name your look</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Saturday in town"
              className="w-full bg-transparent border-b-2 border-cream-200 focus:border-poppy-500 outline-none font-display font-bold text-lg py-1 mb-4"
            />
            <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-buttercup-700 mb-1">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="a vibe, a memory…"
              className="w-full bg-transparent border-b-2 border-cream-200 focus:border-poppy-500 outline-none text-sm italic py-1 mb-6"
            />

            <button
              onClick={handleSave}
              disabled={!canSave}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-buttercup-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase disabled:opacity-40 rounded-full active:scale-95 shadow-pop"
            >
              <I.check size={14} /> {isEdit ? "Save Changes" : "Save Look"}
            </button>
          </div>
        </aside>
      </div>
    </div>
    </main>
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
