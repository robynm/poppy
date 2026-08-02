import { EditCardPreview } from "./EditCardPreview.jsx";
import { I } from "../lib/icons.jsx";

function EditCard({
  edit,
  items,
  images,
  selfies,
  onOpen,
  delay = 0,
  id,
  cardRef,
  reorderHandle,
  isDragging,
  isDropTarget,
}) {
  return (
    <div
      id={id}
      data-testid="edit-card"
      data-edit-id={edit.id}
      ref={cardRef}
      onClick={onOpen}
      className={`fade-up relative text-left bg-white border-2 rounded-2xl overflow-hidden shadow-card transition-all ${reorderHandle ? "select-none" : "cursor-pointer active:scale-[0.98]"} ${isDragging ? "opacity-0" : isDropTarget ? "border-petal-500 ring-4 ring-petal-500/25" : "border-cream-200"}`}
      style={{
        animationDelay: `${delay}ms`,
        ...(isDragging && { animation: "none", opacity: 0 }),
      }}
    >
      <EditCardPreview
        edit={edit}
        items={items}
        images={images}
        selfies={selfies}
      />
      {reorderHandle && (
        <div
          aria-hidden="true"
          onPointerDown={reorderHandle}
          style={{ touchAction: "none" }}
          className="absolute top-1 left-1 p-2.5 bg-white/95 backdrop-blur rounded-full text-ink-600 shadow-card cursor-grab active:cursor-grabbing"
        >
          <I.dots size={18} />
        </div>
      )}
    </div>
  );
}

export { EditCard };
