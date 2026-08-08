// Edits (unified outfits + collections): builder, disabled-save edge case,
// detail, edit, delete, filters, empty state, and Open in Closet.

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

const items = [
  owned("i1", "White Tee", "top"),
  owned("i2", "Blue Jeans", "bottom"),
  owned("i3", "Sun Hat", "accessory"),
];

const edit = (over = {}) => ({
  id: "e1",
  name: "Beach Day",
  itemIds: ["i1", "i2"],
  seasons: ["summer"],
  occasions: ["casual"],
  note: "",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  ...over,
});

const readEdits = () =>
  cy
    .window()
    .then((win) => JSON.parse(win.localStorage.getItem("closet:edits:v1")));

describe("Edits — builder & lifecycle", () => {
  it("shows the empty state with no edits", () => {
    cy.gotoApp({ items, edits: [] });
    cy.tab("edits");
    cy.contains("No edits yet.").should("be.visible");
  });

  it("collapses the pieces grid in the builder", () => {
    cy.gotoApp({ items, edits: [] });
    cy.tab("edits");
    cy.get('[data-testid="new-edit-btn"]').click();
    cy.get('[data-testid="builder-piece"]').should("have.length", 3);
    cy.get('[data-testid="builder-pieces-toggle"]').click();
    cy.get('[data-testid="builder-piece"]').should("not.exist");
    cy.get('[data-testid="builder-pieces-toggle"]').click();
    cy.get('[data-testid="builder-piece"]').should("have.length", 3);
  });

  it("keeps Save disabled until a name and at least one piece are chosen", () => {
    cy.gotoApp({ items, edits: [] });
    cy.tab("edits");
    cy.get('[data-testid="new-edit-btn"]').click();
    cy.get('[data-testid="builder"]').should("be.visible");

    cy.get('[data-testid="builder-save"]').should("be.disabled");
    cy.get('[data-testid="builder-name"]').type("Beach Day");
    cy.get('[data-testid="builder-save"]').should("be.disabled");
    cy.get('[data-testid="builder-piece"]').first().click();
    cy.get('[data-testid="builder-save"]').should("not.be.disabled");
  });

  it("builds an edit with type, pieces, note, season and occasion", () => {
    cy.gotoApp({ items, edits: [] });
    cy.tab("edits");
    cy.get('[data-testid="new-edit-btn"]').click();

    cy.get('[data-testid="builder-name"]').type("Beach Day");
    cy.get('[data-testid="builder-note"]').type("golden hour");
    cy.get('[data-testid="builder-types"]').contains("capsule").click();
    cy.get('[data-testid="builder-divider"]').should("exist");
    cy.get('[data-testid="builder-seasons"]').contains("summer").click();
    cy.get('[data-testid="builder-occasions"]').contains("casual").click();
    cy.get('[data-testid="builder-piece"][data-item-id="i1"]').click();
    cy.get('[data-testid="builder-piece"][data-item-id="i2"]').click();
    cy.get('[data-testid="builder-save"]').click();

    cy.get('[data-testid="builder"]').should("not.exist");
    cy.get('[data-testid="edit-card"]').should("have.length", 1);
    cy.contains("Beach Day").should("be.visible");
    readEdits().then((edits) => {
      expect(edits).to.have.length(1);
      expect(edits[0].name).to.eq("Beach Day");
      expect(edits[0].type).to.eq("capsule");
      expect(edits[0].itemIds).to.have.members(["i1", "i2"]);
      expect(edits[0].seasons).to.include("summer");
      expect(edits[0].occasions).to.include("casual");
      expect(edits[0].note).to.eq("golden hour");
    });
  });

  it("adds a custom tag to an edit and shows it in the detail", () => {
    cy.gotoApp({ items, edits: [] });
    cy.tab("edits");
    cy.get('[data-testid="new-edit-btn"]').click();
    cy.get('[data-testid="builder-name"]').type("Beach Day");
    cy.get('[data-testid="builder-piece"]').first().click();
    cy.get('[data-testid="builder-tag-input"]').type("vacation");
    cy.get('[data-testid="builder-tag-add"]').click();
    cy.get('[data-testid="builder-tags"]').contains("vacation").should("exist");
    cy.get('[data-testid="builder-save"]').click();

    readEdits().then((edits) => expect(edits[0].custom).to.include("vacation"));
    cy.get('[data-testid="edit-card"]').click();
    cy.get('[data-testid="detail-custom-tag"]').should("contain", "vacation");
  });

  it("opens an edit's detail modal", () => {
    cy.gotoApp({ items, edits: [edit()] });
    cy.tab("edits");
    cy.get('[data-testid="edit-card"]').click();
    cy.get('[data-testid="edit-detail"]').should("be.visible");
    cy.get('[data-testid="edit-detail"]').contains("Beach Day");
  });

  it("edits an edit from its detail modal", () => {
    cy.gotoApp({ items, edits: [edit()] });
    cy.tab("edits");
    cy.get('[data-testid="edit-card"]').click();
    cy.get('[data-testid="detail-edit"]').click();

    cy.get('[data-testid="builder"]').should("be.visible");
    cy.get('[data-testid="builder-save"]').should("contain", "Save Changes");
    cy.get('[data-testid="builder-name"]').clear().type("Rooftop Dinner");
    cy.get('[data-testid="builder-save"]').click();

    cy.get('[data-testid="builder"]').should("not.exist");
    cy.contains("Rooftop Dinner").should("be.visible");
    readEdits().then((edits) => {
      expect(edits[0].name).to.eq("Rooftop Dinner");
    });
  });

  it("deletes an edit when the confirm is accepted", () => {
    cy.confirmDialogs(true);
    cy.gotoApp({ items, edits: [edit()] });
    cy.tab("edits");
    cy.get('[data-testid="edit-card"]').click();
    cy.get('[data-testid="detail-delete"]').click();

    cy.get('[data-testid="edit-card"]').should("not.exist");
    cy.contains("No edits yet.").should("be.visible");
    readEdits().then((edits) => expect(edits).to.have.length(0));
  });

  it("filters edits by season", () => {
    cy.gotoApp({
      items,
      edits: [
        edit({ id: "e1", name: "Beach Day", seasons: ["summer"] }),
        edit({ id: "e2", name: "Ski Trip", seasons: ["winter"] }),
      ],
    });
    cy.tab("edits");
    cy.get('[data-testid="edit-card"]').should("have.length", 2);
    cy.get('[data-testid="edits-count"]').should("contain", "2 edits");
    cy.contains("Filters").click();
    cy.get('[data-filter-label="Season"]').contains("summer").click();
    cy.get('[data-testid="edit-card"]').should("have.length", 1);
    cy.get('[data-testid="edits-count"]').should("contain", "Showing 1 of 2");
    cy.contains("Beach Day").should("be.visible");
  });

  it("filters edits by type", () => {
    cy.gotoApp({
      items,
      edits: [
        edit({ id: "e1", name: "Beach Day", type: "outfit" }),
        edit({ id: "e2", name: "Italy Trip", type: "packing list" }),
      ],
    });
    cy.tab("edits");
    cy.get('[data-testid="edit-card"]').should("have.length", 2);
    cy.contains("Filters").click();
    cy.get('[data-filter-label="Type"]').contains("packing list").click();
    cy.get('[data-testid="edit-card"]').should("have.length", 1);
    cy.get('[data-testid="edits-count"]').should("contain", "Showing 1 of 2");
    cy.contains("Italy Trip").should("be.visible");
  });

  it("filters edits by custom tag", () => {
    cy.gotoApp({
      items,
      edits: [
        edit({ id: "e1", name: "Beach Day", custom: ["vacation"] }),
        edit({ id: "e2", name: "Work Week", custom: ["office"] }),
      ],
    });
    cy.tab("edits");
    cy.get('[data-testid="edit-card"]').should("have.length", 2);
    cy.contains("Filters").click();
    cy.get('[data-filter-label="Tags"]').contains("vacation").click();
    cy.get('[data-testid="edit-card"]').should("have.length", 1);
    cy.get('[data-testid="edits-count"]').should("contain", "Showing 1 of 2");
    cy.contains("Beach Day").should("be.visible");
  });

  it("filters edits by a closet piece via the picker modal", () => {
    cy.gotoApp({
      items,
      edits: [
        edit({ id: "e1", name: "Beach Day", itemIds: ["i1", "i2"] }),
        edit({ id: "e2", name: "Hat Day", itemIds: ["i3"] }),
      ],
    });
    cy.tab("edits");
    cy.get('[data-testid="edit-card"]').should("have.length", 2);

    cy.contains("Filters").click(); // the piece filter lives in the drawer
    cy.get('[data-testid="edit-item-filter-btn"]').click();
    cy.get('[data-testid="edit-item-filter-modal"]').should("be.visible");
    cy.get('[data-testid="filter-item"][data-item-id="i3"]').click();
    cy.get('[data-testid="edit-item-filter-done"]').click();
    cy.get('[data-testid="edit-item-filter-modal"]').should("not.exist");

    cy.get('[data-testid="edit-item-filter-chip"][data-item-id="i3"]').should(
      "contain",
      "Sun Hat",
    );
    cy.get('[data-testid="edit-card"]').should("have.length", 1);
    cy.contains("Hat Day").should("be.visible");

    // Remove the piece via its chip → everything returns.
    cy.get('[data-testid="edit-item-filter-chip"][data-item-id="i3"]').click();
    cy.get('[data-testid="edit-card"]').should("have.length", 2);
  });

  it("sorts edits by wears and by date added", () => {
    const wear = (id, editId) => ({
      id,
      createdAt: 1,
      dateTaken: 1,
      outfitIds: [editId],
      itemIds: [],
      rating: null,
    });
    cy.gotoApp({
      items,
      edits: [
        edit({ id: "eA", name: "Alpha", createdAt: 300 }),
        edit({ id: "eB", name: "Bravo", createdAt: 200 }),
        edit({ id: "eC", name: "Charlie", createdAt: 100 }),
      ],
      selfies: [wear("s1", "eB"), wear("s2", "eB"), wear("s3", "eC")],
    });
    cy.tab("edits");
    const firstCard = () => cy.get('[data-testid="edit-card"]').first();

    cy.get('[data-testid="sort-btn"]').click();
    cy.get('[data-testid="sort-option-worn-desc"]').click();
    firstCard().should("have.attr", "data-edit-id", "eB"); // 2 snaps

    cy.get('[data-testid="sort-btn"]').click();
    cy.get('[data-testid="sort-option-newest"]').click();
    firstCard().should("have.attr", "data-edit-id", "eA"); // createdAt 300

    cy.get('[data-testid="sort-btn"]').click();
    cy.get('[data-testid="sort-option-oldest"]').click();
    firstCard().should("have.attr", "data-edit-id", "eC"); // createdAt 100
  });

  it("opens an edit and jumps to a filtered closet", () => {
    cy.gotoApp({ items, edits: [edit()] }); // e1 holds White Tee + Blue Jeans
    cy.tab("edits");
    cy.get('[data-testid="edit-card"]').click();
    cy.get('[data-testid="edit-detail"]').should("be.visible");

    cy.get('[data-testid="detail-open-closet"]').click();
    // Landed on the closet, filtered to the two pieces in the edit.
    cy.get('[data-testid="nav-closet"]').should("exist");
    cy.get('[data-testid="item-card"]').should("have.length", 2);
    cy.contains("White Tee").should("be.visible");
    cy.contains("Sun Hat").should("not.exist");
  });
});
