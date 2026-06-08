# Poppy → Android (Bubblewrap TWA) + iOS (Polished PWA)

Total cost: **$25 one-time** (Google Play registration). No Apple fee, no recurring.
Total effort: **1–2 focused days** plus 1–3 days of Play Store review wait.

The plan is two parallel tracks that share one artifact — the existing PWA at `robynm.github.io/poppy/`. Android gets a Trusted Web Activity wrapper submitted to the Play Store. iOS keeps the "Add to Home Screen" flow but with polish so it's not embarrassing.

---

## Track 1 — Android via Bubblewrap

### Phase 0 — Accounts and prerequisites (1 hour, mostly waiting)

1. **Google Play Developer registration** at `play.google.com/console/signup`. $25 one-time. Requires ID verification — uploaded passport/driver's license, takes 1–3 days to clear. **Start this first**; nothing downstream blocks on the code, but submission does.
2. **Local tools** — install once:
   - **Node 18+** (you have this).
   - **JDK 17** — `brew install --cask temurin@17`.
   - **Android SDK** — easiest path is to install **Android Studio** (free, `brew install --cask android-studio`); Bubblewrap will use its SDK. You won't actually open Android Studio much, but having the SDK installed is the path of least resistance.
   - **Bubblewrap CLI** — `npm install -g @bubblewrap/cli`.
3. Verify with `bubblewrap doctor`. It will tell you exactly what's missing and where it expects things.

### Phase 1 — Asset Links (the one easy-to-miss step, ½ hour)

This is what makes the URL bar disappear in the TWA. Without it, your "native app" shows a Chrome address bar at the top, defeating the entire purpose.

1. Bubblewrap will generate a signing keystore in Phase 2 and print a SHA-256 fingerprint. **You need that fingerprint** to build the asset-links file — so this phase actually happens *after* `bubblewrap init`. Mentioning it first because it's the thing people forget.
2. Once you have the fingerprint, create `pwa/.well-known/assetlinks.json`:

   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.robynm.poppy",
       "sha256_cert_fingerprints": ["<the fingerprint from your keystore>"]
     }
   }]
   ```

3. Commit and push so GitHub Pages serves it. Verify with `curl https://robynm.github.io/poppy/.well-known/assetlinks.json` — must return the JSON, not a 404.
4. Add `./.well-known/assetlinks.json` to `CORE_ASSETS` in `sw.js` so it's cached too (optional but cleaner).
5. Update `build.py` so its "every file exists" check covers the new path.

### Phase 2 — Generate the Android project (1 hour)

```sh
mkdir -p android && cd android
bubblewrap init --manifest=https://robynm.github.io/poppy/manifest.json
```

Bubblewrap reads `manifest.json` and asks ~15 questions. The non-obvious answers:

- **Application ID** → `com.robynm.poppy`. Permanent. Cannot change after first Play Store publish.
- **Display mode** → `standalone` (matches your manifest).
- **Status bar color** → `#FF5A36` (your `theme_color`).
- **Splash screen color** → `#FFFBF6` (your `background_color`).
- **Icon URL** → defaults to `icons/icon-512.png` from your manifest. Fine.
- **Include "shortcuts"?** → No, you don't have any.
- **Signing key** → let Bubblewrap generate one. **It saves the keystore to `android.keystore` in the project folder. Back this up immediately** — losing it means you can never update the app on Play Store, you'd have to publish a brand-new listing.
- **Key passwords** → use something memorable; you'll type them every release.

After init, copy the printed SHA-256 fingerprint and go finish Phase 1.

### Phase 3 — Build and test (1 hour)

```sh
bubblewrap build
```

Produces two files:
- `app-release-signed.apk` — for sideloading to a device for testing.
- `app-release-bundle.aab` — the Android App Bundle you upload to Play Store.

**Test on a real Android phone** (emulators work but won't catch everything):
1. Enable Developer Options → USB Debugging on the phone.
2. `adb install app-release-signed.apk`.
3. Launch Poppy from the app drawer.
4. **Verify the URL bar is hidden.** If you see Chrome's address bar at the top, asset-links isn't working — re-check the fingerprint in `assetlinks.json` matches the one in your keystore (`keytool -list -v -keystore android.keystore`).
5. Verify offline mode works (turn on airplane mode, kill and relaunch).
6. Verify photos save and persist.
7. Verify the back button behaves correctly inside the app (back navigates in-app history; back on the home screen exits).

### Phase 4 — Play Store submission (1 day setup, 1–3 days review wait)

In Play Console:

1. **Create app** → "Poppy" → Free → Apps.
2. **App access** → "All functionality is available without restrictions."
3. **Ads** → No.
4. **Content rating** → fill out questionnaire (all "no" for Poppy → "Everyone" rating).
5. **Target audience** → 13+ probably; "personal interest / lifestyle."
6. **News app?** → No.
7. **Data safety** → "No data collected, no data shared." This is true for Poppy and the easiest possible form.
8. **Government app?** → No.
9. **Privacy policy URL** → required. Easiest: add `pwa/privacy.html` with a one-paragraph "Poppy stores everything on your device, nothing is sent anywhere" page, link to `https://robynm.github.io/poppy/privacy.html`.
10. **Store listing** — name, short description (80 chars), full description (4000 chars), app icon (512×512, you have this), feature graphic (1024×500, need to create), screenshots (2–8 phone screenshots — take with a real device or Android Studio emulator).
11. **Production release** — upload the `.aab` from Phase 3, write release notes, submit for review.

First review typically 1–3 days. Common rejection reasons: missing privacy policy, screenshots that don't show actual app, or asset-links not resolving (Play's automated check will fail the listing).

