# My Wardrobe

A private wardrobe catalogue and outfit builder, packaged as an installable Progressive Web App. Built to run on Android (and iOS, and any modern browser), with all data stored locally on the device.

```
wardrobe-project/
├── build.py        ← build script (run this to package)
├── README.md       ← you are here
├── pwa/            ← the app source
│   ├── index.html
│   ├── app.js      ← the React app — this is what changes most often
│   ├── seed.js     ← starter items (5 pieces of clothing as base64)
│   ├── manifest.json
│   ├── sw.js       ← service worker (offline support)
│   └── icons/      ← app icons in all required sizes
└── dist/           ← created by the build script; holds the zipped output
```

## Day-to-day workflow

When Claude sends you an updated `app.js` (or any other file), the loop is:

1. Replace the file in `pwa/` with the new version
2. Run `python3 build.py`
3. Drag the zip from `dist/` onto Netlify Drop (or your existing site)
4. On your phone, the next time you open the app it'll pick up the new version

That's it. No npm, no Node, no build tools — just Python 3.8+.

## The build script

```sh
python3 build.py
```

By default, the script:

- Validates that every required file exists and that the manifest parses
- Confirms every file referenced by the service worker is actually present
- Bumps the service worker cache version (so phones know to fetch new code)
- Writes a fresh `dist/wardrobe-pwa-v<N>.zip`

### Flags

| Flag | What it does |
|---|---|
| `python3 build.py` | Bump the cache version and zip (the default) |
| `python3 build.py --no-bump` | Re-package without bumping — useful if nothing changed |
| `python3 build.py --set 12` | Pin the cache version to a specific number |
| `python3 build.py --clean` | Wipe `dist/` before building, so old zips don't accumulate |
| `python3 build.py --validate-only` | Run the checks, but don't produce a zip |

### What the cache version is

The service worker has a line like `const CACHE_NAME = 'wardrobe-v7';`. Every time that number changes, phones running the app treat it as a new release and re-download the files instead of serving stale cached copies. The build script handles bumping that number for you — you should rarely need to touch it manually.

## Deploying

Deploying via Github Pages:

```sh
  python3 build.py          # bumps sw.js cache version
  git commit -am "v6"
  git tag v6
  git push && git push --tags
```

### Local testing (no HTTPS)

To preview changes on your computer before deploying:

```sh
cd pwa
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. Chrome treats `localhost` as secure, so the install prompt appears and service workers register correctly. This is the fastest way to verify a change before re-deploying.

You can also open `pwa/index.html` directly in a browser, but service workers won't register and the install prompt won't appear.

## Updating an installed app

When you push a new build, your phone has a stale service worker cached. To pick up the new version:

- **Easiest:** Uninstall the app from your home screen, then re-install from the URL. Your data stays put — it's stored in IndexedDB and localStorage, which survive a PWA uninstall.
- **Alternative:** Settings → Apps → My Wardrobe → Storage → Clear cache. Next launch fetches fresh files.

If you ever clear browser data for the Netlify URL (in Chrome's site settings), the app's data goes too. Use the in-app **Backup** button regularly to export a JSON file you can re-import later.

## What lives where

- **Item metadata** (items, outfits, collections, custom tags) lives in **localStorage** on your phone, scoped to the Netlify URL. Small and fast — well under the ~5 MB localStorage limit.
- **Photos** live in **IndexedDB**, also scoped to the URL. IndexedDB's quota is much larger than localStorage's — typically a percentage of free disk space (often hundreds of MB to several GB), so a few hundred items fit comfortably.
- **No server is involved.** Nothing leaves your phone. The Netlify host serves the static files; it doesn't see your data.
- **Backups** are JSON files you download to your phone's Downloads folder. They contain everything — items, photos (re-encoded as base64 inside the JSON for portability), outfits, collections, tags.

## Known constraints

- **Storage:** the app reports real device-reported usage on the Backup screen. The 5 MB cap you may remember from earlier versions no longer applies — photos now live in IndexedDB. The hard limit is your phone's free disk space.
- **No automatic background removal** for new items you upload. Either remove backgrounds before uploading, or live with the white background. Claude can process photos for you if you send them in chat.
- **iOS:** the app works, but Safari's PWA install flow is fussier than Chrome's. Use the Share sheet → "Add to Home Screen."
