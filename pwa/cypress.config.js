import { defineConfig } from "cypress";
import { readdirSync } from "node:fs";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: "cypress/support/e2e.js",
    fixturesFolder: "cypress/fixtures",
    downloadsFolder: "cypress/downloads",
    // App is mobile-first; test at a phone viewport (matches the real usage).
    viewportWidth: 390,
    viewportHeight: 844,
    video: false,
    // No app server retries needed; keep runs deterministic.
    retries: { runMode: 1, openMode: 0 },
    setupNodeEvents(on) {
      on("task", {
        // List files in the downloads folder (for verifying an export landed).
        listDownloads(dir) {
          try {
            return readdirSync(dir);
          } catch {
            return [];
          }
        },
      });
    },
  },
});
