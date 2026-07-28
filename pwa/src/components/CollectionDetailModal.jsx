import { useState } from "react";
import { toTitle } from "../lib/format.js";
import { useBodyScrollLock } from "../lib/hooks.js";
import { I } from "../lib/icons.jsx";
import { Log } from "../lib/log.js";
import { shareAsImage } from "../lib/share.js";

function CollectionDetailModal({
  collection,
  items,
  images,
  outfits,
  onClose,
  onEdit,
  onDelete,
  onOpenOutfit,
  onOpenInCloset,
}) {
  useBodyScrollLock();
  const pieces = items.filter((i) => collection.itemIds.includes(i.id));
  const collectionOutfits = (outfits || []).filter(
    (o) =>
      o.itemIds.length > 0 &&
      o.itemIds.every((id) => collection.itemIds.includes(id)),
  );
  const [sharing, setSharing] = useState(false);
  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await shareAsImage({
        title: collection.name,
        subtitle: collection.description,
        items: pieces,
        images,
        accent: "#2882B7",
        kindLabel: "Collection",
        maxCols: 6,
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
        className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl flex flex-col shadow-2xl fade-up overflow-hidden"
        style={{ height: "100dvh", maxHeight: "100dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 sm:p-6 border-b-2 border-sky2-50 bg-white shrink-0"
          style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-sky2-100 flex items-center justify-center">
              <I.suitcase size={14} className="text-sky2-600" />
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={handleShare}
                disabled={sharing || pieces.length === 0}
                className="w-9 h-9 flex items-center justify-center rounded-full text-ink-500 active:bg-sky2-50 active:text-sky2-600 transition-colors disabled:opacity-40"
                aria-label="Share collection"
              >
                <I.share size={15} />
              </button>
              <button
                onClick={onEdit}
                className="w-9 h-9 flex items-center justify-center rounded-full text-ink-500 active:bg-sky2-50 active:text-sky2-600 transition-colors"
                aria-label="Edit collection"
              >
                <I.pencil size={15} />
              </button>
              <button
                onClick={onDelete}
                className="w-9 h-9 flex items-center justify-center rounded-full text-ink-400 active:bg-petal-50 active:text-petal-600 transition-colors"
                aria-label="Delete collection"
              >
                <I.trash size={15} />
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full text-ink-500 active:bg-cream-100 transition-colors"
                aria-label="Close"
              >
                <I.x size={18} />
              </button>
            </div>
          </div>
          <h3 className="font-display font-bold text-2xl sm:text-3xl truncate text-ink-900">
            {toTitle(collection.name)}
          </h3>
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-sky2-700 mt-1">
            {pieces.length} {pieces.length === 1 ? "piece" : "pieces"}
          </p>
          {collection.description && (
            <p className="text-sm italic text-ink-500 mt-1">
              "{collection.description}"
            </p>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {pieces.length === 0 ? (
            <div className="p-4 bg-sky2-50 min-h-[120px] flex items-center justify-center">
              <p className="font-display italic text-ink-500 text-sm">
                no pieces yet
              </p>
            </div>
          ) : (
            <div className="p-4 bg-sky2-50 grid grid-cols-3 gap-2 min-h-[200px]">
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
          )}
          {collectionOutfits.length > 0 && (
            <div className="px-4 py-3 border-t-2 border-sky2-50">
              <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-petal-600 mb-2">
                <span className="inline-flex items-center justify-center bg-petal-500 text-white rounded-full w-5 h-5 text-[10px] font-bold tracking-normal normal-case">
                  {collectionOutfits.length}
                </span>{" "}
                Look{collectionOutfits.length > 1 ? "s" : ""} in this collection
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                {collectionOutfits.map((o) => {
                  const opieces = items.filter((i) => o.itemIds.includes(i.id));
                  return (
                    <button
                      key={o.id}
                      onClick={() => onOpenOutfit?.(o.id)}
                      className="shrink-0 w-28 border-2 border-cream-100 rounded-2xl p-1.5 text-left active:scale-95 active:border-petal-200 transition-all bg-white"
                    >
                      <div className="grid grid-cols-3 gap-0.5 rounded-xl overflow-hidden mb-1 bg-cream-50">
                        {opieces.slice(0, 3).map((p) => (
                          <div
                            key={p.id}
                            className="bg-cream-50 aspect-square flex items-center justify-center overflow-hidden"
                          >
                            <img
                              src={images[p.id]}
                              alt={p.name}
                              className="w-full h-full object-contain p-0.5"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] font-bold tracking-[0.05em] uppercase text-ink-700 truncate">
                        {toTitle(o.name)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="p-4 sm:p-6 border-t-2 border-cream-100">
            {((collection.seasons || []).length > 0 ||
              (collection.occasions || []).length > 0) && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(collection.seasons || []).map((s) => (
                  <span
                    key={`s-${s}`}
                    className="text-[9px] font-bold tracking-[0.1em] uppercase text-poppy-600 bg-poppy-50 px-2 py-1 rounded-full"
                  >
                    {s}
                  </span>
                ))}
                {(collection.occasions || []).map((o) => (
                  <span
                    key={`o-${o}`}
                    className="text-[9px] font-bold tracking-[0.1em] uppercase text-plum-600 bg-plum-50 px-2 py-1 rounded-full"
                  >
                    {o}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={onOpenInCloset}
              className="w-full flex items-center justify-center gap-2 py-3 bg-sky2-50 text-sky2-700 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 active:bg-sky2-100 transition-colors"
            >
              Open in Closet <I.chevron size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CollectionDetailModal };
