import { useMemo, useRef, useState } from "react";
import { CroppedImage, cropLayout, minZoomFor } from "./CroppedImage.jsx";
import { toTitle } from "../lib/format.js";
import { useBodyScrollLock } from "../lib/hooks.js";
import { useBackButton } from "../lib/backNav.js";
import { I } from "../lib/icons.jsx";
import { resizeImageToBlob } from "../lib/images.js";

// yyyy-mm-dd (local) for an <input type="date">.
function toDateInputValue(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
// Parse the input back to epoch-ms at local noon (avoids TZ off-by-one drift).
function fromDateInputValue(str) {
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
// x/y are 0..1 focal points; guard older data stored as 0..100.
const norm = (v) => (v == null ? 0.5 : v > 1 ? v / 100 : v);
const initCrop = (c) =>
  c ? { zoom: c.zoom ?? 1, x: norm(c.x), y: norm(c.y) } : { zoom: 1, x: 0.5, y: 0.5 };

const RATINGS = [
  { key: "happy", Glyph: I.smile },
  { key: "meh", Glyph: I.meh },
  { key: "sad", Glyph: I.frown },
];

function SelfieDetailModal({
  selfie,
  imageUrl,
  edits,
  items,
  images,
  selfies,
  onSaveSelfies,
  onReplaceImage,
  onDelete,
  onClose,
}) {
  useBodyScrollLock();
  useBackButton(true, onClose);

  // Edits are staged in a draft and only committed on Save.
  const [draftDate, setDraftDate] = useState(selfie.dateTaken);
  const [draftOutfitIds, setDraftOutfitIds] = useState(selfie.outfitIds || []);
  const [draftItems, setDraftItems] = useState(selfie.itemIds || []);
  const [draftRating, setDraftRating] = useState(selfie.rating ?? null);
  const [crop, setCrop] = useState(() => initCrop(selfie.crop));
  const [aspect, setAspect] = useState(null);
  const [replacing, setReplacing] = useState(false);
  // Looks & pieces show only what's tagged; expand to edit the full list.
  const [looksOpen, setLooksOpen] = useState(false);
  const [piecesOpen, setPiecesOpen] = useState(false);

  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const fileRef = useRef(null);

  const handleReplace = async (file) => {
    if (!file || !onReplaceImage) return;
    setReplacing(true);
    try {
      const blob = await resizeImageToBlob(file, 1200, 0.88);
      if (blob) {
        await onReplaceImage(selfie.id, blob);
        setCrop({ zoom: 1, x: 0.5, y: 0.5 });
        setAspect(null);
      }
    } finally {
      setReplacing(false);
    }
  };

  const minZoom = aspect ? minZoomFor(aspect) : 0.3;

  const changeDate = (e) => {
    const ts = fromDateInputValue(e.target.value);
    if (ts != null) setDraftDate(ts);
  };

  // Drag to reposition which part of the photo shows in the frame.
  const onPointerDown = (e) => {
    dragRef.current = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const nx = clamp(d.x - (e.clientX - d.px) / rect.width, 0, 1);
    const ny = clamp(d.y - (e.clientY - d.py) / rect.height, 0, 1);
    setCrop((c) => ({ ...c, x: nx, y: ny }));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  // Toggle a look. Adding also merges its pieces into the tagged items;
  // removing leaves the tagged items untouched.
  const toggleOutfit = (o) => {
    if (draftOutfitIds.includes(o.id)) {
      setDraftOutfitIds(draftOutfitIds.filter((x) => x !== o.id));
    } else {
      setDraftOutfitIds([...draftOutfitIds, o.id]);
      setDraftItems((prev) => [...new Set([...prev, ...(o.itemIds || [])])]);
    }
  };
  const toggleItem = (id) =>
    setDraftItems(
      draftItems.includes(id)
        ? draftItems.filter((x) => x !== id)
        : [...draftItems, id],
    );

  // The picker only offers owned pieces — planned/donated items aren't taggable
  // — but any already-tagged piece stays visible so it can still be removed.
  const pickableItems = (items || []).filter(
    (it) => (it.status || "owned") === "owned" || draftItems.includes(it.id),
  );

  // Looks that overlap the tagged pieces, ranked by closeness of match
  // (Jaccard similarity, so a tight match beats a big look sharing one piece).
  // Already-tagged looks are excluded — they've graduated to "Worn in".
  const suggestedOutfits = useMemo(() => {
    if (draftItems.length === 0) return [];
    const tagged = new Set(draftItems);
    return (edits || [])
      .filter((o) => !draftOutfitIds.includes(o.id))
      .map((o) => {
        const ids = o.itemIds || [];
        const shared = ids.filter((id) => tagged.has(id)).length;
        const union = new Set([...ids, ...draftItems]).size;
        return { o, shared, score: union ? shared / union : 0 };
      })
      .filter((x) => x.shared > 0)
      .sort((a, b) => b.score - a.score || b.shared - a.shared)
      .slice(0, 3);
  }, [edits, draftItems, draftOutfitIds]);

  const save = () => {
    onSaveSelfies(
      selfies.map((s) =>
        s.id === selfie.id
          ? {
              ...s,
              dateTaken: draftDate,
              crop,
              rating: draftRating,
              outfitIds: draftOutfitIds,
              itemIds: draftItems,
            }
          : s,
      ),
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        data-testid="selfie-detail"
        className="relative bg-white max-w-sm w-full rounded-3xl shadow-2xl fade-up overflow-hidden max-h-[92vh] overflow-y-auto"
      >
        <button
          data-testid="selfie-close"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 text-ink-600 shadow-card active:scale-90"
          aria-label="Close"
        >
          <I.x size={18} />
        </button>

        <div className="p-5 space-y-4">
          {/* Crop / reposition */}
          <div className="select-none">
            <div
              ref={frameRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="relative overflow-hidden rounded-2xl bg-cream-50 mx-auto w-full max-w-[200px] aspect-[1/2] touch-none select-none cursor-grab active:cursor-grabbing"
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Snap"
                  draggable={false}
                  onLoad={(e) => {
                    const a =
                      e.currentTarget.naturalWidth /
                      e.currentTarget.naturalHeight;
                    setAspect(a);
                    setCrop((c) => ({
                      ...c,
                      zoom: Math.max(c.zoom, minZoomFor(a)),
                    }));
                  }}
                  className="max-w-none pointer-events-none"
                  style={
                    aspect
                      ? cropLayout(aspect, crop)
                      : {
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }
                  }
                />
              )}
            </div>
            <div className="mx-auto w-full max-w-[200px] mt-2 flex items-center gap-2">
              <I.search size={13} className="shrink-0 text-ink-400" />
              <input
                data-testid="selfie-zoom"
                type="range"
                min={minZoom}
                max="3"
                step="0.02"
                value={crop.zoom}
                onChange={(e) =>
                  setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))
                }
                className="flex-1 accent-buttercup-500"
              />
            </div>
            <p className="text-[10px] text-center text-ink-400 mt-1">
              Drag to reposition · slide to zoom in or out
            </p>
            <div className="mx-auto w-full max-w-[200px] mt-3">
              <button
                type="button"
                data-testid="selfie-replace-btn"
                onClick={() => fileRef.current?.click()}
                disabled={replacing}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-cream-50 border-2 border-cream-100 text-ink-700 text-[10px] font-bold tracking-[0.2em] uppercase rounded-full active:scale-95 disabled:opacity-40"
              >
                <I.upload size={12} /> {replacing ? "Replacing…" : "Replace Photo"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                data-testid="selfie-replace-file"
                className="hidden"
                onChange={(e) => {
                  handleReplace(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-1.5">
              How you felt
            </label>
            <div className="flex gap-2" data-testid="selfie-rating">
              {RATINGS.map((r) => {
                const active = draftRating === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    data-testid="selfie-rating-btn"
                    data-rating={r.key}
                    onClick={() =>
                      setDraftRating(active ? null : r.key)
                    }
                    className={`flex-1 flex items-center justify-center py-2.5 rounded-2xl border-2 transition-all ${
                      active
                        ? "border-buttercup-500 bg-buttercup-50 text-buttercup-600 shadow-pop"
                        : "border-cream-100 text-ink-300"
                    }`}
                  >
                    <r.Glyph size={26} stroke={1.75} />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-1">
              Date taken
            </label>
            <input
              data-testid="selfie-date"
              type="date"
              value={toDateInputValue(draftDate)}
              onChange={changeDate}
              className="w-full bg-transparent border-b border-cream-200 focus:border-buttercup-500 outline-none text-sm py-1"
            />
          </div>

          {/* Looks (multi-select) — tagged only by default; expand to edit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] tracking-[0.3em] uppercase text-ink-500">
                Worn in
              </label>
              {(edits || []).length > 0 && (
                <button
                  type="button"
                  data-testid="selfie-looks-toggle"
                  onClick={() => setLooksOpen((o) => !o)}
                  className="text-[10px] font-bold uppercase tracking-[0.1em] text-buttercup-600 active:text-buttercup-700"
                >
                  {looksOpen ? "Done" : "Edit"}
                </button>
              )}
            </div>
            {(edits || []).length === 0 ? (
              <p className="text-xs italic text-ink-400">
                No edits yet — create one from the Edits tab.
              </p>
            ) : !looksOpen && draftOutfitIds.length === 0 ? (
              <p className="text-xs italic text-ink-400">
                Not tagged in any edits yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5" data-testid="selfie-looks">
                {(looksOpen
                  ? edits
                  : edits.filter((o) => draftOutfitIds.includes(o.id))
                ).map((o) => {
                  const active = draftOutfitIds.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      data-testid="selfie-look-option"
                      data-outfit-id={o.id}
                      onClick={() => toggleOutfit(o)}
                      className={`text-[11px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-full border-2 transition-all ${
                        active
                          ? "bg-petal-500 text-white border-petal-500 shadow-pop"
                          : "bg-petal-50 text-petal-700 border-petal-100"
                      }`}
                    >
                      {toTitle(o.name)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tagged pieces — tagged only by default; expand to edit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] tracking-[0.3em] uppercase text-ink-500">
                Pieces ({draftItems.length})
              </label>
              {pickableItems.length > 0 && (
                <button
                  type="button"
                  data-testid="selfie-pieces-toggle"
                  onClick={() => setPiecesOpen((o) => !o)}
                  className="text-[10px] font-bold uppercase tracking-[0.1em] text-buttercup-600 active:text-buttercup-700"
                >
                  {piecesOpen ? "Done" : "Edit"}
                </button>
              )}
            </div>
            {pickableItems.length === 0 ? (
              <p className="text-xs italic text-ink-400">
                No pieces in your closet yet.
              </p>
            ) : !piecesOpen && draftItems.length === 0 ? (
              <p className="text-xs italic text-ink-400">No pieces tagged yet.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {(piecesOpen
                  ? pickableItems
                  : pickableItems.filter((it) => draftItems.includes(it.id))
                ).map((it) => {
                  const active = draftItems.includes(it.id);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      data-testid="selfie-item"
                      data-item-id={it.id}
                      onClick={() => toggleItem(it.id)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all active:scale-[0.97] ${
                        active
                          ? "border-buttercup-500 ring-2 ring-buttercup-500/25 shadow-pop"
                          : "border-cream-100 bg-white"
                      }`}
                    >
                      <div className="aspect-square bg-cream-50 flex items-center justify-center">
                        {images[it.id] ? (
                          <img
                            src={images[it.id]}
                            alt={it.name}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <I.shirt size={16} className="text-poppy-300" />
                        )}
                      </div>
                      {active && (
                        <div className="absolute top-0.5 right-0.5 bg-buttercup-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-pop">
                          <I.check size={9} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Suggested looks — matched to the tagged pieces, tap to tag */}
          {suggestedOutfits.length > 0 && (
            <div>
              <label className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-1.5">
                <I.sparkles size={11} className="text-buttercup-500" />
                Suggested edits
              </label>
              <div
                className="flex flex-wrap gap-1.5"
                data-testid="selfie-suggestions"
              >
                {suggestedOutfits.map(({ o, shared }) => (
                  <button
                    key={o.id}
                    type="button"
                    data-testid="selfie-suggestion"
                    data-outfit-id={o.id}
                    onClick={() => toggleOutfit(o)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-full border-2 border-dashed border-petal-200 bg-petal-50/50 text-petal-700 active:scale-95"
                  >
                    <I.plus size={11} />
                    {toTitle(o.name)}
                    <span className="text-[10px] leading-4 font-bold bg-petal-100 text-petal-600 rounded-full px-1.5">
                      {shared}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              data-testid="selfie-save"
              onClick={save}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-buttercup-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop"
            >
              <I.check size={14} /> Save
            </button>
            <button
              data-testid="selfie-delete"
              onClick={() => {
                if (confirm("Delete this snap?")) onDelete();
              }}
              aria-label="Delete snap"
              className="px-5 py-3 bg-petal-50 border-2 border-petal-100 text-petal-600 rounded-full active:scale-95"
            >
              <I.trash size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { SelfieDetailModal };
