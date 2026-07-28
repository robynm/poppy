import { useState, useEffect, useRef } from "react";
import { I } from "../lib/icons.jsx";

// --- EDIT DRAWER ----------------------------------------------------------
// Brand picker: autocompletes against existing brands, lets you add a new one.
function BrandCombobox({ value, brands, onChange, onAddBrand }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const all = (brands || []).slice().sort((a, b) => a.localeCompare(b));
  const q = query.trim();
  const filtered = q
    ? all.filter((b) => b.toLowerCase().includes(q.toLowerCase()))
    : all;
  const exact = all.find((b) => b.toLowerCase() === q.toLowerCase());
  const canAdd = q.length > 0 && !exact;

  const select = (b) => {
    onChange(b);
    setQuery("");
    setOpen(false);
  };
  const addNew = () => {
    if (!q) return;
    const existing = (brands || []).find(
      (x) => x.toLowerCase() === q.toLowerCase(),
    );
    const canonical = existing || q;
    if (!existing && onAddBrand) onAddBrand(canonical);
    select(canonical);
  };

  return (
    <div ref={wrapRef} className="relative mb-6">
      <div className="flex items-center gap-2 border-b border-cream-200 focus-within:border-poppy-500">
        <input
          value={open ? query : value || ""}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (canAdd) addNew();
              else if (filtered.length === 1) select(filtered[0]);
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={value ? "" : "search or add a brand…"}
          className="flex-1 bg-transparent outline-none text-sm py-1"
        />
        {value && !open && (
          <button
            onClick={() => onChange("")}
            aria-label="Clear brand"
            className="text-ink-400 p-1 active:scale-90"
          >
            <I.x size={14} />
          </button>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle brand list"
          className="text-ink-400 p-1"
        >
          <I.chevron
            size={14}
            className={`transition-transform ${open ? "-rotate-90" : "rotate-90"}`}
          />
        </button>
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white border-2 border-cream-100 rounded-2xl shadow-card max-h-60 overflow-y-auto py-1">
          {filtered.length === 0 && !canAdd && (
            <p className="px-3 py-2 text-xs text-ink-400 italic">
              no brands yet — type to add one
            </p>
          )}
          {filtered.map((b) => (
            <button
              key={b}
              onClick={() => select(b)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between active:bg-cream-50 ${value === b ? "text-petal-700 font-semibold" : "text-ink-700"}`}
            >
              <span className="truncate">{b}</span>
              {value === b && (
                <I.check size={14} className="text-petal-600 shrink-0" />
              )}
            </button>
          ))}
          {canAdd && (
            <button
              onClick={addNew}
              className="w-full text-left px-3 py-2 text-sm text-poppy-600 font-semibold active:bg-cream-50"
            >
              + Add “{q}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { BrandCombobox };
