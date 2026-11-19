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
  m3:      { dash: 0x161719, trim: 0x232427, seat: 0x1c1d20, stitch: '#3a6fd8', accent: '#ff7a1a', ambient: 0xff7a1a, wheel: 0x141416, stripe: true, cluster: 'm' },
  rs6:     { dash: 0x141416, trim: 0x252528, seat: 0x1b1b1e, stitch: '#c8202a', accent: '#ff2a2a', ambient: 0xff2020, wheel: 0x141414, cluster: 'virtual' },
  maybach: { dash: 0x3a2a1c, trim: 0xcdbfa4, seat: 0xd9cdb4, stitch: '#8a6a44', accent: '#d9e4ff', ambient: 0xffe0b0, wheel: 0x2c1e14, wood: true, cluster: 'classic' },
  v10:     { dash: 0x151517, trim: 0x1c1c1f, seat: 0x18181a, stitch: '#8fe82a', accent: '#9bff2e', ambient: 0x7bff2a, wheel: 0x121214, carbon: true, flat: true, cluster: 'hex' },
  v12:     { dash: 0x151517, trim: 0x1c1c1f, seat: 0x18181a, stitch: '#ffb000', accent: '#ffb000', ambient: 0xffa000, wheel: 0x121214, carbon: true, flat: true, cluster: 'hex' },
  r6:      { dash: 0x17181b, trim: 0x26282c, seat: 0x1d1f23, stitch: '#2a64d6', accent: '#2a8cff', ambient: 0x2a6cff, wheel: 0x151517, cluster: 'virtual' },
  m5b:     { dash: 0x0e0e10, trim: 0x18181b, seat: 0x121214, stitch: '#c4121a', accent: '#ff2a2a', ambient: 0xff1a1a, wheel: 0x0f0f11, carbon: true, cluster: 'm' },
  w16:     { dash: 0x101827, trim: 0x23304a, seat: 0x1c2a48, stitch: '#9fc4ff', accent: '#4fa3ff', ambient: 0x3a8cff, wheel: 0x101828, alu: true, cluster: 'classic' },
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

    /* ---------------- materials: stitched leather, alcantara, plastics, metals ---------------- */
    const leather = (base, stitch, rx = 1, ry = 1, panel = true) => {
      const cv = canvas(256, 256), x = cv.g;
      x.fillStyle = base; x.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 2600; k++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.07)'; const r = 0.6 + Math.random() * 1.6; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, r, 0, 7); x.fill(); }
      if (panel) { x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 3; x.strokeRect(8, 8, 240, 240);
        x.strokeStyle = stitch; x.lineWidth = 1.6; x.setLineDash([5, 4]); x.strokeRect(15, 15, 226, 226); x.setLineDash([]); }
      cv.t.wrapS = cv.t.wrapT = THREE.RepeatWrapping; cv.t.repeat.set(rx, ry);
      return new THREE.MeshStandardMaterial({ map: cv.t, roughness: 0.62, metalness: 0.02 });
    };
    const alcantara = (base) => { const cv = canvas(128, 128), x = cv.g; x.fillStyle = base; x.fillRect(0, 0, 128, 128);
      for (let k = 0; k < 3000; k++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},0.05)`; x.fillRect(Math.random() * 128, Math.random() * 128, 1, 1); }
      cv.t.wrapS = cv.t.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map: cv.t, roughness: 1 }); };
    const hex = (n) => '#' + n.toString(16).padStart(6, '0');
    const mLeather = st.carbon ? alcantara(hex(st.dash)) : leather(hex(st.dash), st.stitch || st.accent, 1, 1, false);
    const mSeat = leather(hex(st.seat ?? st.trim), st.stitch || st.accent, 1, 1);
    const mDoor = leather(hex(st.trim), st.stitch || st.accent, 1, 1);
    const mDash = new THREE.MeshStandardMaterial({ color: st.dash, roughness: 0.85 });
    const mTrim = new THREE.MeshStandardMaterial({ color: st.trim, roughness: 0.9 });
    const mPlastic = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.55 });
    const mBlack = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.7 });
    const mGloss = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.3, metalness: 0.15 });
    const mWheel = leather(hex(st.wheel), st.stitch || st.accent, 8, 1, false);
    const mAlu = new THREE.MeshStandardMaterial({ color: 0xc4c8d0, roughness: 0.28, metalness: 0.95 });
    const mChrome = new THREE.MeshStandardMaterial({ color: 0xe8e8ee, roughness: 0.08, metalness: 1 });
    const mFabric = alcantara(st.wood ? '#d8cfbd' : '#2a2b2f');
    let mDeco = mAlu;
    if (st.wood) { const cv = canvas(256, 64), x = cv.g; const gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#6a3518'); gr.addColorStop(1, '#4a2210'); x.fillStyle = gr; x.fillRect(0, 0, 256, 64);
      for (let k = 0; k < 40; k++) { x.strokeStyle = `rgba(${30 + Math.random() * 30},${12 + Math.random() * 10},4,0.5)`; x.lineWidth = 0.6 + Math.random() * 1.5; x.beginPath(); const y = Math.random() * 64; x.moveTo(0, y); x.bezierCurveTo(80, y + (Math.random() - 0.5) * 12, 170, y + (Math.random() - 0.5) * 12, 256, y + (Math.random() - 0.5) * 6); x.stroke(); }
      cv.t.wrapS = THREE.RepeatWrapping; cv.t.repeat.set(3, 1); mDeco = new THREE.MeshStandardMaterial({ map: cv.t, roughness: 0.18, metalness: 0.05 }); }
    if (st.carbon) { const cv = canvas(64, 64); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { cv.g.fillStyle = (x + y) % 2 ? '#1a1a1d' : '#2e2e33'; cv.g.fillRect(x * 8, y * 8, 8, 8); }
      cv.t.wrapS = cv.t.wrapT = THREE.RepeatWrapping; cv.t.repeat.set(8, 2); mDeco = new THREE.MeshStandardMaterial({ map: cv.t, roughness: 0.22, metalness: 0.35 }); }
    const mAmb = new THREE.MeshBasicMaterial({ color: st.ambient });
    const grille = (() => { const cv = canvas(64, 64), x = cv.g; x.fillStyle = '#0c0c0d'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#2a2b2f';
      for (let yy = 2; yy < 64; yy += 4) for (let xx = (yy % 8 ? 2 : 4); xx < 64; xx += 4) { x.beginPath(); x.arc(xx, yy, 1.1, 0, 7); x.fill(); }
      cv.t.wrapS = cv.t.wrapT = THREE.RepeatWrapping; cv.t.repeat.set(3, 3); return new THREE.MeshStandardMaterial({ map: cv.t, roughness: 0.6, metalness: 0.3 }); })();
    // rounded slab (for seats, airbag, mirror frame)
    const rbox = (w, h, d, r, mat, x = 0, y = 0, z = 0) => { const sh = new THREE.Shape(), hw = w / 2 - r, hh = h / 2 - r;
      sh.moveTo(-hw, -h / 2); sh.lineTo(hw, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -hh); sh.lineTo(w / 2, hh); sh.quadraticCurveTo(w / 2, h / 2, hw, h / 2);
      sh.lineTo(-hw, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, hh); sh.lineTo(-w / 2, -hh); sh.quadraticCurveTo(-w / 2, -h / 2, -hw, -h / 2);
      const bv = Math.min(r, d / 2) * 0.8, geo = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.002, d - bv * 2), bevelEnabled: true, bevelThickness: bv, bevelSize: bv * 0.6, bevelSegments: 3, curveSegments: 5 });
      geo.translate(0, 0, -(d - bv * 2) / 2); const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) / w + 0.5, uv.getY(k) / h + 0.5);
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
    // the same, rounded in the side view (height x length): door cards, console, armrests
    const rboxS = (w, h, d, r, mat, x = 0, y = 0, z = 0) => { const m = rbox(d, h, w, r, mat, 0, 0, 0); m.geometry.rotateY(Math.PI / 2); m.position.set(x, y, z); return m; };

    /* ---------------- key points (body x forward -> local -Z) ---------------- */
    const roofF = b.roofF, cowlX = b.cowlX, cowlH = b.cowlH, H = b.H, W = b.W;
    const eyeXb = roofF - (mid ? 0.42 : 0.55), eyeY = H - (mid ? 0.22 : 0.26), eyeX = -W * 0.2, eyeZ = -eyeXb;
    this.eye.set(eyeX, eyeY, eyeZ);
    const dashY = cowlH + 0.01, Zr = -(eyeXb + 0.68), Zf = -(cowlX - 0.04), inner = W / 2 - 0.1, Zface = Zr + 0.04;
    const belt = Math.min(cowlH, b.beltR) - 0.02;
    const roofHalf = (W / 2 - 0.05) * (1 - (mid ? 0.3 : 0.22)) - 0.03;
    this.glassAngle = Math.atan2(cowlX - roofF, H - cowlH);

    /* ---------------- dashboard: soft upper pad, face, decor strip ---------------- */
    const prof = new THREE.Shape(); prof.moveTo(Zf, dashY - 0.03);
    prof.bezierCurveTo((Zf + Zr) / 2, dashY + 0.035, Zr - 0.02, dashY + 0.04, Zr + 0.045, dashY - 0.03);       // soft rounded top pad
    prof.bezierCurveTo(Zr + 0.07, dashY - 0.12, Zr + 0.05, dashY - 0.32, Zr + 0.0, dashY - 0.42);             // face curving in to the knees
    prof.quadraticCurveTo(Zr + 0.05, dashY - 0.5, Zf + 0.2, dashY - 0.5); prof.closePath();
    const bev = 0.03, dg = new THREE.ExtrudeGeometry(prof, { depth: inner * 2 - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.7, bevelOffset: -bev * 0.7, bevelSegments: 4, curveSegments: 16, steps: 12 });
    dg.rotateY(-Math.PI / 2); dg.translate(inner - bev, 0, 0);
    { const p = dg.attributes.position; for (let k = 0; k < p.count; k++) { const xn = p.getX(k) / inner; p.setZ(k, p.getZ(k) - 0.05 * xn * xn); } dg.computeVertexNormals(); }
    { const uv = dg.attributes.uv, pos = dg.attributes.position; for (let k = 0; k < uv.count; k++) uv.setXY(k, pos.getX(k) / 0.6, (pos.getY(k) + pos.getZ(k)) / 0.6); }
    g.add(new THREE.Mesh(dg, mLeather));
    g.add(box(inner * 2 - 0.06, 0.045, 0.014, mDeco, 0, dashY - 0.1, Zface + 0.012));                     // decor inlay
    g.add(box(inner * 2 - 0.06, 0.005, 0.006, mAmb, 0, dashY - 0.125, Zface + 0.016));                     // ambient light line
    g.add(box(inner * 2 - 0.08, 0.004, 0.02, mBlack, 0, dashY - 0.075, Zface + 0.01));                     // panel seam
    const seamT = canvas(512, 8); { const x = seamT.g; x.clearRect(0, 0, 512, 8); x.strokeStyle = st.stitch || st.accent; x.lineWidth = 2.4; x.setLineDash([7, 5]); x.beginPath(); x.moveTo(0, 4); x.lineTo(512, 4); x.stroke(); seamT.t.wrapS = THREE.RepeatWrapping; seamT.t.repeat.set(6, 1); seamT.t.needsUpdate = true; }
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(inner * 2 - 0.1, 0.008), new THREE.MeshBasicMaterial({ map: seamT.t, transparent: true }));
    seam.position.set(0, dashY - 0.03, Zr + 0.052); seam.rotation.x = -0.6; g.add(seam);
    // glovebox seam on the passenger side
    g.add(box(0.42, 0.004, 0.006, mBlack, 0.42, dashY - 0.3, Zface + 0.014)); g.add(box(0.07, 0.012, 0.012, mChrome, 0.42, dashY - 0.27, Zface + 0.016));

    /* ---------------- instrument cluster, low in the dash face, seen over the wheel rim ---------------- */
    const clW = 0.29, clH = 0.109, aim = (mid ? 25.5 : 28) * Math.PI / 180;
    const clZ = Zface + 0.04, clY = eyeY - (eyeZ - clZ) * Math.tan(aim);   // seen through the top of the steering wheel
    g.add(rbox(clW + 0.04, clH + 0.035, 0.03, 0.02, mPlastic, eyeX, clY, clZ - 0.012));                     // recessed pod
    const hood = rbox(clW + 0.06, 0.02, 0.045, 0.01, mLeather, eyeX, clY + clH / 2 + 0.07, clZ - 0.01); hood.rotation.x = 0.12; g.add(hood);
    this.cl = canvas(512, 192);
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(clW, clH), new THREE.MeshBasicMaterial({ map: this.cl.t, toneMapped: false }));
    cl.position.set(eyeX, clY, clZ + 0.022); cl.rotation.x = -aim * 0.45; g.add(cl);

    /* ---------------- centre stack: screen, vents, climate, buttons ---------------- */
    const cx = 0.05, scY = dashY - 0.2;
    this.sc = canvas(384, 224);
    const scrM = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.14), new THREE.MeshBasicMaterial({ map: this.sc.t, toneMapped: false }));
    scrM.position.set(cx, scY, Zface + 0.03); scrM.rotation.set(-0.1, -0.2, 0); g.add(scrM);
    const scf = rbox(0.26, 0.16, 0.025, 0.012, mGloss, cx, scY, Zface + 0.016); scf.rotation.set(-0.1, -0.2, 0); g.add(scf);
    const vent = (x, y, w, h, rot = 0) => { const v = new THREE.Group(); v.position.set(x, y, Zface + 0.012); v.rotation.y = rot;
      v.add(rbox(w + 0.022, h + 0.022, 0.02, 0.008, st.carbon || st.wood ? mDeco : mPlastic, 0, 0, 0)); v.add(box(w + 0.006, 0.003, 0.022, mAlu, 0, h / 2 + 0.004, 0.003)); v.add(box(w, h, 0.022, mBlack, 0, 0, 0.002));
      for (let k = 0; k < 5; k++) v.add(box(w * 0.94, 0.006, 0.02, mPlastic, 0, -h / 2 + (k + 0.5) * h / 5, 0.006)).rotation.x;
      v.add(box(0.008, h * 0.7, 0.01, mAlu, 0, 0, 0.016)); g.add(v); };
    vent(cx - 0.1, dashY - 0.06, 0.07, 0.05, -0.15); vent(cx + 0.1, dashY - 0.06, 0.07, 0.05, -0.25);
    vent(-inner + 0.1, dashY - 0.08, 0.09, 0.055, 0.35); vent(inner - 0.1, dashY - 0.08, 0.09, 0.055, -0.35);
    // climate panel with a little display and buttons
    const clim = canvas(256, 48); { const x = clim.g; x.fillStyle = '#060607'; x.fillRect(0, 0, 256, 48); x.fillStyle = st.accent; x.font = `bold 22px ${FONT}`; x.textBaseline = 'middle';
      x.textAlign = 'left'; x.fillText('21.5°', 10, 25); x.textAlign = 'right'; x.fillText('21.0°', 246, 25); x.fillStyle = '#8a9099'; x.font = `bold 13px ${FONT}`; x.textAlign = 'center'; x.fillText('AUTO  ❄  ≋', 128, 25); clim.t.needsUpdate = true; }
    const cm = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.0375), new THREE.MeshBasicMaterial({ map: clim.t, toneMapped: false })); cm.position.set(cx, scY - 0.115, Zface + 0.028); cm.rotation.y = -0.2; g.add(cm);
    for (let k = 0; k < 6; k++) { const bt = rbox(0.026, 0.016, 0.01, 0.004, mPlastic, cx - 0.08 + k * 0.032, scY - 0.15, Zface + 0.02); bt.rotation.y = -0.2; g.add(bt);
      g.add(box(0.008, 0.002, 0.002, k === 1 ? mAmb : mAlu, cx - 0.08 + k * 0.032, scY - 0.143, Zface + 0.026)); }
    const hazard = rbox(0.026, 0.02, 0.012, 0.005, new THREE.MeshStandardMaterial({ color: 0x8a0d0d, roughness: 0.4 }), cx, dashY - 0.12, Zface + 0.02); g.add(hazard);

    /* ---------------- centre console ---------------- */
    const conX = 0.04, conTop = 0.6;
    g.add(rboxS(0.26, dashY - 0.35, 0.7, 0.06, mPlastic, conX, (dashY - 0.05 + 0.3) / 2 - 0.05, Zr + 0.38));      // lower stack
    const tunnel = rboxS(0.24, 0.1, 0.95, 0.04, mDeco, conX, conTop - 0.06, Zr + 0.75); g.add(tunnel);
    g.add(rboxS(0.25, 0.024, 0.95, 0.012, mLeather, conX, conTop - 0.0, Zr + 0.75));
    // gear selector
    const sel = new THREE.Group(); sel.position.set(conX - 0.02, conTop + 0.01, Zr + 0.5); g.add(sel);
    sel.add(rbox(0.07, 0.03, 0.12, 0.012, mGloss, 0, 0.0, 0)); const lever = rbox(0.05, 0.08, 0.1, 0.02, mSeat, 0, 0.05, 0.01); sel.add(lever);
    sel.add(box(0.052, 0.006, 0.08, mChrome, 0, 0.088, 0.01)); sel.add(box(0.03, 0.004, 0.004, mAmb, 0, 0.0155, -0.055));
    // rotary controller, start button, cupholders
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.03, 28), mChrome); knob.position.set(conX - 0.02, conTop + 0.022, Zr + 0.66); g.add(knob);
    const knobTop = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.004, 24), mGloss); knobTop.position.set(conX - 0.02, conTop + 0.039, Zr + 0.66); g.add(knobTop);
    const start = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 20), new THREE.MeshStandardMaterial({ color: st.carbon ? 0xc4121a : 0x1a1a1c, roughness: 0.3, emissive: st.carbon ? 0x400000 : 0x000000 }));
    start.rotation.x = Math.PI / 2; start.position.set(conX + 0.07, dashY - 0.28, Zface + 0.02); g.add(start);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 6, 24), mChrome); ring.position.set(conX + 0.07, dashY - 0.28, Zface + 0.026); g.add(ring);
    for (const dz of [0.33, 0.43]) { const cup = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.004, 6, 24), mAlu); cup.rotation.x = Math.PI / 2; cup.position.set(conX + 0.05, conTop + 0.004, Zr + 0.75 + dz - 0.38); g.add(cup);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.034, 20), mBlack); hole.rotation.x = -Math.PI / 2; hole.position.set(conX + 0.05, conTop + 0.003, Zr + 0.75 + dz - 0.38); g.add(hole); }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, 2.2), alcantara('#151517')); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.26, Zr + 0.8); g.add(floor);

    /* ---------------- passenger bucket seat with belt ---------------- */
    const seat = new THREE.Group(); seat.position.set(0.42, 0.3, eyeZ + 0.05); g.add(seat);
    seat.add(rbox(0.46, 0.13, 0.5, 0.05, mSeat, 0, 0.1, 0)).rotation;                              // cushion
    const back = rbox(0.46, 0.62, 0.11, 0.06, mSeat, 0, 0.47, 0.27); back.rotation.x = -0.18; seat.add(back);
    for (const sd of [-1, 1]) { const bol = rbox(0.07, 0.5, 0.15, 0.03, mSeat, sd * 0.215, 0.45, 0.24); bol.rotation.set(-0.18, sd * 0.25, 0); seat.add(bol);
      const cb = rbox(0.07, 0.1, 0.46, 0.03, mSeat, sd * 0.215, 0.18, 0); seat.add(cb); }
    const head = rbox(0.24, 0.18, 0.1, 0.05, mSeat, 0, 0.9, 0.34); head.rotation.x = -0.1; seat.add(head);
    const belt0 = box(0.045, 0.75, 0.006, new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.8 }), 0.12, 0.55, 0.2); belt0.rotation.set(-0.18, 0, 0.5); seat.add(belt0);

    /* ---------------- doors ---------------- */
    for (const sd of [-1, 1]) {
      const dz0 = Zf + 0.1, dz1 = eyeZ + 0.6, dmid = (dz0 + dz1) / 2, dlen = Math.abs(dz1 - dz0), dx = sd * (inner + 0.02);
      g.add(rboxS(0.05, belt - 0.32, dlen, 0.05, mPlastic, dx, (belt + 0.32) / 2, dmid));                          // door card base
      g.add(rboxS(0.055, 0.2, dlen - 0.12, 0.06, mDoor, dx - sd * 0.004, belt - 0.13, dmid));                     // leather upper
      g.add(box(0.06, 0.03, dlen - 0.1, mDeco, dx - sd * 0.006, belt - 0.24, dmid));                              // decor strip
      g.add(box(0.012, 0.005, dlen - 0.2, mAmb, dx - sd * 0.032, belt - 0.255, dmid));                            // ambient light
      g.add(rboxS(0.11, 0.045, 0.55, 0.02, mSeat, dx - sd * 0.06, belt - 0.3, eyeZ + 0.12));                       // armrest
      g.add(rboxS(0.08, 0.06, 0.55, 0.025, mPlastic, dx - sd * 0.05, belt - 0.34, eyeZ + 0.12));
      const hdl = box(0.012, 0.02, 0.1, mChrome, dx - sd * 0.035, belt - 0.16, eyeZ - 0.12); g.add(hdl);           // door handle
      g.add(box(0.02, 0.04, 0.14, mBlack, dx - sd * 0.03, belt - 0.16, eyeZ - 0.12));
      for (let k = 0; k < 2; k++) g.add(box(0.012, 0.008, 0.03, mPlastic, dx - sd * 0.07, belt - 0.28, eyeZ + 0.05 + k * 0.04));   // window switches
      const spk = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), grille); spk.position.set(dx - sd * 0.028, 0.45, dz0 + 0.22); spk.rotation.y = -sd * Math.PI / 2; g.add(spk);
      const spr = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.004, 6, 28), mAlu); spr.position.copy(spk.position); spr.rotation.y = -sd * Math.PI / 2; g.add(spr);
      g.add(box(0.06, 0.03, 1.6, mDeco, sd * (inner - 0.005), belt - 0.03, eyeZ - 0.1));                         // sill
      // A-pillar (alcantara) with a tweeter at its foot
      const pa = new THREE.Vector3(sd * (inner - 0.03), cowlH - 0.01, -(cowlX - 0.06)), pb = new THREE.Vector3(sd * (roofHalf - 0.02), H - 0.07, -(roofF + 0.02));
      g.add(between(mFabric, pa, pb, 0.09, 0.05));
      const tw = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), grille); tw.position.copy(pa).add(new THREE.Vector3(-sd * 0.04, 0.035, 0.08)); tw.lookAt(this.eye); g.add(tw);
      const grab = box(0.02, 0.02, 0.16, mPlastic, sd * (roofHalf - 0.05), H - 0.14, eyeZ + 0.05); g.add(grab);   // grab handle
    }

    /* ---------------- roof lining, console, visors ---------------- */
    const lining = new THREE.Mesh(new THREE.PlaneGeometry(roofHalf * 2, Math.abs(b.roofR - roofF) + 0.1), mFabric);
    lining.rotation.x = Math.PI / 2; lining.position.set(0, H - 0.06, -(roofF + b.roofR) / 2); g.add(lining);
    g.add(box(roofHalf * 2, 0.07, 0.1, mFabric, 0, H - 0.08, -roofF + 0.02));
    const ohc = rbox(0.26, 0.03, 0.16, 0.012, mPlastic, 0.02, H - 0.08, -roofF + 0.2); g.add(ohc);                // overhead console
    for (const dx of [-0.06, 0.1]) g.add(box(0.05, 0.004, 0.035, new THREE.MeshStandardMaterial({ color: 0xf0ead8, emissive: 0x202020, roughness: 0.4 }), dx, H - 0.096, -roofF + 0.2));
    g.add(box(0.03, 0.006, 0.02, mAlu, 0.02, H - 0.096, -roofF + 0.15));
    for (const sd of [-1, 1]) { const v = rbox(0.32, 0.014, 0.15, 0.02, mFabric, sd * 0.37, H - 0.07, -roofF + 0.14); g.add(v); }

    /* ---------------- mirrors: one rear camera, three mirrored crops ---------------- */
    this.mirrorMat = new THREE.MeshBasicMaterial({ map: this.rt.texture, toneMapped: false });
    const mirror = (w, h, u0, u1) => { const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setX(k, 1 - (u0 + uv.getX(k) * (u1 - u0))); return new THREE.Mesh(geo, this.mirrorMat); };
    const rvg = new THREE.Group(); rvg.position.set(0.02, H - 0.17, -roofF + 0.1); rvg.rotation.set(0.05, -0.12, 0); g.add(rvg);
    rvg.add(rbox(0.27, 0.085, 0.035, 0.03, mBlack, 0, 0, -0.012)); const rv = mirror(0.25, 0.066, 0, 1); rv.position.z = 0.007; rvg.add(rv);
    g.add(box(0.018, 0.06, 0.018, mBlack, 0.02, H - 0.11, -roofF + 0.08));
    const mz = W / 2 + 0.07, mzZ = -(cowlX - 0.3) + 0.085, my = cowlH + 0.07;
    const lm = mirror(0.15, 0.075, 0.0, 0.34); lm.position.set(-mz, my, mzZ); lm.rotation.y = -0.38; g.add(lm);
    const rm = mirror(0.15, 0.075, 0.66, 1.0); rm.position.set(mz, my, mzZ); rm.rotation.y = 0.3; g.add(rm);

    /* ---------------- steering wheel, hands, column ---------------- */
    const col = new THREE.Group(); col.position.set(eyeX, eyeY - 0.37, eyeZ - 0.5); col.rotation.x = -0.32; g.add(col);
    const wheel = this.wheel = new THREE.Group(); col.add(wheel);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.178, 0.024, 14, 48), mWheel); if (st.flat) rim.scale.y = 0.92; wheel.add(rim);
    const mSpoke = st.carbon ? mDeco : new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.45, metalness: 0.3 });
    for (const a of [0, Math.PI]) { const sp = rbox(0.13, 0.045, 0.02, 0.015, mSpoke, Math.cos(a) * 0.1, -0.01, -0.012); wheel.add(sp);
      for (let k = 0; k < 3; k++) { const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.006, 12), mPlastic); bt.rotation.x = Math.PI / 2; bt.position.set(Math.cos(a) * (0.075 + k * 0.022), -0.008, 0.0); wheel.add(bt);
        const ic = box(0.006, 0.002, 0.002, k === 1 ? mAmb : mAlu, Math.cos(a) * (0.075 + k * 0.022), -0.008, 0.004); wheel.add(ic); } }
    wheel.add(rbox(0.035, 0.11, 0.02, 0.012, mSpoke, 0, -0.11, -0.012));
    wheel.add(rbox(0.11, 0.075, 0.05, 0.03, mWheel, 0, -0.02, -0.022));                                           // airbag hub
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.016, 20), new THREE.MeshBasicMaterial({ color: st.ambient })); badge.position.set(0, -0.02, 0.006); wheel.add(badge);
    if (st.stripe) ['#1c69d4', '#2f2f80', '#e11b22'].forEach((c, k) => wheel.add(box(0.008, 0.026, 0.05, new THREE.MeshBasicMaterial({ color: c }), -0.009 + k * 0.009, 0.178 * (st.flat ? 0.92 : 1), 0)));
    else wheel.add(box(0.012, 0.026, 0.05, new THREE.MeshBasicMaterial({ color: st.ambient }), 0, 0.178 * (st.flat ? 0.92 : 1), 0));
    const glove = leather('#1a1a1c', '#1a1a1c', 1, 1, false);
    for (const sd of [-1, 1]) { const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 10), glove); hand.scale.set(1, 1.55, 0.9); hand.position.set(sd * 0.176, -0.005, 0.022); wheel.add(hand);
      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.035, 4, 8), glove); thumb.position.set(sd * 0.15, 0.02, 0.035); thumb.rotation.z = sd * 0.9; wheel.add(thumb);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.05, 0.42, 12), alcantara('#22242a'));
      arm.position.set(sd * 0.22, -0.11, 0.2); arm.rotation.set(1.0, 0, sd * 0.45); wheel.add(arm); }
    for (const sd of [-1, 1]) col.add(rbox(0.05, 0.12, 0.01, 0.015, st.carbon ? mDeco : mSpoke, sd * 0.13, 0.04, -0.06));   // shift paddles
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.05, 0.3, 16), mPlastic); stem.rotation.x = Math.PI / 2; stem.position.z = -0.18; col.add(stem);
    for (const sd of [-1, 1]) { const st2 = box(0.11, 0.012, 0.012, mPlastic, sd * 0.09, 0.01, -0.12); st2.rotation.z = sd * -0.15; col.add(st2); }   // indicator / wiper stalks

    /* ---------------- head-up display, just above the dash ---------------- */
    if (spec.id !== 'maybach') {
      this.hud = canvas(256, 96);
      const hm = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.064), new THREE.MeshBasicMaterial({ map: this.hud.t, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
      const hd = 1.0, ha = Math.atan2(eyeY - dashY, eyeZ - Zr) * 0.62;            // a little above the dash top line
      hm.position.set(eyeX + 0.03, eyeY - hd * Math.tan(ha), eyeZ - hd); hm.rotation.x = ha; g.add(hm);
    } else this.hud = null;

    /* ---------------- windscreen: tint, sun strip, rain, wipers ---------------- */
    const glass = new THREE.Group(); glass.position.set(0, cowlH - 0.04, -(cowlX - 0.06)); glass.rotation.x = this.glassAngle; g.add(glass);
    const glassLen = Math.hypot(cowlX - roofF, H - cowlH);
    const tint = canvas(8, 128); { const x = tint.g, gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(20,40,60,0.55)'); gr.addColorStop(0.14, 'rgba(20,40,60,0.0)');
      gr.addColorStop(0.8, 'rgba(160,190,210,0.03)'); gr.addColorStop(1, 'rgba(10,10,12,0.25)'); x.fillStyle = gr; x.fillRect(0, 0, 8, 128); tint.t.needsUpdate = true; }
    const tp = new THREE.Mesh(new THREE.PlaneGeometry(roofHalf * 2 + 0.25, glassLen), new THREE.MeshBasicMaterial({ map: tint.t, transparent: true, depthWrite: false }));
    tp.position.set(0, glassLen / 2, 0.008); glass.add(tp);
    this.drops = canvas(512, 256); this._drawDrops();
    this.dropMat = new THREE.MeshBasicMaterial({ map: this.drops.t, transparent: true, opacity: 0, depthWrite: false });
    const dropPlane = new THREE.Mesh(new THREE.PlaneGeometry(roofHalf * 2 + 0.25, glassLen), this.dropMat); dropPlane.position.set(0, glassLen / 2, 0.012); glass.add(dropPlane);
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
