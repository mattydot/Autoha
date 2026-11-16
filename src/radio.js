// In-car radio. Every built-in station is an original, procedurally
// generated set of tracks (no samples, no copyrighted recordings).
// The "MEINE MUSIK" station plays audio files the player adds themselves.

export const STATIONS = [
  { id: 'nacht', name: 'NACHT FM', freq: '88.4', genre: 'Synthwave · neon night drives', style: 'synthwave',
    tracks: [['Leitplanke Lights', 'Autobahnkind', 104], ['Kilometer 303', 'Tachonadel', 110], ['Midnight Raststätte', 'Neon Kreuz', 98], ['Fernlicht', 'Autobahnkind', 108]] },
  { id: 'kerosin', name: 'KEROSIN 98.6', freq: '98.6', genre: 'Dark electro · crushed synths', style: 'electro',
    tracks: [['Paraffin', 'Glass Teeth', 130], ['Static Halo', 'VHS Kathedrale', 126], ['Vollgas Violet', 'Glass Teeth', 134], ['Bleifrei', 'Kaltlicht', 128]] },
  { id: 'bunker', name: 'BUNKER 101.3', freq: '101.3', genre: 'Techno · straight from the cellar', style: 'techno',
    tracks: [['Betonwelle', 'Schicht 3', 138], ['Stahlträger', 'K. Dröhn', 140], ['Nachtschicht', 'Schicht 3', 136], ['Unterführung', 'Maschinenraum', 142]] },
  { id: 'europa', name: 'EUROPA 2000', freq: '104.6', genre: 'Trance · hands in the air', style: 'trance',
    tracks: [['Überholspur', 'DJ Blinker', 140], ['Sonnenaufgang A9', 'Lichthupe', 138], ['Freie Fahrt', 'DJ Blinker', 142], ['Horizont', 'Ana Log', 139]] },
  { id: 'drift', name: 'DRIFT FM', freq: '107.1', genre: 'Phonk · cowbells and 808s', style: 'phonk',
    tracks: [['Kickdown', 'TÜV FAILED', 122], ['Drehzahlbegrenzer', 'NOKTURN', 128], ['Linke Spur', 'TÜV FAILED', 118], ['Ölwechsel', 'NOKTURN', 125]] },
  { id: 'liquid', name: 'LIQUID 91.8', freq: '91.8', genre: 'Drum & bass · rolling', style: 'dnb',
    tracks: [['Regenradar', 'Aquaplaning', 174], ['Windschatten', 'Low Pressure', 172], ['Sprühnebel', 'Aquaplaning', 175], ['Tunnelblick', 'Low Pressure', 174]] },
  { id: 'user', name: 'MEINE MUSIK', freq: 'AUX', genre: 'Your own tracks', user: true, tracks: [] },
];

const MINOR = [0, 2, 3, 5, 7, 8, 10], PHRYG = [0, 1, 3, 5, 7, 8, 10];
const PROGS = [[0, 5, 2, 6], [0, 3, 5, 4], [0, 6, 5, 6], [0, 0, 5, 6], [0, 5, 3, 4], [0, 2, 5, 4]];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ----------------------------- user tracks (IndexedDB) ----------------------------- */
class UserTracks {
  constructor() { this.list = []; this.ready = this._open(); }
  _open() { return new Promise((res) => { try { const r = indexedDB.open('autobahn-rush', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
    r.onsuccess = () => { this.db = r.result; const q = this.db.transaction('tracks').objectStore('tracks').getAll(); q.onsuccess = () => { this.list = q.result; res(); }; q.onerror = () => res(); };
    r.onerror = () => res(); } catch { res(); } }); }
  async add(files) { await this.ready; for (const f of files) { if (!f.type.startsWith('audio') && !/\.(mp3|m4a|ogg|wav|flac|aac|opus)$/i.test(f.name)) continue; const rec = { name: f.name.replace(/\.[^.]+$/, ''), blob: f };
    if (this.db) await new Promise((res) => { const q = this.db.transaction('tracks', 'readwrite').objectStore('tracks').add(rec); q.onsuccess = () => { rec.id = q.result; res(); }; q.onerror = () => res(); }); this.list.push(rec); } }
  async remove(i) { const rec = this.list.splice(i, 1)[0]; if (rec && this.db && rec.id != null) this.db.transaction('tracks', 'readwrite').objectStore('tracks').delete(rec.id); }
}

/* ------------------------------------ radio ------------------------------------ */
export class Radio {
  constructor(ctx, out) {
    this.ctx = ctx; this.station = -1; this.track = 0; this.onChange = null; this.user = new UserTracks();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    this.bus = ctx.createGain(); this.bus.gain.value = 1.5; this.bus.connect(comp).connect(out);
    this.duck = ctx.createGain(); this.duck.connect(this.bus);                       // side-chained to the kick
    this.delay = ctx.createDelay(1.5); this.fb = ctx.createGain(); this.fb.gain.value = 0.42;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200;
    this.delay.connect(dlp).connect(this.fb).connect(this.delay); dlp.connect(this.duck);
    const len = ctx.sampleRate, nb = this.noise = ctx.createBuffer(1, len, ctx.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // bit-crusher style staircase + hard drive curves
    const mk = (fn) => { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) c[i] = fn(i / 511.5 - 1); return c; };
    this.crush = mk((x) => Math.round(x * 5) / 5); this.drive = mk((x) => Math.tanh(x * 3.5));
    this.el = new Audio(); this.el.addEventListener('ended', () => this.next()); this.elSrc = ctx.createMediaElementSource(this.el); this.elSrc.connect(out);
    this._timer = setInterval(() => this._tick(), 25);
  }

