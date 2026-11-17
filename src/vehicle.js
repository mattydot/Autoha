// Player vehicle dynamics. No three.js here, so it can be tested on its own.
//
// Coordinates: x is lateral (+ right), s is distance along the road (+ ahead),
// psi is heading (0 = straight down the road, + = nose to the right), r is yaw
// rate (+ = turning right).
//
// Model: a planar rigid body on two axles. Each axle gets a lateral tyre force
// from its slip angle (it peaks, then falls off, so a car past the limit
// slides instead of turning harder), longitudinal drive/brake force, load
// transfer under braking and acceleration, and a friction circle so braking or
// accelerating while turning eats into the grip available for cornering.
// Grip is sampled under each of the four wheels, so one side on oil really
// does lose grip and pulls the car round. A car sliding sideways fast enough
// can trip and roll over.
export const G = 9.81;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sgn = (v) => (v < 0 ? -1 : 1);
// normalised lateral force: peaks at ~6.5 degrees of slip, then falls to ~60% when sliding
export const tyre = (alpha) => Math.sin(1.6 * Math.atan(13 * alpha));

export class Vehicle {
  constructor(spec) { this.events = []; this.setSpec(spec); this.reset(0, 0, 0); }

  setSpec(spec) {
    const b = spec.body; this.spec = spec;
    this.m = spec.mass; this.wb = b.wb; this.L = b.L; this.W = b.W; this.H = b.H;
    const front = b.midEngine ? 0.42 : spec.id === 'maybach' ? 0.53 : 0.51;   // static front weight share
    this.a = this.wb * (1 - front); this.b = this.wb * front;                     // CG to front / rear axle
    this.h = b.midEngine ? 0.43 : spec.id === 'maybach' ? 0.6 : spec.id === 'rs6' ? 0.55 : 0.5;
    this.I = this.m * (b.L * b.L + b.W * b.W) / 12;
    this.track = b.W - 0.32;
    this.down = b.midEngine ? 0.22 : 0.07;            // downforce at 250 km/h, share of weight
    const n = spec.gears, v1 = (spec.vmax > 380 ? 100 : spec.vmax < 260 ? 60 : 74) / 3.6, vN = spec.vmax * 1.03 / 3.6;
    this.gearV = Array.from({ length: n }, (_, g) => v1 * Math.pow(vN / v1, g / (n - 1)));
    this.P = spec.ps * 735.5 * 0.86; this.vmax = spec.vmax / 3.6; this.kd = this.P / Math.pow(this.vmax, 3);
  }

  reset(x, s, v) {
    Object.assign(this, {
      x, s, vx: 0, vs: v, psi: 0, r: 0, delta: 0, ax: 0, ay: 0, rpm: this.spec.idle, gear: 1, shiftT: 0,
      rolling: false, phi: 0, omega: 0, yc: this.H / 2, vy: 0, rolls: 0, settled: false,
      damage: 0, wrecked: false, skid: 0, wheelspin: 0, mu: 1, muBase: 1, thrAudio: 0, onSlick: false, sliding: false,
    });
    this.events.length = 0;
    while (this.gear < this.gearV.length && v > this.gearV[this.gear - 1] * 0.8) this.gear++;
  }

  get v() { return this.vs; }                                   // speed along the road
  get speed() { return Math.hypot(this.vx, this.vs); }
  get u() { return this.vx * Math.sin(this.psi) + this.vs * Math.cos(this.psi); }   // forward, car frame
  get w() { return this.vx * Math.cos(this.psi) - this.vs * Math.sin(this.psi); }   // sideways, car frame
  get sideways() { return Math.abs(this.w) / Math.max(this.speed, 1); }              // 0 straight .. 1 fully sideways
  get footW() { return Math.abs(this.L * Math.sin(this.psi)) + Math.abs(this.W * Math.cos(this.psi)); }

