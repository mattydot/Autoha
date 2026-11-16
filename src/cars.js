// Procedural car models + specs. All cars are original low-poly designs
// "in the spirit of" famous German/Italian/French performance cars.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ------------------------------------------------------------------ */
/* Player car specs                                                    */
/* ------------------------------------------------------------------ */
export const CARS = [
  {
    id: 'm3', name: 'BAYERN M-DREI', sub: 'Competition · sport sedan',
    engine: '3.0 L twin-turbo inline-6', ps: 510, mass: 1730, vmax: 290, zeroTo100: 3.9,
    handling: 1.0, awd: false, gears: 8, redline: 7200, idle: 850,
    colors: [0x1f6b3a, 0x0f3d8a, 0xd9d9d9, 0x111114, 0xf2c200, 0xb01018],
    sound: { cyl: 6, f1: 150, f2: 520, bright: 0.75, decay: 95, rasp: 0.35, turbo: 0.5, pops: 0.6, uneven: 0.08, gain: 1.0 },
    body: {
      L: 4.79, W: 1.90, H: 1.43, c: 0.16, wheelR: 0.345, wb: 2.86, fo: 0.86,
      hoodH: 0.80, noseH: 0.52, cowlH: 0.95, cowlX: 0.72, roofF: 0.05, roofR: -1.05,
      baseR: -1.72, beltR: 0.98, deckH: 0.96, tailH: 0.92,
      pillars: [-0.38], grille: 'kidney', head: 'slim', tail: 'L', wing: 'lip', exhaust: 'quad', flare: 0.03,
    },
  },
  {
    id: 'rs6', name: 'INGOLSTADT RS-SECHS', sub: 'Avant · super wagon',
    engine: '4.0 L biturbo V8', ps: 630, mass: 2075, vmax: 305, zeroTo100: 3.4,
    handling: 0.92, awd: true, gears: 8, redline: 6800, idle: 800,
    colors: [0x6e7379, 0x101114, 0x7a1420, 0x16356e, 0xe9e9ea, 0x2e4d3a],
    sound: { cyl: 8, f1: 105, f2: 380, bright: 0.6, decay: 70, rasp: 0.3, turbo: 0.45, pops: 0.8, uneven: 0.45, gain: 1.05 },
    body: {
      L: 4.99, W: 1.95, H: 1.46, c: 0.15, wheelR: 0.36, wb: 2.93, fo: 0.92,
      hoodH: 0.84, noseH: 0.55, cowlH: 0.98, cowlX: 0.78, roofF: 0.12, roofR: -2.0,
      baseR: -2.36, beltR: 1.0, deckH: 0.99, tailH: 0.95,
      pillars: [-0.3, -1.25], grille: 'hex', head: 'angular', tail: 'bar', wing: 'roof', exhaust: 'oval', flare: 0.05,
    },
  },
  {
    id: 'maybach', name: 'STUTTGART MAIBACH S', sub: 'Landaulet · luxury limousine',
    engine: '6.0 L biturbo V12', ps: 612, mass: 2350, vmax: 250, zeroTo100: 4.5,
    handling: 0.78, awd: true, gears: 9, redline: 6000, idle: 650,
    colors: [0x0c0c10, 0x3b2a1e, 0x1a2540, 0xc9c5bb, 0x4a0f18, 0x23362b],
    twoTone: [0xb9b6ad, 0xcbb892, 0xc0c0c4, 0x15151a, 0xd8cdb8, 0xbfc2b8],
    sound: { cyl: 12, f1: 95, f2: 300, bright: 0.3, decay: 80, rasp: 0.12, turbo: 0.2, pops: 0.0, uneven: 0.03, gain: 0.8 },
    body: {
      L: 5.47, W: 1.92, H: 1.51, c: 0.17, wheelR: 0.36, wb: 3.40, fo: 0.90,
      hoodH: 0.90, noseH: 0.62, cowlH: 1.02, cowlX: 0.95, roofF: 0.30, roofR: -1.55,
      baseR: -2.12, beltR: 1.03, deckH: 0.98, tailH: 0.90,
      pillars: [-0.2, -1.2], grille: 'chrome', head: 'big', tail: 'L', wing: 'none', exhaust: 'oval', flare: 0.0, chromeTrim: true,
    },
  },
  {
    id: 'v10', name: 'TORO URAGANO', sub: 'V10 · mid-engine supercar',
    engine: '5.2 L naturally aspirated V10', ps: 640, mass: 1490, vmax: 325, zeroTo100: 2.9,
    handling: 1.12, awd: true, gears: 7, redline: 8600, idle: 950,
    colors: [0x7bd10f, 0xf28a00, 0xf6e000, 0xe8e8ea, 0x0e0e12, 0x0a5bd0],
    sound: { cyl: 10, f1: 190, f2: 760, bright: 1.0, decay: 120, rasp: 0.55, turbo: 0.0, pops: 0.9, uneven: 0.12, gain: 1.1 },
    body: {
      L: 4.52, W: 1.93, H: 1.17, c: 0.12, wheelR: 0.35, wb: 2.62, fo: 1.06,
      hoodH: 0.60, noseH: 0.36, cowlH: 0.78, cowlX: 0.95, roofF: -0.05, roofR: -0.55,
      baseR: -1.75, beltR: 0.92, deckH: 0.90, tailH: 0.84,
      pillars: [], grille: 'intakes', head: 'y', tail: 'y', wing: 'lip', exhaust: 'center2', flare: 0.04, midEngine: true,
    },
  },
  {
    id: 'v12', name: 'TORO AVENTURA SV', sub: 'V12 · flagship supercar',
    engine: '6.5 L naturally aspirated V12', ps: 770, mass: 1575, vmax: 350, zeroTo100: 2.8,
    handling: 1.05, awd: true, gears: 7, redline: 8700, idle: 950,
    colors: [0xe8a400, 0xc40d12, 0x10a0c8, 0x0e0e12, 0xf0f0f2, 0x6a1fb0],
    sound: { cyl: 12, f1: 175, f2: 820, bright: 1.0, decay: 125, rasp: 0.6, turbo: 0.0, pops: 1.0, uneven: 0.05, gain: 1.15 },
    body: {
      L: 4.84, W: 2.03, H: 1.14, c: 0.115, wheelR: 0.365, wb: 2.70, fo: 1.14,
      hoodH: 0.56, noseH: 0.33, cowlH: 0.74, cowlX: 1.05, roofF: 0.05, roofR: -0.5,
      baseR: -1.95, beltR: 0.90, deckH: 0.88, tailH: 0.82,
      pillars: [], grille: 'intakes', head: 'y', tail: 'y', wing: 'wing', exhaust: 'center1', flare: 0.05, midEngine: true,
    },
  },
  {
    id: 'w16', name: 'MOLSHEIM W16', sub: 'Super Sport · hypercar',
    engine: '8.0 L quad-turbo W16', ps: 1600, mass: 1995, vmax: 440, zeroTo100: 2.4,
    handling: 0.98, awd: true, gears: 7, redline: 7100, idle: 750,
    colors: [0x0a2a6e, 0x101014, 0xb8180f, 0xe6e6e8, 0x0f5e58, 0xd96a00],
    twoTone: [0x05070f, 0x2a2a30, 0x101014, 0x0a2a6e, 0x08090c, 0x101014],
    sound: { cyl: 16, f1: 80, f2: 330, bright: 0.55, decay: 60, rasp: 0.3, turbo: 1.0, pops: 0.4, uneven: 0.1, gain: 1.2 },
    body: {
      L: 4.72, W: 2.04, H: 1.21, c: 0.12, wheelR: 0.37, wb: 2.71, fo: 1.0,
      hoodH: 0.70, noseH: 0.44, cowlH: 0.86, cowlX: 0.80, roofF: -0.10, roofR: -0.70,
      baseR: -1.95, beltR: 0.96, deckH: 0.93, tailH: 0.86,
      pillars: [], grille: 'horseshoe', head: 'quad', tail: 'bar', wing: 'wing', exhaust: 'center2', flare: 0.04, midEngine: true, cLine: true,
    },
  },
];

