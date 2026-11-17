# Android app and Google Play

The repository contains a ready Android project (`android/`, made with
[Capacitor](https://capacitorjs.com)). The game files are packed inside the
app, so it plays fully offline and nothing has to be hosted.

What the app does on top of the web version:

- Runs in portrait and landscape (follows the phone's auto-rotate setting).
- Fullscreen with the system bars hidden; swipe from the edge to show them.
- Keeps the screen on while the app is open, vibration on crashes.
- The Android back button pauses the game, closes the open menu, or leaves the
  app from the main menu. Switching away from the app pauses the game.
- Launcher icon (adaptive, round and legacy shapes) and a dark splash screen.

## Download the APK

Every push to `main` builds the app in GitHub Actions
(`.github/workflows/android.yml`). Pushing a tag like `v1.0.1` also publishes a
**GitHub Release** with `AutobahnRush.apk` attached:

1. Open the repository's **Releases** page and download `AutobahnRush.apk` on the phone.
2. Allow your browser or file manager to install unknown apps when Android asks.
3. Open the APK and install.

Builds from untagged pushes are under **Actions → Android build → Artifacts**.

Without signing secrets (below) the APK is debug-signed with a key that changes
with every build, so to update you may have to uninstall the old version first.

## Build it yourself

You need Node.js 22, JDK 21 and the Android SDK (Android Studio installs it).

```bash
npm ci
```

```bash
npm run sync
```

```bash
cd android && ./gradlew assembleDebug
```

The APK lands in `android/app/build/outputs/apk/debug/`. `npm run sync` copies
the game into `www/` and from there into the Android project; run it again
after changing the game. `npx cap open android` opens the project in Android
Studio.

## Publishing on Google Play

1. **Create an upload key** once and keep it safe; every update must be signed
   with it:

```bash
keytool -genkeypair -v -keystore upload.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

2. **Add it to GitHub** as repository secrets (Settings → Secrets and variables →
   Actions). Never commit the keystore.

   | Secret | Value |
   | --- | --- |
   | `ANDROID_KEYSTORE_BASE64` | output of `base64 -w0 upload.keystore` |
   | `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
   | `ANDROID_KEY_ALIAS` | `upload` |
   | `ANDROID_KEY_PASSWORD` | the key password |

   With these set, the workflow builds a signed release APK and an
   `AutobahnRush.aab` app bundle (the format Google Play wants).
3. **Tag a release** (push a `v*` tag, or publish a release on GitHub with a
   new `v*` tag): the version name comes from the tag, the version code rises
   with every build.

```bash
git tag v1.0.1
```

```bash
git push origin v1.0.1
```

4. **Play Console** (one-time USD 25 developer account): create the app, turn on
   Play App Signing, and upload the `.aab` from the release to internal testing
   first, then production.
5. **Store listing**: graphics are in `docs/play/` (512 × 512 icon and a
   1024 × 500 feature graphic). Add phone screenshots from the game. The privacy
   policy is [`PRIVACY.md`](../PRIVACY.md): the game collects nothing and needs
   no account. Content rating: the IARC questionnaire (no violence against
   people, no gambling, no user content); category Racing.
6. Target API level is 36, which meets Google Play's current requirement.

## Changing the icon

`scripts/make_icons.py` draws the launcher icons, splash screens, PWA icons and
Play graphics (Python with Pillow):

```bash
python3 scripts/make_icons.py
```
