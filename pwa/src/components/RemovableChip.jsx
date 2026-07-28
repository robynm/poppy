import { I } from "../lib/icons.jsx";

// A pill showing an active filter with an inline × to remove it.
function RemovableChip({ children, tone = "default", onRemove }) {
  const tones = {
    default: "bg-poppy-500 text-white border-poppy-500",
    category: "bg-amber-500 text-white border-amber-500",
    season: "bg-leaf-500 text-white border-leaf-500",
    occasion: "bg-petal-500 text-white border-petal-500",
    custom: "bg-plum-500 text-white border-plum-500",
    collection: "bg-sky2-500 text-white border-sky2-500",
    status: "bg-ink-500 text-white border-ink-500",
    brand: "bg-petal-600 text-white border-petal-600",
    year: "bg-buttercup-500 text-white border-buttercup-500",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] border-2 rounded-full shadow-pop ${tones[tone]}`}
    >
      <span className="inline-flex items-center gap-1.5">{children}</span>
      <button
        onClick={onRemove}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/25 hover:bg-white/40 active:scale-90 transition-colors"
        aria-label="Remove filter"
      >
        <I.x size={10} />
      </button>
    </span>
  );
}

export { RemovableChip };
