// Looks (outfits): builder, disabled-save edge case, detail, edit, delete,
// filters, empty state, selfie.

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

const outfit = (over = {}) => ({
  id: "o1",
  name: "Beach Day",
  itemIds: ["i1", "i2"],
  seasons: ["summer"],
  occasions: ["casual"],
  note: "",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  ...over,
});

const readOutfits = () =>
  cy
    .window()
    .then((win) => JSON.parse(win.localStorage.getItem("closet:outfits:v1")));

describe("Looks — builder & lifecycle", () => {
  it("shows the empty state with no looks", () => {
    cy.gotoApp({ items, outfits: [] });
    cy.tab("looks");
    cy.contains("No looks yet.").should("be.visible");
  });

  it("keeps Save disabled until a name and at least one piece are chosen", () => {
    cy.gotoApp({ items, outfits: [] });
    cy.tab("looks");
    cy.get('[data-testid="new-look-btn"]').click();
    cy.get('[data-testid="builder"]').should("be.visible");

    cy.get('[data-testid="builder-save"]').should("be.disabled");
    cy.get('[data-testid="builder-name"]').type("Beach Day");
    // Name alone isn't enough.
    cy.get('[data-testid="builder-save"]').should("be.disabled");
    cy.get('[data-testid="builder-piece"]').first().click();
    cy.get('[data-testid="builder-save"]').should("not.be.disabled");
  });

  it("builds a look with pieces, note, season and occasion", () => {
    cy.gotoApp({ items, outfits: [] });
    cy.tab("looks");
    cy.get('[data-testid="new-look-btn"]').click();

    cy.get('[data-testid="builder-name"]').type("Beach Day");
    cy.get('[data-testid="builder-note"]').type("golden hour");
    cy.get('[data-testid="builder-seasons"]').contains("summer").click();
    cy.get('[data-testid="builder-occasions"]').contains("casual").click();
    cy.get('[data-testid="builder-piece"][data-item-id="i1"]').click();
    cy.get('[data-testid="builder-piece"][data-item-id="i2"]').click();
    cy.get('[data-testid="builder-save"]').click();

    cy.get('[data-testid="builder"]').should("not.exist");
    cy.get('[data-testid="outfit-card"]').should("have.length", 1);
    cy.contains("Beach Day").should("be.visible");
    readOutfits().then((outfits) => {
      expect(outfits).to.have.length(1);
      expect(outfits[0].name).to.eq("Beach Day");
      expect(outfits[0].itemIds).to.have.members(["i1", "i2"]);
      expect(outfits[0].seasons).to.include("summer");
      expect(outfits[0].occasions).to.include("casual");
      expect(outfits[0].note).to.eq("golden hour");
    });
  });

  it("opens a look's detail modal", () => {
    cy.gotoApp({ items, outfits: [outfit()] });
    cy.tab("looks");
    cy.get('[data-testid="outfit-card"]').click();
    cy.get('[data-testid="outfit-detail"]').should("be.visible");
    cy.get('[data-testid="outfit-detail"]').contains("Beach Day");
  });

  it("edits a look from its detail modal", () => {
    cy.gotoApp({ items, outfits: [outfit()] });
    cy.tab("looks");
    cy.get('[data-testid="outfit-card"]').click();
    cy.get('[data-testid="detail-edit"]').click();

    cy.get('[data-testid="builder"]').should("be.visible");
    cy.get('[data-testid="builder-save"]').should("contain", "Save Changes");
    cy.get('[data-testid="builder-name"]').clear().type("Rooftop Dinner");
    cy.get('[data-testid="builder-save"]').click();

    cy.get('[data-testid="builder"]').should("not.exist");
    cy.contains("Rooftop Dinner").should("be.visible");
    readOutfits().then((outfits) => {
      expect(outfits[0].name).to.eq("Rooftop Dinner");
    });
  });

  it("deletes a look when the confirm is accepted", () => {
    cy.confirmDialogs(true);
    cy.gotoApp({ items, outfits: [outfit()] });
    cy.tab("looks");
    cy.get('[data-testid="outfit-card"]').click();
    cy.get('[data-testid="detail-delete"]').click();

    cy.get('[data-testid="outfit-card"]').should("not.exist");
    cy.contains("No looks yet.").should("be.visible");
    readOutfits().then((outfits) => expect(outfits).to.have.length(0));
  });

  it("filters looks by season", () => {
    cy.gotoApp({
      items,
      outfits: [
        outfit({ id: "o1", name: "Beach Day", seasons: ["summer"] }),
        outfit({ id: "o2", name: "Ski Trip", seasons: ["winter"] }),
      ],
    });
    cy.tab("looks");
    cy.get('[data-testid="outfit-card"]').should("have.length", 2);
    cy.contains("Filters").click();
    cy.get('[data-filter-label="Season"]').contains("summer").click();
    cy.get('[data-testid="outfit-card"]').should("have.length", 1);
    cy.contains("Beach Day").should("be.visible");
  });
});
