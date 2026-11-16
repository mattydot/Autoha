import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CARS, buildPlayerCar, setCarColor, MATS } from './cars.js';
import { World, LANES, ROAD } from './world.js';
import { Sky, WEATHERS } from './sky.js';
import { Traffic } from './traffic.js';
import { GameAudio } from './audio.js';
import { STATIONS } from './radio.js';

const $ = (id) => document.getElementById(id);
const KMH = 3.6, clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;

/* ------------------------------ settings ------------------------------ */
const DEFAULTS = { master: 80, music: 70, engine: 80, sfx: 80, time: 'cycle', weather: 'dynamic', traffic: '1', quality: 'high', units: 'kmh', shake: '1', car: 0, colors: {}, station: 1, best: 0 };
let settings = { ...DEFAULTS };
try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('autobahn-rush') || '{}') }; } catch {}
const save = () => { try { localStorage.setItem('autobahn-rush', JSON.stringify(settings)); } catch {} };

/* ------------------------------ renderer ------------------------------ */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 6000);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

let composer = null, bloom = null;
function setupQuality() {
  const q = settings.quality, dpr = Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : q === 'medium' ? 1.5 : 1);
  renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  if (composer) { composer.dispose(); composer = null; }
  if (q !== 'low') {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: q === 'high' ? 4 : 2 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.55, 0.7, 0.9); composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
}
addEventListener('resize', setupQuality);

/* ------------------------------ world ------------------------------ */
const sky = new Sky(scene, renderer);
const world = new World(scene);
const traffic = new Traffic(world);
const audio = new GameAudio();
sky.onThunder = (d) => audio.thunder(d);

const spot = new THREE.SpotLight(0xfff0d8, 0, 320, 0.34, 0.95, 0.9);
const spotTarget = new THREE.Object3D(); scene.add(spot, spotTarget); spot.target = spotTarget;

const player = { s: 0, x: LANES[1], v: 0, vx: 0, steer: 0, gear: 1, rpm: 900, shiftT: 0, damage: 0, L: 4.8, W: 1.9, spec: null, mesh: null, accel: 0, pitch: 0, scrape: 0, gearV: [], thrAudio: 0 };
const run = { score: 0, combo: 0, comboT: 0, near: 0, fines: 0, top: 0, time: 0, limit: 0, clubs: {}, wreckT: 0 };
let mode = 'menu', prevScreen = 'main', camMode = 0, shake = 0, orbit = 0.75, orbitV = 0, revHeld = false, flashT = 0, camX = 0, touchMode = false;

function setCar(i) {
  i = (i + CARS.length) % CARS.length; settings.car = i; save();
  if (player.mesh) { scene.remove(player.mesh); player.mesh.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); }
  const spec = player.spec = CARS[i], ci = settings.colors[spec.id] || 0;
  player.mesh = buildPlayerCar(spec, ci); scene.add(player.mesh);
  player.L = spec.body.L; player.W = spec.body.W;
  const n = spec.gears, v1 = (spec.vmax > 380 ? 100 : spec.vmax < 260 ? 60 : 74) / KMH, vN = spec.vmax * 1.03 / KMH;
  player.gearV = Array.from({ length: n }, (_, g) => v1 * Math.pow(vN / v1, g / (n - 1)));
  audio.setEngine(spec); updateGarageUI();
}

/* ------------------------------ input ------------------------------ */
const keys = {};
const input = { throttle: 0, brake: 0, steer: 0 };
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return; keys[e.code] = true; boot();
  if (e.code === 'Escape' || e.code === 'KeyP') { if (mode === 'play') go('pause'); else if (mode === 'paused') go(document.querySelector('#s-pause.hidden') ? 'back' : 'resume'); else if (mode !== 'over') go('main'); }
  if (e.code === 'KeyQ') audio.radio?.cycle(-1); if (e.code === 'KeyE') audio.radio?.cycle(1); if (e.code === 'KeyN') audio.radio?.next();
  if (e.code === 'KeyM') audio.radio?.stop();
  if (mode === 'play') {
    if (e.code === 'KeyC') camMode = (camMode + 1) % 3;
    if (e.code === 'KeyF') { flashT = 0.35; traffic.flashAt(player); }
    if (e.code === 'KeyH') audio.horn(true);
  } else if (e.code === 'Enter' && (mode === 'menu' || mode === 'over')) go('play');
  if (mode === 'garage') { if (e.code === 'ArrowLeft') setCar(settings.car - 1); if (e.code === 'ArrowRight') setCar(settings.car + 1); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'KeyH') audio.horn(false); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; audio.horn(false); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') go('pause'); });