  /** env: { mu(x, s) -> grip at a point, base: weather grip, assist: bool } */
  step(h, inp, env) {
    if (this.rolling) return this._tumble(h);
    const spec = this.spec, m = this.m, a = this.a, b = this.b, wb = this.wb;
    const fx = Math.sin(this.psi), fs = Math.cos(this.psi), rx = fs, rs = -fx;
    const u = this.vx * fx + this.vs * fs, w = this.vx * rx + this.vs * rs, au = Math.abs(u);

    // grip under each wheel
    const t2 = this.track / 2, mu = env.mu;
    const pFx = this.x + fx * a, pFs = this.s + fs * a, pRx = this.x - fx * b, pRs = this.s - fs * b;
    const muFL = mu(pFx - rx * t2, pFs - rs * t2), muFR = mu(pFx + rx * t2, pFs + rs * t2);
    const muRL = mu(pRx - rx * t2, pRs - rs * t2), muRR = mu(pRx + rx * t2, pRs + rs * t2);
    // performance tyres, wider at the back: in the dry the car is stable and
    // understeers at the limit. Water takes the rear's margin away first, so
    // in rain and storms the tail lets go much more easily.
    const wetLoss = clamp(1 - env.base, 0, 1), rearBias = 1.1 - wetLoss * 0.42;
    // game feel: extra grip at low speed (none from ~130 km/h up) so the car is nimble in traffic
    const low = clamp(1 - au / 36, 0, 1), agile = 1 + 0.35 * low;
    const muF = (muFL + muFR) / 2 * 1.05 * agile, muR = (muRL + muRR) / 2 * 1.05 * rearBias * agile;
    this.mu = (muF + muR) / 2; this.muBase = env.base;
    this.onSlick = Math.min(muFL, muFR, muRL, muRR) < env.base * 0.6;

    // gearbox and engine
    let rpm = Math.max(spec.idle, spec.redline * au / this.gearV[this.gear - 1]);
    if (this.shiftT > 0) this.shiftT -= h;
    else if (rpm > spec.redline * 0.965 && this.gear < this.gearV.length) { this.gear++; this.shiftT = 0.13; }
    else if (this.gear > 1 && au < this.gearV[this.gear - 2] * (inp.throttle > 0.8 ? 0.8 : 0.55)) { this.gear--; this.shiftT = 0.1; }
    rpm = clamp(spec.redline * au / this.gearV[this.gear - 1], spec.idle, spec.redline);
    const rn = rpm / spec.redline;
    const curve = Math.min(1, 0.25 + rn / 0.78) * (rn > 0.975 ? 1 - (rn - 0.975) * 6 : 1);
    const thr = this.shiftT > 0 ? 0 : inp.throttle;
    let Fdrive = u > -1 ? thr * this.P * curve / Math.max(au, 6) : 0;
    if (inp.throttle < 0.05 && au > 2) Fdrive = -0.04 * m * G * (0.3 + rn);          // engine braking
    this.rpm += (rpm - this.rpm) * Math.min(1, h * 16); this.thrAudio = thr;

    // axle loads: weight, longitudinal load transfer, downforce
    const down = this.down * m * G * (u / 69.4) ** 2, dz = m * this.ax * this.h / wb;
    const FzF = Math.max(0.15 * m * G, m * G * b / wb - dz + down * 0.45);
    const FzR = Math.max(0.15 * m * G, m * G * a / wb + dz + down * 0.55);

    // steering: the angle that is available shrinks with speed, but always
    // allows about 1.5x what dry tyres can hold, so yanking the wheel can
    // break traction (and on a wet road it easily does)
    // below ~130 km/h the steering gets quicker and a little sharper; above that it is unchanged
    const dmax = clamp((1.5 + 0.6 * low) * G * wb / Math.max(au, 4) ** 2, 0.006, 0.55);
    const beta = Math.atan2(w, Math.max(au, 0.5));
    let target = inp.steer * dmax;
    if (env.assist && Math.abs(inp.steer) < 0.05 && Math.abs(beta) < 0.3 && au > 3) {
      // hands-off: a driver keeping the car straight down the road
      const rd = clamp(-this.psi * 2.2, -0.35, 0.35);
      target = clamp((rd + (rd - this.r) * 0.6) * wb / au, -dmax * 0.8, dmax * 0.8);
    }
    const rate = h * dmax / (0.15 - 0.08 * low);
    this.delta += clamp(target - this.delta, -rate, rate);

    // tyre slip angles and lateral forces
    const uu = Math.max(au, 3);
    // rear-wheel steering at low speed: rear wheels turn against the fronts, so the car turns in faster
    const dR = -this.delta * 0.45 * low * low;
    const aF = Math.atan2(w + a * this.r, uu) - this.delta * sgn(u), aR = Math.atan2(w - b * this.r, uu) - dR * sgn(u);
    let FyF = -muF * FzF * tyre(aF), FyR = -muR * FzR * tyre(aR) * 0.96;

    // longitudinal: brakes with ABS, drive with a sporty traction control
    let FxF = 0, FxR = 0;
    const brake = inp.brake * m * G * 1.1;
    // ABS: braking only uses the grip that cornering leaves over, so the car
    // stays steerable; the rear is held back further (EBD) so the tail stays put.
    // On oil there is hardly any grip to share, so the car still slides.
    if (au > 0.3 && brake > 0) {
      const leftF = Math.sqrt(Math.max(0, (muF * FzF) ** 2 - FyF * FyF)), leftR = Math.sqrt(Math.max(0, (muR * FzR) ** 2 - FyR * FyR));
      FxF -= sgn(u) * Math.min(brake * 0.7, 0.92 * Math.max(leftF, 0.35 * muF * FzF));
      FxR -= sgn(u) * Math.min(brake * 0.3, 0.7 * Math.max(leftR, 0.3 * muR * FzR));
    }
    const split = spec.awd ? 0.4 : 0;
    FxF += Fdrive * split; FxR += Fdrive * (1 - split);
    if (Fdrive > 0) { FxF = Math.min(FxF, 1.05 * muF * FzF); FxR = Math.min(FxR, 1.05 * muR * FzR); }
    this.wheelspin = Fdrive > 0 ? clamp((Fdrive * (1 - split) / (muR * FzR) - 0.85) * 3, 0, 1) : 0;

    // friction circle per axle
    let k = Math.hypot(FxF, FyF), lim = muF * FzF; if (k > lim) { FxF *= lim / k; FyF *= lim / k; }
    k = Math.hypot(FxR, FyR); lim = muR * FzR; if (k > lim) { FxR *= lim / k; FyR *= lim / k; }

    // sum in the car frame
    const cd = Math.cos(this.delta), sd = Math.sin(this.delta);
    const cr = Math.cos(dR), sr = Math.sin(dR);
    const FX = FxF * cd - FyF * sd + FxR * cr - FyR * sr - this.kd * u * Math.abs(u) - (au > 0.3 ? sgn(u) * 0.012 * m * G : 0);
    const FY = FxF * sd + FyF * cd + FxR * sr + FyR * cr;
    let Mz = a * (FxF * sd + FyF * cd) - b * (FxR * sr + FyR * cr);
    // uneven grip left/right: the side that grips more pulls harder
    const sF = (muFL - muFR) / (muFL + muFR + 1e-6), sR = (muRL - muRR) / (muRL + muRR + 1e-6);
    Mz += (FxF * sF + FxR * sR) * t2;
    // stability control: damps yaw while the car is still roughly pointing where it goes.
    // It works with the grip it has, so it is much weaker in the wet.
    if (env.assist && au > 5 && Math.abs(beta) < 0.35) {
      const rRef = clamp(au * (this.delta - dR) / wb, -this.mu * G / au, this.mu * G / au);
      // limited authority (it can only brake single wheels), and it loses most of it on water
      const auth = 0.1 * m * G * wb * clamp(1 - wetLoss * 1.6, 0.1, 1) * (env.esc ?? 1);
      Mz -= clamp((this.r - rRef) * this.I * 7 * this.mu, -auth, auth) * (1 - Math.abs(beta) / 0.35);
    }

    // integrate
    this.vx += (FX * fx + FY * rx) / m * h; this.vs += (FX * fs + FY * rs) / m * h; this.r += Mz / this.I * h;
    if (this.speed < 0.3 && inp.throttle < 0.05) { this.vx *= 0.8; this.vs *= 0.8; this.r *= 0.8; }
    this.psi += this.r * h; if (this.psi > Math.PI) this.psi -= 2 * Math.PI; else if (this.psi < -Math.PI) this.psi += 2 * Math.PI;
    this.x += this.vx * h; this.s += this.vs * h;
    this.ax = FX / m; this.ay = FY / m;

    // telemetry for sound, smoke, skid marks
    const slipMax = Math.max(Math.abs(aR), Math.abs(aF + this.delta * sgn(u) * 0));
    this.skid = Math.max(clamp((slipMax - 0.1) / 0.25, 0, 1) * clamp(this.speed / 8, 0, 1), this.wheelspin * 0.7,
      inp.brake > 0.5 && au > 3 ? clamp((inp.brake * 1.1 - this.mu) * 2, 0, 1) * 0.6 : 0);
    this.sliding = Math.abs(beta) > 0.2 && this.speed > 5;

    // rollover: a car sliding sideways can dig its tyres in and trip.
    // The more grip, the more likely; on ice it just slides.
    const wa = Math.abs(this.w);
    if (env.canRoll && wa > 10 && this.sideways > 0.5) {
      const p = clamp((wa - 10) / 14, 0, 1) * Math.pow(clamp(this.mu, 0.2, 1), 2) * 0.55;
      if (Math.random() < p * h) this.startRoll(sgn(this.w), wa);
    }
  }

