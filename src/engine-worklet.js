// Physically-inspired engine synthesiser.
// Every cylinder fires once per 720° cycle and excites a pair of decaying
// exhaust resonances. Summing the pulses gives the engine's firing-order
// harmonics; uneven spacing/level gives each layout its own rumble.
class EngineProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'rpm', defaultValue: 900, minValue: 300, maxValue: 12000, automationRate: 'k-rate' },
      { name: 'throttle', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }
  constructor() {
    super();
    this.phase = 0; this.rpm = 900; this.thr = 0; this.boost = 0; this.bov = 0; this.prevThr = 0;
    this.lp = [0, 0]; this.lp2 = [0, 0]; this.hp = [0, 0]; this.hpx = [0, 0]; this.nz = 0; this.wph = 0; this.popT = 1; this.popA = 0;
    this.setCfg({ cyl: 6, f1: 150, f2: 520, bright: 0.7, decay: 90, rasp: 0.3, turbo: 0.4, pops: 0.5, uneven: 0.08, gain: 1, redline: 7000 });
    this.port.onmessage = (e) => this.setCfg(e.data);
  }
  setCfg(c) {
    this.cfg = c; const n = c.cyl; this.cyls = [];
    for (let i = 0; i < n; i++) {
      // firing offset within the cycle, with layout-specific irregularity
      let off = i / n;
      if (n === 8) off += [0, 0.03, -0.035, 0.02, 0, -0.03, 0.035, -0.02][i] * c.uneven * 2.2;   // cross-plane burble
      else if (n === 10) off += (i % 2 ? 0.0125 : -0.0125);                                         // 90°/54° V10
      else off += (((i * 7919) % 13) / 13 - 0.5) * 0.01 * c.uneven;
      const bank = i % 2;
      const lvl = 1 + (((i * 2971) % 7) / 7 - 0.5) * c.uneven * (n === 8 ? 1.4 : 0.8);
      this.cyls.push({ off: ((off % 1) + 1) % 1, t: 1, a: 0, prev: 0, lvl, pan: bank ? 0.62 : 0.38, f1: c.f1 * (bank ? 1.04 : 0.97), f2: c.f2 * (bank ? 0.96 : 1.05), ph: i * 1.7 });
    }
    this.norm = 1.6 / Math.sqrt(n);
  }
  process(_, outputs, params) {
    const L = outputs[0][0], R = outputs[0][1] || L, c = this.cfg, dt = 1 / sampleRate, TAU = 6.283185307;
    const rpmT = params.rpm[0], thrT = params.throttle[0];
    if (this.prevThr > 0.6 && thrT < 0.2 && this.boost > 0.45 && c.turbo > 0.1) this.bov = this.boost;   // blow-off
    const lift = thrT < 0.05 && this.rpm > c.redline * 0.42;
    this.prevThr = thrT;
    for (let i = 0; i < L.length; i++) {
      this.rpm += (rpmT - this.rpm) * 0.0015; this.thr += (thrT - this.thr) * 0.004;
      const rn = this.rpm / c.redline, thr = this.thr;
      this.phase += this.rpm / 120 * dt; if (this.phase >= 1) this.phase -= 1;
      const load = 0.22 + 0.78 * thr;
      const decay = c.decay * (0.7 + rn * 1.6);
      let l = 0, r = 0, env = 0;
      for (let k = 0; k < this.cyls.length; k++) {
        const cy = this.cyls[k]; let p = this.phase + cy.off; if (p >= 1) p -= 1;
        if (p < cy.prev) { cy.t = 0; cy.a = cy.lvl * (0.86 + Math.random() * 0.28); }
        cy.prev = p; cy.t += dt;
        const e = cy.a * Math.exp(-cy.t * decay);
        const s = e * (Math.sin(TAU * cy.f1 * cy.t + cy.ph * 0.1) + c.bright * (0.25 + 0.75 * thr) * (0.5 + rn) * 0.8 * Math.sin(TAU * cy.f2 * cy.t));
        l += s * (1 - cy.pan); r += s * cy.pan; env += e;
      }
      // intake / exhaust rasp: noise gated by the firing pulses
      const white = Math.random() * 2 - 1; this.nz += (white - this.nz) * 0.35;
      const rasp = this.nz * env * c.rasp * (0.15 + thr) * (0.3 + rn) * 0.55;
      // overrun pops and crackles
      if (lift && c.pops > 0 && Math.random() < c.pops * 0.00018 * (0.4 + rn)) { this.popT = 0; this.popA = 0.5 + Math.random() * 0.9; }
      this.popT += dt; const pop = this.popA * Math.exp(-this.popT * 130) * (Math.random() * 2 - 1) * 1.6 * c.pops;
      // turbo whistle + blow-off
      this.boost += ((thr * Math.min(1, rn * 1.9)) - this.boost) * 0.00006;
      this.wph += (3200 + this.boost * 6800) * dt; if (this.wph > 1) this.wph -= 1;
      const whistle = Math.sin(TAU * this.wph) * this.boost * this.boost * c.turbo * 0.05;
      this.bov *= 0.99985; const bov = this.bov > 0.02 ? white * this.bov * c.turbo * 0.22 * (0.6 + 0.4 * Math.sin(TAU * 38 * this.popT)) : 0; if (this.bov > 0.02) this.bov -= dt * 2.2;
      const amp = this.norm * load * (0.55 + 0.6 * rn) * c.gain;
      // tone: off-throttle is duller, full throttle opens up
      const a = Math.min(0.95, 0.06 + 0.22 * thr + 0.3 * rn * (0.4 + 0.6 * thr) + c.bright * 0.12);
      for (let ch = 0; ch < 2; ch++) {
        let x = (ch ? r : l) * 2 * amp + (rasp + pop) * c.gain + whistle + bov;
        this.lp[ch] += (x - this.lp[ch]) * a; this.lp2[ch] += (this.lp[ch] - this.lp2[ch]) * Math.min(0.98, a * 1.8);
        x = this.lp2[ch];
        const y = x - this.hpx[ch] + 0.996 * this.hp[ch]; this.hpx[ch] = x; this.hp[ch] = y;   // DC / sub-rumble blocker
        x = Math.tanh(y * 1.7) * 0.62;
        (ch ? R : L)[i] = x;
      }
    }
    return true;
  }
}
registerProcessor('engine', EngineProcessor);
