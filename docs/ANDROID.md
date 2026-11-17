# Publishing Autobahn Rush on Google Play

The game is a web app (plain HTML/JS, no build step) that is already set up to
behave like a phone app: landscape only, fullscreen, touch controls, tilt
steering, vibration, and offline play through a service worker
(`manifest.webmanifest`, `sw.js`, `icons/`). Google Play needs it wrapped in an
Android app bundle (`.aab`). There are two good ways to do that.

## Option A: Capacitor (recommended, works fully offline)

The game files are packed inside the app, so nothing needs to be hosted.

1. Install Node.js and Android Studio (with an Android SDK).
2. In the repository folder:

```bash
npm init -y
```

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

```bash
npx cap init "Autobahn Rush" com.yourname.autobahnrush --web-dir .
```

3. Capacitor copies everything in `--web-dir` into the app. Keep the bundle
   small by setting `webDir` to a folder that holds only the game: copy
   `index.html`, `manifest.webmanifest`, `sw.js`, `css/`, `src/`, `vendor/`
   and `icons/` into a folder called `www/` and use `--web-dir www` instead.
4. Add Android and open it:

```bash
npx cap add android
```

```bash
npx cap open android
```

5. In Android Studio: set the app icon (Image Asset, use `icons/icon-512.png`),
   in `AndroidManifest.xml` set `android:screenOrientation="sensorLandscape"` on
   the activity, then Build > Generate Signed App Bundle. Keep the signing key
   safe: you need the same key for every update.
6. After changing the game, copy the files into `www/` again and run
   `npx cap sync`.

## Option B: Trusted Web Activity (Bubblewrap)

The app opens the hosted website full screen. Updates go live by pushing to
the website, without a new Play release.

1. Host the game on HTTPS, for example GitHub Pages
   (repository Settings > Pages > deploy from `main`).
2. Install Bubblewrap and create the project from the hosted manifest:

```bash
npm install -g @bubblewrap/cli
```

```bash
bubblewrap init --manifest https://YOUR-SITE/manifest.webmanifest
```

```bash
bubblewrap build
```

3. Bubblewrap prints a Digital Asset Links snippet. Publish it at
   `https://YOUR-SITE/.well-known/assetlinks.json`, otherwise the app shows a
   browser address bar.

## Play Console checklist

- Google Play developer account (one-time fee).
- New personal developer accounts must run a closed test with at least 12
  testers for 14 days before going to production.
- Store listing: icon 512x512 (`icons/icon-512.png`), feature graphic
  1024x500, at least two landscape screenshots.
- Content rating questionnaire (driving, crashes, no blood).
- Privacy policy URL: see `PRIVACY.md` (host it somewhere public).
- Data safety form: the game collects no data. Settings, best score and the
  music files you add stay on the device.

## When you change the game

Bump `VERSION` in `sw.js` so phones fetch the new files, and add any new file
to its `FILES` list.
