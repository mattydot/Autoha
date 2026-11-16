// Traffic AI: lane discipline, overtaking, braking, indicators.
import * as THREE from 'three';
import { LANES, ROAD } from './world.js';
import { TrafficFactory, TRAFFIC_KINDS, MATS } from './cars.js';

const KMH = 1 / 3.6;
const rand = (a, b) => a + Math.random() * (b - a);

export class Traffic {
  constructor(world) {
    this.world = world; this.factory = new TrafficFactory();
    this.cars = []; this.oncoming = []; this.pool = {}; this.density = 1;
    this.spawnT = 0;
    // build every vehicle template up front so nothing hitches mid-drive
    for (const k of [...TRAFFIC_KINDS, 'truck', 'm3', 'rs6', 'maybach', 'v10']) this.factory._template(k);
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
    if (lane === 2) return r < 0.5 ? 'truck' : r < 0.62 ? 'van' : TRAFFIC_KINDS[(Math.random() * 4) | 0];
    if (lane === 0 && r < 0.3) return ['m3', 'rs6', 'maybach', 'v10'][(Math.random() * 4) | 0];
    return r < 0.08 ? 'van' : TRAFFIC_KINDS[(Math.random() * 4) | 0];
  }
  _speedFor(kind, lane) {
    if (kind === 'truck') return rand(80, 92) * KMH;
    if (lane === 2) return rand(98, 125) * KMH;
    if (lane === 1) return rand(120, 152) * KMH;
    return rand(155, 215) * KMH;
  }
  _free(lane, s, back, fwd, ignore) {
    for (const c of this.cars) { if (c === ignore) continue; if ((c.lane === lane || c.toLane === lane) && c.s - c.L / 2 < s + fwd && c.s + c.L / 2 > s - back) return false; }
    return true;
  }
  _spawn(player, active) {
    const r = Math.random(); const lane = r < 0.44 ? 2 : r < 0.84 ? 1 : 0;
    const kind = this._kindFor(lane), v = this._speedFor(kind, lane);
    let s;
    if (v > player.v + 8 && active && Math.random() < 0.6) { // faster than the player -> appears from behind
      if (Math.abs(LANES[lane] - player.x) < 2.6) return; s = player.s - rand(140, 190);
    } else s = player.s + rand(520, 760);
    if (!this._free(lane, s, 70, 70)) return;
    const mesh = this._get(kind);
    const c = { kind, mesh, s, lane, toLane: lane, lc: 0, x: LANES[lane], v, vd: v, L: mesh.userData.L, W: mesh.userData.W, ind: 0, brake: 0, passed: s < player.s, patience: rand(2, 7), flashed: 0, hit: 0 };
    mesh.position.set(c.x, 0, -s); mesh.rotation.set(0, 0, 0);
    this.cars.push(c);
  }
  _spawnOncoming(player) {
    const lane = (Math.random() * 3) | 0, kind = this._kindFor(lane);
    const s = player.s + rand(900, 1500);
    for (const c of this.oncoming) if (c.lane === lane && Math.abs(c.s - s) < 60) return;
    const mesh = this._get(kind);
    const c = { kind, mesh, s, lane, x: ROAD.mirror - LANES[lane], v: this._speedFor(kind, lane) };
    mesh.rotation.set(0, Math.PI, 0); mesh.position.set(c.x, 0, -s); this.oncoming.push(c);
  }

  flashAt(player) { // Lichthupe: ask the car ahead to move over
    let best = null;
    for (const c of this.cars) if (c.s > player.s && c.s - player.s < 160 && Math.abs(c.x - player.x) < 1.6 && (!best || c.s < best.s)) best = c;
    if (best) best.flashed = 1.2;
  }

