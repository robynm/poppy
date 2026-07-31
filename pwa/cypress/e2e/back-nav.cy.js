// Device Back button (Android): closes the open overlay instead of leaving the
// app. Driven here via window.history.back().

const back = () => cy.window().then((w) => w.history.back());

describe("Device back button", () => {
  it("closes an open modal and stays in the app", () => {
    cy.gotoApp({ items: [] });
    cy.get('[data-testid="menu-button"]').click();
    cy.get('[data-testid="menu-about"]').click();
    cy.get('[data-testid="about-modal"]').should("be.visible");

    back();
    cy.get('[data-testid="about-modal"]').should("not.exist");
    cy.get('[data-testid="nav-closet"]').should("be.visible"); // still in app
  });

  it("closes the look builder", () => {
    cy.gotoApp({ items: [] });
    cy.tab("looks");
    cy.get('[data-testid="new-look-btn"]').click();
    cy.get('[data-testid="builder"]').should("be.visible");

    back();
    cy.get('[data-testid="builder"]').should("not.exist");
    cy.get('[data-testid="new-look-btn"]').should("be.visible");
  });

  it("stays balanced when a modal is closed via its X, then Back", () => {
    cy.gotoApp({ items: [] });
    // Open then close via the X — this must not leave a stale history entry.
    cy.get('[data-testid="menu-button"]').click();
    cy.get('[data-testid="menu-stats"]').click();
    cy.get('[data-testid="stats-close"]').click();
    cy.get('[data-testid="stats-modal"]').should("not.exist");

    // Re-open and close with Back.
    cy.get('[data-testid="menu-button"]').click();
    cy.get('[data-testid="menu-stats"]').click();
    cy.get('[data-testid="stats-modal"]').should("be.visible");
    back();
    cy.get('[data-testid="stats-modal"]').should("not.exist");
    cy.get('[data-testid="nav-closet"]').should("be.visible");
  });

  it("peels nested overlays one at a time (detail → builder)", () => {
    cy.gotoApp({
      items: [
        {
          id: "i1",
          name: "Tee",
          category: "top",
          seasons: [],
          occasions: [],
          custom: [],
          status: "owned",
          brand: "",
          yearPurchased: "",
        },
      ],
      outfits: [
        {
          id: "o1",
          name: "Look",
          itemIds: ["i1"],
          seasons: [],
          occasions: [],
          note: "",
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    });
    cy.tab("looks");
    cy.get('[data-testid="outfit-card"]').click();
    cy.get('[data-testid="outfit-detail"]').should("be.visible");
    cy.get('[data-testid="detail-edit"]').click(); // detail closes, builder opens
    cy.get('[data-testid="builder"]').should("be.visible");

    back(); // closes builder, back to the looks grid
    cy.get('[data-testid="builder"]').should("not.exist");
    cy.get('[data-testid="new-look-btn"]').should("be.visible");
  });
});