  /* ---- public controls ---- */
  get info() { if (this.station < 0) return { station: 'RADIO OFF', title: '', artist: '', freq: '' }; const s = STATIONS[this.station];
    if (s.user) { const t = this.user.list[this.track]; return { station: s.name, freq: s.freq, title: t ? t.name : 'No tracks yet', artist: t ? 'Your library' : 'Add files in the MUSIC menu' }; }
    const t = s.tracks[this.track]; return { station: s.name, freq: s.freq, title: t[0], artist: t[1] }; }
  setStation(i, track) { this.station = i; this.track = track ?? (i >= 0 && !STATIONS[i].user ? (Math.random() * STATIONS[i].tracks.length) | 0 : 0); this._start(); }
  cycle(dir) { const n = STATIONS.length + 1; this.setStation(((this.station + 1 + dir + n) % n) - 1); }
  next(dir = 1) { if (this.station < 0) return; const s = STATIONS[this.station], n = s.user ? this.user.list.length : s.tracks.length; if (!n) return; this.track = (this.track + dir + n) % n; this._start(); }
  stop() { this.setStation(-1); }
  _start() {
    this.el.pause(); this.song = null;
    const t = this.ctx.currentTime; this.duck.gain.cancelScheduledValues(t); this.duck.gain.setValueAtTime(1, t);
    if (this.station >= 0) { const s = STATIONS[this.station];
      if (s.user) { const tr = this.user.list[this.track]; if (tr) { if (this._url) URL.revokeObjectURL(this._url); this._url = URL.createObjectURL(tr.blob); this.el.src = this._url; this.el.play().catch(() => {}); } }
      else { this.song = this._compose(s, this.track); this.step = 0; this.nextTime = t + 0.12; } }
    if (this.onChange) this.onChange(this.info);
  }

  /* ---- composition ---- */
  _compose(st, ti) {
    const [, , bpm] = st.tracks[ti], R = rng(st.id.length * 7919 + ti * 104729 + bpm), style = st.style;
    const scale = style === 'phonk' ? PHRYG : MINOR, root = 33 + ((R() * 8) | 0), prog = PROGS[(R() * PROGS.length) | 0];
    const song = { style, bpm, scale, root, prog, spb: 60 / bpm / 4 };
    const pat = (p) => Array.from({ length: 16 }, () => R() < p);
    song.mask = pat(0.62); song.mask[0] = true; song.stab = pat(0.3); song.acid = Array.from({ length: 16 }, () => ({ d: [0, 0, 0, 2, 4, 6, 7][(R() * 7) | 0], acc: R() < 0.3, on: R() < 0.8, up: R() < 0.2 }));
    // 2-bar lead motif, mostly chord tones
    song.motif = []; let d = 4; for (let s = 0; s < 32;) { const len = [2, 2, 3, 4, 4, 6, 8][(R() * 7) | 0]; if (R() < 0.82) { d += [-2, -1, -1, 0, 1, 1, 2, 3][(R() * 8) | 0]; d = Math.max(0, Math.min(9, d)); song.motif.push({ s, d, len }); } s += len; }
    song.bell = Array.from({ length: 16 }, (_, i) => (R() < (i % 2 ? 0.35 : 0.7) ? [0, 0, 2, 3, 4, 6, 7][(R() * 7) | 0] : -1));
    song.kick = style === 'phonk' ? [0, 3, 6, 10, R() < 0.5 ? 13 : 11] : style === 'dnb' ? [0, 10] : style === 'synthwave' ? [0, 8, R() < 0.5 ? 10 : 14] : [0, 4, 8, 12];
    return song;
  }
  _note(song, deg, oct = 0) { return song.root + 12 * (Math.floor(deg / 7) + oct) + song.scale[((deg % 7) + 7) % 7]; }

