// In-car radio. Every built-in station plays original music composed in code
// as it plays: instrumental only, no samples, no recordings, no vocals.
// MEINE MUSIK plays audio files the player adds; those stay in this browser.

export const STATIONS = [
  { id: 'sinfonia', name: 'SINFONIA', freq: '89.2', genre: 'Klassik · piano and strings', style: 'classical',
    tracks: [['Sonate für die linke Spur', 'L. van Tacho', 88, { mode: 'major', acc: 'alberti' }], ['Autobahn-Walzer', 'J. Strauss-Kreuz', 156, { meter: 3, mode: 'major', acc: 'waltz' }],
      ['Nocturne in a-Moll', 'F. Chopin-Spur', 64, { mode: 'minor', acc: 'arp' }], ['Präludium Kilometer Null', 'J. S. Bachstelze', 96, { mode: 'major', acc: 'arp' }],
      ['Kleine Nachtfahrt-Musik', 'W. A. Motorzart', 112, { mode: 'major', acc: 'alberti' }], ['Elegie im Nebel', 'E. Grauschleier', 60, { mode: 'minor', acc: 'block' }]] },
  { id: 'bunker', name: 'BUNKER', freq: '101.3', genre: 'Techno · straight from the cellar', style: 'techno',
    tracks: [['Betonwelle', 'Schicht 3', 138], ['Stahlträger', 'K. Dröhn', 140], ['Nachtschicht', 'Schicht 3', 136], ['Unterführung', 'Maschinenraum', 142]] },
  { id: 'rock', name: 'VOLLGAS ROCK', freq: '95.5', genre: 'Rock · guitars, no singer', style: 'rock',
    tracks: [['Rote Laterne', 'Die Leitplanken', 140], ['Vollgas ins Nichts', 'Kurbelwelle', 152], ['Zündfunke', 'Die Leitplanken', 132], ['Stahl & Asphalt', 'Kolbenfresser', 146]] },
  { id: 'sommer', name: 'SOMMER HITS', freq: '104.6', genre: 'Pop · summer dance beats', style: 'pop',
    tracks: [['Sommer auf der A7', 'Lena Spur', 122], ['Cabrio', 'Die Blinker', 124], ['Sonnenbrille', 'Lena Spur', 120], ['Tankstellen-Liebe', 'MAXX Tempo', 126]] },
  { id: 'nacht', name: 'NACHT FM', freq: '88.4', genre: 'Synth-pop · neon night drives', style: 'synthwave',
    tracks: [['Leitplanke Lights', 'Autobahnkind', 104], ['Kilometer 303', 'Tachonadel', 110], ['Midnight Raststätte', 'Neon Kreuz', 98], ['Fernlicht', 'Autobahnkind', 108]] },
  { id: 'kerosin', name: 'KEROSIN', freq: '98.6', genre: 'Electro-pop · crushed synths', style: 'electro',
    tracks: [['Paraffin', 'Glass Teeth', 130], ['Static Halo', 'VHS Kathedrale', 126], ['Vollgas Violet', 'Glass Teeth', 134], ['Bleifrei', 'Kaltlicht', 128]] },
  { id: 'drift', name: 'DRIFT FM', freq: '107.1', genre: 'Beats · phonk and 808s', style: 'phonk',
    tracks: [['Kickdown', 'TÜV FAILED', 122], ['Drehzahlbegrenzer', 'NOKTURN', 128], ['Linke Spur', 'TÜV FAILED', 118], ['Ölwechsel', 'NOKTURN', 125]] },
  { id: 'user', name: 'MEINE MUSIK', freq: 'AUX', genre: 'Your own tracks', user: true, tracks: [] },
];

const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10], HMINOR = [0, 2, 3, 5, 7, 8, 11], PHRYG = [0, 1, 3, 5, 7, 8, 10];
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
  async remove(i) { const rec = this.list.splice(i, 1)[0]; if (rec && this.db && rec.id != null) await new Promise((res) => { const q = this.db.transaction('tracks', 'readwrite').objectStore('tracks').delete(rec.id); q.onsuccess = q.onerror = () => res(); }); }
}

