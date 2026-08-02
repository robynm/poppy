import { toTitle } from "../lib/format.js";
import { useBodyScrollLock } from "../lib/hooks.js";
import { useBackButton } from "../lib/backNav.js";
import { I } from "../lib/icons.jsx";

// --- VIEW DRAWER (read-only details) --------------------------------------
function ViewDrawer({ item, image, edits, onClose, onEdit }) {
  useBodyScrollLock();
  useBackButton(true, onClose);
  if (!item) return null;
  const inEdits = (edits || []).filter((e) => e.itemIds.includes(item.id));

  return (
    <div data-testid="view-drawer" className="fixed inset-0 z-50 flex sm:justify-end">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div
        className="relative w-full sm:max-w-md bg-white h-full overflow-y-auto shadow-2xl fade-up"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="p-4 sm:p-6 border-b border-cream-100 flex items-center justify-between bg-white">
          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500">
            Details
          </p>
          <button
            data-testid="view-close"
            onClick={onClose}
            className="text-ink-500 p-2 -m-2"
            aria-label="Close"
          >
            <I.x size={20} />
          </button>
        </div>

        <div className="px-4 sm:px-6 pt-6 pb-4 flex flex-col items-center">
          <div className="w-full max-w-xs aspect-[3/4] bg-poppy-gradient rounded-2xl overflow-hidden flex items-center justify-center">
            {image ? (
              <img
                src={image}
                alt={item.name}
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <I.shirt size={48} className="text-ink-400" />
            )}
          </div>
          <h3 className="font-display text-3xl mt-5 text-center">
            {toTitle(item.name)}
          </h3>
          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mt-1">
            {item.category}
          </p>
        </div>

        <div className="px-4 sm:px-6 pb-6 space-y-5">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full bg-ink-500 text-white border-ink-500 shadow-pop">
                {item.status || "owned"}
              </span>
            </div>
          </div>

          {item.brand && (
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
                Brand
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full bg-petal-600 text-white border-petal-600 shadow-pop">
                  {item.brand}
                </span>
              </div>
            </div>
          )}

          {item.yearPurchased && (
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
                Year Purchased
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full bg-buttercup-500 text-white border-buttercup-500 shadow-pop">
                  {item.yearPurchased}
                </span>
              </div>
            </div>
          )}

          {item.seasons && item.seasons.length > 0 && (
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
                Seasons
              </p>
              <div className="flex flex-wrap gap-2">
                {item.seasons.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full bg-leaf-500 text-white border-leaf-500 shadow-pop"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.occasions && item.occasions.length > 0 && (
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
                Occasions
              </p>
              <div className="flex flex-wrap gap-2">
                {item.occasions.map((o) => (
                  <span
                    key={o}
                    className="inline-flex items-center px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full bg-petal-500 text-white border-petal-500 shadow-pop"
                  >
                    {o}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.custom && item.custom.length > 0 && (
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {item.custom.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full bg-plum-500 text-white border-plum-500 shadow-pop"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {inEdits.length > 0 && (
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
                In Edits
              </p>
              <div className="flex flex-wrap gap-2">
                {inEdits.map((e) => (
                  <span
                    key={e.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full bg-petal-500 text-white border-petal-500 shadow-pop"
                  >
                    <I.layers size={11} /> {toTitle(e.name)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* No tags at all? friendly hint */}
          {(!item.seasons || item.seasons.length === 0) &&
            (!item.occasions || item.occasions.length === 0) &&
            (!item.custom || item.custom.length === 0) &&
            inEdits.length === 0 && (
              <p className="text-sm italic text-ink-500 text-center">
                No tags or edits yet — tap Edit to add some.
              </p>
            )}

          <button
            data-testid="view-edit"
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

export { ViewDrawer };
