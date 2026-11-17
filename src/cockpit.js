// First-person cockpit: dashboard, steering wheel with hands, live instrument
// cluster (speed, revs, gear, warning lights), centre screen, head-up display,
// working rear-view and door mirrors (rendered from a rear camera), and
// windscreen wipers with rain on the glass.
//
// Built in the player car's local space: forward -Z, right +X, up +Y, ground
// at y = 0. Car bodies are designed with x forward, so body x maps to -Z here.
import * as THREE from 'three';

const FONT = '"DIN Alternate","Bahnschrift","DIN Condensed","Roboto Condensed","Arial Narrow",Arial,sans-serif';
const clamp = THREE.MathUtils.clamp;

// interior trim per car
const STYLE = {
  m3:      { dash: 0x151618, trim: 0x2a2b2f, accent: '#ff7a1a', ambient: 0xff7a1a, wheel: 0x111111, stripe: true, cluster: 'm' },
  rs6:     { dash: 0x141416, trim: 0x2c2c30, accent: '#ff2a2a', ambient: 0xff2020, wheel: 0x141414, cluster: 'virtual' },
  maybach: { dash: 0x3a2a1c, trim: 0xd8ccb6, accent: '#d9e4ff', ambient: 0xffe0b0, wheel: 0x2c1e14, wood: true, cluster: 'classic' },
  v10:     { dash: 0x111112, trim: 0x232326, accent: '#9bff2e', ambient: 0x7bff2a, wheel: 0x0e0e0e, carbon: true, flat: true, cluster: 'hex' },
  v12:     { dash: 0x111112, trim: 0x232326, accent: '#ffb000', ambient: 0xffa000, wheel: 0x0e0e0e, carbon: true, flat: true, cluster: 'hex' },
  w16:     { dash: 0x0f1626, trim: 0x2a3550, accent: '#4fa3ff', ambient: 0x3a8cff, wheel: 0x101828, alu: true, cluster: 'classic' },
};

function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { c, g: c.getContext('2d'), t };
}
function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }
function between(mat, a, b, w, d) { // a box from point a to point b
  const len = a.distanceTo(b), m = new THREE.Mesh(new THREE.BoxGeometry(w, d, len), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); return m;
}

