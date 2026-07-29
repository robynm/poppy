// Backup / restore: export, import (merge & replace), invalid-file validation,
// copy diagnostics.

const owned = (id, name) => ({
  id,
  name,
  category: "top",
  seasons: [],
  occasions: [],
  custom: [],
  status: "owned",
  brand: "",
  yearPurchased: "",
});

const readItems = () =>
  cy
    .window()
    .then((win) => JSON.parse(win.localStorage.getItem("closet:items:v1")));

const openBackup = () => {
  cy.get('[data-testid="menu-button"]').click();
  cy.get('[data-testid="menu-backup"]').click();
  cy.get('[data-testid="backup-modal"]').should("be.visible");
};

describe("Backup & restore", () => {
  it("exports a backup JSON file", () => {
    cy.gotoApp({ items: [owned("i1", "Existing Tee")] });
    openBackup();
    cy.get('[data-testid="backup-export"]').click();
    // The success banner confirms the export path completed…
    cy.get('[data-testid="backup-modal"]').contains(/backup saved/i);
    // …and a poppy-backup-<date>.json file actually landed in downloads.
    cy.task("listDownloads", "cypress/downloads").then((files) => {
      expect(files.some((f) => /^poppy-backup-.*\.json$/.test(f))).to.eq(true);
    });
  });

  it("merges an imported backup into the current closet", () => {
    cy.gotoApp({ items: [owned("i_existing", "Existing Tee")] });
    openBackup();
    cy.get('[data-testid="backup-file"]').selectFile(
      "cypress/fixtures/backup-valid.json",
      { force: true },
    );
    cy.get('[data-testid="backup-merge"]').click();

    // Merge keeps the existing item and adds the two imported ones.
    readItems().then((all) => {
      const names = all.map((i) => i.name);
      expect(names).to.include("Existing Tee");
      expect(names).to.include("Imported Linen Shirt");
      expect(names).to.include("Imported Denim");
    });
  });

  it("replaces the closet from an imported backup (with confirm)", () => {
    cy.confirmDialogs(true);
    cy.gotoApp({ items: [owned("i_existing", "Existing Tee")] });
    openBackup();
    cy.get('[data-testid="backup-file"]').selectFile(
      "cypress/fixtures/backup-valid.json",
      { force: true },
    );
    cy.get('[data-testid="backup-replace"]').click();

    // Replace discards the existing item entirely.
    readItems().then((all) => {
      const names = all.map((i) => i.name);
      expect(names).to.not.include("Existing Tee");
      expect(names).to.include("Imported Linen Shirt");
      expect(all).to.have.length(2);
    });
  });

  it("rejects an invalid backup file and leaves data untouched", () => {
    cy.gotoApp({ items: [owned("i_existing", "Existing Tee")] });
    openBackup();
    cy.get('[data-testid="backup-file"]').selectFile(
      "cypress/fixtures/backup-invalid.json",
      { force: true },
    );
    // The unknown-format error surfaces; no merge/replace controls appear.
    cy.get('[data-testid="backup-modal"]').contains(/unknown backup format/i);
    cy.get('[data-testid="backup-merge"]').should("not.exist");
    readItems().then((all) => {
      expect(all).to.have.length(1);
      expect(all[0].name).to.eq("Existing Tee");
    });
  });

  it("copies diagnostics to the clipboard", () => {
    cy.gotoApp({ items: [] });
    cy.window().then((win) => {
      // jsdom/headless clipboard may be missing or restricted; stub it.
      if (!win.navigator.clipboard) win.navigator.clipboard = {};
      cy.stub(win.navigator.clipboard, "writeText").resolves().as("copy");
    });
    openBackup();
    cy.get('[data-testid="backup-copy-diag"]').click();
    cy.get("@copy").should("have.been.called");
  });
});
