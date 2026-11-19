// Traffic AI: lane discipline, overtaking, braking, indicators, merging out of
// closed lanes, making room for the police. Every car is also a rigid body:
// after a hard hit it stops driving and slides, spins and comes to rest,
// hazard lights on, as an obstacle for everyone else.
import * as THREE from 'three';
import { LANES, ROAD, PACE } from './world.js';
import { TrafficFactory, TRAFFIC_KINDS, EVERYDAY, MATS } from './cars.js';
const EVERY_SUM = EVERYDAY.reduce((a, [, w]) => a + w, 0);
function everyday() { let r = Math.random() * EVERY_SUM; for (const [k, w] of EVERYDAY) if ((r -= w) < 0) return k; return 'sedan'; }
// fast cars in the left lane: mostly sporty saloons and estates, now and then a tuned or blacked-out one (no supercars)
const FAST = ['m3', 'm3', 'rs6', 'rs6', 'maybach', 'r6', 'm5b', 'kay', 'xm', 'g4', 'gtb'];
import { sat, resolve } from './physics.js';

const KMH = 1 / 3.6;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = THREE.MathUtils.clamp;
const MASS = { compact: 1250, sedan: 1500, wagon: 1650, suv: 2150, van: 2600, truck: 16000, m3: 1730, rs6: 2075, maybach: 2350, v10: 1490, r6: 1520, m5b: 1940, police: 2075, city: 1050, hatch: 1350, mpv: 1700, crossover: 1550, bus: 2300, coupe: 1600, g4: 3020, kay: 2220, xm: 2710, gtb: 1520 };

export class Traffic {
  constructor(world) {
    this.world = world; this.factory = new TrafficFactory(); world.factory = this.factory;
    this.cars = []; this.oncoming = []; this.pool = {}; this.density = 1; this.police = null;
    this.spawnT = 0;
    for (const k of [...TRAFFIC_KINDS, 'truck', ...new Set(FAST), 'police']) this.factory._template(k);
  }
  _get(kind) {
    const p = this.pool[kind] || (this.pool[kind] = []);
    const mesh = p.pop() || this.factory.create(kind);
    mesh.visible = true; this.world.frame.add(mesh); return mesh;
  }
  _release(c) { c.mesh.visible = false; this.world.frame.remove(c.mesh); (this.pool[c.kind] || (this.pool[c.kind] = [])).push(c.mesh); }
  reset() { for (const c of this.cars) this._release(c); for (const c of this.oncoming) this._release(c); this.cars = []; this.oncoming = []; }

