// Villages (Dörfer) along the Landstraße: plastered and half-timbered houses
// with tiled gable roofs, a church, street lamps and hedges. Facades are drawn
// on canvases (windows with frames and shutters, doors, timber framing) so a
// house is a handful of merged meshes, not hundreds of little boxes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const FONT = '"DIN Alternate","Bahnschrift","DIN Condensed","Roboto Condensed","Arial Narrow",Arial,sans-serif';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function plaster(g, w, h, col) {
  g.fillStyle = col; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.05)'; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3); }
  const gr = g.createLinearGradient(0, h * 0.85, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(40,35,30,0.35)'); g.fillStyle = gr; g.fillRect(0, h * 0.85, w, h * 0.15);   // splash zone
}
// one window with frame, cross bars, sill and optional shutters; px per metre = k
function window_(g, x, y, ww, wh, shutter, frame = '#f4f2ec') {
  if (shutter) { g.fillStyle = shutter; g.fillRect(x - ww * 0.48, y, ww * 0.45, wh); g.fillRect(x + ww * 1.03, y, ww * 0.45, wh);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(x - ww * 0.48, y + wh * k / 6); g.lineTo(x - ww * 0.03, y + wh * k / 6); g.moveTo(x + ww * 1.03, y + wh * k / 6); g.lineTo(x + ww * 1.48, y + wh * k / 6); g.stroke(); } }
  g.fillStyle = frame; g.fillRect(x - 2, y - 2, ww + 4, wh + 4);
  const gr = g.createLinearGradient(x, y, x + ww, y + wh); gr.addColorStop(0, '#3a4a5a'); gr.addColorStop(0.5, '#1c2530'); gr.addColorStop(1, '#2c3a48'); g.fillStyle = gr; g.fillRect(x, y, ww, wh);
  g.fillStyle = frame; g.fillRect(x + ww / 2 - 1, y, 2, wh); g.fillRect(x, y + wh * 0.38 - 1, ww, 2);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 3, y + 3, ww * 0.18, wh * 0.3);
  g.fillStyle = '#d8d2c4'; g.fillRect(x - 4, y + wh + 1, ww + 8, 4);   // sill
}
// a facade: `floors` rows of windows, optionally a door, optionally timber framing (Fachwerk)
function facade(wallCol, wM, hM, floors, opts = {}) {
  const k = 30, W = Math.round(wM * k), H = Math.round(hM * k);   // 30 px per metre: sharp enough, light on phone memory
  return canvasTex(W, H, (g) => {
    plaster(g, W, H, wallCol);
    if (opts.fachwerk) { g.fillStyle = opts.timber || '#4a2e1c'; const bw = 0.22 * k;
      for (let f = 0; f <= floors; f++) g.fillRect(0, H - (f * hM / floors) * k - (f ? bw / 2 : bw), W, bw);   // sills and plates
      const n = Math.max(2, Math.round(wM / 1.6)); for (let i = 0; i <= n; i++) g.fillRect(i * W / n - bw / 2, 0, bw, H);   // posts
      for (let f = 0; f < floors; f++) for (let i = 0; i < n; i++) if ((i + f) % 2 === 0) { const x0 = i * W / n, x1 = (i + 1) * W / n, y0 = H - (f + 1) * H / floors, y1 = H - f * H / floors;
        g.save(); g.lineWidth = bw * 0.8; g.strokeStyle = g.fillStyle; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x1, y0); if (Math.random() < 0.5) { g.moveTo(x1, y1); g.lineTo(x0, y0); } g.stroke(); g.restore(); } }
    const cols = Math.max(1, Math.round(wM / 2.6)), ww = 0.95 * k, wh = 1.25 * k;
    for (let f = 0; f < floors; f++) for (let i = 0; i < cols; i++) {
      const cx = (i + 0.5) * W / cols, y = H - (f + 1) * H / floors + (H / floors - wh) * 0.45;
      if (opts.door && f === 0 && i === opts.door) {   // door with a little canopy
        const dw = 1.0 * k, dh = 2.1 * k; g.fillStyle = '#5a3a24'; g.fillRect(cx - dw / 2, H - dh, dw, dh); g.fillStyle = '#3a2416'; g.fillRect(cx - dw / 2 + 6, H - dh + 6, dw - 12, dh - 12);
        g.fillStyle = '#c9a24a'; g.fillRect(cx + dw * 0.28, H - dh * 0.5, 6, 6); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(cx - dw * 0.7, H - dh - 12, dw * 1.4, 10); continue; }
      window_(g, cx - ww / 2, y, ww, wh, opts.shutter, opts.frame);
      if (opts.flowers && f === 0) { g.fillStyle = '#6a3a22'; g.fillRect(cx - ww / 2 - 4, y + wh + 6, ww + 8, 10); for (let q = 0; q < 8; q++) { g.fillStyle = pick(['#e0303a', '#f05a8a', '#ffd23a', '#e8e8e8']); g.beginPath(); g.arc(cx - ww / 2 + q * ww / 7, y + wh + 4, 4, 0, 7); g.fill(); } }
    }
  });
}
function roofTex(col) {
  return canvasTex(256, 256, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, y + 13, w, 3); for (let x = (y / 16) % 2 ? 0 : 10; x < w; x += 20) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, y, 2, 14); g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(x + 2, y, 18, 13); } } });
}

