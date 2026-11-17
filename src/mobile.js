// Phone support: on-screen pedals and steering (multi-touch), tilt steering,
// fullscreen + landscape lock, keeping the screen awake, and vibration.
export const isTouch = (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0) && !matchMedia('(pointer: fine)').matches;

export class TouchControls {
  constructor(root, onAction) {
    this.root = root; this.state = { left: false, right: false, gas: false, brake: false };
    this.mode = 'buttons'; this.autoGas = true; this.tilt = 0; this.tiltZero = 0; this._raw = 0; this.hasTilt = false;
    // hold buttons: each finger is tracked on its own, and a thumb can slide from one steer button to the other
    const held = new Map();   // pointerId -> key
    const keyAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest('[data-t]') ? el.closest('[data-t]').dataset.t : null; };
    const sync = () => { for (const k in this.state) this.state[k] = false; for (const k of held.values()) if (k) this.state[k] = true;
      for (const b of root.querySelectorAll('[data-t]')) b.classList.toggle('down', this.state[b.dataset.t]); };
    root.addEventListener('pointerdown', (e) => { const k = keyAt(e.clientX, e.clientY); if (!k) return; e.preventDefault(); held.set(e.pointerId, k); sync(); if (k === 'left' || k === 'right') haptic(6); }, { passive: false });
    root.addEventListener('pointermove', (e) => { if (!held.has(e.pointerId)) return; const k = keyAt(e.clientX, e.clientY), was = held.get(e.pointerId);
      if (k !== was && (k === 'left' || k === 'right') && (was === 'left' || was === 'right')) { held.set(e.pointerId, k); sync(); } });
    const up = (e) => { if (held.delete(e.pointerId)) sync(); };
    for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, up);
    // tap buttons: pause, camera, Lichthupe, radio, recover
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (b) { haptic(8); onAction(b.dataset.a); } });
    root.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('blur', () => { held.clear(); sync(); });
    // tilt: the angle of "up" in screen space, like turning a steering wheel
    addEventListener('devicemotion', (e) => {
      const g = e.accelerationIncludingGravity; if (!g || g.x == null) return;
      const a = ((screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0) * Math.PI / 180;
      let sx = g.x * Math.cos(a) - g.y * Math.sin(a), sy = g.x * Math.sin(a) + g.y * Math.cos(a);
      if (sy < 0) { sx = -sx; sy = -sy; }            // iOS reports the opposite sign to Android
      this._raw = -Math.atan2(sx, Math.max(0.5, sy)); this.hasTilt = true;
    });
  }
  setMode(mode, autoGas) {
    this.mode = mode; this.autoGas = autoGas;
    this.root.classList.toggle('tilt', mode === 'tilt'); this.root.classList.toggle('autogas', autoGas);
    if (mode === 'tilt') requestMotion();
  }
  calibrate() { this.tiltZero = this._raw; }
  /** -1..1, already smoothed for tilt */
  get steer() {
    if (this.mode === 'tilt') { const d = this._raw - this.tiltZero, dz = 0.035, v = Math.abs(d) < dz ? 0 : (d - Math.sign(d) * dz) / 0.38; return Math.max(-1, Math.min(1, v)); }
    return (this.state.right ? 1 : 0) - (this.state.left ? 1 : 0);
  }
  get throttle() { return this.state.brake ? 0 : this.autoGas || this.state.gas ? 1 : 0; }
  get brake() { return this.state.brake ? 1 : 0; }
}

export async function requestMotion() {
  try { if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission) await DeviceMotionEvent.requestPermission(); } catch {}
}

let wake = null;
/** fullscreen, landscape, screen kept on (all best effort: browsers decide) */
export async function enterGameMode() {
  try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch {}
  try { await screen.orientation.lock('landscape'); } catch {}
  try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch {}
}
export function releaseWake() { try { wake?.release(); } catch {} wake = null; }

let hapticsOn = true;
export function setHaptics(on) { hapticsOn = on; }
export function haptic(pattern) { if (hapticsOn && isTouch && navigator.vibrate) try { navigator.vibrate(pattern); } catch {} }