  _tick() {
    if (!this.song || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime; if (this.nextTime < now - 0.3) this.nextTime = now + 0.05;
    while (this.nextTime < now + 0.14) { this._step(this.song, this.step, this.nextTime); this.step++; this.nextTime += this.song.spb;
      if (this.step >= 16 * 64) { this.next(); return; } }
  }

  _step(S, step, t) {
    const bar = Math.floor(step / 16), s = step % 16, sec = bar % 32, dur = S.spb, st = S.style;
    const intro = sec < 4 && st !== 'techno', brk = sec >= 20 && sec < 24, full = !intro && !brk, hasLead = sec >= 12, late = sec >= 24;
    const chordDeg = S.prog[Math.floor(bar / (st === 'dnb' || st === 'trance' ? 2 : 1)) % 4];
    const N = (deg, oct) => mtof(this._note(S, chordDeg + deg, oct));
    const kickOn = full && S.kick.includes(s);

    /* drums */
    if (kickOn) { this.kick(t, st); const g = this.duck.gain, depth = st === 'synthwave' || st === 'dnb' ? 0.55 : 0.25; g.cancelScheduledValues(t); g.setValueAtTime(depth, t); g.linearRampToValueAtTime(1, t + Math.min(0.28, dur * 3.4)); }
    if (!intro && (s === 4 || s === 12) && (st !== 'techno' || hasLead)) { if (brk && st !== 'synthwave') {} else this.snare(t, st); }
    if (st === 'dnb' && full && (s === 7 || (s === 14 && bar % 2))) this.snare(t, st, 0.25);
    const off = s % 4 === 2;
    if (st === 'techno' || st === 'trance' || st === 'electro') { if (!intro && off) this.hat(t, 0.16, 0.22); if (full && s % 2 === 1 && st !== 'trance') this.hat(t, 0.03, 0.07); }
    else if (st === 'phonk') { if (!intro) { if (s % 2 === 0) this.hat(t, 0.03, 0.16); if (s === 14 && bar % 2) for (let i = 1; i < 4; i++) this.hat(t + dur * i / 2, 0.02, 0.1 + i * 0.02); } }
    else if (s % 2 === 0 && (st !== 'synthwave' || !intro)) this.hat(t, s % 4 === 2 ? 0.06 : 0.03, st === 'dnb' ? 0.14 : 0.1);
    if (brk && sec === 23 && s === 0) this.riser(t, dur * 16);

    /* bass */
    if (!intro || st === 'synthwave') {
      if (st === 'synthwave') { if (s % 2 === 0) this.bass(t, N(0, s % 4 === 2 && late ? 1 : 0), dur * 1.6, 'sawtooth', 620, 0.26); }
      else if (st === 'electro') { if (S.mask[s] && !brk) this.bass(t, N(0, 0), dur * 0.9, 'square', 420 + (s % 4) * 90, 0.2, true); }
      else if (st === 'techno') { if (full && s % 4 !== 0) this.bass(t, N(0, 0), dur * 0.8, 'sine', 160, 0.3); }
      else if (st === 'trance') { if (!brk && off) this.bass(t, N(0, 0), dur * 1.9, 'sawtooth', 780, 0.26); else if (!brk && s % 4 === 3) this.bass(t, N(0, 1), dur * 0.8, 'sawtooth', 700, 0.14); }
      else if (st === 'phonk') { if (kickOn && (s === 0 || s === 6 || s === 10)) this.sub808(t, N(s === 10 ? 4 : 0, 0), dur * (s === 0 ? 5 : 3.5)); }
      else if (st === 'dnb') { if (!brk && (s === 0 || s === 10)) this.reese(t, N(s === 10 && bar % 2 ? 2 : 0, 0), dur * (s === 0 ? 9 : 5.5)); }
    }

    /* harmony */
    const padStyles = { synthwave: 0.07, electro: 0.05, trance: 0.05, phonk: 0.035, dnb: 0.075 };
    if (padStyles[st] && s === 0 && bar % (st === 'dnb' || st === 'trance' ? 2 : 1) === 0)
      this.pad(t, [N(0, 2), N(2, 2), N(4, 2), N(0, 3)], dur * 16 * (st === 'dnb' || st === 'trance' ? 2 : 1), padStyles[st] * (brk || intro ? 1.5 : 1));
    if (st === 'techno' && !intro && S.stab[s]) this.stab(t, [N(0, 2), N(2, 2), N(4, 2)], dur * 0.9, 0.05, 900 + sec * 60);
    if (st === 'trance' && !intro && (s % 4 === 0 || s % 4 === 3 || (late && s % 4 === 2))) this.stab(t, [N(0, 2), N(2, 2), N(4, 2), N(0, 3)], dur * 0.85, 0.045, brk ? 600 + s * 150 : 2600);
    if (st === 'electro' && !intro && (s === 0 || s === 6 || s === 11)) this.choir(t, N(s === 6 ? 2 : 0, 3), dur * 4, 0.05);

    /* arps & leads */
    const arpDeg = [0, 2, 4, 7, 4, 2, 9, 7][s % 8];
    if (st === 'synthwave') { if (!brk || true) this.pluck(t, N(arpDeg, 2), dur * 1.4, 0.055, 'sawtooth', 1800); }
    else if (st === 'electro') { if (S.mask[(s + 5) % 16] || late) this.pluck(t, N([0, 4, 2, 7, 0, 9, 4, 2][(s + bar) % 8], (s * 7 + bar) % 5 === 0 ? 4 : 3), dur * 0.95, hasLead || brk ? 0.06 : 0.035, 'square', 5200, true); }
    else if (st === 'trance') { if (hasLead || brk) this.pluck(t, N(arpDeg, 3), dur * 1.1, 0.04, 'sawtooth', 3600); }
    else if (st === 'dnb') { if ((s % 3 === 0) && !intro) this.pluck(t, N([0, 4, 7, 2, 9, 4][(s / 3 + bar) % 6 | 0], 3), dur * 2.5, 0.04, 'triangle', 4000); }
    else if (st === 'techno' && hasLead && S.acid[s].on) { const a = S.acid[s]; this.acidNote(t, mtof(this._note(S, a.d, a.up ? 2 : 1)), dur * 0.95, a.acc, 500 + (sec - 12) * 110 + (brk ? 1500 : 0)); }
    else if (st === 'phonk' && !intro && S.bell[s] >= 0) this.cowbell(t, mtof(this._note(S, S.bell[s] + (bar % 4 === 3 ? 1 : 0), 4)), hasLead ? 0.13 : 0.085);

    if (hasLead && (st === 'synthwave' || st === 'trance' || st === 'dnb' || (st === 'electro' && late))) {
      const ms = (step % 32); for (const m of S.motif) if (m.s === ms) this.lead(t, N(m.d, st === 'dnb' ? 3 : late ? 4 : 3), dur * m.len * 0.92, st === 'electro' ? 0.05 : 0.075, st);
    }
  }

  /* ---- voices ---- */
  _env(g, t, a, peak, dur, rel = 0.05) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + Math.max(a, dur - rel)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel); }
  _osc(type, f, t, dur, detune = 0) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; o.start(t); o.stop(t + dur + 0.3); return o; }
  _noise(t, dur) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.start(t, Math.random() * 0.5, dur + 0.1); return s; }
  _filter(type, f, q = 0.7) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  _gain(v = 1) { const g = this.ctx.createGain(); g.gain.value = v; return g; }

  kick(t, st) {
    const o = this.ctx.createOscillator(), g = this._gain(), hard = st === 'techno' || st === 'electro' || st === 'phonk';
    o.frequency.setValueAtTime(hard ? 190 : 150, t); o.frequency.exponentialRampToValueAtTime(st === 'phonk' ? 38 : 46, t + 0.11);
    g.gain.setValueAtTime(hard ? 1.0 : 0.85, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (st === 'dnb' ? 0.2 : 0.32));
    if (hard) { const w = this.ctx.createWaveShaper(); w.curve = this.drive; o.connect(w).connect(g); } else o.connect(g);
    g.connect(this.bus); o.start(t); o.stop(t + 0.4);
    const c = this._noise(t, 0.02), cg = this._gain(0.25), cf = this._filter('highpass', 2500); cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.02); c.connect(cf).connect(cg).connect(this.bus);
  }
  snare(t, st, vel = 1) {
    const clap = st === 'techno' || st === 'trance' || st === 'electro' || st === 'phonk', long = st === 'synthwave';
    const n = this._noise(t, 0.4), f = this._filter(clap ? 'bandpass' : 'highpass', clap ? 1500 : 1100, clap ? 1.2 : 0.7), g = this._gain();
    const peak = (clap ? 0.5 : 0.42) * vel, d = long ? 0.34 : st === 'dnb' ? 0.16 : 0.2;
    g.gain.setValueAtTime(peak, t); if (clap) { g.gain.setValueAtTime(peak * 0.2, t + 0.012); g.gain.setValueAtTime(peak, t + 0.024); }
    g.gain.exponentialRampToValueAtTime(0.0001, t + d); n.connect(f).connect(g).connect(this.bus);
    if (!clap) { const o = this.ctx.createOscillator(), og = this._gain(0.35 * vel); o.type = 'triangle'; o.frequency.setValueAtTime(st === 'dnb' ? 240 : 200, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); o.connect(og).connect(this.bus); o.start(t); o.stop(t + 0.15); }
    if (long) { const s = this._gain(0.25); g.connect(s).connect(this.delay); }
  }
  hat(t, d, vol) { const n = this._noise(t, d), f = this._filter('highpass', 7500), g = this._gain(vol); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.02); n.connect(f).connect(g).connect(this.bus); }
  riser(t, d) { const n = this._noise(t, d), f = this._filter('bandpass', 400, 2), g = this._gain(0.0001); f.frequency.exponentialRampToValueAtTime(7000, t + d); g.gain.exponentialRampToValueAtTime(0.22, t + d * 0.97); g.gain.linearRampToValueAtTime(0, t + d); n.connect(f).connect(g).connect(this.bus); }
  bass(t, f, d, type, cut, vol, dirty) {
    const o = this._osc(type, f, t, d), lp = this._filter('lowpass', cut, 3), g = this._gain(); lp.frequency.setValueAtTime(cut * 2.4, t); lp.frequency.exponentialRampToValueAtTime(cut, t + d * 0.7);
    this._env(g, t, 0.006, vol, d, 0.03);
    if (dirty) { const w = this.ctx.createWaveShaper(); w.curve = this.drive; o.connect(lp).connect(w).connect(g); } else o.connect(lp).connect(g);
    if (type !== 'sine') { const sub = this._osc('sine', f / (f > 80 ? 2 : 1), t, d), sg = this._gain(); this._env(sg, t, 0.006, vol * 0.8, d, 0.03); sub.connect(sg).connect(this.duck); }
    g.connect(this.duck);
  }
  sub808(t, f, d) { const o = this.ctx.createOscillator(), g = this._gain(), w = this.ctx.createWaveShaper(); w.curve = this.drive; o.frequency.setValueAtTime(f * 2.4, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    g.gain.setValueAtTime(0.5, t); g.gain.setValueAtTime(0.5, t + d * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + d); const pre = this._gain(0.7); o.connect(pre).connect(w).connect(g).connect(this.bus); o.start(t); o.stop(t + d + 0.1); }
  reese(t, f, d) { const lp = this._filter('lowpass', 500, 4), g = this._gain(); lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(900, t + d * 0.6); lp.frequency.linearRampToValueAtTime(350, t + d);
    for (const dt of [-18, 0, 17]) this._osc('sawtooth', f * 2, t, d, dt).connect(lp); const sub = this._osc('sine', f, t, d), sg = this._gain(); this._env(sg, t, 0.01, 0.32, d); sub.connect(sg).connect(this.duck);
    this._env(g, t, 0.01, 0.13, d); lp.connect(g).connect(this.duck); }
  pad(t, freqs, d, vol) { const lp = this._filter('lowpass', 1500, 0.5), g = this._gain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + d * 0.25); g.gain.setValueAtTime(vol, t + d * 0.85); g.gain.linearRampToValueAtTime(0.0001, t + d * 1.12);
    for (const f of freqs) for (const dt of [-9, 8]) this._osc('sawtooth', f, t, d * 1.15, dt).connect(lp); lp.connect(g).connect(this.duck); }
  stab(t, freqs, d, vol, cut) { const lp = this._filter('lowpass', cut, 2), g = this._gain(); this._env(g, t, 0.004, vol, d, 0.04); for (const f of freqs) for (const dt of [-14, 0, 13]) this._osc('sawtooth', f, t, d, dt).connect(lp);
    lp.connect(g).connect(this.duck); const s = this._gain(0.3); g.connect(s).connect(this.delay); this.delay.delayTime.value = this.song ? this.song.spb * 3 : 0.3; }
  pluck(t, f, d, vol, type, cut, crushed) { const o = this._osc(type, f, t, d), lp = this._filter('lowpass', cut, 2), g = this._gain(); lp.frequency.setValueAtTime(cut, t); lp.frequency.exponentialRampToValueAtTime(Math.max(300, cut * 0.25), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.05);
    if (crushed) { const w = this.ctx.createWaveShaper(); w.curve = this.crush; const pre = this._gain(0.9); o.connect(pre).connect(w).connect(lp).connect(g); } else { o.connect(lp).connect(g); const o2 = this._osc(type, f, t, d, 11); o2.connect(lp); }
    g.connect(this.duck); const s = this._gain(0.35); g.connect(s).connect(this.delay); this.delay.delayTime.value = this.song ? this.song.spb * 3 : 0.3; }
  lead(t, f, d, vol, st) { const lp = this._filter('lowpass', st === 'dnb' ? 2200 : 4200, 1.5), g = this._gain(); this._env(g, t, 0.015, vol, d, 0.08);
    const lfo = this.ctx.createOscillator(), lg = this._gain(f * 0.006); lfo.frequency.value = 5.5; lfo.connect(lg); lfo.start(t + 0.15); lfo.stop(t + d + 0.3);
    for (const dt of st === 'trance' ? [-22, -8, 0, 9, 21] : [-10, 9]) { const o = this._osc(st === 'electro' ? 'square' : 'sawtooth', f, t, d, dt); lg.connect(o.frequency); o.connect(lp); }
    const tr = this._gain(st === 'trance' ? 0.5 : 1); lp.connect(tr).connect(g).connect(this.duck); const s = this._gain(0.4); g.connect(s).connect(this.delay); }
  choir(t, f, d, vol) { const o = this._osc('sawtooth', f, t, d, -7), o2 = this._osc('sawtooth', f * 1.005, t, d, 6), g = this._gain(); this._env(g, t, 0.05, vol, d, 0.2);
    const f1 = this._filter('bandpass', 700, 6), f2 = this._filter('bandpass', 1150, 7); f1.frequency.linearRampToValueAtTime(420, t + d); f2.frequency.linearRampToValueAtTime(2300, t + d);
    const w = this.ctx.createWaveShaper(); w.curve = this.crush; const m = this._gain(2.2); o.connect(f1); o2.connect(f1); o.connect(f2); o2.connect(f2); f1.connect(m); f2.connect(m); m.connect(w).connect(g).connect(this.duck); const s = this._gain(0.6); g.connect(s).connect(this.delay); }
  acidNote(t, f, d, acc, cut) { const o = this._osc('sawtooth', f, t, d), lp = this._filter('lowpass', cut, 14), g = this._gain(), w = this.ctx.createWaveShaper(); w.curve = this.drive;
    lp.frequency.setValueAtTime(cut * (acc ? 5 : 2.6), t); lp.frequency.exponentialRampToValueAtTime(cut, t + d * 0.8); this._env(g, t, 0.004, acc ? 0.11 : 0.07, d, 0.02); o.connect(lp).connect(w).connect(g).connect(this.duck); const s = this._gain(0.25); g.connect(s).connect(this.delay); }
  cowbell(t, f, vol) { const bp = this._filter('bandpass', f * 1.5, 3), g = this._gain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28); const w = this.ctx.createWaveShaper(); w.curve = this.drive;
    this._osc('square', f, t, 0.3).connect(bp); this._osc('square', f * 1.48, t, 0.3).connect(bp); bp.connect(w).connect(g).connect(this.bus); const s = this._gain(0.2); g.connect(s).connect(this.delay); }
}
