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

export { toTitle, formatBytes };
