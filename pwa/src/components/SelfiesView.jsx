import { useState, useEffect, useRef } from "react";
import { SelfieDetailModal } from "./SelfieDetailModal.jsx";
import { groupByMonth } from "../lib/format.js";
import { readDateTaken } from "../lib/exif.js";
import { I } from "../lib/icons.jsx";
import { resizeImageToBlob } from "../lib/images.js";
import { Log } from "../lib/log.js";

// --- SELFIES VIEW ----------------------------------------------------------
// A gallery of selfies grouped by the month each photo was taken. Photos are
// uploaded here (date-taken read from EXIF, falling back to the file date) and
// can be associated with looks from the look builder.
function SelfiesView({
  selfies,
  outfits,
  images,
  onSaveSelfies,
  onPutImage,
  onDeleteSelfie,
  onSetHeaderAction,
}) {
  const [viewingId, setViewingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const addButtonRef = useRef(null);

  const openPicker = () => fileInputRef.current?.click();

  useEffect(() => {
    const el = addButtonRef.current;
    if (!el || !onSetHeaderAction) return;
    const obs = new IntersectionObserver(
      ([entry]) =>
        onSetHeaderAction(
          entry.isIntersecting
            ? null
            : { label: "Add Selfies", tone: "poppy", onClick: openPicker },
        ),
      { threshold: 0.5, rootMargin: "-68px 0px 0px 0px" },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      onSetHeaderAction(null);
    };
  }, []);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    const additions = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Capture the date BEFORE re-encoding (canvas strips EXIF).
        const dateTaken = (await readDateTaken(file)) ?? file.lastModified;
        const blob = await resizeImageToBlob(file, 1200, 0.88);
        if (!blob) continue;
        const id = `s_${Date.now()}_${i}`;
        await onPutImage(id, blob);
        additions.push({ id, createdAt: Date.now(), dateTaken });
      } catch (e) {
        Log.error("selfie.uploadFailed", { name: file?.name, error: String(e) });
      }
    }
    if (additions.length) onSaveSelfies([...additions, ...selfies]);
    setUploading(false);
  };

  const groups = groupByMonth(selfies);
  const viewing = selfies.find((s) => s.id === viewingId);

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="fade-up">
          <div className="mb-6 sm:mb-10">
            <h2 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900 mb-2">
              Selfies
            </h2>
            <div className="flex items-end justify-between gap-4">
              <h3 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900">
                <em className="text-buttercup-600">worn &amp; remembered.</em>
              </h3>
              <button
                data-testid="selfies-upload-btn"
                ref={addButtonRef}
                onClick={openPicker}
                disabled={uploading}
                style={{ flexShrink: 0 }}
                className="flex items-center gap-2 px-5 py-3 bg-buttercup-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop disabled:opacity-40"
              >
                <I.plus size={16} /> {uploading ? "Adding…" : "Add Selfies"}
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            data-testid="selfies-file"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
          />

          {selfies.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-buttercup-200 bg-buttercup-50/40 rounded-3xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-buttercup-100 flex items-center justify-center">
                <I.camera size={28} className="text-buttercup-600" />
              </div>
              <p className="font-display font-bold text-2xl mb-2 text-ink-900">
                No selfies yet.
              </p>
              <p className="text-xs font-bold tracking-widest uppercase text-buttercup-700 mb-6 px-4">
                Add photos to remember how you wore it
              </p>
              <button
                onClick={openPicker}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-buttercup-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full shadow-pop active:scale-95 disabled:opacity-40"
              >
                Add your first <I.chevron size={14} />
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {groups.map((group) => (
                <section
                  key={group.key}
                  data-testid="selfie-month"
                  data-month={group.key}
                >
                  <h4 className="font-display font-bold text-lg text-ink-800 mb-3">
                    {group.label}
                    <span className="ml-2 text-[10px] font-bold tracking-[0.15em] uppercase text-buttercup-600">
                      {group.items.length}
                    </span>
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {group.items.map((s) => (
                      <button
                        key={s.id}
                        data-testid="selfie-card"
                        data-selfie-id={s.id}
                        onClick={() => setViewingId(s.id)}
                        className="aspect-square bg-white border-2 border-cream-100 rounded-2xl overflow-hidden shadow-card active:scale-[0.98] transition-transform"
                      >
                        {images[s.id] && (
                          <img
                            src={images[s.id]}
                            alt="Selfie"
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {viewing && (
        <SelfieDetailModal
          selfie={viewing}
          imageUrl={images[viewing.id]}
          outfits={outfits}
          onSaveSelfies={onSaveSelfies}
          selfies={selfies}
          onDelete={() => {
            onDeleteSelfie(viewing.id);
            setViewingId(null);
          }}
          onClose={() => setViewingId(null)}
        />
      )}
    </>
  );
}

export { SelfiesView };
