import { toTitle } from "../lib/format.js";
import { I } from "../lib/icons.jsx";

// The thumbnail + label block of a look tile — shared by the card and the drag ghost.
function OutfitCardPreview({ outfit, items, images }) {
  const pieces = items.filter((i) => outfit.itemIds.includes(i.id));
  const thumbs = pieces.slice(0, 4).map((p) => ({ id: p.id, url: images[p.id] }));
  return (
    <>
      <div
        className={`aspect-square bg-petal-50 p-1.5 grid gap-1 ${thumbs.length <= 1 ? "grid-cols-1" : "grid-cols-2 grid-rows-2"}`}
      >
        {thumbs.length === 0 ? (
          <div className="flex items-center justify-center text-petal-300">
            <I.sunglasses size={28} />
          </div>
        ) : (
          thumbs.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-lg overflow-hidden flex items-center justify-center"
            >
              {t.url && (
                <img
                  src={t.url}
                  alt=""
                  className="w-full h-full object-contain p-1"
                />
              )}
            </div>
          ))
        )}
      </div>
      <div className="p-2">
        <h3 className="font-display font-bold text-xs sm:text-sm truncate text-ink-900">
          {toTitle(outfit.name)}
        </h3>
        <p className="text-[8px] font-bold tracking-[0.12em] uppercase text-petal-600 mt-0.5">
          {pieces.length} {pieces.length === 1 ? "piece" : "pieces"}
        </p>
      </div>
    </>
  );
}

export { OutfitCardPreview };
