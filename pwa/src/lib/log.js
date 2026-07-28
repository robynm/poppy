import { STORAGE_KEYS } from "./constants.js";

// --- Diagnostics log -------------------------------------------------------
// A tiny persisted ring buffer. Problems on a phone happen where the dev
// console isn't reachable, so we keep a trail in localStorage that survives
// reloads and can be read back / copied from the Backup screen. Every entry is
// also mirrored to the console. Capped so it can never meaningfully grow.
const Log = (() => {
  const KEY = STORAGE_KEYS.diag;
  const MAX = 200;
  let buf = [];
  try {
    buf = JSON.parse(localStorage.getItem(KEY) || "[]") || [];
  } catch {
    buf = [];
  }

  // Errors don't survive JSON.stringify (they serialize to {}), so pull the
  // useful fields off by hand; everything else round-trips through JSON.
  function normalize(data) {
    if (data === undefined) return undefined;
    if (data instanceof Error)
      return { name: data.name, message: data.message, stack: data.stack };
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      return String(data);
    }
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(buf));
    } catch {
      /* if there's no room for the log itself, let it go */
    }
  }
  function add(level, event, data) {
    const entry = { t: new Date().toISOString(), level, event };
    const norm = normalize(data);
    if (norm !== undefined) entry.data = norm;
    buf.push(entry);
    if (buf.length > MAX) buf = buf.slice(-MAX);
    persist();
    const fn =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : console.log;
    fn(`[poppy] ${event}`, norm !== undefined ? norm : "");
    return entry;
  }
  return {
    info: (event, data) => add("info", event, data),
    warn: (event, data) => add("warn", event, data),
    error: (event, data) => add("error", event, data),
    entries: () => buf.slice(),
    clear: () => {
      buf = [];
      persist();
    },
  };
})();

// Catch anything that slips past the try/catch blocks so it still leaves a trail.
if (typeof window !== "undefined" && !window.__poppyErrorHooks) {
  window.__poppyErrorHooks = true;
  window.addEventListener("error", (e) => {
    Log.error("window.error", {
      message: e.message,
      source: e.filename,
      line: e.lineno,
      col: e.colno,
      stack: e.error && e.error.stack,
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    Log.error("unhandledrejection", e.reason);
  });
}

export { Log };
