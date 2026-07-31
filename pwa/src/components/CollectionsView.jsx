import { useState, useEffect, useRef } from "react";
import { Chip } from "./Chip.jsx";
import { CollectionCard } from "./CollectionCard.jsx";
import { CollectionCardPreview } from "./CollectionCardPreview.jsx";
import { CollectionDetailModal } from "./CollectionDetailModal.jsx";
import { FilterRow } from "./FilterRow.jsx";
import { ManageCollectionsModal } from "./ManageCollectionsModal.jsx";
import { OCCASION_OPTIONS, SEASON_OPTIONS } from "../lib/constants.js";
import { reorderByVisible, useDragReorder } from "../lib/hooks.js";
import { I } from "../lib/icons.jsx";

// --- COLLECTIONS VIEW -----------------------------------------------------
function CollectionsView({
  collections,
  items,
  images,
  outfits,
  onSave,
  onViewCollection,
  onOpenOutfit,
  onSetHeaderAction,
}) {
  const [editingId, setEditingId] = useState(null);
  const [showManager, setShowManager] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dragMode, setDragMode] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [activeSeasons, setActiveSeasons] = useState([]);
  const [activeOccasions, setActiveOccasions] = useState([]);

  const toggle = (list, setList, v) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const filterCount = activeSeasons.length + activeOccasions.length;

  const filteredCollections = collections.filter(
    (c) =>
      (activeSeasons.length === 0 ||
        activeSeasons.some((s) => (c.seasons || []).includes(s))) &&
      (activeOccasions.length === 0 ||
        activeOccasions.some((o) => (c.occasions || []).includes(o))),
  );

  const handleReorder = (from, to) => {
    const next = reorderByVisible(
      collections,
      filteredCollections.map((c) => c.id),
      from,
      to,
    );
    if (next !== collections) onSave(next);
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

  const startNew = () => {
    setEditingId("new");
    setShowManager(true);
  };
  const addButtonRef = useRef(null);
  useEffect(() => {
    const el = addButtonRef.current;
    if (!el || !onSetHeaderAction) return;
    const obs = new IntersectionObserver(
      ([entry]) =>
        onSetHeaderAction(
          entry.isIntersecting
            ? null
            : { label: "New Collection", tone: "sky2", onClick: startNew },
        ),
      { threshold: 0.5, rootMargin: "-68px 0px 0px 0px" },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      onSetHeaderAction(null);
    };
  }, []);
  const startEdit = (id) => {
    setEditingId(id);
    setShowManager(true);
  };
  const handleDelete = (id) => {
    if (
      !confirm(
        "Delete this collection? The items themselves stay in your closet.",
      )
    )
      return;
    onSave(collections.filter((c) => c.id !== id));
  };

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="fade-up">
          <div className="mb-6 sm:mb-10">
            <h2 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900 mb-2">
              Collections
            </h2>
            <div className="flex items-end justify-between gap-4">
              <h3 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900">
                <em className="text-sky2-600">you've curated.</em>
              </h3>
              <button
                data-testid="new-collection-btn"
                ref={addButtonRef}
                onClick={startNew}
                style={{ flexShrink: 0 }}
                className="flex items-center gap-2 px-5 py-3 bg-sky2-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop"
              >
                <I.plus size={16} /> New Collection
              </button>
            </div>
            {collections.length > 0 && (
              <p
                data-testid="collections-count"
                className="mt-3 sm:mt-4 text-ink-600 text-sm sm:text-base"
              >
                {filterCount > 0 ? (
                  <>
                    Showing{" "}
                    <span className="font-bold text-ink-800">
                      {filteredCollections.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-bold text-ink-800">
                      {collections.length}
                    </span>{" "}
                    collections
                  </>
                ) : (
                  <>
                    <span className="font-bold text-ink-800">
                      {collections.length}
                    </span>{" "}
                    {collections.length === 1 ? "collection" : "collections"}
                  </>
                )}
              </p>
            )}
          </div>

          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative px-4 py-2.5 border-2 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase active:scale-95 shrink-0 transition-colors ${filterCount > 0 ? "bg-sky2-500 text-white border-sky2-500 shadow-pop" : "bg-white border-cream-100 text-ink-700"}`}
            >
              Filters{filterCount > 0 && ` · ${filterCount}`}
            </button>
            {filteredCollections.length > 1 && (
              <button
                onClick={() => setDragMode(!dragMode)}
                aria-label={
                  dragMode ? "Exit reorder mode" : "Reorder collections"
                }
                className={`relative w-[42px] h-[42px] flex items-center justify-center border-2 rounded-full active:scale-95 shrink-0 transition-colors ${dragMode ? "bg-ink-800 text-white border-ink-800" : "bg-white border-cream-100 text-ink-700"}`}
              >
                {dragMode ? <I.check size={16} /> : <I.grip size={16} />}
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mb-6 p-4 sm:p-5 bg-white border-2 border-cream-100 rounded-3xl fade-up shadow-card">
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
              {filterCount > 0 && (
                <button
                  onClick={() => {
                    setActiveSeasons([]);
                    setActiveOccasions([]);
                  }}
                  className="mt-2 text-[10px] tracking-[0.2em] uppercase text-ink-500 underline"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {collections.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-sky2-200 bg-sky2-50/40 rounded-3xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sky2-100 flex items-center justify-center">
                <I.suitcase size={28} className="text-sky2-500" />
              </div>
              <p className="font-display font-bold text-2xl mb-2 text-ink-900">
                No collections yet.
              </p>
              <p className="text-xs font-bold tracking-widest uppercase text-sky2-600 mb-6 px-4">
                Group pieces — a packing list, a capsule, a season
              </p>
              <button
                onClick={startNew}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky2-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full shadow-pop active:scale-95"
              >
                Create your first <I.chevron size={14} />
              </button>
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-cream-200 bg-cream-50/50 rounded-3xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sky2-100 flex items-center justify-center">
                <I.search size={26} className="text-sky2-500" />
              </div>
              <p className="font-display font-bold text-xl text-ink-900">
                Nothing matches.
              </p>
              <p className="text-xs font-bold tracking-widest uppercase text-sky2-600 mt-2">
                Try clearing a filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredCollections.map((c, i) => (
                <CollectionCard
                  key={c.id}
                  id={`collection-${c.id}`}
                  collection={c}
                  items={items}
                  images={images}
                  onOpen={dragMode ? undefined : () => setViewingId(c.id)}
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
        filteredCollections[dragIndex] &&
        (() => {
          const c = filteredCollections[dragIndex];
          const tx = lastPointerRef.current.x - grabOffsetRef.current.x;
          const ty = lastPointerRef.current.y - grabOffsetRef.current.y;
          return (
            <div
              ref={(el) => {
                ghostRef.current = el;
                if (el)
                  el.style.transform = `translate(${tx}px, ${ty}px) rotate(1.5deg) scale(1.05)`;
              }}
              className="pointer-events-none fixed left-0 top-0 z-50 bg-white border-2 border-sky2-300 rounded-2xl overflow-hidden"
              style={{
                width: startRectRef.current?.width,
                willChange: "transform",
                boxShadow: "0 22px 60px rgba(40, 130, 183, 0.35)",
              }}
            >
              <CollectionCardPreview
                collection={c}
                items={items}
                images={images}
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
              Drag collections to reorder
            </span>
            <button
              onClick={() => setDragMode(false)}
              className="px-3.5 py-2 bg-sky2-500 text-white text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 active:bg-sky2-600"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {viewingId && collections.find((c) => c.id === viewingId) && (
        <CollectionDetailModal
          collection={collections.find((c) => c.id === viewingId)}
          items={items}
          images={images}
          outfits={outfits}
          onClose={() => setViewingId(null)}
          onEdit={() => {
            startEdit(viewingId);
            setViewingId(null);
          }}
          onDelete={() => handleDelete(viewingId)}
          onOpenOutfit={(oid) => {
            setViewingId(null);
            onOpenOutfit?.(oid);
          }}
          onOpenInCloset={() => {
            const id = viewingId;
            setViewingId(null);
            onViewCollection(id);
          }}
        />
      )}

      {showManager && (
        <ManageCollectionsModal
          collections={collections}
          items={items}
          images={images}
          initialEditingId={editingId}
          onSave={onSave}
          onClose={() => {
            setShowManager(false);
            setEditingId(null);
          }}
        />
      )}
    </>
  );
}

export { CollectionsView };
