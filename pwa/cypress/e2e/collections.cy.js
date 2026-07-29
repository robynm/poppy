// Collections: create (name-required edge case), detail, open-in-closet,
// edit, delete, filters, empty state.

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

const collection = (over = {}) => ({
  id: "c1",
  name: "Italy Trip",
  description: "",
  seasons: ["summer"],
  occasions: ["casual"],
  itemIds: ["i1", "i2"],
  createdAt: 1700000000000,
  ...over,
});

const readCollections = () =>
  cy
    .window()
    .then((win) =>
      JSON.parse(win.localStorage.getItem("closet:collections:v1")),
    );

describe("Collections", () => {
  it("shows the empty state with no collections", () => {
    cy.gotoApp({ items, collections: [] });
    cy.tab("collections");
    cy.contains("No collections yet.").should("be.visible");
  });

  it("creates a collection (name required) with pieces", () => {
    cy.gotoApp({ items, collections: [] });
    cy.tab("collections");
    cy.get('[data-testid="new-collection-btn"]').click();

    // Name is required — the create button starts disabled.
    cy.get('[data-testid="collection-save"]').should("be.disabled");
    cy.get('[data-testid="collection-name"]').type("Italy Trip");
    cy.get('[data-testid="collection-desc"]').type("July capsule");
    cy.get('[data-testid="collection-save"]').should("not.be.disabled");
    cy.get('[data-testid="collection-piece"][data-item-id="i1"]').click();
    cy.get('[data-testid="collection-piece"][data-item-id="i2"]').click();
    cy.get('[data-testid="collection-save"]').click();

    cy.get('[data-testid="collection-card"]').should("have.length", 1);
    cy.contains("Italy Trip").should("be.visible");
    readCollections().then((cols) => {
      expect(cols).to.have.length(1);
      expect(cols[0].name).to.eq("Italy Trip");
      expect(cols[0].itemIds).to.have.members(["i1", "i2"]);
    });
  });

  it("opens a collection and jumps to a filtered closet", () => {
    cy.gotoApp({ items, collections: [collection()] });
    cy.tab("collections");
    cy.get('[data-testid="collection-card"]').click();
    cy.get('[data-testid="collection-detail"]').should("be.visible");

    cy.get('[data-testid="detail-open-closet"]').click();
    // Landed on the closet, filtered to the two collection pieces.
    cy.get('[data-testid="nav-closet"]').should("exist");
    cy.get('[data-testid="item-card"]').should("have.length", 2);
    cy.contains("White Tee").should("be.visible");
    cy.contains("Sun Hat").should("not.exist");
  });

  it("edits a collection from its detail modal", () => {
    cy.gotoApp({ items, collections: [collection()] });
    cy.tab("collections");
    cy.get('[data-testid="collection-card"]').click();
    cy.get('[data-testid="detail-edit"]').click();

    cy.get('[data-testid="collection-name"]')
      .should("have.value", "Italy Trip")
      .clear()
      .type("Italy 2025");
    cy.get('[data-testid="collection-save"]')
      .should("contain", "Save Collection")
      .click();

    cy.contains("Italy 2025").should("be.visible");
    readCollections().then((cols) => expect(cols[0].name).to.eq("Italy 2025"));
  });

  it("deletes a collection when the confirm is accepted", () => {
    cy.confirmDialogs(true);
    cy.gotoApp({ items, collections: [collection()] });
    cy.tab("collections");
    cy.get('[data-testid="collection-card"]').click();
    cy.get('[data-testid="detail-delete"]').click();

    cy.get('[data-testid="collection-card"]').should("not.exist");
    cy.contains("No collections yet.").should("be.visible");
    readCollections().then((cols) => expect(cols).to.have.length(0));
  });

  it("filters collections by season", () => {
    cy.gotoApp({
      items,
      collections: [
        collection({ id: "c1", name: "Italy Trip", seasons: ["summer"] }),
        collection({ id: "c2", name: "Aspen", seasons: ["winter"] }),
      ],
    });
    cy.tab("collections");
    cy.get('[data-testid="collection-card"]').should("have.length", 2);
    cy.contains("Filters").click();
    cy.get('[data-filter-label="Season"]').contains("winter").click();
    cy.get('[data-testid="collection-card"]').should("have.length", 1);
    cy.contains("Aspen").should("be.visible");
  });
});