/* Generic traffic bodies */
const TRAFFIC_BODIES = {
  compact: { L: 4.1, W: 1.78, H: 1.47, c: 0.16, wheelR: 0.31, wb: 2.6, fo: 0.82, hoodH: 0.85, noseH: 0.55, cowlH: 0.98, cowlX: 0.85,
    roofF: 0.25, roofR: -1.45, baseR: -1.95, beltR: 1.0, deckH: 0.98, tailH: 0.95, pillars: [-0.25], grille: 'plain', head: 'plain', tail: 'plain', wing: 'none', exhaust: 'none', flare: 0 },
  sedan: { L: 4.7, W: 1.84, H: 1.45, c: 0.16, wheelR: 0.32, wb: 2.8, fo: 0.88, hoodH: 0.84, noseH: 0.56, cowlH: 0.97, cowlX: 0.78,
    roofF: 0.12, roofR: -1.1, baseR: -1.72, beltR: 0.99, deckH: 0.97, tailH: 0.92, pillars: [-0.35], grille: 'plain', head: 'plain', tail: 'plain', wing: 'none', exhaust: 'none', flare: 0 },
  wagon: { L: 4.8, W: 1.84, H: 1.48, c: 0.16, wheelR: 0.32, wb: 2.82, fo: 0.9, hoodH: 0.85, noseH: 0.56, cowlH: 0.98, cowlX: 0.78,
    roofF: 0.12, roofR: -1.95, baseR: -2.28, beltR: 1.0, deckH: 0.99, tailH: 0.95, pillars: [-0.3, -1.25], grille: 'plain', head: 'plain', tail: 'plain', wing: 'none', exhaust: 'none', flare: 0 },
  suv: { L: 4.75, W: 1.94, H: 1.72, c: 0.23, wheelR: 0.37, wb: 2.85, fo: 0.88, hoodH: 1.05, noseH: 0.72, cowlH: 1.18, cowlX: 0.80,
    roofF: 0.2, roofR: -1.85, baseR: -2.22, beltR: 1.2, deckH: 1.18, tailH: 1.12, pillars: [-0.3, -1.25], grille: 'plain', head: 'plain', tail: 'plain', wing: 'none', exhaust: 'none', flare: 0.03 },
  van: { L: 5.3, W: 2.0, H: 2.35, c: 0.2, wheelR: 0.36, wb: 3.3, fo: 0.95, hoodH: 1.25, noseH: 0.75, cowlH: 1.4, cowlX: 1.85,
    roofF: 1.3, roofR: -2.5, baseR: -2.58, beltR: 1.42, deckH: 1.4, tailH: 1.38, pillars: [0.75], grille: 'plain', head: 'plain', tail: 'plain', wing: 'none', exhaust: 'none', flare: 0, panel: true },
};
export const TRAFFIC_COLORS = [0xd8d8da, 0xd8d8da, 0x9a9ea3, 0x9a9ea3, 0x18181b, 0x18181b, 0x2a2d33, 0x1d3f7a, 0x8a1c1c, 0xf2f2f2, 0x4a5a48, 0x6b4a2e, 0xb8a888, 0x2a6a8a];
const TRUCK_COLORS = [0xf0f0f0, 0xd22b2b, 0x1b4fa8, 0xf2b600, 0x2e7d4a, 0x30343a, 0xe8660c];

