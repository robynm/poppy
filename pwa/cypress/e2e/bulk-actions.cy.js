// Bulk select-mode actions: select all/none, bulk tags (season/custom/status),
// bulk collection assignment, bulk look assignment.

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

const readItems = () =>
  cy
    .window()
    .then((win) => JSON.parse(win.localStorage.getItem("closet:items:v1")));
const readCollections = () =>
  cy
    .window()
    .then((win) =>
      JSON.parse(win.localStorage.getItem("closet:collections:v1")),
    );
const readOutfits = () =>
  cy
    .window()
    .then((win) => JSON.parse(win.localStorage.getItem("closet:outfits:v1")));

const selectItem = (id) =>
  cy
    .get(`[data-testid="item-card"][data-item-id="${id}"]`)
    .find('button[aria-label="Select item"]')
    .click();

describe("Closet — bulk actions", () => {
  it("enters select mode and reports the selected count", () => {
    cy.gotoApp({ items });
    selectItem("i1");
    selectItem("i2");
    cy.contains("2 selected").should("be.visible");
  });

  it("selects all, reflects the count in the apply button, then clears", () => {
    cy.gotoApp({ items });
    selectItem("i1");
    cy.get('[data-testid="select-all"]').click();
    cy.contains("3 selected").should("be.visible");

    // The bulk sheet's apply button reflects the full selection…
    cy.get('[data-testid="bulk-tags"]').click();
    cy.get('[data-testid="bulk-apply"]').should("contain", "Apply to 3 items");
    // …then dismiss the sheet via its backdrop (its preceding sibling) and clear.
    cy.get('[data-testid="bulk-sheet"]').prev().click({ force: true });
    cy.get('[data-testid="select-none"]').click();
    cy.contains("selected").should("not.exist");
  });

  it("bulk-adds a season to every selected item", () => {
    cy.gotoApp({ items });
    selectItem("i1");
    cy.get('[data-testid="select-all"]').click();
    cy.get('[data-testid="bulk-tags"]').click();
    cy.get('[data-testid="bulk-sheet"]').contains("summer").click();
    cy.get('[data-testid="bulk-apply"]').click();

    cy.get('[data-testid="bulk-sheet"]').should("not.exist");
    readItems().then((all) => {
      all.forEach((it) => expect(it.seasons).to.include("summer"));
    });
  });

  it("bulk-adds a new custom tag to selected items", () => {
    cy.gotoApp({ items });
    selectItem("i1");
    selectItem("i2");
    cy.get('[data-testid="bulk-tags"]').click();
    cy.get('[data-testid="bulk-tag-input"]').type("capsule");
    cy.get('[data-testid="bulk-tag-add"]').click();
    cy.get('[data-testid="bulk-apply"]').click();

    readItems().then((all) => {
      const byId = Object.fromEntries(all.map((i) => [i.id, i]));
      expect(byId.i1.custom).to.include("capsule");
      expect(byId.i2.custom).to.include("capsule");
      expect(byId.i3.custom).to.not.include("capsule");
    });
  });

  it("bulk-sets status on selected items", () => {
    cy.gotoApp({ items });
    selectItem("i1");
    cy.get('[data-testid="select-all"]').click();
    cy.get('[data-testid="bulk-tags"]').click();
    cy.get('[data-testid="bulk-sheet"]').contains("planned").click();
    cy.get('[data-testid="bulk-apply"]').click();

    readItems().then((all) => {
      all.forEach((it) => expect(it.status).to.eq("planned"));
    });
  });

  it("bulk-assigns selected items to a collection", () => {
    cy.gotoApp({
      items,
      collections: [
        {
          id: "c1",
          name: "Capsule",
          description: "",
          seasons: [],
          occasions: [],
          itemIds: [],
          createdAt: 1700000000000,
        },
      ],
    });
    selectItem("i1");
    selectItem("i2");
    cy.get('[data-testid="bulk-collections"]').click();
    cy.get('[data-testid="bulk-sheet"]').contains("Capsule").click();
    cy.get('[data-testid="bulk-apply"]').click();

    readCollections().then((cols) => {
      expect(cols[0].itemIds).to.have.members(["i1", "i2"]);
    });
  });

  it("bulk-assigns selected items to a look", () => {
    cy.gotoApp({
      items,
      outfits: [
        {
          id: "o1",
          name: "Weekend",
          itemIds: [],
          seasons: [],
          occasions: [],
          note: "",
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
        },
      ],
    });
    selectItem("i1");
    selectItem("i3");
    cy.get('[data-testid="bulk-looks"]').click();
    cy.get('[data-testid="bulk-sheet"]').contains("Weekend").click();
    cy.get('[data-testid="bulk-apply"]').click();

    readOutfits().then((outfits) => {
      expect(outfits[0].itemIds).to.have.members(["i1", "i3"]);
    });
  });
});
