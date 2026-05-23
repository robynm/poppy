# The Wardrobe — Installable Web App

This is a Progressive Web App (PWA). Once it's online, you can install it to your Android home screen and use it like a native app — even offline.

## Files in this folder

- `index.html` — entry point
- `app.js` — the React app (JSX, compiled in-browser by Babel)
- `seed.js` — your 5 starter items (closet data + base64 images)
- `manifest.json` — tells Android this is an installable app
- `sw.js` — service worker; caches files so the app works offline
- `icons/` — app icons in various sizes

## How to install it on your Android phone

The app has to be served over HTTPS. Pick one of these:

### Option 1: Netlify Drop (easiest, free, no account needed)

1. Open <https://app.netlify.com/drop> on your computer
2. Drag this entire folder onto the page
3. You'll get a URL like `https://something-random.netlify.app`
4. Open that URL in Chrome on your Android phone
5. Chrome will show a banner: "Install app" → tap it. If you don't see one, tap the ⋮ menu → "Add to Home screen"
6. The Wardrobe icon now lives on your home screen. Tap it — it opens full-screen with no browser bars

### Option 2: GitHub Pages (free, permanent)

1. Create a new GitHub repo
2. Upload all files in this folder
3. Settings → Pages → enable Pages from the `main` branch
4. Wait ~1 minute; you'll get `https://yourname.github.io/repo-name/`
5. Visit it on your Android phone and install as above

### Option 3: Vercel (free, instant)

1. Sign up at <https://vercel.com>
2. Drag this folder onto the deploy page, or use the CLI
3. Visit the URL Vercel gives you, install on phone

### Option 4: Run locally on your computer to test first

```bash
cd this-folder
python3 -m http.server 8000
```

Then visit `http://localhost:8000` in a desktop browser. The install prompt won't work over plain HTTP except on `localhost`, but you can verify everything renders.

## What works offline

After the first visit, the service worker caches everything. You can use the app on a plane, with no signal, anywhere — your closet, outfits, and edits all save to the phone's local storage.

## Storage

The app stores two kinds of data on your phone:

- **Item metadata** (names, tags, categories, outfits, collections) lives in **localStorage**. Small and fast.
- **Photos** live in **IndexedDB** as compressed WebP blobs. IndexedDB gets a much bigger quota than localStorage — typically a percentage of free disk space, often hundreds of MB to several GB. For practical purposes, you can fit hundreds of items.

The Backup & Restore screen shows the real device-reported usage so you can see how much room you have.

Photos are auto-resized to 640px on the longest edge and encoded as WebP at 85% quality — usually 15–40 KB per piece. If your browser is old enough to lack WebP encoding, JPEG is used as a fallback.

### Upgrading from an older version

If you've been running an earlier build that stored photos in localStorage, the first launch after upgrading will silently migrate them into IndexedDB and free up the localStorage space. Nothing for you to do.

## Your data

Everything stays on your phone. Nothing is sent to any server. If you uninstall the app or clear your browser data, your closet is gone — so use the in-app **Backup** button to export a JSON file you can keep somewhere safe.