/* ------------------------------------------------------------------ */
/* Shared materials                                                    */
/* ------------------------------------------------------------------ */
export const MATS = {
  glass: new THREE.MeshPhysicalMaterial({ color: 0x06090c, metalness: 0.9, roughness: 0.08, clearcoat: 1, envMapIntensity: 1.4 }),
  black: new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.75, metalness: 0.1 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xe6e6ea, roughness: 0.12, metalness: 1 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.92 }),
  rim: new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.25, metalness: 0.95 }),
  rimDark: new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.35, metalness: 0.9 }),
  caliper: new THREE.MeshStandardMaterial({ color: 0xc81010, roughness: 0.5 }),
  head: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 0.6, roughness: 0.2 }),
  amber: new THREE.MeshStandardMaterial({ color: 0xff9900, emissive: 0xff8800, emissiveIntensity: 4, roughness: 0.4 }),
  plate: null,
  truckBox: new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.8 }),
};
const tailProto = new THREE.MeshStandardMaterial({ color: 0x5a0606, emissive: 0xff1010, emissiveIntensity: 0.5, roughness: 0.3 });

function plateTexture(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 56;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, 256, 56);
  g.fillStyle = '#0a3aa0'; g.fillRect(0, 0, 26, 56);
  g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 253, 53);
  g.fillStyle = '#111'; g.font = 'bold 40px "DIN Alternate","Bahnschrift","Arial Narrow",Arial,sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 141, 30);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function plateMat(text) { return new THREE.MeshStandardMaterial({ map: plateTexture(text), roughness: 0.6 }); }

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */
// closed polygon with rounded corners -> THREE.Shape / Path
function roundedPath(pts, r0, Cls = THREE.Shape) {
  const s = new Cls(), n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const r = p[2] ?? r0;
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const ra = Math.min(r, da * 0.45), rb = Math.min(r, db * 0.45);
    const p1 = [p[0] + (a[0] - p[0]) / da * ra, p[1] + (a[1] - p[1]) / da * ra];
    const p2 = [p[0] + (b[0] - p[0]) / db * rb, p[1] + (b[1] - p[1]) / db * rb];
    if (i === 0) s.moveTo(p1[0], p1[1]); else s.lineTo(p1[0], p1[1]);
    s.quadraticCurveTo(p[0], p[1], p2[0], p2[1]);
  }
  s.closePath();
  return s;
}
function extrude(shape, depth, bevel, segs = 3, curveSegments = 8) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel,
    bevelSegments: segs, curveSegments, steps: 1,
  });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  return g;
}
function warp(geo, fn) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); fn(v); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  return geo;
}
function lineX(a, b, y) { return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); }
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; }
function box(w, h, d, mat, x, y, z, bev) { return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z); }

// Merge all meshes of a group by material (far fewer draw calls)
function bake(group) {
  group.updateMatrixWorld(true);
  const by = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!by.has(o.material)) by.set(o.material, []);
    by.get(o.material).push(g);
  });
  const out = new THREE.Group();
  for (const [mat, list] of by) out.add(new THREE.Mesh(mergeGeometries(list, false), mat));
  return out;
}

/* ------------------------------------------------------------------ */
/* Wheels                                                              */
/* ------------------------------------------------------------------ */
function buildWheel(r, w, detail, sporty, side) {
  const g = new THREE.Group();
  const cyl = (rad, len, mat, z = 0, seg = 28) => { const m = mesh(new THREE.CylinderGeometry(rad, rad, len, seg), mat, 0, 0, z); m.rotation.x = Math.PI / 2; return m; };
  const tire = new THREE.Mesh(new THREE.TorusGeometry(r - w * 0.36, w * 0.36, 10, 28), MATS.tire);
  tire.scale.z = 1.38; g.add(tire);
  g.add(cyl(r * 0.80, w * 0.9, MATS.tire));
  const rr = r * (sporty ? 0.74 : 0.66);
  const face = side * w * 0.42;
  g.add(cyl(rr, 0.03, MATS.rimDark, face - side * 0.05));
  if (detail) {
    g.add(cyl(rr * 0.82, 0.02, MATS.chrome, face - side * 0.03));          // brake disc
    const cal = box(rr * 0.5, rr * 0.34, 0.05, MATS.caliper, -rr * 0.55, rr * 0.2, face - side * 0.015);
    if (sporty) g.add(cal);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.022, 6, 28), MATS.rim); ring.position.z = face; g.add(ring);
  const n = sporty ? 10 : 5;
  const spin = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const s = box(rr * 0.98, sporty ? 0.035 : 0.075, 0.03, MATS.rim, 0, 0, 0);
    const a = (i / n) * Math.PI * 2 + (sporty && i % 2 ? 0.16 : 0);
    s.position.set(Math.cos(a) * rr * 0.5, Math.sin(a) * rr * 0.5, face + side * 0.005); s.rotation.z = a; spin.add(s);
  }
  spin.add(cyl(rr * 0.2, 0.05, MATS.rim, face + side * 0.01, 12));
  g.add(spin);
  // calipers must not spin, so they stay out of the baked spinning part
  const spinning = new THREE.Group();
  const fixed = [];
  for (const c of [...g.children]) { if (c.material === MATS.caliper) fixed.push(c); else spinning.add(c); }
  const baked = bake(spinning);
  const pivot = new THREE.Group();
  pivot.add(baked); for (const f of fixed) pivot.add(f);
  pivot.userData.spin = baked;
  return pivot;
}

