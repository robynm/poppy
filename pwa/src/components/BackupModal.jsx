import { useState, useEffect, useRef } from "react";
import { exportBackup, mergeBackup, readFileAsText, validateBackup } from "../lib/backup.js";
import { formatBytes } from "../lib/format.js";
import { useBodyScrollLock } from "../lib/hooks.js";
import { useBackButton } from "../lib/backNav.js";
import { I } from "../lib/icons.jsx";
import { Log } from "../lib/log.js";
import { IDB } from "../lib/storage.js";

function BackupModal({
  items,
  images,
  edits,
  customTags,
  brands,
  selfies,
  cloudEnabled,
  cloudLabel,
  cloudStatus,
  onCloudSync,
  onClose,
  onImport,
}) {
  useBodyScrollLock();
  useBackButton(true, onClose);
  const fileRef = useRef();
  const [status, setStatus] = useState(null); // {kind: 'info'|'error'|'warn'|'success', message}
  const [pending, setPending] = useState(null); // parsed valid backup awaiting strategy choice
  const [storageEstimate, setStorageEstimate] = useState(null); // {usage, quota} in bytes
  const [persisted, setPersisted] = useState(null); // null=unknown, true/false once checked
  const [busy, setBusy] = useState(false); // an import/export is in flight

  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage
        .estimate()
        .then(setStorageEstimate)
        .catch(() => {});
    }
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage
        .persisted()
        .then(setPersisted)
        .catch(() => {});
    }
  }, [images]);

  // Build a plain-text diagnostics report: environment, storage health, and the
  // recent event log. Reads live IDB so the photo count reflects what's actually
  // on disk, not just what's in memory.
  const buildDiagnostics = async () => {
    let idbCount = null;
    try {
      idbCount = (await IDB.keys()).length;
    } catch {
      /* leave null */
    }
    const lines = [
      `Poppy diagnostics — ${new Date().toISOString()}`,
      `User agent: ${navigator.userAgent}`,
      `Standalone (installed): ${window.matchMedia && window.matchMedia("(display-mode: standalone)").matches}`,
      `Persistent storage: ${persisted === null ? "unknown" : persisted}`,
      storageEstimate && storageEstimate.quota
        ? `Storage: ${formatBytes(storageEstimate.usage || 0)} used of ${formatBytes(storageEstimate.quota)}`
        : `Storage: estimate unavailable`,
      `Items: ${items.length} · Edits: ${edits.length} · Photos in IndexedDB: ${idbCount === null ? "?" : idbCount} · Photos in memory: ${Object.keys(images).length}`,
      ``,
      `Recent events (newest last):`,
      ...Log.entries().map(
        (e) =>
          `${e.t} [${e.level}] ${e.event}${e.data !== undefined ? " " + JSON.stringify(e.data) : ""}`,
      ),
    ];
    return lines.join("\n");
  };

  const handleCopyDiagnostics = async () => {
    const report = await buildDiagnostics();
    try {
      await navigator.clipboard.writeText(report);
      setStatus({
        kind: "success",
        message:
          "Diagnostics copied to clipboard. Paste them anywhere to share.",
      });
    } catch {
      // Clipboard is often blocked on mobile — fall back to a downloaded file.
      try {
        const blob = new Blob([report], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `poppy-diagnostics-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus({
          kind: "info",
          message:
            "Clipboard was blocked — diagnostics downloaded as a file instead.",
        });
      } catch (e) {
        setStatus({
          kind: "error",
          message: "Could not copy diagnostics: " + (e.message || e),
        });
      }
    }
  };

  const handleExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Preflight: a backup only carries the photos that are actually in IDB
      // right now. If the browser has evicted the photo store, exporting would
      // silently produce a picture-less backup — so warn before writing one.
      let missing = 0;
      try {
        const keys = new Set(await IDB.keys());
        missing = items.filter((it) => !keys.has(it.id)).length;
      } catch {
        /* if we can't check, don't block the export */
      }
      if (missing > 0) {
        const proceed = confirm(
          `Heads up: ${missing} of your ${items.length} items ${missing === 1 ? "has" : "have"} no photo in storage right now, so this backup won't include ${missing === 1 ? "it" : "them"}. ` +
            `This usually means the browser cleared your photos. Export anyway?`,
        );
        if (!proceed) {
          setStatus({
            kind: "warn",
            message:
              "Export cancelled. If a photo backup exists, restore it first — then export a fresh backup.",
          });
          return;
        }
      }
      const { sizeBytes } = await exportBackup({
        items,
        edits,
        customTags,
        brands,
        selfies,
      });
      setStatus({
        kind: "success",
        message: `Backup saved (${formatBytes(sizeBytes)}). Check your Downloads folder.`,
      });
    } catch (e) {
      setStatus({
        kind: "error",
        message: "Could not create the backup file: " + (e.message || e),
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePickFile = async (file) => {
    if (!file) return;
    setStatus(null);
    setPending(null);
    try {
      const text = await readFileAsText(file);
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        setStatus({ kind: "error", message: "That file isn't valid JSON." });
        return;
      }
      const result = validateBackup(parsed);
      if (!result.ok) {
        setStatus({ kind: "error", message: result.error });
        return;
      }
      const itemCount = result.data.items.length;
      // Count photos that belong to items (ignore outfit selfies) so we can warn
      // if this backup can't fully restore the closet's pictures.
      const imgIds = new Set(Object.keys(result.data.images || {}));
      const itemsWithPhoto = result.data.items.filter((it) =>
        imgIds.has(it.id),
      ).length;
      const photoCount = imgIds.size;
      const missing = itemCount - itemsWithPhoto;
      setPending({
        filename: file.name,
        data: result.data,
        counts: parsed.counts || {},
        exportedAt: parsed.exportedAt,
        photoCount,
        missing,
      });
      const editCount = result.data.edits?.length || 0;
      const found = `Found ${itemCount} items, ${editCount} edit${editCount === 1 ? "" : "s"}, ${photoCount} photos.`;
      if (missing > 0) {
        setStatus({
          kind: "warn",
          message: `${found} ⚠ ${missing} item${missing === 1 ? "" : "s"} in this backup ${missing === 1 ? "has" : "have"} no photo — restoring won't bring ${missing === 1 ? "that picture" : "those pictures"} back. Choose how to apply it.`,
        });
      } else {
        setStatus({
          kind: "info",
          message: `${found} Choose how to apply it.`,
        });
      }
    } catch (e) {
      setStatus({
        kind: "error",
        message: "Could not read the file: " + (e.message || e),
      });
    }
  };

  const applyStrategy = async (strategy) => {
    if (!pending || busy) return;
    // Build a `current` snapshot without the images map — images live in IDB now.
    const current = {
      items,
      edits,
      customTags,
      brands: brands || [],
      selfies: selfies || [],
    };
    const next =
      strategy === "replace"
        ? pending.data
        : mergeBackup(current, pending.data);
    setBusy(true);
    setStatus({
      kind: "info",
      message:
        strategy === "replace" ? "Replacing your closet…" : "Merging backup…",
    });
    let result;
    try {
      result = await onImport(next, strategy);
    } catch (e) {
      setBusy(false);
      setStatus({
        kind: "error",
        message: "Import failed: " + (e.message || e),
      });
      return;
    }
    setPending(null);
    setBusy(false);
    const base =
      strategy === "replace"
        ? "Closet replaced with the backup."
        : "Backup merged into your closet.";
    if (result && result.failed && result.failed.length) {
      setStatus({
        kind: "error",
        message: `${base} But ${result.failed.length} of ${result.total} photos could not be saved — you may be out of device storage. Free some space and re-import to recover them.`,
      });
    } else {
      setStatus({ kind: "success", message: base });
    }
  };

  const photoCount = Object.keys(images).length;

  // Storage line — show real device usage if available, else omit.
  const storageLine = (() => {
    if (storageEstimate && storageEstimate.quota) {
      return `${formatBytes(storageEstimate.usage || 0)} used of ${formatBytes(storageEstimate.quota)}`;
    }
    return null;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div
        data-testid="backup-modal"
        className="relative bg-white max-w-md w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-2xl shadow-2xl fade-up"
        style={{ paddingBottom: `max(env(safe-area-inset-bottom), 24px)` }}
      >
        <button
          data-testid="backup-close"
          onClick={onClose}
          className="absolute top-3 right-3 text-ink-500 p-2"
        >
          <I.x size={18} />
        </button>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-leaf-50 rounded-full mb-3">
          <I.archive size={12} className="text-leaf-600" />
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-leaf-700">
            Save & Restore
          </p>
        </div>
        <h3 className="font-display font-bold text-2xl sm:text-3xl mb-4 text-ink-900">
          Keep your closet
          <br />
          <em className="text-leaf-600">safe and sound.</em>
        </h3>

        <div className="mb-6 p-3 bg-cream-50 border-2 border-cream-100 rounded-2xl text-xs text-ink-600 leading-relaxed">
          <span className="font-bold text-ink-800">{items.length}</span> pieces
          · <span className="font-bold text-ink-800">{edits.length}</span>{" "}
          edits · <span className="font-bold text-ink-800">{photoCount}</span>{" "}
          photos{storageLine ? ` · ${storageLine}` : ""}
        </div>

        {/* CLOUD SYNC */}
        {cloudEnabled && (
          <div className="mb-8">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-leaf-700 mb-2">
              Cloud sync
            </p>
            <p className="text-sm text-ink-600 mb-3">
              Mirror your closet to the cloud so your photos survive if the
              browser clears them. Runs automatically — tap to sync now.
            </p>
            <button
              data-testid="backup-cloud-sync"
              onClick={onCloudSync}
              disabled={cloudStatus === "syncing"}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-leaf-200 text-leaf-700 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              <I.cloud size={14} />
              {cloudStatus === "syncing" ? "Syncing…" : "Sync now"}
              {cloudLabel && cloudStatus !== "syncing" && (
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">
                  · {cloudLabel}
                </span>
              )}
            </button>
          </div>
        )}

        {/* EXPORT */}
        <div className="mb-8">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-leaf-700 mb-2">
            Export
          </p>
          <p className="text-sm text-ink-600 mb-3">
            Download everything as a single JSON file. Keep it somewhere safe
            like Google Drive, or email it to yourself.
          </p>
          <button
            data-testid="backup-export"
            onClick={handleExport}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-leaf-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop disabled:opacity-50 disabled:active:scale-100"
          >
            <I.download size={14} /> {busy ? "Working…" : "Export Backup"}
          </button>
        </div>

        {/* IMPORT */}
        <div className="mb-2">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-leaf-700 mb-2">
            Import
          </p>
          <p className="text-sm text-ink-600 mb-3">
            Restore from a backup file. You'll be asked whether to merge or
            replace.
          </p>
          {!pending && (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-leaf-200 bg-leaf-50/50 active:border-leaf-500 active:bg-leaf-50 transition-colors rounded-3xl py-6 flex flex-col items-center gap-2 text-leaf-700"
            >
              <I.upload size={20} />
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase">
                Choose backup file
              </span>
            </button>
          )}
          <input
            data-testid="backup-file"
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              handlePickFile(e.target.files?.[0]);
              e.target.value = "";
            }}
            className="hidden"
          />

          {pending && (
            <div className="border-2 border-cream-100 rounded-3xl p-4 mb-3 bg-white">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink-500 mb-1">
                From file
              </p>
              <p className="font-display font-bold text-base truncate text-ink-900">
                {pending.filename}
              </p>
              {pending.exportedAt && (
                <p className="text-[10px] text-ink-500 mt-1">
                  Exported {new Date(pending.exportedAt).toLocaleString()}
                </p>
              )}
              <p className="text-[11px] text-ink-600 mt-2">
                {pending.data.items.length} items · {pending.photoCount} photos
                {pending.missing > 0 && (
                  <span className="text-petal-700 font-bold">
                    {" "}
                    · {pending.missing} without a photo
                  </span>
                )}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  data-testid="backup-merge"
                  onClick={() => applyStrategy("merge")}
                  disabled={busy}
                  className="w-full py-3.5 bg-leaf-500 text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop disabled:opacity-50 disabled:active:scale-100"
                >
                  {busy ? "Working…" : "Merge (keep current, add new)"}
                </button>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        "Replace your entire closet with this backup? Your current items and edits will be deleted.",
                      )
                    ) {
                      applyStrategy("replace");
                    }
                  }}
                  disabled={busy}
                  data-testid="backup-replace"
                  className="w-full py-3.5 bg-petal-50 border-2 border-petal-100 text-petal-700 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  Replace everything
                </button>
                <button
                  onClick={() => {
                    setPending(null);
                    setStatus(null);
                  }}
                  disabled={busy}
                  className="text-[10px] font-bold tracking-[0.15em] uppercase text-ink-500 underline pt-1 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DIAGNOSTICS */}
        <div className="mt-8 pt-6 border-t border-cream-100">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-leaf-700 mb-2">
            Diagnostics
          </p>
          <p className="text-sm text-ink-600 mb-3">
            If something looks wrong, copy the diagnostics log — it records
            recent events and storage health so an issue can be traced.
          </p>
          <button
            data-testid="backup-copy-diag"
            onClick={handleCopyDiagnostics}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-cream-200 text-ink-700 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95"
          >
            <I.download size={14} /> Copy diagnostics
          </button>
        </div>

        {status && (
          <div
            className={`mt-3 p-3.5 rounded-2xl border-2 text-sm flex items-start gap-2 ${
              status.kind === "error"
                ? "bg-petal-50 border-petal-200 text-petal-700"
                : status.kind === "warn"
                  ? "bg-buttercup-50 border-buttercup-200 text-buttercup-700"
                  : status.kind === "success"
                    ? "bg-leaf-50 border-leaf-200 text-leaf-700"
                    : "bg-cream-50 border-cream-100 text-ink-700"
            }`}
          >
            <I.alert size={14} className="shrink-0 mt-0.5" />
            <span>{status.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export { BackupModal };
