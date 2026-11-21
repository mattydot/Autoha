// Autobahnpolizei. After a hit-and-run (touching another car and driving on)
// or extreme speeding past a speed camera, it escalates in three steps:
//  1. ANHALTEN: one patrol car comes up behind with blue lights (no siren),
//     overtakes, shows BITTE FOLGEN, slows down and pulls onto the hard
//     shoulder. Follow it and stop behind it: a ticket, and you drive on.
//  2. VERFOLGUNG: ignore it (pass it, run, or drive off) and the siren comes
//     on, backup arrives and they try to box you in: one behind, one in
//     front, one on each side. Stopped inside the box: arrested.
//  3. GROSSFAHNDUNG: still running after a while, and more cars and SEK vans
//     join and they get rough: hard brake checks, shoving, ramming.
// From the chase on, a helicopter follows overhead (no losing them while it
// is up) and patrols lay spike strips (Nagelsperren) across the road ahead:
// drive over one and the tyres are shredded.
// Outrun them, or keep away until they give up, and you are free. Ramming a
// patrol car skips straight to the chase.
import * as THREE from 'three';
import { LANES, PACE } from './world.js';
import { POLICE_SIGN, MATS } from './cars.js';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const POLICE_VMAX = 330 / 3.6;     // upgraded RS6 pursuit cars

export class Police {
  constructor() { this.reset(); }
  reset() { this.active = false; this.heat = 0; this.t = 0; this.queue = []; this.bustT = 0; this.slots = []; this.reason = ''; this._assignT = 0; this.cars = []; this.trail = [];
    this.phase = 'off'; this.defy = 0; this.stopT = 0; this.phaseT = 0; this.msgs = []; this.n = 3; this._warned = 0; this.farT = 0;
    this.heliOn = false; this.heliT = 0; this.spikeT = 0; for (const k of this.spikes || []) k.mesh.visible = false; this.spikes = []; }