/* ------------------------------------------------------------------ */
/* Car body builder                                                    */
/* ------------------------------------------------------------------ */
// Build coordinates: x forward, y up, z lateral. Rotated at the end so the
// nose points to -Z (direction of travel).
function buildBody(b, mats, detail) {
  const g = new THREE.Group();
  const hl = b.L / 2, W = b.W;
  const taper = (x) => { const t = Math.min(1, Math.abs(x) / hl); return 1 - (x > 0 ? 0.20 : 0.13) * Math.pow(t, x > 0 ? 3.2 : 4) - (b.midEngine && x > 0 ? 0.06 * t * t : 0); };
  const belt = Math.min(b.cowlH, b.beltR) - 0.03;
  const tumble = (v) => {
    v.z *= taper(v.x);
    if (v.y > belt) v.z *= 1 - (b.midEngine ? 0.30 : 0.22) * Math.min(1, (v.y - belt) / (b.H - belt));
    // lower body tuck-in
    if (v.y < 0.42) v.z *= 1 - 0.05 * (0.42 - v.y) / 0.42;
  };

  // --- lower body ------------------------------------------------------
  const rearX = -hl;
  const body = roundedPath([
    [rearX + 0.10, b.c, 0.06], [rearX, b.c + 0.22, 0.10], [rearX + 0.03, b.tailH, 0.10],
    [b.baseR, b.beltR, 0.25], [b.cowlX, b.cowlH, 0.35],
    [hl - 0.28, b.hoodH, 0.30], [hl, b.noseH, 0.12], [hl - 0.04, b.c + 0.05, 0.08], [hl - 0.25, b.c, 0.05],
  ], 0.1);
  g.add(mesh(warp(extrude(body, W, 0.09, 4, 10), tumble), mats.paint));

  // --- greenhouse ------------------------------------------------------
  const G0 = [b.baseR + 0.02, b.beltR - 0.05], G1 = [b.roofR, b.H], G2 = [b.roofF, b.H - 0.015], G3 = [b.cowlX - 0.02, b.cowlH - 0.05];
  const gh = roundedPath([[...G0, 0.05], [...G1, 0.22], [...G2, 0.22], [...G3, 0.05]], 0.1);
  const ghW = W - 0.10;
  g.add(mesh(warp(extrude(gh, ghW, 0.06, 3, 8), tumble), b.panel ? mats.paint : MATS.glass));
  if (b.panel) { // panel van: glass only at the cab
    const cab = roundedPath([[b.pillars[0] + 0.1, b.cowlH + 0.1], [b.pillars[0] + 0.1, b.H - 0.12], [G2[0] - 0.05, b.H - 0.12], [G3[0] - 0.12, b.cowlH + 0.1]], 0.05);
    g.add(mesh(warp(extrude(cab, ghW + 0.03, 0.0), tumble), MATS.glass));
    const ws = box(0.05, (b.H - b.cowlH) * 0.75, ghW * 0.86, MATS.glass, 0, 0, 0);
    ws.position.set((G2[0] + G3[0]) / 2 + 0.02, (b.H + b.cowlH) / 2, 0); ws.rotation.z = -Math.atan2(G3[0] - G2[0], b.H - b.cowlH); g.add(ws);
  } else {
    // roof panel
    const roof = roundedPath([[G1[0] - 0.06, b.H - 0.06], [G1[0] + 0.06, b.H + 0.02], [G2[0] - 0.06, b.H + 0.008], [G2[0] + 0.07, b.H - 0.07]], 0.03);
    g.add(mesh(warp(extrude(roof, ghW + 0.03, 0.03, 2), tumble), mats.roof));
    // side frames with window cut-outs
    const yb = Math.max(G0[1], G3[1]) + 0.07, yt = b.H - 0.085;
    const xr = (y) => lineX(G0, G1, y) + 0.13, xf = (y) => lineX(G3, G2, y) - 0.10;
    const frame = roundedPath([[...G0, 0.05], [...G1, 0.22], [...G2, 0.22], [...G3, 0.05]], 0.1);
    const cuts = [xr(yb), ...[...(b.pillars || [])].sort((p, q) => p - q), xf(yb)];
    for (let i = 0; i < cuts.length - 1; i++) {
      const first = i === 0, last = i === cuts.length - 2;
      const x0 = first ? null : cuts[i] + 0.045, x1 = last ? null : cuts[i + 1] - 0.045;
      const pts = [
        [first ? xr(yb) : x0, yb], [first ? Math.min(xr(yt), (x1 ?? xf(yt)) - 0.05) : x0, yt],
        [last ? Math.max(xf(yt), (x0 ?? xr(yt)) + 0.05) : x1, yt], [last ? xf(yb) : x1, yb],
      ];
      if (pts[3][0] - pts[0][0] < 0.12) continue;
      frame.holes.push(roundedPath(pts, 0.04, THREE.Path));
    }
    for (const s of [-1, 1]) {
      const fg = extrude(frame, 0.03, 0, 1, 8); fg.translate(0, 0, s * (ghW / 2 + 0.012));
      g.add(mesh(warp(fg, tumble), mats.roof));
    }
  }

  // --- dark lower trim --------------------------------------------------
  const zAt = (x, y = 0.5) => { const v = new THREE.Vector3(x, y, W / 2); tumble(v); return v.z; };
  g.add(box(b.wb - b.wheelR * 2 - 0.2, 0.09, W * 0.985, MATS.black, hl - b.fo - b.wb / 2, b.c + 0.03, 0));    // skirts
  g.add(box(0.30, 0.05, W * 0.86, MATS.black, hl - 0.14, b.c + 0.0, 0));                                       // splitter
  g.add(box(0.26, 0.17, W * 0.66, MATS.black, rearX + 0.11, b.c + 0.09, 0));                                   // diffuser

  // --- wheel arches -----------------------------------------------------
  const axF = hl - b.fo, axR = axF - b.wb;
  for (const ax of [axF, axR]) for (const s of [-1, 1]) {
    const a = mesh(new THREE.CylinderGeometry(b.wheelR + 0.075, b.wheelR + 0.075, 0.30, 26), MATS.black, ax, b.wheelR + 0.01, s * (zAt(ax, 0.3) - 0.19));
    a.rotation.x = Math.PI / 2; g.add(a);
    if (b.flare) { const f = new THREE.Mesh(new THREE.TorusGeometry(b.wheelR + 0.10, b.flare + 0.02, 6, 20, Math.PI), mats.paint);
      f.position.set(ax, b.wheelR + 0.01, s * (zAt(ax, 0.6) - 0.02)); g.add(f); }
  }

  // --- front -----------------------------------------------------------
  const fx = hl - 0.03, zh = zAt(hl - 0.2, b.noseH) - 0.30;
  const HL = (w, h, y, z, xo = 0, m = MATS.head) => { for (const s of [-1, 1]) g.add(box(0.14, h, w, m, fx - 0.17 + xo, y, s * (z - 0.05))); };
  const hy = (b.hoodH + b.noseH) / 2 + 0.04;
  switch (b.head) {
    case 'slim': HL(0.46, 0.07, hy + 0.01, zh); HL(0.40, 0.025, hy - 0.06, zh, 0.01); break;
    case 'angular': HL(0.50, 0.09, hy + 0.01, zh); HL(0.20, 0.05, hy - 0.07, zh + 0.14, 0.005); break;
    case 'big': HL(0.42, 0.11, hy + 0.02, zh); HL(0.40, 0.02, hy - 0.10, zh, 0.01); break;
    case 'y': HL(0.44, 0.045, hy + 0.03, zh - 0.02, -0.06); HL(0.16, 0.035, hy - 0.03, zh + 0.12, -0.02); break;
    case 'quad': for (const o of [-0.20, -0.07, 0.06, 0.19]) HL(0.095, 0.075, hy + 0.02, zh + o - 0.02, -0.03); break;
    default: HL(0.42, 0.11, hy, zh);
  }
  const gy = b.noseH - 0.03;
  switch (b.grille) {
    case 'kidney':
      for (const s of [-1, 1]) { g.add(box(0.10, 0.34, 0.30, MATS.black, fx - 0.03, gy + 0.01, s * 0.17)); g.add(box(0.09, 0.38, 0.03, mats.paint, fx - 0.02, gy + 0.01, s * 0.335)); }
      g.add(box(0.1, 0.13, W * 0.24, MATS.black, fx - 0.06, b.c + 0.17, W * 0.3)); g.add(box(0.1, 0.13, W * 0.24, MATS.black, fx - 0.06, b.c + 0.17, -W * 0.3));
      break;
    case 'hex':
      g.add(box(0.10, 0.36, W * 0.44, MATS.black, fx - 0.03, gy - 0.02, 0));
      g.add(box(0.11, 0.025, W * 0.46, MATS.chrome, fx - 0.03, gy + 0.165, 0));
      for (const s of [-1, 1]) g.add(box(0.10, 0.22, W * 0.17, MATS.black, fx - 0.07, b.c + 0.2, s * W * 0.36));
      break;
    case 'chrome':
      g.add(box(0.10, 0.34, W * 0.40, MATS.chrome, fx - 0.03, gy + 0.03, 0));
      for (let i = -5; i <= 5; i++) g.add(box(0.11, 0.30, 0.022, MATS.black, fx - 0.028, gy + 0.03, i * W * 0.034));
      g.add(box(0.03, 0.09, 0.03, MATS.chrome, hl - 0.2, b.hoodH + 0.045, 0)); // hood ornament
      g.add(box(0.10, 0.10, W * 0.7, MATS.black, fx - 0.06, b.c + 0.14, 0)); g.add(box(0.11, 0.02, W * 0.72, MATS.chrome, fx - 0.055, b.c + 0.2, 0));
      break;
    case 'intakes':
      for (const s of [-1, 1]) { const m = box(0.12, 0.17, W * 0.26, MATS.black, fx - 0.06, b.c + 0.17, s * W * 0.29); m.rotation.x = s * 0.25; g.add(m); }
      g.add(box(0.12, 0.08, W * 0.2, MATS.black, fx - 0.05, b.c + 0.13, 0));
      break;
    case 'horseshoe': {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 20, Math.PI), MATS.chrome); t.rotation.y = Math.PI / 2; t.position.set(fx + 0.01, gy + 0.0, 0); g.add(t);
      g.add(box(0.03, 0.2, 0.025, MATS.chrome, fx + 0.01, gy - 0.1, 0.17)); g.add(box(0.03, 0.2, 0.025, MATS.chrome, fx + 0.01, gy - 0.1, -0.17));
      const c = mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.08, 20), MATS.black, fx - 0.035, gy, 0); c.rotation.z = Math.PI / 2; g.add(c);
      g.add(box(0.08, 0.2, 0.33, MATS.black, fx - 0.035, gy - 0.1, 0));
      for (const s of [-1, 1]) g.add(box(0.1, 0.2, W * 0.24, MATS.black, fx - 0.07, b.c + 0.18, s * W * 0.31));
      break; }
    default:
      g.add(box(0.10, 0.12, W * 0.5, MATS.black, fx - 0.03, gy + 0.02, 0)); g.add(box(0.10, 0.12, W * 0.62, MATS.black, fx - 0.05, b.c + 0.15, 0));
  }

  // --- rear ------------------------------------------------------------
  const rx = rearX + 0.03, zt = zAt(rearX + 0.2, b.tailH) - 0.27, ty = b.tailH - 0.13;
  const TL = (w, h, y, z) => { for (const s of [-1, 1]) g.add(box(0.12, h, w, mats.tail, rx + 0.04, y, s * z)); };
  switch (b.tail) {
    case 'L': TL(0.46, 0.055, ty + 0.02, zt); TL(0.07, 0.13, ty - 0.03, zt + 0.19); break;
    case 'bar': g.add(box(0.12, 0.04, W * 0.84, mats.tail, rx + 0.04, ty + 0.02, 0)); TL(0.36, 0.07, ty - 0.035, zt + 0.04); break;
    case 'y': TL(0.42, 0.04, ty + 0.03, zt); TL(0.16, 0.035, ty - 0.03, zt + 0.12); g.add(box(0.1, 0.1, W * 0.5, MATS.black, rx + 0.03, ty, 0)); break;
    default: TL(0.34, 0.14, ty, zt + 0.04);
  }
  g.add(box(0.03, 0.02, 0.3, mats.tail, b.midEngine || b.pillars.length > 1 ? b.roofR - 0.05 : b.baseR + 0.1, b.midEngine || b.pillars.length > 1 ? b.H - 0.04 : b.beltR + 0.03, 0)); // third brake light
  const ex = (z, r, y = b.c + 0.1) => { const m = mesh(new THREE.CylinderGeometry(r, r, 0.14, 12), MATS.chrome, rx + 0.0, y, z); m.rotation.z = Math.PI / 2; g.add(m);
    const k = mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.141, 12), MATS.black, rx - 0.004, y, z); k.rotation.z = Math.PI / 2; g.add(k); };
  switch (b.exhaust) {
    case 'quad': for (const z of [-0.62, -0.47, 0.47, 0.62]) ex(z, 0.055); break;
    case 'oval': for (const s of [-1, 1]) { const m = box(0.14, 0.08, 0.24, MATS.chrome, rx, b.c + 0.1, s * W * 0.3); g.add(m); g.add(box(0.141, 0.055, 0.2, MATS.black, rx - 0.004, b.c + 0.1, s * W * 0.3)); } break;
    case 'center2': ex(-0.12, 0.07, b.c + 0.2); ex(0.12, 0.07, b.c + 0.2); break;
    case 'center1': ex(-0.09, 0.06, b.c + 0.34); ex(0.09, 0.06, b.c + 0.34); ex(0, 0.06, b.c + 0.22); break;
  }
  switch (b.wing) {
    case 'lip': g.add(box(0.12, 0.025, W * 0.78, b.midEngine ? MATS.black : mats.paint, rearX + 0.1, b.tailH + 0.035, 0)); break;
    case 'roof': { const m = box(0.3, 0.03, W * 0.7, mats.paint, b.roofR - 0.2, b.H - 0.02, 0); m.rotation.z = 0.12; g.add(m); break; }
    case 'wing':
      g.add(box(0.34, 0.03, W * 0.92, MATS.black, rearX + 0.24, b.tailH + 0.22, 0));
      for (const s of [-1, 1]) { g.add(box(0.2, 0.2, 0.03, MATS.black, rearX + 0.26, b.tailH + 0.11, s * W * 0.3)); g.add(box(0.36, 0.1, 0.02, mats.paint, rearX + 0.24, b.tailH + 0.24, s * W * 0.46)); }
      break;
  }
  if (b.midEngine) { // engine cover louvres + side intakes
    for (let i = 0; i < 4; i++) { const x = b.roofR - 0.25 - i * 0.24;
      const m = box(0.14, 0.02, W * 0.34, MATS.black, x, lineY(G1, G0, x) + 0.035, 0); m.rotation.z = Math.atan2(G1[1] - G0[1], G1[0] - G0[0]); g.add(m); }
    for (const s of [-1, 1]) { const m = box(0.5, 0.2, 0.06, MATS.black, axR + 0.62, 0.52, s * (zAt(axR + 0.6, 0.5) - 0.01)); g.add(m); }
  }
  if (b.cLine) for (const s of [-1, 1]) { // signature C-shaped side line
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.40, 0.022, 6, 24, Math.PI * 1.25), MATS.chrome);
    t.rotation.z = Math.PI * 0.42; t.scale.set(1.25, 1, 1); t.position.set(-0.28, 0.64, s * (zAt(-0.3, 0.6) - 0.012)); g.add(t);
  }
  if (b.chromeTrim) {
    for (const s of [-1, 1]) g.add(box(b.L * 0.5, 0.025, 0.02, MATS.chrome, (b.cowlX + b.baseR) / 2, belt + 0.01, s * (zAt(0, belt) + 0.003)));
    g.add(box(0.05, 0.03, W * 0.8, MATS.chrome, rearX + 0.02, b.c + 0.28, 0));
  }

  // --- mirrors, plates, handles ------------------------------------------
  for (const s of [-1, 1]) {
    const mz = zAt(b.cowlX - 0.25, b.cowlH) ;
    g.add(box(0.16, 0.10, 0.2, mats.roof === mats.paint ? mats.paint : MATS.black, b.cowlX - 0.3, b.cowlH + 0.07, s * (mz + 0.06)));
    if (detail && !b.midEngine) for (const hx of [b.cowlX - 1.05, b.cowlX - 1.95].slice(0, b.pillars.length ? 2 : 1))
      g.add(box(0.2, 0.025, 0.02, mats.paint, hx, belt - 0.07, s * (zAt(hx, belt - 0.07) + 0.006)));
  }
  g.add(box(0.02, 0.115, 0.52, mats.plate, rearX - 0.002 + (b.midEngine ? 0.02 : 0), b.c + (b.midEngine ? 0.42 : 0.36), 0));
  g.add(box(0.02, 0.115, 0.52, mats.plate, hl + 0.0, b.c + 0.15, 0));

  // indicators: separate meshes toggled at runtime
  const ind = { l: [], r: [] };
  for (const [s, key] of [[-1, 'l'], [1, 'r']]) {
    const a = box(0.06, 0.05, 0.14, MATS.amber, rearX + 0.02, ty - 0.02, s * (zt + 0.2));
    const m = box(0.06, 0.03, 0.03, MATS.amber, b.cowlX - 0.3, b.cowlH + 0.07, s * (zAt(b.cowlX - 0.25, b.cowlH) + 0.17));
    const f = box(0.06, 0.04, 0.12, MATS.amber, hl - 0.06, hy - 0.02, s * (zh + 0.2));
    ind[key].push(a, m, f);
  }
  return { g, ind, axF, axR, zAt };
}
function lineY(a, b, x) { return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }

function assemble(b, mats, detail, sporty) {
  const { g, ind, axF, axR, zAt } = buildBody(b, mats, detail);
  g.rotation.y = Math.PI / 2;
  const holder = new THREE.Group(); holder.add(g);
  const car = new THREE.Group();
  const baked = bake(holder);
  car.add(baked);
  // indicators
  const indHolder = new THREE.Group(); indHolder.rotation.y = Math.PI / 2;
  for (const k of ['l', 'r']) for (const m of ind[k]) { m.visible = false; indHolder.add(m); }
  car.add(indHolder);
  // wheels
  const tw = sporty ? 0.30 : 0.22;
  const wheels = [], front = [];
  for (const [ax, isF] of [[axF, true], [axR, false]]) for (const s of [-1, 1]) {
    const w = buildWheel(b.wheelR, tw, detail, sporty, s);
    const steer = new THREE.Group();
    steer.position.set(s * (zAt(ax, 0.3) - tw * 0.5 - 0.005), b.wheelR, -ax);
    w.rotation.y = Math.PI / 2;             // wheel axis: z -> x
    steer.add(w); car.add(steer); wheels.push(w.userData.spin); if (isF) front.push(steer);
  }
  car.userData = { wheels, front, ind, body: baked, L: b.L, W: b.W, H: b.H, wheelR: b.wheelR };
  return car;
}

