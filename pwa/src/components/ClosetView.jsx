import { useState, useEffect, useMemo, useRef } from "react";
import { AddItemModal } from "./AddItemModal.jsx";
import { BulkSheet } from "./BulkSheet.jsx";
import { Chip } from "./Chip.jsx";
import { EditDrawer } from "./EditDrawer.jsx";
import { FilterRow } from "./FilterRow.jsx";
import { ItemCard } from "./ItemCard.jsx";
import { RemovableChip } from "./RemovableChip.jsx";
import { SortMenu } from "./SortMenu.jsx";
import { ViewDrawer } from "./ViewDrawer.jsx";
import { CATEGORY_OPTIONS, OCCASION_OPTIONS, SEASON_OPTIONS, STATUS_OPTIONS } from "../lib/constants.js";
import { toTitle } from "../lib/format.js";
import { useDragReorder } from "../lib/hooks.js";
import { I } from "../lib/icons.jsx";
import { resizeImageToBlob } from "../lib/images.js";

// --- CLOSET VIEW ----------------------------------------------------------
function ClosetView({
  items,
  images,
  customTags,
  brands,
  edits,
  selfies,
  activeEdit,
  onSetActiveEdit,
  onSaveItems,
  onPutImage,
  onDeleteImage,
  onSaveCustomTags,
  onSaveBrands,
  onSaveEdits,
  onSetHeaderAction,
  onOpenStats,
}) {
  const [activeCategories, setActiveCategories] = useState([]);
  const [activeSeasons, setActiveSeasons] = useState([]);
  const [activeOccasions, setActiveOccasions] = useState([]);
  const [activeCustom, setActiveCustom] = useState([]);
  const [activeStatuses, setActiveStatuses] = useState(["owned"]);
  const [activeBrands, setActiveBrands] = useState([]);
  const [activeYears, setActiveYears] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const addButtonRef = useRef(null);
  useEffect(() => {
    const el = addButtonRef.current;
    if (!el || !onSetHeaderAction) return;
    const obs = new IntersectionObserver(
      ([entry]) =>
        onSetHeaderAction(
          entry.isIntersecting
            ? null
            : {
                label: "Add a Piece",
                tone: "poppy",
                onClick: () => setAdding(true),
              },
        ),
      { threshold: 0.5, rootMargin: "-68px 0px 0px 0px" },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      onSetHeaderAction(null);
    };
  }, []);
  const [viewing, setViewing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkSheet, setBulkSheet] = useState(null); // "tags" | "edits"
  const [dragMode, setDragMode] = useState(false);
  const [sortMode, setSortMode] = useState("custom");
  const setActiveEdit = onSetActiveEdit;

  // A piece's "wears" = snaps it's tagged in (mirrors the Most-worn stat).
  const wearCount = useMemo(() => {
    const m = {};
    (selfies || []).forEach((s) =>
      (s.itemIds || []).forEach((id) => {
        m[id] = (m[id] || 0) + 1;
      }),
    );
    return m;
  }, [selfies]);

  const toggle = (list, setList, v) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setBulkSheet(null);
  };
  const enterDragMode = () => {
    setDragMode(true);
    setSelectMode(false);
    setSelectedIds(new Set());
    setBulkSheet(null);
  };
  const toggleItemSelect = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
    if (next.size === 0) {
      setSelectMode(false);
      setBulkSheet(null);
    } else setSelectMode(true);
  };

  const activeEditObj = activeEdit
    ? edits.find((e) => e.id === activeEdit)
    : null;

  const filtered = useMemo(
    () =>
      items.filter((it) => {
        if (activeEditObj && !activeEditObj.itemIds.includes(it.id))
          return false;
        if (
          activeStatuses.length &&
          !activeStatuses.includes(it.status || "owned")
        )
          return false;
        if (activeBrands.length && !activeBrands.includes(it.brand || ""))
          return false;
        if (activeYears.length && !activeYears.includes(it.yearPurchased || ""))
          return false;
        if (activeCategories.length && !activeCategories.includes(it.category))
          return false;
        if (
          activeSeasons.length &&
          !activeSeasons.some((s) => it.seasons?.includes(s))
        )
          return false;
        if (
          activeOccasions.length &&
          !activeOccasions.some((o) => it.occasions?.includes(o))
        )
          return false;
        if (
          activeCustom.length &&
          !activeCustom.some((t) => it.custom?.includes(t))
        )
          return false;
        if (search && !it.name.toLowerCase().includes(search.toLowerCase()))
          return false;
        return true;
      }),
    [
      items,
      activeEditObj,
      activeStatuses,
      activeBrands,
      activeYears,
      activeCategories,
      activeSeasons,
      activeOccasions,
      activeCustom,
      search,
    ],
  );

  // Sorting is view-only (leaves the stored order untouched). "custom" keeps
  // the manual/drag order; the reorder handle only shows in custom mode.
  const sorted = useMemo(() => {
    if (sortMode === "custom") return filtered;
    const arr = [...filtered];
    if (sortMode === "worn-desc" || sortMode === "worn-asc") {
      const w = (it) => wearCount[it.id] || 0;
      arr.sort((a, b) =>
        sortMode === "worn-desc" ? w(b) - w(a) : w(a) - w(b),
      );
    } else {
      const t = (it) => it.createdAt || 0;
      arr.sort((a, b) => (sortMode === "newest" ? t(b) - t(a) : t(a) - t(b)));
    }
    return arr;
  }, [filtered, sortMode, wearCount]);

  // Distinct purchase years present in the closet, most recent first
  const years = useMemo(
    () =>
      [...new Set(items.map((i) => i.yearPurchased).filter(Boolean))].sort(
        (a, b) => b.localeCompare(a),
      ),
    [items],
  );

  // Custom tags actually applied to at least one item — unused tags don't surface in filters
  const usedCustomTags = useMemo(
    () =>
      customTags.filter((t) => items.some((i) => (i.custom || []).includes(t))),
    [customTags, items],
  );

  const selectAll = () => setSelectedIds(new Set(filtered.map((i) => i.id)));

  const handleAddItem = async (file) => {
    if (!file) return;
    const blob = await resizeImageToBlob(file, 640, 0.85);
    const id = `i_${Date.now()}`;
    const newItem = {
      id,
      name:
        file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[_-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()) || "New Item",
      category: "top",
      seasons: [],
      occasions: [],
      custom: [],
      status: "owned",
      brand: "",
      yearPurchased: "",
      createdAt: Date.now(),
    };
    onSaveItems([newItem, ...items]);
    if (blob) await onPutImage(id, blob);
    setAdding(false);
    setEditing(id);
  };

  const handleDelete = (id) => {
    onSaveItems(items.filter((i) => i.id !== id));
    onDeleteImage(id);
    // Remove the deleted item from any edit it belongs to
    onSaveEdits(
      (edits || []).map((e) => ({
        ...e,
        itemIds: e.itemIds.filter((x) => x !== id),
      })),
    );
    if (editing === id) setEditing(null);
  };

  const handleUpdate = (updated) =>
    onSaveItems(items.map((i) => (i.id === updated.id ? updated : i)));

  // Reorder within the visible filtered list. fromVisible/toVisible are indices into `filtered`.
  // We translate them into master-array positions, preserving the position of filtered-out items.
  const handleReorder = (fromVisible, toVisible) => {
    if (fromVisible === toVisible) return;
    const visibleIds = filtered.map((i) => i.id);
    const movingId = visibleIds[fromVisible];
    if (!movingId) return;

    // Step 1: figure out where the moving id should land in the master array.
    // We want it positioned just before the item currently at `toVisible` in the visible list,
    // unless we're moving down past it — in which case, after it.
    const targetVisibleId = visibleIds[toVisible];
    const masterFromIndex = items.findIndex((i) => i.id === movingId);

    // Remove the moving item from the master array first
    const without = items.filter((i) => i.id !== movingId);

    // Find target's index in the new (without) array
    let masterToIndex;
    if (!targetVisibleId || targetVisibleId === movingId) {
      // Should not normally happen, but fall back to original position
      masterToIndex = masterFromIndex;
    } else {
      const targetIndexInWithout = without.findIndex(
        (i) => i.id === targetVisibleId,
      );
      // If we moved DOWN (fromVisible < toVisible), the item should appear AFTER the target.
      // If we moved UP, it should appear BEFORE.
      masterToIndex =
        fromVisible < toVisible
          ? targetIndexInWithout + 1
          : targetIndexInWithout;
    }

    const next = [...without];
    next.splice(masterToIndex, 0, items[masterFromIndex]);
    onSaveItems(next);
  };

  const {
    register,
    dragIndex,
    hoverIndex,
    ghostRef,
    startRectRef,
    grabOffsetRef,
    lastPointerRef,
    onHandlePointerDown,
  } = useDragReorder(handleReorder);

  const filterCount =
    activeCategories.length +
    activeSeasons.length +
    activeOccasions.length +
    activeCustom.length +
    (activeEdit ? 1 : 0) +
    (activeStatuses.length === 1 && activeStatuses[0] === "owned" ? 0 : 1) +
    activeBrands.length +
    activeYears.length;

  const counts = useMemo(() => {
    const src = filterCount > 0 ? filtered : items;
    const byCat = {};
    CATEGORY_OPTIONS.forEach((c) => {
      byCat[c] = src.filter((i) => i.category === c).length;
    });
    return { total: src.length, byCat };
  }, [items, filtered, filterCount]);

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="fade-up">
          <div className="mb-6 sm:mb-10">
            <h2 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900 mb-2">
              Your closet,
            </h2>
            <div className="mb-6 sm:mb-10 flex items-end justify-between gap-4">
              <h3 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900">
                <em className="text-poppy-600">cultivated.</em>
              </h3>
              {!selectMode && (
                <button
                  ref={addButtonRef}
                  onClick={() => setAdding(true)}
                  data-testid="add-piece-btn"
                  style={{ flexShrink: 0 }}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-poppy-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-poppy"
                >
                  <I.plus size={16} /> Add a Piece
                </button>
              )}
            </div>
            <p className="mt-3 sm:mt-4 text-ink-600 text-sm sm:text-base max-w-xl flex items-center gap-2">
              {(() => {
                const labels = {
                  top: "tops",
                  bottom: "bottoms",
                  dress: "dresses",
                  outerwear: "outerwear",
                  shoes: "shoes",
                  accessory: "accessories",
                };
                const visible = ["top", "bottom"];
                return (
                  <>
                    <span>
                      <span className="font-bold text-ink-800">
                        {counts.total}
                      </span>{" "}
                      pieces
                      {visible.map((c) => (
                        <span key={c}>
                          {" "}
                          ·{" "}
                          <span className="font-bold text-ink-800">
                            {counts.byCat[c]}
                          </span>{" "}
                          {labels[c]}
                        </span>
                      ))}
                    </span>
                  </>
                );
              })()}
              {onOpenStats && (
                <button
                  onClick={onOpenStats}
                  aria-label="View stats"
                  className="w-7 h-7 flex items-center justify-center rounded-full text-ink-400 active:bg-poppy-50 active:text-poppy-600 transition-colors"
                >
                  <I.pie size={15} />
                </button>
              )}
            </p>
          </div>

          {activeEditObj && activeEditObj.note && (
            <p className="text-sm italic text-ink-500 mb-4">
              "{activeEditObj.note}"
            </p>
          )}

          {/* Add button / select mode bar */}
          <div className="mb-3">
            {selectMode && (
              <div className="flex items-center gap-3 py-1 bg-poppy-50 px-4 py-2.5 rounded-full">
                <span className="text-sm font-bold text-poppy-700">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={selectAll}
                  className="text-[10px] font-bold tracking-[0.15em] uppercase text-poppy-600 underline active:text-poppy-700"
                >
                  All
                </button>
                <button
                  onClick={exitSelectMode}
                  className="text-[10px] font-bold tracking-[0.15em] uppercase text-poppy-600 underline active:text-poppy-700"
                >
                  None
                </button>
              </div>
            )}
          </div>

          {/* Search + filter toggle */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              data-testid="filters-toggle"
              className={`relative px-4 py-2.5 border-2 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase active:scale-95 shrink-0 transition-colors ${filterCount > 0 ? "bg-poppy-500 text-white border-poppy-500 shadow-pop" : "bg-white border-cream-100 text-ink-700"}`}
            >
              Filters{filterCount > 0 && ` · ${filterCount}`}
            </button>
            <SortMenu value={sortMode} onChange={setSortMode} />
            {sortMode === "custom" && (
              <button
                onClick={() => (dragMode ? setDragMode(false) : enterDragMode())}
                aria-label={dragMode ? "Exit reorder mode" : "Reorder items"}
                className={`relative w-[42px] h-[42px] flex items-center justify-center border-2 rounded-full active:scale-95 shrink-0 transition-colors ${dragMode ? "bg-ink-800 text-white border-ink-800" : "bg-white border-cream-100 text-ink-700"}`}
              >
                {dragMode ? <I.check size={16} /> : <I.grip size={16} />}
              </button>
            )}
          </div>

          {/* Collapsible filters */}
          {showFilters && (
            <div
              data-testid="filter-panel"
              className="mb-6 p-4 sm:p-5 bg-white border-2 border-cream-100 rounded-3xl fade-up shadow-card"
            >
              <FilterRow label="Status">
                {STATUS_OPTIONS.map((s) => (
                  <Chip
                    key={s}
                    tone="status"
                    active={activeStatuses.includes(s)}
                    onClick={() => toggle(activeStatuses, setActiveStatuses, s)}
                  >
                    {s}
                  </Chip>
                ))}
              </FilterRow>
              {edits.length > 0 && (
                <FilterRow label="Edit">
                  <Chip
                    tone="collection"
                    active={activeEdit === null}
                    onClick={() => setActiveEdit(null)}
                  >
                    Entire Closet
                  </Chip>
                  {edits.map((e) => (
                    <Chip
                      key={e.id}
                      tone="collection"
                      active={activeEdit === e.id}
                      onClick={() =>
                        setActiveEdit(activeEdit === e.id ? null : e.id)
                      }
                    >
                      {toTitle(e.name)}
                    </Chip>
                  ))}
                </FilterRow>
              )}
              <FilterRow label="Category">
                {CATEGORY_OPTIONS.map((c) => (
                  <Chip
                    key={c}
                    tone="category"
                    active={activeCategories.includes(c)}
                    onClick={() =>
                      toggle(activeCategories, setActiveCategories, c)
                    }
                  >
                    {c}
                  </Chip>
                ))}
              </FilterRow>
              <FilterRow label="Season">
                {SEASON_OPTIONS.map((s) => (
                  <Chip
                    key={s}
                    tone="season"
                    active={activeSeasons.includes(s)}
                    onClick={() => toggle(activeSeasons, setActiveSeasons, s)}
                  >
                    {s}
                  </Chip>
                ))}
              </FilterRow>
              <FilterRow label="Occasion">
                {OCCASION_OPTIONS.map((o) => (
                  <Chip
                    key={o}
                    tone="occasion"
                    active={activeOccasions.includes(o)}
                    onClick={() =>
                      toggle(activeOccasions, setActiveOccasions, o)
                    }
                  >
                    {o}
                  </Chip>
                ))}
              </FilterRow>
              {brands.length > 0 && (
                <FilterRow label="Brand">
                  {brands
                    .slice()
                    .sort((a, b) => a.localeCompare(b))
                    .map((b) => (
                      <Chip
                        key={b}
                        tone="brand"
                        active={activeBrands.includes(b)}
                        onClick={() => toggle(activeBrands, setActiveBrands, b)}
                      >
                        {b}
                      </Chip>
                    ))}
                </FilterRow>
              )}
              {usedCustomTags.length > 0 && (
                <FilterRow label="Custom">
                  {usedCustomTags.map((t) => (
                    <Chip
                      key={t}
                      tone="custom"
                      active={activeCustom.includes(t)}
                      onClick={() => toggle(activeCustom, setActiveCustom, t)}
                    >
                      {t}
                    </Chip>
                  ))}
                </FilterRow>
              )}
              {years.length > 0 && (
                <FilterRow label="Year">
                  {years.map((y) => (
                    <Chip
                      key={y}
                      tone="year"
                      active={activeYears.includes(y)}
                      onClick={() => toggle(activeYears, setActiveYears, y)}
                    >
                      {y}
                    </Chip>
                  ))}
                </FilterRow>
              )}
              {filterCount > 0 && (
                <button
                  onClick={() => {
                    setActiveCategories([]);
                    setActiveSeasons([]);
                    setActiveOccasions([]);
                    setActiveCustom([]);
                    setActiveEdit(null);
                    setActiveStatuses(["owned"]);
                    setActiveBrands([]);
                    setActiveYears([]);
                  }}
                  className="mt-2 text-[10px] tracking-[0.2em] uppercase text-ink-500 underline"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {/* Active filters summary — shown when the drawer is closed */}
          {!showFilters && filterCount > 0 && (
            <div
              data-testid="active-filters"
              className="mb-4 flex flex-wrap items-center gap-2"
            >
              {activeEdit && activeEditObj && (
                <RemovableChip
                  tone="collection"
                  onRemove={() => setActiveEdit(null)}
                >
                  <I.layers size={11} /> {toTitle(activeEditObj.name)}
                </RemovableChip>
              )}
              {!(
                activeStatuses.length === 1 && activeStatuses[0] === "owned"
              ) &&
                (activeStatuses.length === 0 ? (
                  <RemovableChip
                    tone="status"
                    onRemove={() => setActiveStatuses(["owned"])}
                  >
                    All statuses
                  </RemovableChip>
                ) : (
                  activeStatuses.map((s) => (
                    <RemovableChip
                      key={`st-${s}`}
                      tone="status"
                      onRemove={() =>
                        toggle(activeStatuses, setActiveStatuses, s)
                      }
                    >
                      {s}
                    </RemovableChip>
                  ))
                ))}
              {activeBrands.map((b) => (
                <RemovableChip
                  key={`b-${b}`}
                  tone="brand"
                  onRemove={() => toggle(activeBrands, setActiveBrands, b)}
                >
                  {b}
                </RemovableChip>
              ))}
              {activeCategories.map((c) => (
                <RemovableChip
                  key={`cat-${c}`}
                  tone="category"
                  onRemove={() =>
                    toggle(activeCategories, setActiveCategories, c)
                  }
                >
                  {c}
                </RemovableChip>
              ))}
              {activeSeasons.map((s) => (
                <RemovableChip
                  key={`s-${s}`}
                  tone="season"
                  onRemove={() => toggle(activeSeasons, setActiveSeasons, s)}
                >
                  {s}
                </RemovableChip>
              ))}
              {activeOccasions.map((o) => (
                <RemovableChip
                  key={`o-${o}`}
                  tone="occasion"
                  onRemove={() =>
                    toggle(activeOccasions, setActiveOccasions, o)
                  }
                >
                  {o}
                </RemovableChip>
              ))}
              {activeCustom.map((t) => (
                <RemovableChip
                  key={`c-${t}`}
                  tone="custom"
                  onRemove={() => toggle(activeCustom, setActiveCustom, t)}
                >
                  {t}
                </RemovableChip>
              ))}
              {activeYears.map((y) => (
                <RemovableChip
                  key={`y-${y}`}
                  tone="year"
                  onRemove={() => toggle(activeYears, setActiveYears, y)}
                >
                  {y}
                </RemovableChip>
              ))}
              <button
                onClick={() => {
                  setActiveCategories([]);
                  setActiveSeasons([]);
                  setActiveOccasions([]);
                  setActiveCustom([]);
                  setActiveEdit(null);
                  setActiveStatuses(["owned"]);
                  setActiveBrands([]);
                  setActiveYears([]);
                }}
                className="text-[10px] tracking-[0.2em] uppercase text-ink-500 underline active:text-poppy-600 ml-1"
              >
                Clear all
              </button>
            </div>
          )}

          {filterCount > 0 && (
            <p className="text-xs text-ink-400 mb-3">
              Showing{" "}
              <span className="font-bold text-ink-600">{filtered.length}</span>{" "}
              of <span className="font-bold text-ink-600">{items.length}</span>{" "}
              pieces
            </p>
          )}

          <div className="flex-1 h-px bg-cream-200 mb-3"></div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-cream-200 bg-cream-50/50 rounded-3xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-poppy-100 flex items-center justify-center">
                <I.search size={26} className="text-poppy-500" />
              </div>
              <p className="font-display font-bold text-xl text-ink-900">
                Nothing matches.
              </p>
              <p className="text-xs font-bold tracking-widest uppercase text-poppy-600 mt-2">
                Try clearing a filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2">
              {sorted.map((item, i) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  image={images[item.id]}
                  wears={wearCount[item.id] || 0}
                  onClick={dragMode ? undefined : () => setViewing(item.id)}
                  onSelectToggle={
                    dragMode ? undefined : () => toggleItemSelect(item.id)
                  }
                  isSelected={selectedIds.has(item.id)}
                  delay={Math.min(i, 16) * 25}
                  cardRef={(el) => register(i, el)}
                  reorderHandle={dragMode ? onHandlePointerDown(i) : null}
                  isDragging={dragMode && dragIndex === i}
                  isDropTarget={
                    dragMode &&
                    dragIndex !== null &&
                    hoverIndex === i &&
                    dragIndex !== i
                  }
                  compact={dragMode}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {dragIndex !== null &&
        filtered[dragIndex] &&
        (() => {
          const item = filtered[dragIndex];
          const image = images[item.id];
          const tx = lastPointerRef.current.x - grabOffsetRef.current.x;
          const ty = lastPointerRef.current.y - grabOffsetRef.current.y;
          return (
            <div
              ref={(el) => {
                ghostRef.current = el;
                if (el)
                  el.style.transform = `translate(${tx}px, ${ty}px) rotate(1.5deg) scale(1.05)`;
              }}
              className={`pointer-events-none fixed left-0 top-0 z-50 bg-white border-2 border-poppy-300 overflow-hidden ${dragMode ? "rounded-2xl" : "rounded-3xl"}`}
              style={{
                width: startRectRef.current?.width,
                willChange: "transform",
                boxShadow: "0 22px 60px rgba(255, 90, 54, 0.35)",
              }}
            >
              <div
                className={`${dragMode ? "aspect-square" : "aspect-[3/4]"} bg-poppy-gradient flex items-center justify-center overflow-hidden`}
              >
                {image ? (
                  <img
                    src={image}
                    alt={item.name}
                    className="w-full h-full object-contain p-1.5"
                  />
                ) : (
                  <I.shirt
                    size={dragMode ? 20 : 32}
                    className="text-poppy-300"
                  />
                )}
              </div>
              {!dragMode && (
                <div className="p-3">
                  <p className="font-display font-semibold text-sm sm:text-base leading-tight truncate text-ink-900">
                    {toTitle(item.name)}
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase text-poppy-600 mt-0.5">
                    {item.category}
                  </p>
                </div>
              )}
            </div>
          );
        })()}

      {dragMode && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t-2 border-cream-100 shadow-card-hi"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
            <span className="flex-1 text-sm font-bold text-ink-600">
              Drag items to reorder
            </span>
            <button
              onClick={() => setDragMode(false)}
              className="px-3.5 py-2 bg-poppy-500 text-white text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 active:bg-poppy-600"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {viewing && !editing && (
        <ViewDrawer
          item={items.find((i) => i.id === viewing)}
          image={images[viewing]}
          edits={edits}
          selfies={selfies}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
          }}
        />
      )}

      {editing && (
        <EditDrawer
          item={items.find((i) => i.id === editing)}
          image={images[editing]}
          customTags={customTags}
          usedCustomTags={usedCustomTags}
          brands={brands}
          edits={edits}
          onCustomTagsChange={onSaveCustomTags}
          onBrandsChange={onSaveBrands}
          onEditsChange={onSaveEdits}
          onReplaceImage={(id, blob) => onPutImage(id, blob)}
          onClose={() => {
            setEditing(null);
            setViewing(null);
          }}
          onSave={(u) => {
            handleUpdate(u);
            setEditing(null);
            setViewing(null);
          }}
          onDelete={() => {
            handleDelete(editing);
            setViewing(null);
          }}
        />
      )}
      {adding && (
        <AddItemModal onClose={() => setAdding(false)} onFile={handleAddItem} />
      )}

      {selectMode && selectedIds.size > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t-2 border-cream-100 shadow-card-hi"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
            <div className="d-flex flex-column flex-grow">
              <span className="text-sm font-bold text-poppy-700">
                {selectedIds.size} selected
              </span>
              <div>
                <button
                  onClick={selectAll}
                  data-testid="select-all"
                  className="text-[10px] font-bold tracking-[0.15em] uppercase text-poppy-600 underline active:text-poppy-700 mr-2"
                >
                  All
                </button>
                <button
                  onClick={exitSelectMode}
                  data-testid="select-none"
                  className="text-[10px] font-bold tracking-[0.15em] uppercase text-poppy-600 underline active:text-poppy-700"
                >
                  None
                </button>
              </div>
            </div>
            <button
              onClick={() => setBulkSheet("tags")}
              data-testid="bulk-tags"
              className="px-3.5 py-2 bg-plum-50 text-plum-700 text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 active:bg-plum-100"
            >
              Tags
            </button>
            <button
              onClick={() => setBulkSheet("edits")}
              data-testid="bulk-edits"
              className="px-3.5 py-2 bg-petal-50 text-petal-700 text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 active:bg-petal-100"
            >
              Edits
            </button>
          </div>
        </div>
      )}

      {bulkSheet && (
        <BulkSheet
          type={bulkSheet}
          selectedIds={selectedIds}
          items={items}
          customTags={customTags}
          edits={edits}
          onSaveItems={onSaveItems}
          onSaveCustomTags={onSaveCustomTags}
          onSaveEdits={onSaveEdits}
          onClose={() => setBulkSheet(null)}
        />
      )}
    </>
  );
}

export { ClosetView };
