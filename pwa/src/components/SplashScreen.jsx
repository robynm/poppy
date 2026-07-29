import { useState } from "react";
import { PoppyMark } from "./PoppyMark.jsx";
import { I, Icon } from "../lib/icons.jsx";

// --- Splash / landing page -------------------------------------------------
// Shown to visitors who open Poppy in a browser tab (not the installed app).
// Promotes installing for the full experience, with an escape hatch to keep
// using it in the browser.
function SplashScreen({ canInstall, onInstall, onContinue }) {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
  const [showHelp, setShowHelp] = useState(false);
  const handleInstall = () => {
    // Use the native install prompt when the browser offers one; otherwise
    // reveal platform-specific instructions (iOS Safari has no prompt API).
    if (canInstall) onInstall();
    else setShowHelp(true);
  };
  const features = [
    {
      Icon: I.shirt,
      tone: "text-poppy-600 bg-poppy-100",
      title: "Your closet",
      desc: "Photograph and organize everything you own.",
    },
    {
      Icon: I.sunglasses,
      tone: "text-petal-600 bg-petal-100",
      title: "Looks",
      desc: "Combine pieces into outfits worth keeping.",
    },
    {
      Icon: I.suitcase,
      tone: "text-sky2-600 bg-sky2-100",
      title: "Collections",
      desc: "Packing lists, capsules, and seasonal rotations.",
    },
  ];
  return (
    <div
      className="min-h-screen bg-cream-50 poppy-wash text-ink-900 flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 w-full max-w-md mx-auto text-center fade-up">
        <div className="w-20 h-20 rounded-full bg-poppy-500 flex items-center justify-center bloom shadow-poppy overflow-hidden mb-6">
          <PoppyMark />
        </div>
        <h1 className="font-display font-bold text-5xl sm:text-6xl leading-[1.05] mb-3">
          Poppy
        </h1>
        <p className="font-display text-2xl sm:text-3xl leading-tight mb-3">
          <em className="text-poppy-600">Cultivate</em> your closet.
        </p>
        <p className="text-sm text-ink-500 mb-8 text-left">
          Catalog your wardrobe and shape it into looks and collections.
          Everything stays on your device — no ads, no subscriptions, no
          trackers.
        </p>

        <div className="w-full space-y-2.5 text-left mb-8">
          {features.map(({ Icon, tone, title, desc }) => (
            <div
              key={title}
              className="flex items-center gap-3 bg-white/70 border-2 border-cream-100 rounded-2xl p-3 shadow-card"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tone}`}
              >
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-base leading-tight text-ink-900">
                  {title}
                </p>
                <p className="text-xs text-ink-500 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          data-testid="splash-install"
          onClick={handleInstall}
          className="w-full flex items-center justify-center gap-2 py-4 bg-poppy-500 text-white text-xs font-bold tracking-[0.2em] uppercase rounded-full active:scale-95 shadow-poppy"
        >
          <I.install size={16} /> Install Poppy
        </button>

        {showHelp && !canInstall && (
          <div className="w-full mt-3 bg-white border-2 border-cream-100 rounded-2xl p-4 text-sm text-ink-600 shadow-card fade-up">
            {isIOS ? (
              <>
                <p className="font-bold text-ink-800 mb-1 flex items-center justify-center gap-2">
                  <I.share size={15} /> Add to Home Screen
                </p>
                <p>
                  In Safari, tap the <span className="font-bold">Share</span>{" "}
                  button, then{" "}
                  <span className="font-bold">"Add to Home Screen"</span> to
                  install Poppy.
                </p>
              </>
            ) : (
              <p>
                To install, open your browser's menu and choose{" "}
                <span className="font-bold">"Install Poppy"</span> or{" "}
                <span className="font-bold">"Add to Home Screen"</span>.
              </p>
            )}
          </div>
        )}

        <button
          data-testid="splash-continue"
          onClick={onContinue}
          className="mt-4 text-[11px] font-bold tracking-[0.2em] uppercase text-ink-500 underline active:text-ink-700"
        >
          Continue in browser
        </button>
      </div>
    </div>
  );
}

export { SplashScreen };