/* blob shadow under every car */
let shadowTex;
function shadowMesh(L, W) {
  if (!shadowTex) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 6, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.9)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.7, L * 1.45), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.75, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.renderOrder = 1; m.userData.isShadow = true;
  return m;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */
export function buildPlayerCar(spec, colorIndex = 0) {
  const paint = new THREE.MeshPhysicalMaterial({ color: spec.colors[colorIndex], metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.2 });
  const roof = spec.twoTone ? new THREE.MeshPhysicalMaterial({ color: spec.twoTone[colorIndex], metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 }) : paint;
  const tail = tailProto.clone();
  const mats = { paint, roof, tail, plate: plateMat(spec.id === 'maybach' ? 'S MB 680' : spec.id === 'm3' ? 'M DR 3' : spec.id === 'rs6' ? 'IN RS 6' : spec.id === 'w16' ? 'W 16 SS' : 'A TR ' + spec.sound.cyl) };
  const car = assemble(spec.body, mats, true, true);
  car.add(shadowMesh(spec.body.L, spec.body.W));
  Object.assign(car.userData, { paint, roof, tail, spec });
  return car;
}
export function setCarColor(car, spec, i) {
  car.userData.paint.color.setHex(spec.colors[i]);
  if (spec.twoTone) car.userData.roof.color.setHex(spec.twoTone[i]);
}

