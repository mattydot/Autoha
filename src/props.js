// Roadside props: roadworks equipment, accident scenes, spill decals.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const FONT = '"DIN Alternate","Bahnschrift","DIN Condensed","Roboto Condensed","Arial Narrow",Arial,sans-serif';
function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const stripes = (g, w, h, a, b, n, ang = 1) => { g.fillStyle = a; g.fillRect(0, 0, w, h); g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip(); g.fillStyle = b;
  const step = (w + h) / n; for (let i = -n; i < n * 2; i += 2) { g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step + step, 0); g.lineTo(i * step + step - h * ang, h); g.lineTo(i * step - h * ang, h); g.fill(); } g.restore(); };

export const PM = {
  yellow: new THREE.MeshStandardMaterial({ color: 0xf2b705, roughness: 0.55, metalness: 0.1 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.6 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1d1e21, roughness: 0.8 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x8d9298, roughness: 0.45, metalness: 0.8 }),
  tank: new THREE.MeshStandardMaterial({ color: 0xd9dcdf, roughness: 0.25, metalness: 0.9 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.7 }),
  red: new THREE.MeshStandardMaterial({ color: 0xc3141a, roughness: 0.55 }),
  gravel: new THREE.MeshLambertMaterial({ color: 0x8a8378, flatShading: true }),
  concrete: new THREE.MeshStandardMaterial({ color: 0xb9b6ae, roughness: 0.95 }),
  lampOff: new THREE.MeshStandardMaterial({ color: 0x6a5300, roughness: 0.4 }),
  lampOn: new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffb300, emissiveIntensity: 6, roughness: 0.4 }),
  lampDim: new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffa000, emissiveIntensity: 0.6, roughness: 0.4 }),
  yellowLine: new THREE.MeshBasicMaterial({ color: 0xf2c200, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  vest: new THREE.MeshStandardMaterial({ color: 0xff7a00, emissive: 0x401800, roughness: 0.6 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc89878, roughness: 0.8 }),
  jeans: new THREE.MeshStandardMaterial({ color: 0x2b3a55, roughness: 0.9 }),
};
PM.bake = new THREE.MeshStandardMaterial({ map: tex(64, 256, (g, w, h) => stripes(g, w, h, '#f4f4f2', '#d0121a', 7, -0.6)), roughness: 0.6 });
PM.board = new THREE.MeshStandardMaterial({ map: tex(256, 256, (g, w, h) => {
  stripes(g, w, h, '#f4f4f2', '#d0121a', 9, 1);
  g.fillStyle = '#111'; g.beginPath(); g.arc(128, 128, 70, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.save(); g.translate(128, 128); g.rotate(Math.PI * 0.75); g.fillRect(-12, -44, 24, 70); g.beginPath(); g.moveTo(-34, -30); g.lineTo(0, -64); g.lineTo(34, -30); g.fill(); g.restore();
}), roughness: 0.6 });

const B = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const C = (r1, r2, h, mat, x = 0, y = 0, z = 0, seg = 12) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); m.position.set(x, y, z); return m; };
function wheel(r, w, x, y, z) { const m = C(r, r, w, PM.dark, x, y, z, 14); m.rotation.z = Math.PI / 2; return m; }

/* -------- Leitbaken (barrier beacons) along a line, as instanced meshes -------- */
const bakeBoard = new THREE.BoxGeometry(0.07, 1.25, 0.32); bakeBoard.translate(0, 0.86, 0);
const bakeFoot = new THREE.BoxGeometry(0.5, 0.14, 0.7); bakeFoot.translate(0, 0.07, 0);
const bakeLamp = new THREE.CylinderGeometry(0.09, 0.09, 0.07, 10); bakeLamp.rotateZ(Math.PI / 2); bakeLamp.translate(0, 1.58, 0);
export function beacons(points) {
  const g = new THREE.Group(), n = points.length, M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const boards = new THREE.InstancedMesh(bakeBoard, PM.bake, n), feet = new THREE.InstancedMesh(bakeFoot, PM.dark, n), lamps = new THREE.InstancedMesh(bakeLamp, PM.lampDim, n);
  points.forEach(([x, z, rot], i) => { q.setFromEuler(e.set(0, rot || 0, 0)); M.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, 1, 1)); boards.setMatrixAt(i, M); feet.setMatrixAt(i, M); lamps.setMatrixAt(i, M); });
  g.add(boards, feet, lamps); return g;
}
const coneGeo = (() => { const a = new THREE.ConeGeometry(0.17, 0.72, 10); a.translate(0, 0.38, 0); const b = new THREE.BoxGeometry(0.4, 0.04, 0.4); b.translate(0, 0.02, 0); return mergeGeometries([a.toNonIndexed(), b.toNonIndexed()]); })();
const coneMat = new THREE.MeshStandardMaterial({ map: tex(16, 64, (g) => { g.fillStyle = '#ff5a00'; g.fillRect(0, 0, 16, 64); g.fillStyle = '#f4f4f4'; g.fillRect(0, 18, 16, 9); g.fillRect(0, 36, 16, 8); }), roughness: 0.6 });
export function cones(points) {
  const m = new THREE.InstancedMesh(coneGeo, coneMat, points.length), M = new THREE.Matrix4();
  points.forEach(([x, z], i) => m.setMatrixAt(i, M.makeTranslation(x, 0, z))); return m;
}

