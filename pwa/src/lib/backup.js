import { BACKUP_FORMAT } from "./constants.js";
import { blobToDataUrl } from "./images.js";
import { Log } from "./log.js";
import { IDB } from "./storage.js";

// --- Backup / restore -----------------------------------------------------
// Backups remain a single portable JSON with data URLs inside (format unchanged),
// so backups written on the old build still restore, and backups written here
// restore anywhere. The on-device representation is blobs; we convert at the
// boundary.
async function exportBackup({
  items,
  outfits,
  customTags,
  brands,
  collections,
  selfies,
}) {
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
    counts: {
      items: items.length,
      outfits: outfits.length,
      collections: (collections || []).length,
      selfies: (selfies || []).length,
    },
    data: {
      items,
      images,
      outfits,
      customTags,
      brands: brands || [],
      collections: collections || [],
      selfies: selfies || [],
    },
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `poppy-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  Log.info("export.done", {
    items: items.length,
    photos: Object.keys(images).length,
    bytes: blob.size,
  });
  return { sizeBytes: blob.size };
}

function validateBackup(parsed) {
  if (!parsed || typeof parsed !== "object")
    return { ok: false, error: "File is not a valid JSON object." };
  if (parsed.format !== BACKUP_FORMAT) {
    return {
      ok: false,
      error: `Unknown backup format${parsed.format ? `: "${parsed.format}"` : ""}. Expected "${BACKUP_FORMAT}".`,
    };
  }
  const d = parsed.data;
  if (!d || typeof d !== "object")
    return { ok: false, error: "Backup is missing its data section." };
  if (!Array.isArray(d.items))
    return { ok: false, error: "Backup items are malformed." };
  if (!Array.isArray(d.outfits))
    return { ok: false, error: "Backup outfits are malformed." };
  if (!Array.isArray(d.customTags))
    return { ok: false, error: "Backup custom tags are malformed." };
  if (!d.images || typeof d.images !== "object")
    return { ok: false, error: "Backup images are malformed." };
  // light per-item check
  for (const it of d.items) {
    if (!it.id || !it.name)
      return {
        ok: false,
        error: `An item is missing id or name (id: ${it.id || "?"}).`,
      };
  }
  // collections, brands and selfies are optional for backward compatibility with older backups
  if (d.collections !== undefined && !Array.isArray(d.collections)) {
    return { ok: false, error: "Backup collections are malformed." };
  }
  if (d.brands !== undefined && !Array.isArray(d.brands)) {
    return { ok: false, error: "Backup brands are malformed." };
  }
  if (d.selfies !== undefined && !Array.isArray(d.selfies)) {
    return { ok: false, error: "Backup selfies are malformed." };
  }
  if (!d.collections) d.collections = [];
  if (!d.brands) d.brands = [];
  if (!d.selfies) d.selfies = [];
  // Normalize items missing the new fields
  d.items = d.items.map((i) => ({
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
  const itemMap = new Map(current.items.map((i) => [i.id, i]));
  for (const it of incoming.items)
    if (!itemMap.has(it.id)) itemMap.set(it.id, it);
  const items = Array.from(itemMap.values());

  const images = incoming.images || {}; // data-URL map; caller writes these to IDB

  const outfitMap = new Map(current.outfits.map((o) => [o.id, o]));
  for (const o of incoming.outfits)
    if (!outfitMap.has(o.id)) outfitMap.set(o.id, o);
  const outfits = Array.from(outfitMap.values()).sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
  );

  const tagSet = new Set([
    ...(current.customTags || []),
    ...(incoming.customTags || []),
  ]);
  const customTags = Array.from(tagSet);

  // Brands: case-insensitive union, keeping the first-seen casing
  const brandLowerSeen = new Map();
  for (const b of [...(current.brands || []), ...(incoming.brands || [])]) {
    const key = b.toLowerCase();
    if (!brandLowerSeen.has(key)) brandLowerSeen.set(key, b);
  }
  const brands = Array.from(brandLowerSeen.values());

  const collectionMap = new Map(
    (current.collections || []).map((c) => [c.id, c]),
  );
  for (const c of incoming.collections || []) {
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

  const selfieMap = new Map((current.selfies || []).map((s) => [s.id, s]));
  for (const s of incoming.selfies || [])
    if (!selfieMap.has(s.id)) selfieMap.set(s.id, s);
  const selfies = Array.from(selfieMap.values()).sort(
    (a, b) => (b.dateTaken || 0) - (a.dateTaken || 0),
  );

  return { items, images, outfits, customTags, brands, collections, selfies };
}

export { exportBackup, validateBackup, readFileAsText, mergeBackup };
