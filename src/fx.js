// Crash and tyre effects: skid marks, flying debris, tyre smoke, sparks.
// Everything lives in road coordinates (inside world.frame): x, y, z = -s.
import * as THREE from 'three';

const pointsVert = /* glsl */`
attribute float size; attribute float alpha; attribute vec3 tint;
varying float vA; varying vec3 vC;
void main(){ vA = alpha; vC = tint; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * 420.0 / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }`;
const pointsFrag = /* glsl */`
varying float vA; varying vec3 vC;
void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(vC, vA * (1.0 - r)); }`;

class Points {
  constructor(n, additive) {
    this.n = n; this.i = 0; this.p = [];
    const g = new THREE.BufferGeometry();
    for (const [k, s] of [['position', 3], ['size', 1], ['alpha', 1], ['tint', 3]]) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(n * s), s).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: pointsVert, fragmentShader: pointsFrag, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 4;
    for (let i = 0; i < n; i++) this.p.push({ life: 0 });
  }
  emit(o) { const p = this.p[this.i]; this.i = (this.i + 1) % this.n; Object.assign(p, o, { age: 0 }); }
  update(dt, step) {
    const a = this.mesh.geometry.attributes;
    for (let i = 0; i < this.n; i++) {
      const p = this.p[i];
      if (p.life > 0 && p.age < p.life) { p.age += dt; step(p, dt); a.position.setXYZ(i, p.x, p.y, -p.s); a.size.setX(i, p.size); a.alpha.setX(i, p.a * Math.max(0, 1 - p.age / p.life)); a.tint.setXYZ(i, p.r, p.g, p.b); }
      else a.alpha.setX(i, 0);
    }
    for (const k of ['position', 'size', 'alpha', 'tint']) a[k].needsUpdate = true;
  }
}

