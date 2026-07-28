import { useState, useEffect, useRef } from "react";

function useBodyScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
}

// --- Drag-reorder hook -----------------------------------------------------
// Pointer-based reorder for a grid of items. Each item gets a ref attached via
// register(index, element); the drag handle on the card calls onHandlePointerDown.
// While dragging, hoverIndex updates as the pointer crosses other items.
// On pointer-up, onCommit(fromIndex, toIndex) fires (toIndex is where the item
// should land in the original list; if no movement, toIndex === fromIndex).
function useDragReorder(onCommit) {
  const itemRefs = useRef(new Map()); // index -> element
  const [dragIndex, setDragIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const grabOffsetRef = useRef({ x: 0, y: 0 }); // pointer offset from card top-left at grab time
  const startRectRef = useRef(null); // card dimensions at grab time
  const lastPointerRef = useRef({ x: 0, y: 0 }); // current pointer (no state = no re-renders)
  const ghostRef = useRef(null); // attached to the ghost DOM node
  const pendingRef = useRef(null); // pending drag before movement threshold

  const register = (index, el) => {
    if (el) itemRefs.current.set(index, el);
    else itemRefs.current.delete(index);
  };

  const findIndexAt = (clientX, clientY) => {
    for (const [idx, el] of itemRefs.current.entries()) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.bottom
      ) {
        return idx;
      }
    }
    return null;
  };

  useEffect(() => {
    if (dragIndex === null) return;
    const handleMove = (e) => {
      const x = e.clientX,
        y = e.clientY;
      lastPointerRef.current = { x, y };
      if (ghostRef.current) {
        const tx = x - grabOffsetRef.current.x;
        const ty = y - grabOffsetRef.current.y;
        ghostRef.current.style.transform = `translate(${tx}px, ${ty}px) rotate(1.5deg) scale(1.05)`;
      }
      const over = findIndexAt(x, y);
      if (over !== null) setHoverIndex(over);
      e.preventDefault();
    };
    const handleUp = () => {
      const from = dragIndex;
      const to = hoverIndex !== null ? hoverIndex : dragIndex;
      setDragIndex(null);
      setHoverIndex(null);
      if (onCommit && from !== null) onCommit(from, to);
    };
    const handleCancel = () => {
      setDragIndex(null);
      setHoverIndex(null);
    };
    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [dragIndex, hoverIndex, onCommit]);

  const onHandlePointerDown = (index) => (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    const el = itemRefs.current.get(index);
    if (!el) return;
    const r = el.getBoundingClientRect();
    pendingRef.current = {
      index,
      startX: e.clientX,
      startY: e.clientY,
      grabOffset: { x: e.clientX - r.left, y: e.clientY - r.top },
      rect: { width: r.width },
    };

    const activate = (me) => {
      const p = pendingRef.current;
      if (!p) return;
      pendingRef.current = null;
      startRectRef.current = p.rect;
      grabOffsetRef.current = p.grabOffset;
      lastPointerRef.current = { x: me.clientX, y: me.clientY };
      setDragIndex(p.index);
      setHoverIndex(p.index);
    };

    const onPendingMove = (me) => {
      if (!pendingRef.current) return;
      const dx = me.clientX - pendingRef.current.startX;
      const dy = me.clientY - pendingRef.current.startY;
      if (Math.sqrt(dx * dx + dy * dy) > 8) {
        me.preventDefault();
        cleanup();
        activate(me);
      }
    };
    const onPendingEnd = () => {
      cleanup();
      pendingRef.current = null;
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", onPendingMove);
      window.removeEventListener("pointerup", onPendingEnd);
      window.removeEventListener("pointercancel", onPendingEnd);
    };
    window.addEventListener("pointermove", onPendingMove, { passive: false });
    window.addEventListener("pointerup", onPendingEnd);
    window.addEventListener("pointercancel", onPendingEnd);
  };

  return {
    register,
    dragIndex,
    hoverIndex,
    ghostRef,
    startRectRef,
    grabOffsetRef,
    lastPointerRef,
    onHandlePointerDown,
  };
}

// Translate a reorder within a (possibly filtered) visible list into a new master array,
// preserving the positions of items that are filtered out. Items must have an `id`.
// Returns the original array reference when nothing changes.
function reorderByVisible(master, visibleIds, fromVisible, toVisible) {
  if (fromVisible === toVisible) return master;
  const movingId = visibleIds[fromVisible];
  if (movingId == null) return master;
  const fromIdx = master.findIndex((x) => x.id === movingId);
  if (fromIdx === -1) return master;
  const moving = master[fromIdx];
  const without = master.filter((x) => x.id !== movingId);
  const targetVisibleId = visibleIds[toVisible];
  let toIdx;
  if (targetVisibleId == null || targetVisibleId === movingId) {
    toIdx = fromIdx;
  } else {
    const targetIdx = without.findIndex((x) => x.id === targetVisibleId);
    toIdx = fromVisible < toVisible ? targetIdx + 1 : targetIdx;
  }
  const next = [...without];
  next.splice(toIdx, 0, moving);
  return next;
}

// --- Install prompt --------------------------------------------------------
function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(
    window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone,
  );
  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const promptInstall = async () => {
    if (!deferred) return false;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      setDeferred(null);
      return true;
    }
    return false;
  };
  return { canInstall: !!deferred && !installed, installed, promptInstall };
}

export { useBodyScrollLock, useDragReorder, reorderByVisible, useInstallPrompt };