  /* --------------------- helicopter and spike strips --------------------- */
  _build(frame) {
    if (this.heli) return; this.frame = frame;
    const g = new THREE.Group(), blue = new THREE.MeshStandardMaterial({ color: 0x1f4fa8, roughness: 0.4, metalness: 0.4 }), white = new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.35, metalness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.6 }), glass = MATS.glass;
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), white); body.scale.set(1.3, 1.25, 2.3); g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), blue); belly.scale.set(1.32, 1.27, 2.32); g.add(belly);
    const cab = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), glass); cab.scale.set(1.15, 0.9, 1.3); cab.position.set(0, 0.15, -1.1); g.add(cab);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 5.2, 10), blue); boom.rotation.x = Math.PI / 2; boom.position.set(0, 0.35, 3.8); g.add(boom);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.9), blue); fin.position.set(0, 1.0, 6.2); g.add(fin);
    for (const sd of [-1, 1]) { const sk = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.6), dark); sk.position.set(sd * 1.1, -1.55, 0); g.add(sk);
      for (const z of [-0.8, 0.8]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), dark); st.position.set(sd * 0.95, -1.3, z); g.add(st); } }
    const rotor = new THREE.Group(); rotor.position.y = 1.55; for (let k = 0; k < 4; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 10.5), dark); bl.rotation.y = k * Math.PI / 4 * 2 / 2; rotor.add(bl); } g.add(rotor);
    const tail = new THREE.Group(); tail.position.set(0.18, 1.0, 6.3); for (let k = 0; k < 2; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.16), dark); bl.rotation.x = k * Math.PI / 2; tail.add(bl); } g.add(tail);
    const lightM = new THREE.MeshBasicMaterial({ color: 0xffffff }); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), lightM); lamp.position.set(0, -1.1, -1.6); g.add(lamp);
    // search light (at night): a spot from the nose onto the car
    this.spot = new THREE.SpotLight(0xffffff, 0, 180, 0.16, 0.5, 1.2); this.spot.position.set(0, -1.1, -1.6); g.add(this.spot); this.spotTarget = new THREE.Object3D(); frame.add(this.spotTarget); this.spot.target = this.spotTarget;
    g.visible = false; frame.add(g); this.heli = g; this.rotor = rotor; this.tailRotor = tail; this.hp = { x: 0, y: 160, s: 0 };
    this.spikeMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.3, metalness: 0.9 });
  }
  _heliUpdate(dt, player, night) {
    const h = this.heli, P = this.hp, t = this.t;
    if (this.heliOn) { this.heliT -= dt; if (this.heliT <= 0) { this.heliOn = false; this._msg('HUBSCHRAUBER', 'Muss tanken · dreht ab', 'good'); } }
    const tx = player.x + Math.sin(t * 0.33) * 24, ty = this.heliOn ? 34 + Math.sin(t * 0.5) * 4 : 220, ts = player.s + (this.heliOn ? (150 + Math.sin(t * 0.21) * 50) * PACE : 700);   // ahead and low enough to be seen
    const k = Math.min(1, dt * (this.heliOn ? 1.6 : 0.4)); const vx = (tx - P.x) * k / Math.max(dt, 1e-3);
    P.x += (tx - P.x) * k; P.y += (ty - P.y) * k; P.s += (ts - P.s) * k;
    const show = this.heliOn || P.y < 200; h.visible = show; if (!show) return 0;
    h.position.set(P.x, P.y, -P.s); h.rotation.set(-0.12, Math.sin(t * 0.33 + 1.5) * 0.4, clamp(-vx * 0.02, -0.3, 0.3));
    this.rotor.rotation.y += dt * 38; this.tailRotor.rotation.x += dt * 60;
    this.spot.intensity = this.heliOn ? night * 4000 : 0; this.spotTarget.position.set(player.x, 0, -player.s);
    const d = Math.hypot(P.x - player.x, P.y, (P.s - player.s) / PACE); return clamp(1.4 - d / 120, 0, 1);
  }
  // Nagelsperre: a spiked strip across the player's road, a few hundred metres ahead
  _deploySpike(player, traffic) {
    const land = traffic.world.land, s = player.s + rand(480, 620) * PACE;
    let x0, x1;
    if (land.onAutobahn(player.x, player.s)) { const pl = LANES.reduce((b, l, i) => (Math.abs(l - player.x) < Math.abs(LANES[b] - player.x) ? i : b), 0), other = pl === 0 ? 1 : pl === 2 ? 1 : (Math.random() < 0.5 ? 0 : 2);
      x0 = LANES[Math.min(pl, other)] - 1.9; x1 = LANES[Math.max(pl, other)] + 1.9; }
    else { const rd = land.roadAt(player.x, player.s); if (!rd || !rd.has(s) || rd.kind === 'area') return; const xc = rd.xAt(s), hw = rd.hwAt(s); x0 = xc - hw; x1 = xc + hw; }
    let k = this.spikes.find((q) => !q.mesh.visible);
    if (!k) { const g = new THREE.Group(); const strip = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.7), new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.8 })); strip.position.y = 0.04; g.add(strip);
      // silver spikes: a row of little pyramids, drawn as a texture on a raised top (repeats with the width)
      if (!this.spikeTex) { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, 64, 64);
        for (const [cx, cy] of [[16, 16], [48, 48], [48, 16], [16, 48]]) { const gr = x.createLinearGradient(cx - 12, cy - 12, cx + 12, cy + 12); gr.addColorStop(0, '#f4f6f8'); gr.addColorStop(1, '#6a7078'); x.fillStyle = gr; x.beginPath(); x.moveTo(cx, cy - 13); x.lineTo(cx + 13, cy); x.lineTo(cx, cy + 13); x.lineTo(cx - 13, cy); x.closePath(); x.fill(); }
        this.spikeTex = new THREE.CanvasTexture(c); this.spikeTex.wrapS = THREE.RepeatWrapping; this.spikeTex.colorSpace = THREE.SRGBColorSpace; }
      const tm = new THREE.MeshStandardMaterial({ map: this.spikeTex.clone(), roughness: 0.3, metalness: 0.7 }); tm.map.wrapS = THREE.RepeatWrapping;
      const teeth = new THREE.Mesh(new THREE.BoxGeometry(1, 0.07, 0.5), tm); teeth.position.y = 0.1; g.add(teeth);
      const coneM = new THREE.MeshStandardMaterial({ color: 0xff5a0a, roughness: 0.6 }), white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2 });
      for (const sd of [-1, 1]) { const cn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 12), coneM); cn.position.y = 0.35; const band = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.1, 12), white); band.position.y = 0.42; const cg = new THREE.Group(); cg.add(cn, band); cg.userData.sd = sd; g.add(cg); }
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), new THREE.MeshStandardMaterial({ color: 0xe8e8e8 })); post.position.set(0.5, 0.7, 0); g.add(post);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: 0x1030ff, emissive: 0x2050ff, emissiveIntensity: 4 })); lamp.position.set(0.5, 1.45, 0); g.add(lamp);
      g.userData = { strip, teeth, post, lamp }; this.frame.add(g); k = { mesh: g }; this.spikes.push(k); }
    const u = k.mesh.userData, w = x1 - x0; u.strip.scale.x = w; u.teeth.scale.x = w * 0.98; u.teeth.material.map.repeat.set(w / 0.35, 1); u.post.position.x = w / 2 + 0.8; u.lamp.position.x = w / 2 + 0.8;
    for (const ch of k.mesh.children) if (ch.userData.sd) ch.position.set(ch.userData.sd * (w / 2 + 0.35), 0, 0.9);
    k.mesh.position.set((x0 + x1) / 2, 0, -s); k.mesh.visible = true; Object.assign(k, { s, x0, x1, hit: false });
    this._msg('NAGELSPERRE VORAUS', 'Polizei legt Krallen aus · ausweichen!');
  }
  _spikeUpdate(dt, player) {
    for (const k of this.spikes) {
      if (!k.mesh.visible) continue;
      k.mesh.userData.lamp.material.emissiveIntensity = ((performance.now() / 120) | 0) % 2 ? 6 : 0.3;
      const half = player.L / 2;
      if (!k.hit && player.s + half > k.s && player.s - half < k.s && player.x + 0.7 > k.x0 && player.x - 0.7 < k.x1 && !player.rolling) {
        k.hit = true; const both = player.x - 0.7 > k.x0 && player.x + 0.7 < k.x1; player.flats = Math.min(4, (player.flats || 0) + (both ? 4 : 2));
        this.events.push('spikes'); this._msg('REIFEN PLATT!', 'Über die Nagelsperre gefahren');
      }
      if (player.s > k.s + 400 || player.s < k.s - 2500) k.mesh.visible = false;
    }
  }
  _msg(title, sub, kind = 'bad') { this.msgs.push({ title, sub, kind }); }
  get lead() { return this.cars.find((c) => c.role === 'lead' && !c.crashed && !c.leaving); }

  // from the polite stop to a proper chase: siren, backup, boxing in
  escalate(why) {
    if (this.phase !== 'stop') return;
    this.phase = 'chase'; this.phaseT = 0; this.defy = 0; this.stopT = 0; this.heat = Math.max(this.heat, 70);
    for (const c of this.cars) c.role = null;
    const t = this.t; this.queue.push({ at: t + 1.2, where: 'behind', lane: 0 }, { at: t + 2.6, where: 'behind', lane: 2 }, { at: t + 5, where: 'ahead' }, { at: t + 8, where: 'behind', lane: 1, kind: 'swat' });
    if (this.n >= 4) this.queue.push({ at: t + 12, where: 'behind' });
    this.queue.sort((a, b) => a.at - b.at);
    this.heliOn = true; this.heliT = 95; this.spikeT = 14;
    this._msg('VERFOLGUNG', why || 'Anhaltesignal ignoriert · Verstärkung kommt');
  }

  // the road the player was on when they passed road position s (null = the Autobahn); used to follow them off it
  roadFor(s) { let r = undefined; for (const t of this.trail) { if (t.s > s) break; r = t.road; } return r === undefined ? (this.trail[0]?.road ?? null) : r; }

  get chasing() { return this.cars.filter((c) => !c.crashed && !c.leaving); }

  /** returns true if this starts a new chase */
  trigger(reason, heat, n) {
    this.reason = reason;
    if (this.active) {
      if (this.phase === 'stop') { this.escalate(reason === 'WIDERSTAND' ? 'Streifenwagen gerammt' : 'Noch ein Verstoß'); return false; }
      this.heat = Math.min(120, Math.max(this.heat, heat) + 10); if (this.chasing.length + this.queue.length < 4) this.queue.push({ at: this.t + 3, where: 'behind' }); return false; }
    this.active = true; this.heat = heat; this.t = 0; this.bustT = 0; this.n = n; this.defy = 0; this.stopT = 0; this.phaseT = 0; this._warned = 0; this.farT = 0;
    if (reason === 'WIDERSTAND') { this.phase = 'stop'; this.queue = []; this.escalate('Widerstand'); return true; }
    // first, a single car to pull the driver over politely
    this.phase = 'stop'; this.queue = [{ at: 0.4, where: 'behind', role: 'lead' }];
    return true;
  }

  _spawn(q, player, traffic) {
    const land = traffic.world.land;
    if (!land.onAutobahn(player.x, player.s)) {   // off the Autobahn: come up behind on the road the player took
      const s = player.s - rand(240, 330), rd = this.roadFor(s);
      const c = traffic.add(q.kind || 'police', 2, s, clamp(player.v + 15, 30, POLICE_VMAX), { police: true, slot: null, leaving: false, wait: false, role: q.role || null, pull: 'approach', pullT: 0 });
      if (rd && rd.has(s)) c.x = rd.xAt(s) + (rd.kind === 'ramp' ? 0 : 2.2);
      this.cars.push(c); return;
    }
    let lane = q.lane ?? ((Math.random() * 3) | 0), s, v;
    if (q.where === 'ahead') { s = player.s + rand(650, 800); v = 22; lane = 2; }
    else { s = player.s - rand(230, 320); v = clamp(player.v + 22, 45, POLICE_VMAX); }
    for (let k = 0; k < 3 && !traffic._free(lane, s, 30, 30); k++) lane = (lane + 1) % 3;
    const c = traffic.add(q.kind || 'police', lane, s, v, { police: true, slot: null, leaving: false, wait: q.where === 'ahead', role: q.role || null, pull: 'approach', pullT: 0 });
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
  update(dt, player, traffic, night = 0) {
    this.cars = this.cars.filter((c) => traffic.cars.includes(c));
    this._build(traffic.world.frame); this.events = [];
    this.heliLevel = this._heliUpdate(dt, player, night); this._spikeUpdate(dt, player);
    const blink = ((performance.now() / 1100) | 0) % 2;
    POLICE_SIGN.draw(!this.active ? 'POLIZEI' : this.phase === 'stop' ? (this.lead && this.lead.pull !== 'approach' ? 'BITTE FOLGEN' : blink ? 'POLIZEI' : 'BITTE FOLGEN') : blink ? 'STOP POLIZEI' : 'POLIZEI');
    // remember which road the player is on, every 8 m, for the patrol cars that follow
    const land = traffic.world.land, off = !land.onAutobahn(player.x, player.s), rd = off ? land.roadAt(player.x, player.s) : null;
    const last = this.trail[this.trail.length - 1];
    if (!last || player.s - last.s > 8 || last.road !== rd) this.trail.push({ s: player.s, road: rd });
    while (this.trail.length > 2 && this.trail[1].s < player.s - 3000) this.trail.shift();
    this.off = off;
    if (!this.active) return null;
    this.t += dt;
    while (this.queue.length && this.queue[0].at <= this.t) this._spawn(this.queue.shift(), player, traffic);
    this.phaseT += dt;
    if (this.phase === 'stop') return this._stopPhase(dt, player);
    if (this.phase === 'chase' && this.phaseT > 32 && this.heat > 25) {   // still running: Großfahndung
      this.phase = 'hunt'; this.phaseT = 0; this.heat = Math.min(120, this.heat + 35);
      this.queue.push({ at: this.t + 1, where: 'behind', lane: 1 }, { at: this.t + 3, where: 'behind', lane: 0, kind: 'swat' }, { at: this.t + 5, where: 'ahead' }, { at: this.t + 7, where: 'behind', lane: 2, kind: 'swat' }, { at: this.t + 10, where: 'behind', lane: 1 });
      this.heliOn = true; this.heliT = Math.max(this.heliT, 80); this.spikeT = Math.min(this.spikeT, 6);
      this._msg('GROSSFAHNDUNG', 'SEK, Hubschrauber, Nagelsperren · sie rammen');
    }
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
    // spike strips ahead every so often
    this.spikeT -= dt; if (this.spikeT <= 0 && !this.spikes.some((k) => k.mesh.visible && !k.hit && k.s > player.s)) { this._deploySpike(player, traffic); this.spikeT = this.phase === 'hunt' ? rand(14, 20) : rand(24, 32); }
    // lost them? (not while the helicopter is overhead)
    const closest = live.reduce((d, c) => Math.min(d, Math.abs(c.s - player.s)), Infinity);
    this.heat -= dt * (this.heliOn ? 0.1 : closest < 150 ? 0.25 : 1);
    if (!this.heliOn && this.queue.length === 0 && (live.length === 0 || live.every((c) => player.s - c.s > 520))) return this._end('escaped');
    if (this.heat <= 0) return this._end('gaveup');
    return null;
  }

  // polite stop: watch whether the driver follows the patrol car and stops behind it
  _stopPhase(dt, player) {
    const c = this.lead;
    if (!c) { if (this.queue.length) return null; this.escalate('Streifenwagen ausgefallen'); return null; }
    const rel = c.s - player.s, ahead = c.pull !== 'approach';
    // running away before they even catch up
    if (rel < -420) this.farT += dt; else this.farT = Math.max(0, this.farT - dt);
    if (this.farT > 5) { this.escalate('Flucht vor der Polizei'); return null; }
    if (ahead) {
      const passed = rel < -8 && c.pull !== 'pass', left = Math.abs(c.x - player.x) > 25, fast = player.v > c.vs + 9 && rel < 30;
      if (passed || left || fast) this.defy += dt; else this.defy = Math.max(0, this.defy - dt * 0.6);
      if (this.defy > 1.2 && this._warned < 2) { this._warned = 2; this._msg('BITTE FOLGEN!', 'Hinter dem Streifenwagen bleiben und anhalten'); }
      if (this.defy > 3.5) { this.escalate(passed ? 'Streifenwagen überholt' : left ? 'Abgefahren statt zu folgen' : 'Davongerast'); return null; }
    }
    // pulled over: both stopped, the driver right behind the patrol car
    if (c.pull === 'stopped' && player.speed < 1 && rel > 2 && rel < 45 && Math.abs(c.x - player.x) < 6) this.stopT += dt; else this.stopT = Math.max(0, this.stopT - dt);
    if (this.stopT > 2.5) { this.active = false; this.phase = 'off'; this.queue = []; for (const k of this.cars) { k.leaving = true; k.slot = null; k.role = null; } return 'ticket'; }
    return null;
  }

  // the polite lead car: where it wants to be (lane x and speed) on the Autobahn
  _leadTarget(c, dt, player) {
    const pl = LANES.reduce((b, l, i) => (Math.abs(l - player.x) < Math.abs(LANES[b] - player.x) ? i : b), 0);
    const rel = c.s - player.s, dp = (ds) => { const d = (player.s + ds - c.s) / PACE; return clamp(player.v + Math.sign(d) * Math.min(Math.sqrt(2 * 5 * Math.abs(d)), Math.abs(d) * 1.1), 0, POLICE_VMAX); };
    c.pullT += dt;
    switch (c.pull) {
      case 'approach': {   // lights on, sit behind the driver for a moment
        if (Math.abs(rel + 16) < 14) { c.nearT = (c.nearT || 0) + dt; if (!this._warned) { this._warned = 1; this._msg('POLIZEI', 'Blaulicht hinter dir · Anhaltesignal folgt', ''); } }
        if ((c.nearT || 0) > 2.5 || (player.speed < 3 && rel > -60)) { c.pull = 'pass'; c.pullT = 0; }
        return [LANES[pl], Math.min(dp(-16), player.v + 16)]; }   // close in calmly
      case 'pass': {        // overtake in the next lane
        const lane = pl > 0 ? pl - 1 : pl + 1;
        if (rel > 18) { c.pull = 'lead'; c.pullT = 0; c.leadV = clamp(player.v, 20, 130 / 3.6); this._msg('BITTE FOLGEN', 'Dem Streifenwagen folgen · er führt dich raus', ''); }
        return [LANES[lane], Math.min(POLICE_VMAX, Math.max(player.v + 9, dp(24)))]; }
      case 'lead': {        // in front, slowing down gently to 80
        c.leadV = Math.max(80 / 3.6, c.leadV - 0.7 * dt);
        if (c.pullT > 9 && c.leadV <= 80 / 3.6 + 0.5 && rel > 4 && rel < 80) { c.pull = 'pull'; c.pullT = 0; this._msg('ANHALTEN', 'Rechts auf den Seitenstreifen', ''); }
        return [LANES[pl], rel > 70 ? c.leadV * 0.75 : rel < 12 ? c.leadV + 2 : c.leadV]; }
      case 'pull': {        // onto the hard shoulder and stop
        c.leadV = Math.max(0, c.leadV - (c.x > 6 ? 2.2 : 0.6) * dt); if (c.leadV < 0.3 && c.vs < 0.5) { c.pull = 'stopped'; c.pullT = 0; }
        return [7.0, c.leadV]; }
      default: return [7.0, 0];
    }
  }

  // pursuit on country roads and ramps: follow the player's route, one car on the bumper, one gets in front
  _landControl(c, dt, player, traffic) {
    const land = traffic.world.land;
    let rd = c.s <= player.s ? this.roadFor(c.s) : land.roadAt(player.x, player.s);
    if (!rd || !rd.has(c.s)) rd = land.roadAt(c.x, c.s) || rd;
    const live = this.chasing, idx = live.indexOf(c), isLead = this.phase === 'stop' && c.role === 'lead';
    const front = isLead ? c.pull !== 'approach' : idx === 1, ds = isLead ? (c.pull === 'approach' ? -15 : 18) : front ? 18 : idx === 0 ? -13 : -13 - (idx - 1) * 16;
    if (isLead) { c.pullT += dt; if (c.pull === 'approach' && (Math.abs(c.s - player.s + 15) < 12 ? (c.nearT = (c.nearT || 0) + dt) > 2.5 : false)) { c.pull = 'pass'; c.pullT = 0; this._msg('POLIZEI', 'Blaulicht hinter dir · Anhaltesignal folgt', ''); }
      if (c.pull === 'pass' && c.s > player.s + 16) { c.pull = 'lead'; c.pullT = 0; c.leadV = clamp(player.v, 15, 90 / 3.6); this._msg('BITTE FOLGEN', 'Dem Streifenwagen folgen und anhalten', ''); } }
    const d = player.s + ds - c.s;
    // close in no faster than they can still brake for (about 6 m/s² over the real distance)
    const dp = Math.abs(d) / PACE;
    let vt = clamp(player.v + Math.sign(d) * Math.min(Math.sqrt(2 * 6 * dp), dp * 1.2 + (dp > 30 ? 10 : 0)), 0, POLICE_VMAX);
    if (front && d < 6 && d > -8) vt = Math.max(0, player.v - (this.phase === 'hunt' ? 9 : 3.5));
    if (isLead && (c.pull === 'lead' || c.pull === 'pull' || c.pull === 'stopped')) {   // lead the driver, slow down, pull over at the edge
      c.leadV = Math.max(c.pull === 'lead' ? 60 / 3.6 : 0, (c.leadV ?? c.vs) - (c.pull === 'lead' ? 0.6 : 1.6) * dt);
      if (c.pull === 'lead' && c.pullT > 8 && c.s - player.s < 70) { c.pull = 'pull'; c.pullT = 0; this._msg('ANHALTEN', 'Rechts ranfahren', ''); }
      if (c.pull === 'pull' && c.leadV < 0.3 && c.vs < 0.5) c.pull = 'stopped';
      vt = c.s - player.s > 70 ? c.leadV * 0.7 : c.leadV; }
    // corners: even the Polizei has to slow down (they are just braver)
    if (rd && rd.has(c.s + 40)) { const k = Math.abs(rd.curv(c.s + 40)); if (k > 2e-4) vt = Math.min(vt, Math.sqrt(7 / (k * PACE))); }
    // lane: right lane, or the left one while getting past the player
    let off = rd && rd.kind === 'land' ? 2.2 : rd && rd.kind === 'kreis' ? 1.75 : 0;
    if (front && c.s < player.s + 10 && c.s > player.s - 40) { off = -off || -1.6; vt = Math.max(vt, player.v + 8); }
    if (isLead && (c.pull === 'pull' || c.pull === 'stopped') && rd) off = rd.hw - 0.9;   // to the right edge
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

  _end(result) { this.heliOn = false; this.active = false; this.queue = []; this.bustT = 0; for (const c of this.cars) { c.leaving = true; c.slot = null; } return result; }

  /** driving for one patrol car (called from traffic.update) */
  control(c, dt, player, traffic) {
    const land = traffic.world.land;
    const onLand = !land.onAutobahn(c.x, c.s) || (this.off && this.roadFor(c.s));
    if (onLand && !c.leaving) return this._landControl(c, dt, player, traffic);
    // the player left the Autobahn behind this car's position: this one has lost them
    if (this.off && c.s > player.s + 30 && !c.leaving && land.onAutobahn(c.x, c.s)) { c.leaving = true; c.slot = null; }
    let tx = LANES[c.lane], vt;
    const hunt = this.phase === 'hunt', isLead = this.phase === 'stop' && c.role === 'lead';
    if (isLead) [tx, vt] = this._leadTarget(c, dt, player);
    else if (c.leaving) { vt = 30; tx = LANES[2]; }
    else if (c.slot) {
      const sl = c.slot, ts = player.s + sl.ds, d = ts - c.s;
      tx = LANES[sl.lane];
      if (d > 90) vt = POLICE_VMAX;                                             // catching up
      else if (d < -40 && c.wait) vt = Math.max(player.v < 8 ? 0 : 6, player.v - clamp(-d / PACE * 0.07, 6, 38));   // up ahead: let the player catch up
      // close in no faster than they could still brake (~5 m/s²) to hold position
      else vt = clamp(player.v + Math.sign(d) * Math.min(Math.sqrt(2 * 2.5 * Math.abs(d) / PACE), Math.abs(d) / PACE, d > 0 ? 12 : 12), 0, POLICE_VMAX);
      // in front of the player: brake gently and slow them down
      if (sl.name === 'front' && d < 6 && d > -10 && Math.abs(c.x - player.x) < 1.6) vt = Math.max(0, player.v - (hunt ? 9 : 3.5));   // Großfahndung: hard brake checks
      const rough = hunt || this.phase === 'chase';
      if (rough && (sl.name === 'left' || sl.name === 'right') && Math.abs(c.s - player.s) < 3.5) tx = player.x + Math.sign(c.x - player.x) * ((player.footW + c.W) / 2 - (hunt ? 0.45 : 0.15));   // shoving
      if (rough && sl.name === 'back' && d > -8) vt = player.v + (c.kind === 'swat' ? 4 : hunt ? 2 : 0.8);   // ramming from behind (SEK vans hardest)
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
    const rough = (hunt || this.phase === 'chase') && c.slot && (c.slot.name === 'back');
    if (!rough && pg > -2 && pg < gap && Math.abs(player.x - c.x) < (player.footW + c.W) / 2 + 0.1) { gap = pg; lead = player.v; safe = 2.5 + c.vs * 0.14; }   // they sit right on your bumper
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
      if (!((hunt || this.phase === 'chase') && c.slot && c.slot.name !== 'back') && Math.abs(player.s - c.s) < (player.L + c.L) / 2 + 0.8 && Math.abs(player.x - nx) < (player.footW + c.W) / 2) clear = false;
      if (clear) c.x += clamp(tx - c.x, -4.2 * dt, 4.2 * dt);
    }
    c.lane = LANES.reduce((b, l, i) => (Math.abs(l - c.x) < Math.abs(LANES[b] - c.x) ? i : b), 0); c.toLane = c.lane;
    c.vx = (c.x - x0) / Math.max(dt, 1e-4); c.psi = Math.atan2(c.vx, Math.max(c.vs, 5) * PACE); c.r = 0; c.ind = 0;
    // blue lights: double flash, alternating sides
    const u = c.mesh.userData; if (u.blue) { const k = ((performance.now() / 60) | 0) % 8; u.blue[0].emissiveIntensity = !c.leaving && (k === 0 || k === 2) ? 10 : 0.2; u.blue[1].emissiveIntensity = !c.leaving && (k === 4 || k === 6) ? 10 : 0.2; }
  }
}
