// 2D rigid-body contacts between oriented boxes (cars, obstacles) and walls.
// A body is { x, s, psi, L, W, vx, vs, r, m, I }; static bodies use m = I = Infinity.
// Same conventions as vehicle.js: x right, s ahead, psi + = nose right, r + = turning right.

export function corners(b) {
  const sn = Math.sin(b.psi), c = Math.cos(b.psi), hl = b.L / 2, hw = b.W / 2;
  const fx = sn * hl, fs = c * hl, rx = c * hw, rs = -sn * hw;
  return [[b.x + fx + rx, b.s + fs + rs], [b.x + fx - rx, b.s + fs - rs], [b.x - fx - rx, b.s - fs - rs], [b.x - fx + rx, b.s - fs + rs]];
}

function inside(b, p, eps) {
  const dx = p[0] - b.x, ds = p[1] - b.s, sn = Math.sin(b.psi), c = Math.cos(b.psi);
  return Math.abs(dx * sn + ds * c) <= b.L / 2 + eps && Math.abs(dx * c - ds * sn) <= b.W / 2 + eps;
}

/** Separating-axis test. Returns null or { n (A->B), depth, p (contact point) }. */
export function sat(A, B) {
  const ca = corners(A), cb = corners(B);
  const axes = [[Math.sin(A.psi), Math.cos(A.psi)], [Math.cos(A.psi), -Math.sin(A.psi)], [Math.sin(B.psi), Math.cos(B.psi)], [Math.cos(B.psi), -Math.sin(B.psi)]];
  let depth = Infinity, n = null;
  for (const ax of axes) {
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const p of ca) { const d = p[0] * ax[0] + p[1] * ax[1]; if (d < a0) a0 = d; if (d > a1) a1 = d; }
    for (const p of cb) { const d = p[0] * ax[0] + p[1] * ax[1]; if (d < b0) b0 = d; if (d > b1) b1 = d; }
    const o = Math.min(a1, b1) - Math.max(a0, b0);
    if (o <= 0) return null;
    if (o < depth) { depth = o; n = ax; }
  }
  if ((B.x - A.x) * n[0] + (B.s - A.s) * n[1] < 0) n = [-n[0], -n[1]];
  let px = 0, ps = 0, k = 0;
  for (const p of cb) if (inside(A, p, 0.05)) { px += p[0]; ps += p[1]; k++; }
  for (const p of ca) if (inside(B, p, 0.05)) { px += p[0]; ps += p[1]; k++; }
  if (!k) { px = (A.x + B.x) / 2; ps = (A.s + B.s) / 2; k = 1; }
  return { n, depth, p: [px / k, ps / k] };
}

function push(b, Jx, Js, rx, rs) {
  if (b.m === Infinity) return;
  b.vx += Jx / b.m; b.vs += Js / b.m; b.r += (rs * Jx - rx * Js) / b.I;
}

/**
 * Impulse response with restitution e and Coulomb friction mu at the contact.
 * Off-centre hits make the bodies spin; a square hit through the centre
 * (a straight rear-end) only pushes, so both cars keep pointing straight.
 * Returns the normal impulse (N*s).
 */
export function resolve(A, B, hit, e = 0.15, mu = 0.3) {
  const [nx, ns] = hit.n, [px, ps] = hit.p;
  const iA = 1 / A.m, iB = B.m === Infinity ? 0 : 1 / B.m, jA = 1 / A.I, jB = B.I === Infinity ? 0 : 1 / B.I;
  // positional correction first, split by mass
  const tot = iA + iB, corr = Math.max(0, hit.depth - 0.005);
  if (tot > 0) { A.x -= nx * corr * iA / tot; A.s -= ns * corr * iA / tot; if (iB) { B.x += nx * corr * iB / tot; B.s += ns * corr * iB / tot; } }
  const rax = px - A.x, ras = ps - A.s, rbx = px - B.x, rbs = ps - B.s;
  const vax = A.vx + A.r * ras, vas = A.vs - A.r * rax, vbx = B.vx + B.r * rbs, vbs = B.vs - B.r * rbx;
  const rvx = vbx - vax, rvs = vbs - vas, vn = rvx * nx + rvs * ns;
  if (vn >= 0) return 0;
  const cA = rax * ns - ras * nx, cB = rbx * ns - rbs * nx;
  const j = -(1 + e) * vn / (iA + iB + cA * cA * jA + cB * cB * jB);
  push(A, -j * nx, -j * ns, rax, ras); push(B, j * nx, j * ns, rbx, rbs);
  // friction along the contact
  const tx = -ns, ts = nx, vt = rvx * tx + rvs * ts;
  const tA = rax * ts - ras * tx, tB = rbx * ts - rbs * tx;
  let jt = -vt / (iA + iB + tA * tA * jA + tB * tB * jB);
  jt = Math.max(-mu * j, Math.min(mu * j, jt));
  push(A, -jt * tx, -jt * ts, rax, ras); push(B, jt * tx, jt * ts, rbx, rbs);
  return j;
}

const WALL = { x: 0, s: 0, vx: 0, vs: 0, r: 0, m: Infinity, I: Infinity, psi: 0 };
/** Corners against lateral walls given by bounds(s) -> { min, max }. Returns the strongest hit. */
export function walls(A, bounds, e = 0.2, mu = 0.35) {
  let best = null;
  for (const p of corners(A)) {
    const bd = bounds(p[1]);
    let n = null, depth = 0;
    if (p[0] > bd.max) { n = [1, 0]; depth = p[0] - bd.max; } else if (p[0] < bd.min) { n = [-1, 0]; depth = bd.min - p[0]; }
    if (!n) continue;
    WALL.x = p[0] + n[0]; WALL.s = p[1];
    const j = resolve(A, WALL, { n, depth, p }, e, mu);
    if (!best || j > best.j) best = { j, n, p, depth };
  }
  return best;
}
