import { useState, useEffect, useRef } from "react";
import { CroppedImage } from "./CroppedImage.jsx";
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
const RATING_ICON = { happy: I.smile, meh: I.meh, sad: I.frown };
const RATING_FILTERS = [
  { key: "happy", Glyph: I.smile },
  { key: "meh", Glyph: I.meh },
  { key: "sad", Glyph: I.frown },
];

function SelfiesView({
  selfies,
  edits,
  items,
  images,
  onSaveSelfies,
  onPutImage,
  onDeleteSelfie,
  onSetHeaderAction,
  openId,
  onOpened,
}) {
  const [viewingId, setViewingId] = useState(null);

  // Deep-link from elsewhere (e.g. an item's "Worn in" links): open the
  // requested snap once, then clear the request so it doesn't reopen.
  useEffect(() => {
    if (!openId) return;
    if (selfies.some((s) => s.id === openId)) setViewingId(openId);
    onOpened?.();
  }, [openId]);
  const [activeRatings, setActiveRatings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // { done, total }

  const toggleRating = (key) =>
    setActiveRatings((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key],
    );
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
            : { label: "Add Snaps", tone: "buttercup", onClick: openPicker },
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
    setUploadProgress({ done: 0, total: files.length });
    // Snapshot the pre-upload list once; each success is persisted against it so
    // a mid-batch interruption (e.g. the browser reclaiming a busy tab while it
    // decodes many large photos) keeps whatever finished instead of losing it all.
    const base = selfies;
    const additions = [];
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Capture the date BEFORE re-encoding (canvas strips EXIF).
        const dateTaken = (await readDateTaken(file)) ?? file.lastModified;
        const blob = await resizeImageToBlob(file, 1200, 0.88);
        if (!blob) {
          failed++;
          continue;
        }
        const id = `s_${Date.now()}_${i}`;
        await onPutImage(id, blob);
        additions.push({ id, createdAt: Date.now(), dateTaken });
        onSaveSelfies([...additions, ...base]); // persist progress after each
      } catch (e) {
        failed++;
        Log.error("selfie.uploadFailed", { name: file?.name, error: String(e) });
      }
      setUploadProgress({ done: i + 1, total: files.length });
      // Yield between images so the UI updates and the browser can reclaim the
      // decoded-bitmap memory before the next one — avoids OOM on big batches.
      await new Promise((r) => setTimeout(r));
    }
    setUploading(false);
    setUploadProgress(null);
    if (failed > 0) {
      alert(
        `Added ${additions.length} of ${files.length} snaps. ${failed} couldn't be processed — try adding ${failed === 1 ? "it" : "those"} again, or in a smaller batch.`,
      );
    }
  };

  const filteredSelfies =
    activeRatings.length > 0
      ? selfies.filter((s) => activeRatings.includes(s.rating))
      : selfies;
  const groups = groupByMonth(filteredSelfies);
  const viewing = selfies.find((s) => s.id === viewingId);

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="fade-up">
          <div className="mb-6 sm:mb-10">
            <h2 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900 mb-2">
              Snaps
            </h2>
            <div className="flex items-end justify-between gap-4">
              <h3 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink-900">
                <em className="text-buttercup-600">looks, lived in.</em>
              </h3>
              <button
                data-testid="selfies-upload-btn"
                ref={addButtonRef}
                onClick={openPicker}
                disabled={uploading}
                style={{ flexShrink: 0 }}
                className="flex items-center gap-2 px-5 py-3 bg-buttercup-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop disabled:opacity-40"
              >
                <I.plus size={16} />{" "}
                {uploading
                  ? uploadProgress
                    ? `${uploadProgress.done}/${uploadProgress.total}`
                    : "Adding…"
                  : "Add Snaps"}
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

          {uploadProgress && (
            <div
              data-testid="upload-progress"
              className="mb-6 p-4 bg-buttercup-50 border-2 border-buttercup-100 rounded-2xl fade-up"
            >
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-buttercup-700">
                  Adding snaps
                </p>
                <span className="text-xs font-bold text-ink-700">
                  {uploadProgress.done} of {uploadProgress.total}
                </span>
              </div>
              <div className="h-2 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-buttercup-500 rounded-full"
                  style={{
                    width: `${(uploadProgress.done / uploadProgress.total) * 100}%`,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}

          {selfies.length > 0 && (
            <div className="mb-6 flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink-400">
                Mood
              </span>
              <div className="flex gap-1.5" data-testid="selfie-rating-filter">
                {RATING_FILTERS.map(({ key, Glyph }) => {
                  const active = activeRatings.includes(key);
                  return (
                    <button
                      key={key}
                      data-testid="selfie-filter-btn"
                      data-rating={key}
                      aria-pressed={active}
                      onClick={() => toggleRating(key)}
                      className={`w-9 h-9 flex items-center justify-center rounded-full border-2 transition-all active:scale-95 ${
                        active
                          ? "border-buttercup-500 bg-buttercup-50 text-buttercup-600 shadow-pop"
                          : "border-cream-100 bg-white text-ink-300"
                      }`}
                    >
                      <Glyph size={18} />
                    </button>
                  );
                })}
              </div>
              {activeRatings.length > 0 && (
                <button
                  data-testid="selfie-filter-clear"
                  onClick={() => setActiveRatings([])}
                  className="text-[10px] font-bold tracking-[0.15em] uppercase text-ink-400 underline active:text-ink-700"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {selfies.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-buttercup-200 bg-buttercup-50/40 rounded-3xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-buttercup-100 flex items-center justify-center">
                <I.camera size={28} className="text-buttercup-600" />
              </div>
              <p className="font-display font-bold text-2xl mb-2 text-ink-900">
                No snaps yet.
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
          ) : filteredSelfies.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-cream-200 bg-cream-50/50 rounded-3xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-buttercup-100 flex items-center justify-center">
                <I.search size={26} className="text-buttercup-600" />
              </div>
              <p className="font-display font-bold text-xl text-ink-900">
                No snaps match.
              </p>
              <p className="text-xs font-bold tracking-widest uppercase text-buttercup-700 mt-2">
                Try another mood
              </p>
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
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 items-start">
                    {group.items.map((s) => (
                      <button
                        key={s.id}
                        data-testid="selfie-card"
                        data-selfie-id={s.id}
                        onClick={() => setViewingId(s.id)}
                        className="relative bg-white border-2 border-cream-100 rounded-2xl overflow-hidden shadow-card active:scale-[0.98] transition-transform text-left"
                      >
                        <CroppedImage
                          url={images[s.id]}
                          crop={s.crop}
                          className="w-full aspect-[1/2]"
                        />
                        {s.rating &&
                          (() => {
                            const Glyph = RATING_ICON[s.rating];
                            return (
                              <span
                                data-testid="selfie-card-rating"
                                data-rating={s.rating}
                                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-white/85 text-buttercup-600 shadow-card"
                              >
                                <Glyph size={14} />
                              </span>
                            );
                          })()}
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
          edits={edits}
          items={items}
          images={images}
          onSaveSelfies={onSaveSelfies}
          onReplaceImage={onPutImage}
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
