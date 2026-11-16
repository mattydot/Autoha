// The Autobahn: road surface, guardrails, signs, limit zones, scenery.
import * as THREE from 'three';

export const LANES = [-3.75, 0, 3.75];           // left (fast) -> right (slow)
export const ROAD = { left: -6.05, right: 8.2, mirror: -15.4 };
const LEN = 2400, AHEAD = 1700;                  // visible road length / part ahead of the player
const FONT = '"DIN Alternate","Bahnschrift","DIN Condensed","Roboto Condensed","Arial Narrow",Arial,sans-serif';
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];

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
    // tyre-worn lanes
    for (const l of LANES) for (const o of [-0.85, 0.85]) { const gr = g.createLinearGradient(X(l + o) - 30, 0, X(l + o) + 30, 0); gr.addColorStop(0, 'rgba(20,20,22,0)'); gr.addColorStop(0.5, 'rgba(20,20,22,0.28)'); gr.addColorStop(1, 'rgba(20,20,22,0)'); g.fillStyle = gr; g.fillRect(X(l + o) - 30, 0, 60, h); }
    g.fillStyle = '#3b3d41'; g.fillRect(X(5.8), 0, w, h); noise(g, w - X(5.8), h, 0, []);
    g.fillStyle = '#e9e9e4';
    g.fillRect(X(-5.625) - 0.15 * M, 0, 0.3 * M, h); g.fillRect(X(5.625) - 0.15 * M, 0, 0.3 * M, h);
    for (const x of [-1.875, 1.875]) g.fillRect(X(x) - 0.08 * M, 0, 0.16 * M, h / 3);
  }, true);
}
function grassTexture() {
  return canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#4d6b34'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 9000, ['#3f5c2a', '#5a7a3c', '#6a8442', '#46602e', '#587035'], 5); }, true);
}
function limitSign(n) {
  return canvasTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
    if (n) { g.strokeStyle = '#d0121a'; g.lineWidth = 30; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.stroke();
      g.fillStyle = '#111'; g.font = `bold ${n >= 100 ? 108 : 124}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, 128, 136);
    } else { g.strokeStyle = '#222'; g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.stroke();
      g.save(); g.beginPath(); g.arc(128, 128, 122, 0, 7); g.clip(); g.translate(128, 128); g.rotate(-Math.PI / 4); g.fillStyle = '#1a1a1a';
      for (let i = -2; i <= 2; i++) g.fillRect(-140, i * 15 - 3.5, 280, 7); g.restore(); }
  });
}
const CITIES = ['München', 'Nürnberg', 'Stuttgart', 'Frankfurt', 'Köln', 'Berlin', 'Hamburg', 'Leipzig', 'Dresden', 'Würzburg', 'Ingolstadt', 'Kassel', 'Hannover', 'Karlsruhe', 'Regensburg', 'Ulm'];
function gantrySign(kind) {
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

/* ------------------------------ world ------------------------------ */
export class World {
  constructor(scene) {
    this.scene = scene;
    this.frame = new THREE.Group(); scene.add(this.frame);         // everything that sits at a fixed road position
    this.s = 0;
    this.zones = []; this.props = []; this.blitzers = [];
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
    // grass only beside the carriageways (never underneath them: no overdraw, no z-fighting)
    for (const x0 of [8.15, -23.55 - 1600]) { const gr = new THREE.Mesh(new THREE.PlaneGeometry(1600, LEN, 8, 32), this.grassMat); gr.rotation.x = -Math.PI / 2; gr.position.set(x0 + 800, -0.02, -(AHEAD - LEN / 2)); this.scene.add(gr); }
    // far ground so the horizon never shows a gap
    const far = new THREE.Mesh(new THREE.RingGeometry(640, 4500, 40, 1), this._snowy(new THREE.MeshLambertMaterial({ color: 0x4a6534 }), 0.94)); far.rotation.x = -Math.PI / 2; far.position.y = -0.3; this.scene.add(far);
    this.farMat = far.material;
    // hills on the horizon
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
    // Leitpfosten (reflector posts) every 50 m
    const pg = new THREE.BoxGeometry(0.12, 1.0, 0.08), n2 = LEN / 50;
    const lp = new THREE.InstancedMesh(pg, this.m.white, n2 * 2), band = new THREE.InstancedMesh(new THREE.BoxGeometry(0.125, 0.22, 0.085), this.m.dark, n2 * 2);
    this.reflMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0 });
    const refl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.16, 0.09), this.reflMat, n2 * 2);
    k = 0; for (const x of [ROAD.right + 1.1, ROAD.left - 1.5]) for (let i = 0; i < n2; i++) { const zz = -AHEAD + i * 50;
      lp.setMatrixAt(k, M.makeTranslation(x, 0.5, zz)); band.setMatrixAt(k, M.makeTranslation(x, 0.78, zz)); refl.setMatrixAt(k, M.makeTranslation(x, 0.78, zz + 0.004)); k++; }
    for (const m of [lp, band, refl]) { m.frustumCulled = false; this.scene.add(m); }
    this.leit = [lp, band, refl];
    // median: gravel strip
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
    // wind turbines
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
    // overpass bridges
    this.bridges = pool(3, () => { const g = new THREE.Group();
      g.add(B(rx - lx + 60, 1.3, 13, m.concrete, cx, 6.6, 0)); g.add(B(rx - lx + 60, 1.0, 0.25, m.steel, cx, 7.7, 6.4)); g.add(B(rx - lx + 60, 1.0, 0.25, m.steel, cx, 7.7, -6.4));
      for (const x of [ROAD.mirror / 2, rx + 1.5, lx - 1.5]) for (const z of [-4, 4]) g.add(B(1.1, 6, 1.1, m.concrete, x, 3, z));
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 26, 7.3, 4, 1), this.grassMat); e.rotation.y = Math.PI / 4; e.scale.z = 0.9; e.position.set(s > 0 ? rx + 28 : lx - 28, 3.2, 0); g.add(e); }
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(rx - lx, 15), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.45, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(cx, 0.03, 0); g.add(sh); g.userData.shadow = sh;
      return g; });
    // overhead sign gantries
    this.gantries = pool(3, (i) => { const g = new THREE.Group();
      for (const x of [ROAD.left - 1.2, ROAD.right + 1.6]) g.add(B(0.35, 7.6, 0.35, m.steel, x, 3.8, 0));
      for (const y of [6.3, 7.5]) g.add(B(ROAD.right - ROAD.left + 2.8, 0.14, 0.14, m.steel, (ROAD.left + ROAD.right) / 2 + 0.2, y, 0));
      for (let x = ROAD.left - 1; x < ROAD.right + 1.4; x += 1.3) { const d = B(0.08, 1.7, 0.08, m.steel, x + 0.65, 6.9, 0); d.rotation.z = (Math.round(x) % 2 ? 1 : -1) * 0.75; g.add(d); }
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 3.3), new THREE.MeshStandardMaterial({ map: gantrySign('route'), roughness: 0.6, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 })); s1.position.set(-2.2, 6.9, 0.12); g.add(s1);
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), new THREE.MeshStandardMaterial({ map: gantrySign(i % 2 ? 'exit' : 'route'), roughness: 0.6 })); s2.position.set(4.6, 6.9, 0.12); g.add(s2);
      return g; });
    this.boards = pool(2, () => { const g = new THREE.Group(); for (const x of [-1.6, 1.6]) g.add(B(0.16, 3.2, 0.16, m.steel, x, 1.6, -0.1));
      const s = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.45), new THREE.MeshStandardMaterial({ map: distanceBoard(), roughness: 0.6 })); s.position.y = 3.6; g.add(s); g.position.x = ROAD.right + 5.5; return g; });
    // limit signs (number set when placed)
    this.limitTex = { 80: limitSign(80), 100: limitSign(100), 120: limitSign(120), 130: limitSign(130), 0: limitSign(0) };
    this.signs = pool(12, () => { const g = new THREE.Group(); g.add(B(0.1, 3.4, 0.1, m.steel, 0, 1.7, -0.06));
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.85, 28), new THREE.MeshStandardMaterial({ map: this.limitTex[120], roughness: 0.55, transparent: true, alphaTest: 0.5 })); d.position.y = 3.2; g.add(d); g.userData.disc = d; return g; });
    // Blitzer (speed camera)
    this.blitzerPool = pool(2, () => { const g = new THREE.Group(); g.add(B(0.22, 2.1, 0.22, m.steel, 0, 1.05, 0)); g.add(B(0.6, 0.85, 0.5, new THREE.MeshStandardMaterial({ color: 0x55605a, roughness: 0.6 }), 0, 2.5, 0));
      g.add(B(0.4, 0.3, 0.06, m.dark, 0, 2.62, 0.25)); const fm = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0 });
      const f = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), fm); f.position.set(0, 2.5, 0.4); g.add(f); g.userData.flash = fm; g.position.x = ROAD.right + 1.6; return g; });
  }

  _take(pool) { let best = pool[0]; for (const o of pool) if (o.userData.s < best.userData.s) best = o; return best; }
  _place(pool, s, x) { const o = this._take(pool); o.userData.s = s; o.position.z = -s; if (x !== undefined) o.position.x = x; o.visible = true; return o; }
  _sign(s, limit) { for (const x of [ROAD.right + 1.5, ROAD.left - 1.55]) { const o = this._place(this.signs, s, x); o.userData.disc.material.map = this.limitTex[limit]; o.userData.disc.scale.setScalar(limit ? 1 : 0.9); } }

  reset() {
    this.s = 0; this.frame.position.z = 0;
    this.zones = []; this.blitzers = [];
    this.genZone = 1800 + rand(0, 1500); this.genBridge = 500; this.genGantry = 1100; this.genBoard = 300; this.genTurbine = 600;
    for (const p of [this.bridges, this.gantries, this.boards, this.signs, this.blitzerPool]) for (const o of p) { o.userData.s = -1e9; o.visible = false; }
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

  // limit (km/h) that applies at road position s, 0 = unlimited
  limitAt(s) { for (const z of this.zones) if (s >= z.start && s < z.end) return z.limit; return 0; }

  _generate() {
    const horizon = this.s + AHEAD - 100;
    while (this.genZone < horizon) {
      const start = Math.max(this.genZone, this.s + 600), len = rand(1100, 2600), limit = pick([120, 120, 100, 130, 80, 100]);
      const z = { start, end: start + len, limit }; this.zones.push(z);
      this._sign(start, limit); this._sign(start + len, 0);
      if (Math.random() < 0.7) { const bs = start + len * rand(0.3, 0.85); const o = this._place(this.blitzerPool, bs); this.blitzers.push({ s: bs, limit, obj: o, done: false }); }
      this.genZone = start + len + rand(2200, 5200);
    }
    while (this.genBridge < horizon) { this._place(this.bridges, this.genBridge); this.genBridge += rand(1300, 2800); }
    while (this.genGantry < horizon) { this._place(this.gantries, this.genGantry); this.genGantry += rand(1900, 3400); }
    while (this.genBoard < horizon) { this._place(this.boards, this.genBoard); this.genBoard += rand(2500, 4200); }
    while (this.genTurbine < horizon) { const n = 1 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) { let t = this.turbines[0]; for (const o of this.turbines) if (o.userData.s < t.userData.s) t = o;
        const s = this.genTurbine + i * rand(160, 260); t.userData.s = s; const right = Math.random() < 0.5; t.position.set(right ? rand(180, 520) : -rand(200, 540), 0, -s); t.rotation.y = rand(-0.5, 0.5); }
      this.genTurbine += rand(1800, 4200); }
    this.zones = this.zones.filter((z) => z.end > this.s - 300);
    this.blitzers = this.blitzers.filter((b) => b.s > this.s - 100);
  }

  update(dt, s, sky) {
    this.s = s; this.frame.position.z = s;
    this.roadTex.offset.y = (s / 18) % 1;
    this.grassTex.offset.y = (s / 40) % 1;
    this.posts.position.z = s % 4; for (const m of this.leit) m.position.z = s % 50;
    this._generate(); this._fillTrees(0, s + AHEAD);
    for (const t of this.turbines) t.userData.rotor.rotation.z += dt * t.userData.speed;
    for (const b of this.blitzerPool) b.userData.flash.opacity = Math.max(0, b.userData.flash.opacity - dt * 5);
    // weather on surfaces
    const wet = sky.wet, snow = sky.snowCover;
    this.roadMat.roughness = 0.92 - wet * 0.62; this.roadMat.metalness = wet * 0.25;
    this.roadMat.color.setScalar(1 - wet * 0.35); this.uSnow.value = snow;
    this.hillMat.color.setHex(0x30462f).lerp(_snowFar, snow * 0.6).lerp(this.scene.fog.color, 0.55 + Math.min(0.45, this.scene.fog.density * 150)).multiplyScalar(1);
    this.reflMat.emissiveIntensity = sky.night * 2.5;
  }
}
const _snowFar = new THREE.Color(0xd8dde2);