  update(dt, player, sky, active) {
    const world = this.world, night = sky.night, blink = (performance.now() % 700) < 350;
    const target = active ? Math.round((9 + Math.min(9, player.s / 2500)) * this.density) : 0;
    this.spawnT -= dt;
    if (this.cars.length < target && this.spawnT <= 0) { this._spawn(player, active); this.spawnT = 0.12; }
    if (this.oncoming.length < 12 * this.density) this._spawnOncoming(player);

    for (const c of this.cars) {
      // --- longitudinal: follow the leader --------------------------------
      let lead = null, gap = 1e9;
      const consider = (s, L, x, W, v) => { const g = s - L / 2 - (c.s + c.L / 2); if (g > -2 && g < gap && Math.abs(x - c.x) < (W + c.W) / 2 + 0.25) { gap = g; lead = v; } };
      for (const o of this.cars) if (o !== c) consider(o.s, o.L, o.x, o.W, o.v);
      if (active) consider(player.s, player.L, player.x, player.W, player.v);
      const lim = world.limitAt(c.s);
      let vt = lim ? Math.min(c.vd, (lim + 6) * KMH * (c.kind === 'truck' ? 0.7 : 1)) : c.vd;
      vt = Math.max(vt, 60 * KMH);
      const safe = 6 + c.v * 0.9;
      if (lead !== null && gap < safe * 1.6) vt = Math.min(vt, gap < safe ? lead * Math.max(0.3, gap / safe) : lead);
      const acc = THREE.MathUtils.clamp((vt - c.v) * 1.2, gap < 8 ? -9 : -5.5, c.kind === 'truck' ? 0.6 : 2.2);
      c.v = Math.max(0, c.v + acc * dt); c.brake = acc < -1.2 ? 1 : 0;
      if (c.hit > 0) { c.hit -= dt; c.v = Math.max(0, c.v - 6 * dt); c.brake = 1; }
      c.s += c.v * dt;

      // --- lane changes -----------------------------------------------------
      if (c.lc > 0) {
        c.lc -= dt;
        if (c.lc < 1.6) { const k = 1 - Math.max(0, c.lc) / 1.6, e = k * k * (3 - 2 * k); c.x = LANES[c.lane] + (LANES[c.toLane] - LANES[c.lane]) * e; }
        if (c.lc <= 0) { c.lane = c.toLane; c.x = LANES[c.lane]; c.ind = 0; }
      } else if (c.hit <= 0) {
        const blocked = lead !== null && gap < safe * 1.5 && lead < c.vd - 3;
        const playerNear = (lane, back, fwd) => active && Math.abs(LANES[lane] - player.x) < 2.9 && player.s > c.s - back - (player.v - c.v) * 2.2 && player.s < c.s + fwd;
        let to = -1;
        if (c.flashed > 0) { c.flashed -= dt; if (c.lane < 2 && this._free(c.lane + 1, c.s, 30, 45, c) && !playerNear(c.lane + 1, 12, 14)) to = c.lane + 1; }
        else if (blocked) { c.patience -= dt; if (c.patience <= 0 && c.lane > 0 && this._free(c.lane - 1, c.s, 55, 40, c) && !playerNear(c.lane - 1, 14, 12)) { to = c.lane - 1; } }
        else if (c.lane < 2 && c.kind !== 'truck' ? Math.random() < dt * 0.12 : c.lane === 1 && Math.random() < dt * 0.3) { if (this._free(c.lane + 1, c.s, 40, 160, c) && !playerNear(c.lane + 1, 14, 20)) to = c.lane + 1; }
        if (to >= 0) { c.toLane = to; c.lc = 2.5; c.ind = to < c.lane ? -1 : 1; c.patience = rand(3, 9); }
      }

      // --- visuals ------------------------------------------------------------
      const m = c.mesh, u = m.userData;
      m.position.set(c.x, 0, -c.s);
      m.rotation.y = c.lc > 0 && c.lc < 1.6 ? (LANES[c.toLane] - LANES[c.lane]) * -0.012 * Math.sin((1 - c.lc / 1.6) * Math.PI) : 0;
      const spin = c.v * dt / u.wheelR; for (const w of u.wheels) w.rotation.z -= spin;
      u.tail.emissiveIntensity = c.brake ? 7 : 0.25 + night * 1.6 + sky.cur.rain * 0.8;
      for (const i of u.ind.l) i.visible = c.ind < 0 && blink; for (const i of u.ind.r) i.visible = c.ind > 0 && blink;
    }
    MATS.head.emissiveIntensity = 0.5 + night * 5 + (sky.cur.rain + sky.cur.fog * 60) * 1.5;

    for (const c of this.oncoming) { c.s -= c.v * dt; c.mesh.position.z = -c.s; const spin = c.v * dt / c.mesh.userData.wheelR; for (const w of c.mesh.userData.wheels) w.rotation.z -= spin;
      c.mesh.userData.tail.emissiveIntensity = 0.3 + night * 1.5; }

    // despawn
    this.cars = this.cars.filter((c) => { if (c.s < player.s - 260 || c.s > player.s + 1100) { this._release(c); return false; } return true; });
    this.oncoming = this.oncoming.filter((c) => { if (c.s < player.s - 120) { this._release(c); return false; } return true; });
  }
}
