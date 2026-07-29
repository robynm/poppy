import { toTitle } from "../lib/format.js";
import { I } from "../lib/icons.jsx";

function ItemCard({
  item,
  image,
  onClick,
  onSelectToggle,
  delay = 0,
  reorderHandle,
  isDragging,
  isDropTarget,
  cardRef,
  isSelected,
  compact,
}) {
  return (
    <div
      ref={cardRef}
      onClick={onClick}
      data-testid="item-card"
      data-item-id={item.id}
      className={`item-card fade-up bg-white border-2 ${compact ? "rounded-2xl select-none" : "cursor-pointer rounded-2xl active:scale-[0.98]"} overflow-hidden relative transition-colors shadow-card ${isDragging ? "opacity-0" : isDropTarget ? "border-poppy-500 ring-4 ring-poppy-500/25" : isSelected ? "border-poppy-500 ring-4 ring-poppy-500/25" : "border-cream-100"}`}
      style={{
        animationDelay: `${delay}ms`,
        ...(isDragging && { animation: "none", opacity: 0 }),
      }}
    >
      <div className="aspect-square flex items-center justify-center overflow-hidden relative">
        {image ? (
          <img
            src={image}
            alt={item.name}
            draggable={false}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain p-1.5 select-none"
          />
        ) : (
          <I.shirt size={24} className="text-poppy-300" />
        )}
        {reorderHandle && (
          <div
            aria-hidden="true"
            onPointerDown={reorderHandle}
            style={{ touchAction: "none" }}
            className="absolute top-1 left-1 p-2.5 bg-white rounded-full text-ink-600 shadow-card cursor-grab active:cursor-grabbing"
          >
            <I.dots size={18} />
          </div>
        )}
        {onSelectToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectToggle();
            }}
            aria-label={isSelected ? "Deselect item" : "Select item"}
            className={`absolute top-1.5 right-1.5 rounded-full w-6 h-6 flex items-center justify-center transition-colors shadow-card ${isSelected ? "bg-poppy-500 text-white" : "bg-white text-ink-300 border border-cream-200"}`}
          >
            <I.check size={12} />
          </button>
        )}
      </div>
      {!compact && (
        <div className="p-2 border-t-2 border-cream-100">
          <p className="font-display font-semibold text-xs leading-tight truncate text-ink-900">
            {toTitle(item.name)}
          </p>
          <p className="text-[8px] font-bold tracking-[0.12em] uppercase text-poppy-600 mt-0.5 truncate">
            {item.category}
          </p>
        </div>
      )}
    </div>
  );
}

export { ItemCard };
