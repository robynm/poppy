// Closet items: add (with photo), edit metadata, tag, view, delete.

const item = (over = {}) => ({
  id: "i_seed_1",
  name: "Seed Tee",
  category: "top",
  seasons: ["summer"],
  occasions: ["casual"],
  custom: [],
  status: "owned",
  brand: "",
  yearPurchased: "",
  ...over,
});

const readItems = () =>
  cy
    .window()
    .then((win) => JSON.parse(win.localStorage.getItem("closet:items:v1")));

describe("Closet — items", () => {
  it("shows the empty state when the closet has no pieces", () => {
    cy.gotoApp({ items: [] });
    // Default status filter is "owned", so an empty closet shows the empty grid.
    cy.contains("Nothing matches.").should("be.visible");
    cy.get('[data-testid="item-card"]').should("not.exist");
  });

  it("adds a piece from a photo and opens it for editing", () => {
    cy.gotoApp({ items: [] });
    cy.get('[data-testid="add-piece-btn"]').click();
    cy.get('[data-testid="add-item-modal"]').should("be.visible");
    cy.uploadPhoto("add-item-file");

    // handleAddItem resizes the image, saves the item, then opens the EditDrawer.
    cy.get('[data-testid="edit-drawer"]', { timeout: 15000 }).should(
      "be.visible",
    );
    // Name is derived from the file name: "sample-item.jpg" -> "Sample Item".
    cy.get('[data-testid="edit-name"]').should("have.value", "Sample Item");

    cy.get('[data-testid="edit-name"]').clear().type("Linen Blazer");
    cy.get('[data-testid="edit-save"]').click();

    cy.get('[data-testid="edit-drawer"]').should("not.exist");
    cy.get('[data-testid="item-card"]').should("have.length", 1);
    cy.contains("Linen Blazer").should("be.visible");
    readItems().then((items) => {
      expect(items).to.have.length(1);
      expect(items[0].name).to.eq("Linen Blazer");
    });
  });

  it("edits category, status, brand, and year and persists them", () => {
    cy.gotoApp({ items: [item()] });
    cy.get('[data-testid="item-card"]').click();
    cy.get('[data-testid="view-drawer"]').should("be.visible");
    cy.get('[data-testid="view-edit"]').click();
    cy.get('[data-testid="edit-drawer"]').should("be.visible");

    cy.get('[data-testid="edit-category"]').contains("dress").click();
    cy.get('[data-testid="edit-status"]').contains("planned").click();
    cy.get('[data-testid="edit-year"]').clear().type("2021");

    // Brand combobox: type a new brand and press Enter to add + select it.
    cy.get('[data-testid="edit-drawer"]')
      .find('input[placeholder="search or add a brand…"]')
      .type("Everlane{enter}");

    cy.get('[data-testid="edit-save"]').click();
    cy.get('[data-testid="edit-drawer"]').should("not.exist");

    readItems().then((items) => {
      expect(items[0].category).to.eq("dress");
      expect(items[0].status).to.eq("planned");
      expect(items[0].brand).to.eq("Everlane");
      expect(items[0].yearPurchased).to.eq("2021");
    });
  });

  it("adds and removes a custom tag", () => {
    cy.gotoApp({ items: [item()] });
    cy.get('[data-testid="item-card"]').click();
    cy.get('[data-testid="view-edit"]').click();

    cy.get('[data-testid="edit-tag-input"]').type("vacation");
    cy.get('[data-testid="edit-tag-add"]').click();
    cy.get('[data-testid="edit-custom-tags"]')
      .contains("vacation")
      .should("exist");
    cy.get('[data-testid="edit-save"]').click();
    readItems().then((items) => {
      expect(items[0].custom).to.include("vacation");
    });

    // Re-open and toggle the tag off.
    cy.get('[data-testid="item-card"]').click();
    cy.get('[data-testid="view-edit"]').click();
    cy.get('[data-testid="edit-custom-tags"]').contains("vacation").click();
    cy.get('[data-testid="edit-save"]').click();
    readItems().then((items) => {
      expect(items[0].custom).to.not.include("vacation");
    });
  });

  it("shows how many times a piece has been worn", () => {
    const snap = (id) => ({
      id,
      createdAt: 1,
      dateTaken: 1,
      outfitIds: [],
      itemIds: ["i_seed_1"],
      rating: null,
    });
    cy.gotoApp({ items: [item()], selfies: [snap("s1"), snap("s2")] });
    cy.get('[data-testid="item-card"]').click();
    cy.get('[data-testid="view-wears"]').should("contain", "2 times");
  });

  it("deletes a piece when the confirm is accepted", () => {
    cy.confirmDialogs(true);
    cy.gotoApp({ items: [item()] });
    cy.get('[data-testid="item-card"]').click();
    cy.get('[data-testid="view-edit"]').click();
    cy.get('[data-testid="edit-delete"]').click();

    cy.get('[data-testid="edit-drawer"]').should("not.exist");
    cy.get('[data-testid="item-card"]').should("not.exist");
    readItems().then((items) => expect(items).to.have.length(0));
  });

  it("keeps the piece when the delete confirm is cancelled", () => {
    cy.confirmDialogs(false);
    cy.gotoApp({ items: [item()] });
    cy.get('[data-testid="item-card"]').click();
    cy.get('[data-testid="view-edit"]').click();
    cy.get('[data-testid="edit-delete"]').click();

    // Confirm was declined: still editing, item still present.
    cy.get('[data-testid="edit-drawer"]').should("be.visible");
    readItems().then((items) => expect(items).to.have.length(1));
  });
});
