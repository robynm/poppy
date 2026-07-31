// Stats: "Most worn" is driven by snaps — each snap on a look counts as one
// wear for every item in that look; looks with no snaps don't count.

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
const snap = (id, outfitId) => ({
  id,
  createdAt: 1700000000000,
  dateTaken: 1700000000000,
  outfitId,
});
const look = (id, itemIds) => ({
  id,
  name: id,
  itemIds,
  seasons: [],
  occasions: [],
  note: "",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
});

const openStats = () => {
  cy.get('[data-testid="menu-button"]').click();
  cy.get('[data-testid="menu-stats"]').click();
  cy.get('[data-testid="stats-modal"]').should("be.visible");
};

describe("Stats — times worn", () => {
  it("counts each snap as a wear for every item in its look", () => {
    cy.gotoApp({
      items: [
        owned("i1", "White Tee", "top"),
        owned("i2", "Blue Jeans", "bottom"),
        owned("i3", "Sun Hat", "accessory"),
      ],
      // o1 has two snaps; o2 has none.
      outfits: [look("o1", ["i1", "i2"]), look("o2", ["i2", "i3"])],
      selfies: [snap("s1", "o1"), snap("s2", "o1")],
    });
    openStats();

    cy.get('[data-testid="stat-most-worn"]')
      .should("exist")
      .and("contain", "4 total wears");

    // i1 (only in o1) → 2 wears; i2 (o1 + snapless o2) → 2 wears.
    cy.get('[data-testid="worn-item"]').should("have.length", 2);
    cy.get('[data-testid="worn-item"][data-item-id="i1"]').should(
      "contain",
      "2 wears",
    );
    cy.get('[data-testid="worn-item"][data-item-id="i2"]').should(
      "contain",
      "2 wears",
    );
    // i3 lives only in the snapless look → never worn.
    cy.get('[data-testid="worn-item"][data-item-id="i3"]').should("not.exist");
  });

  it("expands the Most-worn list to show all items", () => {
    const items = Array.from({ length: 6 }, (_, i) =>
      owned(`i${i + 1}`, `Item ${i + 1}`, "top"),
    );
    cy.gotoApp({
      items,
      outfits: [look("o1", items.map((i) => i.id))],
      selfies: [snap("s1", "o1")],
    });
    openStats();

    // Collapsed: only the top 5 show.
    cy.get('[data-testid="worn-item"]').should("have.length", 5);
    cy.get('[data-testid="worn-toggle"]')
      .should("contain", "Show all 6")
      .click();
    cy.get('[data-testid="worn-item"]').should("have.length", 6);
    cy.get('[data-testid="worn-toggle"]').should("contain", "Show less");

    // The versatility list has the same toggle.
    cy.get('[data-testid="versatile-toggle"]').should("contain", "Show all 6");
  });

  it("omits the Most-worn section when no look has a snap", () => {
    cy.gotoApp({
      items: [owned("i1", "White Tee", "top")],
      outfits: [look("o1", ["i1"])],
      selfies: [], // no snaps at all
    });
    openStats();
    cy.get('[data-testid="stat-most-worn"]').should("not.exist");
  });
});