function buildTruck() {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.2 });
  const boxM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  const tail = tailProto.clone();
  const L = 16.5, W = 2.55;
  const h = new THREE.Group();
  // coordinates here: z = -forward directly
  const front = -L / 2;
  h.add(box(W, 2.75, 2.2, paint, 0, 2.0, front + 1.1));                 // cab
  h.add(box(W * 0.9, 0.9, 0.06, MATS.glass, 0, 2.55, front - 0.01));     // windscreen
  h.add(box(W * 0.8, 0.5, 0.08, MATS.black, 0, 1.0, front - 0.01));      // grille
  for (const s of [-1, 1]) { h.add(box(0.36, 0.16, 0.08, MATS.head, s * 0.95, 0.72, front - 0.01)); h.add(box(0.1, 0.4, 0.2, MATS.black, s * (W / 2 + 0.12), 2.6, front + 0.3)); }
  h.add(box(W, 0.35, L, MATS.black, 0, 0.78, 0));                        // chassis
  h.add(box(W, 2.75, 13.4, boxM, 0, 2.55, front + 2.5 + 6.7));           // trailer
  h.add(box(W, 0.5, 0.1, MATS.black, 0, 0.55, L / 2));                   // underride bar
  for (const s of [-1, 1]) h.add(box(0.3, 0.14, 0.08, tail, s * 0.95, 0.9, L / 2 + 0.01));
  h.add(box(0.52, 0.115, 0.02, MATS.plate, 0, 0.62, L / 2 + 0.06));
  const baked = bake(h); g.add(baked);
  const wheels = [];
  for (const z of [front + 1.4, front + 5.2, L / 2 - 4.4, L / 2 - 3.1, L / 2 - 1.8]) for (const s of [-1, 1]) {
    const w = buildWheel(0.52, 0.32, false, false, s); w.rotation.y = Math.PI / 2; w.position.set(s * (W / 2 - 0.19), 0.52, z); g.add(w); wheels.push(w.userData.spin);
  }
  const ind = { l: [], r: [] };
  for (const [s, k] of [[-1, 'l'], [1, 'r']]) { const a = box(0.16, 0.14, 0.08, MATS.amber, s * 1.12, 0.9, L / 2 + 0.01); a.visible = false; g.add(a); ind[k].push(a);
    const f = box(0.12, 0.1, 0.08, MATS.amber, s * 1.2, 0.72, front - 0.01); f.visible = false; g.add(f); ind[k].push(f); }
  g.add(shadowMesh(L, W + 0.3));
  g.userData = { wheels, front: [], ind, L, W, H: 4, wheelR: 0.52, paint, boxM, tail, isTruck: true };
  return g;
}

