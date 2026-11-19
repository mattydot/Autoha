// Autobahnpolizei. A chase starts after a hit-and-run (touching another car
// and driving on) or extreme speeding past a speed camera. Patrol cars come
// up from behind (and one waits further ahead), then try to box the player
// in: one behind, one in front, one on each side, but never on a side where
// there is no lane. Box the player in and bring them to a stop and it is
// over. Outrun them, or keep away until they give up, and you are free.
import { LANES, PACE } from './world.js';
import { POLICE_SIGN } from './cars.js';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const POLICE_VMAX = 330 / 3.6;     // upgraded RS6 pursuit cars

export class Police {
  constructor() { this.reset(); }
  reset() { this.active = false; this.heat = 0; this.t = 0; this.queue = []; this.bustT = 0; this.slots = []; this.reason = ''; this._assignT = 0; this.cars = []; this.trail = []; }

  // the road the player was on when they passed road position s (null = the Autobahn); used to follow them off it
  roadFor(s) { let r = undefined; for (const t of this.trail) { if (t.s > s) break; r = t.road; } return r === undefined ? (this.trail[0]?.road ?? null) : r; }

  get chasing() { return this.cars.filter((c) => !c.crashed && !c.leaving); }

  /** returns true if this starts a new chase */
  trigger(reason, heat, n) {
    this.reason = reason;
    if (this.active) { this.heat = Math.min(120, Math.max(this.heat, heat) + 10); if (this.chasing.length + this.queue.length < 4) this.queue.push({ at: this.t + 3, where: 'behind' }); return false; }
    this.active = true; this.heat = heat; this.t = 0; this.bustT = 0;
    this.queue = [{ at: 0.4, where: 'behind', lane: 0 }, { at: 1.4, where: 'behind', lane: 2 }];
    if (n >= 3) this.queue.push({ at: 5, where: 'ahead' });
    if (n >= 4) this.queue.push({ at: 9, where: 'behind' });
    return true;
  }

  _spawn(q, player, traffic) {
    const land = traffic.world.land;
    if (!land.onAutobahn(player.x, player.s)) {   // off the Autobahn: come up behind on the road the player took
      const s = player.s - rand(240, 330), rd = this.roadFor(s);
      const c = traffic.add('police', 2, s, clamp(player.v + 15, 30, POLICE_VMAX), { police: true, slot: null, leaving: false, wait: false });
      if (rd && rd.has(s)) c.x = rd.xAt(s) + (rd.kind === 'ramp' ? 0 : 1.75);
      this.cars.push(c); return;
    }
    let lane = q.lane ?? ((Math.random() * 3) | 0), s, v;
    if (q.where === 'ahead') { s = player.s + rand(650, 800); v = 22; lane = 2; }
    else { s = player.s - rand(230, 320); v = clamp(player.v + 22, 45, POLICE_VMAX); }
    for (let k = 0; k < 3 && !traffic._free(lane, s, 30, 30); k++) lane = (lane + 1) % 3;
    const c = traffic.add('police', lane, s, v, { police: true, slot: null, leaving: false, wait: q.where === 'ahead' });
    this.cars.push(c);
  }

  _slotsFor(player) {
    const pl = LANES.reduce((b, l, i) => (Math.abs(l - player.x) < Math.abs(LANES[b] - player.x) ? i : b), 0), gap = player.L / 2 + 2.6 + 2.5;
    const slots = [{ name: 'front', lane: pl, ds: gap + 1.5 }, { name: 'back', lane: pl, ds: -gap }];
    if (pl > 0) slots.push({ name: 'left', lane: pl - 1, ds: 0.3 });
    if (pl < 2) slots.push({ name: 'right', lane: pl + 1, ds: -0.3 });
    return slots;
  }

