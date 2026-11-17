// Procedural car models + specs. All cars are original low-poly designs
// "in the spirit of" famous German/Italian/French performance cars.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CARS } from './specs.js';

/* ------------------------------------------------------------------ */
/* Player car specs                                                    */
/* ------------------------------------------------------------------ */
export { CARS };

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
// more everyday cars: small city car, hatchback, people carrier, crossover, minibus, coupe
const NONE = { wing: 'none', exhaust: 'none', flare: 0 };
Object.assign(TRAFFIC_BODIES, {
  city: { L: 3.65, W: 1.68, H: 1.53, c: 0.15, wheelR: 0.29, wb: 2.42, fo: 0.68, hoodH: 0.82, noseH: 0.56, cowlH: 0.97, cowlX: 0.74,
    roofF: 0.22, roofR: -1.42, baseR: -1.76, beltR: 0.99, deckH: 0.97, tailH: 0.96, pillars: [-0.42], grille: 'plain', head: 'big', tail: 'L', ...NONE },
  hatch: { L: 4.28, W: 1.8, H: 1.46, c: 0.15, wheelR: 0.32, wb: 2.64, fo: 0.86, hoodH: 0.86, noseH: 0.56, cowlH: 0.98, cowlX: 0.8,
    roofF: 0.18, roofR: -1.58, baseR: -2.02, beltR: 1.0, deckH: 0.98, tailH: 0.97, pillars: [-0.32], grille: 'vw', head: 'slim', tail: 'plain', ...NONE },
  mpv: { L: 4.55, W: 1.86, H: 1.68, c: 0.17, wheelR: 0.33, wb: 2.8, fo: 0.9, hoodH: 0.92, noseH: 0.6, cowlH: 1.05, cowlX: 1.0,
    roofF: 0.5, roofR: -1.98, baseR: -2.22, beltR: 1.08, deckH: 1.06, tailH: 1.04, pillars: [-0.2, -1.25], grille: 'plain', head: 'angular', tail: 'L', ...NONE },
  crossover: { L: 4.42, W: 1.86, H: 1.6, c: 0.21, wheelR: 0.35, wb: 2.68, fo: 0.88, hoodH: 0.98, noseH: 0.68, cowlH: 1.1, cowlX: 0.78,
    roofF: 0.15, roofR: -1.62, baseR: -2.06, beltR: 1.12, deckH: 1.1, tailH: 1.06, pillars: [-0.38], grille: 'hex', head: 'slim', tail: 'bar', ...NONE, flare: 0.02 },
  bus: { L: 4.95, W: 1.92, H: 1.96, c: 0.18, wheelR: 0.34, wb: 3.0, fo: 0.82, hoodH: 1.0, noseH: 0.72, cowlH: 1.12, cowlX: 1.6,
    roofF: 1.2, roofR: -2.36, baseR: -2.44, beltR: 1.14, deckH: 1.12, tailH: 1.1, pillars: [0.55, -0.45, -1.45], grille: 'vw', head: 'plain', tail: 'L', ...NONE },
  coupe: { L: 4.6, W: 1.84, H: 1.37, c: 0.15, wheelR: 0.33, wb: 2.76, fo: 0.9, hoodH: 0.82, noseH: 0.54, cowlH: 0.95, cowlX: 0.72,
    roofF: -0.02, roofR: -1.02, baseR: -1.78, beltR: 0.98, deckH: 0.96, tailH: 0.92, pillars: [], grille: 'plain', head: 'angular', tail: 'L', ...NONE },
});
TRAFFIC_BODIES.sedan.head = 'slim'; TRAFFIC_BODIES.wagon.tail = 'bar'; TRAFFIC_BODIES.suv.head = 'angular'; TRAFFIC_BODIES.suv.grille = 'hex';
export const TRAFFIC_COLORS = [0xd8d8da, 0xd8d8da, 0x9a9ea3, 0x9a9ea3, 0x18181b, 0x18181b, 0x2a2d33, 0x1d3f7a, 0x8a1c1c, 0xf2f2f2, 0x4a5a48, 0x6b4a2e, 0xb8a888, 0x2a6a8a];
const TRUCK_COLORS = [0xf0f0f0, 0xd22b2b, 0x1b4fa8, 0xf2b600, 0x2e7d4a, 0x30343a, 0xe8660c];

