---
name: build-playbook
description: Working method for building, testing and shipping a feature or a whole project end to end with little supervision. Use when asked to build something substantial (a game, an app, a large feature), when a task is open-ended, or when continuing work on Autobahn Rush.
---

# Build playbook

A way of working, written from the session that built Autobahn Rush. It is a
method, not a script: follow the reasoning, adapt the steps.

## 1. Read the request for what the person wants to end up with

- List the explicit asks. Every one of them is owed. Re-read the list before
  you say you are done.
- Notice the adjectives ("clean UI", "engine needs to sound perfect", "good
  detail"). They tell you where to spend effort.
- If the request was interrupted or amended, the latest message wins, but the
  earlier one is still context. "Create a repo for this" after a game brief
  means the game is still wanted.
- Ask a question only when the answer changes what you build and you cannot
  pick a sensible default. Otherwise pick, say what you picked, and move on.

## 2. Find the hard blockers first, cheaply

- Try the thing that might be impossible in the first minute (creating a repo,
  reaching a host, a missing credential), not after an hour of work.
- Tell apart two kinds of failure:
  - **Ordinary obstacle** (timeout, wrong flag, flaky tool): diagnose and work
    through it.
  - **Deliberate wall** (an access policy, a permission someone withheld): do
    not look for a way around it. Say plainly what was refused, do the rest of
    the work, and tell the person the one step only they can take.
- Never let a blocker on one part stop the parts that do not depend on it.

## 3. Decide the design before writing code

Spend the thinking up front; it is cheaper than rewriting.

- Choose the simplest stack that meets the request. No build step if a static
  page will do. Vendor a dependency rather than depend on a CDN at runtime.
- Split the work into modules with one job each and decide how they talk
  before writing any of them (here: cars, world, traffic, sky, audio, radio,
  main loop).
- Fix the conventions once and write them down in the code: coordinate
  system, units, which way is forward. Most integration bugs are two modules
  disagreeing about a convention.
- Use real numbers where they exist (car power, mass, top speed, lane width).
  Realistic inputs give believable behaviour without tuning.
- Keep performance in mind from the start: share geometry and materials,
  merge meshes, pool objects, avoid per-frame allocation.

## 4. Handle the parts you must not do as asked

- Copyrighted recordings, real brand names and logos, a specific existing
  game: do not reproduce them. Build the nearest legitimate thing (original
  music in the same spirit, lookalike shapes with fictional names) and give
  the person a way to bring their own material (a "load your own files" slot).
- Say this clearly in the final report. Do not quietly substitute.

## 5. Build in whole modules, then integrate early

- Write each module completely rather than stubbing everything.
- Get the whole thing running end to end as soon as possible, even if it is
  ugly. A running program tells you more than reading your own code.
- Expose a small debug handle (here `window.__game`) and separate
  `simulate(dt)` from `render()`. That lets a test drive minutes of game time
  in seconds without depending on frame rate.

## 6. Verify by looking, not by assuming

Work is not done because the code was written. For anything visual or
interactive:

1. Run it for real (a headless browser is enough) and capture console errors
   and page errors on every run.
2. Take screenshots and actually look at them. Build contact sheets (all cars,
   all weather states) so problems are visible side by side.
3. Drive the UI with real clicks and key presses: every menu, every button,
   back and forth.
4. Test the logic directly: top speed per car, a crash, a near miss, a fine.
   Set up the exact situation rather than hoping it occurs.
5. Run a long soak (minutes of simulated play) and check for errors, NaNs and
   leaks.
6. For audio you cannot hear, at least measure it: is there signal, on every
   station and every engine? One silent station was found this way.

## 7. Debug with evidence

- When something is slow, measure before theorising. Time each subsystem. The
  slowdown here was not rendering at all; it was `Object3D.clone()` deep
  copying `userData` through JSON.
- When something looks wrong, change one thing at a time and compare. Run
  variants in parallel when each run is slow. Hiding one object, moving one
  plane, or forcing one colour answers a question that an hour of reasoning
  does not.
- If two or three theories in a row fail, stop theorising and bisect.
- Prefer the fix that removes the whole class of problem (grass no longer lies
  under the road) over the one that hides the symptom.
- Know your test environment's limits. A software renderer is slow; do not
  mistake that for a bug in the product, and do not report its numbers as real
  performance.

## 8. Keep the person informed while you work

- Before a long stretch, say in one line what you are about to do.
- When you find something that changes the picture (a blocker, a root cause),
  say it when you find it.
- Short, plain sentences. No running commentary on every command.

## 9. Finish properly

- Commit with a message that says what the change is. Push only when asked or
  when a remote exists and that was the agreement.
- If the environment is temporary, hand over something durable (a zip, a
  pushed branch) so the work cannot be lost.
- Write the README a newcomer needs: how to run it, the controls, what is in
  it, where things live.

## 10. Report honestly

The final message is for someone who did not watch you work.

- Lead with what they most need: what happened with the thing they asked for,
  and anything they must do.
- State what works and how you know.
- State what differs from the request and why.
- State what you could not verify (how audio actually sounds, frame rate on a
  real GPU, untested input devices). Unverified is not the same as broken, but
  the person must be able to tell which is which.
- No inflated claims. "Verified signal on all six engines; I cannot hear them"
  is more useful than "the engines sound great".

## Project notes: Autobahn Rush

- Run: `python3 -m http.server 8000` in the repo root, open the page. ES
  modules and the audio worklet do not load from `file://`.
- Conventions: travel is toward -Z; road position is `s` in metres; static
  scenery lives in `world.frame`, which is shifted by the player's `s`. Lanes
  are at x = -3.75, 0, 3.75 (left is the fast lane).
- Testing: `window.__game` exposes `simulate(dt)`, `go(screen)`, `setCar(i)`,
  `keys`, `player`, `run`, `sky`, `world`, `traffic`, `audio`. Set
  `localStorage['autobahn-rush']` to `{"quality":"low"}` before load for
  headless runs.
- Pitfalls already hit:
  - Never keep Object3D references in `userData` of anything that gets
    cloned; stash them during `clone()`.
  - `ExtrudeGeometry` bevels grow the outline; use `bevelOffset: -bevel`.
  - Unused instances of an `InstancedMesh` sit at the origin; zero-scale them.
  - Pooled props must start hidden and far away.
  - Do not stack large ground planes; cut them so they never overlap.
  - Tint by multiplying cannot make a surface white; blend the albedo in the
    shader (see `World._snowy`).
  - `group.add(x)` returns the group, not `x`: never chain `.position` or
    `.rotation` onto it.
  - Car bodies are solid blocks. The cockpit view needs the hollow-cabin body
    (`buildBody(..., cabin = true)`), or the driver looks at the top of a block.
  - Test bots must steer with damping (position and lateral speed), brake for
    real stopping distances and obey limits, or every crash is the bot's fault.
  - Never fake `Math.random` around world generation in tests; pass a
    parameter instead (`_makeAccident(s, 'oil')`, `_makeRoadworks(s, -1)`).
  - `window.__debugCam = (camera, rig) => {...}` overrides the camera for
    screenshots; `__game.simulate(dt)` steps the game without rendering.
  - Physics tuning has a Node test bench pattern: run the scenario many times
    across cars and weather, report rates (spins, flips), not single runs.
- Repo: github.com/mattydot/Autoha (branch `main`).
- Open items: hear and tune the engine and radio on real speakers; measure
  frame rate on a real GPU; test gamepad and touch.
