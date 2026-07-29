// Loaded before every spec. Registers custom commands and quiets noise that
// would otherwise fail tests for reasons unrelated to the app's behavior.
import "./commands.js";

// The app has no runtime error boundary; a couple of headless-only quirks
// (missing Web Share, font requests) must not fail otherwise-passing specs.
Cypress.on("uncaught:exception", (err) => {
  // Only swallow the known-benign headless issues; re-throw anything real.
  if (/navigator\.share|storage\.persist/i.test(err.message)) return false;
  return undefined;
});
