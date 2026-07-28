import { useRef } from "react";
import { toTitle } from "../lib/format.js";
import { useBodyScrollLock } from "../lib/hooks.js";
import { I } from "../lib/icons.jsx";

function SelfieModal({ outfitName, selfieUrl, onFile, onRemove, onClose }) {
  useBodyScrollLock();
  const inputRef = useRef(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white max-w-sm w-full p-6 sm:p-8 rounded-3xl shadow-2xl fade-up">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-ink-500 p-2"
        >
          <I.x size={18} />
        </button>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-buttercup-50 rounded-full mb-3">
          <I.camera size={12} className="text-buttercup-600" />
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-buttercup-700">
            Look selfie
          </p>
        </div>
        <h3 className="font-display font-bold text-2xl mb-5 text-ink-900">
          {toTitle(outfitName)}
        </h3>
        {selfieUrl ? (
          <div className="mb-5">
            <div className="relative inline-block w-full">
              <img
                src={selfieUrl}
                alt="Outfit selfie"
                className="w-full max-h-64 object-contain rounded-2xl bg-cream-50"
              />
            </div>
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => inputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-cream-50 border-2 border-cream-100 text-ink-700 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95"
              >
                <I.camera size={13} /> Replace
              </button>
              <button
                onClick={onRemove}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-petal-50 border-2 border-petal-100 text-petal-600 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95"
              >
                <I.trash size={13} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-buttercup-200 bg-buttercup-50/40 active:border-buttercup-500 active:bg-buttercup-50 transition-colors rounded-3xl py-8 flex flex-col items-center gap-3 text-buttercup-700 mb-5"
          >
            <div className="w-12 h-12 rounded-full bg-buttercup-100 flex items-center justify-center">
              <I.camera size={22} />
            </div>
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase">
              Choose a photo
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export { SelfieModal };
