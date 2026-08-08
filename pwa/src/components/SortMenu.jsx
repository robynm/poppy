import { useState } from "react";
import { I } from "../lib/icons.jsx";

// Shared sort control for the Closet and Edits grids. Emits a sort key; the
// caller does the actual sorting (it knows how to count wears for its items).
const SORT_OPTIONS = [
  { key: "custom", label: "Custom order" },
  { key: "newest", label: "Newest added" },
  { key: "oldest", label: "Oldest added" },
  { key: "worn-desc", label: "Most worn" },
  { key: "worn-asc", label: "Least worn" },
];

function SortMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const active = value !== "custom";
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        data-testid="sort-btn"
        aria-label="Sort"
        onClick={() => setOpen((o) => !o)}
        className={`relative w-[42px] h-[42px] flex items-center justify-center border-2 rounded-full active:scale-95 transition-colors ${active ? "bg-poppy-500 text-white border-poppy-500 shadow-pop" : "bg-white border-cream-100 text-ink-700"}`}
      >
        <I.sort size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            data-testid="sort-menu"
            className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-card-hi border-2 border-cream-100 overflow-hidden min-w-[180px]"
          >
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold tracking-[0.2em] uppercase text-ink-400">
              Sort by
            </p>
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                data-testid={`sort-option-${o.key}`}
                onClick={() => {
                  onChange(o.key);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-bold active:bg-cream-50 ${value === o.key ? "text-poppy-600" : "text-ink-700"}`}
              >
                {o.label}
                {value === o.key && <I.check size={15} className="shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export { SortMenu };