  startRoll(dir, wa) {
    if (this.rolling) return;
    this.rolling = true; this.wrecked = true; this.rolls = 0;
    this.omega = dir * clamp(wa * 0.8, 5, 15); this.vy = 1.6 + wa * 0.17;
    this.events.push({ type: 'roll', strength: clamp(wa / 20, 0.3, 1) });
  }

  // after a trip: the body tumbles about its long axis while sliding to a stop
  _tumble(h) {
    const half = Math.PI / 2, ycMin = (p) => (this.W / 2) * Math.abs(Math.sin(p)) + (this.H / 2) * Math.abs(Math.cos(p));
    const ground = this.yc <= ycMin(this.phi) + 0.04, sp = this.speed;
    if (ground && sp > 0.01) { const d = Math.min(sp, 0.6 * G * h); this.vx -= this.vx / sp * d; this.vs -= this.vs / sp * d; }
    this.r *= Math.exp(-h * (ground ? 1.6 : 0.3)); this.psi += this.r * h;
    this.x += this.vx * h; this.s += this.vs * h;
    const before = Math.floor(this.phi / half);
    this.phi += this.omega * h; this.vy -= G * h; this.yc += this.vy * h;
    if (Math.floor(this.phi / half) !== before && ground) {     // an edge or face hits the ground
      this.omega *= 0.86; this.events.push({ type: 'impact', strength: clamp(Math.abs(this.omega) / 14, 0.15, 0.7) });
    }
    const floor = ycMin(this.phi);
    if (this.yc < floor) {
      if (this.vy < -1.2) { this.events.push({ type: 'impact', strength: clamp(-this.vy / 6, 0.2, 1) }); this.vy = -this.vy * 0.3; this.omega *= 0.75; this.vx *= 0.9; this.vs *= 0.9; }
      else this.vy = Math.max(this.vy, 0);
      this.yc = floor;
    }
    if (ground) this.omega -= sgn(this.omega) * Math.min(Math.abs(this.omega), 3 * h);
    if (ground && Math.abs(this.omega) < 1.8) {                 // settle on whichever side is nearest
      const t = Math.round(this.phi / half) * half;
      this.omega *= Math.exp(-h * 6); this.phi += (t - this.phi) * Math.min(1, h * 5);
    }
    this.rolls = Math.abs(this.phi) / (2 * Math.PI);
    this.settled = sp < 0.6 && Math.abs(this.omega) < 0.3;
    this.skid = 0; this.ax = 0; this.ay = 0; this.rpm += (this.spec.idle - this.rpm) * h * 3;
  }
}