  _kindFor(lane) {
    const r = Math.random();
    if (lane === 2) return r < 0.5 ? 'truck' : r < 0.62 ? 'van' : everyday();
    if (lane === 0 && r < 0.13) return FAST[(Math.random() * FAST.length) | 0];
    return r < 0.08 ? 'van' : everyday();
  }
  _speedFor(kind, lane) {
    if (kind === 'truck') return rand(80, 92) * KMH;
    if (lane === 2) return rand(98, 125) * KMH;
    if (lane === 1) return rand(120, 152) * KMH;
    return rand(155, 215) * KMH;
  }
  _free(lane, s, back, fwd, ignore, player) {
    for (const c of this.cars) { if (c === ignore) continue; if ((c.lane === lane || c.toLane === lane || Math.abs(c.x - LANES[lane]) < 2.2) && c.s - c.L / 2 < s + fwd && c.s + c.L / 2 > s - back) return false; }
    if (this.world.laneClosed(lane, s + fwd * 0.5)) return false;
    return true;
  }
  /** create a car; used for normal traffic and by the police */
  add(kind, lane, s, v, extra = {}) {
    const mesh = this._get(kind), m = MASS[kind] || 1500, L = mesh.userData.L, W = mesh.userData.W;
    const c = { kind, mesh, s, lane, toLane: lane, lc: 0, x: LANES[lane], vs: v, vx: 0, psi: 0, r: 0, vd: v, L, W, m, I: m * (L * L + W * W) / 12,
      ind: 0, brake: 0, passed: false, patience: rand(2, 7), flashed: 0, crashed: false, stopped: false, hitT: 0, ...extra };
    mesh.position.set(c.x, 0, -s); mesh.rotation.set(0, 0, 0);
    this.cars.push(c); return c;
  }
  _spawn(player, active) {
    const r = Math.random(); const lane = r < 0.44 ? 2 : r < 0.84 ? 1 : 0;
    const kind = this._kindFor(lane), v = this._speedFor(kind, lane);
    let s;
    if (v > player.v + 8 && active && Math.random() < 0.6) { // faster than the player -> appears from behind
      if (Math.abs(LANES[lane] - player.x) < 2.6) return; s = player.s - rand(140, 190);
    } else s = player.s + rand(520, 760);
    if (this.world.laneClosed(lane, s) || this.world.closureAhead(lane, s, 250) < 250) return;
    if (!this._free(lane, s, 70, 70)) return;
    const c = this.add(kind, lane, s, v); c.passed = s < player.s;
  }
  _spawnOncoming(player) {
    const lane = (Math.random() * 3) | 0, kind = this._kindFor(lane);
    const s = player.s + rand(900, 1500);
    for (const c of this.oncoming) if (c.lane === lane && Math.abs(c.s - s) < 60) return;
    const mesh = this._get(kind);
    const c = { kind, mesh, s, lane, x: ROAD.mirror - LANES[lane], vs: this._speedFor(kind, lane) };
    mesh.rotation.set(0, Math.PI, 0); mesh.position.set(c.x, 0, -s); this.oncoming.push(c);
  }

  flashAt(player) { // Lichthupe: ask the car ahead to move over
    let best = null;
    for (const c of this.cars) if (!c.crashed && !c.police && c.s > player.s && c.s - player.s < 160 && Math.abs(c.x - player.x) < 1.6 && (!best || c.s < best.s)) best = c;
    if (best) best.flashed = 1.2;
  }

  /** a car took an impulse: decide whether the driver keeps control */
  knock(c, dv) {
    if (c.crashed) return;
    if (dv > (c.police ? 6 : 3.5) || Math.abs(c.r) > (c.police ? 0.6 : 0.35) || c.kind === 'truck' && dv > 2) { c.crashed = true; c.ind = 0; c.brake = 1; c.lc = 0; }
    else { c.hitT = 1.5; c.r = 0; c.psi *= 0.5; }
  }

