// Selfies: month-grouped gallery, upload, edit date, delete, mood rating, and
// tagging. A snap is a curated *subset* of an edit, so linking or unlinking an
// edit never changes the snap's own tagged pieces.

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// Fixed capture dates (local noon to avoid TZ drift), two different months.
const JULY_A = new Date(2026, 6, 15, 12).getTime(); // 2026-07
const JULY_B = new Date(2026, 6, 2, 12).getTime(); // 2026-07
const MAY = new Date(2026, 4, 10, 12).getTime(); // 2026-05

const selfie = (id, dateTaken, over = {}) => ({
  id,
  createdAt: dateTaken,
  dateTaken,
  outfitIds: [],
  itemIds: [],
  rating: null,
  ...over,
});

const owned = (id, name, category) => ({
  id,
  name,
  category,
  seasons: [],
  occasions: [],
  custom: [],
  status: "owned",
  brand: "",
  yearPurchased: "",
});

const readSelfies = () =>
  cy
    .window()
    .then((win) => JSON.parse(win.localStorage.getItem("closet:selfies:v1")));

describe("Selfies gallery", () => {
  it("shows the empty state with no selfies", () => {
    cy.gotoApp({ selfies: [] });
    cy.tab("selfies");
    cy.contains("No snaps yet.").should("be.visible");
    cy.get('[data-testid="selfie-card"]').should("not.exist");
  });

  it("groups selfies by month, newest month first", () => {
    cy.gotoApp({
      selfies: [selfie("s_1", JULY_A), selfie("s_2", MAY), selfie("s_3", JULY_B)],
    });
    cy.tab("selfies");

    cy.get('[data-testid="selfie-month"]').should("have.length", 2);
    cy.get('[data-testid="selfie-month"]')
      .first()
      .should("have.attr", "data-month", "2026-07");
    cy.get('[data-testid="selfie-month"]')
      .eq(1)
      .should("have.attr", "data-month", "2026-05");
    cy.get('[data-month="2026-07"] [data-testid="selfie-card"]').should(
      "have.length",
      2,
    );
    cy.get('[data-month="2026-05"] [data-testid="selfie-card"]').should(
      "have.length",
      1,
    );
    cy.contains("July 2026").should("be.visible");
    cy.contains("May 2026").should("be.visible");
  });

  it("uploads a photo and it appears under a month section", () => {
    cy.gotoApp({ selfies: [] });
    cy.tab("selfies");
    cy.uploadPhoto("selfies-file");
    cy.get('[data-testid="selfie-card"]', { timeout: 15000 }).should(
      "have.length",
      1,
    );
    cy.get('[data-testid="selfie-month"]').should("have.length", 1);
    readSelfies().then((s) => expect(s).to.have.length(1));
  });

  it("uploads many photos at once, persisting every one", () => {
    cy.gotoApp({ selfies: [] });
    cy.tab("selfies");
    // 10 files in one go — larger than the batch size that used to fail silently.
    const many = Array.from(
      { length: 10 },
      () => "cypress/fixtures/sample-item.jpg",
    );
    cy.get('[data-testid="selfies-file"]').selectFile(many, { force: true });
    cy.get('[data-testid="upload-progress"]').should("be.visible"); // shows during the batch
    cy.get('[data-testid="selfie-card"]', { timeout: 30000 }).should(
      "have.length",
      10,
    );
    cy.get('[data-testid="upload-progress"]').should("not.exist"); // clears when done
    readSelfies().then((s) => expect(s).to.have.length(10));
  });

  it("editing a selfie's date moves it to another month", () => {
    cy.gotoApp({ selfies: [selfie("s_1", JULY_A)] });
    cy.tab("selfies");
    cy.get('[data-testid="selfie-month"]').should(
      "have.attr",
      "data-month",
      "2026-07",
    );

    cy.get('[data-testid="selfie-card"]').click();
    cy.get('[data-testid="selfie-detail"]').should("be.visible");
    cy.get('[data-testid="selfie-date"]').type("2026-05-10");
    cy.get('[data-testid="selfie-save"]').click();
    cy.get('[data-testid="selfie-detail"]').should("not.exist");

    cy.get('[data-testid="selfie-month"]').should(
      "have.attr",
      "data-month",
      "2026-05",
    );
    readSelfies().then((s) =>
      expect(new Date(s[0].dateTaken).getMonth()).to.eq(4),
    );
  });

  it("saves a mood rating and shows it on the thumbnail", () => {
    cy.gotoApp({ selfies: [selfie("s_1", JULY_A)] });
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').click();
    cy.get('[data-testid="selfie-rating-btn"][data-rating="happy"]').click();
    cy.get('[data-testid="selfie-save"]').click();

    readSelfies().then((s) => expect(s[0].rating).to.eq("happy"));
    cy.get('[data-testid="selfie-card-rating"]').should(
      "have.attr",
      "data-rating",
      "happy",
    );
  });

  it("filters the gallery by mood rating", () => {
    cy.gotoApp({
      selfies: [
        selfie("s_happy", JULY_A, { rating: "happy" }),
        selfie("s_meh", JULY_B, { rating: "meh" }),
        selfie("s_none", MAY),
      ],
    });
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').should("have.length", 3);

    // Happy only.
    cy.get('[data-testid="selfie-filter-btn"][data-rating="happy"]').click();
    cy.get('[data-testid="selfie-card"]').should("have.length", 1);
    cy.get('[data-testid="selfie-card"][data-selfie-id="s_happy"]').should(
      "exist",
    );

    // Add meh → happy + meh (multi-select).
    cy.get('[data-testid="selfie-filter-btn"][data-rating="meh"]').click();
    cy.get('[data-testid="selfie-card"]').should("have.length", 2);

    // Switch to sad only → nothing matches.
    cy.get('[data-testid="selfie-filter-btn"][data-rating="happy"]').click();
    cy.get('[data-testid="selfie-filter-btn"][data-rating="meh"]').click();
    cy.get('[data-testid="selfie-filter-btn"][data-rating="sad"]').click();
    cy.get('[data-testid="selfie-card"]').should("not.exist");
    cy.contains("No snaps match.").should("be.visible");

    // Clear → everything returns.
    cy.get('[data-testid="selfie-filter-clear"]').click();
    cy.get('[data-testid="selfie-card"]').should("have.length", 3);
  });

  it("saves a zoom/crop adjustment on the snap", () => {
    cy.gotoApp({ selfies: [selfie("s_1", JULY_A)] });
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').click();
    cy.get('[data-testid="selfie-zoom"]').then(($el) => {
      const el = $el[0];
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(el, "2");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    cy.get('[data-testid="selfie-save"]').click();

    readSelfies().then((s) => expect(s[0].crop.zoom).to.eq(2));
  });

  it("replaces the snap's photo", () => {
    cy.gotoApp({ selfies: [selfie("s_1", JULY_A)] });
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').click();
    cy.get('[data-testid="selfie-replace-file"]').selectFile(
      "cypress/fixtures/sample-item.jpg",
      { force: true },
    );
    const hasImage = () =>
      cy.window().then(
        (win) =>
          new Cypress.Promise((resolve) => {
            const req = win.indexedDB.open("wardrobe", 1);
            req.onsuccess = () => {
              const db = req.result;
              const g = db
                .transaction("images", "readonly")
                .objectStore("images")
                .get("s_1");
              g.onsuccess = () => {
                db.close();
                resolve(!!g.result);
              };
            };
          }),
      );
    const wait = (n) =>
      hasImage().then((ok) => {
        if (!ok && n > 0) {
          cy.wait(100);
          wait(n - 1);
        } else {
          expect(ok, "snap photo written to IDB").to.be.true;
        }
      });
    wait(30);
  });

  it("discards edits when closed without saving", () => {
    cy.gotoApp({ selfies: [selfie("s_1", JULY_A)] });
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').click();
    cy.get('[data-testid="selfie-date"]').type("2026-05-10");
    cy.get('[data-testid="selfie-close"]').click();

    cy.get('[data-testid="selfie-month"]').should(
      "have.attr",
      "data-month",
      "2026-07",
    );
    readSelfies().then((s) =>
      expect(new Date(s[0].dateTaken).getMonth()).to.eq(6),
    );
  });

  it("deletes a selfie when confirmed", () => {
    cy.confirmDialogs(true);
    cy.gotoApp({ selfies: [selfie("s_1", JULY_A)] });
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').click();
    cy.get('[data-testid="selfie-delete"]').click();

    cy.get('[data-testid="selfie-detail"]').should("not.exist");
    cy.get('[data-testid="selfie-card"]').should("not.exist");
    cy.contains("No snaps yet.").should("be.visible");
    readSelfies().then((s) => expect(s).to.have.length(0));
  });

  it("migrates a legacy per-look selfie, folding the look into edits", () => {
    const created = 1650000000000;
    const legacyOutfit = {
      id: "o1",
      name: "Old Look",
      itemIds: ["i1"],
      seasons: [],
      occasions: [],
      note: "",
      createdAt: created,
      updatedAt: created,
    };
    cy.gotoApp({ items: [owned("i1", "White Tee", "top")], edits: [] });
    cy.seedImages({ selfie_o1: PNG });
    // Recreate a pre-merge legacy install: the look lives in the old outfits
    // key with no edits yet, and the selfie + edits migration flags are cleared
    // so both migrations run on reload.
    cy.window().then((w) => {
      w.localStorage.setItem("closet:outfits:v1", JSON.stringify([legacyOutfit]));
      w.localStorage.removeItem("closet:edits:v1");
      w.localStorage.removeItem("closet:edits_merged:v1");
      w.localStorage.removeItem("closet:selfies_migrated:v1");
    });
    cy.reload();
    cy.get('[data-testid="nav-closet"]').should("exist");

    cy.window().then((w) => {
      const s = JSON.parse(w.localStorage.getItem("closet:selfies:v1"));
      expect(s).to.have.length(1);
      expect(s[0].id).to.eq("selfie_o1");
      expect(s[0].dateTaken).to.eq(created);
      expect(s[0].outfitIds).to.include("o1"); // single link → outfitIds[]
      expect(s[0].itemIds).to.include("i1"); // seeded from the look's pieces
      // The legacy look folded into the unified edits list.
      const edits = JSON.parse(w.localStorage.getItem("closet:edits:v1"));
      expect(edits.map((e) => e.id)).to.include("o1");
    });
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').should("have.length", 1);
  });
});

describe("Selfie tagging (pieces + looks)", () => {
  const items = [owned("i1", "White Tee", "top"), owned("i2", "Blue Jeans", "bottom")];
  const look = (over = {}) => ({
    id: "o1",
    name: "Sunny Day",
    itemIds: ["i1", "i2"],
    seasons: [],
    occasions: [],
    note: "",
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    ...over,
  });
  const readSelfies2 = () =>
    cy
      .window()
      .then((win) => JSON.parse(win.localStorage.getItem("closet:selfies:v1")));

  it("shows only tagged looks and pieces by default, expanding to edit", () => {
    cy.gotoApp({
      items,
      selfies: [selfie("s_1", JULY_A, { outfitIds: ["o1"], itemIds: ["i1"] })],
      edits: [look(), look({ id: "o2", name: "Rainy Day" })],
    });
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').click();

    // Collapsed: only the tagged look + tagged piece are shown.
    cy.get('[data-testid="selfie-look-option"]').should("have.length", 1);
    cy.get('[data-testid="selfie-look-option"][data-outfit-id="o1"]').should(
      "exist",
    );
    cy.get('[data-testid="selfie-item"]').should("have.length", 1);
    cy.get('[data-testid="selfie-item"][data-item-id="i1"]').should("exist");

    // Expand → the full selectable lists appear.
    cy.get('[data-testid="selfie-looks-toggle"]').click();
    cy.get('[data-testid="selfie-look-option"]').should("have.length", 2);
    cy.get('[data-testid="selfie-pieces-toggle"]').click();
    cy.get('[data-testid="selfie-item"]').should("have.length", 2);
  });

  it("suggests looks matching the tagged pieces, ranked by overlap", () => {
    const wide = [
      owned("i1", "White Tee", "top"),
      owned("i2", "Blue Jeans", "bottom"),
      owned("i3", "Sun Hat", "accessory"),
      owned("i4", "Sneakers", "shoes"),
    ];
    const mk = (id, name, itemIds) => ({
      id,
      name,
      itemIds,
      seasons: [],
      occasions: [],
      note: "",
      createdAt: 1,
      updatedAt: 1,
    });
    cy.gotoApp({
      items: wide,
      selfies: [selfie("s_1", JULY_A)],
      edits: [
        mk("o1", "Sunny Day", ["i1", "i2"]), // shares 2
        mk("o2", "Tee Combo", ["i1", "i3"]), // shares 1
        mk("o3", "Rainy Day", ["i3", "i4"]), // shares 0
      ],
    });
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').click();

    // No pieces tagged → no suggestions.
    cy.get('[data-testid="selfie-suggestion"]').should("not.exist");

    // Tag White Tee + Blue Jeans.
    cy.get('[data-testid="selfie-pieces-toggle"]').click();
    cy.get('[data-testid="selfie-item"][data-item-id="i1"]').click();
    cy.get('[data-testid="selfie-item"][data-item-id="i2"]').click();

    // Only the overlapping looks are suggested, closest first (o1 shares 2).
    cy.get('[data-testid="selfie-suggestion"]').should("have.length", 2);
    cy.get('[data-testid="selfie-suggestion"]')
      .first()
      .should("have.attr", "data-outfit-id", "o1");
    cy.get('[data-testid="selfie-suggestion"][data-outfit-id="o3"]').should(
      "not.exist",
    );

    // Tagging a suggestion promotes it to "Worn in" and drops it from the list.
    cy.get('[data-testid="selfie-suggestion"][data-outfit-id="o1"]').click();
    cy.get('[data-testid="selfie-suggestion"][data-outfit-id="o1"]').should(
      "not.exist",
    );
    cy.get('[data-testid="selfie-look-option"][data-outfit-id="o1"]').should(
      "exist",
    );
    cy.get('[data-testid="selfie-save"]').click();
    readSelfies2().then((s) => expect(s[0].outfitIds).to.include("o1"));
  });

  it("tags individual pieces directly on a snap", () => {
    cy.gotoApp({ items, selfies: [selfie("s_1", JULY_A)], edits: [] });
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').click();
    cy.get('[data-testid="selfie-pieces-toggle"]').click(); // expand to edit
    cy.get('[data-testid="selfie-item"][data-item-id="i1"]').click();
    cy.get('[data-testid="selfie-save"]').click();

    readSelfies2().then((s) => {
      expect(s[0].itemIds).to.include("i1");
      expect(s[0].itemIds).to.not.include("i2");
    });
  });

  it("tagging a look links it without touching the snap's pieces (snap is a subset)", () => {
    cy.gotoApp({ items, selfies: [selfie("s_1", JULY_A)], edits: [look()] });
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').click();
    cy.get('[data-testid="selfie-looks-toggle"]').click(); // expand to edit
    // Tag the look → it is linked, but the snap's (empty) piece list is untouched.
    cy.get('[data-testid="selfie-look-option"][data-outfit-id="o1"]').click();
    cy.get('[data-testid="selfie-save"]').click();

    readSelfies2().then((s) => {
      expect(s[0].outfitIds).to.include("o1");
      expect(s[0].itemIds || []).to.not.include("i1");
      expect(s[0].itemIds || []).to.not.include("i2");
    });
  });

  it("links a look via the builder and shows the snap in the look detail", () => {
    cy.gotoApp({ items, selfies: [selfie("s_1", JULY_A)], edits: [] });
    cy.seedImages({ s_1: PNG }); // detail only renders snaps that have a photo

    cy.tab("edits");
    cy.get('[data-testid="new-edit-btn"]').click();
    cy.get('[data-testid="builder-name"]').type("Sunny Day");
    cy.get('[data-testid="builder-piece"]').first().click();
    cy.get('[data-testid="builder-selfie"][data-selfie-id="s_1"]').click();
    cy.get('[data-testid="builder-save"]').click();

    readSelfies2().then((s) => {
      expect(s[0].outfitIds).to.have.length(1);
      expect(s[0].itemIds || []).to.not.include("i1"); // linking never adds the edit's pieces
    });
    cy.get('[data-testid="edit-card"]').click();
    cy.get('[data-testid="detail-selfies"]').should("be.visible");
    cy.get('[data-testid="detail-selfie-thumb"]').should("have.length", 1);
  });

  it("tags a look from the edit-selfie screen without adding its pieces", () => {
    cy.gotoApp({ items, selfies: [selfie("s_1", JULY_A)], edits: [look()] });
    cy.seedImages({ s_1: PNG });

    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').click();
    cy.get('[data-testid="selfie-looks-toggle"]').click(); // expand to edit
    cy.get('[data-testid="selfie-look-option"][data-outfit-id="o1"]').click();
    cy.get('[data-testid="selfie-save"]').click();
    cy.get('[data-testid="selfie-detail"]').should("not.exist");
    readSelfies2().then((s) => {
      expect(s[0].outfitIds).to.include("o1");
      expect(s[0].itemIds || []).to.not.include("i1");
      expect(s[0].itemIds || []).to.not.include("i2");
    });

    cy.tab("edits");
    cy.get('[data-testid="edit-card"]').click();
    cy.get('[data-testid="detail-selfie-thumb"]').should("have.length", 1);
  });

  it("offers all snaps in the builder (this look's pre-selected)", () => {
    cy.gotoApp({
      items,
      selfies: [
        selfie("s_free", JULY_A),
        selfie("s_taken", JULY_A, { outfitIds: ["o1"], itemIds: ["i1", "i2"] }),
      ],
      edits: [look()],
    });
    cy.tab("edits");
    cy.get('[data-testid="new-edit-btn"]').click();
    cy.get('[data-testid="builder-selfie"]').should("have.length", 2);
  });


  it("shows the snap count on the look thumbnail", () => {
    cy.gotoApp({
      items,
      edits: [look()],
      selfies: [
        selfie("s_1", JULY_A, { outfitIds: ["o1"] }),
        selfie("s_2", JULY_B, { outfitIds: ["o1"] }),
        selfie("s_3", MAY),
      ],
    });
    cy.tab("edits");
    cy.get('[data-testid="edit-card"]').should("contain", "2 snaps");
  });

  it("deleting a snap removes it from the look it was tagged in", () => {
    cy.confirmDialogs(true);
    cy.gotoApp({
      items,
      selfies: [selfie("s_1", JULY_A, { outfitIds: ["o1"], itemIds: ["i1"] })],
      edits: [look()],
    });
    cy.seedImages({ s_1: PNG });

    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').click();
    cy.get('[data-testid="selfie-delete"]').click();

    readSelfies2().then((s) => expect(s).to.have.length(0));
    cy.tab("edits");
    cy.get('[data-testid="edit-card"]').click();
    cy.get('[data-testid="detail-selfies"]').should("not.exist");
  });

  it("untags a deleted look from its snaps (snaps survive)", () => {
    cy.confirmDialogs(true);
    cy.gotoApp({
      items,
      selfies: [selfie("s_1", JULY_A, { outfitIds: ["o1"], itemIds: ["i1"] })],
      edits: [look()],
    });
    cy.tab("edits");
    cy.get('[data-testid="edit-card"]').click();
    cy.get('[data-testid="detail-delete"]').click();

    cy.get('[data-testid="edit-card"]').should("not.exist");
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').should("have.length", 1);
    readSelfies2().then((s) => {
      expect(s[0].outfitIds).to.be.empty; // untagged
      expect(s[0].itemIds).to.include("i1"); // tagged pieces stay
    });
  });
});
