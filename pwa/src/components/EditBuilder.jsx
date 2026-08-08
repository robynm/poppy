import { useState } from "react";
import { Chip } from "./Chip.jsx";
import { CroppedImage } from "./CroppedImage.jsx";
import { CATEGORY_OPTIONS, EDIT_TYPE_OPTIONS, OCCASION_OPTIONS, SEASON_OPTIONS, STATUS_OPTIONS } from "../lib/constants.js";
import { toTitle } from "../lib/format.js";
import { useBodyScrollLock } from "../lib/hooks.js";
import { useBackButton } from "../lib/backNav.js";
import { I } from "../lib/icons.jsx";

// --- EDIT BUILDER ----------------------------------------------------------
function EditBuilder({
  items,
  images,
  selfies = [],
  tagSuggestions = [], // edit-tag vocabulary — separate from item custom tags
  edit,
  onSaveEdit,
  onCancel,
}) {
  useBodyScrollLock();
  useBackButton(true, onCancel);
  const isEdit = !!edit;
  const [selected, setSelected] = useState(edit ? [...edit.itemIds] : []);
  const [selectedSelfies, setSelectedSelfies] = useState(
    edit
      ? selfies
          .filter((s) => (s.outfitIds || []).includes(edit.id))
          .map((s) => s.id)
      : [],
  );
  const [name, setName] = useState(edit ? edit.name : "");
  const [note, setNote] = useState(edit ? edit.note || "" : "");
  const [type, setType] = useState(edit ? edit.type || null : null);
  const [seasons, setSeasons] = useState(edit ? edit.seasons || [] : []);
  const [occasions, setOccasions] = useState(edit ? edit.occasions || [] : []);
  const [custom, setCustom] = useState(edit ? edit.custom || [] : []);
  const [newTag, setNewTag] = useState("");
  const toggleTag = (list, setList, v) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const addCustom = () => {
    const t = newTag.trim().toLowerCase();
    if (!t) return;
    if (!custom.includes(t)) setCustom((prev) => [...prev, t]);
    setNewTag("");
  };
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [activeStatuses, setActiveStatuses] = useState(["owned"]);
  const [piecesOpen, setPiecesOpen] = useState(true);
  const toggleSelect = (id) =>
    setSelected(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  const toggleSelfie = (id) =>
    setSelectedSelfies(
      selectedSelfies.includes(id)
        ? selectedSelfies.filter((s) => s !== id)
        : [...selectedSelfies, id],
    );
  // A snap can be tagged with any number of edits, so offer all of them
  // (this edit's snaps come pre-selected).
  const availableSelfies = selfies || [];
  const filtered = items.filter(
    (i) =>
      (!categoryFilter || i.category === categoryFilter) &&
      (activeStatuses.length === 0 ||
        activeStatuses.includes(i.status || "owned")),
  );
  const chosenItems = selected
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean);
  const canSave = selected.length > 0 && name.trim();
  const handleSave = () => {
    if (!canSave) return;
    if (isEdit) {
      onSaveEdit({
        ...edit,
        name: name.trim(),
        note: note.trim(),
        type,
        itemIds: selected,
        selfieIds: selectedSelfies,
        seasons,
        occasions,
        custom,
      });
    } else {
      onSaveEdit({
        name: name.trim(),
        note: note.trim(),
        type,
        itemIds: selected,
        selfieIds: selectedSelfies,
        seasons,
        occasions,
        custom,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        data-testid="builder"
        className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl flex flex-col shadow-2xl fade-up overflow-hidden"
        style={{ height: "100dvh", maxHeight: "100dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 sm:p-6 border-b border-cream-100 bg-white shrink-0"
          style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500">
                Edit Builder
              </p>
              <h3 className="font-display text-2xl sm:text-3xl">
                {isEdit ? "Editing" : "New Edit"}
              </h3>
            </div>
            <button onClick={onCancel} className="text-ink-500 p-2">
              <I.x size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-buttercup-700 shrink-0">
              {selected.length} {selected.length === 1 ? "piece" : "pieces"}
            </p>
            {chosenItems.length === 0 ? (
              <span className="text-xs italic text-ink-400 font-display">
                nothing selected yet…
              </span>
            ) : (
              chosenItems.map((p) => (
                <div
                  key={p.id}
                  className="bg-white border-2 border-buttercup-100 rounded-2xl shrink-0 w-12 h-12 flex items-center justify-center relative shadow-card"
                >
                  <img
                    src={images[p.id]}
                    alt={p.name}
                    className="w-full h-full object-contain p-1"
                  />
                  <button
                    onClick={() => toggleSelect(p.id)}
                    className="absolute -top-1.5 -right-1.5 bg-poppy-500 text-white rounded-full p-1 shadow-pop"
                  >
                    <I.x size={9} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
          <div>
            <label className="block text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-1">
              Name
            </label>
            <input
              data-testid="builder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this edit…"
              className="w-full bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none font-display font-bold text-xl py-1"
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-1">
              Note (optional)
            </label>
            <input
              data-testid="builder-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="a vibe, a memory…"
              className="w-full bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none text-sm italic py-1"
            />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
              Type
            </p>
            <div data-testid="builder-types" className="flex gap-2 flex-wrap">
              {EDIT_TYPE_OPTIONS.map((t) => (
                <Chip
                  key={t}
                  tone="collection"
                  active={type === t}
                  onClick={() => setType(type === t ? null : t)}
                >
                  {t}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
              Season
            </p>
            <div data-testid="builder-seasons" className="flex gap-2 flex-wrap">
              {SEASON_OPTIONS.map((s) => (
                <Chip
                  key={s}
                  tone="season"
                  active={seasons.includes(s)}
                  onClick={() => toggleTag(seasons, setSeasons, s)}
                >
                  {s}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
              Occasion
            </p>
            <div data-testid="builder-occasions" className="flex gap-2 flex-wrap">
              {OCCASION_OPTIONS.map((o) => (
                <Chip
                  key={o}
                  tone="occasion"
                  active={occasions.includes(o)}
                  onClick={() => toggleTag(occasions, setOccasions, o)}
                >
                  {o}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
              Tags
            </p>
            {(() => {
              const shownTags = [
                ...new Set([...(tagSuggestions || []), ...custom]),
              ];
              return (
                <div
                  data-testid="builder-tags"
                  className="flex flex-wrap gap-2 mb-2"
                >
                  {shownTags.map((t) => (
                    <Chip
                      key={t}
                      tone="custom"
                      active={custom.includes(t)}
                      onClick={() => toggleTag(custom, setCustom, t)}
                    >
                      {t}
                    </Chip>
                  ))}
                  {shownTags.length === 0 && (
                    <span className="text-xs text-ink-400 italic">
                      none yet — add one below
                    </span>
                  )}
                </div>
              );
            })()}
            <div className="flex gap-2">
              <input
                data-testid="builder-tag-input"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
                placeholder="new tag…"
                className="flex-1 bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none text-sm py-1"
              />
              <button
                type="button"
                data-testid="builder-tag-add"
                onClick={addCustom}
                className="px-4 py-1.5 bg-poppy-500 text-white text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop"
              >
                Add
              </button>
            </div>
          </div>

          {/* Divider: edit attributes above, piece-picker filters below */}
          <div
            data-testid="builder-divider"
            className="border-t-2 border-cream-100 -mx-4 sm:-mx-6"
          />

          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink-500 mb-2">
              Status
            </p>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map((s) => (
                <Chip
                  key={s}
                  tone="status"
                  active={activeStatuses.includes(s)}
                  onClick={() =>
                    setActiveStatuses(
                      activeStatuses.includes(s)
                        ? activeStatuses.filter((x) => x !== s)
                        : [...activeStatuses, s],
                    )
                  }
                >
                  {s}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink-500 mb-2">
              Category
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip
                tone="category"
                active={!categoryFilter}
                onClick={() => setCategoryFilter(null)}
              >
                All
              </Chip>
              {CATEGORY_OPTIONS.map((c) => (
                <Chip
                  key={c}
                  tone="category"
                  active={categoryFilter === c}
                  onClick={() =>
                    setCategoryFilter(categoryFilter === c ? null : c)
                  }
                >
                  {c}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <button
              type="button"
              data-testid="builder-pieces-toggle"
              onClick={() => setPiecesOpen((o) => !o)}
              className="w-full flex items-center justify-between mb-2"
            >
              <span className="text-[10px] tracking-[0.3em] uppercase text-ink-500">
                Pieces ({selected.length})
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">
                {piecesOpen ? "Hide" : "Show"}
                <I.chevron
                  size={14}
                  className={`transition-transform ${piecesOpen ? "rotate-90" : "-rotate-90"}`}
                />
              </span>
            </button>
            {piecesOpen && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {filtered.map((it, i) => {
                const active = selected.includes(it.id);
                return (
                  <div
                    key={it.id}
                    data-testid="builder-piece"
                    data-item-id={it.id}
                    onClick={() => toggleSelect(it.id)}
                    className={`cursor-pointer fade-up rounded-2xl overflow-hidden border-2 transition-all active:scale-[0.97] ${active ? "border-poppy-500 ring-2 ring-poppy-500/25 shadow-pop" : "border-cream-100 bg-white"}`}
                    style={{ animationDelay: `${i * 20}ms` }}
                  >
                    <div className="aspect-square bg-poppy-gradient flex items-center justify-center relative">
                      {images[it.id] && (
                        <img
                          src={images[it.id]}
                          alt={it.name}
                          className="w-full h-full object-contain p-1.5"
                        />
                      )}
                      {active && (
                        <div className="absolute top-1.5 right-1.5 bg-poppy-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-pop">
                          <I.check size={11} />
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] font-bold font-display text-ink-800 truncate px-1.5 py-1">
                      {toTitle(it.name)}
                    </p>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
              Snaps ({selectedSelfies.length})
            </p>
            {availableSelfies.length === 0 ? (
              <p className="text-xs text-ink-400 italic">
                No snaps yet — add some from the Snaps tab, then link them
                here.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableSelfies.map((s) => {
                  const active = selectedSelfies.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      data-testid="builder-selfie"
                      data-selfie-id={s.id}
                      onClick={() => toggleSelfie(s.id)}
                      className={`cursor-pointer rounded-2xl overflow-hidden border-2 transition-all active:scale-[0.97] ${active ? "border-buttercup-500 ring-2 ring-buttercup-500/25 shadow-pop" : "border-cream-100 bg-white"}`}
                    >
                      <div className="relative">
                        <CroppedImage
                          url={images[s.id]}
                          crop={s.crop}
                          className="w-full aspect-[1/2]"
                        />
                        {active && (
                          <div className="absolute top-1.5 right-1.5 bg-buttercup-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-pop">
                            <I.check size={11} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-4 sm:p-6 border-t-2 border-cream-100 bg-white shrink-0 flex gap-2"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
        >
          <button
            data-testid="builder-cancel"
            onClick={onCancel}
            className="flex-1 py-3.5 bg-cream-50 border-2 border-cream-100 text-ink-700 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95"
          >
            Cancel
          </button>
          <button
            data-testid="builder-save"
            onClick={handleSave}
            disabled={!canSave}
            className="flex-[2] flex items-center justify-center gap-2 py-3.5 bg-petal-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase disabled:opacity-40 rounded-full active:scale-95 shadow-pop"
          >
            <I.check size={14} /> {isEdit ? "Save Changes" : "Save Edit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { EditBuilder };