/* -------- fahrbare Absperrtafel: the yellow trailer with the big arrow board -------- */
export function warnTrailer() {
  const g = new THREE.Group(), lamps = [];
  g.add(B(2.1, 0.55, 3.2, PM.yellow, 0, 0.75, 0)); g.add(wheel(0.33, 0.25, -0.95, 0.33, 0.4)); g.add(wheel(0.33, 0.25, 0.95, 0.33, 0.4));
  g.add(B(0.12, 0.12, 1.4, PM.yellow, 0, 0.55, -2.1));
  g.add(B(0.14, 2.2, 0.14, PM.steel, -0.8, 2.0, 1.2)); g.add(B(0.14, 2.2, 0.14, PM.steel, 0.8, 2.0, 1.2));
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), PM.board); board.position.set(0, 2.55, 1.32); g.add(board);
  g.add(B(2.5, 2.5, 0.08, PM.dark, 0, 2.55, 1.26));
  for (let i = 0; i < 5; i++) { const a = (i / 4) * Math.PI; const l = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), PM.lampOff); l.position.set(Math.cos(a) * 1.0, 4.0 + Math.sin(a) * 0.15, 1.33); g.add(l); lamps.push(l); }
  g.userData.lamps = lamps; return g;
}

/* -------- construction machines and crew -------- */
export function excavator() {
  const g = new THREE.Group();
  for (const x of [-1.05, 1.05]) g.add(B(0.6, 0.75, 3.8, PM.dark, x, 0.38, 0));
  const top = new THREE.Group(); top.position.y = 0.8; g.add(top);
  top.add(B(2.4, 1.0, 2.8, PM.yellow, 0, 0.55, 0.3)); top.add(B(1.0, 1.4, 1.1, PM.yellow, -0.65, 1.7, -0.5)); top.add(B(0.9, 0.9, 0.05, PM.dark, -0.65, 1.85, -1.06));
  const boom = B(0.45, 0.45, 3.4, PM.yellow, 0.5, 2.1, -2.2); boom.rotation.x = -0.55; top.add(boom);
  const stick = B(0.35, 0.35, 2.4, PM.yellow, 0.5, 2.2, -4.4); stick.rotation.x = 0.9; top.add(stick);
  top.add(B(1.0, 0.7, 0.8, PM.dark, 0.5, 1.15, -5.0));
  top.rotation.y = 0.7; return g;
}
export function roller() {
  const g = new THREE.Group();
  const drum = C(0.75, 0.75, 1.9, PM.steel, 0, 0.75, -1.4, 18); drum.rotation.z = Math.PI / 2; g.add(drum);
  g.add(B(1.8, 1.0, 2.0, PM.yellow, 0, 1.0, 0.6)); g.add(wheel(0.7, 0.5, -0.8, 0.7, 1.0)); g.add(wheel(0.7, 0.5, 0.8, 0.7, 1.0));
  g.add(B(1.4, 0.08, 1.2, PM.dark, 0, 2.6, 0.6)); for (const x of [-0.6, 0.6]) for (const z of [0.1, 1.1]) g.add(B(0.06, 1.1, 0.06, PM.dark, x, 2.05, z));
  return g;
}
export function dumper() {
  const g = new THREE.Group();
  g.add(B(2.4, 2.0, 2.0, PM.white, 0, 1.9, -3.0)); g.add(B(2.2, 0.8, 0.06, PM.dark, 0, 2.3, -4.02));
  g.add(B(2.4, 1.5, 4.8, PM.orange, 0, 2.0, 0.8)); g.add(B(2.0, 0.6, 7.2, PM.dark, 0, 0.75, -0.3));
  for (const z of [-3.0, 0.6, 2.0]) { g.add(wheel(0.55, 0.4, -1.05, 0.55, z)); g.add(wheel(0.55, 0.4, 1.05, 0.55, z)); }
  return g;
}
export function gravelPile(r) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, r * 0.65, 9, 1), PM.gravel); m.position.y = r * 0.32; m.rotation.y = Math.random() * 3; return m; }
export function worker() {
  const g = new THREE.Group();
  g.add(B(0.16, 0.85, 0.2, PM.jeans, -0.11, 0.43, 0)); g.add(B(0.16, 0.85, 0.2, PM.jeans, 0.11, 0.43, 0));
  g.add(B(0.48, 0.62, 0.28, PM.vest, 0, 1.17, 0)); g.add(B(0.12, 0.55, 0.14, PM.vest, -0.31, 1.15, 0)); g.add(B(0.12, 0.55, 0.14, PM.vest, 0.31, 1.15, 0));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), PM.skin); head.position.y = 1.62; g.add(head);
  const hat = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 6, 0, 6.3, 0, 1.6), PM.white); hat.position.y = 1.66; g.add(hat);
  g.rotation.y = Math.random() * 6; return g;
}
export function jersey(len) { // concrete barrier block
  const s = new THREE.Shape(); s.moveTo(-0.3, 0); s.lineTo(0.3, 0); s.lineTo(0.3, 0.08); s.lineTo(0.12, 0.32); s.lineTo(0.08, 0.8); s.lineTo(-0.08, 0.8); s.lineTo(-0.12, 0.32); s.lineTo(-0.3, 0.08); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); geo.translate(0, 0, -len / 2);
  return new THREE.Mesh(geo, PM.concrete);
}