// Traffic factory: prebuilt templates, cheap per-instance clones
export class TrafficFactory {
  constructor() {
    MATS.plate = plateMat('B AB 1234');
    this.templates = {};
  }
  _template(kind) {
    if (this.templates[kind]) return this.templates[kind];
    let t;
    if (kind === 'truck') t = buildTruck();
    else {
      const sport = CARS.find((c) => c.id === kind);
      const b = sport ? sport.body : TRAFFIC_BODIES[kind];
      const paint = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.38 });
      const tail = tailProto.clone();
      t = assemble(b, { paint, roof: paint, tail, plate: MATS.plate }, false, !!sport);
      t.add(shadowMesh(b.L, b.W));
      Object.assign(t.userData, { paint, tail });
    }
    return (this.templates[kind] = t);
  }
  create(kind, rng = Math.random) {
    const t = this._template(kind), u = t.userData;
    const paint = u.paint.clone(), tail = u.tail.clone(), boxM = u.boxM ? u.boxM.clone() : null;
    if (u.isTruck) { paint.color.setHex(TRUCK_COLORS[(rng() * TRUCK_COLORS.length) | 0]); boxM.color.setHex(rng() < 0.5 ? 0xe9e9e6 : TRUCK_COLORS[(rng() * TRUCK_COLORS.length) | 0]); }
    else paint.color.setHex(TRAFFIC_COLORS[(rng() * TRAFFIC_COLORS.length) | 0]);
    // Object3D.clone() deep-copies userData through JSON, which would serialise
    // every mesh we keep handles to, so stash the handles while cloning.
    const stash = []; t.traverse((o) => { stash.push([o, o.userData]); o.userData = {}; });
    const car = t.clone(true);
    for (const [o, d] of stash) o.userData = d;
    const wheels = [], ind = { l: [], r: [] };
    car.traverse((o) => {
      if (o.isMesh) {
        if (o.material === u.paint) o.material = paint; else if (o.material === u.tail) o.material = tail; else if (boxM && o.material === u.boxM) o.material = boxM;
      }
    });
    // re-link runtime handles (clone() keeps structure/order)
    const find = (src, dst, target) => { if (src === target) return dst; for (let i = 0; i < src.children.length; i++) { const r = find(src.children[i], dst.children[i], target); if (r) return r; } return null; };
    for (const w of u.wheels) wheels.push(find(t, car, w));
    for (const k of ['l', 'r']) for (const m of u.ind[k]) ind[k].push(find(t, car, m));
    car.userData = { ...u, paint, tail, boxM, wheels, ind, front: [] };
    return car;
  }
}
export const TRAFFIC_KINDS = ['compact', 'sedan', 'wagon', 'suv', 'van'];