const touch = {};
for (const b of document.querySelectorAll('#touch button')) { const k = b.dataset.t; b.addEventListener('pointerdown', (e) => { e.preventDefault(); touch[k] = true; }); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => { touch[k] = false; }); }
addEventListener('touchstart', () => { touchMode = true; }, { once: true, passive: true });

function readInput(dt) {
  let t = keys.KeyW || keys.ArrowUp ? 1 : 0, b = keys.KeyS || keys.ArrowDown || keys.Space ? 1 : 0, s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  if (touchMode) { t = touch.brake ? 0 : 1; b = touch.brake ? 1 : 0; s = (touch.right ? 1 : 0) - (touch.left ? 1 : 0); }
  const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
  if (gp) { if (Math.abs(gp.axes[0]) > 0.12) s = gp.axes[0]; t = Math.max(t, gp.buttons[7]?.value || 0, gp.buttons[0]?.value || 0); b = Math.max(b, gp.buttons[6]?.value || 0); }
  input.throttle = t; input.brake = b; input.steer += (s - input.steer) * Math.min(1, dt * 9);
}

/* ------------------------------ game flow ------------------------------ */
function startRun() {
  world.reset(); traffic.reset();
  Object.assign(player, { s: 0, x: LANES[1], v: 100 / KMH, vx: 0, damage: 0, shiftT: 0, scrape: 0 });
  player.gear = 1; while (player.gear < player.gearV.length && player.v > player.gearV[player.gear - 1] * 0.8) player.gear++;
  Object.assign(run, { score: 0, combo: 0, comboT: 0, near: 0, fines: 0, top: 0, time: 0, limit: 0, clubs: {}, wreckT: 0 });
  camX = player.x; $('toasts').innerHTML = '';
  toast('FREIE FAHRT', 'No limit. Don\'t hit anything.', 'good');
}
function toast(text, sub, cls = '') {
  const t = document.createElement('div'); t.className = 'toast ' + cls; t.textContent = text;
  if (sub) { const s = document.createElement('small'); s.textContent = sub; t.appendChild(s); }
  const box = $('toasts'); box.appendChild(t); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => t.remove(), 2400);
}
const SCREENS = ['main', 'garage', 'music', 'settings', 'pause', 'over'];
function show(name) { for (const s of SCREENS) $('s-' + s).classList.toggle('hidden', s !== name); $('hud').classList.toggle('hidden', mode !== 'play'); $('touch').classList.toggle('hidden', !(touchMode && mode === 'play')); }
function go(target) {
  audio.click();
  if (target === 'back') target = prevScreen;
  switch (target) {
    case 'play': mode = 'play'; startRun(); show(null); break;
    case 'resume': mode = 'play'; show(null); break;
    case 'pause': mode = 'paused'; prevScreen = 'pause'; show('pause'); break;
    case 'main': mode = 'menu'; prevScreen = 'main'; traffic.reset(); updateMainUI(); show('main'); break;
    case 'garage': mode = 'garage'; prevScreen = 'main'; traffic.reset(); updateGarageUI(); show('garage'); break;
    case 'music': if (mode !== 'paused') { mode = 'menu'; prevScreen = 'main'; } updateMusicUI(); show('music'); break;
    case 'settings': if (mode !== 'paused') { mode = 'menu'; prevScreen = 'main'; } show('settings'); break;
    case 'over': mode = 'over'; show('over'); break;
  }
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) { boot(); go(b.dataset.go); } });

let booted = false;
async function boot() {
  if (booted) { audio.resume(); return; } booted = true;
  await audio.init(); applyAudioSettings(); audio.setEngine(player.spec);
  audio.radio.onChange = (info) => { settings.station = audio.radio.station; save(); updateRadioUI(info); };
  await audio.radio.user.ready; audio.radio.setStation(settings.station);
}
addEventListener('pointerdown', boot);