const WALLS = ['#f2ead8', '#efe3c4', '#f6f1e6', '#e9d9b8', '#dfe6e8', '#f0dcc8', '#e8e0d0', '#f3e7b8'];
const ROOFS = ['#8c3a24', '#7a2e1c', '#a24a2a', '#4a4c52', '#5a2a1e'];
const SHUTTERS = [null, null, '#3e5a3a', '#6a4a2a', '#3a4a6a', '#7a2a24'];

// roof: a gable prism with an overhang; caps (gable walls) get the wall material, slopes the tiles
function gableRoof(w, d, h, wallMat, roofMat, over = 0.5) {
  const sh = new THREE.Shape(); sh.moveTo(-w / 2 - over, -0.05); sh.lineTo(w / 2 + over, -0.05); sh.lineTo(0, h); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: d + over * 2, bevelEnabled: false }); geo.translate(0, 0, -(d + over * 2) / 2);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.25, uv.getY(i) * 0.25);
  return new THREE.Mesh(geo, [wallMat, roofMat]);
}
// merge a group's meshes by material (handles multi-material meshes)
function bake(group) {
  group.updateMatrixWorld(true); const by = new Map();
  group.traverse((o) => { if (!o.isMesh) return; const mats = Array.isArray(o.material) ? o.material : [o.material];
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (mats.length === 1 || !g.groups.length) { const m = mats[0]; if (!by.has(m)) by.set(m, []); by.get(m).push(g); return; }
    for (const gr of g.groups) { const m = mats[gr.materialIndex]; const part = new THREE.BufferGeometry();
      for (const k of ['position', 'normal', 'uv']) { const a = g.attributes[k]; part.setAttribute(k, new THREE.BufferAttribute(a.array.slice(gr.start * a.itemSize, (gr.start + gr.count) * a.itemSize), a.itemSize)); }
      if (!by.has(m)) by.set(m, []); by.get(m).push(part); } });
  const out = new THREE.Group(); for (const [m, list] of by) out.add(new THREE.Mesh(mergeGeometries(list, false), m)); return out;
}

export class Village {
  constructor(snowy) {
    this.snowy = snowy;
    this.roofMats = ROOFS.map((c) => snowy(new THREE.MeshStandardMaterial({ map: roofTex(c), roughness: 0.8 }), 0.95));
    this.templates = []; for (let i = 0; i < 10; i++) this.templates.push(this._house(i));
    this.church = this._church();
  }

