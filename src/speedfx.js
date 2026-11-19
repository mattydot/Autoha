// Things that make speed feel like speed: wind streaks rushing past the camera
// and a radial motion blur towards the edges of the screen.
import * as THREE from 'three';

// each streak is a thin cross of two ribbons (one flat, one upright), so it reads from any angle and at any pixel density
export class SpeedStreaks {
  constructor(frame, n = 60) {
    this.n = n; this.p = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 8 * 3); this.col = new Float32Array(n * 8 * 3);
    const idx = [];
    for (let i = 0; i < n; i++) for (let q = 0; q < 2; q++) { const o = i * 8 + q * 4; idx.push(o, o + 1, o + 2, o + 2, o + 1, o + 3); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    frame.add(this.mesh);
    for (let i = 0; i < n; i++) this.p.push({ x: 0, y: 0, s: -1e9, b: 0 });
  }
  _spawn(p, car, first) {
    const side = Math.random() < 0.5 ? -1 : 1;
    p.x = car.x + side * (1.5 + Math.random() * 8); p.y = 0.12 + Math.random() * Math.random() * 3.5;
    p.s = car.s + (first ? Math.random() * 100 : 50 + Math.random() * 60); p.b = 0.4 + Math.random() * 0.6;
  }
  /** amt 0..1: how strong the effect is; speed in m/s */
  update(car, speed, amt) {
    this.mat.opacity = amt; this.mesh.visible = amt > 0.01; if (!this.mesh.visible) return;
    const len = Math.min(10, speed * 0.08), P = this.pos, C = this.col;
    const set = (o, x, y, z, c) => { P[o] = x; P[o + 1] = y; P[o + 2] = z; C[o] = c; C[o + 1] = c; C[o + 2] = c * 1.05; };
    for (let i = 0; i < this.n; i++) {
      const p = this.p[i];
      if (p.s < car.s - 8 || p.s > car.s + 150) this._spawn(p, car, p.s < -1e8);
      const d = Math.min(1, Math.max(0, (p.s - car.s + 8) / 110)), c = p.b * (1 - d * 0.85), w = 0.022 + d * 0.05;
      const z0 = -p.s, z1 = -(p.s + len), o = i * 24;
      set(o, p.x - w, p.y, z0, c); set(o + 3, p.x + w, p.y, z0, c); set(o + 6, p.x - w, p.y, z1, 0); set(o + 9, p.x + w, p.y, z1, 0);
      set(o + 12, p.x, p.y - w, z0, c); set(o + 15, p.x, p.y + w, z0, c); set(o + 18, p.x, p.y - w, z1, 0); set(o + 21, p.x, p.y + w, z1, 0);
    }
    this.mesh.geometry.attributes.position.needsUpdate = true; this.mesh.geometry.attributes.color.needsUpdate = true;
  }
}

// radial blur: samples towards the vanishing point, stronger the further from it
export const RadialBlurShader = {
  uniforms: { tDiffuse: { value: null }, strength: { value: 0 }, center: { value: new THREE.Vector2(0.5, 0.56) } },
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float strength; uniform vec2 center; varying vec2 vUv;
    void main() {
      vec2 d = vUv - center; float r = length(d);
      float k = strength * smoothstep(0.18, 0.75, r);
      vec4 acc = vec4(0.0);
      for (int i = 0; i < 8; i++) { float t = float(i) / 7.0; acc += texture2D(tDiffuse, vUv - d * k * t * 0.09); }
      gl_FragColor = acc / 8.0;
    }`,
};
