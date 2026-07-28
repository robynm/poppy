import { toTitle } from "../lib/format.js";
import { I } from "../lib/icons.jsx";

// Compact thumbnail + label block for a collection — used by reorder tiles and the drag ghost.
function CollectionCardPreview({ collection, items, images }) {
  const pieces = items.filter((i) => collection.itemIds.includes(i.id));
  const thumbs = pieces.slice(0, 4);
  return (
    <>
      <div
        className={`aspect-square bg-sky2-50 p-1.5 grid gap-1 ${thumbs.length <= 1 ? "grid-cols-1" : "grid-cols-2 grid-rows-2"}`}
      >
        {thumbs.length === 0 ? (
          <div className="flex items-center justify-center text-sky2-300">
            <I.suitcase size={28} />
          </div>
        ) : (
          thumbs.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-lg overflow-hidden flex items-center justify-center"
            >
              {images[p.id] && (
                <img
                  src={images[p.id]}
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
          {toTitle(collection.name)}
        </h3>
        <p className="text-[8px] font-bold tracking-[0.12em] uppercase text-sky2-600 mt-0.5">
          {pieces.length} {pieces.length === 1 ? "piece" : "pieces"}
        </p>
      </div>
    </>
  );
}

export { CollectionCardPreview };