function fmtSpeed(ms) { return Math.round(ms * (settings.units === 'mph' ? 2.23694 : 3.6)); }

function gameOver() {
  const best = Math.max(settings.best, Math.round(run.score)), isBest = run.score > settings.best && run.score > 0; settings.best = best; save();
  $('o-score').textContent = Math.round(run.score).toLocaleString('en'); $('o-best').textContent = isBest ? 'NEW BEST' : 'BEST ' + best.toLocaleString('en');
  $('o-dist').textContent = (player.s / 1000).toFixed(1); $('o-top').textContent = fmtSpeed(run.top); $('o-unit').textContent = 'top ' + (settings.units === 'mph' ? 'mph' : 'km/h');
  $('o-near').textContent = run.near; $('o-fines').textContent = run.fines; go('over');
}

/* ------------------------------ physics ------------------------------ */
function drive(dt) {
  const spec = player.spec, N = player.gearV.length, wrecked = run.wreckT > 0;
  const grip = 1 - sky.wet * 0.3 - sky.snowCover * 0.4;
  const thr = wrecked ? 0 : input.throttle, brk = wrecked ? 1 : input.brake;
  let rpm = Math.max(spec.idle, spec.redline * player.v / player.gearV[player.gear - 1]);
  if (player.shiftT > 0) player.shiftT -= dt;
  else if (rpm > spec.redline * 0.965 && player.gear < N) { player.gear++; player.shiftT = 0.13; }
  else if (player.gear > 1 && player.v < player.gearV[player.gear - 2] * (thr > 0.8 ? 0.8 : 0.55)) { player.gear--; player.shiftT = 0.1; }
  rpm = Math.min(spec.redline, Math.max(spec.idle, spec.redline * player.v / player.gearV[player.gear - 1]));
  const rn = rpm / spec.redline, vmax = spec.vmax / KMH, P = spec.ps * 735.5 * 0.86, kd = P / (vmax * vmax * vmax);
  const curve = Math.min(1, 0.25 + rn / 0.78) * (rn > 0.975 ? 1 - (rn - 0.975) * 6 : 1);
  const power = player.shiftT > 0 ? 0 : thr;
  let F = power * Math.min(spec.mass * 9.81 * (spec.awd ? 1.05 : 0.82) * grip, P * curve / Math.max(player.v, 6));
  let a = (F - kd * player.v * player.v) / spec.mass - 0.14 - (thr < 0.05 ? 0.5 : 0) - brk * 11.5 * grip;
  if (wrecked) a = -14;
  player.v = Math.max(0, player.v + a * dt); player.accel = a;
  player.s += player.v * dt;
  player.rpm += (rpm - player.rpm) * Math.min(1, dt * 16); player.thrAudio = power;

  // lateral
  const maxLat = (2.6 + Math.min(player.v, 80) * 0.052) * spec.handling * Math.min(1, player.v / 8);
  player.vx += ((wrecked ? 0 : input.steer) * maxLat - player.vx) * Math.min(1, dt * (5.5 * grip * spec.handling));
  player.x += player.vx * dt;
  const xmin = ROAD.left - 0.45 + player.W / 2, xmax = ROAD.right + 0.55 - player.W / 2;
  player.scrape = 0;
  if (player.x < xmin || player.x > xmax) {
    player.x = clamp(player.x, xmin, xmax); player.vx *= -0.2; player.scrape = Math.min(1, player.v / 30);
    player.v -= player.v * 0.45 * dt; hurt(dt * (3 + player.v * 0.2)); shake = Math.max(shake, 0.05);
  }
}
function hurt(d) { if (run.wreckT > 0) return; player.damage = Math.min(100, player.damage + d); if (player.damage >= 100) { run.wreckT = 0.001; audio.crash(1); shake = 0.5; toast('TOTALSCHADEN', '', 'bad'); } }

