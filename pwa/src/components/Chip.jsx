// --- UI primitives ---------------------------------------------------------
// Color tones — each pairs a vibrant "active" with a soft pastel "inactive".
// Six distinct hues plus the brand poppy red-orange, so categories read at a glance.
function Chip({ children, active, onClick, tone = "default" }) {
  const tones = {
    default: active
      ? "bg-poppy-500 text-white border-poppy-500 shadow-pop"
      : "bg-poppy-50 text-poppy-700 border-poppy-100",
    category: active
      ? "bg-amber-500 text-white border-amber-500 shadow-pop"
      : "bg-amber-50 text-amber-800 border-amber-100",
    season: active
      ? "bg-leaf-500 text-white border-leaf-500 shadow-pop"
      : "bg-leaf-50 text-leaf-700 border-leaf-100",
    occasion: active
      ? "bg-petal-500 text-white border-petal-500 shadow-pop"
      : "bg-petal-50 text-petal-700 border-petal-100",
    custom: active
      ? "bg-plum-500 text-white border-plum-500 shadow-pop"
      : "bg-plum-50 text-plum-700 border-plum-100",
    collection: active
      ? "bg-sky2-500 text-white border-sky2-500 shadow-pop"
      : "bg-sky2-50 text-sky2-700 border-sky2-100",
    status: active
      ? "bg-ink-500 text-white border-ink-500 shadow-pop"
      : "bg-ink-50 text-ink-700 border-ink-400",
    brand: active
      ? "bg-petal-600 text-white border-petal-600 shadow-pop"
      : "bg-petal-50 text-petal-700 border-petal-100",
    year: active
      ? "bg-buttercup-500 text-white border-buttercup-500 shadow-pop"
      : "bg-buttercup-50 text-buttercup-700 border-buttercup-100",
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full transition-all active:scale-95 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

export { Chip };