/* -------- accident scene -------- */
// An articulated tanker lying on its side. Built nose to -Z, rolled 90 degrees.
export function tanker(kind) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const cab = kind === 'milk' ? 0x2f6fb8 : 0xd8d8d8;
  body.add(B(2.5, 2.9, 2.3, new THREE.MeshStandardMaterial({ color: cab, roughness: 0.5, metalness: 0.3 }), 0, 2.0, -7.0));
  body.add(B(2.2, 0.9, 0.06, PM.dark, 0, 2.6, -8.17));
  body.add(B(2.0, 0.4, 15.5, PM.dark, 0, 0.75, 0));
  const t = C(1.25, 1.25, 11.5, PM.tank, 0, 2.25, 1.4, 24); t.rotation.x = Math.PI / 2; body.add(t);
  for (const z of [-4.33, 7.16]) { const cap = new THREE.Mesh(new THREE.SphereGeometry(1.25, 18, 10, 0, 6.3, 0, 1.2), PM.tank); cap.position.set(0, 2.25, z); cap.rotation.x = z < 0 ? -Math.PI / 2 : Math.PI / 2; cap.scale.y = 0.35; body.add(cap); }
  const plate = tex(256, 128, (gg) => { gg.fillStyle = '#ff7a00'; gg.fillRect(0, 0, 256, 128); gg.strokeStyle = '#111'; gg.lineWidth = 8; gg.strokeRect(4, 4, 248, 120); gg.beginPath(); gg.moveTo(0, 64); gg.lineTo(256, 64); gg.stroke();
    gg.fillStyle = '#111'; gg.font = `bold 46px ${FONT}`; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText(kind === 'milk' ? '—' : '30', 128, 34); gg.fillText(kind === 'milk' ? '—' : '1202', 128, 96); });
  const label = tex(512, 96, (gg) => { gg.fillStyle = 'rgba(0,0,0,0)'; gg.clearRect(0, 0, 512, 96); gg.fillStyle = kind === 'milk' ? '#1f5fae' : '#b0141a'; gg.font = `bold 72px ${FONT}`; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText(kind === 'milk' ? 'FRISCHMILCH' : 'MINERALÖL', 256, 50); });
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.3), new THREE.MeshStandardMaterial({ map: label, transparent: true, roughness: 0.4 })); l.position.set(s * 1.27, 2.4, 1.4); l.rotation.y = s * Math.PI / 2; body.add(l); }
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshStandardMaterial({ map: plate })); p.position.set(0, 1.4, 7.6); body.add(p);
  for (const z of [-6.6, -3.4, 4.0, 5.4, 6.8]) for (const s of [-1, 1]) body.add(wheel(0.52, 0.32, s * 1.1, 0.52, z));
  body.rotation.z = Math.PI / 2; body.position.set(1.4, 0, 0);       // on its side
  return g;
}
export function warnTriangle() {
  const g = new THREE.Group(), s = new THREE.Shape(); s.moveTo(-0.25, 0); s.lineTo(0.25, 0); s.lineTo(0, 0.43); s.closePath();
  s.holes.push(new THREE.Path([new THREE.Vector2(-0.16, 0.05), new THREE.Vector2(0.16, 0.05), new THREE.Vector2(0, 0.33)]));
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xff1a10, emissive: 0x500000, roughness: 0.3 }));
  m.position.y = 0.05; g.add(m); g.add(B(0.4, 0.02, 0.3, PM.dark, 0, 0.01, 0.1)); return g;
}
export function debris(n, spread, color = 0x222222) {
  const g = new THREE.Group(), mats = [PM.dark, new THREE.MeshStandardMaterial({ color, roughness: 0.6 }), new THREE.MeshStandardMaterial({ color: 0x9fb6c4, roughness: 0.1, metalness: 0.6 })];
  for (let i = 0; i < n; i++) { const m = B(0.1 + Math.random() * 0.5, 0.03 + Math.random() * 0.08, 0.1 + Math.random() * 0.6, mats[i % 3], (Math.random() - 0.5) * spread[0], 0.03, (Math.random() - 0.5) * spread[1]); m.rotation.y = Math.random() * 6; g.add(m); }
  return g;
}