  update(dt, player, sky, active) {
    const world = this.world, night = sky.night, blink = (performance.now() % 700) < 350, hazard = (performance.now() % 800) < 400;
    const civil = this.cars.filter((c) => !c.police).length;
    const target = active ? Math.round((9 + Math.min(9, player.s / 2500)) * this.density) : 0;
    this.spawnT -= dt;
    if (civil < target && this.spawnT <= 0) { this._spawn(player, active); this.spawnT = 0.12; }
    if (this.oncoming.length < 12 * this.density) this._spawnOncoming(player);
    const wetSlow = 1 - 0.14 * sky.wet - 0.2 * sky.snowCover;
    const police = this.cars.filter((c) => c.police && !c.crashed);

    for (const c of this.cars) {
      if (c.crashed) { this._slide(c, dt); continue; }
      if (c.police && this.police) { this.police.control(c, dt, player, this); this._visual(c, dt, night, blink, sky); continue; }

      // --- longitudinal: follow the leader --------------------------------
      let lead = null, gap = 1e9;
      const consider = (s, L, x, W, v) => { const g = s - L / 2 - (c.s + c.L / 2); if (g > -2 && g < gap && Math.abs(x - c.x) < (W + c.W) / 2 + 0.25) { gap = g; lead = v; } };
      for (const o of this.cars) if (o !== c) consider(o.s, o.L, o.x, o.W, o.crashed ? 0 : o.vs);
      if (active) consider(player.s, player.L, player.x, player.footW, player.wrecked ? 0 : player.v);
      for (const o of world.obstacles) consider(o.s, Math.abs(o.L * Math.cos(o.psi)) + 1, o.x, Math.abs(o.L * Math.sin(o.psi)) + o.W, 0);
      // a closed lane ahead acts like a stopped car at the start of the closure
      const dClose = world.closureAhead(c.lane, c.s, 450);
      if (dClose < 450 && c.lc <= 0) { const g = dClose - c.L / 2 - 4; if (g < gap) { gap = g; lead = 0; } }
      const lim = world.limitAt(c.s);
      let vt = (lim ? Math.min(c.vd, (lim + 6) * KMH * (c.kind === 'truck' ? 0.7 : 1)) : c.vd) * wetSlow;
      vt = Math.max(vt, lead === 0 ? 0 : 50 * KMH);
      const safe = (6 + c.vs * 0.9) * PACE;
      if (lead !== null && gap < safe * 1.6) vt = Math.min(vt, gap < safe ? lead * Math.max(0, gap / safe) : lead);
      if (lead === 0 && gap < 12 * PACE) vt = 0;
      const acc = clamp((vt - c.vs) * 1.2, gap < 8 ? -9 : -6, c.kind === 'truck' ? 0.6 : 2.2);
      c.vs = Math.max(0, c.vs + acc * dt); c.brake = acc < -1.2 ? 1 : 0;
      c.s += c.vs * dt * PACE;

      // --- lane changes -----------------------------------------------------
      const x0 = c.x;
      if (c.lc > 0) {
        c.lc -= dt;
        if (c.lc < 1.6) { const k = 1 - Math.max(0, c.lc) / 1.6, e = k * k * (3 - 2 * k); c.x = LANES[c.lane] + (LANES[c.toLane] - LANES[c.lane]) * e; }
        if (c.lc <= 0) { c.lane = c.toLane; c.x = LANES[c.lane]; c.ind = 0; }
      } else {
        if (c.hitT > 0) c.hitT -= dt;
        c.x += (LANES[c.lane] - c.x) * Math.min(1, dt * 1.5);                 // drift back after a nudge
        const blocked = lead !== null && gap < safe * 1.5 && lead < c.vd - 3;
        const playerNear = (lane, back, fwd) => active && Math.abs(LANES[lane] - player.x) < 2.9 && player.s > c.s - back - (player.v - c.vs) * 2.2 * PACE && player.s < c.s + fwd;
        const policeBehind = police.some((p) => p.s < c.s && c.s - p.s < 90 && Math.abs(p.x - c.x) < 1.8 && p.vs > c.vs);
        let to = -1;
        if (dClose < 450) { // must merge out of a closed lane
          const t = c.lane === 2 ? 1 : c.lane === 0 ? 1 : (world.laneClosed(2, c.s + dClose + 5) ? 0 : 2);
          if (this._free(t, c.s, 25, 30, c) && !playerNear(t, 10, 12)) to = t;
        } else if (c.flashed > 0 || policeBehind) { c.flashed -= dt; if (c.lane < 2 && this._free(c.lane + 1, c.s, 30, 45, c) && !playerNear(c.lane + 1, 12, 14)) to = c.lane + 1; }
        else if (blocked) { c.patience -= dt * (lead < 3 ? 4 : 1); if (c.patience <= 0 && c.lane > 0 && this._free(c.lane - 1, c.s, 55, 40, c) && !playerNear(c.lane - 1, 14, 12)) { to = c.lane - 1; } }
        else if (c.lane < 2 && c.kind !== 'truck' ? Math.random() < dt * 0.12 : c.lane === 1 && Math.random() < dt * 0.3) { if (this._free(c.lane + 1, c.s, 40, 160, c) && !playerNear(c.lane + 1, 14, 20) && world.closureAhead(c.lane + 1, c.s, 500) > 500) to = c.lane + 1; }
        if (to >= 0 && to !== c.lane) { c.toLane = to; c.lc = 2.5; c.ind = to < c.lane ? -1 : 1; c.patience = rand(3, 9); }
      }
      c.vx = (c.x - x0) / Math.max(dt, 1e-4); c.psi = Math.atan2(c.vx, Math.max(c.vs, 5) * PACE); c.r = 0;
      this._visual(c, dt, night, blink, sky);
    }
    MATS.head.emissiveIntensity = 0.9 + night * 5 + (sky.cur.rain + sky.cur.fog * 60) * 1.5;

    // wrecks and police can run into other cars
    for (let i = 0; i < this.cars.length; i++) for (let j = i + 1; j < this.cars.length; j++) {
      const a = this.cars[i], b = this.cars[j];
      if (!(a.crashed || b.crashed || a.police || b.police) || Math.abs(a.s - b.s) > 20 || Math.abs(a.x - b.x) > 4) continue;
      const hit = sat(a, b); if (!hit) continue;
      const j0 = resolve(a, b, hit, 0.15, 0.4);
      if (j0 > 0) { this.knock(a, j0 / a.m); this.knock(b, j0 / b.m); }
    }
    for (const c of this.cars) if (c.crashed) { for (const i of c.mesh.userData.ind.l) i.visible = hazard; for (const i of c.mesh.userData.ind.r) i.visible = hazard; }

    for (const c of this.oncoming) { c.s -= c.vs * dt * PACE; c.mesh.position.z = -c.s; const spin = c.vs * dt * PACE / c.mesh.userData.wheelR; for (const w of c.mesh.userData.wheels) w.rotation.z -= spin;
      c.mesh.userData.tail.emissiveIntensity = 0.3 + night * 1.5; }

    // despawn
    this.cars = this.cars.filter((c) => {
      const far = c.police ? (c.leaving && c.s < player.s - 300) || c.s < player.s - 900 || (c.crashed && c.s < player.s - 260) : c.s < player.s - 260 || c.s > player.s + 1100;
      if (far) { this._release(c); return false; } return true;
    });
    this.oncoming = this.oncoming.filter((c) => { if (c.s < player.s - 120) { this._release(c); return false; } return true; });
  }

