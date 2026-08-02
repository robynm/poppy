import { useState, useEffect } from "react";
import { AboutModal } from "./components/AboutModal.jsx";
import { BackupModal } from "./components/BackupModal.jsx";
import { BottomTab } from "./components/BottomTab.jsx";
import { BuilderView } from "./components/BuilderView.jsx";
import { ClosetView } from "./components/ClosetView.jsx";
import { CollectionsView } from "./components/CollectionsView.jsx";
import { OutfitsView } from "./components/OutfitsView.jsx";
import { PoppyMark } from "./components/PoppyMark.jsx";
import { SelfiesView } from "./components/SelfiesView.jsx";
import { SplashScreen } from "./components/SplashScreen.jsx";
import { StatsModal } from "./components/StatsModal.jsx";
import { STORAGE_KEYS } from "./lib/constants.js";
import { useBackButton } from "./lib/backNav.js";
import { useInstallPrompt } from "./lib/hooks.js";
import { I } from "./lib/icons.jsx";
import { dataUrlToBlob } from "./lib/images.js";
import { Log } from "./lib/log.js";
import { SEED_IMAGES, SEED_ITEMS } from "./seed.js";
import {
  IDB,
  ObjectUrlCache,
  ensurePersistentStorage,
  hydrateImages,
  lsGet,
  lsSet,
  migrateLegacyImagesIfNeeded,
} from "./lib/storage.js";

