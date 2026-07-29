import { toTitle } from "../lib/format.js";
import { useBodyScrollLock } from "../lib/hooks.js";
import { I } from "../lib/icons.jsx";

// yyyy-mm-dd (local) for an <input type="date">.
function toDateInputValue(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
// Parse the input back to epoch-ms at local noon (avoids TZ off-by-one drift).
function fromDateInputValue(str) {
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

function SelfieDetailModal({
  selfie,
  imageUrl,
  outfits,
  selfies,
  onSaveSelfies,
  onDelete,
  onClose,
}) {
  useBodyScrollLock();

  const linkedLooks = (outfits || []).filter((o) =>
    (o.selfieIds || []).includes(selfie.id),
  );

  const changeDate = (e) => {
    const ts = fromDateInputValue(e.target.value);
    if (ts == null) return;
    onSaveSelfies(
      selfies.map((s) => (s.id === selfie.id ? { ...s, dateTaken: ts } : s)),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        data-testid="selfie-detail"
        className="relative bg-white max-w-sm w-full rounded-3xl shadow-2xl fade-up overflow-hidden"
      >
        <button
          data-testid="selfie-close"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 text-ink-600 shadow-card active:scale-90"
          aria-label="Close"
        >
          <I.x size={18} />
        </button>

        <div className="bg-cream-50 flex items-center justify-center max-h-[55vh] overflow-hidden">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Selfie"
              className="w-full max-h-[55vh] object-contain"
            />
          )}
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-1">
              Date taken
            </label>
            <input
              data-testid="selfie-date"
              type="date"
              value={toDateInputValue(selfie.dateTaken)}
              onChange={changeDate}
              className="w-full bg-transparent border-b border-cream-200 focus:border-buttercup-500 outline-none text-sm py-1"
            />
          </div>

          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-ink-500 mb-1.5">
              In these looks
            </p>
            {linkedLooks.length === 0 ? (
              <p className="text-xs italic text-ink-400">
                Not linked to a look yet — add it from a look's builder.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {linkedLooks.map((o) => (
                  <span
                    key={o.id}
                    className="text-[10px] font-bold tracking-[0.1em] uppercase text-petal-700 bg-petal-50 px-2.5 py-1 rounded-full"
                  >
                    {toTitle(o.name)}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            data-testid="selfie-delete"
            onClick={() => {
              if (confirm("Delete this selfie?")) onDelete();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-petal-50 border-2 border-petal-100 text-petal-600 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95"
          >
            <I.trash size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export { SelfieDetailModal };
