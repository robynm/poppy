import { useState } from "react";
import { Chip } from "./Chip.jsx";
import { OCCASION_OPTIONS, SEASON_OPTIONS, STATUS_OPTIONS } from "../lib/constants.js";
import { toTitle } from "../lib/format.js";
import { useBodyScrollLock } from "../lib/hooks.js";
import { I } from "../lib/icons.jsx";

// --- MANAGE COLLECTIONS ---------------------------------------------------
function ManageCollectionsModal({
  collections,
  items,
  images,
  onSave,
  onClose,
  initialEditingId,
}) {
  useBodyScrollLock();
  // If we opened straight into an edit/new flow, remember that — Cancel should close instead of returning to the list
  const directEdit = !!initialEditingId;

  const initialDraft = () => {
    if (initialEditingId === "new" || !initialEditingId)
      return { name: "", description: "", itemIds: [] };
    const c = collections.find((x) => x.id === initialEditingId);
    return c
      ? {
          name: c.name,
          description: c.description || "",
          itemIds: [...c.itemIds],
        }
      : { name: "", description: "", itemIds: [] };
  };

  const [editingId, setEditingId] = useState(initialEditingId || null);
  const [draft, setDraft] = useState(initialDraft);
  const [filterStatus, setFilterStatus] = useState("owned");

  const startNew = () => {
    setDraft({
      name: "",
      description: "",
      itemIds: [],
      seasons: [],
      occasions: [],
    });
    setEditingId("new");
  };
  const startEdit = (c) => {
    setDraft({
      name: c.name,
      description: c.description || "",
      itemIds: [...c.itemIds],
      seasons: c.seasons || [],
      occasions: c.occasions || [],
    });
    setEditingId(c.id);
  };
  const cancelEdit = () => {
    if (directEdit) {
      onClose();
      return;
    }
    setEditingId(null);
    setDraft({ name: "", description: "", itemIds: [] });
  };
  const saveDraft = () => {
    if (!draft.name.trim()) return;
    let next;
    if (editingId === "new") {
      const id = `c_${Date.now()}`;
      next = [
        ...collections,
        {
          id,
          name: draft.name.trim(),
          description: draft.description.trim(),
          itemIds: draft.itemIds,
          seasons: draft.seasons,
          occasions: draft.occasions,
          createdAt: Date.now(),
        },
      ];
    } else {
      next = collections.map((c) =>
        c.id === editingId
          ? {
              ...c,
              name: draft.name.trim(),
              description: draft.description.trim(),
              itemIds: draft.itemIds,
              seasons: draft.seasons,
              occasions: draft.occasions,
            }
          : c,
      );
    }
    onSave(next);
    if (directEdit) {
      onClose();
      return;
    }
    setEditingId(null);
    setDraft({ name: "", description: "", itemIds: [] });
  };
  const deleteCollection = (id) => {
    if (
      !confirm(
        "Delete this collection? The items themselves stay in your closet.",
      )
    )
      return;
    onSave(collections.filter((c) => c.id !== id));
    if (editingId === id) cancelEdit();
  };
  const toggleItem = (itemId) => {
    setDraft({
      ...draft,
      itemIds: draft.itemIds.includes(itemId)
        ? draft.itemIds.filter((x) => x !== itemId)
        : [...draft.itemIds, itemId],
    });
  };

  const isEditing = editingId !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div
        className="relative bg-white w-full sm:max-w-2xl sm:max-h-[85vh] sm:rounded-2xl flex flex-col shadow-2xl fade-up overflow-hidden"
        style={{ height: "100dvh", maxHeight: "100dvh" }}
      >
        <div
          className="p-4 sm:p-6 border-b border-cream-100 flex items-center justify-between bg-white shrink-0"
          style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}
        >
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500">
              Collections
            </p>
            <h3 className="font-display text-2xl sm:text-3xl">
              {isEditing
                ? editingId === "new"
                  ? "New Collection"
                  : "Edit Collection"
                : "Your Collections"}
            </h3>
          </div>
          <button onClick={onClose} className="text-ink-500 p-2">
            <I.x size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          {!isEditing && (
            <div className="space-y-3">
              <p className="text-sm text-ink-600">
                Group items into themed collections — a packing list for a trip,
                a capsule, a season's rotation. Pieces can live in multiple
                collections.
              </p>
              {collections.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-cream-200 rounded-3xl bg-cream-50/50">
                  <p className="font-display italic text-ink-500 text-lg mb-2">
                    No collections yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {collections.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 p-3.5 bg-cream-50 border-2 border-cream-100 rounded-2xl"
                    >
                      <div className="w-9 h-9 rounded-full bg-sky2-100 flex items-center justify-center shrink-0">
                        <I.suitcase size={15} className="text-sky2-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-lg leading-tight truncate text-ink-900">
                          {toTitle(c.name)}
                        </p>
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-sky2-600">
                          {c.itemIds.length}{" "}
                          {c.itemIds.length === 1 ? "piece" : "pieces"}
                        </p>
                        {c.description && (
                          <p className="text-xs italic text-ink-500 mt-1 truncate">
                            "{c.description}"
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => startEdit(c)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-ink-600 active:bg-poppy-100 active:text-poppy-600 transition-colors"
                        aria-label="Edit"
                      >
                        <I.pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteCollection(c.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-ink-500 active:bg-petal-100 active:text-petal-600 transition-colors"
                        aria-label="Delete"
                      >
                        <I.trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={startNew}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 bg-sky2-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop"
              >
                <I.plus size={16} /> New Collection
              </button>
            </div>
          )}

          {isEditing && (
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-1">
                  Name
                </label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Italy Packing List"
                  className="w-full bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none font-display text-xl py-1"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-1">
                  Description (optional)
                </label>
                <input
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                  placeholder="A short note about this collection"
                  className="w-full bg-transparent border-b border-cream-200 focus:border-poppy-500 outline-none text-sm italic py-1"
                />
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
                  Season
                </p>
                <div className="flex flex-wrap gap-2">
                  {SEASON_OPTIONS.map((s) => (
                    <Chip
                      key={s}
                      tone="season"
                      active={(draft.seasons || []).includes(s)}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          seasons: (draft.seasons || []).includes(s)
                            ? (draft.seasons || []).filter((x) => x !== s)
                            : [...(draft.seasons || []), s],
                        })
                      }
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
                <div className="flex flex-wrap gap-2">
                  {OCCASION_OPTIONS.map((o) => (
                    <Chip
                      key={o}
                      tone="occasion"
                      active={(draft.occasions || []).includes(o)}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          occasions: (draft.occasions || []).includes(o)
                            ? (draft.occasions || []).filter((x) => x !== o)
                            : [...(draft.occasions || []), o],
                        })
                      }
                    >
                      {o}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-2">
                  Pieces ({draft.itemIds.length})
                </p>
                <div className="flex gap-2 flex-wrap mb-3">
                  <Chip
                    tone="status"
                    active={!filterStatus}
                    onClick={() => setFilterStatus(null)}
                  >
                    All
                  </Chip>
                  {STATUS_OPTIONS.map((s) => (
                    <Chip
                      key={s}
                      tone="status"
                      active={filterStatus === s}
                      onClick={() =>
                        setFilterStatus(filterStatus === s ? null : s)
                      }
                    >
                      {s}
                    </Chip>
                  ))}
                </div>
                {items.length === 0 ? (
                  <p className="text-sm text-ink-500 italic">
                    No items in your closet yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {items
                      .filter(
                        (it) =>
                          !filterStatus ||
                          (it.status || "owned") === filterStatus,
                      )
                      .map((it) => {
                        const active = draft.itemIds.includes(it.id);
                        return (
                          <button
                            key={it.id}
                            onClick={() => toggleItem(it.id)}
                            className={`relative rounded-2xl overflow-hidden border-2 transition-all active:scale-[0.97] ${active ? "border-poppy-500 ring-2 ring-poppy-500/25 shadow-pop" : "border-cream-100 bg-white"}`}
                          >
                            <div className="aspect-square bg-gradient-to-br bg-poppy-gradient flex items-center justify-center">
                              {images[it.id] && (
                                <img
                                  src={images[it.id]}
                                  alt={it.name}
                                  className="w-full h-full object-contain p-2"
                                />
                              )}
                              {active && (
                                <div className="absolute top-1.5 right-1.5 bg-poppy-500 text-white rounded-full p-1 shadow-pop">
                                  <I.check size={10} />
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] font-bold font-display text-ink-800 truncate px-1.5 py-1">
                              {toTitle(it.name)}
                            </p>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <div
            className="p-4 sm:p-6 border-t-2 border-cream-100 bg-white flex gap-2 shrink-0"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
          >
            <button
              onClick={cancelEdit}
              className="flex-1 py-3.5 bg-cream-50 border-2 border-cream-100 text-ink-700 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={saveDraft}
              disabled={!draft.name.trim()}
              className="flex-[2] flex items-center justify-center gap-2 py-3.5 bg-sky2-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 disabled:opacity-40 shadow-pop"
            >
              <I.check size={14} />{" "}
              {editingId === "new" ? "Create Collection" : "Save Collection"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export { ManageCollectionsModal };