// --- Main App --------------------------------------------------------------
function ClosetApp() {
  const [view, setView] = useState("closet");
  const [items, setItems] = useState([]);
  const [images, setImages] = useState({});
  const [outfits, setOutfits] = useState([]);
  const [customTags, setCustomTags] = useState([]);
  const [brands, setBrands] = useState([]);
  const [collections, setCollections] = useState([]);
  const [selfies, setSelfies] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState(null); // outfit being edited (full object) or null
  const [builderOpen, setBuilderOpen] = useState(false);
  const [headerAction, setHeaderAction] = useState(null);
  const [activeCollection, setActiveCollection] = useState(null); // currently selected collection id (closet filter)
  const [scrollToOutfitId, setScrollToOutfitId] = useState(null);
  const [theme, setTheme] = useState(() => lsGet(STORAGE_KEYS.theme, "spring"));
  const [showMenu, setShowMenu] = useState(false);
  // Device Back closes the header menu before leaving the app.
  useBackButton(showMenu, () => setShowMenu(false));

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "winter" ? "winter" : "";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "winter" ? "#D71029" : "#FF5A36");
    lsSet(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    setHeaderAction(null);
    window.scrollTo(0, 0);
  }, [view]);
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [splashDismissed, setSplashDismissed] = useState(() =>
    lsGet(STORAGE_KEYS.splashDismissed, false),
  );

  // Load — seed if first run, importing SEED_ITEMS + SEED_IMAGES from seed.js (loaded by index.html)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Opt out of storage eviction so IndexedDB photos survive. Fire-and-forget
      // so it never blocks the initial render.
      ensurePersistentStorage();
      const seeded = lsGet(STORAGE_KEYS.seeded, false);
      if (
        !seeded &&
        typeof SEED_ITEMS !== "undefined" &&
        typeof SEED_IMAGES !== "undefined"
      ) {
        const seedItems = SEED_ITEMS.map((i) => ({
          ...i,
          custom: [],
          status: "owned",
          brand: "",
        }));
        lsSet(STORAGE_KEYS.items, seedItems);
        // Seed images: convert each data URL to a Blob in IDB. Mark images as
        // already migrated so we don't try to migrate legacy localStorage data
        // on a fresh install.
        const seedEntries = [];
        for (const [id, dataUrl] of Object.entries(SEED_IMAGES)) {
          try {
            seedEntries.push([id, dataUrlToBlob(dataUrl)]);
          } catch (e) {
            Log.error("seed.decodeFailed", { id, error: String(e) });
          }
        }
        if (seedEntries.length) {
          try {
            await IDB.putMany(seedEntries);
          } catch (e) {
            Log.error("seed.writeFailed", e);
          }
        }
        Log.info("seed.done", {
          items: seedItems.length,
          photos: seedEntries.length,
        });
        lsSet(STORAGE_KEYS.outfits, []);
        lsSet(STORAGE_KEYS.customTags, []);
        lsSet(STORAGE_KEYS.brands, []);
        lsSet(STORAGE_KEYS.collections, []);
        lsSet(STORAGE_KEYS.selfies, []);
        lsSet(STORAGE_KEYS.imagesMigrated, true);
        lsSet(STORAGE_KEYS.selfiesMigrated, true);
        lsSet(STORAGE_KEYS.seeded, true);
      } else {
        // One-time migration for existing installs: localStorage data URLs → IDB blobs.
        await migrateLegacyImagesIfNeeded();
      }

      // Migration: backfill status="owned" and brand="" on any existing items that pre-date these fields
      const rawItems = lsGet(STORAGE_KEYS.items, []);
      let migrated = false;
      const items2 = rawItems.map((i) => {
        const next = { ...i };
        if (!next.status) {
          next.status = "owned";
          migrated = true;
        }
        if (next.brand === undefined) {
          next.brand = "";
          migrated = true;
        }
        return next;
      });
      if (migrated) lsSet(STORAGE_KEYS.items, items2);

      // Hydrate object URLs from IDB into the cache and state.
      const urlMap = await hydrateImages();

      // Load summary — recorded every launch. The key health signal: if items
      // survive but photos are 0, the browser has evicted the IndexedDB store.
      const photoCount = Object.keys(urlMap).length;
      const itemsMissingPhoto = items2.filter((it) => !urlMap[it.id]).length;
      if (items2.length > 0 && photoCount === 0) {
        Log.warn("load.photosMissing", {
          items: items2.length,
          photos: photoCount,
        });
      } else {
        Log.info("load", {
          items: items2.length,
          photos: photoCount,
          itemsMissingPhoto,
        });
      }

      // Migration: promote legacy per-outfit selfies (IDB key `selfie_<outfitId>`)
      // into first-class selfie entities. The look↔selfie link is 1-to-many and
      // lives on the selfie (`selfie.outfitId`). The blob keeps its existing IDB
      // key (now the selfie's id) — no copy needed. Runs once, guarded by a flag.
      let outfits2 = lsGet(STORAGE_KEYS.outfits, []);
      let selfies2 = lsGet(STORAGE_KEYS.selfies, []);
      if (!lsGet(STORAGE_KEYS.selfiesMigrated, false)) {
        const known = new Set(selfies2.map((s) => s.id));
        const outfitIds = new Set(outfits2.map((o) => o.id));
        const byId = new Map(outfits2.map((o) => [o.id, o]));
        const added = [];
        for (const key of Object.keys(urlMap)) {
          if (!key.startsWith("selfie_") || known.has(key)) continue;
          const ownerId = key.slice("selfie_".length);
          const when = byId.get(ownerId)?.createdAt || Date.now();
          added.push({
            id: key,
            createdAt: when,
            dateTaken: when,
            outfitId: outfitIds.has(ownerId) ? ownerId : null,
          });
        }
        if (added.length) {
          selfies2 = [...selfies2, ...added];
          lsSet(STORAGE_KEYS.selfies, selfies2);
          Log.info("selfies.migrated", { count: added.length });
        }
        lsSet(STORAGE_KEYS.selfiesMigrated, true);
      }

      // Convert any outfit.selfieIds[] (from an earlier build of this feature)
      // into the selfie.outfitId model, then drop the field. Idempotent.
      if (outfits2.some((o) => Array.isArray(o.selfieIds))) {
        const owner = new Map();
        for (const o of outfits2)
          for (const sid of o.selfieIds || []) owner.set(sid, o.id);
        selfies2 = selfies2.map((s) =>
          owner.has(s.id) && s.outfitId == null
            ? { ...s, outfitId: owner.get(s.id) }
            : s,
        );
        outfits2 = outfits2.map(({ selfieIds, ...rest }) => rest);
        lsSet(STORAGE_KEYS.selfies, selfies2);
        lsSet(STORAGE_KEYS.outfits, outfits2);
      }

      if (cancelled) return;
      setItems(items2);
      setImages(urlMap);
      setOutfits(outfits2);
      setCustomTags(lsGet(STORAGE_KEYS.customTags, []));
      setBrands(lsGet(STORAGE_KEYS.brands, []));
      setCollections(lsGet(STORAGE_KEYS.collections, []));
      setSelfies(selfies2);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveItems = (n) => {
    setItems(n);
    lsSet(STORAGE_KEYS.items, n);
  };
  const saveOutfits = (n) => {
    setOutfits(n);
    lsSet(STORAGE_KEYS.outfits, n);
  };
  const saveCustomTags = (n) => {
    setCustomTags(n);
    lsSet(STORAGE_KEYS.customTags, n);
  };
  const saveBrands = (n) => {
    setBrands(n);
    lsSet(STORAGE_KEYS.brands, n);
  };
  const saveCollections = (n) => {
    setCollections(n);
    lsSet(STORAGE_KEYS.collections, n);
  };
  const saveSelfies = (n) => {
    setSelfies(n);
    lsSet(STORAGE_KEYS.selfies, n);
  };
  // Delete a selfie: remove the record and its photo. The look↔selfie link
  // lives on the selfie, so nothing else needs updating.
  const deleteSelfie = (id) => {
    saveSelfies(selfies.filter((s) => s.id !== id));
    deleteImage(id);
  };

  // Image writes go to IDB; React state holds object URLs only.
  const putImage = async (id, blob) => {
    try {
      await IDB.put(id, blob);
      const url = ObjectUrlCache.set(id, blob); // revokes any old URL for this id
      setImages((prev) => ({ ...prev, [id]: url }));
    } catch (e) {
      Log.error("putImage.failed", { id, error: String(e) });
      if (!window.__quotaWarned) {
        window.__quotaWarned = true;
        alert("Couldn't save that image. You may be out of device storage.");
      }
    }
  };
  const deleteImage = async (id) => {
    try {
      await IDB.delete(id);
    } catch (e) {
      Log.error("deleteImage.failed", { id, error: String(e) });
    }
    ObjectUrlCache.delete(id);
    setImages((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
  };
  // For import: write a map of {id: dataUrl} into IDB, optionally clearing first.
  // Writes each image in its own transaction so that one bad/oversized blob (or
  // hitting a storage limit partway through) can't abort the whole restore — the
  // old single-transaction putMany failed all-or-nothing and only logged to the
  // console, so a partial failure looked like "no photos restored" with no error.
  // Returns {total, written, failed:[ids]} so the caller can surface the outcome.
  const replaceAllImages = async (dataUrlMap, { clearFirst = false } = {}) => {
    if (clearFirst) {
      try {
        const existingIds = await IDB.keys();
        for (const id of existingIds) ObjectUrlCache.delete(id);
        await IDB.clear();
      } catch (e) {
        Log.error("import.clearFailed", e);
      }
    }
    const ids = Object.keys(dataUrlMap || {});
    let written = 0;
    const failed = [];
    for (const id of ids) {
      const dataUrl = dataUrlMap[id];
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
        failed.push(id);
        continue;
      }
      let blob;
      try {
        blob = dataUrlToBlob(dataUrl);
      } catch (e) {
        Log.error("import.decodeFailed", { id, error: String(e) });
        failed.push(id);
        continue;
      }
      try {
        await IDB.put(id, blob);
        ObjectUrlCache.set(id, blob);
        written++;
      } catch (e) {
        Log.error("import.writeFailed", { id, error: String(e) });
        failed.push(id);
      }
    }
    setImages(ObjectUrlCache.snapshot());
    const result = { total: ids.length, written, failed: failed.length };
    Log[failed.length ? "warn" : "info"]("import.done", {
      strategy: clearFirst ? "replace" : "merge",
      ...result,
    });
    return { total: ids.length, written, failed };
  };

  // Browser visitors (not the installed app) land on a splash page instead of
  // an empty-looking closet, unless they've chosen to continue in the browser.
  if (!installed && !splashDismissed) {
    return (
      <SplashScreen
        canInstall={canInstall}
        onInstall={promptInstall}
        onContinue={() => {
          lsSet(STORAGE_KEYS.splashDismissed, true);
          setSplashDismissed(true);
        }}
      />
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-full bg-poppy-500 flex items-center justify-center bloom shadow-poppy overflow-hidden">
          <PoppyMark />
        </div>
        <div className="text-ink-500 text-xs font-bold tracking-[0.2em] uppercase">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 text-ink-900 pb-24 poppy-wash">
      {/* INSTALL BAR — shown only when the app can be installed */}
      {canInstall && (
        <div className="bg-poppy-500 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <I.install size={16} className="shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold tracking-wide truncate">
                Install Poppy for a faster, full-screen closet.
              </span>
            </div>
            <button
              onClick={promptInstall}
              className="shrink-0 px-3.5 py-1.5 bg-white text-poppy-600 text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop"
            >
              Install
            </button>
          </div>
        </div>
      )}
      {/* HEADER */}
      <header className="bg-white border-b border-cream-100 z-30 sticky top-0 shadow-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-poppy-500 flex items-center justify-center shadow-poppy overflow-hidden">
              <PoppyMark />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-ink-900 leading-none">
                Poppy
              </h1>
              <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-poppy-600 hidden sm:inline">
                Cultivate Your Closet
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerAction && (
              <button
                onClick={headerAction.onClick}
                data-testid="header-action"
                className={`flex items-center gap-1.5 px-3.5 py-2 text-white text-[10px] font-bold tracking-[0.15em] uppercase rounded-full active:scale-95 shadow-pop ${
                  headerAction.tone === "petal"
                    ? "bg-petal-500"
                    : headerAction.tone === "sky2"
                      ? "bg-sky2-500"
                      : headerAction.tone === "buttercup"
                        ? "bg-buttercup-500"
                        : "bg-poppy-500"
                }`}
              >
                <I.plus size={12} /> {headerAction.label}
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowMenu((m) => !m)}
                aria-label="Menu"
                data-testid="menu-button"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-cream-50 border-2 border-cream-100 text-ink-600 active:scale-95"
              >
                <I.more size={16} />
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-card-hi border-2 border-cream-100 overflow-hidden min-w-[180px]">
                    <button
                      onClick={() => {
                        setTheme((t) => (t === "winter" ? "spring" : "winter"));
                        setShowMenu(false);
                      }}
                      data-testid="menu-theme"
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-bold text-ink-700 active:bg-cream-50"
                    >
                      {theme === "winter" ? (
                        <I.sun size={15} className="shrink-0" />
                      ) : (
                        <I.sparkles size={15} className="shrink-0" />
                      )}
                      {theme === "winter" ? "Spring theme" : "Winter theme"}
                    </button>
                    <div className="h-px bg-cream-100 mx-3" />
                    <button
                      onClick={() => {
                        setShowStats(true);
                        setShowMenu(false);
                      }}
                      data-testid="menu-stats"
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-bold text-ink-700 active:bg-cream-50"
                    >
                      <I.pie size={15} className="shrink-0" /> Stats
                    </button>
                    <div className="h-px bg-cream-100 mx-3" />
                    <button
                      onClick={() => {
                        setShowBackup(true);
                        setShowMenu(false);
                      }}
                      data-testid="menu-backup"
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-bold text-ink-700 active:bg-cream-50"
                    >
                      <I.archive size={15} className="shrink-0" /> Save &amp;
                      restore
                    </button>
                    <div className="h-px bg-cream-100 mx-3" />
                    <button
                      onClick={() => {
                        setShowAbout(true);
                        setShowMenu(false);
                      }}
                      data-testid="menu-about"
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-bold text-ink-700 active:bg-cream-50"
                    >
                      <I.help size={15} className="shrink-0" /> About
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {view === "closet" && (
        <ClosetView
          items={items}
          images={images}
          customTags={customTags}
          brands={brands}
          collections={collections}
          outfits={outfits}
          activeCollection={activeCollection}
          onSetActiveCollection={setActiveCollection}
          onSaveItems={saveItems}
          onPutImage={putImage}
          onDeleteImage={deleteImage}
          onSaveCustomTags={saveCustomTags}
          onSaveBrands={saveBrands}
          onSaveCollections={saveCollections}
          onSaveOutfits={saveOutfits}
          onSetHeaderAction={setHeaderAction}
          onOpenStats={() => setShowStats(true)}
        />
      )}
      {view === "collections" && (
        <CollectionsView
          collections={collections}
          items={items}
          images={images}
          outfits={outfits}
          onSave={saveCollections}
          onViewCollection={(id) => {
            setActiveCollection(id);
            setView("closet");
          }}
          onOpenOutfit={(id) => {
            setScrollToOutfitId(id);
            setView("outfits");
          }}
          onSetHeaderAction={setHeaderAction}
        />
      )}
      {view === "outfits" && (
        <OutfitsView
          outfits={outfits}
          items={items}
          images={images}
          selfies={selfies}
          onSave={saveOutfits}
          onSaveSelfies={saveSelfies}
          onNewOutfit={() => {
            setEditingOutfit(null);
            setBuilderOpen(true);
          }}
          onEditOutfit={(o) => {
            setEditingOutfit(o);
            setBuilderOpen(true);
          }}
          scrollToId={scrollToOutfitId}
          onScrolled={() => setScrollToOutfitId(null)}
          onSetHeaderAction={setHeaderAction}
        />
      )}
      {view === "selfies" && (
        <SelfiesView
          selfies={selfies}
          outfits={outfits}
          images={images}
          onSaveSelfies={saveSelfies}
          onPutImage={putImage}
          onDeleteSelfie={deleteSelfie}
          onSetHeaderAction={setHeaderAction}
        />
      )}
      {builderOpen && (
        <BuilderView
          items={items}
          images={images}
          collections={collections}
          selfies={selfies}
          outfit={editingOutfit}
          onSaveOutfit={(o) => {
            // The builder returns the selected selfie ids; association is stored
            // on the selfie (1-to-many), so keep selfieIds off the outfit itself.
            const { selfieIds = [], ...rest } = o;
            let outfitId;
            if (editingOutfit) {
              outfitId = o.id;
              saveOutfits(
                outfits.map((x) =>
                  x.id === o.id ? { ...rest, updatedAt: Date.now() } : x,
                ),
              );
            } else {
              outfitId = `o_${Date.now()}`;
              saveOutfits([
                { ...rest, id: outfitId, createdAt: Date.now() },
                ...outfits,
              ]);
            }
            // Claim the chosen selfies for this look; release any it dropped.
            const chosen = new Set(selfieIds);
            saveSelfies(
              selfies.map((s) => {
                if (chosen.has(s.id))
                  return s.outfitId === outfitId ? s : { ...s, outfitId };
                if (s.outfitId === outfitId) return { ...s, outfitId: null };
                return s;
              }),
            );
            setEditingOutfit(null);
            setBuilderOpen(false);
          }}
          onCancel={() => {
            setEditingOutfit(null);
            setBuilderOpen(false);
          }}
        />
      )}

      {/* BOTTOM NAV — mobile-first, Poppy-style: chunky, colorful, with a soft pill on the active tab */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-cream-100 shadow-card-hi"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-4 px-3 pt-2 pb-1">
          <BottomTab
            IconC={I.shirt}
            label="Closet"
            tone="poppy"
            active={view === "closet"}
            onClick={() => setView("closet")}
            testId="nav-closet"
          />
          <BottomTab
            IconC={I.camera}
            label="Snaps"
            tone="buttercup"
            active={view === "selfies"}
            onClick={() => setView("selfies")}
            testId="nav-selfies"
          />
          <BottomTab
            IconC={I.sunglasses}
            label="Looks"
            tone="petal"
            active={view === "outfits"}
            onClick={() => setView("outfits")}
            testId="nav-looks"
          />
          <BottomTab
            IconC={I.suitcase}
            label="Collections"
            tone="sky2"
            active={view === "collections"}
            onClick={() => setView("collections")}
            testId="nav-collections"
          />
        </div>
      </nav>

      {showStats && (
        <StatsModal
          items={items}
          outfits={outfits}
          collections={collections}
          customTags={customTags}
          brands={brands}
          selfies={selfies}
          onClose={() => setShowStats(false)}
        />
      )}

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {showBackup && (
        <BackupModal
          items={items}
          images={images}
          outfits={outfits}
          customTags={customTags}
          brands={brands}
          collections={collections}
          selfies={selfies}
          onClose={() => setShowBackup(false)}
          onImport={async (next, strategy) => {
            saveItems(next.items);
            saveOutfits(next.outfits);
            saveCustomTags(next.customTags);
            if (next.brands) saveBrands(next.brands);
            if (next.collections) saveCollections(next.collections);
            if (next.selfies) saveSelfies(next.selfies);
            return await replaceAllImages(next.images, {
              clearFirst: strategy === "replace",
            });
          }}
        />
      )}
    </div>
  );
}

export { ClosetApp };