  _house(i) {
    const g = new THREE.Group(), fach = i % 4 === 1, floors = i % 5 === 3 ? 1 : 2, w = fach ? rand(9, 12) : rand(9, 13), d = rand(8, 10.5), h = floors * 2.9 + 0.3;
    const wall = fach ? '#f4efe4' : WALLS[i % WALLS.length], shutter = fach ? null : SHUTTERS[i % SHUTTERS.length];
    const front = new THREE.MeshStandardMaterial({ map: facade(wall, w, h, floors, { door: Math.min(1, Math.round(w / 2.6) - 1), shutter, fachwerk: fach, flowers: i % 3 === 0 }), roughness: 0.9 });
    const back = new THREE.MeshStandardMaterial({ map: facade(wall, w, h, floors, { shutter, fachwerk: fach }), roughness: 0.9 });
    const side = new THREE.MeshStandardMaterial({ map: facade(wall, d, h, floors, { shutter, fachwerk: fach }), roughness: 0.9 });
    const gableWall = new THREE.MeshStandardMaterial({ color: fach ? 0xf0ebe0 : new THREE.Color(wall), roughness: 0.9 });
    const roof = this.roofMats[i % this.roofMats.length], base = new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.95 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, base, base, front, back]); body.position.y = h / 2 + 0.25; g.add(body);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.35, d + 0.1), base); plinth.position.y = 0.17; g.add(plinth);
    const rh = fach ? rand(4.5, 5.5) : rand(3.6, 5), r = gableRoof(d, w, rh, gableWall, roof, 0.55); r.rotation.y = Math.PI / 2; r.position.y = h + 0.25; g.add(r);
    const chim = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.6), new THREE.MeshStandardMaterial({ color: 0x9a4a32, roughness: 0.9 })); chim.position.set(w * 0.22, h + rh * 0.7, d * 0.12); g.add(chim);
    if (i % 3 === 0) { const dorm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.4), front); dorm.position.set(-w * 0.15, h + rh * 0.35, d / 2 - 0.9); g.add(dorm);
      const dr = gableRoof(1.6, 1.4, 0.8, gableWall, roof, 0.2); dr.position.set(-w * 0.15, h + rh * 0.35 + 0.65, d / 2 - 0.9); g.add(dr); }
    if (i % 2 === 0) {   // garage beside it
      const gm = new THREE.MeshStandardMaterial({ map: canvasTex(144, 120, (q, W2, H2) => { plaster(q, W2, H2, wall); q.fillStyle = '#c8c4bc'; q.fillRect(14, 30, W2 - 28, H2 - 30); q.strokeStyle = 'rgba(0,0,0,0.25)'; for (let y = 38; y < H2; y += 10) { q.beginPath(); q.moveTo(14, y); q.lineTo(W2 - 14, y); q.stroke(); } }), roughness: 0.9 });
      const gb = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 6), [gableWall, gableWall, base, base, gm, gableWall]); gb.position.set(w / 2 + 2.2, 1.3, 0.8); g.add(gb);
      const gr2 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.18, 6.3), base); gr2.position.set(w / 2 + 2.2, 2.68, 0.8); g.add(gr2); }
    const b = bake(g); b.userData.w = w + (i % 2 === 0 ? 4 : 0); return b;
  }

  _church() {
    const g = new THREE.Group(), wall = '#f3ede0', wm = new THREE.MeshStandardMaterial({ color: 0xf3ede0, roughness: 0.9 });
    const side = new THREE.MeshStandardMaterial({ map: canvasTex(720, 360, (q, W, H) => { plaster(q, W, H, wall); for (let i = 0; i < 5; i++) { const x = 60 + i * 140; q.fillStyle = '#e2dccd'; q.fillRect(x - 6, 80, 64, 200); q.fillStyle = '#2a3440'; q.beginPath(); q.moveTo(x, 270); q.lineTo(x, 130); q.arc(x + 26, 130, 26, Math.PI, 0); q.lineTo(x + 52, 270); q.fill(); } }), roughness: 0.9 });
    const front = new THREE.MeshStandardMaterial({ map: canvasTex(400, 360, (q, W, H) => { plaster(q, W, H, wall); q.fillStyle = '#5a3a24'; q.beginPath(); q.moveTo(160, H); q.lineTo(160, 220); q.arc(200, 220, 40, Math.PI, 0); q.lineTo(240, H); q.fill(); q.fillStyle = '#2a3440'; q.beginPath(); q.arc(200, 110, 44, 0, 7); q.fill(); }), roughness: 0.9 });
    const roof = this.roofMats[0], base = new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.95 });
    const nave = new THREE.Mesh(new THREE.BoxGeometry(11, 8, 22), [side, side, base, base, front, front]); nave.position.y = 4; g.add(nave);
    const nr = gableRoof(11, 22, 6, wm, roof, 0.5); nr.position.y = 8; g.add(nr);
    // tower with a clock and an onion dome, Bavarian style
    const tw = new THREE.MeshStandardMaterial({ map: canvasTex(240, 720, (q, W, H) => { plaster(q, W, H, wall); q.fillStyle = '#fff'; q.beginPath(); q.arc(W / 2, 120, 60, 0, 7); q.fill(); q.strokeStyle = '#222'; q.lineWidth = 6; q.stroke();
      q.lineWidth = 8; q.beginPath(); q.moveTo(W / 2, 120); q.lineTo(W / 2, 78); q.moveTo(W / 2, 120); q.lineTo(W / 2 + 32, 132); q.stroke(); q.fillStyle = '#2a3440'; q.fillRect(W / 2 - 26, 230, 52, 90); q.fillRect(W / 2 - 18, 420, 36, 60); }), roughness: 0.9 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(5, 22, 5), tw); tower.position.set(0, 11, 13); g.add(tower);
    const copper = this.snowy(new THREE.MeshStandardMaterial({ color: 0x3f8a6a, roughness: 0.55, metalness: 0.35 }), 0.8);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 1.2, 8), copper); neck.position.set(0, 22.6, 13); g.add(neck);
    const onion = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 10), copper); onion.scale.y = 1.15; onion.position.set(0, 25.2, 13); g.add(onion);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.5, 10), copper); spire.position.set(0, 29.2, 13); g.add(spire);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.6, 0.15), new THREE.MeshStandardMaterial({ color: 0xd4a830, metalness: 0.9, roughness: 0.3 })); cross.position.set(0, 32.2, 13); g.add(cross);
    const arm = cross.clone(); arm.scale.set(5, 0.12, 1); arm.position.y = 32.5; g.add(arm);
    return bake(g);
  }

  house() { return pick(this.templates).clone(); }
  churchMesh() { return this.church.clone(); }
}

