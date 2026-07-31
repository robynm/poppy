import { useEffect, useRef } from "react";

// --- Device Back button support for overlays -------------------------------
// The app has no router, so the Android Back button would normally exit the
// PWA. This lets Back *close the open modal/drawer* instead.
//
// While any overlay is open we keep exactly one throwaway history entry
// ("sentinel"). Pressing Back consumes it → we close the top-most overlay.
// Overlays stack LIFO, so Back peels them one at a time before exiting.
//
// The arm/disarm of the sentinel is deferred to a microtask so that closing one
// overlay and opening another in the same tick (menu → modal, detail → builder)
// collapses to *no* history change — avoiding a race between an eager
// history.back() and the next overlay's pushState.

const stack = []; // close callbacks, most-recent last
let sentinelActive = false; // is our sentinel currently on the history stack?
let ignorePops = 0; // popstate events we caused and must ignore
let pending = false; // is a reconcile microtask queued?
let listening = false;

function reconcile() {
  pending = false;
  const desired = stack.length > 0;
  if (desired && !sentinelActive) {
    window.history.pushState({ poppyOverlay: true }, "");
    sentinelActive = true;
  } else if (!desired && sentinelActive) {
    sentinelActive = false;
    ignorePops += 1;
    window.history.back();
  }
}

function schedule() {
  if (pending) return;
  pending = true;
  queueMicrotask(reconcile);
}

function ensureListening() {
  if (listening) return;
  listening = true;
  window.addEventListener("popstate", () => {
    if (ignorePops > 0) {
      ignorePops -= 1;
      return;
    }
    if (!stack.length) return; // not one of our entries — let the app exit
    sentinelActive = false; // Back consumed our sentinel
    // If other overlays remain open beneath this one, re-arm for them now.
    if (stack.length > 1) {
      window.history.pushState({ poppyOverlay: true }, "");
      sentinelActive = true;
    }
    stack[stack.length - 1](); // close the top overlay (unregister follows)
  });
}

function register(close) {
  ensureListening();
  stack.push(close);
  schedule();
}

function unregister(close) {
  const i = stack.lastIndexOf(close);
  if (i === -1) return;
  stack.splice(i, 1);
  schedule();
}

// Call inside a modal/overlay component: `useBackButton(true, onClose)`.
// While `open` is true, the device Back button invokes `onClose`.
export function useBackButton(open, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const close = () => onCloseRef.current();
    register(close);
    return () => unregister(close);
  }, [open]);
}