function collisions() {
  for (const c of traffic.cars) {
    const dx = player.x - c.x, ds = c.s - player.s, sw = (player.W + c.W) / 2, sl = (player.L + c.L) / 2;
    const ox = sw - Math.abs(dx), os = sl - Math.abs(ds);
    if (ox > 0.06 && os > 0) {
      const dv = player.v - c.v, first = c.hit <= 0;
      if (ox < 0.5 && ox < os) { // side swipe
        const dir = Math.sign(dx) || 1; player.x += dir * ox; player.vx = dir * 2.2;
        if (first) { hurt(6 + Math.abs(dv) * 0.5); audio.crash(0.3); shake = Math.max(shake, 0.18); player.v *= 0.97; }
        c.hit = 0.5;
      } else if (ds > 0) { // we rammed them
        player.s = c.s - sl - 0.02; if (first) { hurt(Math.abs(dv) * 3.1 + 4); audio.crash(clamp(Math.abs(dv) / 30, 0.3, 1)); shake = Math.max(shake, clamp(Math.abs(dv) / 40, 0.15, 0.6)); }
        const vv = (player.v * 0.6 + c.v * 0.4); c.v = vv + 1; player.v = Math.max(0, vv - 2); c.hit = 0.8;
      } else { // rear-ended by traffic
        c.s = player.s - sl - 0.02; if (first) { hurt(Math.abs(dv) * 2 + 3); audio.crash(0.4); shake = Math.max(shake, 0.2); }
        const vv = (player.v + c.v) / 2; player.v = vv + 1; c.v = Math.max(0, vv - 2); c.hit = 0.8;
      }
      run.combo = 0;
    }
    // overtakes, near misses
    if (!c.passed && player.s - player.L / 2 > c.s - c.L * 0.25) {
      c.passed = true; const gap = Math.abs(dx) - sw, dvk = (player.v - c.v) * KMH;
      if (gap < 5 && dvk > 15) audio.whoosh(clamp((c.x - player.x) / 4, -1, 1), clamp(dvk / 200, 0, 1) * (c.kind === 'truck' ? 1.3 : 1));
      if (gap < 1.15 && gap > -0.05 && dvk > 30 && c.hit <= 0 && run.wreckT <= 0) {
        run.combo = Math.min(9, run.combo + 1); run.comboT = 5; run.near++; const pts = Math.round((100 + dvk) * run.combo); run.score += pts;
        toast(`NEAR MISS ×${run.combo}`, `+${pts}`, 'good'); audio.bonus();
      }
    } else if (c.passed && c.s - c.L / 2 > player.s + player.L / 2 + 4) c.passed = false;
  }
}

function rules(dt) {
  const vk = player.v * KMH, limit = world.limitAt(player.s);
  run.time += dt; run.top = Math.max(run.top, player.v);
  if (run.wreckT <= 0) run.score += player.v * dt * 0.1 * Math.pow(vk / 100, 2);
  if (run.comboT > 0) { run.comboT -= dt; if (run.comboT <= 0) run.combo = 0; }
  if (limit !== run.limit) { if (limit) toast(`TEMPOLIMIT ${limit}`, 'Blitzer ahead? Maybe.', ''); else toast('FREIE FAHRT', 'End of all restrictions', 'good'); run.limit = limit; }
  for (const b of world.blitzers) if (!b.done && player.s > b.s) {
    b.done = true; const over = vk - b.limit;
    if (over > 9) { const fine = Math.round(over * 15); run.score = Math.max(0, run.score - fine); run.fines++; b.obj.userData.flash.opacity = 1; audio.blitz();
      const f = $('flash'); f.style.transition = 'none'; f.style.background = '#ff3020'; f.style.opacity = 0.55; requestAnimationFrame(() => { f.style.transition = 'opacity 0.5s'; f.style.opacity = 0; });
      toast('GEBLITZT!', `${fmtSpeed(player.v)} in a ${b.limit} zone · −${fine}`, 'bad'); }
  }
  for (const club of [300, 350, 400]) if (vk >= club && !run.clubs[club]) { run.clubs[club] = 1; run.score += club * 5; toast(`${club} KM/H CLUB`, `+${club * 5}`, 'good'); audio.bonus(); }
  if (run.wreckT > 0) { run.wreckT += dt; if (run.wreckT > 2.2 && mode === 'play') gameOver(); }
}

