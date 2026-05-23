# My Wardrobe

A private wardrobe catalogue and outfit builder, packaged as an installable Progressive Web App. Built to run on Android (and iOS, and any modern browser), with all data stored locally on the device.

```
poppy/
├── build.py        ← validates source and zips a release package
├── release.sh      ← one-command deploy: bumps version, commits, tags, pushes
├── README.md       ← you are here
├── pwa/            ← the app source
│   ├── index.html
│   ├── app.js      ← the React app — this is what changes most often
│   ├── seed.js     ← starter items (5 pieces of clothing as base64)
│   ├── manifest.json
│   ├── sw.js       ← service worker (offline support)
│   └── icons/      ← app icons in all required sizes
├── dist/           ← created by the build script; holds the zipped release package
└── .github/
    └── workflows/
        ├── deploy.yml   ← deploys pwa/ to GitHub Pages on every push to main
        └── release.yml  ← creates a GitHub Release with the zip on every v* tag
```

## Deploying

```sh
./release.sh
```

That's it. The script determines the next version number automatically from the latest git tag, then:

1. Runs `build.py` to bump the service worker cache version and validate sources
2. Commits all changes as `vN`
3. Creates a `vN` tag
4. Pushes the commit and the tag

Pushing to `main` triggers the **deploy** workflow, which publishes the `pwa/` folder to GitHub Pages. Pushing the tag triggers the **release** workflow, which creates a GitHub Release at `github.com/robynm/poppy/releases` with the zip attached.

The live app is at: **https://robynm.github.io/poppy/**

## GitHub Actions setup (one-time)

In the repository settings on GitHub: **Settings → Pages → Source → GitHub Actions**. Nothing else to configure.

## The build script

`build.py` is called automatically by `release.sh`, but you can also run it directly:

```sh
python3 build.py
```

By default it:

- Validates that every required file exists and that the manifest parses
- Confirms every file referenced by the service worker is actually present
- Bumps the service worker cache version (so phones know to fetch new code)
- Writes a fresh `dist/wardrobe-pwa-v<N>.zip`

### Flags

| Flag | What it does |
|---|---|
| `python3 build.py` | Bump the cache version and zip (the default) |
| `python3 build.py --no-bump` | Re-package without bumping |
| `python3 build.py --set 12` | Pin the cache version to a specific number |
| `python3 build.py --clean` | Wipe `dist/` before building |
| `python3 build.py --validate-only` | Run the checks, but don't produce a zip |

### What the cache version is

The service worker has a line like `const CACHE_NAME = 'wardrobe-v12';`. Every time that number changes, phones running the app treat it as a new release and re-download the files instead of serving stale cached copies. `build.py` handles bumping that number automatically.

## Local testing

```sh
cd pwa
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. Chrome treats `localhost` as secure, so the install prompt appears and service workers register correctly.

## Updating an installed app

When a new version is deployed, the phone's service worker detects the changed cache version on next launch and fetches fresh files. If it doesn't pick up automatically:

- **Easiest:** Uninstall the app from your home screen, then re-install from the URL. Data survives — it's in IndexedDB and localStorage, which are not cleared by a PWA uninstall.
- **Alternative:** Settings → Apps → My Wardrobe → Storage → Clear cache.

## What lives where

- **Item metadata** (items, outfits, collections, custom tags) — **localStorage**, scoped to the GitHub Pages URL.
- **Photos** — **IndexedDB**, also scoped to the URL. Quota is much larger than localStorage (typically a percentage of free disk space).
- **No server involved.** Nothing leaves the device. GitHub Pages serves the static files only.
- **Backups** are JSON files downloaded to the device. They contain everything — items, photos (as base64), outfits, collections, tags — and can be re-imported from the Backup screen.

## Known constraints

- **iOS:** the app works, but Safari's PWA install flow is fussier than Chrome's. Use Share → "Add to Home Screen."
- **Background removal:** not automatic. Either remove backgrounds before uploading, or send photos to Claude for processing.
- **Storage cap:** the app reports real device-reported usage on the Backup screen. The effective limit is the device's free disk space.