export class Fx {
  constructor(world) {
    this.frame = world.frame;
    // skid marks: a ring buffer of flat dark quads
    this.nSkid = 1400; this.iSkid = 0;
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    this.skids = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), this.nSkid);
    this.skids.frustumCulled = false; this.skids.renderOrder = 3; this.frame.add(this.skids);
    const Z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < this.nSkid; i++) this.skids.setMatrixAt(i, Z);
    this.last = {};
    // debris chunks
    this.nDeb = 160; this.iDeb = 0; this.deb = [];
    this.debMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.3 }), this.nDeb);
    this.debMesh.frustumCulled = false; this.frame.add(this.debMesh);
    for (let i = 0; i < this.nDeb; i++) { this.deb.push({ life: 0 }); this.debMesh.setMatrixAt(i, Z); this.debMesh.setColorAt(i, new THREE.Color(0x222222)); }
    this.smoke = new Points(260, false); this.frame.add(this.smoke.mesh);
    this.sparks = new Points(200, true); this.frame.add(this.sparks.mesh);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._v = new THREE.Vector3(); this._sc = new THREE.Vector3(); this._c = new THREE.Color();
  }

  reset() {
    const Z = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.nSkid; i++) this.skids.setMatrixAt(i, Z); this.skids.instanceMatrix.needsUpdate = true;
    for (const d of this.deb) d.life = 0; for (const p of this.smoke.p) p.life = 0; for (const p of this.sparks.p) p.life = 0; this.last = {};
  }

  /** leave a skid mark for one wheel (key) at road position (x, s); intensity 0..1 */
  skid(key, x, s, k) {
    const l = this.last[key];
    if (k < 0.08) { this.last[key] = null; return; }
    if (!l) { this.last[key] = { x, s }; return; }
    const dx = x - l.x, ds = s - l.s, len = Math.hypot(dx, ds);
    if (len < 0.35) return;
    this._q.setFromEuler(this._e.set(0, Math.atan2(dx, ds), 0));
    this._m.compose(this._v.set((x + l.x) / 2, 0.013, -(s + l.s) / 2), this._q, this._sc.set(0.22 * (0.5 + k * 0.5), 1, len + 0.05));
    this.skids.setMatrixAt(this.iSkid, this._m); this.iSkid = (this.iSkid + 1) % this.nSkid; this.skids.instanceMatrix.needsUpdate = true;
    this.last[key] = { x, s };
  }

  debris(x, y, s, vx, vs, n, color) {
    for (let k = 0; k < n; k++) {
      const d = this.deb[this.iDeb], i = this.iDeb; this.iDeb = (this.iDeb + 1) % this.nDeb;
      Object.assign(d, { x, y, s, vx: vx * 0.6 + (Math.random() - 0.5) * 9, vy: 2 + Math.random() * 6, vs: vs * 0.85 + (Math.random() - 0.5) * 9, rx: Math.random() * 6, ry: Math.random() * 6, w: Math.random() * 12 - 6,
        size: 0.06 + Math.random() * 0.22, life: 4 + Math.random() * 4, age: 0 });
      const c = Math.random(); this.debMesh.setColorAt(i, this._c.setHex(c < 0.45 ? color : c < 0.75 ? 0x16171a : c < 0.9 ? 0xa9c3d6 : 0xb0b4ba));
    }
    this.debMesh.instanceColor.needsUpdate = true;
  }
  puff(x, y, s, vx, vs, n, dark, size = 1.4) {
    for (let k = 0; k < n; k++) { const gr = dark ? 0.12 + Math.random() * 0.1 : 0.62 + Math.random() * 0.2;
      this.smoke.emit({ x: x + (Math.random() - 0.5) * 0.5, y, s, vx: vx * 0.3 + (Math.random() - 0.5) * 1.5, vy: 0.4 + Math.random() * 1.2, vs: vs * 0.3 + (Math.random() - 0.5) * 1.5,
        size: size * (0.6 + Math.random() * 0.8), grow: 1.6, life: 1.6 + Math.random() * 1.6, a: dark ? 0.6 : 0.42, r: gr, g: gr, b: gr * 1.02 }); }
  }
  spark(x, y, s, vx, vs, n) {
    for (let k = 0; k < n; k++) this.sparks.emit({ x, y, s, vx: vx * 0.8 + (Math.random() - 0.5) * 5, vy: 0.5 + Math.random() * 3, vs: vs * 0.8 + (Math.random() - 0.5) * 5, size: 0.06 + Math.random() * 0.06, life: 0.25 + Math.random() * 0.4, a: 1, r: 1, g: 0.55 + Math.random() * 0.3, b: 0.15 });
  }

  // exhaust flame on overrun: a short orange burst with a blue core
  flame(x, y, s, vx, vs) {
    for (let k = 0; k < 6; k++) { const hot = k < 2; this.sparks.emit({ x: x + vx * 0.01, y, s, vx: vx * 0.9 + (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.3) * 1.2, vs: vs - 4 - Math.random() * 6,
      size: hot ? 0.16 : 0.22 + Math.random() * 0.2, life: 0.06 + Math.random() * 0.1, a: 1, r: hot ? 0.5 : 1, g: hot ? 0.6 : 0.45 + Math.random() * 0.25, b: hot ? 1 : 0.08 }); }
  }

  update(dt) {
    let any = false;
    for (let i = 0; i < this.nDeb; i++) {
      const d = this.deb[i]; if (d.life <= 0) continue;
      d.age += dt; if (d.age > d.life) { d.life = 0; this.debMesh.setMatrixAt(i, this._m.makeScale(0, 0, 0)); any = true; continue; }
      d.vy -= 9.81 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.s += d.vs * dt;
      if (d.y < d.size / 2) { d.y = d.size / 2; d.vy = Math.abs(d.vy) * 0.25; d.vx *= 0.6; d.vs *= 0.6; d.w *= 0.5; if (Math.abs(d.vy) < 0.5) { d.vy = 0; d.vx *= 0.9; d.vs *= 0.9; } }
      d.rx += d.w * dt; d.ry += d.w * 0.7 * dt;
      this._q.setFromEuler(this._e.set(d.rx, d.ry, 0));
      this.debMesh.setMatrixAt(i, this._m.compose(this._v.set(d.x, d.y, -d.s), this._q, this._sc.set(d.size, d.size * 0.35, d.size * 1.4))); any = true;
    }
    if (any) this.debMesh.instanceMatrix.needsUpdate = true;
    this.smoke.update(dt, (p, t) => { p.x += p.vx * t; p.y += p.vy * t; p.s += p.vs * t; p.vx *= 0.97; p.vs *= 0.97; p.size += p.grow * t; });
    this.sparks.update(dt, (p, t) => { p.vy -= 9.81 * t; p.x += p.vx * t; p.y = Math.max(0.02, p.y + p.vy * t); p.s += p.vs * t; });
  }
}
