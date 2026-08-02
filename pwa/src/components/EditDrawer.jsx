import { useState, useRef } from "react";
import { BrandCombobox } from "./BrandCombobox.jsx";
import { Chip } from "./Chip.jsx";
import { CATEGORY_OPTIONS, OCCASION_OPTIONS, SEASON_OPTIONS, STATUS_OPTIONS } from "../lib/constants.js";
import { toTitle } from "../lib/format.js";
import { useBodyScrollLock } from "../lib/hooks.js";
import { useBackButton } from "../lib/backNav.js";
import { I } from "../lib/icons.jsx";
import { resizeImageToBlob } from "../lib/images.js";
import { Log } from "../lib/log.js";

function EditDrawer({
  item,
  image,
  customTags,
  usedCustomTags,
  brands,
  collections,
  onCustomTagsChange,
  onBrandsChange,
  onCollectionsChange,
  onReplaceImage,
  onClose,
  onSave,
  onDelete,
}) {
  useBodyScrollLock();
  useBackButton(true, onClose);
  const [draft, setDraft] = useState(item);
  const [newTag, setNewTag] = useState("");
  const imageInputRef = useRef();
  const [replacing, setReplacing] = useState(false);

  if (!item) return null;
  const toggle = (key, v) => {
    const cur = draft[key] || [];
    setDraft({
      ...draft,
      [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
    });
  };
  const addCustom = () => {
    const t = newTag.trim().toLowerCase();
    if (!t) return;
    if (!customTags.includes(t)) onCustomTagsChange([...customTags, t]);
    const cur = draft.custom || [];
    if (!cur.includes(t)) setDraft({ ...draft, custom: [...cur, t] });
    setNewTag("");
  };
  const toggleCollection = (collectionId) => {
    const next = (collections || []).map((c) => {
      if (c.id !== collectionId) return c;
      const inIt = c.itemIds.includes(item.id);
      return {
        ...c,
        itemIds: inIt
          ? c.itemIds.filter((x) => x !== item.id)
          : [...c.itemIds, item.id],
      };
    });
    onCollectionsChange(next);
  };
  const handleReplaceImage = async (file) => {
    if (!file) return;
    setReplacing(true);
    try {
      const blob = await resizeImageToBlob(file, 640, 0.85);
      if (blob) await onReplaceImage(item.id, blob);
    } catch (e) {
      Log.error("replaceImage.failed", { id: item.id, error: String(e) });
    } finally {
      setReplacing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex sm:justify-end">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div
        data-testid="edit-drawer"
        className="relative w-full sm:max-w-md bg-white h-full overflow-y-auto shadow-2xl fade-up"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="p-4 sm:p-6 border-b border-cream-100 flex items-center justify-between bg-white">
          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500">
            Editing
          </p>
          <button onClick={onClose} className="text-ink-500 p-2 -m-2">
            <I.x size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-xs aspect-[3/4] bg-poppy-gradient rounded-2xl overflow-hidden mb-3 flex items-center justify-center">
              {image && (
                <img
                  src={image}
                  alt={draft.name}
                  className="w-full h-full object-contain p-4"
                />
              )}
              {replacing && (
                <div className="absolute inset-0 bg-white/85 flex items-center justify-center text-[10px] tracking-[0.3em] uppercase text-ink-600">
                  Updating photo…
                </div>
              )}
            </div>
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={replacing}
              data-testid="replace-photo-btn"
              className="w-full max-w-xs mb-6 flex items-center justify-center gap-2 py-2.5 bg-cream-50 border-2 border-cream-100 text-ink-700 text-[10px] font-bold tracking-[0.2em] uppercase rounded-full active:scale-95 disabled:opacity-40"
            >
              <I.upload size={12} /> Replace Photo
            </button>
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            data-testid="replace-photo-file"
            onChange={(e) => {
              handleReplaceImage(e.target.files?.[0]);
              e.target.value = "";
            }}
            className="hidden"
          />

          <label className="block text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-1">
            Name
          </label>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            data-testid="edit-name"
            className="w-full bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none font-display text-xl py-1 mb-6"
          />

          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
            Category
          </p>
          <div className="flex flex-wrap gap-2 mb-6" data-testid="edit-category">
            {CATEGORY_OPTIONS.map((c) => (
              <Chip
                key={c}
                tone="category"
                active={draft.category === c}
                onClick={() => setDraft({ ...draft, category: c })}
              >
                {c}
              </Chip>
            ))}
          </div>

          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
            Status
          </p>
          <div className="flex flex-wrap gap-2 mb-6" data-testid="edit-status">
            {STATUS_OPTIONS.map((s) => (
              <Chip
                key={s}
                tone="status"
                active={(draft.status || "owned") === s}
                onClick={() => setDraft({ ...draft, status: s })}
              >
                {s}
              </Chip>
            ))}
          </div>

          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
            Brand
          </p>
          <BrandCombobox
            value={draft.brand || ""}
            brands={brands}
            onChange={(b) => setDraft({ ...draft, brand: b })}
            onAddBrand={(b) =>
              onBrandsChange && onBrandsChange([...(brands || []), b])
            }
          />

          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
            Year Purchased
          </p>
          <input
            value={draft.yearPurchased || ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                yearPurchased: e.target.value
                  .replace(/[^0-9]/g, "")
                  .slice(0, 4),
              })
            }
            inputMode="numeric"
            placeholder="e.g. 2024"
            data-testid="edit-year"
            className="w-full bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none text-sm py-1 mb-6"
          />

          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
            Seasons
          </p>
          <div className="flex flex-wrap gap-2 mb-6" data-testid="edit-seasons">
            {SEASON_OPTIONS.map((s) => (
              <Chip
                key={s}
                tone="season"
                active={(draft.seasons || []).includes(s)}
                onClick={() => toggle("seasons", s)}
              >
                {s}
              </Chip>
            ))}
          </div>

          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
            Occasions
          </p>
          <div className="flex flex-wrap gap-2 mb-6" data-testid="edit-occasions">
            {OCCASION_OPTIONS.map((o) => (
              <Chip
                key={o}
                tone="occasion"
                active={(draft.occasions || []).includes(o)}
                onClick={() => toggle("occasions", o)}
              >
                {o}
              </Chip>
            ))}
          </div>

          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
            Custom Tags
          </p>
          <div className="flex flex-wrap gap-2 mb-3" data-testid="edit-custom-tags">
            {(() => {
              const shownTags = [
                ...new Set([
                  ...(usedCustomTags || customTags),
                  ...(draft.custom || []),
                ]),
              ];
              return (
                <>
                  {shownTags.map((t) => (
                    <Chip
                      key={t}
                      tone="custom"
                      active={(draft.custom || []).includes(t)}
                      onClick={() => toggle("custom", t)}
                    >
                      {t}
                    </Chip>
                  ))}
                  {shownTags.length === 0 && (
                    <span className="text-xs text-ink-400 italic">
                      none yet — add one below
                    </span>
                  )}
                </>
              );
            })()}
          </div>
          <div className="flex gap-2 mb-8">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              placeholder="new tag…"
              data-testid="edit-tag-input"
              className="flex-1 bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none text-sm py-1"
            />
            <button
              onClick={addCustom}
              data-testid="edit-tag-add"
              className="px-4 py-1.5 bg-poppy-500 text-white text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop"
            >
              Add
            </button>
          </div>

          <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
            Collections
          </p>
          <div className="flex flex-wrap gap-2 mb-8" data-testid="edit-collections">
            {(collections || []).length === 0 && (
              <span className="text-xs text-ink-400 italic">
                no collections yet — create one from the Closet
              </span>
            )}
            {(collections || []).map((c) => {
              const inIt = c.itemIds.includes(item.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCollection(c.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full transition-all ${inIt ? "bg-sky2-500 text-white border-sky2-500 shadow-pop" : "bg-sky2-50 text-sky2-700 border-sky2-100"}`}
                >
                  <I.folder size={11} />
                  {toTitle(c.name)}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 pt-6 border-t-2 border-cream-100">
            <button
              onClick={() => onSave(draft)}
              data-testid="edit-save"
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-poppy-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-poppy"
            >
              <I.check size={14} /> Save
            </button>
            <button
              onClick={() => {
                if (confirm(`Remove "${draft.name}"?`)) onDelete();
              }}
              data-testid="edit-delete"
              className="px-5 py-3.5 bg-petal-50 border-2 border-petal-100 text-petal-600 rounded-full active:scale-95"
              aria-label="Delete piece"
            >
              <I.trash size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { EditDrawer };