/* ------------------------------ per-frame visuals ------------------------------ */
const _v = new THREE.Vector3(), _t = new THREE.Vector3();
function updateCar(dt) {
  const m = player.mesh, u = m.userData;
  m.position.set(player.x, 0, 0);
  const wreck = run.wreckT > 0 && mode !== 'menu' && mode !== 'garage';
  m.rotation.y = wreck ? m.rotation.y + dt * player.v * 0.12 : -Math.atan2(player.vx, Math.max(player.v, 12)) * 1.6;
  player.pitch += (clamp(player.accel, -12, 8) * 0.0035 - player.pitch) * Math.min(1, dt * 6);
  m.rotation.x = player.pitch; m.rotation.z = -player.vx * 0.012;
  const spin = player.v * dt / u.wheelR; for (const w of u.wheels) w.rotation.z -= spin;
  for (const f of u.front) f.rotation.y = -input.steer * 0.14;
  const braking = mode === 'play' && (input.brake > 0.1 || wreck);
  u.tail.emissiveIntensity = braking ? 8 : 0.35 + sky.night * 2 + sky.cur.rain;
  const needLights = clamp(sky.night + sky.cur.rain * 0.5 + sky.cur.fog * 50, 0, 1);
  flashT = Math.max(0, flashT - dt);
  spot.intensity = needLights * 260 + (flashT > 0 ? 500 : 0);
  spot.position.set(player.x, 0.95, -player.L / 2 + 0.2); spotTarget.position.set(player.x, 0.1, -130);
  if (flashT > 0) MATS.head.emissiveIntensity = 14;
}

function updateCamera(dt, t) {
  const vn = clamp(player.v / 110, 0, 1.2), sh = settings.shake === '1' ? 1 : 0;
  shake = Math.max(0, shake - dt * 1.4);
  if (mode === 'play' || mode === 'paused' || mode === 'over') {
    camX += (player.x - camX) * Math.min(1, dt * 6);
    const fov = 58 + 30 * vn * vn / (0.4 + vn);
    if (camMode === 0) { camera.position.set(camX * 0.92, 2.0 + vn * 0.15, 6.3 - vn * 0.5); _t.set(player.x * 0.95, 1.05, -16); }
    else if (camMode === 1) { camera.position.set(camX * 0.8, 3.6, 10.5); _t.set(player.x * 0.9, 0.8, -20); }
    else { camera.position.set(player.x, player.spec.body.H + 0.22, 0.25); _t.set(player.x + player.vx * 0.3, player.spec.body.H - 0.25, -30); }
    const k = (shake + vn * vn * 0.02) * sh;
    camera.position.x += (Math.random() - 0.5) * k; camera.position.y += (Math.random() - 0.5) * k * 0.7;
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 4);
  } else {
    orbit += orbitV * dt; orbitV *= Math.pow(0.02, dt);
    const garage = mode === 'garage', a = garage ? orbit : 0.75 + Math.sin(t * 0.07) * 0.55, r = garage ? 6.6 : 7.4;
    camera.position.set(player.x + Math.sin(a) * r, garage ? 1.45 : 1.6 + Math.sin(t * 0.05) * 0.3, -Math.cos(a) * r);
    _t.set(player.x, 0.75, 0);
    // shift the car to the right half so the menu has room
    if (innerWidth > 720) { _v.subVectors(_t, camera.position).normalize(); _v.set(_v.z, 0, -_v.x); _t.addScaledVector(_v, 1.9); }
    camera.fov += (38 - camera.fov) * Math.min(1, dt * 4);
  }
  camera.lookAt(_t); camera.updateProjectionMatrix();
}

const hud = { last: {} };
function setText(id, v) { if (hud.last[id] !== v) { hud.last[id] = v; $(id).textContent = v; } }
function updateHUD() {
  const vk = player.v * KMH, limit = run.limit;
  setText('h-speed', fmtSpeed(player.v)); setText('h-unit', settings.units === 'mph' ? 'mph' : 'km/h'); setText('h-gear', player.gear);
  $('h-rpm').style.width = (player.rpm / player.spec.redline * 100).toFixed(1) + '%';
  setText('h-score', Math.round(run.score).toLocaleString('en')); setText('h-dist', (player.s / 1000).toFixed(1) + ' km');
  setText('h-combo', run.combo > 1 ? `COMBO ×${run.combo}` : '');
  const d = $('h-damage'); d.style.width = (100 - player.damage) + '%'; d.style.background = player.damage > 66 ? '#ff5a4f' : player.damage > 33 ? '#ffd60a' : '#4ade80';
  const sign = $('h-sign'), over = limit && vk > limit + 5, cls = 'sign' + (limit ? '' : ' free') + (over ? ' over' : '');
  if (sign.className !== cls) sign.className = cls; setText('h-sign', limit ? String(settings.units === 'mph' ? Math.round(limit / 1.609) : limit) : '');
  document.querySelector('.speed').classList.toggle('over', !!over);
  setText('h-clock', sky.clockString()); const w = WEATHERS[sky.weather]; setText('h-weather', `${w.icon} ${w.label}`);
}

