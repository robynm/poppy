import { useState, useEffect, useRef } from "react";
import { Chip } from "./Chip.jsx";
import { FilterRow } from "./FilterRow.jsx";
import { OutfitCard } from "./OutfitCard.jsx";
import { OutfitCardPreview } from "./OutfitCardPreview.jsx";
import { OutfitDetailModal } from "./OutfitDetailModal.jsx";
import { OCCASION_OPTIONS, SEASON_OPTIONS } from "../lib/constants.js";
import { reorderByVisible, useDragReorder } from "../lib/hooks.js";
import { I } from "../lib/icons.jsx";

// --- OUTFITS VIEW ----------------------------------------------------------
function OutfitsView({
  outfits,
  items,
  images,
  selfies = [],
  onSave,
  onSaveSelfies,
  onNewOutfit,
  onEditOutfit,
  scrollToId,
  onScrolled,
  onSetHeaderAction,
}) {
  const [viewingId, setViewingId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dragMode, setDragMode] = useState(false);
  const [activeSeasons, setActiveSeasons] = useState([]);
  const [activeOccasions, setActiveOccasions] = useState([]);
  const newLookButtonRef = useRef(null);

  const toggle = (list, setList, v) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const filterCount = activeSeasons.length + activeOccasions.length;

  const filteredOutfits = outfits.filter(
    (o) =>
      (activeSeasons.length === 0 ||
        activeSeasons.some((s) => (o.seasons || []).includes(s))) &&
      (activeOccasions.length === 0 ||
        activeOccasions.some((oc) => (o.occasions || []).includes(oc))),
  );

  const handleReorder = (from, to) => {
    const next = reorderByVisible(
      outfits,
      filteredOutfits.map((o) => o.id),
      from,
      to,
    );
    if (next !== outfits) onSave(next);
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
    if (!confirm("Delete this outfit?")) return;
    onSave(outfits.filter((o) => o.id !== id));
    // Selfies outlive the look — just unlink any that pointed to it.
    if (onSaveSelfies && selfies.some((s) => s.outfitId === id)) {
      onSaveSelfies(
        selfies.map((s) => (s.outfitId === id ? { ...s, outfitId: null } : s)),
      );
    }
  };

  useEffect(() => {
    if (!scrollToId) return;
    const el = document.getElementById(`outfit-${scrollToId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (outfits.some((o) => o.id === scrollToId)) setViewingId(scrollToId);
    onScrolled?.();
  }, [scrollToId]);

  useEffect(() => {
    const el = newLookButtonRef.current;
    if (!el || !onSetHeaderAction) return;
    const obs = new IntersectionObserver(
      ([entry]) =>
        onSetHeaderAction(
          entry.isIntersecting
            ? null
            : { label: "New Look", tone: "petal", onClick: onNewOutfit },
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
              Looks
            </h2>
            <div className="flex items-end justify-between gap-4">
              <h3 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900">
                <em className="text-petal-600">worth keeping.</em>
              </h3>
              <button
                data-testid="new-look-btn"
                ref={newLookButtonRef}
                onClick={onNewOutfit}
                style={{ flexShrink: 0 }}
                className="flex items-center gap-2 px-5 py-3 bg-petal-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop"
              >
                <I.plus size={16} /> New Look
              </button>
            </div>
            {outfits.length > 0 && (
              <p
                data-testid="looks-count"
                className="mt-3 sm:mt-4 text-ink-600 text-sm sm:text-base"
              >
                {filterCount > 0 ? (
                  <>
                    Showing{" "}
                    <span className="font-bold text-ink-800">
                      {filteredOutfits.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-bold text-ink-800">
                      {outfits.length}
                    </span>{" "}
                    looks
                  </>
                ) : (
                  <>
                    <span className="font-bold text-ink-800">
                      {outfits.length}
                    </span>{" "}
                    {outfits.length === 1 ? "look" : "looks"}
                  </>
                )}
              </p>
            )}
          </div>

          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative px-4 py-2.5 border-2 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase active:scale-95 shrink-0 transition-colors ${filterCount > 0 ? "bg-petal-500 text-white border-petal-500 shadow-pop" : "bg-white border-cream-100 text-ink-700"}`}
            >
              Filters{filterCount > 0 && ` · ${filterCount}`}
            </button>
            {filteredOutfits.length > 1 && (
              <button
                onClick={() => setDragMode(!dragMode)}
                aria-label={dragMode ? "Exit reorder mode" : "Reorder looks"}
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

          {outfits.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-petal-200 bg-petal-50/40 rounded-3xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-petal-100 flex items-center justify-center">
                <I.sunglasses size={28} className="text-petal-500" />
              </div>
              <p className="font-display font-bold text-2xl mb-2 text-ink-900">
                No looks yet.
              </p>
              <p className="text-xs font-bold tracking-widest uppercase text-petal-600 mb-6">
                Compose your first one
              </p>
              <button
                onClick={onNewOutfit}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-petal-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full shadow-pop active:scale-95"
              >
                Open Builder <I.chevron size={14} />
              </button>
            </div>
          ) : filteredOutfits.length === 0 ? (
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
              {filteredOutfits.map((o, i) => (
                <OutfitCard
                  key={o.id}
                  id={`outfit-${o.id}`}
                  outfit={o}
                  items={items}
                  images={images}
                  selfies={selfies}
                  onOpen={dragMode ? undefined : () => setViewingId(o.id)}
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
        filteredOutfits[dragIndex] &&
        (() => {
          const o = filteredOutfits[dragIndex];
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
              <OutfitCardPreview
                outfit={o}
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
              Drag looks to reorder
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
      {viewingId && outfits.find((o) => o.id === viewingId) && (
        <OutfitDetailModal
          outfit={outfits.find((o) => o.id === viewingId)}
          items={items}
          images={images}
          selfies={selfies}
          onClose={() => setViewingId(null)}
          onEdit={
            onEditOutfit
              ? () => {
                  const o = outfits.find((x) => x.id === viewingId);
                  setViewingId(null);
                  onEditOutfit(o);
                }
              : undefined
          }
          onDelete={() => handleDelete(viewingId)}
        />
      )}
    </>
  );
}

export { OutfitsView };
