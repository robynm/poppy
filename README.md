# Poppy

A private wardrobe catalogue and outfit builder, packaged as an installable Progressive Web App. Built to run on Android (and iOS, and any modern browser), with all data stored locally on the device.

```
poppy/
├── release.sh      ← one-command deploy: builds, commits, tags, pushes
├── package.json    ← root command proxy (dev / build / test:e2e / release, all from here)
├── README.md       ← you are here
├── pwa/            ← the app (a Vite + React project)
│   ├── index.html          ← Vite entry
│   ├── package.json        ← deps + scripts (dev / build / preview / test:e2e)
│   ├── vite.config.js      ← base path, PWA plugin, build config
│   ├── cypress.config.js   ← Cypress e2e config
│   ├── tailwind.config.js  ← theme + dynamic-class safelist
│   ├── postcss.config.js
│   ├── src/
│   │   ├── main.jsx        ← mount
│   │   ├── App.jsx         ← ClosetApp (root component)
│   │   ├── styles.css      ← Tailwind + CSS-variable theme
│   │   ├── seed.js         ← starter items (empty by default)
│   │   ├── components/     ← one file per React component
│   │   └── lib/            ← icons, storage/IDB, backup, share, hooks, …
│   ├── cypress/            ← end-to-end tests
│   │   ├── e2e/            ← one spec per feature area
│   │   ├── support/        ← custom commands (gotoApp, uploadPhoto, …)
│   │   └── fixtures/       ← sample image + backup JSON
│   ├── public/icons/       ← app icons in all required sizes
│   └── dist/               ← build output (git-ignored)
└── .github/
    └── workflows/
        ├── deploy.yml   ← runs the e2e suite, then deploys dist/ to GitHub Pages on push to main
        ├── e2e.yml      ← runs the e2e suite on every pull request
        └── release.yml  ← builds and attaches a zip to a GitHub Release on every v* tag
```

## Deploying

From the repo root:

```sh
npm run release
```

(`./release.sh` still works and can be run from anywhere.)

That's it. The script determines the next version number automatically from the latest git tag, then:

1. Runs `npm run build` in `pwa/` to validate the app builds
2. Commits all changes as `vN`
3. Creates a `vN` tag
4. Pushes the commit and the tag

Pushing to `main` triggers the **deploy** workflow, which first runs the end-to-end test suite and only publishes `pwa/dist/` to GitHub Pages if it passes — a failing suite (or a broken build) blocks the deploy. Pushing the tag triggers the **release** workflow, which builds and attaches a zip to a GitHub Release at `github.com/robynm/poppy/releases`.

The live app is at: **https://poppy.robynm.net** (the old `robynm.github.io/poppy/` URL redirects there).

## GitHub Actions setup (one-time)

In the repository settings on GitHub: **Settings → Pages → Source → GitHub Actions**. The custom domain (`poppy.robynm.net`) is set under **Settings → Pages → Custom domain**; a matching `CNAME` file lives in `pwa/public/` so it's re-published on every deploy. The deploy workflow installs Node, runs the end-to-end suite, and builds the app for you — no other configuration needed.

## Local development

All commands run from the **repo root** — a thin root `package.json` proxies them into `pwa/`, so you never have to switch directories:

```sh
npm run setup     # first time only (installs the app's deps in pwa/)
npm run dev       # dev server with instant reload
```

Then open the printed URL (<http://localhost:5173/>). Other scripts:

| Command | What it does |
|---|---|
| `npm run setup` | Install the app's dependencies (in `pwa/`) |
| `npm run dev` | Dev server with hot-module reload |
| `npm run build` | Production build into `pwa/dist/` |
| `npm run preview` | Serve the built `dist/` locally (verifies the production bundle + service worker) |
| `npm run test:e2e` | Run the full Cypress suite headless (boots + tears down its own dev server) |
| `npm run cypress:open` | Open the interactive Cypress runner (needs `npm run dev` running separately) |
| `npm run release` | Build, commit, tag, and push a new version |

(The same `dev` / `build` / `preview` / `test:e2e` scripts also exist inside `pwa/` if you prefer to work from there.)

Tailwind is a real build step now, so color classes are extracted from the source. Classes built dynamically (e.g. `` bg-${tone}-50 ``) are covered by a `safelist` pattern in `tailwind.config.js` — extend it if you add new color families or shades.

## Testing

End-to-end tests use [Cypress](https://www.cypress.io/) and live in `pwa/cypress/`. They drive the real app in a browser against the dev server, covering the major flows: adding/editing/deleting items, filters, bulk actions, building looks, collections, backup/restore, theme switching, and the splash screen.

```sh
cd pwa
npm run test:e2e          # headless — the command CI runs
npm run cypress:open      # interactive (run `npm run dev` in another terminal first)
```

To run a single spec:

```sh
npm run cypress:run -- --spec cypress/e2e/backup.cy.js
```

Tests run against `npm run dev` (port 5173), where no service worker is registered, so there's no stale-cache interference. State is seeded deterministically before each test via the `cy.gotoApp()` custom command (`cypress/support/commands.js`), which writes localStorage and skips the splash/seed/migration gates so the app boots straight into a known state.

The suite runs automatically on every pull request (`e2e.yml`) and as a required gate before any deploy to GitHub Pages (`deploy.yml`).

## Updating an installed app

The service worker is generated by `vite-plugin-pwa` (Workbox) with `registerType: 'autoUpdate'`. When a new version is deployed, the installed app downloads it in the background and activates it on the **next launch** — no cache version to bump by hand. If it seems stuck on an old version, fully close and reopen the app (or Settings → Apps → Poppy → Storage → Clear cache). Data survives — it's in IndexedDB and localStorage, which a PWA uninstall does not clear.

## What lives where

- **Item metadata** (items, outfits, collections, custom tags) — **localStorage**, scoped to the app's origin (`poppy.robynm.net`).
- **Photos** — **IndexedDB**, also scoped to the origin. Quota is much larger than localStorage (typically a percentage of free disk space).
- **No server involved.** Nothing leaves the device. GitHub Pages serves the static files only.
- **Backups** are JSON files downloaded to the device. They contain everything — items, photos (as base64), outfits, collections, tags — and can be re-imported from the Backup screen.

## Known constraints

- **iOS:** the app works, but Safari's PWA install flow is fussier than Chrome's. Use Share → "Add to Home Screen."
- **Background removal:** not automatic. Either remove backgrounds before uploading, or send photos to Claude for processing.
- **Storage cap:** the app reports real device-reported usage on the Backup screen. The effective limit is the device's free disk space.
