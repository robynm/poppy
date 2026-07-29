const toTitle = (s) =>
  s ? s.replace(/(?<!')\b\w/g, (c) => c.toUpperCase()) : s;

// Human-readable byte size: picks KB / MB / GB so we never show something like
// "10,252 MB". Small numbers keep one decimal; large ones round.
function formatBytes(bytes) {
  const b = Number(bytes) || 0;
  const KB = 1024,
    MB = KB * 1024,
    GB = MB * 1024;
  const trim = (n) => n.toFixed(1).replace(/\.0$/, "");
  if (b >= GB) return `${trim(b / GB)} GB`;
  if (b >= MB) return `${Math.round(b / MB).toLocaleString()} MB`;
  if (b >= KB) return `${Math.round(b / KB).toLocaleString()} KB`;
  return `${Math.round(b)} B`;
}

// --- Date grouping (for the Selfies gallery) ------------------------------

// Stable, sortable month key for an epoch-ms timestamp, e.g. "2026-07".
function monthKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Human month header, e.g. "July 2026".
function monthLabel(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

// Group items carrying a `dateTaken` (epoch ms) into month buckets, newest
// month first, and newest item first within each month. Returns
// [{ key, label, items }].
function groupByMonth(list) {
  const buckets = new Map();
  for (const it of list || []) {
    const key = monthKey(it.dateTaken);
    if (!buckets.has(key))
      buckets.set(key, { key, label: monthLabel(it.dateTaken), items: [] });
    buckets.get(key).items.push(it);
  }
  const groups = [...buckets.values()].sort((a, b) => b.key.localeCompare(a.key));
  for (const g of groups) g.items.sort((a, b) => b.dateTaken - a.dateTaken);
  return groups;
}

export { toTitle, formatBytes, monthKey, monthLabel, groupByMonth };
