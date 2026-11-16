# Autobahn Rush

An arcade driving game on the German Autobahn: fast cars, loud radio, traffic to dodge, and no speed limit. Mostly.

Runs in the browser with no build step (three.js is vendored in `vendor/`).

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
| `F` | Lichthupe: flash the car ahead so it moves over |
| `H` | Horn |
| `C` | Camera (chase, far chase, roof) |
| `Q` `E` | Previous / next radio station |
| `N` | Next track, `M` radio off |
| `Esc` / `P` | Pause |

Gamepads (stick + triggers) and touch screens are supported too.

## What is in it

- **Garage** with six cars, each with its own body, paint options, gearing, handling and engine: a twin-turbo inline-6 sport sedan, a biturbo V8 super wagon, a V12 luxury limousine, V10 and V12 mid-engine supercars, and a quad-turbo W16 hypercar. They are original low-poly designs in the spirit of the real things, with fictional names.
- **Engine sound** synthesised live in an AudioWorklet (`src/engine-worklet.js`): every cylinder firing excites exhaust resonances, so firing order, cylinder count, turbo whistle, blow-off and overrun crackle differ per car.
- **Autobahn**: three lanes each way, guardrails, Leitpfosten, sign gantries, bridges, wind turbines, oncoming traffic. Long unrestricted stretches, and sometimes a Tempolimit zone, sometimes with a Blitzer that costs you points.
- **Traffic** that keeps right, overtakes, indicates, brakes, and occasionally pulls out in front of you.
- **Weather and time**: full day/night cycle with sunrise and sunset, plus clear, cloudy, overcast, rain, thunderstorm, mist and snow, changing while you drive (or fixed in Settings).
- **Radio** with six stations of original generated music (synthwave, dark electro, techno, trance, phonk, drum & bass).
- **Scoring**: distance at speed, near misses with a combo multiplier, speed clubs at 300/350/400 km/h.

## Your own music

The built-in stations are generated in code; the game ships no recordings. To drive to specific songs, open **MUSIC → ADD AUDIO FILES** and pick files from your own library. They are stored locally in your browser (IndexedDB) and play on the **MEINE MUSIK** station.

## Layout

```
index.html, css/style.css   menus and HUD
src/main.js                 game loop, physics, scoring, UI wiring
src/cars.js                 car specs and procedural car models
src/world.js                road, signs, limit zones, scenery
src/traffic.js              traffic AI
src/sky.js                  sky, day/night, weather, precipitation
src/audio.js                audio graph and sound effects
src/engine-worklet.js       engine synthesiser
src/radio.js                generated music stations, user tracks
vendor/                     three.js r170 (MIT, see vendor/THREE-LICENSE)
```
