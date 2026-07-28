import { useState } from "react";
import { Chip } from "./Chip.jsx";
import { OCCASION_OPTIONS, SEASON_OPTIONS, STATUS_OPTIONS } from "../lib/constants.js";
import { toTitle } from "../lib/format.js";
import { useBodyScrollLock } from "../lib/hooks.js";
import { I } from "../lib/icons.jsx";

// --- BULK ACTION SHEET ----------------------------------------------------
function BulkSheet({
  type,
  selectedIds,
  items,
  customTags,
  collections,
  outfits,
  onSaveItems,
  onSaveCustomTags,
  onSaveCollections,
  onSaveOutfits,
  onClose,
}) {
  useBodyScrollLock();
  const count = selectedIds.size;

  // Tags: which to add
  const [applyStatus, setApplyStatus] = useState(null); // null = don't change
  const [applyYear, setApplyYear] = useState(""); // "" = don't change
  const [addSeasons, setAddSeasons] = useState([]);
  const [addOccasions, setAddOccasions] = useState([]);
  const [addCustom, setAddCustom] = useState([]);
  const [newTag, setNewTag] = useState("");

  const toggleTag = (list, setList, v) =>
    setList((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );

  const addNewTag = () => {
    const t = newTag.trim().toLowerCase();
    if (!t) return;
    if (!customTags.includes(t)) onSaveCustomTags([...customTags, t]);
    if (!addCustom.includes(t)) setAddCustom((prev) => [...prev, t]);
    setNewTag("");
  };

  // Collections / Outfits: track desired state per id ("all" | "some" | "none")
  const [collState, setCollState] = useState(() => {
    const ids = [...selectedIds];
    const m = {};
    (collections || []).forEach((c) => {
      const allIn = ids.every((id) => c.itemIds.includes(id));
      m[c.id] = allIn
        ? "all"
        : ids.some((id) => c.itemIds.includes(id))
          ? "some"
          : "none";
    });
    return m;
  });
  const [outfitState, setOutfitState] = useState(() => {
    const ids = [...selectedIds];
    const m = {};
    (outfits || []).forEach((o) => {
      const allIn = ids.every((id) => o.itemIds.includes(id));
      m[o.id] = allIn
        ? "all"
        : ids.some((id) => o.itemIds.includes(id))
          ? "some"
          : "none";
    });
    return m;
  });

  const toggleColl = (id) =>
    setCollState((prev) => ({
      ...prev,
      [id]: prev[id] === "all" ? "none" : "all",
    }));
  const toggleOutfit = (id) =>
    setOutfitState((prev) => ({
      ...prev,
      [id]: prev[id] === "all" ? "none" : "all",
    }));

  const apply = () => {
    const arr = [...selectedIds];
    if (type === "tags") {
      onSaveItems(
        items.map((it) => {
          if (!selectedIds.has(it.id)) return it;
          return {
            ...it,
            ...(applyStatus ? { status: applyStatus } : {}),
            ...(applyYear ? { yearPurchased: applyYear } : {}),
            seasons: [...new Set([...(it.seasons || []), ...addSeasons])],
            occasions: [...new Set([...(it.occasions || []), ...addOccasions])],
            custom: [...new Set([...(it.custom || []), ...addCustom])],
          };
        }),
      );
    } else if (type === "collections") {
      onSaveCollections(
        (collections || []).map((c) => {
          const d = collState[c.id];
          if (d === "all")
            return { ...c, itemIds: [...new Set([...c.itemIds, ...arr])] };
          if (d === "none")
            return {
              ...c,
              itemIds: c.itemIds.filter((id) => !selectedIds.has(id)),
            };
          return c;
        }),
      );
    } else if (type === "outfits") {
      onSaveOutfits(
        (outfits || []).map((o) => {
          const d = outfitState[o.id];
          if (d === "all")
            return { ...o, itemIds: [...new Set([...o.itemIds, ...arr])] };
          if (d === "none")
            return {
              ...o,
              itemIds: o.itemIds.filter((id) => !selectedIds.has(id)),
            };
          return o;
        }),
      );
    }
    onClose();
  };

  const titles = {
    tags: "Apply Tags",
    collections: "Collections",
    outfits: "Outfits",
  };

  return (
    <div className="fixed inset-0 z-50 flex sm:justify-end">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative w-full sm:max-w-md bg-white shadow-2xl fade-up flex flex-col h-full">
        <div className="p-4 sm:p-6 border-b border-cream-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500">
              {count} item{count !== 1 ? "s" : ""} selected
            </p>
            <h3 className="font-display text-2xl">{titles[type]}</h3>
          </div>
          <button onClick={onClose} className="text-ink-500 p-2 -m-2">
            <I.x size={20} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {type === "tags" && (
            <>
              <p className="text-sm text-ink-600">
                Selected tags will be added to all {count} items. Existing tags
                are preserved.
              </p>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
                  Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <Chip
                      key={s}
                      tone="status"
                      active={applyStatus === s}
                      onClick={() =>
                        setApplyStatus((prev) => (prev === s ? null : s))
                      }
                    >
                      {s}
                    </Chip>
                  ))}
                </div>
                {applyStatus && (
                  <p className="text-[10px] text-ink-400 mt-1.5">
                    Status will be set to "{applyStatus}" on all selected items.
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
                  Year Purchased
                </p>
                <input
                  value={applyYear}
                  onChange={(e) =>
                    setApplyYear(
                      e.target.value.replace(/[^0-9]/g, "").slice(0, 4),
                    )
                  }
                  inputMode="numeric"
                  placeholder="e.g. 2024"
                  className="w-full bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none text-sm py-1"
                />
                {applyYear && (
                  <p className="text-[10px] text-ink-400 mt-1.5">
                    Year purchased will be set to "{applyYear}" on all selected
                    items.
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
                  Seasons
                </p>
                <div className="flex flex-wrap gap-2">
                  {SEASON_OPTIONS.map((s) => (
                    <Chip
                      key={s}
                      tone="season"
                      active={addSeasons.includes(s)}
                      onClick={() => toggleTag(addSeasons, setAddSeasons, s)}
                    >
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
                  Occasions
                </p>
                <div className="flex flex-wrap gap-2">
                  {OCCASION_OPTIONS.map((o) => (
                    <Chip
                      key={o}
                      tone="occasion"
                      active={addOccasions.includes(o)}
                      onClick={() =>
                        toggleTag(addOccasions, setAddOccasions, o)
                      }
                    >
                      {o}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
                  Custom Tags
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(() => {
                    const shownTags = customTags.filter(
                      (t) =>
                        addCustom.includes(t) ||
                        items.some((i) => (i.custom || []).includes(t)),
                    );
                    if (shownTags.length === 0)
                      return (
                        <span className="text-xs text-ink-400 italic">
                          none yet — add one below
                        </span>
                      );
                    return shownTags.map((t) => (
                      <Chip
                        key={t}
                        tone="custom"
                        active={addCustom.includes(t)}
                        onClick={() => toggleTag(addCustom, setAddCustom, t)}
                      >
                        {t}
                      </Chip>
                    ));
                  })()}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addNewTag()}
                    placeholder="new tag…"
                    className="flex-1 bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none text-sm py-1"
                  />
                  <button
                    onClick={addNewTag}
                    className="px-4 py-1.5 bg-poppy-500 text-white text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop"
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          )}

          {type === "collections" &&
            ((collections || []).length === 0 ? (
              <p className="text-sm text-ink-500 italic">No collections yet.</p>
            ) : (
              <div className="space-y-2">
                {(collections || []).map((c) => {
                  const st = collState[c.id] || "none";
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleColl(c.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${st === "all" ? "bg-sky2-500 text-white border-sky2-500 shadow-pop" : "bg-white border-cream-100 text-ink-700 active:border-sky2-200"}`}
                    >
                      <I.suitcase size={16} className="shrink-0" />
                      <span className="flex-1 font-display font-bold text-lg truncate">
                        {toTitle(c.name)}
                      </span>
                      {st === "some" && (
                        <span className="text-[9px] font-bold tracking-[0.15em] uppercase opacity-70">
                          partial
                        </span>
                      )}
                      {st === "all" && (
                        <I.check size={16} className="shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

          {type === "outfits" &&
            ((outfits || []).length === 0 ? (
              <p className="text-sm text-ink-500 italic">No outfits yet.</p>
            ) : (
              <div className="space-y-2">
                {(outfits || []).map((o) => {
                  const st = outfitState[o.id] || "none";
                  return (
                    <button
                      key={o.id}
                      onClick={() => toggleOutfit(o.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${st === "all" ? "bg-petal-500 text-white border-petal-500 shadow-pop" : "bg-white border-cream-100 text-ink-700 active:border-petal-200"}`}
                    >
                      <I.sunglasses size={16} className="shrink-0" />
                      <span className="flex-1 font-display font-bold text-lg truncate">
                        {toTitle(o.name)}
                      </span>
                      {st === "some" && (
                        <span className="text-[9px] font-bold tracking-[0.15em] uppercase opacity-70">
                          partial
                        </span>
                      )}
                      {st === "all" && (
                        <I.check size={16} className="shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
        </div>

        <div
          className="p-4 sm:p-6 border-t border-cream-100 bg-white shrink-0"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)" }}
        >
          <button
            onClick={apply}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-poppy-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-poppy"
          >
            <I.check size={14} /> Apply to {count} item{count !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

export { BulkSheet };