### Phase 5 — Update workflow forever after

The beautiful part of TWA: **most updates require zero Android work.**

- **Change `app.js`, push to main** → GitHub Pages deploys → every installed TWA loads the new version on next launch. Same as updating the PWA today. No Play Store involvement.
- **Change icon, splash, app name, or any native-level setting** → rebuild with Bubblewrap, upload new `.aab` to Play Console, wait for review. Bump `versionCode` and `versionName` in `twa-manifest.json` before each rebuild.

Realistic cadence: web updates daily, native rebuild maybe once a year.

---

## Track 2 — iOS polish

No build, no store, no fee. The goal is to make the "add to home screen" path discoverable and the installed experience feel intentional.

### Phase A — Install prompt (2 hours)

Add a component to `app.js` that detects iOS Safari and shows a one-time, dismissable banner with screenshots of the share-sheet steps.

```js
// rough sketch — drop into app.js
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isInStandaloneMode = window.navigator.standalone === true;
const shouldPrompt = isIOS && !isInStandaloneMode &&
                     !localStorage.getItem('poppy:install-dismissed');
```

The banner needs:
- One sentence: "Install Poppy: tap **Share**, then **Add to Home Screen**."
- A small illustration of the iOS share icon → the "Add to Home Screen" row. SVG, ~30 lines.
- A "Got it" dismiss button that sets `localStorage.setItem('poppy:install-dismissed', '1')`.
- A "Show me again" toggle in the Backup/Settings screen, so they can re-summon it.

Don't use a library — the existing PWA install libraries are heavier than the 40 lines you'd write.

### Phase B — Storage eviction safety net (1 hour)

iOS Safari evicts PWA storage if the app hasn't been opened in ~7 weeks or if the device is low on space. Your backup/restore flow already exists; surface it gently.

1. On every launch, record `localStorage.setItem('poppy:last-open', Date.now())`.
2. On every launch, also check `localStorage.getItem('poppy:last-backup')`. If it's been more than 30 days, show a non-blocking nudge on the Backup screen: "It's been 35 days since your last backup. iOS occasionally clears app data — back up now?"
3. When the user exports a backup, write the timestamp to `poppy:last-backup`.

This costs you ~30 lines of code and prevents the worst-case "lost everything" complaint.

### Phase C — Polish the installed experience (1 hour)

You've already done most of this — confirm each:

- `apple-mobile-web-app-capable` ✅ in your `index.html`.
- `apple-mobile-web-app-status-bar-style` ✅ already `black-translucent`.
- `apple-mobile-web-app-title` ✅ already "Poppy".
- `apple-touch-icon` ✅ already linked.
- `viewport-fit=cover` ✅ already set.
- Safe-area CSS ✅ already in your `<style>` block.

One missing nicety: iOS doesn't read `manifest.json` for the splash screen — it uses a static `apple-touch-startup-image` set per device size. PWABuilder's online tool can generate these in 30 seconds; drop the resulting `<link>` tags into `index.html`. Without them, iOS shows a white screen on launch instead of your `#FFFBF6` cream.

### Phase D — Document it (½ hour)

Add an "Install on iPhone" section to your README and to a `pwa/install.html` page. When iOS users land on the site, the in-app banner (Phase A) handles 90% of cases, but a doc page covers the 10% who Google "how to install Poppy on iPhone."

---

## Combined effort summary

| Track | Phase | Time |
|---|---|---|
| Android | 0 — Accounts | 1 hour (+1–3d wait for ID verification) |
| Android | 1 — Asset links | ½ hour |
| Android | 2 — Bubblewrap init | 1 hour |
| Android | 3 — Build + test on device | 1 hour |
| Android | 4 — Play Store listing | 1 day (+1–3d wait for review) |
| Android | 5 — Updates | 0 (web only) / 1 hour (rebuild) |
| iOS | A — Install prompt | 2 hours |
| iOS | B — Storage eviction safety net | 1 hour |
| iOS | C — Splash screen images | 1 hour |
| iOS | D — Docs | ½ hour |
| **Total** | | **~1.5 focused days + 2–6 elapsed days waiting** |

---

## What to do this week (concrete order)

1. **Today:** start Google Play developer registration so the ID verification clock is ticking.
2. **Today:** install JDK 17, Android Studio, Bubblewrap CLI. Run `bubblewrap doctor`.
3. **Day 1:** iOS polish phases A, B, C, D. These help your existing users immediately and don't depend on anything else.
4. **Day 2 (after Google approves your account):** Phases 1–3 of Android track. End the day with a working APK installed on your phone.
5. **Day 3:** screenshots, feature graphic, store listing copy, privacy page. Submit to Play Console.
6. **2–4 days later:** Poppy is on the Play Store.

---

## Risks / things to know

- **Lose the keystore = lose the app.** `android.keystore` from Phase 2 is irreplaceable. Back it up to at least two places (1Password, encrypted external drive, etc.). Also back up the passwords.
- **URL is permanent.** TWA is bound to `robynm.github.io/poppy/`. If you ever move to a custom domain, you must rebuild and resubmit the TWA with a new asset-links file at the new URL, and update Play Console. Old installs continue working as long as the old URL responds.
- **iOS PWA install rate is genuinely low.** Most iOS users don't know the share-sheet install exists, and many won't bother even with a banner. If iOS adoption matters more than you currently think, that's the signal to revisit Path B (Capacitor for iOS only).
- **TWAs are second-class on Play Store in one way:** Play Console's "Pre-launch report" automated testing can be flaky for TWAs because it doesn't understand they're really websites. Expect some warnings; they don't block publication.
