// The countryside next to the Autobahn: a Landstraße that runs alongside it on
// the right, curving through fields, past farms and along tree-lined avenues.
// Every few kilometres there is an Anschlussstelle: an exit ramp off the
// Autobahn onto the Landstraße and, a little further on, an on-ramp back.
// Narrower Kreisstraßen and gravel Feldwege branch off the Landstraße and
// rejoin it later. A wildlife fence runs along every road, so you can drive
// anywhere on the network but never leave it.
//
// Every road is a centre line x(s) over a stretch of road position s, sampled
// every 2 m, so the rest of the game (physics, traffic, police) keeps working
// in the same road coordinates: x lateral (+ right), s along the Autobahn.
// Scenery lives in world.frame like everything else (x, y, z = -s).
import * as THREE from 'three';
import { Village, placeSign } from './village.js';

const STEP = 2;                          // centre-line sample spacing (m)
// The road network is planned much further ahead than scenery is placed, so every side road, ramp and
// off-road area exists before fields, farms, lakes and trees go down (nothing ends up on a road).
const AHEAD = 5800, DECO = 2800, BEHIND = 600;
const CHUNK = 300, SHOW = 1900;          // road-surface mesh chunk length (m), and how far ahead surfaces are built
const WALL_R = 8.2 + 0.55;               // Autobahn right guardrail face (matches world.js)
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const FONT = '"DIN Alternate","Bahnschrift","DIN Condensed","Roboto Condensed","Arial Narrow",Arial,sans-serif';
// real exit names along a stretch of the A9, and small places for the yellow signs
const EXITS = ['Pfaffenhofen', 'Langenbruck', 'Allershausen', 'Schweitenkirchen', 'Manching', 'Lenting', 'Denkendorf', 'Altmühltal', 'Greding', 'Hilpoltstein', 'Allersberg', 'Wolnzach', 'Geisenfeld', 'Hohenwart'];
const PLACES = ['Haselbach', 'Oberried', 'Seewiesen', 'Hofstetten', 'Lindach', 'Eichenried', 'Moosburg', 'Rottenegg', 'Kirchdorf', 'Waldkirch', 'Unterbruck', 'Gernlinden', 'Fahlenbach', 'Reichertshofen', 'Ebenhausen', 'Tegernbach'];

// road kinds: half width (m), verge out to the fence, grip on the surface, y to avoid z-fighting
const KIND = {
  land:  { hw: 4.4, verge: 7.5, grip: 1.0, y: 0.034 },   // Landstraße: two wide lanes, centre line, edge lines
  kreis: { hw: 3.6, verge: 6.5, grip: 0.95, y: 0.028 },  // Kreisstraße: narrower, no centre line
  dirt:  { hw: 2.6, verge: 5.5, grip: 0.72, y: 0.022 },  // Feldweg: gravel, grass down the middle
  trail: { hw: 2.5, verge: 6.0, grip: 0.6, y: 0.018 },   // Waldweg / off-road track: mud, ruts, puddles, bumps
  area:  { hw: 26, verge: 3.0, grip: 0.62, y: 0.012 },   // Offroad-Gelände: an open patch of rough ground
  ramp:  { hw: 2.3, verge: 4.0, grip: 1.0, y: 0.04 },
  street: { hw: 3.2, verge: 4.5, grip: 1.0, y: 0.03 },  // village street   // Autobahn ramp: one lane, solid edges
};