  /** per frame. Returns 'busted' | 'escaped' | 'gaveup' | null */
  update(dt, player, traffic) {
    this.cars = this.cars.filter((c) => traffic.cars.includes(c));
    POLICE_SIGN.draw(!this.active ? 'POLIZEI' : ((performance.now() / 1200) | 0) % 2 ? 'BITTE FOLGEN' : 'POLIZEI');
    // remember which road the player is on, every 8 m, for the patrol cars that follow
    const land = traffic.world.land, off = !land.onAutobahn(player.x, player.s), rd = off ? land.roadAt(player.x, player.s) : null;
    const last = this.trail[this.trail.length - 1];
    if (!last || player.s - last.s > 8 || last.road !== rd) this.trail.push({ s: player.s, road: rd });
    while (this.trail.length > 2 && this.trail[1].s < player.s - 3000) this.trail.shift();
    this.off = off;
    if (!this.active) return null;
    this.t += dt;
    while (this.queue.length && this.queue[0].at <= this.t) this._spawn(this.queue.shift(), player, traffic);
    const live = this.chasing;
    // who takes which position around the player
    this._assignT -= dt;
    if (this._assignT <= 0) {
      this._assignT = 0.5; this.slots = this._slotsFor(player);
      const free = [...live]; for (const c of live) c.slot = null;
      // fill the most important positions first: behind, then front, then the sides
      for (const name of ['back', 'front', 'left', 'right']) {
        const sl = this.slots.find((x) => x.name === name); if (!sl || !free.length) continue;
        let best = 0, bc = Infinity;
        free.forEach((c, i) => { const cost = Math.abs(c.s - (player.s + sl.ds)) + 6 * Math.abs(c.x - LANES[sl.lane]) + (c.wait && name === 'front' ? -500 : 0); if (cost < bc) { bc = cost; best = i; } });
        free.splice(best, 1)[0].slot = sl;
      }
    }
    // boxed in and stopped: arrested
    const near = live.filter((c) => Math.hypot(c.x - player.x, c.s - player.s) < 12).length;
    if (near >= 1 && player.speed < 4) this.bustT += dt * (near >= 2 ? 1.5 : 0.75); else this.bustT = Math.max(0, this.bustT - dt * 0.5);
    if (this.bustT > 2.4) return this._end('busted');
    // lost them?
    const closest = live.reduce((d, c) => Math.min(d, Math.abs(c.s - player.s)), Infinity);
    this.heat -= dt * (closest < 150 ? 0.25 : 1);
    if (this.queue.length === 0 && (live.length === 0 || live.every((c) => player.s - c.s > 520))) return this._end('escaped');
    if (this.heat <= 0) return this._end('gaveup');
    return null;
  }

