// Custom commands for the Poppy e2e suite.
//
// The app boots from localStorage (metadata + gating flags) and IndexedDB
// (photos). All deterministic setup happens in `onBeforeLoad`, BEFORE React
// mounts, so the app comes up in exactly the state a test wants — skipping the
// splash screen, first-run seeding, and legacy migration.

const KEYS = {
  items: "closet:items:v1",
  outfits: "closet:outfits:v1",
  customTags: "closet:custom_tags:v1",
  brands: "closet:brands:v1",
  collections: "closet:collections:v1",
  seeded: "closet:seeded:v1",
  imagesMigrated: "closet:images_migrated:v1",
  theme: "closet:theme",
  splashDismissed: "closet:splash_dismissed:v1",
};

// data:URL -> Blob (used by seedImages; runs in the spec context).
function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(",");
  const mime = head.match(/:(.*?);/)[1];
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Visit the app in a fully-controlled state.
//   state: { items, outfits, collections, customTags, brands, theme,
//            skipGating (default false — set true to test the splash screen) }
Cypress.Commands.add("gotoApp", (state = {}) => {
  cy.visit("/", {
    onBeforeLoad(win) {
      // Clean slate every visit (Cypress clears localStorage between tests, but
      // not IndexedDB, and never mid-test).
      win.localStorage.clear();
      win.indexedDB.deleteDatabase("wardrobe");

      const ls = win.localStorage;
      const set = (k, v) => ls.setItem(k, JSON.stringify(v));

      if (!state.skipGating) {
        // Skip splash + seeding + migration so we control the data.
        set(KEYS.seeded, true);
        set(KEYS.imagesMigrated, true);
        set(KEYS.splashDismissed, true);
      }

      set(KEYS.items, state.items || []);
      set(KEYS.outfits, state.outfits || []);
      set(KEYS.customTags, state.customTags || []);
      set(KEYS.brands, state.brands || []);
      set(KEYS.collections, state.collections || []);
      if (state.theme) set(KEYS.theme, state.theme);

      // Web Share isn't present in headless Electron; stub so share flows no-op
      // instead of throwing. (navigator.storage.persist is left alone — it's a
      // harmless fire-and-forget in headless.)
      try {
        win.navigator.share = cy.stub().as("webShare").resolves();
      } catch {
        /* some browsers make navigator.share read-only; ignore */
      }
    },
  });

  if (!state.skipGating) {
    // App shell is up once the bottom nav renders.
    cy.get('[data-testid="nav-closet"]', { timeout: 20000 }).should("exist");
  }
});

// Auto-accept (or cancel) native confirm() dialogs for the current test.
// Cypress accepts confirms by default; pass false to exercise the cancel path.
Cypress.Commands.add("confirmDialogs", (accept = true) => {
  cy.on("window:confirm", () => accept);
});

// Upload a real (decodable) image into a hidden file input by test id.
Cypress.Commands.add("uploadPhoto", (testid, fixture = "sample-item.jpg") => {
  cy.get(`[data-testid="${testid}"]`).selectFile(
    `cypress/fixtures/${fixture}`,
    { force: true },
  );
});

// Seed photos straight into IndexedDB, then reload so the app hydrates them.
// entries: { itemId: dataUrl }. Only needed when a test wants pre-existing
// photos without going through the upload UI.
Cypress.Commands.add("seedImages", (entries) => {
  cy.window().then(
    (win) =>
      new Cypress.Promise((resolve, reject) => {
        const open = win.indexedDB.open("wardrobe", 1);
        open.onupgradeneeded = () => open.result.createObjectStore("images");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("images", "readwrite");
          const store = tx.objectStore("images");
          for (const [id, dataUrl] of Object.entries(entries)) {
            store.put(dataUrlToBlob(dataUrl), id);
          }
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  cy.reload();
  cy.get('[data-testid="nav-closet"]', { timeout: 20000 }).should("exist");
});

// Convenience: assert the current bottom-nav view.
Cypress.Commands.add("tab", (name) => {
  cy.get(`[data-testid="nav-${name}"]`).click();
});
