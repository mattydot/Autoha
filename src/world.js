// The Autobahn: road, guardrails, scenery, and the things that happen on it:
// speed-limit zones, roadworks with lane closures, accident scenes with oil or
// milk on the road, and overhead LED gantries (Verkehrsbeeinflussungsanlage)
// that warn about what is ahead and set variable limits.
import * as THREE from 'three';
import * as P from './props.js';

import { PACE } from './pace.js';
export { PACE };
export const LANES = [-3.75, 0, 3.75];           // left (fast) -> right (slow)
export const ROAD = { left: -6.05, right: 8.2, mirror: -15.4 };
const LEN = 2400, AHEAD = 1700;                  // visible road length / part ahead of the player
const FONT = '"DIN Alternate","Bahnschrift","DIN Condensed","Roboto Condensed","Arial Narrow",Arial,sans-serif';
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const WALL_R = ROAD.right + 0.55, WALL_L = ROAD.left - 0.45;      // guardrail faces
const minLimit = (a, b) => (!a ? b : !b ? a : Math.min(a, b));

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function noise(g, w, h, n, colors, size = 2) {
  for (let i = 0; i < n; i++) { g.fillStyle = pick(colors); g.globalAlpha = Math.random() * 0.5; g.fillRect(Math.random() * w, Math.random() * h, size * (0.5 + Math.random()), size * (0.5 + Math.random())); }
  g.globalAlpha = 1;
}