/* ------------------------------------------------------------------ */
/* Shared materials                                                    */
/* ------------------------------------------------------------------ */
export const MATS = {
  glass: new THREE.MeshPhysicalMaterial({ color: 0x080b0f, metalness: 0.45, roughness: 0.14, clearcoat: 0.35, envMapIntensity: 0.75 }),
  lampHouse: new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.1, metalness: 0.6 }),
  wellLiner: new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.95, side: THREE.DoubleSide }),
  tailHouse: new THREE.MeshStandardMaterial({ color: 0x2a0406, roughness: 0.1, metalness: 0.3 }),
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
    if (r <= 0) { if (i === 0) s.moveTo(p[0], p[1]); else s.lineTo(p[0], p[1]); continue; }   // sharp corner: no duplicate points (they break bevels)
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
function buildWheel(r, w, detail, sporty, side, rimMat = MATS.rim) {
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
  const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.022, 6, 28), rimMat); ring.position.z = face; g.add(ring);
  const n = sporty ? 10 : 5;
  const spin = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const s = box(rr * 0.98, sporty ? 0.035 : 0.075, 0.03, rimMat, 0, 0, 0);
    const a = (i / n) * Math.PI * 2 + (sporty && i % 2 ? 0.16 : 0);
    s.position.set(Math.cos(a) * rr * 0.5, Math.sin(a) * rr * 0.5, face + side * 0.005); s.rotation.z = a; spin.add(s);
  }
  spin.add(cyl(rr * 0.2, 0.05, rimMat, face + side * 0.01, 12));
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
const ARCH_GAP = 0.075;
// points of an arch opening (front to rear) in the side profile, from the sill line y0 up and over the wheel
function archPts(ax, cy, ra, y0) {
  const a0 = Math.asin(Math.max(-1, Math.min(1, (y0 - cy) / ra))), pts = [], n = 14;
  pts.push([ax + ra * Math.cos(a0) + 0.04, y0, 0.03]);
  for (let i = 0; i <= n; i++) { const a = a0 + (Math.PI - 2 * a0) * i / n; pts.push([ax + ra * Math.cos(a), cy + ra * Math.sin(a), 0]); }
  pts.push([ax - ra * Math.cos(a0) - 0.04, y0, 0.03]);
  return pts;
}
function buildBody(b, mats, detail, cabin = false) {
  const CH = mats.chrome || MATS.chrome;
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
    [b.baseR, b.beltR, 0.25],
    // cockpit version: the body is hollow where the cabin is, so the driver sees the dashboard, not the top of a solid block
    ...(cabin ? [[b.baseR + 0.12, 0.3, 0.05], [b.cowlX - 0.1, 0.3, 0.05]] : []),
    [b.cowlX, b.cowlH, 0.35],
    [hl - 0.28, b.hoodH, 0.30], [hl, b.noseH, 0.12], [hl - 0.04, b.c + 0.05, 0.08], [hl - 0.25, b.c, 0.05],
    // wheel arches cut out of the side, so the tyres sit in an opening instead of passing through the paint
    ...[hl - b.fo, hl - b.fo - b.wb].flatMap((ax) => archPts(ax, b.wheelR + 0.01, b.wheelR + ARCH_GAP, b.c)),
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
    g.add(mesh(warp(extrude(roof, ghW + 0.03, 0.03, 2), tumble), cabin ? MATS.black : mats.roof));
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
      g.add(mesh(warp(fg, tumble), cabin ? MATS.black : mats.roof));
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
    // dark wheel well behind the opening: its outer cap sits just inside the tyre's inner edge
    const z0 = zAt(ax, 0.3) - 0.34, dep = 0.30;
    const a = mesh(new THREE.CylinderGeometry(b.wheelR + ARCH_GAP, b.wheelR + ARCH_GAP, dep, 26), MATS.black, ax, b.wheelR + 0.01, s * (z0 - dep / 2));
    a.rotation.x = Math.PI / 2; g.add(a);
    // half-tube liner over the top of the tyre so the opening does not show daylight
    const ln = new THREE.Mesh(new THREE.CylinderGeometry(b.wheelR + ARCH_GAP - 0.005, b.wheelR + ARCH_GAP - 0.005, zAt(ax, 0.3) - z0 + 0.02, 22, 1, true, Math.PI / 2 - 0.2, Math.PI + 0.4), MATS.wellLiner);
    ln.rotation.x = Math.PI / 2; ln.position.set(ax, b.wheelR + 0.01, s * (zAt(ax, 0.3) + z0) / 2); g.add(ln);
    if (b.flare) { const f = new THREE.Mesh(new THREE.TorusGeometry(b.wheelR + ARCH_GAP + 0.01, b.flare * 0.35 + 0.01, 8, 28, Math.PI + 0.3), mats.paint);
      f.rotation.z = -0.15; f.scale.z = 0.45; f.position.set(ax, b.wheelR + 0.01, s * (zAt(ax, 0.6) - 0.01)); g.add(f); }
  }

  // --- front -----------------------------------------------------------
  const fx = hl - 0.03, zh = zAt(hl - 0.2, b.noseH) - 0.30;
  const HL = (w, h, y, z, xo = 0, m = MATS.head) => { for (const s of [-1, 1]) {
    g.add(box(0.13, h + 0.03, w + 0.04, MATS.lampHouse, fx - 0.18 + xo, y, s * (z - 0.05)));
    g.add(box(0.14, Math.max(0.014, h * 0.32), w * 0.9, m, fx - 0.17 + xo, y + h * 0.22, s * (z - 0.05)));
    g.add(box(0.14, Math.max(0.01, h * 0.18), w * 0.35, m, fx - 0.172 + xo, y - h * 0.18, s * (z - 0.05 + w * 0.22))); } };
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
      for (const s of [-1, 1]) {
        g.add(box(0.095, 0.36, 0.3, CH, fx - 0.035, gy + 0.01, s * 0.17));                      // frame
        g.add(box(0.1, 0.32, 0.26, MATS.black, fx - 0.03, gy + 0.01, s * 0.17));                // mesh
        for (let k = -2; k <= 2; k++) g.add(box(0.102, 0.3, 0.012, MATS.lampHouse, fx - 0.028, gy + 0.01, s * 0.17 + k * 0.05));
      }
      g.add(box(0.1, 0.13, W * 0.24, MATS.black, fx - 0.06, b.c + 0.17, W * 0.3)); g.add(box(0.1, 0.13, W * 0.24, MATS.black, fx - 0.06, b.c + 0.17, -W * 0.3));
      break;
    case 'hex':
      g.add(box(0.10, 0.36, W * 0.44, MATS.black, fx - 0.03, gy - 0.02, 0));
      g.add(box(0.11, 0.025, W * 0.46, CH, fx - 0.03, gy + 0.165, 0));
      for (const s of [-1, 1]) g.add(box(0.10, 0.22, W * 0.17, MATS.black, fx - 0.07, b.c + 0.2, s * W * 0.36));
      break;
    case 'chrome':
      g.add(box(0.10, 0.34, W * 0.40, CH, fx - 0.03, gy + 0.03, 0));
      for (let i = -5; i <= 5; i++) g.add(box(0.11, 0.30, 0.022, MATS.black, fx - 0.028, gy + 0.03, i * W * 0.034));
      g.add(box(0.03, 0.09, 0.03, CH, hl - 0.2, b.hoodH + 0.045, 0)); // hood ornament
      g.add(box(0.10, 0.10, W * 0.7, MATS.black, fx - 0.06, b.c + 0.14, 0)); g.add(box(0.11, 0.02, W * 0.72, CH, fx - 0.055, b.c + 0.2, 0));
      break;
    case 'intakes':
      for (const s of [-1, 1]) { const m = box(0.12, 0.17, W * 0.26, MATS.black, fx - 0.06, b.c + 0.17, s * W * 0.29); m.rotation.x = s * 0.25; g.add(m); }
      g.add(box(0.12, 0.08, W * 0.2, MATS.black, fx - 0.05, b.c + 0.13, 0));
      break;
    case 'horseshoe': {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 20, Math.PI), CH); t.rotation.y = Math.PI / 2; t.position.set(fx + 0.01, gy + 0.0, 0); g.add(t);
      g.add(box(0.03, 0.2, 0.025, CH, fx + 0.01, gy - 0.1, 0.17)); g.add(box(0.03, 0.2, 0.025, CH, fx + 0.01, gy - 0.1, -0.17));
      const c = mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.08, 20), MATS.black, fx - 0.035, gy, 0); c.rotation.z = Math.PI / 2; g.add(c);
      g.add(box(0.08, 0.2, 0.33, MATS.black, fx - 0.035, gy - 0.1, 0));
      for (const s of [-1, 1]) g.add(box(0.1, 0.2, W * 0.24, MATS.black, fx - 0.07, b.c + 0.18, s * W * 0.31));
      break; }
    case 'vw':
      g.add(box(0.10, 0.07, W * 0.62, MATS.black, fx - 0.03, gy + 0.06, 0));
      g.add(box(0.105, 0.012, W * 0.64, mats.accent || CH, fx - 0.028, gy + 0.02, 0));
      g.add(box(0.11, 0.2, W * 0.7, MATS.black, fx - 0.05, b.c + 0.17, 0));
      for (const s of [-1, 1]) g.add(box(0.1, 0.12, 0.2, MATS.black, fx - 0.06, b.c + 0.16, s * W * 0.42));
      break;
    default:
      g.add(box(0.10, 0.12, W * 0.5, MATS.black, fx - 0.03, gy + 0.02, 0)); g.add(box(0.10, 0.12, W * 0.62, MATS.black, fx - 0.05, b.c + 0.15, 0));
  }

  // --- rear ------------------------------------------------------------
  const rx = rearX + 0.03, zt = zAt(rearX + 0.2, b.tailH) - 0.27, ty = b.tailH - 0.13;
  const TL = (w, h, y, z) => { for (const s of [-1, 1]) { g.add(box(0.12, h + 0.025, w + 0.03, MATS.tailHouse, rx + 0.035, y, s * z)); g.add(box(0.122, Math.max(0.012, h * 0.45), w * 0.92, mats.tail, rx + 0.04, y + h * 0.1, s * z)); } };
  switch (b.tail) {
    case 'L': TL(0.46, 0.055, ty + 0.02, zt); TL(0.07, 0.13, ty - 0.03, zt + 0.19); break;
    case 'bar': g.add(box(0.118, 0.04, W * 0.86, MATS.tailHouse, rx + 0.035, ty + 0.02, 0)); g.add(box(0.12, 0.014, W * 0.84, mats.tail, rx + 0.04, ty + 0.02, 0)); TL(0.36, 0.07, ty - 0.035, zt + 0.04); break;
    case 'y': TL(0.42, 0.04, ty + 0.03, zt); TL(0.16, 0.035, ty - 0.03, zt + 0.12); g.add(box(0.1, 0.1, W * 0.5, MATS.black, rx + 0.03, ty, 0)); break;
    default: TL(0.34, 0.14, ty, zt + 0.04);
  }
  g.add(box(0.03, 0.02, 0.3, mats.tail, b.midEngine || b.pillars.length > 1 ? b.roofR - 0.05 : b.baseR + 0.1, b.midEngine || b.pillars.length > 1 ? b.H - 0.04 : b.beltR + 0.03, 0)); // third brake light
  const ex = (z, r, y = b.c + 0.1) => { const m = mesh(new THREE.CylinderGeometry(r, r, 0.14, 12), CH, rx + 0.0, y, z); m.rotation.z = Math.PI / 2; g.add(m);
    const k = mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.141, 12), MATS.black, rx - 0.004, y, z); k.rotation.z = Math.PI / 2; g.add(k); };
  switch (b.exhaust) {
    case 'quad': for (const z of [-0.62, -0.47, 0.47, 0.62]) ex(z, 0.055); break;
    case 'oval': for (const s of [-1, 1]) { const m = box(0.14, 0.08, 0.24, CH, rx, b.c + 0.1, s * W * 0.3); g.add(m); g.add(box(0.141, 0.055, 0.2, MATS.black, rx - 0.004, b.c + 0.1, s * W * 0.3)); } break;
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
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.40, 0.011, 6, 32, Math.PI * 1.25), CH);
    t.rotation.z = Math.PI * 0.42; t.scale.set(1.25, 1, 0.5); t.position.set(-0.28, 0.64, s * (zAt(-0.3, 0.6) - 0.006)); g.add(t);
  }
  if (b.chromeTrim) {
    for (const s of [-1, 1]) g.add(box(b.L * 0.5, 0.025, 0.02, CH, (b.cowlX + b.baseR) / 2, belt + 0.01, s * (zAt(0, belt) + 0.003)));
    g.add(box(0.05, 0.03, W * 0.8, CH, rearX + 0.02, b.c + 0.28, 0));
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
  if (sporty && detail) { // the player car also gets a hollow-cabin body for the cockpit view
    const cb = buildBody(b, mats, detail, true).g; cb.rotation.y = Math.PI / 2; const h = new THREE.Group(); h.add(cb); mats.cabinBody = bake(h); mats.cabinBody.visible = false;
  }
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
    const w = buildWheel(b.wheelR, tw, detail, sporty, s, mats.rim);
    const steer = new THREE.Group();
    steer.position.set(s * (zAt(ax, 0.3) - tw * 0.5 - 0.005), b.wheelR, -ax);
    w.rotation.y = Math.PI / 2;             // wheel axis: z -> x
    steer.add(w); car.add(steer); wheels.push(w.userData.spin); if (isF) front.push(steer);
  }
  if (mats.cabinBody) car.add(mats.cabinBody);
  car.userData = { wheels, front, ind, body: baked, cabinBody: mats.cabinBody || null, L: b.L, W: b.W, H: b.H, wheelR: b.wheelR };
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
const RIM_BLACK = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.35, metalness: 0.7 });
const CHROME_BLACK = new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.2, metalness: 0.9 });
function paintFinish(m, spec, i) {
  const matte = spec.matte && spec.matte[i];
  m.roughness = matte ? 0.62 : 0.32; m.clearcoat = matte ? 0 : 1; m.metalness = matte ? 0.25 : 0.55; m.needsUpdate = true;
}
export function buildPlayerCar(spec, colorIndex = 0) {
  const paint = new THREE.MeshPhysicalMaterial({ color: spec.colors[colorIndex], metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.2 });
  paintFinish(paint, spec, colorIndex);
  const roof = spec.twoTone ? new THREE.MeshPhysicalMaterial({ color: spec.twoTone[colorIndex], metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 }) : paint;
  const tail = tailProto.clone();
  const plates = { maybach: 'S MB 680', m3: 'M DR 3', rs6: 'IN RS 6', w16: 'W 16 SS', r6: 'WOB R 600', m5b: 'M BK 750' };
  const mats = { paint, roof, tail, plate: plateMat(plates[spec.id] || 'A TR ' + spec.sound.cyl),
    rim: spec.blackWheels ? RIM_BLACK : MATS.rim, chrome: spec.blackout ? CHROME_BLACK : null,
    accent: spec.id === 'r6' ? new THREE.MeshStandardMaterial({ color: 0x2a6cff, emissive: 0x0a2050, roughness: 0.4 }) : null };
  const car = assemble(spec.body, mats, true, true);
  car.add(shadowMesh(spec.body.L, spec.body.W));
  Object.assign(car.userData, { paint, roof, tail, spec });
  return car;
}
export function setCarColor(car, spec, i) {
  car.userData.paint.color.setHex(spec.colors[i]); paintFinish(car.userData.paint, spec, i);
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
// Autobahnpolizei estate: silver with blue and yellow livery, roof light bar
function textTex(text, color, w = 512, h = 96) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = color; g.font = `bold ${h * 0.78}px "DIN Alternate","Bahnschrift","Arial Narrow",Arial,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h * 0.55);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// German Autobahnpolizei in the blue-silver design: silver car, blue lower
// body with a slanted leading edge, a neon-yellow reflective stripe, white
// POLIZEI on the doors, blue POLIZEI on the bonnet, roof ID number, slim LED
// light bar with a rear message display ("POLIZEI" / "BITTE FOLGEN").
// Built on an upgraded RS-Sechs Avant (lowered, wider arches, carbon aero).
export const POLICE_SIGN = (() => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 40; const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  let last = null;
  const draw = (msg) => { if (msg === last) return; last = msg; g.fillStyle = '#080404'; g.fillRect(0, 0, 256, 40);
    if (msg) { g.fillStyle = '#ff3a1a'; g.font = 'bold 28px "DIN Alternate","Bahnschrift","Arial Narrow",Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(msg, 128, 22); }
    g.fillStyle = 'rgba(0,0,0,0.55)'; for (let x = 0; x < 256; x += 3) g.fillRect(x, 0, 1, 40); for (let y = 0; y < 40; y += 3) g.fillRect(0, y, 256, 1);
    t.needsUpdate = true; };
  draw('POLIZEI'); return { texture: t, draw };
})();
function liveryTexture(frontAtLeft, b, len, y0, y1) {
  const W = 1024, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const X = (f) => (frontAtLeft ? f : 1 - f) * W, Y = (y) => (y1 - y) / (y1 - y0) * H;
  const top = Y(0.66), poly = (pts, fill) => { g.fillStyle = fill; g.beginPath(); pts.forEach(([f, y], k) => (k ? g.lineTo(X(f), y) : g.moveTo(X(f), y))); g.closePath(); g.fill(); };
  // blue lower body, leading edge slanting back like the real design
  const blue = g.createLinearGradient(0, top, 0, H); blue.addColorStop(0, '#1f4aa8'); blue.addColorStop(1, '#16367c');
  poly([[0.16, H], [0.25, top], [1, top], [1, H]], blue);
  // neon-yellow reflective stripe just above the blue, and a thin one inside it
  poly([[0.245, top - 6], [0.255, top - 20], [1, top - 20], [1, top - 6]], '#d6f000');
  poly([[0.19, H - 26], [0.195, H - 34], [1, H - 34], [1, H - 26]], 'rgba(214,240,0,0.9)');
  // white POLIZEI on the front doors
  g.fillStyle = '#ffffff'; g.font = `bold ${Math.round((H - top) * 0.38)}px "DIN Alternate","Bahnschrift","Arial Narrow",Arial,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('POLIZEI', X(0.43), top + (H - top) * 0.42);
  // keep the wheel arches clear
  g.globalCompositeOperation = 'destination-out';
  const hl = b.L / 2, front = -hl * 0.97;
  for (const ax of [hl - b.fo, hl - b.fo - b.wb]) { const f = (-ax - front) / len, r = b.wheelR + 0.1;
    g.beginPath(); g.ellipse(X(f), Y(b.wheelR + 0.01), r / len * W, r / (y1 - y0) * H, 0, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function buildPolice() {
  const rs6 = CARS.find((c) => c.id === 'rs6').body;
  const b = { ...rs6, c: 0.13, wheelR: 0.375, flare: 0.075, H: rs6.H - 0.03 };
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xc9cdd2, metalness: 0.65, roughness: 0.28, clearcoat: 1 });
  const tail = tailProto.clone();
  const car = assemble(b, { paint, roof: paint, tail, plate: plateMat('NRW 4-1729') }, false, true);
  const blueA = new THREE.MeshStandardMaterial({ color: 0x0a2aff, emissive: 0x2050ff, emissiveIntensity: 0.2, roughness: 0.3, transparent: true, opacity: 0.95 });
  const blueB = blueA.clone();
  const L = b.L, W = b.W, hl = L / 2, roofZ = -(b.roofF + b.roofR) / 2;
  // side livery, bent to follow the body's plan-view taper
  const y0 = 0.3, y1 = 0.92, z0 = -hl * 0.97, z1 = hl * 0.97, len = z1 - z0;
  const taper = (xb) => { const t = Math.min(1, Math.abs(xb) / hl); return 1 - (xb > 0 ? 0.20 : 0.13) * Math.pow(t, xb > 0 ? 3.2 : 4) - (b.midEngine && xb > 0 ? 0.06 * t * t : 0); };
  for (const sd of [-1, 1]) {
    const nu = 24, nv = 4, pos = [], uv = [], idx = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const z = z0 + len * i / nu, y = y0 + (y1 - y0) * j / nv, tuck = y < 0.42 ? 1 - 0.05 * (0.42 - y) / 0.42 : 1;
      pos.push(sd * (W / 2 * taper(-z) * tuck + 0.008), y, z); uv.push(sd < 0 ? i / nu : 1 - i / nu, j / nv);
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, bq = a + nv + 1; idx.push(a, bq, a + 1, bq, bq + 1, a + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    car.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: liveryTexture(sd < 0, b, len, y0, y1), transparent: true, roughness: 0.35, metalness: 0.2, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false })));
  }
  // bonnet lettering, tailgate band, roof number
  const hood = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.2), new THREE.MeshStandardMaterial({ map: textTex('POLIZEI', '#1f4aa8'), transparent: true, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 }));
  hood.rotation.x = -Math.PI / 2 + 0.12; hood.position.set(0, b.hoodH + 0.02, -(hl - 0.5)); car.add(hood);
  const band = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d');
    g.fillStyle = '#1f4aa8'; g.fillRect(0, 16, 512, 80); g.fillStyle = '#d6f000'; g.fillRect(0, 4, 512, 8);
    g.fillStyle = '#fff'; g.font = 'bold 52px "DIN Alternate","Bahnschrift","Arial Narrow",Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('POLIZEI', 256, 58);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.74, 0.14), new THREE.MeshStandardMaterial({ map: band, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 }));
  back.position.set(0, b.tailH - 0.3, hl + 0.012); car.add(back);
  const roofNo = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshStandardMaterial({ map: textTex('14-2', '#13306e', 256, 128), transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }));
  roofNo.rotation.set(-Math.PI / 2, 0, Math.PI); roofNo.position.set(0, b.H + 0.018, roofZ + 0.35); car.add(roofNo);
  // slim LED light bar: blue ends, rear message display
  car.add(box(1.18, 0.06, 0.26, MATS.black, 0, b.H + 0.045, roofZ - 0.2));
  car.add(box(0.36, 0.07, 0.24, blueA, -0.4, b.H + 0.06, roofZ - 0.2), box(0.36, 0.07, 0.24, blueB, 0.4, b.H + 0.06, roofZ - 0.2));
  car.add(box(0.42, 0.07, 0.22, new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.3, metalness: 0.4 }), 0, b.H + 0.06, roofZ - 0.2));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.062), new THREE.MeshBasicMaterial({ map: POLICE_SIGN.texture, toneMapped: false })); sign.position.set(0, b.H + 0.062, roofZ - 0.2 + 0.112); car.add(sign);
  // flashers in the grille and the front bumper
  car.add(box(0.12, 0.04, 0.03, blueA, -0.3, b.noseH - 0.02, -hl - 0.01), box(0.12, 0.04, 0.03, blueB, 0.3, b.noseH - 0.02, -hl - 0.01));
  car.add(box(0.08, 0.03, 0.02, blueB, -0.6, b.c + 0.2, -hl + 0.02), box(0.08, 0.03, 0.02, blueA, 0.6, b.c + 0.2, -hl + 0.02));
  // carbon splitter, skirts, roof spoiler, diffuser fins
  const carbon = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.3, metalness: 0.4 });
  car.add(box(W * 0.92, 0.035, 0.32, carbon, 0, b.c + 0.0, -hl + 0.12));
  for (const sd of [-1, 1]) car.add(box(0.07, 0.07, b.wb * 0.62, carbon, sd * (W / 2 - 0.02), b.c + 0.05, -(hl - b.fo - b.wb / 2)));
  for (const x of [-0.3, -0.1, 0.1, 0.3]) car.add(box(0.025, 0.12, 0.3, carbon, x, b.c + 0.08, hl - 0.1));
  car.add(shadowMesh(L, W));
  Object.assign(car.userData, { paint, tail, blue: [blueA, blueB], isPolice: true });
  return car;
}

