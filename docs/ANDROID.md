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
(`.github/workflows/android.yml`). The first build of each version (the
`version` in `package.json`) publishes a **GitHub Release** `v<version>` with
`AutobahnRush.apk` attached; pushing a `v*` tag does the same:

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
3. **Release**: raise `version` in `package.json` (for example to `1.0.1`) and
   push to `main`; the workflow publishes release `v1.0.1` with the signed APK
   and `.aab`. The version code rises with every build.

4. **Play Console** (one-time USD 25 developer account): create the app, turn on
   Play App Signing, and upload the `.aab` from the release to internal testing
   first, then production.
5. **Store listing**: graphics are in `docs/play/` (512 × 512 icon and a
   1024 × 500 feature graphic). Add phone screenshots from the game. The privacy
   policy is [`PRIVACY.md`](../PRIVACY.md): the game collects nothing and needs
   no account. Content rating: the IARC questionnaire (no violence against
   people, no gambling, no user content); category Racing.
6. Target API level is 36, which meets Google Play's current requirement.

## Ads (Google AdMob)

The app uses [`@capacitor-community/admob`](https://github.com/capacitor-community/admob)
(`src/ads.js`):

- **Interstitial** between runs: after every 3rd game over, when the player
  taps AGAIN / GARAGE / MAIN MENU (`ADS.every` in `src/ads.js`).
- **Rewarded**: the yellow "WEITERFAHREN · 1 Werbung ansehen" button on the
  game-over screen. Watching it repairs the car, shakes off the police and
  continues the same run (once per run).
- **Consent**: Google's UMP consent form is shown on first start where it is
  required (EEA/UK/CH); Settings → "Datenschutz & Werbung" reopens it.
- In the browser a placeholder stands in for both ad types; no ads are loaded.

The repository ships with Google's public **test** ids, which are safe to use
while developing. Before publishing:

1. Create the app in the [AdMob console](https://admob.google.com), plus one
   *Interstitial* and one *Rewarded* ad unit.
2. Put the **app id** (`ca-app-pub-…~…`) in
   `android/app/src/main/AndroidManifest.xml` (`com.google.android.gms.ads.APPLICATION_ID`).
3. Put the two **ad unit ids** (`ca-app-pub-…/…`) in `src/ads.js` and set
   `testing: false`.
4. In AdMob, set up the GDPR message under *Privacy & messaging* (otherwise
   the consent form has nothing to show).
5. In the Play Console, declare **Contains ads**, fill in the *Data safety*
   form for AdMob (advertising ID, approximate location, app interactions,
   diagnostics; shared with Google for advertising), and add `app-ads.txt` to
   your developer website.
6. Never tap your own live ads; add your phone as a test device in AdMob.

## "Remove ads" purchase

`src/store.js` uses [`@capgo/native-purchases`](https://github.com/Cap-go/capacitor-native-purchases)
(Google Play Billing). In the Play Console, under *Monetise → Products → In-app
products*, create a one-time product with the id **`remove_ads`** and a price.
Buying it switches off the interstitials and makes the rewarded features
(keep going, double money, waive a fine) free and instant. The button appears
on the main menu once Play reports the product; *Settings → Restore purchases*
restores it on a new phone. Billing only works in builds installed from Play
(internal testing track is enough), signed with your release key.

## Google Play Games (leaderboards, achievements)

The app has its own small plugin (`android/app/src/main/java/com/autobahnrush/game/PlayGamesPlugin.java`,
Play Games services v2). It stays switched off until configured:

1. Play Console → *Play Games services → Setup*: create the game project and
   link your app (needs your release signing key's SHA-1).
2. Create three leaderboards (best score, top speed in km/h, longest distance
   in metres) and the achievements listed in `src/games.js`.
3. Put the project id (a number) in `android/app/src/main/res/values/games.xml`,
   and the leaderboard and achievement ids in `src/games.js`.

When signed in, LEADERBOARDS and ACHIEVEMENTS appear on the main menu.

## Crash and error reports

JavaScript errors are kept on the phone (last 30) and can be sent from
*Settings → Send error report* (share sheet or clipboard). For automatic crash
reports, add Firebase Crashlytics: create a Firebase project for
`com.autobahnrush.game`, put its `google-services.json` in `android/app/`
(do not commit it if the repository is public; add it in CI from a secret),
`npm install @capacitor-firebase/crashlytics`, and follow that plugin's Android
setup. `src/errors.js` sends errors to Crashlytics automatically once the
plugin is there.

## Privacy policy URL

`site/privacy.html` (generated from `PRIVACY.md`) is published to GitHub Pages
by `.github/workflows/pages.yml`. Switch Pages on once: repository *Settings →
Pages → Source: GitHub Actions*. The policy is then at
`https://mattydot.github.io/Autoha/privacy.html`; use that URL in the Play
Console. Put `app-ads.txt` (from AdMob) in `site/` as well.

## Languages

English, German, French, Spanish, Italian, Polish, Turkish, Dutch and
Portuguese (`src/i18n.js`). The game uses the phone's language automatically;
*Settings → Language* overrides it. Add the same languages to the Play store
listing.

## Changing the icon

`scripts/make_icons.py` draws the launcher icons, splash screens, PWA icons and
Play graphics (Python with Pillow):

```bash
python3 scripts/make_icons.py
```
