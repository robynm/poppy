import { useRef, useState } from "react";
import { createPortal } from "react-dom";
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
const MENU_WIDTH = 180;

function SortMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const active = value !== "custom";

  // Drop the menu from the button, right-aligned to it (so it hangs under the
  // icon), then nudge it inward only as much as needed to stay on-screen.
  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const margin = 8;
      let left = r.right - MENU_WIDTH;
      left = Math.min(left, window.innerWidth - MENU_WIDTH - margin);
      left = Math.max(margin, left);
      setPos({ top: r.bottom + 8, left });
    }
    setOpen(true);
  };

  return (
    <div className="shrink-0">
      <button
        ref={btnRef}
        type="button"
        data-testid="sort-btn"
        aria-label="Sort"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`relative w-[42px] h-[42px] flex items-center justify-center border-2 rounded-full active:scale-95 transition-colors ${active ? "bg-poppy-500 text-white border-poppy-500 shadow-pop" : "bg-white border-cream-100 text-ink-700"}`}
      >
        <I.sort size={16} />
      </button>
      {open &&
        pos &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <div
              data-testid="sort-menu"
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: MENU_WIDTH,
              }}
              className="z-50 bg-white rounded-2xl shadow-card-hi border-2 border-cream-100 overflow-hidden"
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
          </>,
          document.body,
        )}
    </div>
  );
}

export { SortMenu };