/* ------------------------------------ radio ------------------------------------ */
export class Radio {
  constructor(ctx, out) {
    this.ctx = ctx; this.station = -1; this.track = 0; this.onChange = null; this.user = new UserTracks();
    this.hidden = {};                                   // stationId -> [track indices removed by the player]
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    this.bus = ctx.createGain(); this.bus.gain.value = 1.5; this.bus.connect(comp).connect(out);
    this.duck = ctx.createGain(); this.duck.connect(this.bus);                       // side-chained to the kick
    this.delay = ctx.createDelay(1.5); this.fb = ctx.createGain(); this.fb.gain.value = 0.42;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200;
    this.delay.connect(dlp).connect(this.fb).connect(this.delay); dlp.connect(this.duck);
    // reverb: generated impulse response
    this.rev = ctx.createConvolver(); const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * (i < 400 ? i / 400 : 1); }
    this.rev.buffer = ir; this.revOut = ctx.createGain(); this.revOut.gain.value = 0.5; this.rev.connect(this.revOut).connect(this.bus);
    const nlen = ctx.sampleRate, nb = this.noise = ctx.createBuffer(1, nlen, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
    const mk = (fn) => { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) c[i] = fn(i / 511.5 - 1); return c; };
    this.crush = mk((x) => Math.round(x * 5) / 5); this.drive = mk((x) => Math.tanh(x * 3.5)); this.fuzz = mk((x) => Math.tanh(x * 9) * 0.9 + Math.tanh(x * 2) * 0.1);
    // two guitar amps, hard left and right (double-tracked rhythm guitar) and one for leads
    this.amps = [-0.8, 0.8, 0].map((pan) => {
      const inp = ctx.createGain(), hp = this._filter('highpass', 110), drive = ctx.createGain(); drive.gain.value = pan ? 14 : 20;
      const sh = ctx.createWaveShaper(); sh.curve = this.fuzz; sh.oversample = '2x';
      const cab = this._filter('lowpass', 4300, 0.9), mid = this._filter('peaking', 1700, 0.8); mid.gain.value = 4;
      const post = ctx.createGain(); post.gain.value = pan ? 0.09 : 0.08; const p = ctx.createStereoPanner(); p.pan.value = pan;
      inp.connect(hp).connect(drive).connect(sh).connect(cab).connect(mid).connect(post).connect(p).connect(this.duck);
      const s = ctx.createGain(); s.gain.value = pan ? 0.12 : 0.3; post.connect(s).connect(this.rev);
      if (!pan) { const d = ctx.createGain(); d.gain.value = 0.25; post.connect(d).connect(this.delay); }
      return inp;
    });
    this.el = new Audio(); this.el.addEventListener('ended', () => this.next()); this.elSrc = ctx.createMediaElementSource(this.el); this.elSrc.connect(out);
    this._timer = setInterval(() => this._tick(), 25);
  }

  /* ---- public controls ---- */
  get info() { if (this.station < 0) return { station: 'RADIO OFF', title: '', artist: '', freq: '' }; const s = STATIONS[this.station];
    if (s.user) { const t = this.user.list[this.track]; return { station: s.name, freq: s.freq, title: t ? t.name : 'No tracks yet', artist: t ? 'Your library' : 'Add files in the MUSIC menu' }; }
    const t = s.tracks[this.track]; if (!t) return { station: s.name, freq: s.freq, title: 'All tracks removed', artist: 'Restore them in the MUSIC menu' };
    return { station: s.name, freq: s.freq, title: t[0], artist: t[1] }; }
  playable(i) { const s = STATIONS[i], h = this.hidden[s.id] || []; return s.user ? this.user.list.map((_, k) => k) : s.tracks.map((_, k) => k).filter((k) => !h.includes(k)); }
  setStation(i, track) {
    this.station = i;
    if (i >= 0) { const ok = this.playable(i); this.track = track ?? (ok.length ? (STATIONS[i].user ? ok[0] : ok[(Math.random() * ok.length) | 0]) : -1); }
    this._start();
  }
  cycle(dir) { const n = STATIONS.length + 1; this.setStation(((this.station + 1 + dir + n) % n) - 1); }
  next(dir = 1) { if (this.station < 0) return; const ok = this.playable(this.station); if (!ok.length) { this.track = -1; this._start(); return; }
    const at = ok.indexOf(this.track); this.track = ok[((at < 0 ? (dir > 0 ? -1 : 0) : at) + dir + ok.length) % ok.length]; this._start(); }
  stop() { this.setStation(-1); }
  /** called after the player removes a track; skips it if it is the one playing */
  refresh() { if (this.station >= 0 && !this.playable(this.station).includes(this.track)) this.next(); else if (this.onChange) this.onChange(this.info); }
  _start() {
    this.el.pause(); this.song = null;
    const t = this.ctx.currentTime; this.duck.gain.cancelScheduledValues(t); this.duck.gain.setValueAtTime(1, t);
    if (this.station >= 0 && this.track >= 0) { const s = STATIONS[this.station];
      if (s.user) { const tr = this.user.list[this.track]; if (tr) { if (this._url) URL.revokeObjectURL(this._url); this._url = URL.createObjectURL(tr.blob); this.el.src = this._url; this.el.play().catch(() => {}); } }
      else if (s.tracks[this.track]) { this.song = this._compose(s, this.track); this.step = 0; this.nextTime = t + 0.12;
        // even out loudness between stations (measured)
        this.bus.gain.setTargetAtTime(1.5 * ({ classical: 2.6, techno: 0.5, rock: 1.0, pop: 1.4, synthwave: 0.4, electro: 0.7, phonk: 1.2 }[s.style] || 1), t, 0.05); } }
    if (this.onChange) this.onChange(this.info);
  }

  /* ---- composition ---- */
  _compose(st, ti) {
    const [, , bpm, opt = {}] = st.tracks[ti], R = rng(st.id.length * 7919 + ti * 104729 + bpm), style = st.style;
    const meter = opt.meter || 4, spb = meter * 4;
    const S = { style, bpm, R, meter, spb, sixteenth: 60 / bpm / 4, opt };
    const pat = (p) => Array.from({ length: 16 }, () => R() < p);
    if (style === 'classical') {
      S.scale = opt.mode === 'minor' ? HMINOR : MAJOR; S.root = 60 + [0, 2, 5, 7, -3, -1][(R() * 6) | 0];
      const progs = opt.mode === 'minor' ? [[0, 3, 4, 0, 5, 3, 4, 0], [0, 5, 3, 4, 0, 3, 4, 0], [0, 6, 5, 4, 3, 1, 4, 0]] : [[0, 3, 4, 0, 5, 1, 4, 0], [0, 5, 3, 4, 0, 3, 4, 0], [0, 4, 5, 2, 3, 0, 1, 4]];
      S.progA = progs[(R() * progs.length) | 0]; S.progB = opt.mode === 'minor' ? [5, 2, 3, 4, 5, 3, 4, 4] : [5, 3, 0, 4, 5, 1, 4, 4];
      S.form = [['A', 8], ['A2', 8], ['B', 8], ['A3', 8], ['B2', 8], ['A4', 8], ['coda', 4]];
      S.melA = this._melody(S, S.progA, R); S.melB = this._melody(S, S.progB, R);
    } else if (style === 'rock') {
      S.scale = MINOR; S.root = 40 + [0, 2, 5, 7, 4][(R() * 5) | 0];      // E2..B2
      const P = [[0, 5, 6, 0], [0, 3, 5, 6], [0, 6, 5, 6], [5, 6, 0, 0], [0, 2, 5, 6], [0, 0, 3, 4]];
      S.verse = P[(R() * P.length) | 0]; S.chorus = P[(R() * P.length) | 0]; if (S.chorus === S.verse) S.chorus = [5, 6, 0, 0];
      S.riff = Array.from({ length: 8 }, (_, i) => (i === 0 || R() < 0.45 ? 0 : [0, 0, 2, 3, 4, 6][(R() * 6) | 0]));
      S.riffRest = Array.from({ length: 8 }, (_, i) => i > 0 && R() < 0.18);
      S.form = [['intro', 8], ['verse', 8], ['pre', 4], ['chorus', 8], ['verse', 8], ['pre', 4], ['chorus', 8], ['solo', 8], ['break', 4], ['chorus', 8], ['outro', 4]];
      S.solo = Array.from({ length: 64 }, () => (R() < 0.75 ? [0, 3, 5, 7, 10, 12, 15, 17][(R() * 8) | 0] : -1));
    } else if (style === 'pop') {
      S.scale = MAJOR; S.root = 45 + [0, 2, 3, 5, 7][(R() * 5) | 0];
      const P = [[0, 4, 5, 3], [5, 3, 0, 4], [0, 5, 3, 4], [3, 4, 5, 5], [0, 3, 5, 4]];
      S.prog = P[(R() * P.length) | 0];
      S.form = [['intro', 8], ['build', 8], ['drop', 16], ['break', 8], ['build', 8], ['drop', 16], ['outro', 8]];
      S.hook = []; let d = 4; for (let s = 0; s < 32;) { const len = [2, 2, 2, 4, 4, 6][(R() * 6) | 0]; if (R() < 0.8) { d += [-2, -1, 0, 1, 1, 2][(R() * 6) | 0]; d = Math.max(0, Math.min(9, d)); S.hook.push({ s, d: [0, 1, 2, 4, 5, 7, 8, 9, 11, 12][d] === undefined ? 0 : d, len }); } s += len; }
      S.stabs = [0, 3, 6, 10, 12].filter(() => R() < 0.85); if (!S.stabs.includes(0)) S.stabs.unshift(0);
    } else {
      S.scale = style === 'phonk' ? PHRYG : MINOR; S.root = 33 + ((R() * 8) | 0);
      S.prog = [[0, 5, 2, 6], [0, 3, 5, 4], [0, 6, 5, 6], [0, 0, 5, 6], [0, 5, 3, 4], [0, 2, 5, 4]][(R() * 6) | 0];
      S.mask = pat(0.62); S.mask[0] = true; S.stab = pat(0.3);
      S.acid = Array.from({ length: 16 }, () => ({ d: [0, 0, 0, 2, 4, 6, 7][(R() * 7) | 0], acc: R() < 0.3, on: R() < 0.8, up: R() < 0.2 }));
      S.motif = []; let d = 4; for (let s = 0; s < 32;) { const len = [2, 2, 3, 4, 4, 6, 8][(R() * 7) | 0]; if (R() < 0.82) { d += [-2, -1, -1, 0, 1, 1, 2, 3][(R() * 8) | 0]; d = Math.max(0, Math.min(9, d)); S.motif.push({ s, d, len }); } s += len; }
      S.bell = Array.from({ length: 16 }, (_, i) => (R() < (i % 2 ? 0.35 : 0.7) ? [0, 0, 2, 3, 4, 6, 7][(R() * 7) | 0] : -1));
      S.kick = style === 'phonk' ? [0, 3, 6, 10, R() < 0.5 ? 13 : 11] : style === 'synthwave' ? [0, 8, R() < 0.5 ? 10 : 14] : [0, 4, 8, 12];
      S.form = [['all', 64]];
    }
    S.bars = S.form.reduce((a, f) => a + f[1], 0);
    return S;
  }
  // an 8-bar classical phrase: chord tones on strong beats, steps in between, home on the last bar
  _melody(S, prog, R) {
    const notes = [], rh4 = [[4, 4, 4, 4], [4, 2, 2, 4, 4], [6, 2, 4, 4], [8, 4, 4], [2, 2, 2, 2, 4, 4], [4, 4, 8], [4, 2, 2, 2, 2, 4]], rh3 = [[4, 4, 4], [8, 4], [6, 2, 4], [4, 2, 2, 4], [4, 8]];
    let deg = 7 + 2, motif = null;
    for (let bar = 0; bar < 8; bar++) {
      const chord = prog[bar], rh = bar === 7 ? [S.spb] : bar % 4 === 1 || bar === 5 ? motif.rh : (S.meter === 3 ? rh3 : rh4)[(R() * (S.meter === 3 ? rh3 : rh4).length) | 0];
      if (bar === 0) motif = { rh };
      let pos = 0;
      rh.forEach((len, i) => {
        const strong = pos % 4 === 0;
        if (bar === 7) deg = 7; // tonic, an octave up
        else if (strong) { const tones = [chord, chord + 2, chord + 4, chord + 7, chord + 9].filter((d) => d >= 4 && d <= 13); deg = tones.reduce((b, d) => (Math.abs(d - deg) < Math.abs(b - deg) ? d : b), tones[0]); if (R() < 0.3) deg = tones[(R() * tones.length) | 0]; }
        else deg += R() < 0.5 ? 1 : -1;
        deg = Math.max(3, Math.min(14, deg));
        if (bar === 6 && i === rh.length - 1) deg = R() < 0.5 ? 8 : 6;   // lead into the cadence
        notes.push({ s: bar * S.spb + pos, d: deg, len }); pos += len;
      });
    }
    return notes;
  }
  _deg(S, deg, oct = 0) { return S.root + 12 * (Math.floor(deg / 7) + oct) + S.scale[((deg % 7) + 7) % 7]; }
  _section(S, bar) { let b = bar % S.bars; for (const [name, n] of S.form) { if (b < n) return { name, bar: b, len: n }; b -= n; } return { name: 'end', bar: 0, len: 1 }; }

  _tick() {
    if (!this.song || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime; if (this.nextTime < now - 0.3) this.nextTime = now + 0.05;
    while (this.nextTime < now + 0.14) {
      const S = this.song, bar = Math.floor(this.step / S.spb);
      if (bar >= S.bars + (S.style === 'classical' ? 1 : 0)) { this.next(); return; }
      const fn = S.style === 'classical' ? this._classical : S.style === 'rock' ? this._rock : S.style === 'pop' ? this._pop : this._club;
      fn.call(this, S, this.step, this.nextTime);
      const swing = S.style === 'classical' && this._section(S, bar).name === 'coda' ? 1 + (this._section(S, bar).bar / 4) * 0.6 : 1;   // ritardando
      this.step++; this.nextTime += S.sixteenth * swing;
    }
  }

  /* ================================ classical ================================ */
  _classical(S, step, t) {
    const bar = Math.floor(step / S.spb), s = step % S.spb, sec = this._section(S, bar), d16 = S.sixteenth;
    if (bar >= S.bars) { if (s === 0) { const ch = S.progA[7]; this.strings(t, [0, 2, 4, 7].map((k) => mtof(this._deg(S, ch + k, -1))), d16 * 24, 0.05); this.piano(t, mtof(this._deg(S, ch, -2)), d16 * 24, 0.5, -0.3); this.timpani(t, mtof(this._deg(S, 0, -2)), 0.5); } return; }
    const B = sec.name[0] === 'B', prog = B ? S.progB : S.progA, chord = prog[sec.bar % 8], mel = B ? S.melB : S.melA;
    const N = (k, oct) => mtof(this._deg(S, chord + k, oct));
    const acc = S.opt.acc || 'alberti', beat = S.meter === 3 ? 4 : 4;
    // accompaniment
    if (sec.name === 'coda') { if (s === 0) { this.piano(t, N(0, -2), d16 * 14, 0.45, -0.3); for (const k of [2, 4, 7]) this.piano(t + 0.01 * k, N(k, -1), d16 * 14, 0.28, -0.2); } }
    else if (acc === 'waltz') { if (s === 0) this.piano(t, N(0, -2), d16 * 3.5, 0.5, -0.35); else if (s === 4 || s === 8) for (const k of [2, 4, 7]) this.piano(t, N(k, -1), d16 * 3, 0.22, -0.15); }
    else if (acc === 'alberti') { if (s % 2 === 0) { const k = [0, 4, 2, 4][(s / 2) % 4]; this.piano(t, N(k, -1), d16 * 2.2, s % 8 === 0 ? 0.32 : 0.22, -0.25); } if (s === 0) this.piano(t, N(0, -2), d16 * 8, 0.3, -0.35); }
    else if (acc === 'arp') { const k = [0, 4, 7, 9, 11, 9, 7, 4][s % 8]; this.piano(t, N(k, -1), d16 * 3, 0.2 + (s % 4 === 0 ? 0.08 : 0), -0.2); if (s === 0) this.piano(t, N(0, -2), d16 * 12, 0.32, -0.35); }
    else if (acc === 'block') { if (s === 0 || s === 8) { this.piano(t, N(0, -2), d16 * 8, 0.36, -0.35); for (const k of [2, 4]) this.piano(t + 0.012, N(k, -1), d16 * 7, 0.2, -0.2); } }
    // strings: pads under A2, carry the tune in B, everything in A3/A4
    if (s === 0 && ['A2', 'A3', 'A4', 'B', 'B2'].includes(sec.name)) this.strings(t, [N(0, -1), N(2, -1), N(4, -1), N(0, 0)], d16 * S.spb * 1.02, sec.name === 'A2' ? 0.03 : 0.04);
    if (B && s % beat === 0) this.pizz(t, N(s % 8 === 0 ? 0 : 4, -2), 0.3);
    // the tune: piano in A, strings in B, both in A4
    for (const n of mel) if (n.s === (sec.bar % 8) * S.spb + s) {
      const f = mtof(this._deg(S, n.d, 0)), dur = n.len * d16;
      if (!B || sec.name === 'A4') this.piano(t, f, dur * 1.1, 0.5, 0.15);
      if (B || sec.name === 'A3' || sec.name === 'A4') this.stringLead(t, B ? f : f / 2, dur, 0.055, 0.1);
    }
    // timpani on the cadences
    if (s === 0 && sec.bar % 8 === 6 && ['A3', 'A4', 'B2'].includes(sec.name)) this.timpani(t, mtof(this._deg(S, 4, -2)), 0.4);
    if (s === 0 && sec.bar % 8 === 7 && ['A3', 'A4'].includes(sec.name)) this.timpani(t, mtof(this._deg(S, 0, -2)), 0.5);
  }

  /* ================================== rock ================================== */
  _rock(S, step, t) {
    const bar = Math.floor(step / 16), s = step % 16, sec = this._section(S, bar), d16 = S.sixteenth, nm = sec.name;
    const prog = nm === 'chorus' || nm === 'solo' || nm === 'outro' ? S.chorus : S.verse, deg = prog[sec.bar % 4];
    const root = mtof(this._deg(S, deg, 0)), first = sec.bar === 0, last = sec.bar === sec.len - 1;
    // drums
    if (nm !== 'intro' || sec.bar >= 4) {
      if (nm === 'break') { if (s === 0 || s === 10) this.kickA(t); if (s === 8) this.snareA(t, 1); if (s % 4 === 0) this.hatA(t, 0.05, 0.12); }
      else if (nm === 'outro') { if (s === 0 && sec.bar < 2) { this.kickA(t); this.crash(t); } }
      else {
        if (s === 0 || s === 8 || (nm === 'chorus' && (s === 6 || s === 10)) || (nm === 'verse' && s === 11)) this.kickA(t);
        if (s === 4 || s === 12) this.snareA(t, 1);
        if (nm === 'chorus' || nm === 'solo') { if (s % 2 === 0) this.ride(t, s % 4 === 0 ? 0.09 : 0.06); } else if (s % 2 === 0) this.hatA(t, 0.04, s % 4 === 0 ? 0.13 : 0.09);
        if (first && s === 0 && nm !== 'verse') this.crash(t);
        if (last && s >= 8) { if (s % 2 === 0) this.tom(t, [190, 150, 120, 95][(s - 8) / 2]); }
      }
    } else if (s % 4 === 2) this.hatA(t, 0.04, 0.08);
    // guitars
    if (nm === 'intro' || nm === 'verse') { if (s % 2 === 0 && !S.riffRest[s / 2]) { const k = S.riff[s / 2]; this.power(t, mtof(this._deg(S, deg + k, 0)), d16 * 1.7, true, nm === 'intro' && sec.bar < 4 ? 0.6 : 1); } }
    else if (nm === 'pre') { if (s % 4 === 0) this.power(t, root, d16 * 3.6, false, 0.9); }
    else if (nm === 'chorus' || nm === 'solo') { if (s === 0 || s === 6 || s === 12) this.power(t, root, d16 * (s === 12 ? 4 : 6), false, 1); }
    else if (nm === 'break') { if (s === 0 || s === 3 || s === 6 || s === 10) this.power(t, root, d16 * 2, true, 1); }
    else if (nm === 'outro') { if (s === 0 && sec.bar === 0) this.power(t, mtof(this._deg(S, 0, 0)), d16 * 40, false, 1); }
    // bass guitar
    if (nm !== 'intro' && nm !== 'outro' && s % 2 === 0 && !(nm === 'break' && s % 4)) this.bassGtr(t, root / 2, d16 * 1.8, 0.3);
    if (nm === 'outro' && s === 0 && sec.bar === 0) this.bassGtr(t, mtof(this._deg(S, 0, 0)) / 2, d16 * 30, 0.3);
    // lead solo, minor pentatonic over the chorus chords
    if (nm === 'solo') { const k = S.solo[(sec.bar * 8 + (s >> 1)) % 64]; if (s % 2 === 0 && k >= 0) this.leadGtr(t, mtof(S.root + 24 + k), d16 * (s % 8 === 6 ? 3.8 : 1.8), s % 8 === 0 && Math.random() < 0.4); }
    if (nm === 'chorus' && s === 0 && sec.bar % 2 === 0) this.leadGtr(t, mtof(this._deg(S, deg + 7, 1)), d16 * 14, false, 0.05);
  }

  /* =================================== pop =================================== */
  _pop(S, step, t) {
    const bar = Math.floor(step / 16), s = step % 16, sec = this._section(S, bar), d16 = S.sixteenth, nm = sec.name;
    const deg = S.prog[sec.bar % 4], N = (k, oct) => mtof(this._deg(S, deg + k, oct));
    const drop = nm === 'drop', build = nm === 'build', intro = nm === 'intro', brk = nm === 'break', outro = nm === 'outro';
    // drums
    const kickOn = (drop || outro || (intro && sec.bar >= 4) || (build && sec.bar < 4)) && s % 4 === 0;
    if (kickOn) { this.kick(t, 'pop'); const g = this.duck.gain; g.cancelScheduledValues(t); g.setValueAtTime(0.5, t); g.linearRampToValueAtTime(1, t + d16 * 3.2); }
    if (build && sec.bar >= 4) { const rate = sec.bar >= 6 ? 1 : sec.bar >= 5 ? 2 : 4; if (s % rate === 0) this.snare(t, 'techno', 0.3 + (sec.bar - 4) * 0.12 + s / 80); }
    if (build && sec.bar === 7 && s === 0) this.riser(t, d16 * 16);
    if ((drop || outro) && (s === 4 || s === 12)) this.clap(t);
    if ((drop || build || outro) && s % 4 === 2) this.hat(t, 0.14, 0.2);
    if (drop && s % 2 === 1) this.hat(t, 0.02, 0.06);
    if (drop && sec.bar === 0 && s === 0) this.crash(t, 0.5);
    // chords: house-piano stabs in the drop, soft pads elsewhere
    const chord = [N(0, 0), N(2, 0), N(4, 0), N(7, 0)];
    if (drop && S.stabs.includes(s)) for (const f of chord) this.piano(t, f, d16 * 1.6, 0.28, 0.15, 6500);
    if ((intro || brk || build) && s === 0) this.pad(t, chord.map((f) => f * 2), d16 * 16, brk ? 0.06 : 0.045);
    if (brk && s % 4 === 0) this.piano(t, N([0, 4, 2, 7][(s / 4) % 4], 1), d16 * 3, 0.2, -0.2);
    // bass: bouncing offbeat octaves in the drop
    if (drop || outro) { if (s % 4 === 2) this.bass(t, N(0, -1), d16 * 1.6, 'sawtooth', 900, 0.24); if (s === 0) this.bass(t, N(0, -2), d16 * 1.5, 'sine', 300, 0.3); }
    else if (build && s % 8 === 0) this.bass(t, N(0, -1), d16 * 6, 'sine', 300, 0.25);
    // the hook
    if (drop || (brk && sec.bar >= 4) || (outro && sec.bar < 4)) {
      const ms = step % 32; for (const n of S.hook) if (n.s === ms) { const f = mtof(this._deg(S, n.d, 2)); this.pluck(t, f, d16 * n.len * 0.9, 0.06, 'sawtooth', 5200); this.pluck(t, f * 2, d16 * n.len * 0.5, 0.02, 'square', 6000); }
    }
  }

  /* =================== techno / synth-pop / electro / phonk =================== */
  _club(S, step, t) {
    const bar = Math.floor(step / 16), s = step % 16, sec = bar % 32, dur = S.sixteenth, st = S.style;
    const intro = sec < 4 && st !== 'techno', brk = sec >= 20 && sec < 24, full = !intro && !brk, hasLead = sec >= 12, late = sec >= 24;
    const chordDeg = S.prog[bar % 4];
    const N = (deg, oct) => mtof(this._deg(S, chordDeg + deg, oct));
    const kickOn = full && S.kick.includes(s);
    if (kickOn) { this.kick(t, st); const g = this.duck.gain, depth = st === 'synthwave' ? 0.55 : 0.25; g.cancelScheduledValues(t); g.setValueAtTime(depth, t); g.linearRampToValueAtTime(1, t + Math.min(0.28, dur * 3.4)); }
    if (!intro && (s === 4 || s === 12) && (st !== 'techno' || hasLead) && !(brk && st !== 'synthwave')) this.snare(t, st);
    const off = s % 4 === 2;
    if (st === 'techno' || st === 'electro') { if (!intro && off) this.hat(t, 0.16, 0.22); if (full && s % 2 === 1) this.hat(t, 0.03, 0.07); }
    else if (st === 'phonk') { if (!intro) { if (s % 2 === 0) this.hat(t, 0.03, 0.16); if (s === 14 && bar % 2) for (let i = 1; i < 4; i++) this.hat(t + dur * i / 2, 0.02, 0.1 + i * 0.02); } }
    else if (s % 2 === 0 && !intro) this.hat(t, s % 4 === 2 ? 0.06 : 0.03, 0.1);
    if (brk && sec === 23 && s === 0) this.riser(t, dur * 16);
    // bass
    if (st === 'synthwave') { if (s % 2 === 0) this.bass(t, N(0, s % 4 === 2 && late ? 1 : 0), dur * 1.6, 'sawtooth', 620, 0.26); }
    else if (st === 'electro') { if (S.mask[s] && !brk && !intro) this.bass(t, N(0, 0), dur * 0.9, 'square', 420 + (s % 4) * 90, 0.2, true); }
    else if (st === 'techno') { if (full && s % 4 !== 0) this.bass(t, N(0, 0), dur * 0.8, 'sine', 160, 0.3); }
    else if (st === 'phonk') { if (kickOn && (s === 0 || s === 6 || s === 10)) this.sub808(t, N(s === 10 ? 4 : 0, 0), dur * (s === 0 ? 5 : 3.5)); }
    // harmony
    if ((st === 'synthwave' || st === 'electro' || st === 'phonk') && s === 0) this.pad(t, [N(0, 2), N(2, 2), N(4, 2), N(0, 3)], dur * 16, (st === 'phonk' ? 0.035 : 0.06) * (brk || intro ? 1.5 : 1));
    if (st === 'techno' && !intro && S.stab[s]) this.stab(t, [N(0, 2), N(2, 2), N(4, 2)], dur * 0.9, 0.05, 900 + sec * 60);
    if (st === 'electro' && !intro && (s === 0 || s === 6 || s === 11)) this.stab(t, [N(0, 3), N(2, 3), N(4, 3)], dur * 2, 0.035, 2600);
    // arps and leads
    const arpDeg = [0, 2, 4, 7, 4, 2, 9, 7][s % 8];
    if (st === 'synthwave') this.pluck(t, N(arpDeg, 2), dur * 1.4, 0.055, 'sawtooth', 1800);
    else if (st === 'electro') { if (S.mask[(s + 5) % 16] || late) this.pluck(t, N([0, 4, 2, 7, 0, 9, 4, 2][(s + bar) % 8], (s * 7 + bar) % 5 === 0 ? 4 : 3), dur * 0.95, hasLead || brk ? 0.06 : 0.035, 'square', 5200, true); }
    else if (st === 'techno' && hasLead && S.acid[s].on) { const a = S.acid[s]; this.acidNote(t, mtof(this._deg(S, a.d, a.up ? 2 : 1)), dur * 0.95, a.acc, 500 + (sec - 12) * 110 + (brk ? 1500 : 0)); }
    else if (st === 'phonk' && !intro && S.bell[s] >= 0) this.cowbell(t, mtof(this._deg(S, S.bell[s] + (bar % 4 === 3 ? 1 : 0), 4)), hasLead ? 0.13 : 0.085);
    if (hasLead && (st === 'synthwave' || (st === 'electro' && late))) {
      const ms = step % 32; for (const m of S.motif) if (m.s === ms) this.lead(t, N(m.d, late ? 4 : 3), dur * m.len * 0.92, st === 'electro' ? 0.05 : 0.075, st);
    }
  }

  /* =================================== voices =================================== */
  _env(g, t, a, peak, dur, rel = 0.05) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + Math.max(a, dur - rel)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel); }
  _osc(type, f, t, dur, detune = 0) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; o.start(t); o.stop(t + dur + 0.3); return o; }
  _noise(t, dur) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.start(t, Math.random() * 0.5, dur + 0.1); return s; }
  _filter(type, f, q = 0.7) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  _gain(v = 1) { const g = this.ctx.createGain(); g.gain.value = v; return g; }
  // route a voice: dry into the ducked bus (optionally panned), plus reverb and delay sends
  _out(node, rev = 0, pan = 0, dly = 0) {
    if (pan) { const p = this.ctx.createStereoPanner(); p.pan.value = pan; node.connect(p).connect(this.duck); } else node.connect(this.duck);
    if (rev) node.connect(this._gain(rev)).connect(this.rev);
    if (dly) { node.connect(this._gain(dly)).connect(this.delay); this.delay.delayTime.value = this.song ? this.song.sixteenth * 3 : 0.3; }
  }

  // --- orchestra ---
  piano(t, f, dur, vel, pan = 0, bright = 0) {
    const out = this._gain(1), lp = this._filter('lowpass', bright || Math.min(9000, 2200 + f * 4 + vel * 2500), 0.5); lp.connect(out);
    const parts = [[1, 1], [2, 0.42], [3, 0.2], [4, 0.1], [5.03, 0.06], [6.07, 0.03]];
    const nat = Math.max(0.6, 3.2 - Math.log2(f / 110) * 0.6), end = Math.min(dur, nat);
    parts.forEach(([h, a], i) => { if (f * h > 12000) return; const o = this._osc('sine', f * h * (1 + i * 0.0006), t, end + 0.3), g = this._gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a * vel * 0.16, t + 0.004); g.gain.setTargetAtTime(0, t + 0.004, nat / (1 + i * 0.9) / 2.5);
      g.gain.setTargetAtTime(0, t + end, 0.06); o.connect(g).connect(lp); });
    const hn = this._noise(t, 0.03), hf = this._filter('bandpass', Math.min(8000, f * 5), 1.2), hg = this._gain(vel * 0.03); hg.gain.setTargetAtTime(0, t + 0.004, 0.008); hn.connect(hf).connect(hg).connect(lp);
    this._out(out, 0.35, pan);
  }
  strings(t, freqs, dur, vol) {
    const lp = this._filter('lowpass', 2400, 0.4), g = this._gain(0); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.45, dur * 0.3)); g.gain.setValueAtTime(vol, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.5);
    const lfo = this._osc('sine', 5.2, t, dur + 0.6), lg = this._gain(9); lfo.connect(lg);
    freqs.forEach((f, i) => { for (const dt of [-11, 0, 12]) { const o = this._osc('sawtooth', f, t, dur + 0.6, dt + (i % 2 ? 3 : -3)); lg.connect(o.detune); o.connect(lp); } });
    lp.connect(g); this._out(g, 0.6, -0.1);
  }
  stringLead(t, f, dur, vol, pan) {
    const lp = this._filter('lowpass', 3200, 0.5), g = this._gain(0); this._env(g, t, Math.min(0.12, dur * 0.4), vol, dur, 0.18);
    const lfo = this._osc('sine', 5.6, t, dur + 0.4), lg = this._gain(0); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(16, t + Math.min(0.4, dur)); lfo.connect(lg);
    for (const [m, dt] of [[1, -7], [1, 8], [0.5, 0]]) { const o = this._osc('sawtooth', f * m, t, dur + 0.4, dt); lg.connect(o.detune); o.connect(lp); }
    lp.connect(g); this._out(g, 0.55, pan);
  }
  pizz(t, f, vol) { const o = this._osc('triangle', f, t, 0.5), o2 = this._osc('sine', f * 2, t, 0.5), g = this._gain(0), lp = this._filter('lowpass', 1600);
    g.gain.setValueAtTime(vol * 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(lp); o2.connect(lp); lp.connect(g); this._out(g, 0.5, -0.25); }
  timpani(t, f, vol) { const o = this.ctx.createOscillator(), g = this._gain(0); o.frequency.setValueAtTime(f * 1.04, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.15);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6); o.connect(g); o.start(t); o.stop(t + 1.7);
    const n = this._noise(t, 0.08), nf = this._filter('lowpass', 400), ng = this._gain(vol * 0.6); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); n.connect(nf).connect(ng); this._out(g, 0.6); this._out(ng, 0.4); }

  // --- rock band ---
  power(t, f, dur, palm, vol) {
    [0, 1].forEach((side) => { const t0 = t + side * 0.011, g = this._gain(0), lp = this._filter('lowpass', palm ? 1100 : 7000, 0.6);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.004);
      if (palm) g.gain.setTargetAtTime(0.0001, t0 + 0.02, 0.06); else { g.gain.setValueAtTime(vol, t0 + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.08); }
      for (const m of [1, 1.5, 2]) for (const dt of side ? [7, -4] : [-6, 5]) this._osc('sawtooth', f * m, t0, dur + 0.15, dt).connect(lp);
      lp.connect(g).connect(this.amps[side]); });
  }
  bassGtr(t, f, dur, vol) { const g = this._gain(0), lp = this._filter('lowpass', 900, 1), w = this.ctx.createWaveShaper(); w.curve = this.drive;
    this._env(g, t, 0.004, vol, dur, 0.04); lp.frequency.setValueAtTime(1600, t); lp.frequency.exponentialRampToValueAtTime(500, t + dur);
    this._osc('sawtooth', f, t, dur).connect(lp); this._osc('square', f, t, dur, 6).connect(lp); const pre = this._gain(0.6); lp.connect(pre).connect(w).connect(g); this._out(g, 0.05); }
  leadGtr(t, f, dur, bend, vol = 0.12) {
    const o = this.ctx.createOscillator(); o.type = 'sawtooth'; if (bend) { o.frequency.setValueAtTime(f / 1.122, t); o.frequency.linearRampToValueAtTime(f, t + 0.09); } else o.frequency.value = f;
    const lfo = this._osc('sine', 6, t, dur), lg = this._gain(0); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(dur, 0.35)); lfo.connect(lg).connect(o.frequency);
    const g = this._gain(0); this._env(g, t, 0.006, vol, dur, 0.06); o.connect(g).connect(this.amps[2]); o.start(t); o.stop(t + dur + 0.2);
  }
  kickA(t) { const o = this.ctx.createOscillator(), g = this._gain(); o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.09); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g); o.start(t); o.stop(t + 0.4);
    const c = this._noise(t, 0.015), cf = this._filter('bandpass', 3500, 1), cg = this._gain(0.4); cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.015); c.connect(cf).connect(cg); this._out(g, 0.08); this._out(cg); }
  snareA(t, vel) { const n = this._noise(t, 0.3), f = this._filter('bandpass', 1900, 0.7), g = this._gain(0.5 * vel); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); n.connect(f).connect(g);
    const o = this.ctx.createOscillator(), og = this._gain(0.4 * vel); o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(165, t + 0.05); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); o.connect(og); o.start(t); o.stop(t + 0.12);
    this._out(g, 0.35, 0.05); this._out(og, 0.2); }
  hatA(t, d, vol) { const n = this._noise(t, d), f = this._filter('highpass', 7200), g = this._gain(vol); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.02); n.connect(f).connect(g); this._out(g, 0.05, 0.3); }
  ride(t, vol) { const g = this._gain(vol), hp = this._filter('highpass', 3000); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    for (const f of [1520, 2380, 3410, 5130]) this._osc('square', f, t, 0.7).connect(hp); hp.connect(g); this._out(g, 0.2, 0.35); }
  crash(t, vol = 0.6) { const n = this._noise(t, 1.8), f = this._filter('highpass', 4200), g = this._gain(vol * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7); n.connect(f).connect(g); this._out(g, 0.4, -0.3); }
  tom(t, f) { const o = this.ctx.createOscillator(), g = this._gain(0.5); o.frequency.setValueAtTime(f * 1.3, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(g); o.start(t); o.stop(t + 0.55); this._out(g, 0.3, (f - 140) / 200); }
  clap(t) { const n = this._noise(t, 0.3), f = this._filter('bandpass', 1300, 1.4), g = this._gain(0); for (const k of [0, 0.011, 0.022]) { g.gain.setValueAtTime(0.5, t + k); g.gain.setValueAtTime(0.1, t + k + 0.008); }
    g.gain.setValueAtTime(0.45, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); n.connect(f).connect(g); this._out(g, 0.45); }

  // --- electronic ---
  kick(t, st) {
    const o = this.ctx.createOscillator(), g = this._gain(), hard = st === 'techno' || st === 'electro' || st === 'phonk';
    o.frequency.setValueAtTime(hard ? 190 : 160, t); o.frequency.exponentialRampToValueAtTime(st === 'phonk' ? 38 : 46, t + 0.11);
    g.gain.setValueAtTime(hard ? 1.0 : 0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    if (hard) { const w = this.ctx.createWaveShaper(); w.curve = this.drive; o.connect(w).connect(g); } else o.connect(g);
    g.connect(this.bus); if (st === 'techno') { const r = this._gain(0.25), lp = this._filter('lowpass', 220); g.connect(lp).connect(r).connect(this.rev); }
    o.start(t); o.stop(t + 0.4);
    const c = this._noise(t, 0.02), cg = this._gain(0.25), cf = this._filter('highpass', 2500); cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.02); c.connect(cf).connect(cg).connect(this.bus);
  }
  snare(t, st, vel = 1) {
    const clap = st === 'techno' || st === 'electro' || st === 'phonk', long = st === 'synthwave';
    const n = this._noise(t, 0.4), f = this._filter(clap ? 'bandpass' : 'highpass', clap ? 1500 : 1100, clap ? 1.2 : 0.7), g = this._gain();
    const peak = (clap ? 0.5 : 0.42) * vel, d = long ? 0.34 : 0.2;
    g.gain.setValueAtTime(peak, t); if (clap) { g.gain.setValueAtTime(peak * 0.2, t + 0.012); g.gain.setValueAtTime(peak, t + 0.024); }
    g.gain.exponentialRampToValueAtTime(0.0001, t + d); n.connect(f).connect(g);
    if (!clap) { const o = this.ctx.createOscillator(), og = this._gain(0.35 * vel); o.type = 'triangle'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); o.connect(og).connect(this.bus); o.start(t); o.stop(t + 0.15); }
    g.connect(this.bus); g.connect(this._gain(long ? 0.5 : 0.2)).connect(this.rev);
  }
  hat(t, d, vol) { const n = this._noise(t, d), f = this._filter('highpass', 7500), g = this._gain(vol); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.02); n.connect(f).connect(g).connect(this.bus); }
  riser(t, d) { const n = this._noise(t, d), f = this._filter('bandpass', 400, 2), g = this._gain(0.0001); f.frequency.exponentialRampToValueAtTime(7000, t + d); g.gain.exponentialRampToValueAtTime(0.22, t + d * 0.97); g.gain.linearRampToValueAtTime(0, t + d); n.connect(f).connect(g); this._out(g, 0.3); }
  bass(t, f, d, type, cut, vol, dirty) {
    const o = this._osc(type, f, t, d), lp = this._filter('lowpass', cut, 3), g = this._gain(); lp.frequency.setValueAtTime(cut * 2.4, t); lp.frequency.exponentialRampToValueAtTime(cut, t + d * 0.7);
    this._env(g, t, 0.006, vol, d, 0.03);
    if (dirty) { const w = this.ctx.createWaveShaper(); w.curve = this.drive; o.connect(lp).connect(w).connect(g); } else o.connect(lp).connect(g);
    if (type !== 'sine') { const sub = this._osc('sine', f / (f > 80 ? 2 : 1), t, d), sg = this._gain(); this._env(sg, t, 0.006, vol * 0.8, d, 0.03); sub.connect(sg).connect(this.duck); }
    g.connect(this.duck);
  }
  sub808(t, f, d) { const o = this.ctx.createOscillator(), g = this._gain(), w = this.ctx.createWaveShaper(); w.curve = this.drive; o.frequency.setValueAtTime(f * 2.4, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    g.gain.setValueAtTime(0.5, t); g.gain.setValueAtTime(0.5, t + d * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + d); const pre = this._gain(0.7); o.connect(pre).connect(w).connect(g).connect(this.bus); o.start(t); o.stop(t + d + 0.1); }
  pad(t, freqs, d, vol) { const lp = this._filter('lowpass', 1500, 0.5), g = this._gain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + d * 0.25); g.gain.setValueAtTime(vol, t + d * 0.85); g.gain.linearRampToValueAtTime(0.0001, t + d * 1.12);
    for (const f of freqs) for (const dt of [-9, 8]) this._osc('sawtooth', f, t, d * 1.15, dt).connect(lp); lp.connect(g); this._out(g, 0.45); }
  stab(t, freqs, d, vol, cut) { const lp = this._filter('lowpass', cut, 2), g = this._gain(); this._env(g, t, 0.004, vol, d, 0.04); for (const f of freqs) for (const dt of [-14, 0, 13]) this._osc('sawtooth', f, t, d, dt).connect(lp);
    lp.connect(g); this._out(g, 0.3, 0, 0.3); }
  pluck(t, f, d, vol, type, cut, crushed) { const o = this._osc(type, f, t, d), lp = this._filter('lowpass', cut, 2), g = this._gain(); lp.frequency.setValueAtTime(cut, t); lp.frequency.exponentialRampToValueAtTime(Math.max(300, cut * 0.25), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.05);
    if (crushed) { const w = this.ctx.createWaveShaper(); w.curve = this.crush; const pre = this._gain(0.9); o.connect(pre).connect(w).connect(lp).connect(g); } else { o.connect(lp).connect(g); this._osc(type, f, t, d, 11).connect(lp); }
    this._out(g, 0.2, 0, 0.35); }
  lead(t, f, d, vol, st) { const lp = this._filter('lowpass', 4200, 1.5), g = this._gain(); this._env(g, t, 0.015, vol, d, 0.08);
    const lfo = this.ctx.createOscillator(), lg = this._gain(f * 0.006); lfo.frequency.value = 5.5; lfo.connect(lg); lfo.start(t + 0.15); lfo.stop(t + d + 0.3);
    for (const dt of [-10, 9]) { const o = this._osc(st === 'electro' ? 'square' : 'sawtooth', f, t, d, dt); lg.connect(o.frequency); o.connect(lp); }
    lp.connect(g); this._out(g, 0.3, 0, 0.4); }
  acidNote(t, f, d, acc, cut) { const o = this._osc('sawtooth', f, t, d), lp = this._filter('lowpass', cut, 14), g = this._gain(), w = this.ctx.createWaveShaper(); w.curve = this.drive;
    lp.frequency.setValueAtTime(cut * (acc ? 5 : 2.6), t); lp.frequency.exponentialRampToValueAtTime(cut, t + d * 0.8); this._env(g, t, 0.004, acc ? 0.11 : 0.07, d, 0.02); o.connect(lp).connect(w).connect(g); this._out(g, 0.1, 0, 0.25); }
  cowbell(t, f, vol) { const bp = this._filter('bandpass', f * 1.5, 3), g = this._gain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28); const w = this.ctx.createWaveShaper(); w.curve = this.drive;
    this._osc('square', f, t, 0.3).connect(bp); this._osc('square', f * 1.48, t, 0.3).connect(bp); bp.connect(w).connect(g); this._out(g, 0.15, 0, 0.2); }
}
