import { useRef, useState } from "react";
import { toTitle } from "../lib/format.js";
import { useBodyScrollLock } from "../lib/hooks.js";
import { I } from "../lib/icons.jsx";

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
const DEFAULT_CROP = { zoom: 1, x: 50, y: 50 };

function SelfieDetailModal({
  selfie,
  imageUrl,
  outfits,
  selfies,
  onSaveSelfies,
  onDelete,
  onClose,
}) {
  useBodyScrollLock();

  // Edits are staged in a draft and only committed on Save.
  const [draftDate, setDraftDate] = useState(selfie.dateTaken);
  const [draftOutfitId, setDraftOutfitId] = useState(selfie.outfitId ?? null);
  const [crop, setCrop] = useState(selfie.crop || DEFAULT_CROP);

  const frameRef = useRef(null);
  const dragRef = useRef(null);

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
    const nx = clamp(d.x - ((e.clientX - d.px) / rect.width) * (100 / crop.zoom), 0, 100);
    const ny = clamp(d.y - ((e.clientY - d.py) / rect.height) * (100 / crop.zoom), 0, 100);
    setCrop((c) => ({ ...c, x: nx, y: ny }));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const save = () => {
    onSaveSelfies(
      selfies.map((s) =>
        s.id === selfie.id
          ? { ...s, dateTaken: draftDate, outfitId: draftOutfitId, crop }
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
          <div>
            <div
              ref={frameRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="relative overflow-hidden rounded-2xl bg-cream-50 mx-auto w-full max-w-[240px] aspect-[3/4] touch-none select-none cursor-grab active:cursor-grabbing"
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Snap"
                  draggable={false}
                  className="absolute left-1/2 top-1/2 max-w-none object-cover pointer-events-none"
                  style={{
                    width: `${crop.zoom * 100}%`,
                    height: `${crop.zoom * 100}%`,
                    transform: "translate(-50%, -50%)",
                    objectPosition: `${crop.x}% ${crop.y}%`,
                  }}
                />
              )}
            </div>
            <div className="mx-auto w-full max-w-[240px] mt-2 flex items-center gap-2">
              <I.search size={13} className="shrink-0 text-ink-400" />
              <input
                data-testid="selfie-zoom"
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={crop.zoom}
                onChange={(e) =>
                  setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))
                }
                className="flex-1 accent-buttercup-500"
              />
            </div>
            <p className="text-[10px] text-center text-ink-400 mt-1">
              Drag to reposition · slide to zoom
            </p>
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

          <div>
            <label className="block text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-1">
              Worn in
            </label>
            {(outfits || []).length === 0 ? (
              <p className="text-xs italic text-ink-400">
                No looks yet — create one from the Looks tab.
              </p>
            ) : (
              <select
                data-testid="selfie-look"
                value={draftOutfitId ?? ""}
                onChange={(e) => setDraftOutfitId(e.target.value || null)}
                className="w-full bg-white border-2 border-cream-200 focus:border-buttercup-500 outline-none text-sm rounded-full px-3 py-2 font-bold text-ink-700"
              >
                <option value="">Not worn in a look</option>
                {outfits.map((o) => (
                  <option key={o.id} value={o.id}>
                    {toTitle(o.name)}
                  </option>
                ))}
              </select>
            )}
          </div>

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