// Ortstafel (Z 310) and Ortsende (Z 311): yellow, black lettering
const placeCache = {};
export function placeSign(name, district, end, next) {
  const key = name + '|' + end + '|' + (next || ''); if (placeCache[key]) return placeCache[key];
  return (placeCache[key] = canvasTex(512, 320, (g, W, H) => {
    g.fillStyle = '#111'; g.beginPath(); g.roundRect(0, 0, W, H, 22); g.fill(); g.fillStyle = '#f2c400'; g.beginPath(); g.roundRect(10, 10, W - 20, H - 20, 16); g.fill();
    g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (!end) { g.font = `bold 86px ${FONT}`; g.fillText(name, W / 2, 140, W - 50); g.font = `bold 34px ${FONT}`; g.fillText(district, W / 2, 240, W - 60); }
    else { g.font = `bold 46px ${FONT}`; g.fillText(next ? next + '  4 km' : '', W / 2, 74, W - 50); g.fillRect(30, 128, W - 60, 5);
      g.font = `bold 74px ${FONT}`; g.fillText(name, W / 2, 222, W - 50); g.strokeStyle = '#d0121a'; g.lineWidth = 22; g.beginPath(); g.moveTo(50, 285); g.lineTo(W - 50, 160); g.stroke(); }
  }));
}
