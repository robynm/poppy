// Selfies: month-grouped gallery, upload, edit date (reflow), delete, and
// association with a look (built in the look builder, shown in look detail).

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// Fixed capture dates (local noon to avoid TZ drift), two different months.
const JULY_A = new Date(2026, 6, 15, 12).getTime(); // 2026-07
const JULY_B = new Date(2026, 6, 2, 12).getTime(); // 2026-07
const MAY = new Date(2026, 4, 10, 12).getTime(); // 2026-05

const selfie = (id, dateTaken, outfitId = null) => ({
  id,
  createdAt: dateTaken,
  dateTaken,
  outfitId,
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
    // Newest month first.
    cy.get('[data-testid="selfie-month"]')
      .first()
      .should("have.attr", "data-month", "2026-07");
    cy.get('[data-testid="selfie-month"]')
      .eq(1)
      .should("have.attr", "data-month", "2026-05");
    // July has two, May has one.
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

  it("saves a zoom/crop adjustment on the snap", () => {
    cy.gotoApp({ selfies: [selfie("s_1", JULY_A)] });
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').click();
    // Set the range via the native setter so React's onChange fires.
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
    // The new photo lands in IndexedDB for this snap (poll until written).
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

    // Nothing persisted — still under the original month.
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

  it("migrates a legacy per-look selfie into the gallery", () => {
    const created = 1650000000000;
    cy.gotoApp({
      items: [owned("i1", "White Tee", "top")],
      outfits: [
        {
          id: "o1",
          name: "Old Look",
          itemIds: ["i1"],
          seasons: [],
          occasions: [],
          note: "",
          createdAt: created,
          updatedAt: created,
        },
      ],
    });
    // Put a legacy selfie blob in IDB (the old `selfie_<outfitId>` convention).
    cy.seedImages({ selfie_o1: PNG });
    // Simulate an un-migrated install and reload so the migration runs.
    cy.window().then((w) =>
      w.localStorage.removeItem("closet:selfies_migrated:v1"),
    );
    cy.reload();
    cy.get('[data-testid="nav-closet"]').should("exist");

    cy.window().then((w) => {
      const s = JSON.parse(w.localStorage.getItem("closet:selfies:v1"));
      expect(s).to.have.length(1);
      expect(s[0].id).to.eq("selfie_o1");
      expect(s[0].dateTaken).to.eq(created); // dated to the look's creation
      expect(s[0].outfitId).to.eq("o1"); // 1-to-many link lives on the selfie
    });
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').should("have.length", 1);
  });
});

describe("Selfie ↔ look association (1-to-many)", () => {
  const items = [owned("i1", "White Tee", "top")];
  const look = (over = {}) => ({
    id: "o1",
    name: "Sunny Day",
    itemIds: ["i1"],
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

  it("links a selfie to a look in the builder and shows it in the detail", () => {
    cy.gotoApp({ items, selfies: [selfie("s_1", JULY_A)], outfits: [] });
    cy.seedImages({ s_1: PNG }); // detail only renders selfies that have a photo

    cy.tab("looks");
    cy.get('[data-testid="new-look-btn"]').click();
    cy.get('[data-testid="builder-name"]').type("Sunny Day");
    cy.get('[data-testid="builder-piece"]').first().click();
    cy.get('[data-testid="builder-selfie"][data-selfie-id="s_1"]').click();
    cy.get('[data-testid="builder-save"]').click();

    // The link is recorded on the selfie.
    readSelfies2().then((s) => expect(s[0].outfitId).to.be.a("string"));
    cy.get('[data-testid="outfit-card"]').click();
    cy.get('[data-testid="detail-selfies"]').should("be.visible");
    cy.get('[data-testid="detail-selfie-thumb"]').should("have.length", 1);
  });

  it("links a look to a selfie from the edit-selfie screen", () => {
    cy.gotoApp({ items, selfies: [selfie("s_1", JULY_A)], outfits: [look()] });
    cy.seedImages({ s_1: PNG });

    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').click();
    cy.get('[data-testid="selfie-detail"]').should("be.visible");
    cy.get('[data-testid="selfie-look"]').select("o1");
    cy.get('[data-testid="selfie-save"]').click();
    cy.get('[data-testid="selfie-detail"]').should("not.exist");
    readSelfies2().then((s) => expect(s[0].outfitId).to.eq("o1"));

    // It now shows on the look.
    cy.tab("looks");
    cy.get('[data-testid="outfit-card"]').click();
    cy.get('[data-testid="detail-selfie-thumb"]').should("have.length", 1);
  });

  it("offers only unlinked snaps in the look builder", () => {
    cy.gotoApp({
      items,
      selfies: [selfie("s_free", JULY_A), selfie("s_taken", JULY_A, "o1")],
      outfits: [look()],
    });
    cy.tab("looks");
    cy.get('[data-testid="new-look-btn"]').click();
    cy.get('[data-testid="builder-selfie"]').should("have.length", 1);
    cy.get('[data-testid="builder-selfie"][data-selfie-id="s_free"]').should(
      "exist",
    );
    cy.get('[data-testid="builder-selfie"][data-selfie-id="s_taken"]').should(
      "not.exist",
    );
  });

  it("shows the linked look's name on the snap thumbnail", () => {
    cy.gotoApp({
      items,
      selfies: [selfie("s_1", JULY_A, "o1")],
      outfits: [look()],
    });
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card-look"]').should("contain", "Sunny Day");
  });

  it("shows the selfie count on the look thumbnail", () => {
    cy.gotoApp({
      items,
      outfits: [look()],
      selfies: [
        selfie("s_1", JULY_A, "o1"),
        selfie("s_2", JULY_B, "o1"),
        selfie("s_3", MAY, null),
      ],
    });
    cy.tab("looks");
    cy.get('[data-testid="outfit-card"]').should("contain", "2 snaps");
  });

  it("deleting a selfie removes it from the look it was linked to", () => {
    cy.confirmDialogs(true);
    cy.gotoApp({
      items,
      selfies: [selfie("s_1", JULY_A, "o1")],
      outfits: [look()],
    });
    cy.seedImages({ s_1: PNG });

    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').click();
    cy.get('[data-testid="selfie-delete"]').click();

    readSelfies2().then((s) => expect(s).to.have.length(0));
    cy.tab("looks");
    cy.get('[data-testid="outfit-card"]').click();
    cy.get('[data-testid="detail-selfies"]').should("not.exist");
  });

  it("unlinks a look's selfies when the look is deleted (selfies survive)", () => {
    cy.confirmDialogs(true);
    cy.gotoApp({
      items,
      selfies: [selfie("s_1", JULY_A, "o1")],
      outfits: [look()],
    });
    cy.tab("looks");
    cy.get('[data-testid="outfit-card"]').click();
    cy.get('[data-testid="detail-delete"]').click();

    // Look gone, selfie survives but unlinked.
    cy.get('[data-testid="outfit-card"]').should("not.exist");
    cy.tab("selfies");
    cy.get('[data-testid="selfie-card"]').should("have.length", 1);
    readSelfies2().then((s) => expect(s[0].outfitId).to.eq(null));
  });
});