/* ------------------------------ menus ------------------------------ */
function updateMainUI() {
  $('m-car').textContent = player.spec ? player.spec.name : ''; $('m-best').textContent = settings.best ? `BEST ${settings.best.toLocaleString('en')} PTS` : '';
  $('m-radio').textContent = audio.radio && audio.radio.station >= 0 ? STATIONS[audio.radio.station].name : 'Radio';
}
function updateGarageUI() {
  const s = player.spec; if (!s) return; const ci = settings.colors[s.id] || 0;
  $('g-index').textContent = `${settings.car + 1} / ${CARS.length}`; $('g-name').textContent = s.name; $('g-sub').textContent = s.sub; $('g-engine').textContent = s.engine;
  $('g-ps').textContent = s.ps; $('g-vmax').textContent = s.vmax; $('g-acc').textContent = s.zeroTo100.toFixed(1);
  $('g-b1').style.width = (s.vmax / 440 * 100) + '%'; $('g-b2').style.width = clamp((5.2 - s.zeroTo100) / 3 * 100, 10, 100) + '%'; $('g-b3').style.width = clamp((s.handling - 0.6) / 0.55 * 100, 10, 100) + '%';
  const box = $('g-colors'); box.innerHTML = '';
  s.colors.forEach((c, i) => { const b = document.createElement('button'); b.style.background = '#' + c.toString(16).padStart(6, '0'); if (i === ci) b.className = 'on';
    b.onclick = () => { settings.colors[s.id] = i; save(); setCarColor(player.mesh, s, i); updateGarageUI(); audio.click(); }; box.appendChild(b); });
  updateMainUI();
}
$('g-prev').onclick = () => { setCar(settings.car - 1); audio.click(); }; $('g-next').onclick = () => { setCar(settings.car + 1); audio.click(); };
const rev = $('g-rev'); rev.addEventListener('pointerdown', () => { boot(); revHeld = true; }); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) rev.addEventListener(ev, () => { revHeld = false; });
let dragging = false;
addEventListener('pointerdown', (e) => { if (mode === 'garage' && !e.target.closest('.panel')) dragging = true; });
addEventListener('pointerup', () => { dragging = false; });
addEventListener('pointermove', (e) => { if (dragging) { orbit -= e.movementX * 0.008; orbitV = -e.movementX * 0.3; } });