  // pursuit on country roads and ramps: follow the player's route, one car on the bumper, one gets in front
  _landControl(c, dt, player, traffic) {
    const land = traffic.world.land;
    let rd = c.s <= player.s ? this.roadFor(c.s) : land.roadAt(player.x, player.s);
    if (!rd || !rd.has(c.s)) rd = land.roadAt(c.x, c.s) || rd;
    const live = this.chasing, idx = live.indexOf(c), front = idx === 1, ds = front ? 18 : idx === 0 ? -13 : -13 - (idx - 1) * 16;
    const d = player.s + ds - c.s;
    // close in no faster than they can still brake for (about 6 m/s² over the real distance)
    const dp = Math.abs(d) / PACE;
    let vt = clamp(player.v + Math.sign(d) * Math.min(Math.sqrt(2 * 6 * dp), dp * 1.2 + (dp > 30 ? 10 : 0)), 0, POLICE_VMAX);
    if (front && d < 6 && d > -8) vt = Math.max(0, player.v - 3.5);
    // corners: even the Polizei has to slow down (they are just braver)
    if (rd && rd.has(c.s + 40)) { const k = Math.abs(rd.curv(c.s + 40)); if (k > 2e-4) vt = Math.min(vt, Math.sqrt(7 / (k * PACE))); }
    // lane: right lane, or the left one while getting past the player
    let off = rd && rd.kind === 'land' ? 1.75 : rd && rd.kind === 'kreis' ? 1.35 : 0;
    if (front && c.s < player.s + 10 && c.s > player.s - 40) { off = -off || -1.6; vt = Math.max(vt, player.v + 8); }
    // do not drive into the back of anyone in the lane
    let gap = 1e9, lead = null;
    for (const o of traffic.cars) { if (o === c) continue; const g = o.s - o.L / 2 - (c.s + c.L / 2); if (g > -2 && g < gap && Math.abs(o.x - c.x) < (o.W + c.W) / 2 + 0.2) { gap = g; lead = o.crashed ? 0 : Math.max(0, o.vs); } }
    const pg = player.s - player.L / 2 - (c.s + c.L / 2); if (pg > -2 && pg < gap && Math.abs(player.x - c.x) < (player.footW + c.W) / 2 + 0.1) { gap = pg; lead = player.v; }
    gap /= PACE; const safe = 2.5 + c.vs * 0.14;
    if (lead !== null && gap < safe * 2) vt = Math.min(vt, gap < safe ? lead * Math.max(0, gap / safe) : lead + 2);
    const acc = clamp((vt - c.vs) * 4, -12, c.vs < 40 ? 8 : 5);
    c.vs = Math.max(0, c.vs + acc * dt); c.brake = acc < -2 ? 1 : 0; c.s += c.vs * dt * PACE;
    // follow the road's centre line exactly, easing only the lane offset (so they never cut across the grass)
    const x0 = c.x;
    if (rd && rd.has(c.s)) { if (c.landRoad !== rd) { c.landRoad = rd; c.off = c.x - rd.xAt(c.s); }
      c.off += clamp(off - c.off, -3.5 * dt, 3.5 * dt); c.x = rd.xAt(c.s) + c.off; }
    c.vx = (c.x - x0) / Math.max(dt, 1e-4) / PACE; c.psi = Math.atan2(c.vx, Math.max(c.vs, 5)); c.r = 0; c.ind = 0; c.slot = null;
    const u = c.mesh.userData; if (u.blue) { const k = ((performance.now() / 60) | 0) % 8; u.blue[0].emissiveIntensity = k === 0 || k === 2 ? 10 : 0.2; u.blue[1].emissiveIntensity = k === 4 || k === 6 ? 10 : 0.2; }
  }

  _end(result) { this.active = false; this.queue = []; this.bustT = 0; for (const c of this.cars) { c.leaving = true; c.slot = null; } return result; }