export class TrafficFactory {
  constructor() {
    MATS.plate = plateMat('B AB 1234');
    this.templates = {};
  }
  _template(kind) {
    if (this.templates[kind]) return this.templates[kind];
    let t;
    if (kind === 'truck') t = buildTruck();
    else if (kind === 'police') t = buildPolice();
    else {
      const sport = CARS.find((c) => c.id === kind);
      const b = sport ? sport.body : TRAFFIC_BODIES[kind];
      const paint = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.38 });
      const tail = tailProto.clone();
      t = assemble(b, { paint, roof: paint, tail, plate: MATS.plate, rim: sport?.blackWheels ? RIM_BLACK : undefined, chrome: sport?.blackout ? CHROME_BLACK : null }, false, !!sport);
      if (sport) t.userData.colors = sport.colors;
      t.add(shadowMesh(b.L, b.W));
      Object.assign(t.userData, { paint, tail });
    }
    return (this.templates[kind] = t);
  }
  create(kind, rng = Math.random) {
    const t = this._template(kind), u = t.userData;
    const paint = u.paint.clone(), tail = u.tail.clone(), boxM = u.boxM ? u.boxM.clone() : null;
    if (u.isTruck) { paint.color.setHex(TRUCK_COLORS[(rng() * TRUCK_COLORS.length) | 0]); boxM.color.setHex(rng() < 0.5 ? 0xe9e9e6 : TRUCK_COLORS[(rng() * TRUCK_COLORS.length) | 0]); }
    else if (u.colors) paint.color.setHex(u.colors[(rng() * u.colors.length) | 0]);
    else if (!u.isPolice) paint.color.setHex(TRAFFIC_COLORS[(rng() * TRAFFIC_COLORS.length) | 0]);
    const blue = u.blue ? u.blue.map((m) => m.clone()) : null;
    // Object3D.clone() deep-copies userData through JSON, which would serialise
    // every mesh we keep handles to, so stash the handles while cloning.
    const stash = []; t.traverse((o) => { stash.push([o, o.userData]); o.userData = {}; });
    const car = t.clone(true);
    for (const [o, d] of stash) o.userData = d;
    const wheels = [], ind = { l: [], r: [] };
    car.traverse((o) => {
      if (o.isMesh) {
        if (o.material === u.paint) o.material = paint; else if (o.material === u.tail) o.material = tail; else if (boxM && o.material === u.boxM) o.material = boxM;
        else if (blue) { const i = u.blue.indexOf(o.material); if (i >= 0) o.material = blue[i]; }
      }
    });
    // re-link runtime handles (clone() keeps structure/order)
    const find = (src, dst, target) => { if (src === target) return dst; for (let i = 0; i < src.children.length; i++) { const r = find(src.children[i], dst.children[i], target); if (r) return r; } return null; };
    for (const w of u.wheels) wheels.push(find(t, car, w));
    for (const k of ['l', 'r']) for (const m of u.ind[k]) ind[k].push(find(t, car, m));
    car.userData = { ...u, paint, tail, boxM, blue, wheels, ind, front: [] };
    return car;
  }
}
export const TRAFFIC_KINDS = ['compact', 'sedan', 'wagon', 'suv', 'van', 'city', 'hatch', 'mpv', 'crossover', 'bus', 'coupe'];
// how common each everyday car is (vans and trucks are picked separately)
export const EVERYDAY = [['hatch', 4], ['sedan', 3], ['wagon', 3], ['compact', 2], ['suv', 2], ['crossover', 3], ['city', 1.5], ['mpv', 1.2], ['coupe', 0.8], ['bus', 0.7]];
