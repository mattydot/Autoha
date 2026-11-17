// Audio graph: engine worklet, wind/road/rain beds, one-shot effects.
import { Radio } from './radio.js';

export class GameAudio {
  constructor() { this.ready = false; this.vol = { master: 0.8, music: 0.7, engine: 0.8, sfx: 0.8 }; }

  async init() {
    if (this.ready || this._starting) return; this._starting = true;
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    this.master = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -6; limiter.knee.value = 6; limiter.ratio.value = 12; limiter.attack.value = 0.003; limiter.release.value = 0.15;
    this.master.connect(limiter).connect(ctx.destination);
    this.musicGain = ctx.createGain(); this.engineGain = ctx.createGain(); this.sfxGain = ctx.createGain();
    for (const g of [this.musicGain, this.engineGain, this.sfxGain]) g.connect(this.master);

    // shared noise buffer
    const len = ctx.sampleRate * 3, buf = this.noise = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // engine
    try {
      await ctx.audioWorklet.addModule(new URL('./engine-worklet.js', import.meta.url));
      this.engine = new AudioWorkletNode(ctx, 'engine', { numberOfInputs: 0, outputChannelCount: [2] });
      // a touch of cabin resonance + exhaust body
      const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 180; body.Q.value = 0.8; body.gain.value = 4;
      const top = ctx.createBiquadFilter(); top.type = 'lowpass'; top.frequency.value = 7500;
      this.engineLevel = ctx.createGain(); this.engineLevel.gain.value = 0;
      this.engine.connect(body).connect(top).connect(this.engineLevel).connect(this.engineGain);
    } catch (e) { console.warn('Engine worklet unavailable', e); }

    // looping beds
    const bed = (type, freq, q) => { const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(this.sfxGain); src.start(0, Math.random() * 2); return { f, g }; };
    this.wind = bed('bandpass', 500, 0.5); this.road = bed('lowpass', 220, 0.7); this.rain = bed('highpass', 2400, 0.3); this.scrape = bed('bandpass', 2600, 1.5);
    // tyre screech: narrow band noise, wobbling in pitch
    this.screech = bed('bandpass', 1500, 9); const wob = ctx.createOscillator(), wg = ctx.createGain(); wob.frequency.value = 7; wg.gain.value = 140; wob.connect(wg).connect(this.screech.f.frequency); wob.start();
    const sq = ctx.createBiquadFilter(); sq.type = 'peaking'; sq.frequency.value = 2900; sq.Q.value = 6; sq.gain.value = 9; this.screech.g.disconnect(); this.screech.g.connect(sq).connect(this.sfxGain);
    // Martinshorn: two horns alternating between 440 and 585 Hz
    this.sirenOut = ctx.createGain(); this.sirenOut.gain.value = 0; this.sirenPan = ctx.createStereoPanner();
    const sirenLp = ctx.createBiquadFilter(); sirenLp.type = 'lowpass'; sirenLp.frequency.value = 2600;
    this.sirenOsc = [];
    for (const [mul, type] of [[1, 'sawtooth'], [1.003, 'square']]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = 512 * mul;
      const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 1 / 1.3; const lg = ctx.createGain(); lg.gain.value = 72 * mul; lfo.connect(lg).connect(o.frequency);
      const og = ctx.createGain(); og.gain.value = type === 'square' ? 0.25 : 0.5; o.connect(og).connect(sirenLp); o.start(); lfo.start(); this.sirenOsc.push(o); }
    sirenLp.connect(this.sirenOut).connect(this.sirenPan).connect(this.sfxGain);

    this.radio = new Radio(ctx, this.musicGain);
    this.ready = true; this.applyVolumes();
  }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }
  applyVolumes() {
    if (!this.ready) return; const v = this.vol, t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(v.master, t, 0.05); this.musicGain.gain.setTargetAtTime(v.music * 1.25, t, 0.05);
    this.engineGain.gain.setTargetAtTime(v.engine, t, 0.05); this.sfxGain.gain.setTargetAtTime(v.sfx, t, 0.05);
  }
  setEngine(spec) { if (this.engine) this.engine.port.postMessage({ ...spec.sound, redline: spec.redline }); }

  // called every frame
  update(st) {
    if (!this.ready) return; const t = this.ctx.currentTime;
    if (this.engine) {
      this.engine.parameters.get('rpm').setTargetAtTime(st.rpm, t, 0.03);
      this.engine.parameters.get('throttle').setTargetAtTime(st.throttle, t, 0.03);
      this.engineLevel.gain.setTargetAtTime(st.engineOn ? (st.interior ? 0.55 : 0.72) : 0, t, 0.08);
    }
    const v = st.speed, k = st.bedsOn ? 1 : 0;
    this.wind.g.gain.setTargetAtTime(k * Math.min(0.5, Math.pow(v / 95, 2) * 0.42), t, 0.1); this.wind.f.frequency.setTargetAtTime(350 + v * 9, t, 0.1);
    this.road.g.gain.setTargetAtTime(k * Math.min(0.5, v / 90 * 0.4) * (1 + st.wet * 0.5), t, 0.1); this.road.f.frequency.setTargetAtTime(140 + v * 3 + st.wet * 500, t, 0.1);
    this.rain.g.gain.setTargetAtTime(st.rain * 0.3 * (st.bedsOn ? 1 : 0.5), t, 0.3);
    this.scrape.g.gain.setTargetAtTime(k * st.scrape * 0.55, t, 0.03);
    this.screech.g.gain.setTargetAtTime(k * (st.skid || 0) * 0.32, t, 0.04); this.screech.f.frequency.setTargetAtTime(1200 + v * 9, t, 0.1);
    const sr = st.siren || { level: 0, pan: 0, cents: 0 };
    this.sirenOut.gain.setTargetAtTime(sr.level * 0.22, t, 0.15); this.sirenPan.pan.setTargetAtTime(sr.pan, t, 0.1);
    for (const o of this.sirenOsc) o.detune.setTargetAtTime(sr.cents, t, 0.2);
  }

  _burst({ dur = 0.3, type = 'lowpass', f0 = 800, f1 = 200, q = 0.7, gain = 0.5, pan = 0, delay = 0, attack = 0.005 }) {
    if (!this.ready) return; const ctx = this.ctx, t = ctx.currentTime + delay;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(f).connect(g).connect(p).connect(this.sfxGain); src.start(t, Math.random() * 2, dur + 0.1);
  }
  _tone(freq, dur, type = 'sine', gain = 0.2, f1) {
    if (!this.ready) return; const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + dur + 0.02);
  }
  whoosh(pan, strength) { this._burst({ dur: 0.38, type: 'bandpass', f0: 1500 + strength * 900, f1: 260, q: 0.9, gain: 0.22 + 0.4 * strength, pan, attack: 0.07 }); }
  crash(strength) { this._burst({ dur: 0.9, f0: 3200, f1: 120, gain: 0.5 + strength * 0.5 }); this._tone(110, 0.45, 'sine', 0.7, 32); this._burst({ dur: 0.5, type: 'highpass', f0: 4000, f1: 6000, gain: 0.3 * strength, delay: 0.06 }); }
  impact(strength) { this._burst({ dur: 0.35 + strength * 0.4, f0: 1800, f1: 90, gain: 0.3 + strength * 0.5 }); this._tone(70 + Math.random() * 30, 0.3, 'sine', 0.4 * strength, 30);
    this._burst({ dur: 0.25, type: 'bandpass', f0: 3800, f1: 2500, q: 3, gain: 0.15 * strength, delay: 0.02 }); }
  glass() { for (let i = 0; i < 6; i++) this._burst({ dur: 0.12, type: 'highpass', f0: 5000 + Math.random() * 3000, f1: 7000, gain: 0.08, delay: i * 0.025 + Math.random() * 0.02, pan: Math.random() - 0.5 }); }
  busted() { this._tone(440, 0.6, 'square', 0.08); setTimeout(() => this._tone(585, 0.6, 'square', 0.08), 650); }
  thunder(delay) { this._burst({ dur: 3.8, f0: 500, f1: 45, gain: 0.85, delay, attack: 0.05, pan: Math.random() - 0.5 }); this._burst({ dur: 1.2, f0: 2200, f1: 300, gain: 0.3, delay, attack: 0.01 }); }
  blitz() { this._tone(2400, 0.06, 'square', 0.12); this._burst({ dur: 0.12, type: 'highpass', f0: 5000, f1: 3000, gain: 0.3 }); }
  click() { this._tone(880, 0.05, 'triangle', 0.1); }
  bonus() { this._tone(988, 0.09, 'triangle', 0.14); setTimeout(() => this._tone(1319, 0.14, 'triangle', 0.14), 70); }
  tuning() { this._burst({ dur: 0.18, type: 'bandpass', f0: 3000, f1: 800, q: 4, gain: 0.12 }); }
  horn(on) {
    if (!this.ready) return; const ctx = this.ctx, t = ctx.currentTime;
    if (on && !this._horn) { const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.02); const os = [420, 505].map((f) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(g); o.start(); return o; });
      const lp = ctx.createBiquadFilter(); lp.frequency.value = 2400; g.connect(lp).connect(this.sfxGain); this._horn = { g, os }; }
    else if (!on && this._horn) { const h = this._horn; this._horn = null; h.g.gain.setTargetAtTime(0, t, 0.02); for (const o of h.os) o.stop(t + 0.2); }
  }
}
