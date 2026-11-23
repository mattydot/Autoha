# Autobahn Rush

An arcade driving game on the German Autobahn: fast cars, loud radio, traffic to dodge, and no speed limit. Mostly.

Runs in the browser with no build step (three.js is vendored in `vendor/`), and as an Android app.

## Download for Android

Get `AutobahnRush.apk` from the [latest release](https://github.com/mattydot/Autoha/releases/latest), open it on your phone and allow installing. Details, building it yourself and publishing on Google Play: [docs/ANDROID.md](docs/ANDROID.md).

## Run it

Any static file server works, for example:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (Opening `index.html` straight from disk does not work, because browsers block ES modules and audio worklets on `file://`.)

## Controls

| Key | Action |
| --- | --- |
| `W` / `↑` | Throttle |
| `S` / `↓` / `Space` | Brake |
| `A` `D` / `←` `→` | Steer |
| `C` | Camera: chase, far chase, cockpit |
| `F` | Lichthupe: flash the car ahead so it moves over |
| `H` | Horn |
| `R` | Recover after a spin (costs points) |
| `Q` `E` | Previous / next radio station |
| `N` | Next track, `M` radio off |
| `Esc` / `P` | Pause |

Gamepads (stick + triggers) work too.

### On a phone

Play in landscape or upright; the camera and the menus adapt to how you hold the phone:

- **Steering**: ◀ ▶ buttons bottom left (slide your thumb between them), or switch to **tilt steering** in Settings.
- **Gas** is automatic by default; **BRAKE** is bottom right. Settings > Gas > *Gas pedal* adds a separate gas pedal.
- Small buttons on the right edge: pause, camera, Lichthupe, next radio station, and ↻ to recover after a spin.
- Vibration on crashes (can be turned off), fullscreen, screen kept awake while driving.
- Graphics are on **Auto**: if the phone cannot keep up, quality steps down by itself.
- It works offline and can be installed from the browser as an app, or use the Android APK.

## What is in it

- **Garage** with fourteen cars, each with its own body, paint options, gearing, handling and engine: a twin-turbo inline-6 sport sedan, a biturbo V8 super wagon, a V12 luxury limousine, V10 and V12 mid-engine supercars, a quad-turbo W16 hypercar, a Stage 3 modded VR6 hot hatch, a blacked-out V8 saloon with straight pipes, a boxy portal-axle V8 off-roader (spare wheel, roof rack, all-terrain tyres), two performance SUVs, a raised rally 911, a rear-drive 911 GT3 RS with a swan-neck wing, and a rear-drive front-mid V8 Black Series coupé. Original low-poly designs in the spirit of the real things, with fictional names. Rear-wheel-drive cars hold power slides and swing round on trail-braking; all-wheel-drive cars stay planted.
- **Driving physics** (`src/vehicle.js`): tyres that grip up to a limit and then slide, weight transfer under braking, ABS and stability control that can only do so much. Steering has real authority at every speed (quick and grippy in town, still sharp at 250+). Normal lane changes are safe; yanking the wheel at speed can break traction, and in rain, storms and snow it happens much more easily. Keep braking while you steer and the tail starts to come round: a short drift after a second, a spin if you hold it. Rollovers only happen when a car is really sliding sideways fast and the tyres dig in (or after a hard side hit): at moderate speed the wheels on one side lift slowly, the car leans, and it either drops back onto its wheels or goes over; much faster and it tumbles several times.
- **Speed feel** (`src/speedfx.js`, `PACE` in `src/world.js`): the road goes by 1.5 times faster than the speedometer says (traffic, police and debris too; steering and the numbers stay the same), and every speed cue on top acts as if you were going half as fast again. The view widens, the chase camera drops back and lower as you build speed (and snaps in when you brake), wind streaks rush past, the edges of the screen blur and darken, the camera shakes and the wind roars.
- **Crashes** (`src/physics.js`): cars are rigid bodies. Below 150 km/h, or when both cars are doing about the same speed, a crash with another car dents and smokes your car but never writes it off; a big speed difference at high speed still can. A square rear-end just shoves the car in front; an offset hit spins both cars. Hit cars lose control, slide to a stop and sit there with hazard lights on.
- **Cockpit view**, more detailed than the outside of the cars: stitched leather or Alcantara per car, wood or carbon trim, air vents, climate panel, gear selector, door cards with speakers, a bucket passenger seat, roof lining, tinted windscreen with a sun strip. The displays sit low so the road stays clear: the instrument cluster (speed, revs, gear, warning lights; the M3 always has its engine and oil lights on), head-up display, centre screen, working rear-view and door mirrors, wipers and rain on the windscreen.
- **Polizei** in upgraded super estates (330 km/h) in the German blue-and-silver livery: blue lower body with neon-yellow stripes, POLIZEI on the sides, bonnet and tailgate, a slim LED light bar and a roof number. Touch another car and drive on, or go far too fast past a speed camera, and it escalates: first one patrol car comes up behind with blue lights (no siren), overtakes and leads you with BITTE FOLGEN on its rear display, slows down and pulls onto the hard shoulder. Follow it and stop behind it: a ticket, and you drive on. Ignore it (pass it, run, ram it or drive off) and it becomes a chase: siren, STOP POLIZEI, backup, and they box you in (one behind, one in front, one on each side); stop inside the box and you are arrested. From the chase on a police helicopter follows overhead (no escaping while it is up; it has to leave to refuel after a while, and it searchlights you at night), patrols lay spike strips (Nagelsperren) across the road ahead, and police hits do real damage. Keep running and it turns into a Großfahndung: more cars, dark SEK vans that ram from behind, hard brake checks and shoving. Drive over a spike strip and the tyres are shredded: little grip, a much lower top speed, sparks from the rims and a tugging wheel. They follow you off the Autobahn too.
- **Traffic**: everyday cars (city cars, hatchbacks, saloons, estates, crossovers, SUVs, people carriers, minibuses, coupés, vans and lorries), with the occasional fast saloon, super estate or tuned car in the left lane. No supercars in traffic.
- **Country roads** (`src/land.js`): every 4 to 7 km there is an Anschlussstelle. Signed like the real thing: blue Vorwegweiser at 1000 m and 500 m with the exit number, blue-and-white countdown boards (Zeichen 450) at 300/200/100 m, a deceleration lane with a broken wide line, the blue Ausfahrt sign at the gore, 80 and 60 limits down the ramp, and a yield sign where it meets the Landstraße. The Landstraße (limit 100) curves through fields of rapeseed and wheat, past farms with barns and silos and along tree-lined avenues, with curve warnings, a 70 limit and red-white chevron boards in the tighter bends, deer warnings, and cars and tractors in both directions. Kreisstraßen, gravel Feldwege (with the "Landwirtschaftlicher Verkehr frei" sign; dust, rumble) and muddy Waldwege through the forest (ruts, puddles, bumps) branch off on both sides, and off each other, and rejoin later. Some Waldwege lead into an Offroad-Gelände: a wide open patch of churned ground with rocks to dodge, mud and water. Hunting stands, round hay bales and quarry lakes dot the fields. Every few kilometres the Landstraße runs through a Dorf: a yellow Ortstafel and a 50 limit, plastered and half-timbered houses with tiled roofs, dormers and garages, a church with an onion dome and a clock, street lamps, hedges and a side street. An on-ramp with the blue Autobahn sign takes you back. Off the Autobahn the steering is more direct with more lock for tight bends, and nothing pulls the car straight. A wildlife fence runs along every road: you can go anywhere on the network, but not off it. The Polizei follow you down the exit and along the country roads.
- **Autobahn**: three lanes each way, oncoming traffic, bridges, wind turbines. Long unrestricted stretches, and sometimes a Tempolimit zone with a speed camera. **Roadworks** close a lane with beacons, a flashing arrow trailer, yellow markings and machines. **Accidents**: an overturned tanker with oil or milk across the lanes; on oil the tyres have almost no grip, so braking or steering hard spins you.
- **LED gantries** over the road warn about what is ahead (roadworks, accidents, oil, fog, storm, snow, police) and set variable speed limits.
- **Weather and time**: day/night cycle with sunrise and sunset, clear, cloudy, overcast, rain, thunderstorm, fog (with fog banks you drive in and out of) and snow, changing while you drive or fixed in Settings.
- **Radio** with seven stations of instrumental music composed live in code: classical (piano and strings), techno, rock (guitars, no singer), summer pop, synth-pop, electro-pop and phonk beats. In the MUSIC menu you can remove tracks from a station (and put them back) and add or delete your own files. While driving, the station shows as a small pop-up at the top of the screen. All sound stops when you switch to another tab or app and carries on when you come back.
- **Career**: every run pays euros (about one per 8 points); the first two cars are free, the rest (and extra paints) are bought in the garage. Three **daily missions** (near misses, distance, country roads, off-road, villages, escapes, a polite traffic stop, exits, a clean run) pay bonuses.
- **Languages**: English, Deutsch, Français, Español, Italiano, Polski, Türkçe, Nederlands, Português; picked from the phone's language, changeable in Settings.
- **Settings**: Battery saver graphics (about 30 fps, lower resolution), tutorial, privacy policy, error report.
- **Ads (Android app)**: an interstitial after every 3rd run; optional rewarded ads to keep going after a crash or arrest, double a run's money, or waive a speed-camera fine; a "remove ads" purchase; Google Play Games leaderboards and achievements (Google AdMob, with the consent form where required). See [docs/ANDROID.md](docs/ANDROID.md#ads-google-admob).
- **Scoring**: distance at speed, near misses with a combo multiplier, speed clubs at 300/350/400 km/h, escaping the police.

## Your own music

The built-in stations are generated in code; the game ships no recordings. To drive to specific songs, open **MUSIC → ADD AUDIO FILES** and pick files from your own library. They are stored locally in your browser (IndexedDB) and play on the **MEINE MUSIK** station.

## Layout

```
index.html, css/style.css   menus and HUD
src/main.js                 game loop, scoring, cameras, UI wiring
src/specs.js                car specifications
src/cars.js                 procedural car models, traffic and police cars
src/vehicle.js              player car dynamics (tyres, brakes, rollovers)
src/physics.js              collisions between cars, obstacles and walls
src/cockpit.js              first-person interior and its displays
src/police.js               police chases
src/props.js                roadworks and accident-scene objects
src/fx.js                   skid marks, debris, smoke, sparks
src/mobile.js               touch controls, tilt, fullscreen, vibration
sw.js, manifest.webmanifest offline support and app install (icons/ holds the app icons)
android/                    Android app (Capacitor); built by .github/workflows/android.yml
scripts/                    web build for the app, icon generator
docs/ANDROID.md             APK download, building, Google Play
docs/play/                  Play Store graphics
src/world.js                road, signs, limit zones, roadworks, accidents, gantries
src/land.js                 country roads: exits, Landstraße, Kreisstraßen, Feldwege, farms, fields, signs
src/pace.js                 how much faster than the speedometer the world goes by
src/speedfx.js              wind streaks and radial blur at speed
src/traffic.js              traffic AI
src/sky.js                  sky, day/night, weather, precipitation
src/audio.js                audio graph and sound effects
src/engine-worklet.js       engine synthesiser
src/radio.js                composed music stations, user tracks
vendor/                     three.js r170 (MIT, see vendor/THREE-LICENSE)
```