/* ---------------------------- textures ---------------------------- */
function roadTexture() {            // 14.5 m wide (x -6.35..8.15), 18 m long
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#34363a'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 26000, ['#2a2c30', '#3e4045', '#47494e', '#26282b'], 2);
    const X = (m) => (m + 6.35) / 14.5 * w, M = w / 14.5;
    for (const l of LANES) for (const o of [-0.85, 0.85]) { const gr = g.createLinearGradient(X(l + o) - 30, 0, X(l + o) + 30, 0); gr.addColorStop(0, 'rgba(20,20,22,0)'); gr.addColorStop(0.5, 'rgba(20,20,22,0.28)'); gr.addColorStop(1, 'rgba(20,20,22,0)'); g.fillStyle = gr; g.fillRect(X(l + o) - 30, 0, 60, h); }
    g.fillStyle = '#3b3d41'; g.fillRect(X(5.8), 0, w, h);
    g.fillStyle = '#e9e9e4';
    g.fillRect(X(-5.625) - 0.15 * M, 0, 0.3 * M, h); g.fillRect(X(5.625) - 0.15 * M, 0, 0.3 * M, h);
    for (const x of [-1.875, 1.875]) g.fillRect(X(x) - 0.08 * M, 0, 0.16 * M, h / 3);
  }, true);
}
function grassTexture() {
  return canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#4d6b34'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 9000, ['#3f5c2a', '#5a7a3c', '#6a8442', '#46602e', '#587035'], 5); }, true);
}
// Roadside sign faces, drawn on demand and cached. Sign area 256x256, optional plate below.
const signCache = {};
function signTex(kind, value, plate) {
  const key = kind + value + (plate || '');
  if (signCache[key]) return signCache[key];
  return (signCache[key] = canvasTex(256, 336, (g) => {
    g.clearRect(0, 0, 256, 336);
    if (kind === 'limit') {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
      if (value) { g.strokeStyle = '#d0121a'; g.lineWidth = 30; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.stroke();
        g.fillStyle = '#111'; g.font = `bold ${value >= 100 ? 108 : 124}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(value, 128, 136);
      } else { g.strokeStyle = '#222'; g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.stroke();
        g.save(); g.beginPath(); g.arc(128, 128, 122, 0, 7); g.clip(); g.translate(128, 128); g.rotate(-Math.PI / 4); g.fillStyle = '#1a1a1a';
        for (let i = -2; i <= 2; i++) g.fillRect(-140, i * 15 - 3.5, 280, 7); g.restore(); }
    } else { // warning triangle
      g.fillStyle = '#fff'; g.strokeStyle = '#d0121a'; g.lineWidth = 24; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(128, 18); g.lineTo(242, 222); g.lineTo(14, 222); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#111'; g.strokeStyle = '#111';
      if (value === 'bau') { // man at work
        g.beginPath(); g.arc(112, 104, 13, 0, 7); g.fill();
        g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(118, 122); g.lineTo(132, 160); g.lineTo(118, 196); g.moveTo(132, 160); g.lineTo(150, 194); g.moveTo(122, 134); g.lineTo(160, 150); g.stroke();
        g.lineWidth = 6; g.beginPath(); g.moveTo(160, 150); g.lineTo(176, 196); g.stroke(); g.beginPath(); g.moveTo(162, 196); g.lineTo(192, 196); g.lineTo(184, 182); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(70, 200); g.lineTo(104, 200); g.lineTo(88, 176); g.closePath(); g.fill();
      } else { g.font = `bold 120px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 128, 150); }
    }
    if (plate) { g.fillStyle = '#fff'; g.fillRect(28, 262, 200, 66); g.strokeStyle = '#111'; g.lineWidth = 5; g.strokeRect(30, 264, 196, 62);
      g.fillStyle = '#111'; g.font = `bold 44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(plate, 128, 298); }
  }));
}
const CITIES = ['München', 'Nürnberg', 'Stuttgart', 'Frankfurt', 'Köln', 'Berlin', 'Hamburg', 'Leipzig', 'Dresden', 'Würzburg', 'Ingolstadt', 'Kassel', 'Hannover', 'Karlsruhe', 'Regensburg', 'Ulm'];
function routeSign(kind) {
  return canvasTex(512, 256, (g) => {
    const r = (x, y, w, h, rad, fill, stroke) => { g.beginPath(); g.roundRect(x, y, w, h, rad); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 6; g.stroke(); } };
    r(0, 0, 512, 256, 18, '#fff'); r(7, 7, 498, 242, 14, '#0f4fa3');
    g.fillStyle = '#fff'; g.textBaseline = 'middle';
    const a = pick(CITIES), b = pick(CITIES.filter((c) => c !== a));
    if (kind === 'exit') {
      g.font = `bold 60px ${FONT}`; g.textAlign = 'left'; g.fillText('Ausfahrt', 40, 70);
      g.font = `bold 46px ${FONT}`; g.fillText(a + '-' + pick(['Nord', 'Süd', 'Ost', 'West', 'Mitte']), 40, 150);
      g.save(); g.translate(430, 150); g.rotate(-Math.PI / 4); g.fillRect(-45, -9, 80, 18); g.beginPath(); g.moveTo(60, 0); g.lineTo(25, -30); g.lineTo(25, 30); g.fill(); g.restore();
      g.font = `bold 34px ${FONT}`; g.fillText('1000 m', 40, 215);
    } else {
      r(28, 26, 116, 62, 10, null, '#fff'); g.font = `bold 46px ${FONT}`; g.textAlign = 'center'; g.fillText('A ' + pick([3, 5, 7, 8, 9, 2, 6, 61, 81]), 86, 60);
      g.textAlign = 'left'; g.font = `bold 58px ${FONT}`; g.fillText(a, 170, 60); g.font = `bold 48px ${FONT}`; g.fillText(b, 40, 140);
      for (const x of [150, 362]) { g.fillRect(x - 8, 180, 16, 44); g.beginPath(); g.moveTo(x, 252); g.lineTo(x - 28, 220); g.lineTo(x + 28, 220); g.fill(); }
    }
  });
}
function distanceBoard() {
  return canvasTex(512, 384, (g) => {
    g.beginPath(); g.roundRect(0, 0, 512, 384, 18); g.fillStyle = '#fff'; g.fill(); g.beginPath(); g.roundRect(7, 7, 498, 370, 14); g.fillStyle = '#0f4fa3'; g.fill();
    g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.font = `bold 52px ${FONT}`;
    const cs = [...CITIES].sort(() => Math.random() - 0.5).slice(0, 4); let km = 10 + ((Math.random() * 40) | 0);
    cs.forEach((c, i) => { g.textAlign = 'left'; g.fillText(c, 36, 62 + i * 88); g.textAlign = 'right'; g.fillText(km + ' km', 476, 62 + i * 88); km += 30 + ((Math.random() * 140) | 0); });
  });
}

/* ------------------- LED gantry panels (dot-matrix look) ------------------- */
let ledMask;
function led(g, w, h) {
  if (!ledMask) { const c = document.createElement('canvas'); c.width = c.height = 4; const x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0.62)'; x.fillRect(0, 3, 4, 1); x.fillRect(3, 0, 1, 4); ledMask = g.createPattern(c, 'repeat'); }
  g.fillStyle = ledMask; g.fillRect(0, 0, w, h);
}
function drawLanePanel(g, p) {
  const w = 160, h = 224; g.fillStyle = '#060607'; g.fillRect(0, 0, w, h);
  if (p.x) { g.strokeStyle = '#ff2a1a'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(34, 50); g.lineTo(126, 160); g.moveTo(126, 50); g.lineTo(34, 160); g.stroke(); }
  else if (p.arrow) { // yellow diagonal: move over
    g.save(); g.translate(80, 100); g.rotate(p.arrow < 0 ? -Math.PI * 0.25 : Math.PI * 0.25); g.fillStyle = '#ffc400';
    g.fillRect(-10, -20, 20, 78); g.beginPath(); g.moveTo(-36, -14); g.lineTo(0, -62); g.lineTo(36, -14); g.closePath(); g.fill(); g.restore();
  } else if (p.limit) {
    g.strokeStyle = '#ff2a1a'; g.lineWidth = 12; g.beginPath(); g.arc(80, 74, 58, 0, 7); g.stroke();
    g.fillStyle = '#f4f4f4'; g.font = `bold ${p.limit >= 100 ? 50 : 60}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.limit, 80, 78);
  }
  if (p.warn) {
    const cy = 186; g.strokeStyle = '#ff2a1a'; g.lineWidth = 6; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(80, cy - 32); g.lineTo(116, cy + 30); g.lineTo(44, cy + 30); g.closePath(); g.stroke();
    g.fillStyle = '#f4f4f4'; g.strokeStyle = '#f4f4f4'; g.lineWidth = 3; g.textAlign = 'center'; g.textBaseline = 'middle';
    switch (p.warn) {
      case 'fog': for (let i = 0; i < 3; i++) g.fillRect(64, cy + i * 8 - 2, 32, 3); break;
      case 'wet': case 'oil': // skidding car
        g.fillRect(70, cy - 4, 20, 9); g.beginPath(); g.moveTo(70, cy + 12); g.bezierCurveTo(64, cy + 16, 76, cy + 22, 68, cy + 26); g.moveTo(90, cy + 12); g.bezierCurveTo(96, cy + 16, 84, cy + 22, 92, cy + 26); g.stroke(); break;
      case 'snow': g.font = `bold 34px ${FONT}`; g.fillText('*', 80, cy + 12); break;
      case 'bau': g.beginPath(); g.arc(76, cy - 4, 3.5, 0, 7); g.fill(); g.fillRect(74, cy + 1, 5, 14); g.fillRect(70, cy + 14, 4, 10); g.fillRect(80, cy + 14, 4, 10); g.fillRect(78, cy + 4, 14, 3); break;
      case 'wind': g.beginPath(); g.moveTo(64, cy - 6); g.lineTo(98, cy + 2); g.lineTo(64, cy + 12); g.closePath(); g.fill(); g.fillRect(62, cy - 8, 3, 34); break;
      default: g.font = `bold 34px ${FONT}`; g.fillText('!', 80, cy + 10);
    }
  }
  led(g, w, h);
}
function drawTextPanel(g, lines) {
  const w = 384, h = 144; g.fillStyle = '#060607'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffb000'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const n = lines.length, size = n > 2 ? 34 : 40;
  lines.forEach((l, i) => { g.font = `bold ${size}px ${FONT}`; g.fillText(l, w / 2, h / 2 + (i - (n - 1) / 2) * (size + 6)); });
  led(g, w, h);
}

/* ------------------------------ world ------------------------------ */
export class World {
  constructor(scene) {
    this.scene = scene;
    this.frame = new THREE.Group(); scene.add(this.frame);         // everything that sits at a fixed road position
    this.s = 0; this.factory = null; this.weather = null; this.policeActive = false;
    this.zones = []; this.blitzers = []; this.events = []; this.closures = []; this.spills = []; this.obstacles = [];
    this.uSnow = { value: 0 };
    this._mats(); this._road(); this._rails(); this._scenery(); this._pools();
    this.reset();
  }

  _mats() {
    this.m = {
      steel: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.8, roughness: 0.45 }),
      concrete: new THREE.MeshStandardMaterial({ color: 0x8c8c88, roughness: 0.95 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.8 }),
      white: new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.7 }),
    };
  }

  // blend a material's albedo towards snow white, driven by one shared uniform
  _snowy(mat, amount) {
    mat.onBeforeCompile = (sh) => { sh.uniforms.uSnow = this.uSnow;
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uSnow;\nvoid main() {')
        .replace('#include <color_fragment>', `#include <color_fragment>\n\tdiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.89, 0.93), uSnow * ${amount.toFixed(2)});`); };
    mat.customProgramCacheKey = () => 'snow' + amount; return mat;
  }

  _road() {
    this.roadTex = roadTexture(); this.roadTex.repeat.set(1, LEN / 18);
    this.roadMat = this._snowy(new THREE.MeshStandardMaterial({ map: this.roadTex, roughness: 0.92, metalness: 0 }), 0.2);
    const mk = (flip) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(14.5, LEN, 1, 32), this.roadMat); m.rotation.x = -Math.PI / 2; if (flip) m.rotation.z = Math.PI;
      m.position.set(flip ? ROAD.mirror - 0.9 : 0.9, 0, -(AHEAD - LEN / 2)); this.scene.add(m); return m; };
    mk(false); mk(true);
    this.grassTex = grassTexture(); this.grassTex.repeat.set(1600 / 40, LEN / 40);
    this.grassMat = this._snowy(new THREE.MeshLambertMaterial({ map: this.grassTex }), 0.94);
    for (const x0 of [8.15, -23.55 - 1600]) { const gr = new THREE.Mesh(new THREE.PlaneGeometry(1600, LEN, 8, 32), this.grassMat); gr.rotation.x = -Math.PI / 2; gr.position.set(x0 + 800, -0.02, -(AHEAD - LEN / 2)); this.scene.add(gr); }
    const far = new THREE.Mesh(new THREE.RingGeometry(640, 4500, 40, 1), this._snowy(new THREE.MeshLambertMaterial({ color: 0x4a6534 }), 0.94)); far.rotation.x = -Math.PI / 2; far.position.y = -0.3; this.scene.add(far);
    const hillTex = canvasTex(2048, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) { const a = x / w * Math.PI * 2; g.lineTo(x, h - 38 - 30 * Math.sin(a * 3 + 1) - 18 * Math.sin(a * 7 + 2) - 9 * Math.sin(a * 17) - 5 * Math.sin(a * 41)); }
      g.lineTo(w, h); g.fill(); });
    this.hillMat = new THREE.MeshBasicMaterial({ map: hillTex, color: 0x30462f, transparent: true, alphaTest: 0.5, side: THREE.BackSide });
    this.hills = new THREE.Mesh(new THREE.CylinderGeometry(2600, 2600, 220, 48, 1, true), this.hillMat); this.hills.position.y = 105; this.scene.add(this.hills);
  }

  _rails() {
    const g = new THREE.Group(); this.scene.add(g);
    const z = -(AHEAD - LEN / 2);
    const railGeo = new THREE.BoxGeometry(0.07, 0.3, LEN);
    this.railX = [ROAD.left - 0.55, ROAD.left - 2.55, ROAD.right + 0.65, ROAD.mirror * 2 - ROAD.right - 0.65];
    for (const x of this.railX) { const r = new THREE.Mesh(railGeo, this.m.steel); r.position.set(x, 0.62, z); g.add(r); }
    const n = LEN / 4, posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.7, 0.09), this.m.steel, n * 4), M = new THREE.Matrix4();
    let k = 0; for (const x of this.railX) for (let i = 0; i < n; i++) posts.setMatrixAt(k++, M.makeTranslation(x + (x > 0 || x < -20 ? 0.07 : (x > -8 ? -0.07 : 0.07)), 0.35, -AHEAD + i * 4));
    posts.frustumCulled = false; this.scene.add(posts); this.posts = posts;
    const pg = new THREE.BoxGeometry(0.12, 1.0, 0.08), n2 = LEN / 50;
    const lp = new THREE.InstancedMesh(pg, this.m.white, n2 * 2), band = new THREE.InstancedMesh(new THREE.BoxGeometry(0.125, 0.22, 0.085), this.m.dark, n2 * 2);
    this.reflMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0 });
    const refl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.16, 0.09), this.reflMat, n2 * 2);
    k = 0; for (const x of [ROAD.right + 1.1, ROAD.left - 1.5]) for (let i = 0; i < n2; i++) { const zz = -AHEAD + i * 50;
      lp.setMatrixAt(k, M.makeTranslation(x, 0.5, zz)); band.setMatrixAt(k, M.makeTranslation(x, 0.78, zz)); refl.setMatrixAt(k, M.makeTranslation(x, 0.78, zz + 0.004)); k++; }
    for (const m of [lp, band, refl]) { m.frustumCulled = false; this.scene.add(m); }
    this.leit = [lp, band, refl];
    const med = new THREE.Mesh(new THREE.PlaneGeometry(2.8, LEN), new THREE.MeshLambertMaterial({ color: 0x55584f })); med.rotation.x = -Math.PI / 2; med.position.set(ROAD.mirror / 2, 0.005, z); this.scene.add(med);
  }

  _scenery() {
    const N = 900; this.treeN = N; this.trees = [];
    const trunkG = new THREE.CylinderGeometry(0.18, 0.28, 1, 5); trunkG.translate(0, 0.5, 0);
    const coneG = new THREE.ConeGeometry(1, 1, 7); coneG.translate(0, 0.5, 0);
    const blobG = new THREE.IcosahedronGeometry(1, 1);
    this.leafMat = this._snowy(new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), 0.6);
    this.trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: 0x4a3a2a }), N);
    this.cones = new THREE.InstancedMesh(coneG, this.leafMat, N); this.blobs = new THREE.InstancedMesh(blobG, this.leafMat, N);
    const Z0 = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const m of [this.trunks, this.cones, this.blobs]) { m.frustumCulled = false; this.frame.add(m); for (let i = 0; i < N; i++) { m.setMatrixAt(i, Z0); m.setColorAt(i, new THREE.Color(0.2, 0.3, 0.15)); } }
    for (let i = 0; i < N; i++) this.trees.push({ s: 0 });
    this.turbines = [];
    const tm = this.m.white;
    for (let i = 0; i < 7; i++) {
      const t = new THREE.Group(); const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 95, 10), tm); tower.position.y = 47.5; t.add(tower);
      const nac = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, 9), tm); nac.position.set(0, 96, 0); t.add(nac);
      const rotor = new THREE.Group(); rotor.position.set(0, 96, 5.2);
      for (let b = 0; b < 3; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(2.4, 44, 0.5), tm); bl.geometry.translate(0, 22, 0); bl.rotation.z = b * Math.PI * 2 / 3; rotor.add(bl); }
      t.add(rotor); t.position.z = 1e6; t.userData = { rotor, s: -1e9, speed: 0.6 + Math.random() * 0.6 }; this.frame.add(t); this.turbines.push(t);
    }
  }

  _pools() {
    const m = this.m, F = this.frame;
    const pool = (n, make) => { const a = []; for (let i = 0; i < n; i++) { const o = make(i); o.userData.s = -1e9; o.visible = false; F.add(o); a.push(o); } return a; };
    const B = (w, h, d, mat, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); return o; };
    const lx = ROAD.mirror * 2 - ROAD.right - 2, rx = ROAD.right + 2, cx = (lx + rx) / 2;
    this.bridges = pool(3, () => { const g = new THREE.Group();
      g.add(B(rx - lx + 60, 1.3, 13, m.concrete, cx, 6.6, 0)); g.add(B(rx - lx + 60, 1.0, 0.25, m.steel, cx, 7.7, 6.4)); g.add(B(rx - lx + 60, 1.0, 0.25, m.steel, cx, 7.7, -6.4));
      for (const x of [ROAD.mirror / 2, rx + 1.5, lx - 1.5]) for (const z of [-4, 4]) g.add(B(1.1, 6, 1.1, m.concrete, x, 3, z));
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 26, 7.3, 4, 1), this.grassMat); e.rotation.y = Math.PI / 4; e.scale.z = 0.9; e.position.set(s > 0 ? rx + 28 : lx - 28, 3.2, 0); g.add(e); }
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(rx - lx, 15), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.45, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(cx, 0.03, 0); g.add(sh);
      return g; });
    const truss = (g) => {
      for (const x of [ROAD.left - 1.2, ROAD.right + 1.6]) g.add(B(0.35, 7.6, 0.35, m.steel, x, 3.8, 0));
      for (const y of [5.25, 7.5]) g.add(B(ROAD.right - ROAD.left + 2.8, 0.14, 0.14, m.steel, (ROAD.left + ROAD.right) / 2 + 0.2, y, 0));
      for (let x = ROAD.left - 1; x < ROAD.right + 1.4; x += 1.3) { const d = B(0.08, 2.4, 0.08, m.steel, x + 0.65, 6.4, -0.05); d.rotation.z = (Math.round(x) % 2 ? 1 : -1) * 0.5; g.add(d); }
    };
    // blue direction-sign gantries
    this.gantries = pool(2, (i) => { const g = new THREE.Group(); truss(g);
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 3.3), new THREE.MeshStandardMaterial({ map: routeSign('route'), roughness: 0.6 })); s1.position.set(-2.2, 6.4, 0.12); g.add(s1);
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), new THREE.MeshStandardMaterial({ map: routeSign(i % 2 ? 'exit' : 'route'), roughness: 0.6 })); s2.position.set(4.6, 6.4, 0.12); g.add(s2);
      return g; });
    // LED traffic-control gantries: one panel over each lane plus a text panel
    this.vbas = pool(3, () => { const g = new THREE.Group(); truss(g); const panels = [];
      const mk = (w, h, cw, ch, x, y) => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); mesh.position.set(x, y, 0.2); g.add(mesh);
        g.add(B(w + 0.16, h + 0.16, 0.3, m.dark, x, y, 0.02)); return { c, t, g: c.getContext('2d') }; };
      for (const l of LANES) panels.push(mk(1.4, 1.96, 160, 224, l, 6.25));
      const text = mk(3.0, 1.12, 384, 144, 6.55, 6.5);
      g.userData.panels = panels; g.userData.text = text; g.userData.key = ''; return g; });
    this.boards = pool(2, () => { const g = new THREE.Group(); for (const x of [-1.6, 1.6]) g.add(B(0.16, 3.2, 0.16, m.steel, x, 1.6, -0.1));
      const s = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.45), new THREE.MeshStandardMaterial({ map: distanceBoard(), roughness: 0.6 })); s.position.y = 3.6; g.add(s); g.position.x = ROAD.right + 5.5; return g; });
    this.signs = pool(28, () => { const g = new THREE.Group(); g.add(B(0.1, 3.4, 0.1, m.steel, 0, 1.7, -0.06));
      const d = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.23), new THREE.MeshStandardMaterial({ map: signTex('limit', 120), roughness: 0.55, transparent: true, alphaTest: 0.5 })); d.position.y = 2.95; g.add(d); g.userData.disc = d; return g; });
    this.blitzerPool = pool(2, () => { const g = new THREE.Group(); g.add(B(0.22, 2.1, 0.22, m.steel, 0, 1.05, 0)); g.add(B(0.6, 0.85, 0.5, new THREE.MeshStandardMaterial({ color: 0x55605a, roughness: 0.6 }), 0, 2.5, 0));
      g.add(B(0.4, 0.3, 0.06, m.dark, 0, 2.62, 0.25)); const fm = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0 });
      const f = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), fm); f.position.set(0, 2.5, 0.4); g.add(f); g.userData.flash = fm; g.position.x = ROAD.right + 1.6; return g; });
  }

  _take(pool) { let best = pool[0]; for (const o of pool) if (o.userData.s < best.userData.s) best = o; return best; }
  _place(pool, s, x) { const o = this._take(pool); o.userData.s = s; o.position.z = -s; if (x !== undefined) o.position.x = x; o.visible = true; return o; }
  _sign(s, kind, value, plate, both = true) {
    for (const x of both ? [ROAD.right + 1.5, ROAD.left - 1.55] : [ROAD.right + 1.5]) { const o = this._place(this.signs, s, x); o.userData.disc.material.map = signTex(kind, value, plate); }
  }

  reset() {
    this.s = 0; this.frame.position.z = 0;
    for (const e of this.events) this._dispose(e);
    this.zones = []; this.blitzers = []; this.events = []; this.closures = []; this.spills = []; this.obstacles = [];
    this.vbaLimit = null; this._vbaPassed = new Set();
    this.genEvent = 1300 + rand(0, 900); this.genBridge = 500; this.genGantry = 2600; this.genVba = 900; this.genBoard = 300; this.genTurbine = 600;
    for (const p of [this.bridges, this.gantries, this.vbas, this.boards, this.signs, this.blitzerPool]) for (const o of p) { o.userData.s = -1e9; o.visible = false; }
    for (const g of this.vbas) g.userData.key = '';
    for (const t of this.turbines) { t.userData.s = -1e9; t.position.z = 1e6; }
    for (let i = 0; i < this.treeN; i++) { this.trees[i].s = -1e9; }
    this._treeCursor = -200; this._fillTrees(-200, AHEAD);
  }

  _density(s) { return THREE.MathUtils.clamp(0.5 + 0.6 * Math.sin(s / 610) + 0.35 * Math.sin(s / 173 + 2), 0, 1); }
  _fillTrees(from, to) {
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), Z = new THREE.Matrix4().makeScale(0, 0, 0);
    let i = this._treeI || 0, changed = false;
    while (this._treeCursor < to) {
      this._treeCursor += 2400 / this.treeN * 1.05;
      const s = this._treeCursor, d = this._density(s), t = this.trees[i]; t.s = s;
      const right = Math.random() < 0.5, near = Math.random() < d;
      const off = near ? 6 + Math.pow(Math.random(), 1.6) * 90 : 110 + Math.random() * 420;
      const x = right ? ROAD.right + off : ROAD.mirror * 2 - ROAD.right - off;
      const h = 7 + Math.random() * 9, conifer = Math.random() < 0.55;
      p.set(x, 0, -s);
      this.trunks.setMatrixAt(i, M.compose(p, q, sc.set(1, h * 0.45, 1)));
      const tone = 0.75 + Math.random() * 0.5;
      if (conifer) { this.cones.setMatrixAt(i, M.compose(p.set(x, h * 0.2, -s), q, sc.set(h * 0.22, h * 0.85, h * 0.22))); this.blobs.setMatrixAt(i, Z); this.cones.setColorAt(i, col.setRGB(0.10 * tone, 0.24 * tone, 0.12 * tone)); }
      else { this.blobs.setMatrixAt(i, M.compose(p.set(x, h * 0.62, -s), q, sc.set(h * 0.34, h * 0.4, h * 0.34))); this.cones.setMatrixAt(i, Z); this.blobs.setColorAt(i, col.setRGB(0.20 * tone, 0.36 * tone, 0.12 * tone)); }
      i = (i + 1) % this.treeN; changed = true;
    }
    this._treeI = i;
    if (changed) for (const m of [this.trunks, this.cones, this.blobs]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  }

  /* ------------------------------ queries ------------------------------ */
  // limit (km/h) that applies at road position s, 0 = unlimited
  limitAt(s) {
    let lim = 0; for (const z of this.zones) if (s >= z.start && s < z.end) lim = minLimit(lim, z.limit);
    if (this.vbaLimit && s >= this.vbaLimit.from && s < this.vbaLimit.until) lim = minLimit(lim, this.vbaLimit.limit);
    return lim;
  }
  // where the walls are at road position s (guardrails, or the beacon line of a closure)
  bounds(s) {
    let min = WALL_L, max = WALL_R;
    for (const c of this.closures) {
      if (s < c.taper0 || s > c.end + c.out) continue;
      const k = s < c.taper1 ? (s - c.taper0) / (c.taper1 - c.taper0) : s > c.end ? 1 - (s - c.end) / c.out : 1;
      if (c.side > 0) max = Math.min(max, WALL_R + (c.edge - WALL_R) * k); else min = Math.max(min, WALL_L + (c.edge - WALL_L) * k);
    }
    return { min, max };
  }
  laneClosed(lane, s) { for (const c of this.closures) if (c.lane === lane && s > c.taper0 - 10 && s < c.end) return true; return false; }
  // distance to the start of a closure of this lane within `look` metres, or Infinity
  closureAhead(lane, s, look) { let d = Infinity; for (const c of this.closures) if (c.lane === lane && c.end > s && c.taper0 - s < look) d = Math.min(d, Math.max(0, c.taper0 - s)); return d; }
  // grip multiplier from the road surface (spills)
  surface(x, s) {
    const z = -s;
    for (const sp of this.spills) {
      if (z < sp.rect[1] || z > sp.rect[3] || x < sp.rect[0] || x > sp.rect[2]) continue;
      for (const b of sp.blobs) { const dx = x - b.x, dz = z - b.z; if (dx * dx + dz * dz < b.r * b.r * 0.8) return sp.kind === 'oil' ? 0.13 : 0.38; }
    }
    return 1;
  }

  /* ------------------------------ events ------------------------------ */
  _dispose(e) {
    if (e.group) { this.frame.remove(e.group); const shared = new Set(Object.values(P.PM));
      e.group.traverse((o) => { if (o.isMesh && o.userData.own) { o.geometry.dispose(); if (!shared.has(o.material)) { o.material.map?.dispose(); o.material.dispose(); } } }); }
    for (const v of e.vehicles || []) { this.frame.remove(v); }
  }
  _zone(start, end, limit, opts = {}) {
    const z = { type: 'zone', start, end, limit, ...opts }; this.zones.push(z); return z;
  }
  _makeZone(start) {
    const len = rand(1100, 2600), limit = pick([120, 120, 100, 130, 80, 100]);
    this._zone(start, start + len, limit); this._sign(start, 'limit', limit); this._sign(start + len, 'limit', 0);
    if (Math.random() < 0.7) { const bs = start + len * rand(0.3, 0.85); const o = this._place(this.blitzerPool, bs); this.blitzers.push({ s: bs, limit, obj: o, done: false }); }
    this.events.push({ type: 'zone', start, end: start + len, limit });
    return start + len;
  }

  _makeRoadworks(start, forceSide) {
    const side = forceSide || (Math.random() < 0.72 ? 1 : -1), lane = side > 0 ? 2 : 0, len = rand(600, 1300);
    const taper0 = start, taper1 = start + 140, end = taper1 + len;
    const edge = side > 0 ? 1.875 + 0.15 : -1.875 - 0.15, outer = side > 0 ? WALL_R : WALL_L;
    const c = { lane, side, taper0, taper1, end, out: 40, edge }; this.closures.push(c);
    const g = new THREE.Group(); this.frame.add(g);
    const own = (o) => { o.traverse((m) => { if (m.isMesh) m.userData.own = true; }); return o; };
    // beacons: along the taper and the closure line (rotated to face traffic)
    const pts = [];
    for (let s = taper0; s <= end + c.out; s += s < taper1 ? 4.5 : 8) { const b = this.bounds(s); const x = side > 0 ? b.max - 0.1 : b.min + 0.1; pts.push([x, -s, 0]); }
    g.add(P.beacons(pts));
    // sequential warning lights along the taper ("Lauflicht")
    const lamps = [];
    for (let s = taper0; s < taper1; s += 14) { const b = this.bounds(s), x = side > 0 ? b.max - 0.1 : b.min + 0.1; const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), P.PM.lampOff); l.position.set(x, 1.38, -s); g.add(l); lamps.push(l); }
    // the arrow trailer stands in the closed lane where the taper begins
    const trailer = P.warnTrailer(), tx = LANES[lane] + side * 0.35; trailer.position.set(tx, 0, -(taper0 + 2)); g.add(trailer);
    this.obstacles.push({ x: tx, s: taper0 + 2, psi: 0, L: 3.6, W: 2.4, vx: 0, vs: 0, r: 0, m: Infinity, I: Infinity });
    // concrete barrier and yellow markings through the site
    const jl = end - taper1 - 20, jb = P.jersey(jl); jb.position.set(edge + side * 0.4, 0, -(taper1 + 10 + jl / 2)); g.add(own(jb));
    const ym = (x, s0, s1, dash) => { for (let s = s0; s < s1; s += dash ? 18 : s1 - s0) { const l = Math.min(dash ? 6 : s1 - s0, s1 - s); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.16, l), P.PM.yellowLine);
      p.rotation.x = -Math.PI / 2; p.position.set(x, 0.011, -(s + l / 2)); g.add(own(p)); } };
    ym(side > 0 ? -1.875 : 1.875, taper1, end, true); ym(edge - side * 0.35, taper1, end, false); ym(side > 0 ? -5.625 : 5.625, taper1, end, false);
    // the work area
    const wx = side > 0 ? 5.3 : -4.2;
    for (let s = taper1 + 60; s < end - 40; s += rand(90, 160)) {
      const r = Math.random(), o = r < 0.3 ? P.excavator() : r < 0.5 ? P.roller() : r < 0.7 ? P.dumper() : P.gravelPile(rand(1.5, 2.6));
      o.position.set(wx + rand(-0.6, 0.6), 0, -s); o.rotation.y += rand(-0.3, 0.3); g.add(o);
      for (let k = 0; k < (Math.random() * 3) | 0; k++) { const w = P.worker(); w.position.set(wx + rand(-1.5, 1.5), 0, -s - rand(-8, 8)); g.add(w); }
    }
    // signs and limits: warning at 1000 m and 500 m, then 100, then 80
    this._sign(taper0 - 1000, 'warn', 'bau', '1000 m'); this._sign(taper0 - 500, 'warn', 'bau', '500 m');
    this._sign(taper0 - 600, 'limit', 100); this._sign(taper0 - 300, 'limit', 80); this._sign(end + c.out + 30, 'limit', 0);
    this._zone(taper0 - 600, taper0 - 300, 100); this._zone(taper0 - 300, end + c.out + 30, 80);
    if (Math.random() < 0.6) { const bs = rand(taper1 + 80, end - 40); const o = this._place(this.blitzerPool, bs, side > 0 ? 5.6 : ROAD.right + 1.6); this.blitzers.push({ s: bs, limit: 80, obj: o, done: false }); }
    this.events.push({ type: 'bau', start: taper0, end, lane, side, group: g, lamps, trailer, closure: c });
    return end + c.out + 30;
  }

  _makeAccident(start, forceKind) {
    const kind = forceKind || (Math.random() < 0.5 ? 'oil' : 'milk'), s0 = start + 120;
    const c = { lane: 2, side: 1, taper0: s0 - 110, taper1: s0 - 50, end: s0 + 22, out: 25, edge: 1.875 + 0.2 }; this.closures.push(c);
    const g = new THREE.Group(); this.frame.add(g); const own = (o) => { o.traverse((m) => { if (m.isMesh) m.userData.own = true; }); return o; };
    const truck = P.tanker(kind), yaw = rand(-0.35, -0.1); truck.position.set(5.2, 0, -s0); truck.rotation.y = yaw; g.add(own(truck));
    this.obstacles.push({ x: 5.2, s: s0, psi: -yaw, L: 15.8, W: 2.9, vx: 0, vs: 0, r: 0, m: Infinity, I: Infinity });
    // cones along the closure
    const pts = []; for (let s = c.taper0; s <= c.end + c.out; s += 6) { const b = this.bounds(s); pts.push([b.max - 0.1, -s]); }
    g.add(P.cones(pts));
    for (const ds of [-260, -180]) { const t = P.warnTriangle(); t.position.set(rand(4.4, 7), 0, -(s0 + ds)); g.add(own(t)); }
    const deb = own(P.debris(26, [5, 30], 0xd8d8d8)); deb.position.set(3.5, 0, -s0 - 6); g.add(deb);
    // the spill: irregular blobs drifting from the tanker across the lanes
    // it pours out of the tank and runs across the lanes, then traffic drags it down the road
    const xMin = pick([-0.5, -2.4, -4.4]), sEnd = s0 + rand(45, 90), blobs = [], streaks = [];
    for (let i = 0; i < 70; i++) {
      const t = Math.pow(Math.random(), 0.8), s = s0 - 8 + t * (sEnd - s0 + 8), cx = 3.6 + (xMin + 1 - 3.6) * Math.pow(t, 0.6);
      const width = 2.4 * (1 - t) + 1.1; blobs.push({ x: cx + (Math.random() - 0.5) * width * 2, z: -s, r: rand(0.6, 1.9) * (1.2 - t * 0.5) });
    }
    for (let i = 0; i < 4; i++) blobs.push({ x: rand(2.6, 4.2), z: -(s0 + rand(-6, 6)), r: rand(1.6, 2.4) });
    for (let i = 0; i < 9; i++) { const b = blobs[(Math.random() * blobs.length) | 0]; streaks.push({ x: b.x + rand(-0.4, 0.4), z0: b.z, z1: b.z - rand(12, 34) }); }
    const rect = [Math.min(...blobs.map((b) => b.x - b.r)) - 1, Math.min(...blobs.map((b) => b.z - b.r), ...streaks.map((k) => k.z1)) - 1, Math.max(...blobs.map((b) => b.x + b.r)) + 1, Math.max(...blobs.map((b) => b.z + b.r)) + 1];
    const spill = { kind, blobs, rect }; this.spills.push(spill);
    g.add(own(P.spillDecal(blobs, streaks, rect, kind)));
    const vehicles = [];
    if (this.factory) { // a car that went into the back of it, hazards on, and the police already there
      const car = this.factory.create(pick(['sedan', 'compact', 'wagon'])); car.position.set(6.6, 0, -(s0 + 14)); car.rotation.y = rand(0.5, 1.1); this.frame.add(car); vehicles.push(car);
      this.obstacles.push({ x: 6.6, s: s0 + 14, psi: -car.rotation.y, L: car.userData.L, W: car.userData.W, vx: 0, vs: 0, r: 0, m: Infinity, I: Infinity });
      const pol = this.factory.create('police'); pol.position.set(6.7, 0, -(s0 - 34)); pol.rotation.y = 0.12; this.frame.add(pol); vehicles.push(pol);
      this.obstacles.push({ x: 6.7, s: s0 - 34, psi: -0.12, L: pol.userData.L, W: pol.userData.W, vx: 0, vs: 0, r: 0, m: Infinity, I: Infinity });
    }
    this._sign(c.taper0 - 700, 'warn', 'gefahr', 'Unfall'); this._sign(c.taper0 - 350, 'limit', 80); this._sign(sEnd + 60, 'limit', 0);
    this._zone(c.taper0 - 350, sEnd + 60, 80);
    this.events.push({ type: 'unfall', kind, start: c.taper0, end: sEnd, group: g, vehicles, spill, closure: c });
    return sEnd + 60;
  }

  /* ------------------------------ gantry messages ------------------------------ */
  _vbaContent(gs) {
    const lanes = LANES.map(() => ({})), text = [];
    let ahead = null; for (const e of this.events) if (e.type !== 'zone' && e.end > gs && e.start - gs < 3200 && (!ahead || e.start < ahead.start)) ahead = e;
    let limit = 0, warn = null;
    const km = (d) => (d < 1000 ? Math.max(100, Math.round(d / 100) * 100) + ' M' : (Math.round(d / 500) / 2).toFixed(1).replace('.', ',').replace(',0', '') + ' KM');
    if (ahead) {
      const d = ahead.start - gs;
      if (ahead.type === 'unfall') { limit = d < 1600 ? 80 : 100; warn = ahead.kind === 'oil' ? 'oil' : '!'; text.push('UNFALL', ahead.kind === 'oil' ? 'ÖLSPUR' : 'MILCH AUF FAHRBAHN', d > 60 ? 'IN ' + km(d) : 'RECHTS GESPERRT'); }
      else { limit = d < 1600 ? 80 : 100; warn = 'bau'; text.push('BAUSTELLE', d > 60 ? 'IN ' + km(d) : '', (ahead.side > 0 ? 'RECHTS' : 'LINKS') + ' GESPERRT'); }
    }
    const w = this.weather;
    if (w) {
      let wl = 0, ww = null, wt = null;
      if (w.cur.storm > 0.5) { wl = 100; ww = 'wind'; wt = ['STURM', 'SEITENWIND']; }
      else if (w.fogLevel > 0.55) { wl = 80; ww = 'fog'; wt = ['NEBEL', 'SICHTWEITE < 150 M']; }
      else if (w.snowCover > 0.4 || w.cur.snow > 0.6) { wl = 80; ww = 'snow'; wt = ['SCHNEEGLÄTTE']; }
      else if (w.cur.rain > 0.45) { wl = 120; ww = 'wet'; wt = ['AQUAPLANING', 'GEFAHR']; }
      if (wl) { limit = minLimit(limit, wl); warn = warn || ww; if (!text.length) text.push(...wt); }
    }
    if (!text.length && this.policeActive) text.push('POLIZEI-', 'EINSATZ');
    if (!text.length && ((gs * 7919) % 10) < 3) text.push(pick(['ABSTAND HALTEN', 'BEI STAU', 'GUTE FAHRT']), ...(((gs * 31) % 2) ? ['RETTUNGSGASSE', 'BILDEN'] : []));
    lanes.forEach((p, i) => { p.limit = limit; p.warn = warn; });
    if (ahead && ahead.type !== 'zone' && ahead.closure) {
      const cl = ahead.closure.lane, d = ahead.start - gs;
      lanes[cl] = d < 30 ? { x: true } : { arrow: cl === 2 ? -1 : 1 };
    }
    return { lanes, text: text.filter(Boolean), limit };
  }
  _drawVba(g) {
    const c = this._vbaContent(g.userData.s), key = JSON.stringify(c);
    g.userData.content = c;
    if (key === g.userData.key) return; g.userData.key = key;
    g.userData.panels.forEach((p, i) => { drawLanePanel(p.g, c.lanes[i]); p.t.needsUpdate = true; });
    drawTextPanel(g.userData.text.g, c.text); g.userData.text.t.needsUpdate = true;
  }

  _generate() {
    const horizon = this.s + AHEAD - 100;
    while (this.genEvent < horizon) {
      const start = Math.max(this.genEvent, this.s + 900), r = Math.random();
      const end = r < 0.4 ? this._makeZone(start) : r < 0.72 ? this._makeRoadworks(start) : this._makeAccident(start);
      // an LED gantry before roadworks and accidents
      const e = this.events[this.events.length - 1];
      if (e.type !== 'zone' && e.start - 1300 > this.s + 200) { this._place(this.vbas, e.start - 1300); this.genVba = Math.max(this.genVba, e.start + 600); }
      this.genEvent = end + rand(1300, 3600);
    }
    while (this.genVba < horizon) { this._place(this.vbas, this.genVba); this.genVba += rand(1800, 3200); }
    while (this.genBridge < horizon) { this._place(this.bridges, this.genBridge); this.genBridge += rand(1300, 2800); }
    while (this.genGantry < horizon) { this._place(this.gantries, this.genGantry); this.genGantry += rand(3000, 5200); }
    while (this.genBoard < horizon) { this._place(this.boards, this.genBoard); this.genBoard += rand(2500, 4200); }
    while (this.genTurbine < horizon) { const n = 1 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) { let t = this.turbines[0]; for (const o of this.turbines) if (o.userData.s < t.userData.s) t = o;
        const s = this.genTurbine + i * rand(160, 260); t.userData.s = s; const right = Math.random() < 0.5; t.position.set(right ? rand(180, 520) : -rand(200, 540), 0, -s); t.rotation.y = rand(-0.5, 0.5); }
      this.genTurbine += rand(1800, 4200); }
    // forget what is well behind us
    const behind = this.s - 400;
    this.events = this.events.filter((e) => { if (e.end + 200 < behind) { this._dispose(e); return false; } return true; });
    this.zones = this.zones.filter((z) => z.end > behind);
    this.closures = this.closures.filter((c) => c.end + c.out > behind);
    this.spills = this.spills.filter((sp) => -sp.rect[1] > behind);
    this.obstacles = this.obstacles.filter((o) => o.s > behind);
    this.blitzers = this.blitzers.filter((b) => b.s > this.s - 100);
  }

  update(dt, s, sky) {
    this.s = s; this.frame.position.z = s; this.weather = sky;
    this.roadTex.offset.y = (s / 18) % 1;
    this.grassTex.offset.y = (s / 40) % 1;
    this.posts.position.z = s % 4; for (const m of this.leit) m.position.z = s % 50;
    this._generate(); this._fillTrees(0, s + AHEAD);
    for (const t of this.turbines) t.userData.rotor.rotation.z += dt * t.userData.speed;
    for (const b of this.blitzerPool) b.userData.flash.opacity = Math.max(0, b.userData.flash.opacity - dt * 5);
    // LED gantries: refresh what they show; passing one sets its limit for the next stretch
    this._vbaT = (this._vbaT || 0) - dt;
    if (this._vbaT <= 0) { this._vbaT = 0.5; for (const g of this.vbas) if (g.visible && g.userData.s > s - 50 && g.userData.s < s + AHEAD) this._drawVba(g); }
    for (const g of this.vbas) if (g.visible && g.userData.content && g.userData.s < s && g.userData.s > s - 40 && !this._vbaPassed.has(g.userData.s)) {
      this._vbaPassed.add(g.userData.s); this.vbaLimit = { limit: g.userData.content.limit, from: g.userData.s, until: g.userData.s + 2400 };
    }
    // blinking: roadworks lights, trailer arrows, hazard lights, police lights at accidents
    const t = performance.now() / 1000;
    for (const e of this.events) {
      if (e.lamps) e.lamps.forEach((l, i) => { l.material = ((t * 6 - i) % e.lamps.length + e.lamps.length) % e.lamps.length < 1 ? P.PM.lampOn : P.PM.lampOff; });
      if (e.trailer) { const on = t % 0.9 < 0.45; for (const l of e.trailer.userData.lamps) l.material = on ? P.PM.lampOn : P.PM.lampOff; }
      for (const v of e.vehicles || []) { const u = v.userData, on = t % 0.8 < 0.4; for (const i of u.ind.l) i.visible = on; for (const i of u.ind.r) i.visible = on;
        if (u.blue) { const k = (t * 8) | 0; u.blue[0].emissiveIntensity = k % 4 < 1 ? 9 : 0.2; u.blue[1].emissiveIntensity = k % 4 === 2 ? 9 : 0.2; } }
    }
    // weather on surfaces
    const wet = sky.wet, snow = sky.snowCover;
    this.roadMat.roughness = 0.92 - wet * 0.62; this.roadMat.metalness = wet * 0.25;
    this.roadMat.color.setScalar(1 - wet * 0.35); this.uSnow.value = snow;
    this.hillMat.color.setHex(0x30462f).lerp(_snowFar, snow * 0.6).lerp(this.scene.fog.color, 0.55 + Math.min(0.45, this.scene.fog.density * 150));
    this.reflMat.emissiveIntensity = sky.night * 2.5;
  }
}
const _snowFar = new THREE.Color(0xd8dde2);