function updateRadioUI(info) {
  info = info || audio.radio?.info; if (!info) return;
  setText('h-station', info.station); setText('h-freq', info.freq); setText('h-track', info.title || '—'); setText('h-artist', info.artist);
  $('mu-station').textContent = info.station + (info.freq ? ' · ' + info.freq : ''); $('mu-track').textContent = info.title || '—'; $('mu-artist').textContent = info.artist;
  const el = $('h-radio'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  for (const b of document.querySelectorAll('#mu-stations button')) b.classList.toggle('on', +b.dataset.i === audio.radio.station);
  updateMainUI();
}
function updateMusicUI() {
  const box = $('mu-stations'); box.innerHTML = '';
  STATIONS.forEach((s, i) => { const b = document.createElement('button'); b.dataset.i = i; b.innerHTML = `<em>${s.freq}</em><span>${s.name}</span><small>${s.genre}</small>`;
    b.onclick = async () => { await boot(); audio.radio.setStation(i); audio.tuning(); }; box.appendChild(b); });
  const ul = $('mu-user'); ul.innerHTML = ''; const list = audio.radio ? audio.radio.user.list : [];
  list.forEach((t, i) => { const d = document.createElement('div'); const n = document.createElement('span'); n.textContent = t.name; const x = document.createElement('button'); x.textContent = '✕';
    x.onclick = async () => { await audio.radio.user.remove(i); updateMusicUI(); }; d.append(n, x); ul.appendChild(d); });
  updateRadioUI();
}
$('mu-prev').onclick = () => audio.radio?.next(-1); $('mu-next').onclick = () => audio.radio?.next(1); $('mu-off').onclick = () => audio.radio?.stop();
$('mu-files').addEventListener('change', async (e) => { await boot(); await audio.radio.user.add([...e.target.files]); e.target.value = ''; audio.radio.setStation(STATIONS.findIndex((s) => s.user), Math.max(0, audio.radio.user.list.length - 1)); updateMusicUI(); });

function applyAudioSettings() { audio.vol = { master: settings.master / 100, music: settings.music / 100, engine: settings.engine / 100, sfx: settings.sfx / 100 }; audio.applyVolumes(); }
function applyWorldSettings() { sky.setTimeMode(settings.time); sky.setWeatherMode(settings.weather); traffic.density = +settings.traffic; }
for (const el of document.querySelectorAll('[data-set]')) {
  const k = el.dataset.set; el.value = settings[k];
  el.addEventListener('input', () => { settings[k] = el.type === 'range' ? +el.value : el.value; save(); applyAudioSettings(); applyWorldSettings(); if (k === 'quality') setupQuality(); });
}

/* ------------------------------ main loop ------------------------------ */
const clock = new THREE.Clock();
let elapsed = 0;
function frame() {
  requestAnimationFrame(frame);
  simulate(Math.min(0.05, clock.getDelta()));
  render();
}
function simulate(dt) {
  if (mode === 'paused') { audio.update({ rpm: player.spec.idle, throttle: 0, engineOn: false, bedsOn: false, speed: 0, wet: 0, rain: sky.cur.rain, scrape: 0 }); return; }
  if (run.wreckT > 0 && mode === 'play') dt *= 0.45;
  elapsed += dt; readInput(dt);
  let engineOn = true, thr = 0;
  if (mode === 'play') { drive(dt); collisions(); rules(dt); thr = player.thrAudio; }
  else if (mode === 'over') { player.v = Math.max(0, player.v - 14 * dt); player.s += player.v * dt; player.rpm += (player.spec.idle - player.rpm) * dt * 3; engineOn = false; }
  else { // menu / garage: the car idles or cruises for the camera
    const tv = mode === 'garage' ? 0 : 118 / KMH; player.v += (tv - player.v) * Math.min(1, dt * 0.9); player.s += player.v * dt;
    player.x += (LANES[1] - player.x) * Math.min(1, dt * 2); player.vx = 0; player.accel = 0; player.damage = 0; run.wreckT = 0; input.steer = 0;
    const spec = player.spec;
    if (mode === 'garage') { const target = revHeld ? spec.redline * 0.97 : spec.idle; player.rpm += (target - player.rpm) * Math.min(1, dt * (revHeld ? 2.6 : 2.0)); thr = revHeld ? 1 : 0; }
    else { player.rpm += (spec.redline * 0.3 - player.rpm) * dt * 2; thr = 0.2; engineOn = false; }
  }
  world.update(dt, player.s, sky);
  traffic.update(dt, player, sky, mode === 'play');
  updateCar(dt); updateCamera(dt, elapsed);
  sky.update(dt, camera, player.v, player.s);
  if (mode === 'play') updateHUD();
  audio.update({ rpm: player.rpm, throttle: thr, engineOn, bedsOn: mode === 'play', interior: camMode === 2, speed: player.v, wet: sky.wet, rain: sky.cur.rain, scrape: player.scrape });
  if (bloom) bloom.strength = 0.35 + sky.night * 0.45 + sky.cur.fog * 20;
  renderer.toneMappingExposure = 1.0 - sky.night * 0.1;
}
function render() { if (composer) composer.render(); else renderer.render(scene, camera); }

setupQuality(); applyWorldSettings(); setCar(settings.car); updateMainUI(); updateMusicUI();
sky.setWeather(settings.weather === 'dynamic' ? 'clear' : settings.weather, true);
window.__game = { simulate, input, keys, player, run, sky, world, traffic, audio, settings, go, setCar, get mode() { return mode; }, set cam(v) { camMode = v; }, set orbit(v) { orbit = v; } };
frame();
