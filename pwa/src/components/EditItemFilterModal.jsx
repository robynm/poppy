import { useState } from "react";
import { toTitle } from "../lib/format.js";
import { useBodyScrollLock } from "../lib/hooks.js";
import { useBackButton } from "../lib/backNav.js";
import { I } from "../lib/icons.jsx";

// Pick one or more closet pieces to filter Edits down to the ones containing them.
function EditItemFilterModal({
  items,
  images,
  selected,
  onToggle,
  onClear,
  onClose,
}) {
  useBodyScrollLock();
  useBackButton(true, onClose);
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const list = q
    ? items.filter((i) => i.name.toLowerCase().includes(q))
    : items;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        data-testid="edit-item-filter-modal"
        className="relative bg-white w-full sm:max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl fade-up overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-cream-100 shrink-0">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500">
                Filter by piece
              </p>
              <h3 className="font-display text-2xl">Which pieces?</h3>
            </div>
            <button
              data-testid="edit-item-filter-close"
              onClick={onClose}
              className="text-ink-500 p-2 -m-2"
              aria-label="Close"
            >
              <I.x size={20} />
            </button>
          </div>
          <p className="text-xs text-ink-500">
            Show edits that include the pieces you pick.
          </p>
          {items.length > 8 && (
            <div className="mt-3 flex items-center gap-2 px-3.5 py-2 bg-cream-50 border-2 border-cream-100 rounded-full">
              <I.search size={14} className="text-poppy-500 shrink-0" />
              <input
                data-testid="edit-item-filter-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="search pieces…"
                className="flex-1 bg-transparent outline-none text-sm min-w-0"
              />
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          {list.length === 0 ? (
            <p className="text-sm italic text-ink-400 text-center py-8">
              No pieces match.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {list.map((it) => {
                const active = selected.includes(it.id);
                return (
                  <button
                    key={it.id}
                    type="button"
                    data-testid="filter-item"
                    data-item-id={it.id}
                    onClick={() => onToggle(it.id)}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all active:scale-[0.97] ${active ? "border-poppy-500 ring-2 ring-poppy-500/25 shadow-pop" : "border-cream-100 bg-white"}`}
                  >
                    <div className="aspect-square bg-poppy-gradient flex items-center justify-center">
                      {images[it.id] ? (
                        <img
                          src={images[it.id]}
                          alt={it.name}
                          className="w-full h-full object-contain p-1.5"
                        />
                      ) : (
                        <I.shirt size={18} className="text-poppy-300" />
                      )}
                    </div>
                    {active && (
                      <div className="absolute top-1.5 right-1.5 bg-poppy-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-pop">
                        <I.check size={11} />
                      </div>
                    )}
                    <p className="text-[9px] font-bold font-display text-ink-800 truncate px-1.5 py-1">
                      {toTitle(it.name)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 sm:p-6 border-t border-cream-100 shrink-0 flex gap-2"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
        >
          <button
            data-testid="edit-item-filter-clear"
            onClick={onClear}
            disabled={selected.length === 0}
            className="flex-1 py-3.5 bg-cream-50 border-2 border-cream-100 text-ink-700 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 disabled:opacity-40"
          >
            Clear
          </button>
          <button
            data-testid="edit-item-filter-done"
            onClick={onClose}
            className="flex-[2] flex items-center justify-center gap-2 py-3.5 bg-poppy-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-poppy"
          >
            <I.check size={14} /> Done{selected.length > 0 && ` · ${selected.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export { EditItemFilterModal };
