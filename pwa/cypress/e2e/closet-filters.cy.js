// Closet filters: each facet, combining, removing, clearing.

const items = [
  {
    id: "i1",
    name: "Blue Top",
    category: "top",
    seasons: ["summer"],
    occasions: ["casual"],
    custom: ["favorite"],
    status: "owned",
    brand: "Nike",
    yearPurchased: "2022",
  },
  {
    id: "i2",
    name: "Black Jeans",
    category: "bottom",
    seasons: ["fall"],
    occasions: ["work"],
    custom: [],
    status: "owned",
    brand: "Levi",
    yearPurchased: "2023",
  },
  {
    id: "i3",
    name: "Red Dress",
    category: "dress",
    seasons: ["summer"],
    occasions: ["evening"],
    custom: [],
    status: "owned",
    brand: "Nike",
    yearPurchased: "2022",
  },
  {
    id: "i4",
    name: "Old Coat",
    category: "outerwear",
    seasons: ["winter"],
    occasions: ["casual"],
    custom: [],
    status: "donated",
    brand: "",
    yearPurchased: "",
  },
];

const seed = {
  items,
  brands: ["Nike", "Levi"],
  customTags: ["favorite"],
};

const chip = (label, value) =>
  cy.get(`[data-filter-label="${label}"]`).contains(value).click();

describe("Closet — filters", () => {
  beforeEach(() => {
    cy.gotoApp(seed);
    // Default status is "owned" -> the donated coat is hidden, 3 pieces show.
    cy.get('[data-testid="item-card"]').should("have.length", 3);
    cy.get('[data-testid="filters-toggle"]').click();
    cy.get('[data-testid="filter-panel"]').should("be.visible");
  });

  it("filters by category", () => {
    chip("Category", "dress");
    cy.get('[data-testid="item-card"]').should("have.length", 1);
    cy.contains("Red Dress").should("be.visible");
  });

  it("filters by season", () => {
    chip("Season", "summer");
    cy.get('[data-testid="item-card"]').should("have.length", 2);
    cy.contains("Blue Top").should("exist");
    cy.contains("Red Dress").should("exist");
  });

  it("filters by occasion", () => {
    chip("Occasion", "work");
    cy.get('[data-testid="item-card"]').should("have.length", 1);
    cy.contains("Black Jeans").should("be.visible");
  });

  it("filters by brand", () => {
    chip("Brand", "Levi");
    cy.get('[data-testid="item-card"]').should("have.length", 1);
    cy.contains("Black Jeans").should("be.visible");
  });

  it("filters by custom tag", () => {
    chip("Custom", "favorite");
    cy.get('[data-testid="item-card"]').should("have.length", 1);
    cy.contains("Blue Top").should("be.visible");
  });

  it("filters by year", () => {
    chip("Year", "2023");
    cy.get('[data-testid="item-card"]').should("have.length", 1);
    cy.contains("Black Jeans").should("be.visible");
  });

  it("reveals donated pieces when the donated status is enabled", () => {
    chip("Status", "donated");
    cy.get('[data-testid="item-card"]').should("have.length", 4);
    cy.contains("Old Coat").should("be.visible");
  });

  it("combines two filters (AND across facets)", () => {
    chip("Category", "top");
    chip("Season", "summer");
    cy.get('[data-testid="item-card"]').should("have.length", 1);
    cy.contains("Blue Top").should("be.visible");
  });

  it("removes a single filter from the active-filters summary", () => {
    chip("Season", "summer");
    // Close the panel to reveal the removable active-filter chips.
    cy.get('[data-testid="filters-toggle"]').click();
    cy.get('[data-testid="active-filters"]').should("be.visible");
    cy.get('[data-testid="item-card"]').should("have.length", 2);

    cy.get('[data-testid="active-filters"]')
      .find('button[aria-label="Remove filter"]')
      .click();
    // Back to the default (owned) view.
    cy.get('[data-testid="item-card"]').should("have.length", 3);
  });

  it("clears all filters at once", () => {
    chip("Category", "dress");
    chip("Season", "summer");
    cy.get('[data-testid="filter-panel"]').contains("Clear all").click();
    cy.get('[data-testid="item-card"]').should("have.length", 3);
  });

  it("toggles reorder (drag) mode", () => {
    // Close filters first, then flip drag mode via its aria-labelled control.
    cy.get('[data-testid="filters-toggle"]').click();
    cy.get('button[aria-label="Reorder items"]').click();
    cy.contains("Drag items to reorder").should("be.visible");
    cy.get('button[aria-label="Exit reorder mode"]').click();
    cy.contains("Drag items to reorder").should("not.exist");
  });
});