  /** driving for one patrol car (called from traffic.update) */
  control(c, dt, player, traffic) {
    const land = traffic.world.land;
    const onLand = !land.onAutobahn(c.x, c.s) || (this.off && this.roadFor(c.s));
    if (onLand && !c.leaving) return this._landControl(c, dt, player, traffic);
    // the player left the Autobahn behind this car's position: this one has lost them
    if (this.off && c.s > player.s + 30 && !c.leaving && land.onAutobahn(c.x, c.s)) { c.leaving = true; c.slot = null; }
    let tx = LANES[c.lane], vt;
    if (c.leaving) { vt = 30; tx = LANES[2]; }
    else if (c.slot) {
      const sl = c.slot, ts = player.s + sl.ds, d = ts - c.s;
      tx = LANES[sl.lane];
      if (d > 90) vt = POLICE_VMAX;                                             // catching up
      else if (d < -40 && c.wait) vt = Math.max(player.v < 8 ? 0 : 6, player.v - clamp(-d / PACE * 0.07, 6, 38));   // up ahead: let the player catch up
      // close in no faster than they could still brake (~5 m/s²) to hold position
      else vt = clamp(player.v + Math.sign(d) * Math.min(Math.sqrt(2 * 2.5 * Math.abs(d) / PACE), Math.abs(d) / PACE, d > 0 ? 12 : 12), 0, POLICE_VMAX);
      // in front of the player: brake gently and slow them down
      if (sl.name === 'front' && d < 6 && d > -10 && Math.abs(c.x - player.x) < 1.6) vt = Math.max(0, player.v - 3.5);
      if (d > -40) c.wait = false;
      // to get in front of the player, overtake in a free lane next to them, then cut in
      if (sl.name === 'front' && c.s < player.s + player.L / 2 + c.L / 2 + 3 && c.s > player.s - 120) {
        const opts = [sl.lane - 1, sl.lane + 1].filter((l) => l >= 0 && l < 3);
        let pass = opts[0], best = -1;
        for (const l of opts) { let g = 300; for (const o of traffic.cars) if (o !== c && Math.abs(o.x - LANES[l]) < 2 && o.s > c.s - 8 && o.s < player.s + 60) g = Math.min(g, o.s - c.s); if (g > best) { best = g; pass = l; } }
        tx = LANES[pass]; vt = Math.max(vt, player.v + 9);
      }
      // far behind: use whichever lane is clear
      if (d > 70) { let best = c.lane, bg = -1;
        for (let l = 0; l < 3; l++) { let g = 400; for (const o of traffic.cars) if (o !== c && Math.abs(o.x - LANES[l]) < 2 && o.s > c.s - 6) g = Math.min(g, o.s - c.s); g -= Math.abs(l - c.lane) * 20; if (g > bg) { bg = g; best = l; } }
        tx = LANES[best]; }
    } else vt = clamp(player.v, 0, POLICE_VMAX) - 2;
    // follow the leader so they do not plough through traffic (the player is fair game to get close to)
    let gap = 1e9, lead = null;
    for (const o of traffic.cars) { if (o === c) continue; const g = o.s - o.L / 2 - (c.s + c.L / 2); if (g > -2 && g < gap && Math.abs(o.x - c.x) < (o.W + c.W) / 2 + 0.2) { gap = g; lead = o.crashed ? 0 : o.vs; } }
    let safe = 3 + c.vs * 0.25;
    const pg = player.s - player.L / 2 - (c.s + c.L / 2);
    if (pg > -2 && pg < gap && Math.abs(player.x - c.x) < (player.footW + c.W) / 2 + 0.1) { gap = pg; lead = player.v; safe = 2.5 + c.vs * 0.14; }   // they sit right on your bumper
    gap /= PACE;   // in speedometer metres: the road goes by PACE times faster, so they need that much more room
    if (lead !== null && gap < safe * 2) vt = Math.min(vt, gap < safe ? lead * Math.max(0, gap / safe) : lead + 2);
    // closing too fast for the gap: brake now
    if (lead !== null && c.vs > lead && (c.vs - lead) ** 2 / (2 * Math.max(0.5, gap - safe * 0.6)) > 3.5) vt = Math.min(vt, lead - 2);
    const acc = clamp((vt - c.vs) * 4, gap < 8 ? -14 : -11, c.vs < 50 ? 9 : c.vs < 75 ? 6 : 3.5);
    c.vs = Math.max(0, c.vs + acc * dt); c.brake = acc < -2 ? 1 : 0; c.s += c.vs * dt * PACE;
    // sideways: move over only when the target lane is clear next to us
    const x0 = c.x, dir = Math.sign(tx - c.x);
    if (dir) {
      let clear = true; const nx = c.x + dir * 1.2;
      for (const o of traffic.cars) if (o !== c && Math.abs(o.s - c.s) < (o.L + c.L) / 2 + 1.5 && Math.abs(o.x - nx) < (o.W + c.W) / 2) { clear = false; break; }
      if (Math.abs(player.s - c.s) < (player.L + c.L) / 2 + 0.8 && Math.abs(player.x - nx) < (player.footW + c.W) / 2) clear = false;
      if (clear) c.x += clamp(tx - c.x, -4.2 * dt, 4.2 * dt);
    }
    c.lane = LANES.reduce((b, l, i) => (Math.abs(l - c.x) < Math.abs(LANES[b] - c.x) ? i : b), 0); c.toLane = c.lane;
    c.vx = (c.x - x0) / Math.max(dt, 1e-4); c.psi = Math.atan2(c.vx, Math.max(c.vs, 5) * PACE); c.r = 0; c.ind = 0;
    // blue lights: double flash, alternating sides
    const u = c.mesh.userData; if (u.blue) { const k = ((performance.now() / 60) | 0) % 8; u.blue[0].emissiveIntensity = !c.leaving && (k === 0 || k === 2) ? 10 : 0.2; u.blue[1].emissiveIntensity = !c.leaving && (k === 4 || k === 6) ? 10 : 0.2; }
  }
}
