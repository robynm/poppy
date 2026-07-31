import { useState } from "react";
import { CroppedImage } from "./CroppedImage.jsx";
import { toTitle, dateLabel } from "../lib/format.js";
import { useBodyScrollLock } from "../lib/hooks.js";
import { I } from "../lib/icons.jsx";
import { Log } from "../lib/log.js";
import { shareAsImage } from "../lib/share.js";

function OutfitDetailModal({
  outfit,
  items,
  images,
  selfies = [],
  onClose,
  onEdit,
  onDelete,
}) {
  useBodyScrollLock();
  const pieces = items.filter((i) => outfit.itemIds.includes(i.id));
  const linkedSelfies = selfies
    .filter((s) => s.outfitId === outfit.id && images[s.id])
    .sort((a, b) => b.dateTaken - a.dateTaken);
  const [sharing, setSharing] = useState(false);
  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await shareAsImage({
        title: outfit.name,
        subtitle: outfit.note,
        items: pieces,
        images,
        accent: "#EC4778",
        kindLabel: "Look",
      });
    } catch (e) {
      Log.warn("share.failed", e);
      alert("Sorry — couldn't create the share image.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        data-testid="outfit-detail"
        className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl flex flex-col shadow-2xl fade-up overflow-hidden"
        style={{ height: "100dvh", maxHeight: "100dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 sm:p-6 border-b-2 border-petal-50 bg-white shrink-0"
          style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-petal-100 flex items-center justify-center">
              <I.sunglasses size={14} className="text-petal-600" />
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                data-testid="detail-share"
                onClick={handleShare}
                disabled={sharing || pieces.length === 0}
                className="w-9 h-9 flex items-center justify-center rounded-full text-ink-500 active:bg-petal-50 active:text-petal-600 transition-colors disabled:opacity-40"
                aria-label="Share outfit"
              >
                <I.share size={15} />
              </button>
              {onEdit && (
                <button
                  data-testid="detail-edit"
                  onClick={onEdit}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-ink-500 active:bg-petal-50 active:text-petal-600 transition-colors"
                  aria-label="Edit outfit"
                >
                  <I.pencil size={15} />
                </button>
              )}
              <button
                data-testid="detail-delete"
                onClick={onDelete}
                className="w-9 h-9 flex items-center justify-center rounded-full text-ink-400 active:bg-petal-50 active:text-petal-600 transition-colors"
                aria-label="Delete outfit"
              >
                <I.trash size={15} />
              </button>
              <button
                data-testid="detail-close"
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full text-ink-500 active:bg-cream-100 transition-colors"
                aria-label="Close"
              >
                <I.x size={18} />
              </button>
            </div>
          </div>
          <h3 className="font-display font-bold text-2xl sm:text-3xl truncate text-ink-900">
            {toTitle(outfit.name)}
          </h3>
          {outfit.note && (
            <p className="text-sm italic text-ink-500 mt-1">"{outfit.note}"</p>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 bg-petal-50 grid grid-cols-3 gap-2 min-h-[200px]">
            {pieces.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl overflow-hidden flex items-center justify-center aspect-square shadow-card"
              >
                {images[p.id] && (
                  <img
                    src={images[p.id]}
                    alt={p.name}
                    className="w-full h-full object-contain p-2"
                  />
                )}
              </div>
            ))}
          </div>
          {linkedSelfies.length > 0 && (
            <div className="px-4 pt-4 sm:px-6" data-testid="detail-selfies">
              <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
                Snaps
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {linkedSelfies.map((s) => (
                  <div
                    key={s.id}
                    data-testid="detail-selfie-thumb"
                    className="rounded-2xl overflow-hidden shadow-card bg-white"
                  >
                    <CroppedImage
                      url={images[s.id]}
                      crop={s.crop}
                      className="w-full aspect-[3/4]"
                    />
                    <p className="text-[9px] font-bold tracking-[0.05em] text-ink-600 text-center px-1 py-1">
                      {dateLabel(s.dateTaken)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="p-4 sm:p-6 flex flex-wrap gap-1.5">
            {(outfit.seasons || []).map((s) => (
              <span
                key={`s-${s}`}
                className="text-[9px] font-bold tracking-[0.1em] uppercase text-poppy-600 bg-poppy-50 px-2 py-1 rounded-full"
              >
                {s}
              </span>
            ))}
            {(outfit.occasions || []).map((o) => (
              <span
                key={`o-${o}`}
                className="text-[9px] font-bold tracking-[0.1em] uppercase text-plum-600 bg-plum-50 px-2 py-1 rounded-full"
              >
                {o}
              </span>
            ))}
            {pieces.map((p) => (
              <span
                key={p.id}
                className="text-[10px] font-bold tracking-[0.1em] uppercase text-ink-700 bg-cream-50 px-2.5 py-1 rounded-full"
              >
                {toTitle(p.name)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { OutfitDetailModal };