/* --------------------------- warning light icons --------------------------- */
function icon(g, kind, x, y, color) {
  g.save(); g.translate(x, y); g.fillStyle = color; g.strokeStyle = color; g.lineWidth = 2.4; g.lineJoin = 'round';
  switch (kind) {
    case 'engine': // check-engine silhouette
      g.beginPath(); g.moveTo(-13, -4); g.lineTo(-9, -4); g.lineTo(-9, -8); g.lineTo(-2, -8); g.lineTo(-2, -11); g.lineTo(5, -11); g.lineTo(5, -8); g.lineTo(9, -8);
      g.lineTo(12, -4); g.lineTo(15, -4); g.lineTo(15, 5); g.lineTo(12, 5); g.lineTo(9, 9); g.lineTo(-9, 9); g.lineTo(-9, 4); g.lineTo(-13, 4); g.closePath(); g.stroke();
      g.fillRect(-17, -4, 3, 8); break;
    case 'oil': // oil can with a drip
      g.beginPath(); g.moveTo(-14, -2); g.lineTo(-6, -2); g.lineTo(-3, -6); g.lineTo(6, -6); g.lineTo(16, -9); g.lineTo(8, 6); g.lineTo(-10, 6); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(-14, -2); g.lineTo(-18, -7); g.stroke(); g.fillRect(0, -10, 4, 4);
      g.beginPath(); g.arc(17, 2, 2.6, 0, 7); g.fill(); break;
    case 'slip': // skidding car
      g.beginPath(); g.roundRect(-9, -11, 18, 13, 3); g.stroke(); g.fillRect(-9, 2, 4, 3); g.fillRect(5, 2, 4, 3);
      g.beginPath(); g.moveTo(-9, 12); g.bezierCurveTo(-14, 7, -2, 6, -7, 1 + 14); g.moveTo(9, 12); g.bezierCurveTo(4, 7, 16, 6, 11, 15); g.stroke(); break;
    case 'beam': g.beginPath(); g.arc(4, 0, 9, -Math.PI / 2, Math.PI / 2); g.closePath(); g.stroke(); for (let i = -1; i <= 1; i++) g.fillRect(-16, i * 6 - 1, 10, 2.4); break;
    case 'fog': g.beginPath(); g.arc(-4, 0, 9, Math.PI / 2, Math.PI * 1.5); g.closePath(); g.stroke(); for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(6, i * 6); g.lineTo(16, i * 6 + 3); g.stroke(); } g.beginPath(); g.moveTo(-1, -12); g.bezierCurveTo(3, -6, -3, 6, 1, 12); g.stroke(); break;
    case 'brake': g.beginPath(); g.arc(0, 0, 8, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 12, -2.4, -0.8); g.stroke(); g.beginPath(); g.arc(0, 0, 12, 0.8, 2.4); g.stroke(); g.font = `bold 13px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 0, 1); break;
  }
  g.restore();
}

export class Cockpit {
  constructor() {
    this.rt = new THREE.WebGLRenderTarget(512, 160, { samples: 2 });
    this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    this.mirrorCam = new THREE.PerspectiveCamera(42, 512 / 160, 0.5, 2500);
    this.group = null; this.eye = new THREE.Vector3(); this.wipe = 0; this.sinceWipe = 9; this.frameN = 0;
  }

  dispose() {
    if (!this.group) return;
    this.group.parent?.remove(this.group);
    this.group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); if (o.material !== this.mirrorMat) { o.material.map?.dispose(); o.material.dispose(); } } });
    this.group = null;
  }

  build(spec, car) {
    this.dispose();
    const b = spec.body, st = STYLE[spec.id] || STYLE.m3, mid = !!b.midEngine;
    const g = this.group = new THREE.Group(); g.visible = false; car.add(g);
    this.spec = spec; this.style = st;
    const mDash = new THREE.MeshStandardMaterial({ color: st.dash, roughness: 0.85 });
    const mTrim = new THREE.MeshStandardMaterial({ color: st.trim, roughness: 0.9 });
    const mBlack = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.7 });
    const mGloss = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.15, metalness: 0.4 });
    const mWheel = new THREE.MeshStandardMaterial({ color: st.wheel, roughness: 0.75 });
    const mAlu = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.3, metalness: 0.9 });
    let mDeco = mAlu;
    if (st.wood) mDeco = new THREE.MeshStandardMaterial({ color: 0x5a2e14, roughness: 0.25, metalness: 0.1 });
    if (st.carbon) { const cv = canvas(64, 64); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { cv.g.fillStyle = (x + y) % 2 ? '#1c1c1f' : '#2c2c31'; cv.g.fillRect(x * 8, y * 8, 8, 8); }
      cv.t.wrapS = cv.t.wrapT = THREE.RepeatWrapping; cv.t.repeat.set(6, 2); mDeco = new THREE.MeshStandardMaterial({ map: cv.t, roughness: 0.25, metalness: 0.3 }); }
    const mAmb = new THREE.MeshBasicMaterial({ color: st.ambient });

    // key points (body x forward -> local -Z)
    const roofF = b.roofF, cowlX = b.cowlX, cowlH = b.cowlH, H = b.H, W = b.W;
    const eyeXb = roofF - (mid ? 0.42 : 0.55), eyeY = H - (mid ? 0.22 : 0.26), eyeX = -W * 0.2;
    this.eye.set(eyeX, eyeY, -eyeXb);
    const dashY = cowlH + 0.01, Zr = -(eyeXb + 0.68), Zf = -(cowlX - 0.04), inner = W / 2 - 0.1;
    const belt = Math.min(cowlH, b.beltR) - 0.02;
    const roofHalf = (W / 2 - 0.05) * (1 - (mid ? 0.3 : 0.22)) - 0.03;
    this.glassAngle = Math.atan2(cowlX - roofF, H - cowlH);   // rotation about X that lays a plane on the windscreen

    // dashboard: side profile extruded across the car
    const prof = new THREE.Shape(); prof.moveTo(Zf, dashY - 0.03); prof.lineTo(Zr - 0.05, dashY + 0.02); prof.quadraticCurveTo(Zr + 0.04, dashY + 0.03, Zr + 0.05, dashY - 0.06);
    prof.lineTo(Zr + 0.02, dashY - 0.42); prof.lineTo(Zf + 0.2, dashY - 0.5); prof.closePath();
    const dg = new THREE.ExtrudeGeometry(prof, { depth: inner * 2, bevelEnabled: false, curveSegments: 6 });
    dg.rotateY(-Math.PI / 2); dg.translate(inner, 0, 0);   // profile (Z,Y) in the YZ plane, extruded along X
    const dash = new THREE.Mesh(dg, mDash); g.add(dash);
    // decor strip and ambient light along the dash face
    g.add(box(inner * 2 - 0.1, 0.035, 0.012, mDeco, 0, dashY - 0.16, Zr + 0.045));
    g.add(box(inner * 2 - 0.1, 0.006, 0.006, mAmb, 0, dashY - 0.185, Zr + 0.05));
    // binnacle over the cluster
    const visor = box(0.5, 0.03, 0.09, mDash, eyeX, dashY + 0.16, Zr - 0.15); visor.rotation.x = 0.12; g.add(visor);
    g.add(box(0.5, 0.2, 0.02, mBlack, eyeX, dashY + 0.06, Zr - 0.14));
    // instrument cluster
    this.cl = canvas(512, 192);
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.1575), new THREE.MeshBasicMaterial({ map: this.cl.t, toneMapped: false }));
    cl.position.set(eyeX, dashY + 0.05, Zr - 0.115); cl.rotation.x = 0.18; g.add(cl);
    // centre screen
    this.sc = canvas(384, 224);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.146), new THREE.MeshBasicMaterial({ map: this.sc.t, toneMapped: false }));
    sc.position.set(0.04, dashY - 0.06, Zr + 0.056); sc.rotation.set(-0.15, -0.22, 0); g.add(sc);
    const scf = box(0.27, 0.165, 0.02, mGloss, 0.04, dashY - 0.06, Zr + 0.045); scf.rotation.set(-0.15, -0.22, 0); g.add(scf);
    // head-up display, floating over the bonnet
    if (spec.id !== 'maybach') {
      this.hud = canvas(256, 96);
      const hm = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.075), new THREE.MeshBasicMaterial({ map: this.hud.t, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
      hm.position.set(eyeX + 0.03, eyeY - 0.13, -eyeXb - 0.95); hm.rotation.x = 0.1; g.add(hm);
    } else this.hud = null;
    // centre console, floor, seats, doors
    g.add(box(0.26, dashY - 0.45, 0.85, mTrim, 0.04, (dashY + 0.3) / 2 - 0.08, Zr + 0.42));
    g.add(box(0.12, 0.12, 0.12, mAlu, 0.04, 0.55, Zr + 0.55));                              // gear selector
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, 2.2), mBlack); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.26, Zr + 0.8); g.add(floor);
    g.add(box(0.5, 0.14, 0.52, mTrim, 0.4, 0.42, -eyeXb + 0.05)); g.add(box(0.5, 0.62, 0.12, mTrim, 0.4, 0.78, -eyeXb + 0.36));   // passenger seat
    for (const sd of [-1, 1]) {
      g.add(box(0.05, belt - 0.32, Math.abs(Zf - (-eyeXb + 0.7)) - 0.2, mTrim, sd * (inner + 0.02), (belt + 0.32) / 2, (Zf - eyeXb + 0.7) / 2 + 0.1));
      g.add(box(0.1, 0.04, 0.9, mDash, sd * (inner - 0.03), belt - 0.18, -eyeXb + 0.1));                                     // armrest
      g.add(box(0.06, 0.03, 1.6, mDeco, sd * (inner - 0.005), belt - 0.03, -eyeXb - 0.1));                                   // sill trim
      g.add(box(0.012, 0.006, 1.2, mAmb, sd * (inner - 0.03), belt - 0.09, -eyeXb));                                        // ambient light
      // A-pillar trim, windscreen base corner to roof corner
      g.add(between(mTrim, new THREE.Vector3(sd * (inner - 0.03), cowlH - 0.01, -(cowlX - 0.06)), new THREE.Vector3(sd * (roofHalf - 0.02), H - 0.07, -(roofF + 0.02)), 0.09, 0.05));
    }
    // roof lining and header
    const head = new THREE.Mesh(new THREE.PlaneGeometry(roofHalf * 2, Math.abs(b.roofR - roofF) + 0.1), new THREE.MeshStandardMaterial({ color: st.wood ? 0xd6ccb8 : 0x2b2b2e, roughness: 1 }));
    head.rotation.x = Math.PI / 2; head.position.set(0, H - 0.06, -(roofF + b.roofR) / 2); g.add(head);
    g.add(box(roofHalf * 2, 0.07, 0.1, mTrim, 0, H - 0.08, -roofF + 0.02));
    for (const sd of [-1, 1]) { const v = box(0.34, 0.015, 0.16, mTrim, sd * 0.36, H - 0.085, -roofF + 0.12); v.rotation.z = sd * 0.04; g.add(v); }   // sun visors

    // rear-view mirror and door mirrors: one rear camera, three crops of it (mirrored)
    this.mirrorMat = new THREE.MeshBasicMaterial({ map: this.rt.texture, toneMapped: false });
    const mirror = (w, h, u0, u1) => { const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - (u0 + uv.getX(i) * (u1 - u0))); return new THREE.Mesh(geo, this.mirrorMat); };
    const rv = mirror(0.25, 0.068, 0, 1); rv.position.set(0.02, H - 0.17, -roofF + 0.105); rv.rotation.set(0.05, -0.12, 0); g.add(rv);
    const rvh = box(0.27, 0.085, 0.035, mBlack, 0.02, H - 0.17, -roofF + 0.085); rvh.rotation.set(0.05, -0.12, 0); g.add(rvh);
    g.add(box(0.02, 0.06, 0.02, mBlack, 0.02, H - 0.11, -roofF + 0.08));
    const mz = W / 2 + 0.07, mzZ = -(cowlX - 0.3) + 0.085, my = cowlH + 0.07;
    const lm = mirror(0.15, 0.075, 0.0, 0.34); lm.position.set(-mz, my, mzZ); lm.rotation.y = -0.38; g.add(lm);
    const rm = mirror(0.15, 0.075, 0.66, 1.0); rm.position.set(mz, my, mzZ); rm.rotation.y = 0.3; g.add(rm);

    // steering wheel (and hands), spins with the steering
    const col = new THREE.Group(); col.position.set(eyeX, eyeY - 0.36, -eyeXb - 0.5); col.rotation.x = -0.32; g.add(col);
    const wheel = this.wheel = new THREE.Group(); col.add(wheel);
    const rimG = new THREE.TorusGeometry(0.175, 0.021, 10, 40); const rim = new THREE.Mesh(rimG, mWheel); if (st.flat) rim.scale.y = 0.92; wheel.add(rim);
    const mSpoke = new THREE.MeshStandardMaterial({ color: 0x3a3c42, roughness: 0.35, metalness: 0.7 });
    for (const a of [0, Math.PI, -Math.PI / 2]) { const sp = box(0.16, 0.03, 0.02, a === -Math.PI / 2 ? mWheel : mSpoke, Math.cos(a) * 0.09, Math.sin(a) * 0.09, -0.01); sp.rotation.z = a; wheel.add(sp); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.064, 0.05, 20), mWheel); hub.rotation.x = Math.PI / 2; hub.position.z = -0.02; wheel.add(hub);
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), new THREE.MeshBasicMaterial({ color: st.ambient })); badge.position.z = 0.007; wheel.add(badge);
    if (st.stripe) ['#1c69d4', '#2f2f80', '#e11b22'].forEach((c, i) => wheel.add(box(0.008, 0.024, 0.028, new THREE.MeshBasicMaterial({ color: c }), -0.009 + i * 0.009, 0.177, 0)));
    else wheel.add(box(0.012, 0.024, 0.028, new THREE.MeshBasicMaterial({ color: st.ambient }), 0, 0.177, 0));
    const glove = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.9 });
    for (const sd of [-1, 1]) { const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 8), glove); hand.scale.set(1, 1.5, 0.85); hand.position.set(sd * 0.172, 0.005, 0.02); wheel.add(hand);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.05, 0.42, 10), new THREE.MeshStandardMaterial({ color: 0x23252b, roughness: 0.95 }));
      arm.position.set(sd * 0.22, -0.11, 0.2); arm.rotation.set(1.0, 0, sd * 0.45); wheel.add(arm); }
    for (const sd of [-1, 1]) col.add(box(0.05, 0.11, 0.01, mDeco, sd * 0.12, 0.06, -0.06));   // shift paddles
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.3, 12), mBlack); stem.rotation.x = Math.PI / 2; stem.position.z = -0.18; col.add(stem);

    // windscreen: rain drops and wipers lie in the glass plane
    const glass = new THREE.Group(); glass.position.set(0, cowlH - 0.04, -(cowlX - 0.06)); glass.rotation.x = this.glassAngle; g.add(glass);
    const glassLen = Math.hypot(cowlX - roofF, H - cowlH);
    this.drops = canvas(512, 256); this._drawDrops();
    this.dropMat = new THREE.MeshBasicMaterial({ map: this.drops.t, transparent: true, opacity: 0, depthWrite: false });
    const dropPlane = new THREE.Mesh(new THREE.PlaneGeometry(roofHalf * 2 + 0.25, glassLen), this.dropMat); dropPlane.position.set(0, glassLen / 2, 0.012); g.userData.drop = dropPlane; glass.add(dropPlane);
    this.wipers = [];
    for (const px of [-0.42, 0.18]) { const piv = new THREE.Group(); piv.position.set(px, 0.03, 0.02); glass.add(piv);
      const arm = box(0.62, 0.012, 0.012, mBlack, 0.31, 0, 0); piv.add(arm); const blade = box(0.6, 0.02, 0.008, mBlack, 0.33, 0.012, 0.004); piv.add(blade);
      piv.rotation.z = 0.06; this.wipers.push(piv); }
    return g;
  }

  _drawDrops() {
    const { g, c } = this.drops; g.clearRect(0, 0, c.width, c.height);
    for (let i = 0; i < 420; i++) { const x = Math.random() * c.width, y = Math.random() * c.height, r = 1 + Math.random() * Math.random() * 6;
      const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.5, 'rgba(200,215,230,0.35)'); gr.addColorStop(1, 'rgba(160,180,200,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * (1 + Math.random() * 0.6), 0, 0, 7); g.fill(); }
    this.drops.t.needsUpdate = true;
  }

  setVisible(v) {
    if (!this.group) return; this.group.visible = v;
    const u = this.group.parent.userData; if (u.cabinBody) { u.cabinBody.visible = v; u.body.visible = !v; }
  }

  // render the rear view into the mirror texture (camera sits just behind the car)
  renderMirror(renderer, scene, car) {
    if (!this.group || !this.group.visible) return;
    const L = this.spec.body.L, H = this.spec.body.H;
    car.localToWorld(this.mirrorCam.position.set(0, H + 0.05, L / 2 + 0.35));
    const look = car.localToWorld(new THREE.Vector3(0, H * 0.7, L / 2 + 60));
    this.mirrorCam.lookAt(look);
    const prev = renderer.getRenderTarget(); renderer.setRenderTarget(this.rt); renderer.render(scene, this.mirrorCam); renderer.setRenderTarget(prev);
  }

  update(dt, s) {
    if (!this.group || !this.group.visible) return;
    this.frameN++;
    // steering wheel: more turn at low speed, like a real steering ratio
    this.wheel.rotation.z = -s.steer * (0.9 + 1.7 * clamp(1 - s.speed / 30, 0, 1));
    // wipers: sweep while it rains; the glass fills with drops between sweeps
    if (s.rain > 0.12 || this.wipe > 0) {
      this.wipe += dt / (s.rain > 0.6 ? 0.9 : 1.3); if (this.wipe >= 1) this.wipe = s.rain > 0.12 ? this.wipe - 1 : 0;
      const k = Math.sin(this.wipe * Math.PI); for (const w of this.wipers) w.rotation.z = 0.06 + k * 1.75;
      if (this.wipe > 0.45 && this.wipe < 0.55) this.sinceWipe = 0;
    }
    this.sinceWipe += dt;
    this.dropMat.opacity = clamp(s.rain * 1.4, 0, 1) * clamp(this.sinceWipe / 1.2, 0.08, 1) * (s.speed > 45 ? 0.6 : 1);
    if (this.frameN % 2 === 0) this._drawCluster(s);
    if (this.frameN % 15 === 0) this._drawScreen(s);
    if (this.hud && this.frameN % 2 === 1) this._drawHud(s);
  }

  _drawCluster(s) {
    const { g, t } = this.cl, st = this.style, ac = st.accent, w = 512, h = 192, red = s.redline;
    g.fillStyle = '#030304'; g.fillRect(0, 0, w, h);
    const bg = g.createRadialGradient(256, 80, 10, 256, 80, 300); bg.addColorStop(0, 'rgba(255,255,255,0.05)'); bg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // rev counter
    const cx = 118, cy = 104, R = 78, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2, max = Math.ceil(red / 1000 + 1) * 1000;
    const ang = (r) => a0 + (a1 - a0) * Math.min(r, max) / max;
    g.lineWidth = 10; g.strokeStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
    g.strokeStyle = '#d0141a'; g.beginPath(); g.arc(cx, cy, R, ang(red), a1); g.stroke();
    const grd = g.createLinearGradient(cx - R, 0, cx + R, 0); grd.addColorStop(0, ac); grd.addColorStop(1, s.rpm > red * 0.93 ? '#ff2020' : ac);
    g.strokeStyle = grd; g.beginPath(); g.arc(cx, cy, R, a0, ang(s.rpm)); g.stroke();
    g.fillStyle = '#cfd3da'; g.font = `bold 13px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 0; k <= max / 1000; k++) { const a = ang(k * 1000); g.fillText(k, cx + Math.cos(a) * (R - 19), cy + Math.sin(a) * (R - 19)); }
    // gear in the middle of the rev counter, shift light when near the limiter
    g.fillStyle = s.rpm > red * 0.95 ? '#ff2b2b' : '#ffffff'; g.font = `bold 50px ${FONT}`; g.fillText(s.gear, cx, cy + 4);
    g.fillStyle = '#8a9099'; g.font = `bold 11px ${FONT}`; g.fillText(st.cluster === 'm' ? 'M  DRIVE' : 'D', cx, cy + 34);
    g.fillText('x1000 r/min', cx, cy + 54);
    // speed
    g.fillStyle = '#ffffff'; g.font = `bold 70px ${FONT}`; g.fillText(s.speedText, 300, 90);
    g.fillStyle = '#8a9099'; g.font = `bold 14px ${FONT}`; g.fillText(s.unit, 300, 128);
    if (s.limit) { g.fillStyle = '#fff'; g.beginPath(); g.arc(364, 30, 14, 0, 7); g.fill(); g.strokeStyle = '#d0141a'; g.lineWidth = 4; g.beginPath(); g.arc(364, 30, 12, 0, 7); g.stroke();
      g.fillStyle = '#111'; g.font = `bold ${s.limit >= 100 ? 11 : 13}px ${FONT}`; g.fillText(s.limit, 364, 31); }
    // right column
    g.textAlign = 'left'; g.fillStyle = ac; g.font = `bold 13px ${FONT}`; g.fillText(s.station || 'RADIO', 384, 40);
    g.fillStyle = '#cfd3da'; g.font = `12px ${FONT}`; g.fillText((s.title || '').slice(0, 20), 384, 58);
    g.fillStyle = '#ffffff'; g.font = `bold 22px ${FONT}`; g.fillText(s.clock, 384, 92);
    g.fillStyle = '#8a9099'; g.font = `bold 13px ${FONT}`; g.fillText(`${s.temp}°C`, 452, 92);
    g.fillText('TRIP', 384, 118); g.fillStyle = '#cfd3da'; g.fillText(`${s.trip} km`, 420, 118);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(384, 132, 100, 5); g.fillStyle = ac; g.fillRect(384, 132, 100 * (1 - s.damage / 100), 5);
    // warning lights. The M3 always has its engine and oil lights on.
    const lamps = [];
    if (this.spec.id === 'm3' || s.damage > 55) lamps.push(['engine', '#ffae00']);
    if (this.spec.id === 'm3' || s.damage > 85) lamps.push(['oil', '#ff2a1a']);
    if ((s.slide || s.onSlick) && (this.frameN >> 3) % 2) lamps.push(['slip', '#ffcc00']);
    if (s.flash) lamps.push(['beam', '#2f7bff']);
    if (s.fog) lamps.push(['fog', '#3ad16a']);
    if (s.wrecked) lamps.push(['brake', '#ff2a1a']);
    lamps.forEach(([k, c], i) => icon(g, k, 300 - (lamps.length - 1) * 17 + i * 34, 22, c));
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
    t.needsUpdate = true;
  }

  _drawScreen(s) {
    const { g, t } = this.sc, ac = this.style.accent, w = 384, h = 224;
    g.fillStyle = '#07080b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#12151b'; g.fillRect(0, 0, w, 30); g.fillStyle = '#cfd3da'; g.font = `bold 15px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(s.clock, 12, 16); g.textAlign = 'right'; g.fillText(`${s.weather}  ${s.temp}°C`, w - 12, 16);
    if (s.police) {
      const on = (this.frameN >> 4) % 2; g.fillStyle = on ? '#1236c9' : '#c4121a'; g.fillRect(0, 30, w, h - 30);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `bold 40px ${FONT}`; g.fillText('POLIZEI', w / 2, 110); g.font = `bold 18px ${FONT}`; g.fillText('BITTE FOLGEN', w / 2, 150);
    } else {
      g.textAlign = 'left'; g.fillStyle = ac; g.font = `bold 14px ${FONT}`; g.fillText(s.freq ? `${s.freq}  ·  RADIO` : 'RADIO', 18, 58);
      g.fillStyle = '#ffffff'; g.font = `bold 30px ${FONT}`; g.fillText(s.station || 'OFF', 18, 92);
      g.fillStyle = '#cfd3da'; g.font = `18px ${FONT}`; g.fillText((s.title || '').slice(0, 30), 18, 128);
      g.fillStyle = '#8a9099'; g.font = `15px ${FONT}`; g.fillText((s.artist || '').slice(0, 34), 18, 152);
      // little equaliser
      for (let i = 0; i < 24; i++) { const v = s.station ? 0.2 + 0.8 * Math.abs(Math.sin(this.frameN * 0.07 + i * 1.7) * Math.sin(i * 0.9 + this.frameN * 0.03)) : 0.05;
        g.fillStyle = ac; g.globalAlpha = 0.75; g.fillRect(18 + i * 14, 205 - v * 30, 9, v * 30); }
      g.globalAlpha = 1;
    }
    t.needsUpdate = true;
  }

  _drawHud(s) {
    const { g, t } = this.hud; g.clearRect(0, 0, 256, 96);
    g.fillStyle = '#7dffb0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold 52px ${FONT}`; g.fillText(s.speedText, 108, 46);
    g.font = `bold 15px ${FONT}`; g.fillText(s.unit, 108, 82);
    g.fillStyle = s.rpm > s.redline * 0.93 ? '#ff5050' : '#7dffb0'; g.font = `bold 30px ${FONT}`; g.fillText(s.gear, 200, 46);
    const n = 10, lit = Math.round(n * clamp((s.rpm / s.redline - 0.55) / 0.42, 0, 1));
    for (let i = 0; i < n; i++) { g.fillStyle = i < lit ? (i > 7 ? '#ff4040' : i > 5 ? '#ffd040' : '#7dffb0') : 'rgba(125,255,176,0.15)'; g.fillRect(40 + i * 15, 4, 11, 6); }
    if (s.limit) { g.strokeStyle = '#ff5050'; g.lineWidth = 3; g.beginPath(); g.arc(224, 80, 12, 0, 7); g.stroke(); g.fillStyle = '#7dffb0'; g.font = `bold 11px ${FONT}`; g.fillText(s.limit, 224, 81); }
    t.needsUpdate = true;
  }
}
