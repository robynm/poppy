// App shell: bottom-nav routing, header menu + modals, theme toggle, splash.

describe("Navigation, theme & splash", () => {
  it("switches between the three views from the bottom nav", () => {
    cy.gotoApp({ items: [] });
    cy.get('[data-testid="add-piece-btn"]').should("be.visible"); // Closet

    cy.tab("selfies");
    cy.get('[data-testid="selfies-upload-btn"]').should("be.visible");

    cy.tab("edits");
    cy.get('[data-testid="new-edit-btn"]').should("be.visible");

    cy.tab("closet");
    cy.get('[data-testid="add-piece-btn"]').should("be.visible");
  });

  it("opens Stats, About and Backup from the header menu", () => {
    cy.gotoApp({ items: [] });

    cy.get('[data-testid="menu-button"]').click();
    cy.get('[data-testid="menu-stats"]').click();
    cy.get('[data-testid="stats-modal"]').should("be.visible");
    cy.get('[data-testid="stats-close"]').click();
    cy.get('[data-testid="stats-modal"]').should("not.exist");

    cy.get('[data-testid="menu-button"]').click();
    cy.get('[data-testid="menu-about"]').click();
    cy.get('[data-testid="about-modal"]').should("be.visible");
    cy.get('[data-testid="about-close"]').click();
    cy.get('[data-testid="about-modal"]').should("not.exist");

    cy.get('[data-testid="menu-button"]').click();
    cy.get('[data-testid="menu-backup"]').click();
    cy.get('[data-testid="backup-modal"]').should("be.visible");
    cy.get('[data-testid="backup-close"]').click();
    cy.get('[data-testid="backup-modal"]').should("not.exist");
  });

  it("toggles the theme and persists it across a reload", () => {
    cy.gotoApp({ items: [] });
    cy.get("html").should("not.have.attr", "data-theme", "winter");

    cy.get('[data-testid="menu-button"]').click();
    cy.get('[data-testid="menu-theme"]').click();
    cy.get("html").should("have.attr", "data-theme", "winter");

    cy.reload();
    cy.get('[data-testid="nav-closet"]').should("exist");
    cy.get("html").should("have.attr", "data-theme", "winter");
  });

  it("shows the splash for a fresh browser visitor and dismisses it", () => {
    // skipGating leaves splash_dismissed unset -> the splash screen renders.
    cy.gotoApp({ skipGating: true });
    cy.get('[data-testid="splash-continue"]').should("be.visible");
    cy.get('[data-testid="splash-install"]').should("exist");

    cy.get('[data-testid="splash-continue"]').click();
    cy.get('[data-testid="nav-closet"]', { timeout: 20000 }).should("exist");

    // The dismissal is remembered — no splash after a reload.
    cy.reload();
    cy.get('[data-testid="nav-closet"]', { timeout: 20000 }).should("exist");
    cy.get('[data-testid="splash-continue"]').should("not.exist");
  });
});