  // a car out of control: tyres locked, sliding and spinning to a stop
  _slide(c, dt) {
    const sp = Math.hypot(c.vx, c.vs);
    if (sp > 0.05) { const d = Math.min(sp, 7.5 * dt); c.vx -= c.vx / sp * d; c.vs -= c.vs / sp * d; } else { c.vx = c.vs = 0; c.stopped = true; }
    c.r *= Math.exp(-dt * 1.8); c.psi += c.r * dt; c.x += c.vx * dt * PACE; c.s += c.vs * dt * PACE;
    const b = this.world.bounds(c.s), hw = (Math.abs(c.L * Math.sin(c.psi)) + Math.abs(c.W * Math.cos(c.psi))) / 2;
    if (c.x + hw > b.max) { c.x = b.max - hw; c.vx = -Math.abs(c.vx) * 0.2; c.r *= 0.6; }
    if (c.x - hw < b.min) { c.x = b.min + hw; c.vx = Math.abs(c.vx) * 0.2; c.r *= 0.6; }
    c.lane = LANES.reduce((best, l, i) => (Math.abs(l - c.x) < Math.abs(LANES[best] - c.x) ? i : best), 0); c.toLane = c.lane;
    c.brake = 1; c.mesh.position.set(c.x, 0, -c.s); c.mesh.rotation.y = -c.psi;
    const spin = c.vs * dt / c.mesh.userData.wheelR * 0.2; for (const w of c.mesh.userData.wheels) w.rotation.z -= spin;
    c.mesh.userData.tail.emissiveIntensity = 7;
  }

  _visual(c, dt, night, blink, sky) {
    const m = c.mesh, u = m.userData;
    m.position.set(c.x, 0, -c.s); m.rotation.y = -c.psi;
    const spin = c.vs * dt * PACE / u.wheelR; for (const w of u.wheels) w.rotation.z -= spin;
    u.tail.emissiveIntensity = c.brake ? 7 : 0.25 + night * 1.6 + sky.cur.rain * 0.8;
    for (const i of u.ind.l) i.visible = c.ind < 0 && blink; for (const i of u.ind.r) i.visible = c.ind > 0 && blink;
  }
}
