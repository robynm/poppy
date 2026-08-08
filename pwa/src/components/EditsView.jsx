import { useState, useEffect, useMemo, useRef } from "react";
import { Chip } from "./Chip.jsx";
import { FilterRow } from "./FilterRow.jsx";
import { EditCard } from "./EditCard.jsx";
import { EditCardPreview } from "./EditCardPreview.jsx";
import { EditDetailModal } from "./EditDetailModal.jsx";
import { EditItemFilterModal } from "./EditItemFilterModal.jsx";
import { SortMenu } from "./SortMenu.jsx";
import { EDIT_TYPE_OPTIONS, OCCASION_OPTIONS, SEASON_OPTIONS } from "../lib/constants.js";
import { toTitle } from "../lib/format.js";
import { reorderByVisible, useDragReorder } from "../lib/hooks.js";
import { I } from "../lib/icons.jsx";

// --- EDITS VIEW ------------------------------------------------------------
// An "edit" is a named set of closet pieces — an outfit or a themed capsule.
function EditsView({
  edits,
  items,
  images,
  selfies = [],
  onSave,
  onSaveSelfies,
  onNewEdit,
  onEditEdit,
  onOpenInCloset,
  scrollToId,
  onScrolled,
  onSetHeaderAction,
}) {
  const [viewingId, setViewingId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dragMode, setDragMode] = useState(false);
  const [activeTypes, setActiveTypes] = useState([]);
  const [activeSeasons, setActiveSeasons] = useState([]);
  const [activeOccasions, setActiveOccasions] = useState([]);
  const [activeCustom, setActiveCustom] = useState([]);
  const [activeItems, setActiveItems] = useState([]); // filter edits by pieces
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [sortMode, setSortMode] = useState("custom");
  const newEditButtonRef = useRef(null);

  // An edit's "wears" = snaps tagged with it (the snap count on its card).
  const wearCount = useMemo(() => {
    const m = {};
    (selfies || []).forEach((s) =>
      (s.outfitIds || []).forEach((id) => {
        m[id] = (m[id] || 0) + 1;
      }),
    );
    return m;
  }, [selfies]);

  const toggle = (list, setList, v) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const toggleActiveItem = (id) => toggle(activeItems, setActiveItems, id);
  const filterCount =
    activeTypes.length +
    activeSeasons.length +
    activeOccasions.length +
    activeCustom.length +
    activeItems.length;

  // Tags actually applied to at least one edit — unused ones don't surface.
  const editTags = [
    ...new Set(edits.flatMap((e) => e.custom || [])),
  ].sort((a, b) => a.localeCompare(b));

  const filteredEdits = edits.filter(
    (e) =>
      (activeTypes.length === 0 || activeTypes.includes(e.type)) &&
      (activeSeasons.length === 0 ||
        activeSeasons.some((s) => (e.seasons || []).includes(s))) &&
      (activeOccasions.length === 0 ||
        activeOccasions.some((oc) => (e.occasions || []).includes(oc))) &&
      (activeCustom.length === 0 ||
        activeCustom.some((t) => (e.custom || []).includes(t))) &&
      (activeItems.length === 0 ||
        activeItems.some((id) => (e.itemIds || []).includes(id))),
  );

  // Sorting is view-only (doesn't touch stored order). "custom" keeps the
  // manual/drag order; the reorder handle only shows in custom mode.
  const sortedEdits = useMemo(() => {
    if (sortMode === "custom") return filteredEdits;
    const arr = [...filteredEdits];
    if (sortMode === "worn-desc" || sortMode === "worn-asc") {
      const w = (e) => wearCount[e.id] || 0;
      arr.sort((a, b) =>
        sortMode === "worn-desc" ? w(b) - w(a) : w(a) - w(b),
      );
    } else {
      const t = (e) => e.createdAt || 0;
      arr.sort((a, b) => (sortMode === "newest" ? t(b) - t(a) : t(a) - t(b)));
    }
    return arr;
  }, [filteredEdits, sortMode, wearCount]);

  const handleReorder = (from, to) => {
    const next = reorderByVisible(
      edits,
      filteredEdits.map((e) => e.id),
      from,
      to,
    );
    if (next !== edits) onSave(next);
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

  const handleDelete = (id) => {
    if (!confirm("Delete this edit? Your pieces stay in the closet.")) return;
    onSave(edits.filter((e) => e.id !== id));
    // Snaps outlive the edit — just untag it from any that reference it
    // (their tagged pieces stay put).
    if (onSaveSelfies && selfies.some((s) => (s.outfitIds || []).includes(id))) {
      onSaveSelfies(
        selfies.map((s) =>
          (s.outfitIds || []).includes(id)
            ? { ...s, outfitIds: s.outfitIds.filter((x) => x !== id) }
            : s,
        ),
      );
    }
  };

  useEffect(() => {
    if (!scrollToId) return;
    const el = document.getElementById(`edit-${scrollToId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (edits.some((e) => e.id === scrollToId)) setViewingId(scrollToId);
    onScrolled?.();
  }, [scrollToId]);

  useEffect(() => {
    const el = newEditButtonRef.current;
    if (!el || !onSetHeaderAction) return;
    const obs = new IntersectionObserver(
      ([entry]) =>
        onSetHeaderAction(
          entry.isIntersecting
            ? null
            : { label: "New Edit", tone: "petal", onClick: onNewEdit },
        ),
      { threshold: 0.5, rootMargin: "-68px 0px 0px 0px" },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      onSetHeaderAction?.(null);
    };
  }, []);

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="fade-up">
          <div className="mb-6 sm:mb-10">
            <h2 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900 mb-2">
              Edits
            </h2>
            <div className="flex items-end justify-between gap-4">
              <h3 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900">
                <em className="text-petal-600">styled to keep.</em>
              </h3>
              <button
                data-testid="new-edit-btn"
                ref={newEditButtonRef}
                onClick={onNewEdit}
                style={{ flexShrink: 0 }}
                className="flex items-center gap-2 px-5 py-3 bg-petal-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop"
              >
                <I.plus size={16} /> New Edit
              </button>
            </div>
            {edits.length > 0 && (
              <p
                data-testid="edits-count"
                className="mt-3 sm:mt-4 text-ink-600 text-sm sm:text-base"
              >
                {filterCount > 0 ? (
                  <>
                    Showing{" "}
                    <span className="font-bold text-ink-800">
                      {filteredEdits.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-bold text-ink-800">
                      {edits.length}
                    </span>{" "}
                    edits
                  </>
                ) : (
                  <>
                    <span className="font-bold text-ink-800">
                      {edits.length}
                    </span>{" "}
                    {edits.length === 1 ? "edit" : "edits"}
                  </>
                )}
              </p>
            )}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative px-4 py-2.5 border-2 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase active:scale-95 shrink-0 transition-colors ${filterCount > 0 ? "bg-petal-500 text-white border-petal-500 shadow-pop" : "bg-white border-cream-100 text-ink-700"}`}
            >
              Filters{filterCount > 0 && ` · ${filterCount}`}
            </button>
            <SortMenu value={sortMode} onChange={setSortMode} />
            {sortMode === "custom" && filteredEdits.length > 1 && (
              <button
                onClick={() => setDragMode(!dragMode)}
                aria-label={dragMode ? "Exit reorder mode" : "Reorder edits"}
                className={`relative w-[42px] h-[42px] flex items-center justify-center border-2 rounded-full active:scale-95 shrink-0 transition-colors ${dragMode ? "bg-ink-800 text-white border-ink-800" : "bg-white border-cream-100 text-ink-700"}`}
              >
                {dragMode ? <I.check size={16} /> : <I.grip size={16} />}
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mb-6 p-4 sm:p-5 bg-white border-2 border-cream-100 rounded-3xl fade-up shadow-card">
              <FilterRow label="Type">
                {EDIT_TYPE_OPTIONS.map((t) => (
                  <Chip
                    key={t}
                    tone="collection"
                    active={activeTypes.includes(t)}
                    onClick={() => toggle(activeTypes, setActiveTypes, t)}
                  >
                    {t}
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
              {editTags.length > 0 && (
                <FilterRow label="Tags">
                  {editTags.map((t) => (
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
              <FilterRow label="Piece">
                <button
                  type="button"
                  data-testid="edit-item-filter-btn"
                  onClick={() => setShowItemPicker(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 border-dashed border-poppy-200 bg-poppy-50 text-poppy-700 rounded-full active:scale-95"
                >
                  <I.plus size={11} />
                  {activeItems.length > 0 ? "Add or change" : "Choose pieces"}
                </button>
                {activeItems.map((id) => {
                  const it = items.find((i) => i.id === id);
                  if (!it) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      data-testid="edit-item-filter-chip"
                      data-item-id={id}
                      onClick={() => toggleActiveItem(id)}
                      className="inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 bg-poppy-500 text-white border-2 border-poppy-500 shadow-pop rounded-full text-[11px] font-bold uppercase tracking-[0.1em] active:scale-95"
                    >
                      <span className="w-5 h-5 rounded-full bg-white/25 overflow-hidden flex items-center justify-center shrink-0">
                        {images[id] ? (
                          <img
                            src={images[id]}
                            alt=""
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <I.shirt size={10} />
                        )}
                      </span>
                      {toTitle(it.name)}
                      <I.x size={11} />
                    </button>
                  );
                })}
              </FilterRow>
              {filterCount > 0 && (
                <button
                  onClick={() => {
                    setActiveTypes([]);
                    setActiveSeasons([]);
                    setActiveOccasions([]);
                    setActiveCustom([]);
                    setActiveItems([]);
                  }}
                  className="mt-2 text-[10px] tracking-[0.2em] uppercase text-ink-500 underline"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {edits.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-petal-200 bg-petal-50/40 rounded-3xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-petal-100 flex items-center justify-center">
                <I.layers size={28} className="text-petal-500" />
              </div>
              <p className="font-display font-bold text-2xl mb-2 text-ink-900">
                No edits yet.
              </p>
              <p className="text-xs font-bold tracking-widest uppercase text-petal-600 mb-6">
                Curate your first one
              </p>
              <button
                onClick={onNewEdit}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-petal-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full shadow-pop active:scale-95"
              >
                Open Builder <I.chevron size={14} />
              </button>
            </div>
          ) : filteredEdits.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-cream-200 bg-cream-50/50 rounded-3xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-petal-100 flex items-center justify-center">
                <I.search size={26} className="text-petal-500" />
              </div>
              <p className="font-display font-bold text-xl text-ink-900">
                Nothing matches.
              </p>
              <p className="text-xs font-bold tracking-widest uppercase text-petal-600 mt-2">
                Try clearing a filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {sortedEdits.map((e, i) => (
                <EditCard
                  key={e.id}
                  id={`edit-${e.id}`}
                  edit={e}
                  items={items}
                  images={images}
                  selfies={selfies}
                  onOpen={dragMode ? undefined : () => setViewingId(e.id)}
                  delay={i * 40}
                  cardRef={(el) => register(i, el)}
                  reorderHandle={dragMode ? onHandlePointerDown(i) : null}
                  isDragging={dragMode && dragIndex === i}
                  isDropTarget={
                    dragMode &&
                    dragIndex !== null &&
                    hoverIndex === i &&
                    dragIndex !== i
                  }
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {dragIndex !== null &&
        filteredEdits[dragIndex] &&
        (() => {
          const e = filteredEdits[dragIndex];
          const tx = lastPointerRef.current.x - grabOffsetRef.current.x;
          const ty = lastPointerRef.current.y - grabOffsetRef.current.y;
          return (
            <div
              ref={(el) => {
                ghostRef.current = el;
                if (el)
                  el.style.transform = `translate(${tx}px, ${ty}px) rotate(1.5deg) scale(1.05)`;
              }}
              className="pointer-events-none fixed left-0 top-0 z-50 bg-white border-2 border-petal-300 rounded-2xl overflow-hidden"
              style={{
                width: startRectRef.current?.width,
                willChange: "transform",
                boxShadow: "0 22px 60px rgba(236, 71, 120, 0.35)",
              }}
            >
              <EditCardPreview
                edit={e}
                items={items}
                images={images}
                selfies={selfies}
              />
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
              Drag edits to reorder
            </span>
            <button
              onClick={() => setDragMode(false)}
              className="px-3.5 py-2 bg-petal-500 text-white text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 active:bg-petal-600"
            >
              Done
            </button>
          </div>
        </div>
      )}
      {viewingId && edits.find((e) => e.id === viewingId) && (
        <EditDetailModal
          edit={edits.find((e) => e.id === viewingId)}
          items={items}
          images={images}
          selfies={selfies}
          onClose={() => setViewingId(null)}
          onEdit={
            onEditEdit
              ? () => {
                  const e = edits.find((x) => x.id === viewingId);
                  setViewingId(null);
                  onEditEdit(e);
                }
              : undefined
          }
          onDelete={() => handleDelete(viewingId)}
          onOpenInCloset={() => {
            const id = viewingId;
            setViewingId(null);
            onOpenInCloset?.(id);
          }}
        />
      )}
      {showItemPicker && (
        <EditItemFilterModal
          items={items}
          images={images}
          selected={activeItems}
          onToggle={toggleActiveItem}
          onClear={() => setActiveItems([])}
          onClose={() => setShowItemPicker(false)}
        />
      )}
    </>
  );
}

export { EditsView };