/* -------- liquid spill decal: the same blobs drive both the look and the grip -------- */
export function spillDecal(blobs, streaks, rect, kind) {
  const [x0, z0, x1, z1] = rect, w = x1 - x0, d = z1 - z0, px = 10;
  const oil = kind === 'oil';
  const t = tex(Math.ceil(w * px), Math.ceil(d * px), (g, W, H) => {
    g.clearRect(0, 0, W, H);
    // one continuous pool: many soft overlapping blobs
    for (const b of blobs) {
      const cx = (b.x - x0) * px, cy = (b.z - z0) * px, r = b.r * px * 1.15;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      if (oil) { gr.addColorStop(0, 'rgba(14,10,6,0.95)'); gr.addColorStop(0.6, 'rgba(18,13,8,0.9)'); gr.addColorStop(1, 'rgba(20,15,10,0)'); }
      else { gr.addColorStop(0, 'rgba(236,236,228,0.9)'); gr.addColorStop(0.65, 'rgba(228,228,220,0.75)'); gr.addColorStop(1, 'rgba(220,220,212,0)'); }
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    }
    // tyre tracks dragging it down the road
    g.lineCap = 'round';
    for (const st of streaks) {
      const ax = (st.x - x0) * px, ay = (st.z0 - z0) * px, by = (st.z1 - z0) * px;
      const gr = g.createLinearGradient(0, ay, 0, by); const c = oil ? '20,14,8' : '232,232,224';
      gr.addColorStop(0, `rgba(${c},${oil ? 0.7 : 0.6})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.strokeStyle = gr; g.lineWidth = 0.24 * px; g.beginPath(); g.moveTo(ax, ay); g.bezierCurveTo(ax + (Math.random() - 0.5) * 6, (ay + by) / 2, ax + (Math.random() - 0.5) * 8, by, ax + (Math.random() - 0.5) * 4, by); g.stroke();
    }
    if (oil) { // rainbow sheen on top of the oil only
      g.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 70; i++) { const x = Math.random() * W, y = Math.random() * H, r = 6 + Math.random() * 30, hue = Math.random() * 360;
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `hsla(${hue},85%,55%,0.32)`); gr.addColorStop(0.6, `hsla(${(hue + 90) % 360},80%,50%,0.15)`); gr.addColorStop(1, 'hsla(0,0%,0%,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      g.globalCompositeOperation = 'source-over';
    }
  });
  const mat = new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, color: oil ? 0xffffff : 0xd8d8d2, roughness: oil ? 0.04 : 0.3, metalness: oil ? 0.6 : 0,
    envMapIntensity: oil ? 2.2 : 0.4, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x0 + w / 2, 0.012, z0 + d / 2); m.renderOrder = 2;
  return m;
}
