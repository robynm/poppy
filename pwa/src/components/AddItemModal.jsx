import { useRef } from "react";
import { useBodyScrollLock } from "../lib/hooks.js";
import { I } from "../lib/icons.jsx";

function AddItemModal({ onClose, onFile }) {
  useBodyScrollLock();
  const inputRef = useRef();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div
        data-testid="add-item-modal"
        className="relative bg-white max-w-md w-full p-6 sm:p-8 rounded-2xl shadow-2xl fade-up"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-ink-500 p-2"
        >
          <I.x size={18} />
        </button>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-poppy-50 rounded-full mb-3">
          <I.plus size={12} className="text-poppy-500" />
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-poppy-700">
            New Piece
          </p>
        </div>
        <h3 className="font-display font-bold text-2xl sm:text-3xl mb-3 sm:mb-4 text-ink-900">
          Add to your closet
        </h3>
        <p className="text-sm text-ink-600 mb-6">
          Pick from your gallery or snap a new photo. We'll resize it to save
          space.
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          data-testid="choose-photo-btn"
          className="w-full border-2 border-dashed border-poppy-200 bg-poppy-50/50 active:border-poppy-500 active:bg-poppy-50 transition-colors rounded-3xl py-8 sm:py-10 flex flex-col items-center gap-3 text-poppy-600"
        >
          <div className="w-12 h-12 rounded-full bg-poppy-100 flex items-center justify-center">
            <I.upload size={22} />
          </div>
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase">
            Choose a photo
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          data-testid="add-item-file"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="hidden"
        />
      </div>
    </div>
  );
}

export { AddItemModal };
