# Poppy → Native Phone App: Plan

## What Poppy is today (the starting point)

- **Stack:** React 18 + Babel-standalone (in-browser JSX), Tailwind via Play CDN, single `pwa/app.js` (~3.4k lines), no build step.
- **Data:** Item metadata in `localStorage`, photos in `IndexedDB`. Nothing on a server.
- **Deploy:** GitHub Pages serves `pwa/` as a static site. Service worker (`sw.js`) caches everything for offline use, and the install flow already turns it into a home-screen app on both platforms.
- **Distribution today:** Users navigate to `robynm.github.io/poppy/` and add to home screen.

Because the app is already a PWA with offline + installable behavior, "native" is less of a rewrite and more of a wrapping/distribution decision. The real questions are: do you want App Store / Play Store presence, native capabilities the browser can't expose (background removal, share targets, widgets, push), and a non-Safari install experience on iOS?

---

## The four realistic paths

### Path A — Trusted Web Activity (Android only, fastest)
Wrap the existing GitHub Pages URL in an Android shell using **Bubblewrap** (Google's CLI) or **PWABuilder**. The shell is a thin native app whose only job is to launch Chrome in fullscreen pointed at your PWA. Verified via Digital Asset Links so the URL bar disappears.

- Effort: half a day.
- Distribution: Play Store.
- iOS: not supported (Apple doesn't allow TWAs).
- Code changes: none.
- Downside: Android-only, and you're still entirely dependent on the live website being reachable on first launch.

### Path B — Capacitor wrapper (iOS + Android, recommended)
**Capacitor** (by the Ionic team) packages the existing `pwa/` folder into a native iOS and Android app. The web assets ship inside the app bundle (so first launch is fully offline), and Capacitor exposes native APIs via JS bridges: camera, share sheet, file system, haptics, push, etc.

- Effort: 3–7 days for v1 (most of it is store onboarding + Xcode signing dance, not code).
- Distribution: App Store + Play Store.
- Code changes: minimal. `localStorage` and `IndexedDB` work as-is inside the WebView. You'd add a small `build.py` step to copy `pwa/` into `apps/mobile/www/` and bump versions.
- Upside: lets you progressively add native features (e.g. real background-removal via on-device ML, share-to-Poppy from Photos, widgets) without rewriting.
- Downside: still a WebView under the hood. Scroll feel and keyboard handling are 95%, not 100%, of native.

### Path C — React Native (Expo)
Rewrite the UI in React Native. Reuses your React mental model and component structure but every primitive (`div` → `View`, Tailwind classes → `StyleSheet` or NativeWind, IndexedDB → SQLite/MMKV) is different.

- Effort: 4–8 weeks for parity.
- Distribution: App Store + Play Store via Expo's EAS Build.
- Upside: actually native widgets, best perf, full access to platform APIs, no WebView quirks.
- Downside: it's a rewrite. Your single 3.4k-line `app.js` becomes a multi-file project with a real build, and you maintain two codebases (or kill the PWA).

### Path D — Keep the PWA, just polish the install flow
Add an in-app prompt that walks iOS users through "Share → Add to Home Screen," ship an Android-only TWA on Play Store as a freebie, and call it done. Zero rewrite, broadest reach, no store fees on iOS, but no App Store badge.

---

## Recommendation

**Path B (Capacitor)**, optionally combined with Path A as a Day-1 Android Play Store listing while the iOS app is in review.

Reasoning: Poppy is already a well-behaved offline PWA. Capacitor preserves that entire investment — the `app.js`, the `localStorage`/`IndexedDB` data, the Tailwind theming, the service worker pattern — and gives you a real `.ipa` and `.aab` to ship. React Native would throw all of that away for benefits (true-native feel, animation fidelity) that aren't critical for a personal wardrobe app.

---

## Detailed plan for Path B (Capacitor)

### Phase 0 — Decisions (do this before touching code)

1. **Bundle identifier:** e.g. `com.robynm.poppy`. Once chosen and published, you can't change it.
2. **Apple Developer Program enrollment:** $99/yr, ~24-hour wait for approval. Start this first; everything downstream is blocked on it.
3. **Google Play Developer account:** $25 one-time. Identity verification takes a few days now.
4. **Privacy stance:** Poppy stores nothing remotely. You'll still need a public privacy policy URL for both stores. One short page on `robynm.github.io/poppy/privacy` is fine.
5. **App name conflicts:** check "Poppy" availability on App Store and Play Store — it's a common word; you may need a qualifier like "Poppy Wardrobe."

### Phase 1 — Add a build step (1 day)

The current "Babel-in-the-browser + Tailwind CDN" setup works for the website but ships ~3MB of compiler that runs on every launch. For a native bundle that should be pre-compiled.

1. Introduce `package.json` and add **Vite** as a dev dependency.
2. Move `app.js` to `src/app.jsx`; let Vite handle JSX → JS at build time.
3. Replace Tailwind Play CDN with **Tailwind CLI**: install `tailwindcss`, generate a `tailwind.config.js` that mirrors your inline tokens, output a single `dist.css`.
4. Keep `index.html` mostly as-is; remove the Babel + Tailwind CDN `<script>` tags and replace with the Vite-generated bundle reference.
5. Make sure `python3 build.py` still works for the web release path (it can now invoke `vite build` first).
6. Sanity-check: the live PWA on GitHub Pages should look and behave identically. **Do this before touching Capacitor.** If anything regressed, fix it here.

### Phase 2 — Capacitor scaffold (1 day)

1. `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`
2. `npx cap init Poppy com.robynm.poppy --web-dir=pwa-dist` (where `pwa-dist` is Vite's build output).
3. `npx cap add ios` and `npx cap add android` — generates `ios/` and `android/` folders with Xcode and Android Studio projects.
4. Build script becomes: `vite build && npx cap sync`. The `cap sync` step copies your built web assets into both native projects.
5. Open `ios/App/App.xcworkspace` in Xcode, run on the simulator. Open `android/` in Android Studio, run on an emulator. Confirm Poppy boots, data persists, photos load.

### Phase 3 — Native-feeling polish (2–4 days)

The bare wrapper works but feels "webby." Spend this phase on the seams users notice:

- **Splash screen** — `@capacitor/splash-screen` plugin, drop in your Poppy mark, set background to `#FFFBF6` so it matches the loading state already in `index.html`.
- **Status bar** — `@capacitor/status-bar` plugin so the system bar respects your `theme_color` and your dark/light theme toggle.
- **Safe areas** — your CSS already uses `env(safe-area-inset-*)`; verify on a notched iPhone simulator.
- **Keyboard** — `@capacitor/keyboard`; prevents the input field from being hidden when you type tag names.
- **Haptics** — `@capacitor/haptics`; light tap on item save, success thump on outfit complete.
- **Share sheet** — `@capacitor/share`; lets users share outfit screenshots out of Poppy.
- **Camera** — `@capacitor/camera`; replace the current `<input type="file">` flow with a real native picker that returns a base64 string straight into IndexedDB.
- **Back button (Android)** — wire to the in-app navigation stack so it doesn't quit the app from a sub-screen.
- **App icons + adaptive icons** — your `icons/` folder has the assets; both Xcode and Android Studio expect them in specific named slots.

### Phase 4 — Data migration story (½ day, important)

PWA users have data in `localStorage` + `IndexedDB` scoped to `robynm.github.io`. When they install the native app, **that data does not transfer** — the native WebView is a different origin.

Two options, both worth shipping:

1. **Backup/restore already exists in Poppy.** Document a one-time "Export from web, Import into app" flow in your store listing and in the app's onboarding.
2. **Optional: deep-link import.** Have the web app generate a single URL containing a one-shot token; the native app's URL scheme (`poppy://import?token=…`) receives it and pulls the backup from a temporary location (could be the device's Files app — no server needed).

### Phase 5 — Store submission (3–7 elapsed days, mostly waiting)

**App Store (iOS):**
- Screenshots at 6.7" and 6.1" sizes, plus optional iPad.
- App description, keywords, support URL, privacy policy URL, age rating questionnaire.
- "App Privacy" labels: declare "Data Not Collected" — this is true for Poppy.
- First review typically 24–48 hours; rejections common on first submission for minor metadata issues. Budget two rounds.

**Play Store (Android):**
- Same screenshots.
- Data safety form: also "no data collected."
- Closed testing track first (internal link to 1–20 testers), then promotion to production.
- Review faster than Apple's, usually under a day.

### Phase 6 — Release pipeline (½ day)

Replace `release.sh` with a script that:
1. Bumps version in `package.json`, `Info.plist` (iOS), and `build.gradle` (Android).
2. Runs `vite build && npx cap sync`.
3. Builds the web zip (existing flow) **and** triggers `npx cap build ios` / `cap build android`.
4. For unattended store uploads later, look at **EAS Submit** (Expo's service works for Capacitor projects too) or **Fastlane**. Not needed for v1; manual upload through Xcode and Play Console is fine.

---

## Effort + cost summary

| Phase | Time | Cost |
|---|---|---|
| 0 — Decisions, accounts | 1 day elapsed | $99 (Apple) + $25 (Google) |
| 1 — Add build step | 1 day |  |
| 2 — Capacitor scaffold | 1 day |  |
| 3 — Native polish | 2–4 days |  |
| 4 — Data migration | ½ day |  |
| 5 — Store submission | 3–7 days elapsed (mostly waiting) |  |
| 6 — Release pipeline | ½ day |  |
| **Total** | **~2 weeks elapsed, ~6 focused days** | **$124 one-time + $99/yr Apple** |

---

## Risks and open questions

- **WebView feel on iOS.** Scroll bounce, sheet presentations, and keyboard accessory bars in `WKWebView` aren't identical to native. If Poppy is for personal use, this is invisible. If you plan to charge for it, evaluate Path C.
- **Background removal.** You flagged this as a known constraint. Capacitor lets you call **Vision** (iOS) and **ML Kit** (Android) for on-device subject segmentation — this would actually be easier as a native app than as a PWA.
- **Sharing to Poppy from Photos.** Adding Poppy as a share target requires a small Swift/Kotlin extension; not hard, but the only place the project leaves the JavaScript world.
- **Future-you maintaining Xcode.** Xcode major versions break things yearly. Budget an afternoon each summer.
- **App store rejection for "just a website."** Apple has rejected pure WebView wrappers as too thin. Adding any of the native polish in Phase 3 (camera, share, haptics) is usually enough to clear that bar. Don't ship a pure wrapper with zero native integrations.

---

## Open questions for you

1. iOS + Android both, or one to start? (If just Android, Path A is half a day.)
2. Public App Store, or just personal sideload? (Sideload skips Phase 5 entirely.)
3. Is background removal a "nice to have" or a real driver? (If real, this plan is correct; if not, Path D is more honest.)
4. Are you OK introducing a build step, or do you want to preserve the "edit `app.js`, push" workflow? (You can preserve it for the web build and only build for native releases — but it's a fork in the road.)