/* ------------------------------------------------------------------ */
/* Textures                                                            */
/* ------------------------------------------------------------------ */
function tex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function grain(g, w, h, n, cols, size) {
  for (let i = 0; i < n; i++) { g.fillStyle = pick(cols); g.globalAlpha = Math.random() * 0.5; g.fillRect(Math.random() * w, Math.random() * h, size * (0.5 + Math.random()), size * (0.5 + Math.random())); }
  g.globalAlpha = 1;
}
// one texture tile covers the road width and 18 m of length
function asphalt(widthM, marks) {
  return tex(256, 512, (g, w, h) => {
    g.fillStyle = '#34363a'; g.fillRect(0, 0, w, h); grain(g, w, h, 9000, ['#2a2c30', '#3e4045', '#47494e', '#26282b'], 2);
    // worn wheel tracks
    for (const f of [0.25, 0.75]) { const gr = g.createLinearGradient(w * f - 26, 0, w * f + 26, 0); gr.addColorStop(0, 'rgba(25,25,27,0)'); gr.addColorStop(0.5, 'rgba(25,25,27,0.22)'); gr.addColorStop(1, 'rgba(25,25,27,0)'); g.fillStyle = gr; g.fillRect(w * f - 26, 0, 52, h); }
    const M = w / widthM; g.fillStyle = '#e8e8e2';
    if (marks.edge) for (const e of [marks.edge, widthM - marks.edge]) g.fillRect(e * M - 0.06 * M, 0, 0.12 * M, h);
    if (marks.centre) g.fillRect(w / 2 - 0.06 * M, 0, 0.12 * M, h / 3);          // Leitlinie: 6 m line, 12 m gap
  });
}
function gravel() {
  return tex(256, 512, (g, w, h) => {
    g.fillStyle = '#8a7a5c'; g.fillRect(0, 0, w, h); grain(g, w, h, 14000, ['#a08e6a', '#6f6248', '#b8a682', '#5e5340', '#9a8b6e'], 3);
    // grass down the middle and along the edges
    g.fillStyle = '#5d7a3a'; for (let i = 0; i < 900; i++) { const x = w / 2 + (Math.random() - 0.5) * w * 0.16 * (0.6 + Math.random()); g.globalAlpha = 0.6; g.fillRect(x, Math.random() * h, 3, 5); }
    for (const e of [0, w]) for (let i = 0; i < 500; i++) { g.globalAlpha = 0.7; g.fillRect(e + (e ? -1 : 1) * Math.random() * w * 0.08, Math.random() * h, 3, 5); }
    g.globalAlpha = 1;
  });
}
function mudTrack() {     // two dark muddy ruts with grass between and beside them
  return tex(256, 512, (g, w, h) => {
    g.fillStyle = '#6a5a40'; g.fillRect(0, 0, w, h); grain(g, w, h, 12000, ['#5a4a32', '#7a6a4c', '#4a3b28', '#837050'], 3);
    for (const f of [0.3, 0.7]) { g.fillStyle = 'rgba(40,30,20,0.55)'; for (let y = 0; y < h; y += 4) g.fillRect(w * f - 18 + Math.sin(y * 0.05) * 4, y, 36, 4); }
    g.fillStyle = '#5d7a3a'; g.globalAlpha = 0.7; for (let i = 0; i < 1400; i++) { const x = Math.random() < 0.5 ? w / 2 + (Math.random() - 0.5) * w * 0.18 : (Math.random() < 0.5 ? Math.random() * w * 0.12 : w - Math.random() * w * 0.12); g.fillRect(x, Math.random() * h, 3, 6); }
    g.globalAlpha = 1;
  });
}
function roughGround() {  // churned earth, gravel and patches of grass
  return tex(512, 512, (g, w, h) => {
    g.fillStyle = '#76664a'; g.fillRect(0, 0, w, h); grain(g, w, h, 30000, ['#5e4f36', '#8a7a5a', '#4f412c', '#9a8a68', '#6a5a3e'], 4);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${70 + Math.random() * 30},${100 + Math.random() * 30},50,0.5)`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 10 + Math.random() * 40, 6 + Math.random() * 30, Math.random() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 18; i++) { g.strokeStyle = 'rgba(40,30,20,0.45)'; g.lineWidth = 8 + Math.random() * 6; g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); g.bezierCurveTo(x + rand(-120, 120), y + rand(-120, 120), x + rand(-120, 120), y + rand(-120, 120), x + rand(-160, 160), y + rand(-160, 160)); g.stroke(); }
  });
}
function wireTex() {
  return tex(128, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(150,155,150,0.95)'; g.lineWidth = 1.2;
    for (let x = 0; x <= w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 2; y <= h; y += 9 + y * 0.12) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
}

/* ---------------------------- sign faces ---------------------------- */
// German signs (StVO), drawn on demand and cached
const signCache = {};
function signFace(kind, a = '', b = '') {
  const key = kind + '|' + a + '|' + b; if (signCache[key]) return signCache[key];
  const sizes = { vorweg: [512, 384], ausfahrt: [512, 320], bake: [96, 384], ww: [512, 128], wwA: [512, 192], plate: [320, 96], a330: [256, 256] };
  const [W, H] = sizes[kind] || [256, 256];
  const t = tex(W, H, (g) => {
    g.clearRect(0, 0, W, H); g.textBaseline = 'middle'; g.textAlign = 'center';
    const tri = (up, fill, border) => { g.fillStyle = fill; g.strokeStyle = border; g.lineWidth = 22; g.lineJoin = 'round'; g.beginPath();
      if (up) { g.moveTo(128, 16); g.lineTo(244, 226); g.lineTo(12, 226); } else { g.moveTo(12, 30); g.lineTo(244, 30); g.lineTo(128, 240); } g.closePath(); g.fill(); g.stroke(); };
    const rr = (x, y, w, h, r, fill) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); };
    switch (kind) {
      case 'curveL': case 'curveR': case 'curves': {     // Z 103 / Z 105: curve warnings
        tri(true, '#fff', '#d0121a'); g.strokeStyle = '#111'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); const s = kind === 'curveL' ? -1 : 1;
        if (kind === 'curves') { g.moveTo(112, 200); g.bezierCurveTo(112, 160, 152, 160, 148, 130); g.bezierCurveTo(144, 100, 104, 104, 112, 76); g.stroke(); g.beginPath(); g.moveTo(98, 86); g.lineTo(114, 62); g.lineTo(128, 88); g.stroke(); }
        else { g.lineWidth = 20; g.lineCap = 'butt'; g.moveTo(128 - s * 18, 206); g.lineTo(128 - s * 18, 138); g.quadraticCurveTo(128 - s * 18, 100, 128 + s * 20, 100); g.stroke();
          g.fillStyle = '#111'; g.beginPath(); g.moveTo(128 + s * 18, 72); g.lineTo(128 + s * 54, 100); g.lineTo(128 + s * 18, 128); g.closePath(); g.fill(); }
        break; }
      case 'deer':                                          // Z 142-10: Wildwechsel
        tri(true, '#fff', '#d0121a'); g.fillStyle = '#111'; g.beginPath();
        g.ellipse(124, 168, 46, 17, -0.25, 0, 7); g.fill(); g.fillRect(84, 170, 9, 40); g.fillRect(150, 160, 9, 46); g.fillRect(104, 175, 8, 34); g.fillRect(136, 168, 8, 38);
        g.beginPath(); g.moveTo(160, 152); g.lineTo(186, 104); g.lineTo(198, 112); g.lineTo(174, 158); g.fill(); g.beginPath(); g.ellipse(192, 104, 13, 8, -0.5, 0, 7); g.fill();
        g.lineWidth = 5; g.strokeStyle = '#111'; g.beginPath(); g.moveTo(186, 96); g.lineTo(176, 70); g.moveTo(181, 82); g.lineTo(168, 78); g.moveTo(190, 96); g.lineTo(200, 70); g.moveTo(195, 82); g.lineTo(210, 76); g.stroke();
        break;
      case 'yield':                                         // Z 205: Vorfahrt gewähren
        tri(false, '#fff', '#d0121a'); break;
      case 'priority':                                      // Z 306: Vorfahrtstraße
        g.save(); g.translate(128, 128); g.rotate(Math.PI / 4); g.fillStyle = '#fff'; g.fillRect(-86, -86, 172, 172); g.strokeStyle = '#333'; g.lineWidth = 3; g.strokeRect(-86, -86, 172, 172);
        g.fillStyle = '#f2c400'; g.fillRect(-58, -58, 116, 116); g.restore(); break;
      case 'z250':                                          // Z 250: Verbot für Fahrzeuge aller Art
        g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = '#d0121a'; g.lineWidth = 30; g.beginPath(); g.arc(128, 128, 106, 0, 7); g.stroke(); break;
      case 'limit':
        g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = '#d0121a'; g.lineWidth = 28; g.beginPath(); g.arc(128, 128, 107, 0, 7); g.stroke();
        g.fillStyle = '#111'; g.font = `bold ${+a >= 100 ? 104 : 120}px ${FONT}`; g.fillText(a, 128, 136); break;
      case 'plate':                                         // Zusatzzeichen
        g.fillStyle = '#fff'; g.fillRect(2, 2, W - 4, H - 4); g.strokeStyle = '#111'; g.lineWidth = 4; g.strokeRect(4, 4, W - 8, H - 8);
        g.fillStyle = '#111'; g.font = `bold 27px ${FONT}`; if (b) { g.fillText(a, W / 2, 33, W - 24); g.fillText(b, W / 2, 64, W - 24); } else g.fillText(a, W / 2, H / 2, W - 24); break;
      case 'chevL': case 'chevR': {                          // Z 625: Richtungstafel in Kurven
        g.fillStyle = '#fff'; g.fillRect(0, 40, 256, 176); g.fillStyle = '#d0121a'; const s = kind === 'chevL' ? -1 : 1;
        for (let k = 0; k < 3; k++) { const x = 60 + k * 70; g.beginPath(); g.moveTo(x - s * 26, 60); g.lineTo(x + s * 26, 128); g.lineTo(x - s * 26, 196); g.lineTo(x - s * 6, 196); g.lineTo(x + s * 46, 128); g.lineTo(x - s * 6, 60); g.closePath(); g.fill(); }
        break; }
      case 'vorweg': {                                      // Z 449: Vorwegweiser, 1000 m / 500 m before the exit
        const [nm, dist] = b.split('#'); b = nm;
        rr(0, 0, W, H, 20, '#fff'); rr(7, 7, W - 14, H - 14, 15, '#0f4fa3'); g.fillStyle = '#fff';
        rr(28, 26, 104, 70, 8, '#fff'); g.fillStyle = '#0f4fa3'; g.font = `bold 50px ${FONT}`; g.fillText(a, 80, 63);
        // exit pictogram: a lane leaving to the right
        g.fillStyle = '#fff'; g.fillRect(160, 34, 12, 60); g.save(); g.translate(172, 64); g.rotate(-0.6); g.fillRect(0, -6, 34, 12); g.restore();
        g.textAlign = 'left'; g.font = `bold 58px ${FONT}`; g.fillText(b, 34, 170);
        g.font = `bold 40px ${FONT}`; g.fillText(PLACES[(a.charCodeAt(0) + b.length) % PLACES.length], 34, 240);
        g.textAlign = 'right'; g.font = `bold 44px ${FONT}`; g.fillText(dist, W - 34, 330); break; }
      case 'ausfahrt': {                                    // Z 333 on the Autobahn: blue, white legend and arrow
        rr(0, 0, W, H, 20, '#fff'); rr(7, 7, W - 14, H - 14, 15, '#0f4fa3'); g.fillStyle = '#fff'; g.font = `bold 92px ${FONT}`; g.textAlign = 'left'; g.fillText('Ausfahrt', 36, 112);
        g.save(); g.translate(400, 232); g.rotate(-Math.PI / 4); g.fillRect(-54, -14, 90, 28); g.beginPath(); g.moveTo(66, 0); g.lineTo(28, -40); g.lineTo(28, 40); g.fill(); g.restore();
        rr(36, 186, 96, 76, 8, '#fff'); g.fillStyle = '#0f4fa3'; g.font = `bold 52px ${FONT}`; g.textAlign = 'center'; g.fillText(a, 84, 226); break; }
      case 'bake': {                                        // Z 450: Ankündigungsbake, blue with white slanted bars
        g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#0f4fa3'; g.fillRect(6, 6, W - 12, H - 12);
        g.save(); g.beginPath(); g.rect(6, 6, W - 12, H - 12); g.clip(); g.fillStyle = '#fff';
        const n = +a; for (let k = 0; k < n; k++) { const y = H / 2 + (k - (n - 1) / 2) * 92; g.beginPath(); g.moveTo(0, y + 16); g.lineTo(W, y - 40); g.lineTo(W, y - 12); g.lineTo(0, y + 44); g.fill(); }
        g.restore(); break; }
      case 'board':                                         // wooden board at an off-road area
        g.fillStyle = '#5a3f26'; g.fillRect(0, 40, 256, 176); g.strokeStyle = '#3a2814'; g.lineWidth = 3; for (let y = 70; y < 216; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
        g.fillStyle = '#f4ead8'; g.font = `bold 44px ${FONT}`; g.fillText(a, 128, 112, 236); g.font = `bold 22px ${FONT}`; g.fillText('Befahren auf eigene Gefahr', 128, 168, 236); break;
      case 'a330':                                          // Z 330.1: Autobahn
        rr(0, 0, W, H, 18, '#fff'); rr(6, 6, W - 12, H - 12, 14, '#0f4fa3'); g.fillStyle = '#fff';
        g.beginPath(); g.moveTo(30, 200); g.lineTo(100, 80); g.lineTo(118, 80); g.lineTo(70, 200); g.fill(); g.beginPath(); g.moveTo(226, 200); g.lineTo(156, 80); g.lineTo(138, 80); g.lineTo(186, 200); g.fill();
        g.fillRect(30, 96, 196, 16); g.fillRect(122, 140, 12, 22); g.fillRect(124, 176, 8, 22); break;
      case 'ww':                                            // yellow Wegweiser (arrow-shaped) with a place and distance
      case 'wwA': {                                         // ... or pointing to the Autobahn, with a blue A panel
        const left = b === 'L', y0 = 6, y1 = H - 6; g.fillStyle = '#111'; g.beginPath();
        if (left) { g.moveTo(4, H / 2); g.lineTo(56, y0 - 2); g.lineTo(W - 4, y0 - 2); g.lineTo(W - 4, y1 + 2); g.lineTo(56, y1 + 2); } else { g.moveTo(W - 4, H / 2); g.lineTo(W - 56, y0 - 2); g.lineTo(4, y0 - 2); g.lineTo(4, y1 + 2); g.lineTo(W - 56, y1 + 2); }
        g.closePath(); g.fill(); g.fillStyle = '#f2c400'; g.beginPath();
        if (left) { g.moveTo(12, H / 2); g.lineTo(60, y0 + 4); g.lineTo(W - 10, y0 + 4); g.lineTo(W - 10, y1 - 4); g.lineTo(60, y1 - 4); } else { g.moveTo(W - 12, H / 2); g.lineTo(W - 60, y0 + 4); g.lineTo(10, y0 + 4); g.lineTo(10, y1 - 4); g.lineTo(W - 60, y1 - 4); }
        g.closePath(); g.fill(); g.fillStyle = '#111';
        if (kind === 'wwA') { const px = left ? 74 : 26; rr(px, 22, 150, 70, 10, '#0f4fa3'); g.fillStyle = '#fff'; g.font = `bold 46px ${FONT}`; g.fillText('A 9', px + 75, 58);
          g.fillStyle = '#111'; g.font = `bold 46px ${FONT}`; g.textAlign = 'left'; g.fillText(a, px + 166, 58); g.font = `bold 30px ${FONT}`; g.fillText('Autobahn', px + 4, 140); }
        else { const [name, km] = a.split('|'); g.textAlign = 'left'; g.font = `bold 50px ${FONT}`; g.fillText(name, left ? 72 : 28, H / 2 + 2); g.textAlign = 'right'; g.fillText(km, left ? W - 24 : W - 72, H / 2 + 2); }
        break; }
    }
  });
  return (signCache[key] = t);
}

/* ------------------------------------------------------------------ */
/* Roads                                                               */
/* ------------------------------------------------------------------ */
class Road {
  constructor(kind, s0, name) { Object.assign(this, KIND[kind]); this.kind = kind; this.s0 = s0; this.xs = []; this.name = name; this.limits = []; this.taper = null; this.id = Road.n = (Road.n || 0) + 1; }
  get s1() { return this.s0 + (this.xs.length - 1) * STEP; }
  has(s) { return s >= this.s0 && s <= this.s1; }
  xAt(s) { const f = (s - this.s0) / STEP, i = clamp(Math.floor(f), 0, this.xs.length - 2), t = f - i; return this.xs[i] + (this.xs[i + 1] - this.xs[i]) * t; }
  slope(s) { const i = clamp(Math.floor((s - this.s0) / STEP), 0, this.xs.length - 2); return (this.xs[i + 1] - this.xs[i]) / STEP; }
  curv(s) { const a = this.slope(s - 6), b = this.slope(s + 6); return (b - a) / 12; }
  hwAt(s) { if (!this.taper) return this.hw; const [a0, a1, b0, b1] = this.taper; return this.hw * (s < a1 ? clamp((s - a0) / (a1 - a0), 0.08, 1) : s > b0 ? clamp((b1 - s) / (b1 - b0), 0.08, 1) : 1); }
  limitAt(s) { for (const z of this.limits) if (s >= z.s0 && s < z.s1) return z.limit; return this.kind === 'land' || this.kind === 'kreis' ? 100 : 0; }
  trim(sMin) { const n = Math.floor((sMin - this.s0) / STEP); if (n > 200 && n < this.xs.length - 4) { this.xs.splice(0, n); this.s0 += n * STEP; } }
}

export class Land {
  constructor(world) {
    this.world = world; this.frame = world.frame;
    const snow = (m, k) => world._snowy(m, k);
    this.mats = {
      land: snow(new THREE.MeshStandardMaterial({ map: asphalt(8.8, { edge: 0.35, centre: true }), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }), 0.25),
      kreis: snow(new THREE.MeshStandardMaterial({ map: asphalt(7.2, { edge: 0.3 }), roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }), 0.3),
      ramp: snow(new THREE.MeshStandardMaterial({ map: asphalt(4.6, { edge: 0.22 }), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }), 0.25),
      dirt: snow(new THREE.MeshStandardMaterial({ map: gravel(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), 0.6),
      trail: snow(new THREE.MeshStandardMaterial({ map: mudTrack(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), 0.7),
      area: snow(new THREE.MeshStandardMaterial({ map: roughGround(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -0.8, polygonOffsetUnits: -1 }), 0.75),
      water: new THREE.MeshStandardMaterial({ color: 0x3d4a52, roughness: 0.05, metalness: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }),
      mud: new THREE.MeshStandardMaterial({ color: 0x3b2c1e, roughness: 0.5, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }),
      lake: new THREE.MeshStandardMaterial({ color: 0x2f4a5c, roughness: 0.08, metalness: 0.55, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
      wire: new THREE.MeshBasicMaterial({ map: wireTex(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, depthWrite: true }),
      wood: new THREE.MeshLambertMaterial({ color: 0x6d5236 }),
      dash: new THREE.MeshBasicMaterial({ map: tex(16, 64, (g, w, h) => { g.fillStyle = '#383a3e'; g.fillRect(0, 0, w, h); g.fillStyle = '#e9e9e4'; g.fillRect(0, 0, w, h / 2); }), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }),
    };
    this.mats.street = this.mats.kreis;
    this.village = new Village((m, k) => world._snowy(m, k));
    this._scenery(); this._pools();
    this.reset();
  }

  // put one small piece of every surface in view so its shader can be compiled up front (no hitch later)
  warmup() {
    const ms = Object.values(this.mats).map((m) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), m); o.position.set(0, 0.5, -3); o.frustumCulled = false; this.frame.add(o); return o; });
    return () => { for (const o of ms) { this.frame.remove(o); o.geometry.dispose(); } };
  }

  /* ----------------------------- setup ----------------------------- */
  _scenery() {
    const inst = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; const Z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < n; i++) m.setMatrixAt(i, Z); this.frame.add(m); m.userData.i = 0; return m; };
    // fence posts, roadside posts (Leitpfosten), trees, fields
    this.posts = inst(new THREE.BoxGeometry(0.1, 1.6, 0.1).translate(0, 0.8, 0), this.mats.wood, 9000);
    const W = this.world.m;
    this.leit = inst(new THREE.BoxGeometry(0.12, 1.0, 0.1).translate(0, 0.5, 0), W.white, 700);
    this.leitBand = inst(new THREE.BoxGeometry(0.125, 0.22, 0.105).translate(0, 0.78, 0), W.dark, 700);
    const trunk = new THREE.CylinderGeometry(0.16, 0.26, 1, 5).translate(0, 0.5, 0), cone = new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0), blob = new THREE.IcosahedronGeometry(1, 1);
    const leaf = this.world.leafMat;
    const NT = 5200;
    this.tTrunk = inst(trunk, new THREE.MeshLambertMaterial({ color: 0x4a3a2a }), NT); this.tCone = inst(cone, leaf, NT); this.tBlob = inst(blob, leaf, NT);
    for (const m of [this.tCone, this.tBlob]) for (let i = 0; i < NT; i++) m.setColorAt(i, new THREE.Color(0.2, 0.3, 0.15));
    // off-road: rocks (solid), puddles and mud (low grip), plus round hay bales on the fields
    this.rocks = inst(new THREE.DodecahedronGeometry(1, 0), this.world._snowy(new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.95, flatShading: true }), 0.6), 240);
    this.puddles = inst(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), this.mats.water, 200); this.puddles.position.y = 0.048;
    this.muds = inst(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2), this.mats.mud, 200); this.muds.position.y = 0.045;
    // village street lamps and garden hedges
    this.lampPole = inst(new THREE.CylinderGeometry(0.07, 0.1, 5, 6).translate(0, 2.5, 0), new THREE.MeshStandardMaterial({ color: 0x3a3f44, metalness: 0.6, roughness: 0.4 }), 400);
    this.lampMat = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd890, emissiveIntensity: 0 });
    this.lampHead = inst(new THREE.BoxGeometry(0.9, 0.16, 0.36).translate(0.4, 5, 0), this.lampMat, 400);
    this.hedges = inst(new THREE.BoxGeometry(6.2, 1.15, 0.9).translate(0, 0.58, 0), this.world._snowy(new THREE.MeshLambertMaterial({ color: 0x2f5a26 }), 0.7), 900);
    this.bales = inst(new THREE.CylinderGeometry(0.75, 0.75, 1.2, 14).rotateZ(Math.PI / 2).translate(0, 0.75, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), 400);
    for (let i = 0; i < 400; i++) this.bales.setColorAt(i, new THREE.Color(0.9, 0.9, 0.88));
    const fieldMat = this.world._snowy(new THREE.MeshLambertMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -0.5, polygonOffsetUnits: -1 }), 0.9);
    this.fields = inst(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), fieldMat, 260);
    for (let i = 0; i < 260; i++) this.fields.setColorAt(i, new THREE.Color(0.4, 0.5, 0.3));
    this.fields.position.y = -0.012; this.fields.renderOrder = 0;
  }

  _pools() {
    const F = this.frame, W = this.world.m;
    const pool = (n, make) => { const a = []; for (let i = 0; i < n; i++) { const o = make(i); o.userData.s = -1e9; o.visible = false; F.add(o); a.push(o); } return a; };
    const B = (w, h, d, mat, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); return o; };
    // signs: one or two posts and a face whose texture and size are set when placed
    this.signs = pool(70, () => { const g = new THREE.Group();
      const p1 = B(0.08, 1, 0.08, W.steel), p2 = B(0.08, 1, 0.08, W.steel); g.add(p1, p2);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xd4d4d4, roughness: 0.6, transparent: true, alphaTest: 0.5, side: THREE.FrontSide }));
      const back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x8a8e94, roughness: 0.6 })); back.rotation.y = Math.PI;
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.55 }));
      g.add(face, back, plate); g.userData = { p1, p2, face, back, plate }; return g; });
    // Hochsitze (hunters' raised hides) at forest edges, and quarry lakes
    const wood2 = new THREE.MeshLambertMaterial({ color: 0x5a4330 });
    this.stands = pool(14, () => { const g = new THREE.Group();
      for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) { const l = B(0.14, 4.4, 0.14, wood2, x * 1.1, 2.2, z * 1.1); l.rotation.z = -x * 0.06; l.rotation.x = z * 0.06; g.add(l); }
      g.add(B(1.9, 1.5, 1.9, wood2, 0, 4.9, 0)); g.add(B(2.2, 0.12, 2.2, new THREE.MeshLambertMaterial({ color: 0x3a3030 }), 0, 5.75, 0)); g.add(B(1.2, 0.45, 0.06, W.dark, 0, 5.1, 0.96));
      const lad = B(0.5, 4.6, 0.08, wood2, 0, 2.3, 1.6); lad.rotation.x = -0.3; g.add(lad); return g; });
    this.lakes = pool(5, () => { const g = new THREE.Group(); const w = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), this.mats.lake); w.position.y = 0.03; g.add(w);
      const shore = new THREE.Mesh(new THREE.RingGeometry(1, 1.12, 40).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x7a6a50 })); shore.position.y = 0.025; g.add(shore);
      for (let k = 0; k < 26; k++) { const a = k / 26 * 6.28 + Math.random() * 0.2, reed = B(0.05, 1, 0.05, new THREE.MeshLambertMaterial({ color: 0x6a7a3a })); reed.position.set(Math.cos(a) * 1.04, 0.5, Math.sin(a) * 1.04); g.add(reed); }
      return g; });
    // farmhouses, barns, silos
    const roofMats = [0x8a3a26, 0x6a2a1c, 0x3a3c40, 0x9a4a2a].map((c) => this.world._snowy(new THREE.MeshLambertMaterial({ color: c }), 0.95));
    const wallMats = [0xf2ede2, 0xe8dcc4, 0xf4f1ea, 0xd9cfb8].map((c) => new THREE.MeshLambertMaterial({ color: c }));
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x6a4a30 }), winMat = new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.2, metalness: 0.4, emissive: 0x000000 });
    this.winMat = winMat;
    const gable = (w, d, h, mat) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2 - 0.4, 0); sh.lineTo(w / 2 + 0.4, 0); sh.lineTo(0, h); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: d + 0.8, bevelEnabled: false }); geo.translate(0, 0, -(d + 0.8) / 2); return new THREE.Mesh(geo, mat); };
    this.houses = pool(30, (i) => { const g = new THREE.Group(), kind = i % 3;
      if (kind === 2) { // silo + small shed
        const silo = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 13, 16), new THREE.MeshLambertMaterial({ color: 0xc8ccd0 })); silo.position.y = 6.5; g.add(silo);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.6, 16), roofMats[2]); cap.position.y = 13.8; g.add(cap);
        g.add(B(6, 3.4, 5, woodMat, 6, 1.7, 0)); const r = gable(6, 5, 1.6, roofMats[2]); r.position.set(6, 3.4, 0); g.add(r);
      } else {
        const w = kind ? 14 : 10, d = kind ? 9 : 8.5, h = kind ? 5 : 5.6, wall = kind ? woodMat : wallMats[i % 4];
        g.add(B(w, h, d, wall, 0, h / 2, 0)); const r = gable(w, d, kind ? 3.6 : 4.4, roofMats[i % 4]); r.position.y = h; r.rotation.y = Math.PI / 2; g.add(r);
        if (!kind) { for (const x of [-3, 0, 3]) for (const y of [1.6, 3.9]) { g.add(B(1.1, 1.2, 0.08, winMat, x, y, d / 2 + 0.02)); g.add(B(1.1, 1.2, 0.08, winMat, x, y, -d / 2 - 0.02)); }
          g.add(B(1.1, 2.1, 0.1, woodMat, -4.4, 1.05, d / 2 + 0.03)); g.add(B(0.8, 1.8, 0.8, roofMats[i % 4], 2.5, h + 2.6, 0)); }
        else { g.add(B(4.4, 3.8, 0.1, new THREE.MeshLambertMaterial({ color: 0x4a3020 }), 0, 1.9, d / 2 + 0.04)); }
      }
      return g; });
  }

  reset() {
    for (const r of this.roads || []) for (const c of r.chunks || []) this._dropChunk(c);
    for (const o of this.vObjs || []) this.frame.remove(o);
    this.roads = []; this.junctions = []; this.signQueue = []; this.gaps = []; this.patches = []; this.rockList = []; this.towns = []; this.vObjs = [];
    for (const o of [...this.signs, ...this.houses, ...this.stands, ...this.lakes]) { o.userData.s = -1e9; o.visible = false; }
    for (const m of [this.posts, this.leit, this.leitBand, this.tTrunk, this.tCone, this.tBlob, this.fields, this.rocks, this.puddles, this.muds, this.bales, this.lampPole, this.lampHead, this.hedges]) { const Z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < m.count; i++) m.setMatrixAt(i, Z); m.instanceMatrix.needsUpdate = true; m.userData.i = 0; }
    this.exitNo = 60 + ((Math.random() * 6) | 0);
    // the Landstraße: starts well to the right of the Autobahn
    this.L = new Road('land', -BEHIND - 200, 'L'); this.roads.push(this.L);
    this.gen = { x: 260, th: 0, k: 0, left: 0, nextJ: 2600 + rand(0, 900), nextBR: 400 + rand(0, 400), nextBL: 900 + rand(0, 600), plans: [], farm: 300, field: -600, tree: -600, leitS: -600, stand: 0, lake: 500, nextTown: 1400 + rand(0, 800), townPlan: null };
    this.L.xs.push(this.gen.x);
    this.built = -BEHIND - 200; this.s = 0;
    this._extend(AHEAD);
  }

  /* --------------------------- generation --------------------------- */
  // grow the Landstraße (and plan junctions and branches) up to road position `to`
  _extend(to) {
    const G = this.gen, L = this.L;
    while (L.s1 < to) {
      const s = L.s1;
      const dj = G.nextJ - s;
      if (dj < 1700 && dj > -500) {
        // approaching a junction: run in near the Autobahn and straight, so the ramps are short
        const xT = 108, thD = clamp((xT - G.x) / 520, -0.32, 0.32) * (dj < -200 ? 0 : 1), kmax = 1 / 280;
        G.k = clamp((thD - G.th) / 70, -kmax, kmax);
      } else {
        if (G.left <= 0) {   // a new piece: straight or a curve, steered back towards the middle of the band
          G.left = rand(140, 460); const want = G.x < 190 ? 1 : G.x > 520 ? -1 : 0;
          if (Math.random() < 0.38 && !want) G.k = 0;
          else { const R = rand(220, 720) * (Math.random() < 0.18 ? 0.7 : 1), sg = want || (Math.random() < 0.5 ? -1 : 1); G.k = sg / R;
            if (R < 330) this._curveSigns(s, G.left, sg, R); }
        }
        G.left -= STEP;
        if (Math.abs(G.th) > 0.42 && Math.sign(G.k) === Math.sign(G.th)) G.k = 0;
        if ((G.x < 130 && G.th < 0) || (G.x > 560 && G.th > 0)) G.k = -Math.sign(G.th) / 300;
      }
      G.th = clamp(G.th + G.k * STEP, -0.45, 0.45); G.x += Math.tan(G.th) * STEP; L.xs.push(G.x);
      const sn = L.s1;
      if (sn >= G.nextJ + 420 && !G.jDone) { G.jDone = true; this._junction(G.nextJ); }
      if (G.jDone && sn > G.nextJ + 1800) { G.lastJ = G.nextJ; G.nextJ = sn + rand(4200, 7000); G.jDone = false; }
      // villages: every few kilometres, clear of the Anschlussstellen
      if (!G.townPlan && sn >= G.nextTown) {
        if (G.nextJ - sn > 2600 && sn > (G.lastJ ?? -1e9) + 1300) { const len = rand(700, 1000); G.townPlan = { s0: sn, s1: sn + len, name: pick(PLACES) }; }
        else G.nextTown = sn + 400;
      }
      if (G.townPlan && sn >= G.townPlan.s1 + 40) { this._town(G.townPlan); G.nextTown = G.townPlan.s1 + rand(3200, 5600); G.townPlan = null; }
      // build planned side roads once the Landstraße exists all along them
      for (const B of G.plans) if (!B.done && sn >= B.end) { B.done = true; this._branch(B); }
      G.plans = G.plans.filter((B) => !B.done);
      // right side: a side road every few hundred metres (Kreisstraße, Feldweg or Waldweg)
      // up to two at once: one close to the Landstraße and one further out
      const right = G.plans.filter((B) => B.side > 0);
      const inTown = (x) => G.townPlan && x > G.townPlan.s0 - 120 && x < G.townPlan.s1 + 120;
      if (sn >= G.nextBR && right.length < 3 && !inTown(sn)) {
        const tier = [0, 1, 2].find((t) => !right.some((B) => (B.tier || 0) === t)) ?? 0, len = rand(900, 2600), k = Math.random();
        G.plans.push({ s0: sn, end: sn + len, side: 1, tier, outer: tier > 0, kind: k < 0.38 ? 'kreis' : k < 0.66 ? 'dirt' : 'trail' }); G.nextBR = sn + rand(180, 520);
      }
      // left side (between the Landstraße and the Autobahn), clear of the junctions
      const room = G.nextJ - 2100 - sn;
      if (sn >= G.nextBL && !G.plans.some((B) => B.side < 0) && sn > (G.lastJ ?? -1e9) + 1000 && room > 700 && !inTown(sn)) {
        const len = Math.min(rand(800, 1800), room), k = Math.random(); G.plans.push({ s0: sn, end: sn + len, side: -1, kind: k < 0.3 ? 'kreis' : k < 0.6 ? 'dirt' : 'trail' }); G.nextBL = sn + len + rand(100, 500);
      }
    }
  }

  _curveSigns(s, len, sg, R) {
    // warning sign, a 70 limit through tighter curves, red-white chevron boards on the outside
    const sc = s - 150; this.signQueue.push({ s: sc, road: this.L, side: 1, kind: sg < 0 ? 'curveL' : 'curveR' });
    if (R < 280) { this.L.limits.push({ s0: s - 160, s1: s + len + 40, limit: 70 }); this.signQueue.push({ s: s - 160, road: this.L, side: 1, kind: 'limit', a: '70', off: 1.2 }); }
    for (let d = 20; d < Math.min(len, 260); d += 32) this.signQueue.push({ s: s + d, road: this.L, side: -sg, kind: sg < 0 ? 'chevL' : 'chevR', chev: true });
    if (Math.random() < 0.3) this.signQueue.push({ s: s - 420, road: this.L, side: 1, kind: 'deer' });
  }

  // Anschlussstelle at Landstraße position sj: an exit ramp off the Autobahn before it, an on-ramp after it
  _junction(sj) {
    const L = this.L, no = String(this.exitNo++), name = EXITS[(+no) % EXITS.length];
    // exit: 260 m deceleration lane beside lane 3, then curving off to meet the Landstraße
    const se = sj - 660, ex = new Road('ramp', se, 'exit ' + no); ex.taper = [se, se + 80, 1e9, 1e9 + 1];
    const xL = L.xAt(sj) + 2.2, mL = L.slope(sj), d0 = se + 260, D = sj - d0;   // ends in the Landstraße's right lane
    for (let s = se; s <= sj; s += STEP) {
      if (s < d0) { ex.xs.push(7.4); continue; }
      const t = (s - d0) / D, h00 = 2 * t ** 3 - 3 * t * t + 1, h10 = t ** 3 - 2 * t * t + t, h01 = -2 * t ** 3 + 3 * t * t, h11 = t ** 3 - t * t;
      ex.xs.push(h00 * 7.4 + h10 * 0 * D + h01 * xL + h11 * mL * D);
    }
    ex.limits.push({ s0: d0, s1: d0 + 200, limit: 80 }, { s0: d0 + 200, s1: sj + 10, limit: 60 }); ex.joins = L;
    this.roads.push(ex); this._gap(ex);
    // signs on the Autobahn: Vorwegweiser at 1000 m and 500 m, countdown boards, Ausfahrt at the gore
    this.signQueue.push({ s: se - 1000, x: WALL_R + 3.2, kind: 'vorweg', a: no, b: name, dist: '1000 m', big: true });
    this.signQueue.push({ s: se - 500, x: WALL_R + 3.2, kind: 'vorweg', a: no, b: name, dist: '500 m', big: true });
    for (const [d, n] of [[300, 3], [200, 2], [100, 1]]) this.signQueue.push({ s: se - d, x: WALL_R + 1.0, kind: 'bake', a: String(n), bake: true });
    let sg = d0; while (sg < sj && ex.xAt(sg) - ex.hw < WALL_R + 2.6) sg += STEP;
    this.signQueue.push({ s: sg, x: (WALL_R + ex.xAt(sg) - ex.hw) / 2 + 0.4, kind: 'ausfahrt', a: no, gore: true });
    this.signQueue.push({ s: d0 + 30, road: ex, side: 1, kind: 'limit', a: '80' }, { s: d0 + 200, road: ex, side: 1, kind: 'limit', a: '60' });
    this.signQueue.push({ s: sj - 40, road: ex, side: 1, kind: 'yield' });
    this.signQueue.push({ s: sj - 70, road: ex, side: 1, kind: 'ww', a: pick(PLACES) + '|' + ((2 + Math.random() * 9) | 0), b: 'R', ww: true });
    this.signQueue.push({ s: sj + 60, road: L, side: 1, kind: 'priority' });
    // on-ramp back onto the Autobahn, leaving the Landstraße to the left
    const sa = sj + 340, xa = L.xAt(sa), ma = L.slope(sa), D2 = 400, a1 = sa + D2, a2 = a1 + 250, en = new Road('ramp', sa, 'entry ' + no);
    for (let s = sa; s <= a2 + 70; s += STEP) {
      if (s > a1) { en.xs.push(s > a2 ? 7.4 - (s - a2) / 70 * 1.6 : 7.4); continue; }
      const t = (s - sa) / D2, h00 = 2 * t ** 3 - 3 * t * t + 1, h10 = t ** 3 - 2 * t * t + t, h01 = -2 * t ** 3 + 3 * t * t;
      en.xs.push(h00 * xa + h10 * ma * D2 + h01 * 7.4);
    }
    en.taper = [-1e9, -1e9 + 1, a2, a2 + 70]; en.toAutobahn = true; en.from = L; en.limits.push({ s0: sa, s1: a1 - 40, limit: 80 });
    this.roads.push(en); this._gap(en);
    this.signQueue.push({ s: sa - 160, road: L, side: 1, kind: 'wwA', a: pick(['München', 'Nürnberg']), b: 'L', ww: true });
    this.signQueue.push({ s: sa + 80, road: en, side: 1, kind: 'a330' }, { s: sa + 30, road: en, side: 1, kind: 'limit', a: '80' });
    this.junctions.push({ s0: se - 1100, s1: a2 + 300, sj, exit: ex, entry: en, no, name });
  }

  // guardrail gap wherever a ramp runs close to the Autobahn (until the ramp's own fence line is clear of the guardrail)
  _gap(r) { let a = null; for (let s = r.s0; s <= r.s1; s += STEP) { const near = r.xAt(s) - r.hwAt(s) - r.verge < WALL_R + 1.5; if (near && a === null) a = s; if (!near && a !== null) { this.gaps.push([a, s]); a = null; } } if (a !== null) this.gaps.push([a, r.s1]); }

  // a side road that leaves `parent` on one side and rejoins it later
  _sideRoad(parent, s0, s1, kind, side, A) {
    const len = s1 - s0, r = new Road(kind, s0, kind), ph = rand(0, 6), wig = kind === 'trail' ? 0.28 : kind === 'dirt' ? 0.16 : 0.12, fq = kind === 'trail' ? 16 : 9;
    for (let s = s0; s <= s1; s += STEP) { const t = (s - s0) / len, env = smooth(t / 0.24) * smooth((1 - t) / 0.24);
      r.xs.push(parent.xAt(s) + side * env * (A + Math.sin(t * fq + ph) * A * wig)); }
    r.joins = parent; r.side = side; this.roads.push(r);
    const sd = side > 0 ? 1 : -1;
    if (kind === 'kreis') this.signQueue.push({ s: s0 - 90, road: parent, side: 1, kind: 'ww', a: pick(PLACES) + '|' + ((3 + Math.random() * 8) | 0), b: sd > 0 ? 'R' : 'L', ww: true });
    else if (kind !== 'street') this.signQueue.push({ s: s0 + 60, road: r, side: 1, kind: 'z250', plate: kind === 'trail' ? ['Forstwirtschaftlicher', 'Verkehr frei'] : ['Landwirtschaftlicher', 'Verkehr frei'] });
    this.signQueue.push({ s: s1 - 60, road: r, side: 1, kind: 'yield' });
    // puddles and mud on the unsurfaced ones
    if (kind === 'trail' || kind === 'dirt') for (let k = 0, n = kind === 'trail' ? (len / 90) | 0 : (len / 260) | 0; k < n; k++) {
      const ss = s0 + rand(0.12, 0.88) * len; this._patch(r.xAt(ss) + rand(-1, 1) * r.hw * 0.5, ss, rand(1.6, kind === 'trail' ? 3.6 : 2.4), Math.random() < 0.55 ? 'water' : 'mud'); }
    return r;
  }
  _branch(B) {
    const L = this.L, len = B.end - B.s0;
    let A = B.tier === 2 ? rand(560, 780) : B.outer ? rand(320, 520) : B.kind === 'kreis' ? rand(140, 260) : B.kind === 'dirt' ? rand(60, 150) : rand(80, 200);
    if (B.side < 0) { let xmin = Infinity; for (let s = B.s0; s < B.end; s += 20) xmin = Math.min(xmin, L.xAt(s)); A = Math.min(A, xmin - 60); if (A < 35) return; }
    const r = this._sideRoad(L, B.s0, B.end, B.kind, B.side, A);
    // more to find: a Feldweg or Waldweg off a Kreisstraße, an off-road area off a Waldweg
    if ((r.kind === 'kreis' || r.kind === 'dirt') && len > 1000) { const a = B.s0 + len * rand(0.2, 0.35), b = Math.min(B.end - len * 0.15, a + rand(500, 1100));
      this._sideRoad(r, a, b, Math.random() < 0.5 ? 'trail' : 'dirt', B.side, rand(60, 140)); }
    const host = r.kind === 'trail' ? r : r.kind === 'kreis' && Math.random() < 0.5 ? r : null;
    if (host && len > 700 && Math.random() < 0.8) this._area(host, B.s0 + len * rand(0.3, 0.5), rand(280, 520), B.side);
    this._farm(r, B.s0 + len * rand(0.35, 0.65), B.side);
  }
  // Offroad-Gelände: a wide patch of rough ground with rocks, mud and water, entered from a track
  _area(parent, s0, len, side) {
    const s1 = s0 + len; if (!parent.has(s0) || !parent.has(s1)) return;
    const a = new Road('area', s0, 'Gelände'), A = rand(40, 70);
    for (let s = s0; s <= s1; s += STEP) { const t = (s - s0) / len, env = smooth(t / 0.2) * smooth((1 - t) / 0.2); a.xs.push(parent.xAt(s) + side * env * A); }
    a.taper = [s0, s0 + 70, s1 - 70, s1]; a.joins = parent; this.roads.push(a);
    for (let k = 0; k < 14; k++) { const ss = s0 + rand(0.2, 0.8) * len, x = a.xAt(ss) + rand(-0.8, 0.8) * a.hwAt(ss); this._rock(x, ss, rand(0.6, 1.5)); }
    for (let k = 0; k < 10; k++) { const ss = s0 + rand(0.15, 0.85) * len; this._patch(a.xAt(ss) + rand(-0.8, 0.8) * a.hwAt(ss), ss, rand(2.5, 6), Math.random() < 0.45 ? 'water' : 'mud'); }
    this.signQueue.push({ s: s0 - 30, road: parent, side: side, kind: 'board', a: pick(['OFFROAD', 'KIESGRUBE', 'GELÄNDE']), b: '' });
  }
  // a Dorf on the Landstraße: Ortstafeln, 50 limit, houses both sides, a church, lamps, a side street
  _town(T) {
    const L = this.L, len = T.s1 - T.s0; this.towns.push(T); L.limits.push({ s0: T.s0, s1: T.s1, limit: 50 });
    this.signQueue.push({ s: T.s0, road: L, side: 1, kind: 'ort', a: T.name, b: 'Landkreis Pfaffenhofen', off: 1.4 });
    this.signQueue.push({ s: T.s1, road: L, side: 1, kind: 'ortEnd', a: T.name, b: pick(PLACES), off: 1.4 });
    const st = this._sideRoad(L, T.s0 + len * 0.18, T.s0 + len * 0.82, 'street', 1, rand(60, 85));
    const add = (o, x, s, rot) => { o.position.set(x, 0, -s); o.rotation.y = rot; o.userData.s = s; this.frame.add(o); this.vObjs.push(o); };
    const row = (rd, a, b, sides, depth) => {
      for (let s = a; s < b; s += rand(21, 29)) for (const sd of sides) {
        if (Math.random() < 0.12) continue; const th = Math.atan(rd.slope(s)), off = rd.hw + rd.verge + depth, x = rd.xAt(s) + sd * off / Math.cos(th);
        if (!this.clear(x, s, 5.5)) continue; add(this.village.house(), x, s, -th + (sd > 0 ? -Math.PI / 2 : Math.PI / 2)); }
    };
    row(L, T.s0 + 30, T.s1 - 20, [-1, 1], 7.5); row(st, st.s0 + 60, st.s1 - 60, [-1, 1], 7);
    const sc = T.s0 + len * 0.5, thc = Math.atan(L.slope(sc)), xc = L.xAt(sc) - (L.hw + L.verge + 14) / Math.cos(thc);
    if (this.clear(xc, sc, 12)) add(this.village.churchMesh(), xc, sc, -thc + Math.PI / 2);
    for (const rd of [L, st]) for (let s = (rd === L ? T.s0 : st.s0) + 10; s < (rd === L ? T.s1 : st.s1); s += 32) for (const sd of [-1, 1]) {
      const th = Math.atan(rd.slope(s)), x = rd.xAt(s) + sd * (rd.hw + 1.3) / Math.cos(th), i = this.lampPole.userData.i; this.lampPole.userData.i = this.lampHead.userData.i = (i + 1) % this.lampPole.count;
      _M.compose(_v.set(x, 0, -s), _q.setFromEuler(_e.set(0, -th + (sd > 0 ? Math.PI : 0), 0)), _sc.set(1, 1, 1)); this.lampPole.setMatrixAt(i, _M); this.lampHead.setMatrixAt(i, _M); }
    this.lampPole.instanceMatrix.needsUpdate = true; this.lampHead.instanceMatrix.needsUpdate = true;
  }

  _rock(x, s, sz) {
    const i = this.rocks.userData.i; this.rocks.userData.i = (i + 1) % this.rocks.count;
    this.rocks.setMatrixAt(i, _M.compose(_v.set(x, sz * 0.35, -s), _q.setFromEuler(_e.set(rand(0, 3), rand(0, 3), 0)), _sc.set(sz, sz * 0.7, sz * 1.1))); this.rocks.instanceMatrix.needsUpdate = true;
    this.world.obstacles.push({ x, s, psi: 0, L: sz * 1.6, W: sz * 1.4, vx: 0, vs: 0, r: 0, m: Infinity, I: Infinity, rock: true });
  }
  _patch(x, s, rad, kind) {
    const m = kind === 'water' ? this.puddles : this.muds, i = m.userData.i; m.userData.i = (i + 1) % m.count;
    m.setMatrixAt(i, _M.compose(_v.set(x, 0, -s), _q.setFromEuler(_e.set(0, rand(0, 3), 0)), _sc.set(rad, 1, rad * rand(0.6, 1)))); m.instanceMatrix.needsUpdate = true;
    this.patches.push({ x, s, r: rad, kind });
  }

  _farm(road, s, side) {
    const th = Math.atan(road.slope(s)), off = road.hw + rand(18, 34);
    const x0 = road.xAt(s) + side * off * Math.cos(th);
    let k = 0;
    for (const [dx, ds, kind] of [[0, 0, 0], [side * 4, 22, 1], [side * 22, 8, 2]]) {
      const x = x0 + dx, ss = s + ds; if (!this.clear(x, ss, 11)) continue;
      const pool = this.houses.filter((h, i) => i % 3 === kind); let o = pool[0]; for (const h of pool) if (h.userData.s < o.userData.s) o = h;
      o.userData.s = ss; o.position.set(x, 0, -ss); o.rotation.y = -th + (side > 0 ? 0 : Math.PI) + (kind === 1 ? Math.PI / 2 : 0); o.visible = true; k++;
    }
    return k;
  }

  /* --------------------------- queries --------------------------- */
  townAt(s, r = this.L) { if (r !== this.L) return null; for (const T of this.towns) if (s >= T.s0 && s <= T.s1) return T; return null; }
  roadsAt(s) { const out = []; for (const r of this.roads) if (s >= r.s0 && s <= r.s1) out.push(r); return out; }
  railGap(s) { for (const g of this.gaps) if (s >= g[0] && s <= g[1]) return true; return false; }
  nearJunction(s, m) { for (const j of this.junctions) if (s > j.s0 - m && s < j.s1 + m) return true;
    const nj = this.gen.nextJ; return s > nj - 1800 - m && s < nj + 1300 + m; }   // planned, not built yet
  // which road a point is on (nearest centre whose corridor holds it), or null on the Autobahn / nowhere
  roadAt(x, s) {
    let best = null, bd = Infinity;
    for (const r of this.roads) { if (s < r.s0 || s > r.s1) continue; const d = Math.abs(x - r.xAt(s)); if (d < r.hwAt(s) + r.verge && d < bd) { bd = d; best = r; } }
    if (best && x < WALL_R && (best.kind === 'ramp')) { const d = Math.abs(x - best.xAt(s)); if (d > best.hwAt(s)) return null; }
    return best;
  }
  onAutobahn(x, s) { return x <= WALL_R + 0.3 && !(x > 5.7 && this.roadAt(x, s) && this.roadAt(x, s).kind === 'ramp' && this.roadAt(x, s).xAt(s) - this.roadAt(x, s).hwAt(s) > WALL_R - 3.5); }
  // nothing within r metres of any road corridor (for scenery placement)
  clear(x, s, r) {
    if (x < WALL_R + r + 4) return false;
    for (const rd of this.roads) { if (s < rd.s0 - r || s > rd.s1 + r) continue; const ss = clamp(s, rd.s0, rd.s1); if (Math.abs(x - rd.xAt(ss)) < rd.hw + rd.verge + r) return false; }
    return true;
  }
  /** walls at road position s for something at lateral x: the union of the corridors around x.
   *  aMax: the Autobahn's right wall at s (guardrail, or wider where a ramp leaves). */
  corridor(s, x, aMin, aMax) {
    const iv = [[aMin, this.railGap(s) ? aMax + 3 : aMax]];
    for (const r of this.roads) { if (s < r.s0 || s > r.s1) continue; const xc = r.xAt(s), w = r.hwAt(s) + (r.hwAt(s) < r.hw * 0.5 ? 0.5 : r.verge);
      let lo = xc - w, hi = xc + w; if (!this.railGap(s)) lo = Math.max(lo, WALL_R + 0.4); if (hi > lo) iv.push([lo, hi]); }
    iv.sort((a, b) => a[0] - b[0]);
    // merge overlapping corridors, then take the one that holds x (or the nearest)
    const m = []; for (const v of iv) { const t = m[m.length - 1]; if (t && v[0] <= t[1]) t[1] = Math.max(t[1], v[1]); else m.push([...v]); }
    let best = m[0], bd = Infinity; for (const v of m) { const d = x < v[0] ? v[0] - x : x > v[1] ? x - v[1] : 0; if (d < bd) { bd = d; best = v; } }
    return { min: best[0], max: best[1] };
  }
  // grip at a point off the Autobahn: road surface, or grass on the verge
  surface(x, s) {
    let g = 0.58;   // wet grass
    for (const r of this.roads) { if (s < r.s0 || s > r.s1) continue; if (Math.abs(x - r.xAt(s)) <= r.hwAt(s) + 0.15) g = Math.max(g, r.grip); }
    const p = this.patchAt(x, s); if (p) g = Math.min(g, p.kind === 'water' ? 0.5 : 0.42);
    return g;
  }
  patchAt(x, s) { for (const p of this.patches) { const dx = x - p.x, ds = s - p.s; if (dx * dx + ds * ds < p.r * p.r) return p; } return null; }
  // how bumpy the ground is (0 smooth asphalt .. ~0.08 churned off-road ground)
  rough(x, s) {
    let best = null, bd = Infinity;
    for (const r of this.roads) { if (s < r.s0 || s > r.s1) continue; const d = Math.abs(x - r.xAt(s)); if (d < r.hwAt(s) + r.verge && d < bd) { bd = d; best = r; } }
    if (!best) return 0;
    const onIt = bd <= best.hwAt(s);
    return best.kind === 'area' ? 0.075 : best.kind === 'trail' ? (onIt ? 0.055 : 0.07) : best.kind === 'dirt' ? (onIt ? 0.028 : 0.05) : onIt ? 0 : 0.035;
  }
  limitAt(x, s) { const r = this.roadAt(x, s); return r ? r.limitAt(s) : 0; }

  /* --------------------------- building --------------------------- */
  _ribbon(r, a, b) {
    const pos = [], uv = [], idx = [], n = Math.ceil((b - a) / 4);
    for (let i = 0; i <= n; i++) {
      const s = Math.min(b, a + i * 4), xc = r.xAt(s), th = Math.atan(r.slope(s)), hw = r.hwAt(s) / Math.cos(th);
      pos.push(xc - hw, r.y, -s, xc + hw, r.y, -s); const v = s / 18; uv.push(0, v, 1, v);
      if (i) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); for (let i = 1; i < g.attributes.normal.count * 3; i += 3) g.attributes.normal.array[i] = 1;
    const m = new THREE.Mesh(g, this.mats[r.kind]); m.renderOrder = 1; return m;
  }
  _fence(r, a, b, side, w) {
    // posts every 6 m along the corridor edge, skipped where another road's corridor (or the Autobahn) is
    const pts = [];
    for (let s = a; s < b; s += 6) {
      const th = Math.atan(r.slope(s)), x = r.xAt(s) + side * (r.hw + r.verge) / Math.cos(th);
      const other = this.roads.some((o) => o !== r && o.has(s) && Math.abs(x - o.xAt(s)) < o.hwAt(s) + o.verge + 0.5) || x < WALL_R + 2;
      if (other) { pts.push(null); continue; }
      if (r.kind === 'street' || this.townAt(s, r)) {   // in a village: garden hedges instead of the wildlife fence
        if (Math.round(s / 6) % 1 === 0) { const j = this.hedges.userData.i; this.hedges.userData.i = (j + 1) % this.hedges.count;
          this.hedges.setMatrixAt(j, _M.compose(_v.set(x, 0, -s - 3), _q.setFromEuler(_e.set(0, Math.PI / 2 - th, 0)), _sc.set(1, 1, 1))); this.hedges.instanceMatrix.needsUpdate = true; }
        pts.push(null); continue; }
      const i = this.posts.userData.i; this.posts.userData.i = (i + 1) % this.posts.count;
      this.posts.setMatrixAt(i, _M.makeTranslation(x, 0, -s)); pts.push([x, -s]);
    }
    this.posts.instanceMatrix.needsUpdate = true;
    // wire mesh between consecutive posts (collected for the whole chunk, one mesh)
    for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i]; if (!p || !q) continue; const n = w.n;
      w.pos.push(p[0], 0.1, p[1], q[0], 0.1, q[1], p[0], 1.45, p[1], q[0], 1.45, q[1]); w.uv.push(0, 0, 0.75, 0, 0, 1, 0.75, 1); w.idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); w.n += 4; }
  }
  _wire(w, chunk) {
    if (!w.n) return; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(w.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(w.uv, 2)); g.setIndex(w.idx);
    const m = new THREE.Mesh(g, this.mats.wire); this.frame.add(m); chunk.meshes.push(m);
  }
  // Waldweg: dense trees just beyond the fence on both sides
  _forest(r, a, b) {
    for (let s = a; s < b; s += r.kind === 'area' ? 9 : 4) for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) {
      if (Math.random() < 0.2) continue; const th = Math.atan(r.slope(s + k * 2)), x = r.xAt(s + k * 2) + sd * (r.hwAt(s) + r.verge + rand(1.2, k ? 40 : 12)) / Math.cos(th);
      if (this._treeOk(x, s + k * 2, 0.5)) this._tree(x, s + k * 2, Math.random() < 0.72, 1 + Math.random() * 0.6); }
  }
  _buildChunks(upTo) {
    for (const r of this.roads) {
      r.chunks = r.chunks || []; r.builtTo = r.builtTo ?? r.s0;
      while (r.builtTo < Math.min(upTo, r.s1 - 0.01)) {
        const a = r.builtTo, b = Math.min(r.s1, a + CHUNK), c = { a, b, meshes: [] };
        const rib = this._ribbon(r, a, b); this.frame.add(rib); c.meshes.push(rib);
        if (r.kind !== 'ramp' || r.xAt(a) > WALL_R + 6) { const w = { pos: [], uv: [], idx: [], n: 0 }; this._fence(r, a, b, 1, w); this._fence(r, a, b, -1, w); this._wire(w, c); }
        if (r.kind === 'ramp' && r.xAt(a) < 9) this._dashes(r, a, b, c);
        if (r.kind === 'land' || r.kind === 'kreis' || r.kind === 'ramp') this._leitposts(r, a, b);
        if (r.kind === 'trail' || r.kind === 'area') this._forest(r, a, b);
        r.chunks.push(c); r.builtTo = b;
      }
    }
  }
  // the wide broken line between lane 3 and a deceleration / acceleration lane
  _dashes(r, a, b, c) {
    const pos = [], uv = [], idx = []; let n = 0;
    for (let s = a; s < b; s += 4) { if (r.xAt(s) > 9 || r.hwAt(s) < 1) continue;
      pos.push(5.47, 0.05, -s, 5.78, 0.05, -s, 5.47, 0.05, -(s + 4), 5.78, 0.05, -(s + 4)); const v = s / 12; uv.push(0, v, 1, v, 0, v + 1 / 3, 1, v + 1 / 3); idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); n += 4; }
    if (!n) return; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const mt = this.mats.dash; mt.map.wrapT = THREE.RepeatWrapping; const m = new THREE.Mesh(g, mt); m.renderOrder = 2; this.frame.add(m); c.meshes.push(m);
  }
  _leitposts(r, a, b) {
    for (let s = Math.ceil(a / 50) * 50; s < b; s += 50) for (const sd of [-1, 1]) {
      if (r.kind === 'street' || this.townAt(s, r)) continue;
      const th = Math.atan(r.slope(s)), x = r.xAt(s) + sd * (r.hwAt(s) + 0.8) / Math.cos(th); if (x < WALL_R + 1) continue;
      const i = this.leit.userData.i; this.leit.userData.i = (i + 1) % this.leit.count; _M.makeRotationY(-th).setPosition(x, 0, -s);
      this.leit.setMatrixAt(i, _M); this.leitBand.setMatrixAt(i, _M);
    }
    this.leit.instanceMatrix.needsUpdate = true; this.leitBand.instanceMatrix.needsUpdate = true;
  }
  _dropChunk(c) { for (const m of c.meshes) { this.frame.remove(m); m.geometry.dispose(); } c.meshes.length = 0; }

  // trees (avenues and copses), fields and farms beside the Landstraße
  _decorate(upTo) {
    const G = this.gen, L = this.L;
    while (G.tree < upTo) {
      const s = G.tree; G.tree += 16;
      const avenue = Math.sin(s / 900 + 1.3) > 0.25;
      if (avenue && L.has(s)) for (const sd of [-1, 1]) { const th = Math.atan(L.slope(s)), x = L.xAt(s) + sd * (L.hw + L.verge + 1.3) / Math.cos(th); if (this._treeOk(x, s, 0.3)) this._tree(x, s, false, 1); }   // Allee: a row each side, just beyond the fence
      if (Math.random() < 0.55) { const xL = L.has(s) ? L.xAt(s) : 240; const x = Math.random() < 0.5 ? xL + rand(14, 260) : rand(30, xL - 14); if (this._treeOk(x, s, 4)) this._tree(x, s, Math.random() < 0.5, 0.8 + Math.random() * 0.5); }
    }
    while (G.field < upTo) {
      const s = G.field; G.field += rand(90, 170);
      const xL = L.has(s) ? L.xAt(s) : 240, w = rand(70, 200), d = rand(70, 220), x = Math.random() < 0.65 ? xL + rand(20, 360) + w / 2 : rand(40, Math.max(60, xL - 20 - w / 2));
      let ok = true; for (let a = -0.5; a <= 0.5 && ok; a += 0.25) for (let b = -0.5; b <= 0.5; b += 0.25) if (!this.clear(x + a * w, s + b * d, 6)) { ok = false; break; }
      if (!ok) continue;
      const i = this.fields.userData.i; this.fields.userData.i = (i + 1) % this.fields.count;
      this.fields.setMatrixAt(i, _M.compose(_v.set(x, 0, -s), _q.identity(), _sc.set(w, 1, d)));
      const c = pick(['#d8c22a', '#c9b46a', '#5d7f34', '#6b5236', '#7a9a3e', '#a08a52', '#4f6e2c']); this.fields.setColorAt(i, _c.set(c));   // rapeseed, wheat, young crops, ploughed, meadow, stubble
      this.fields.instanceMatrix.needsUpdate = true; this.fields.instanceColor.needsUpdate = true;
      if ((c === '#c9b46a' || c === '#a08a52') && Math.random() < 0.7) for (let k = 0, n = 3 + ((Math.random() * 6) | 0); k < n; k++) {   // round bales on harvested fields
        const j = this.bales.userData.i; this.bales.userData.i = (j + 1) % this.bales.count;
        this.bales.setMatrixAt(j, _M.compose(_v.set(x + rand(-0.4, 0.4) * w, 0, -(s + rand(-0.4, 0.4) * d)), _q.setFromEuler(_e.set(0, rand(0, 3), 0)), _sc.set(1, 1, 1)));
        this.bales.setColorAt(j, _c.set(Math.random() < 0.6 ? '#eeeeea' : '#c8b070')); this.bales.instanceMatrix.needsUpdate = true; this.bales.instanceColor.needsUpdate = true; }
    }
    while (G.stand < upTo) { const s = G.stand; G.stand += rand(500, 1100); const xL = L.has(s) ? L.xAt(s) : 260, x = xL + rand(-1, 1) * rand(40, 300);
      if (this.clear(x, s, 4)) { let o = this.stands[0]; for (const q of this.stands) if (q.userData.s < o.userData.s) o = q; o.userData.s = s; o.position.set(x, 0, -s); o.rotation.y = rand(0, 6); o.visible = true; } }
    while (G.lake < upTo) { const s = G.lake; G.lake += rand(1600, 3200); const rad = rand(35, 80), xL = L.has(s) ? L.xAt(s) : 260, x = xL + (Math.random() < 0.6 ? 1 : -1) * rand(rad + 40, rad + 260);
      if (x > WALL_R + rad + 40 && this.clear(x, s, rad + 8)) { let o = this.lakes[0]; for (const q of this.lakes) if (q.userData.s < o.userData.s) o = q; o.userData.s = s; o.position.set(x, 0, -s); o.scale.set(rad, 1, rad * rand(0.55, 0.9)); o.rotation.y = rand(0, 3); o.visible = true; } }
    while (G.farm < upTo) { const s = G.farm; G.farm += rand(500, 1200); if (L.has(s) && !this.nearJunction(s, 200)) this._farm(L, s, Math.random() < 0.7 ? 1 : -1); }
  }
  _treeOk(x, s, r) { return this.clear(x, s, r) && x > WALL_R + 10; }
  _tree(x, s, conifer, k) {
    const i = this.tTrunk.userData.i; for (const m of [this.tTrunk, this.tCone, this.tBlob]) m.userData.i = (i + 1) % m.count;
    const h = (8 + Math.random() * 8) * k, tone = 0.75 + Math.random() * 0.5, Z = _Z;
    this.tTrunk.setMatrixAt(i, _M.compose(_v.set(x, 0, -s), _q.identity(), _sc.set(1, h * 0.45, 1)));
    if (conifer) { this.tCone.setMatrixAt(i, _M.compose(_v.set(x, h * 0.2, -s), _q, _sc.set(h * 0.22, h * 0.85, h * 0.22))); this.tBlob.setMatrixAt(i, Z); this.tCone.setColorAt(i, _c.setRGB(0.1 * tone, 0.24 * tone, 0.12 * tone)); }
    else { this.tBlob.setMatrixAt(i, _M.compose(_v.set(x, h * 0.62, -s), _q, _sc.set(h * 0.34, h * 0.4, h * 0.34))); this.tCone.setMatrixAt(i, Z); this.tBlob.setColorAt(i, _c.setRGB(0.2 * tone, 0.36 * tone, 0.12 * tone)); }
    for (const m of [this.tTrunk, this.tCone, this.tBlob]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  }

  _placeSigns(upTo) {
    this.signQueue.sort((p, q) => p.s - q.s);
    while (this.signQueue.length && this.signQueue[0].s < upTo) {
      const q = this.signQueue.shift(); let o = this.signs[0]; for (const g of this.signs) if (g.userData.s < o.userData.s) o = g;
      const u = o.userData; u.s = q.s; u.tag = q.kind; o.visible = true;
      let x = q.x, th = 0;
      if (q.road) { if (!q.road.has(q.s)) { o.visible = false; continue; } th = Math.atan(q.road.slope(q.s)); x = q.road.xAt(q.s) + q.side * (q.road.hwAt(q.s) + (q.chev ? 1.6 : q.off || 1.3)) / Math.cos(th); }
      // size and mounting per kind
      let w = 0.75, h = 0.75, y = 2.0, two = false, plate = null;
      if (q.kind === 'vorweg') { w = 4.4; h = 3.3; y = 3.6; two = true; q.b = q.b + '#' + q.dist; }
      else if (q.kind === 'ausfahrt') { w = 2.3; h = 1.44; y = 2.1; two = true; }
      else if (q.bake) { w = 0.5; h = 2.0; y = 1.1; }
      else if (q.ww) { w = q.kind === 'wwA' ? 2.6 : 2.2; h = q.kind === 'wwA' ? 0.95 : 0.55; y = 2.2; two = true; }
      else if (q.chev) { w = 0.9; h = 0.9; y = 1.2; }
      else if (q.kind === 'a330') { w = 1.0; h = 1.0; y = 2.2; }
      else if (q.kind === 'board') { w = 2.2; h = 2.2; y = 1.5; two = true; }
      else if (q.kind === 'yield' || q.kind.startsWith('curve') || q.kind === 'deer') { w = 0.9; h = 0.9; }
      if (q.kind === 'ort' || q.kind === 'ortEnd') { w = 1.7; h = 1.06; y = 2.0; two = true; }
      if (q.plate) plate = signFace('plate', q.plate[0], q.plate[1]);
      u.face.material.map = q.kind === 'ort' ? placeSign(q.a, q.b, false) : q.kind === 'ortEnd' ? placeSign(q.a, '', true, q.b) : signFace(q.kind, q.a, q.b); u.face.material.needsUpdate = true;
      u.face.scale.set(w, h, 1); u.face.position.set(0, y, 0.065); u.back.scale.set(w * 0.98, h * 0.98, 1); u.back.position.set(0, y, 0.055);   // in front of the posts
      u.back.visible = q.kind === 'vorweg' || q.ww || q.kind === 'ausfahrt';
      const top = y + h / 2, post = q.bake ? y - h / 2 : top - 0.05;
      u.p1.scale.y = post; u.p1.position.set(two ? -w * 0.36 : 0, post / 2, 0); u.p2.visible = two; u.p2.scale.y = post; u.p2.position.set(w * 0.36, post / 2, 0);
      if (q.bake) { u.p1.visible = false; } else u.p1.visible = true;
      u.plate.visible = !!plate; if (plate) { u.plate.material.map = plate; u.plate.material.needsUpdate = true; u.plate.scale.set(0.8, 0.24, 1); u.plate.position.set(0, y - h / 2 - 0.17, 0.065); }
      o.position.set(x, 0, -q.s); o.rotation.y = -th;
    }
  }

  /* --------------------------- per frame --------------------------- */
  update(dt, s, sky) {
    this.s = s;
    this._extend(s + AHEAD);
    this._buildChunks(s + SHOW);
    this._decorate(s + DECO);
    this._placeSigns(s + DECO);
    // forget what is well behind
    if (((this._gc = (this._gc || 0) + dt) > 2)) { this._gc = 0;
      const lim = s - BEHIND;
      this.roads = this.roads.filter((r) => { if (r !== this.L && r.s1 < lim) { for (const c of r.chunks || []) this._dropChunk(c); return false; }
        if (r.chunks) r.chunks = r.chunks.filter((c) => { if (c.b < lim) { this._dropChunk(c); return false; } return true; }); return true; });
      this.patches = this.patches.filter((p) => p.s > lim - 50);
      this.vObjs = this.vObjs.filter((o) => { if (o.userData.s < lim - 100) { this.frame.remove(o); return false; } return true; });
      this.towns = this.towns.filter((T) => T.s1 > lim - 500);
      this.L.trim(lim - 200); this.junctions = this.junctions.filter((j) => j.s1 > lim - 2000); this.gaps = this.gaps.filter((g) => g[1] > lim - 200);
    }
    // weather on the surfaces
    const wet = sky.wet;
    for (const k of ['land', 'kreis', 'ramp']) { const m = this.mats[k]; m.roughness = 0.9 - wet * 0.6; m.metalness = wet * 0.22; m.color.setScalar(1 - wet * 0.32); }
    this.mats.dirt.color.setScalar(1 - wet * 0.25);
    this.winMat.emissive.setRGB(sky.night * 0.55, sky.night * 0.42, sky.night * 0.2);
    this.lampMat.emissiveIntensity = sky.night * 4;
  }
}
const _e = new THREE.Euler(), _M = new THREE.Matrix4(), _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _sc = new THREE.Vector3(), _c = new THREE.Color(), _Z = new THREE.Matrix4().makeScale(0, 0, 0);
