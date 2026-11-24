import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SpeedStreaks, RadialBlurShader } from './speedfx.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CARS, buildPlayerCar, setCarColor, MATS } from './cars.js';
import { World, LANES, PACE } from './world.js';
import { Sky, WEATHERS } from './sky.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { Ads } from './ads.js';
import { t, applyLang, resolveLang, LANGS, LANG_NAMES } from './i18n.js';
import { Career, priceOf, PAINT_PRICE } from './career.js';
import { Store } from './store.js';
import { Games } from './games.js';
import { installErrorLog, sendErrorReport } from './errors.js';
installErrorLog();
const PRIVACY_URL = 'https://mattydot.github.io/Autoha/privacy.html';
import { GameAudio } from './audio.js';
import { STATIONS } from './radio.js';
import { Vehicle } from './vehicle.js';
import { sat, resolve, walls } from './physics.js';
import { Cockpit } from './cockpit.js';
import { Fx } from './fx.js';
import { isTouch, TouchControls, enterGameMode, releaseWake, haptic, setHaptics } from './mobile.js';

const $ = (id) => document.getElementById(id);
const KMH = 3.6, clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;

/* ------------------------------ settings ------------------------------ */
const DEFAULTS = { master: 80, music: 70, engine: 80, sfx: 80, time: 'cycle', weather: 'dynamic', traffic: '1', quality: 'auto', units: 'kmh', shake: '1', car: 0, colors: {}, station: 0, best: 0, hidden: {}, cam: 0, controls: 'buttons', gas: 'auto', haptics: '1', lang: 'auto', tutorialDone: false, noAds: false, lastCar: 0 };
let settings = { ...DEFAULTS };
try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('autobahn-rush') || '{}') }; } catch {}
const save = () => { try { localStorage.setItem('autobahn-rush', JSON.stringify(settings)); } catch {} };
const career = new Career(settings, save), store = new Store(), games = new Games();
// language: the saved choice, or the phone's language
{ const sel = document.getElementById('set-lang'); for (const l of LANGS) { const o = document.createElement('option'); o.value = l; o.textContent = LANG_NAMES[l]; o.setAttribute('data-noi18n', ''); sel.appendChild(o); } }
applyLang(resolveLang(settings.lang));
const euro = (n) => `${Math.round(n).toLocaleString('de-DE')} €`;

/* ------------------------------ renderer ------------------------------ */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 6000);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

let composer = null, bloom = null, blurPass = null;
let autoQ = isTouch ? 'medium' : 'high';
function setupQuality() {
  const saver = settings.quality === 'saver', q = settings.quality === 'auto' ? autoQ : saver ? 'low' : settings.quality;
  const dpr = (saver ? 0.8 : 1) * Math.min(window.devicePixelRatio || 1, isTouch ? (q === 'high' ? 1.75 : q === 'medium' ? 1.3 : 1) : (q === 'high' ? 2 : q === 'medium' ? 1.5 : 1));
  renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  if (composer) { composer.dispose(); composer = null; blurPass = null; }
  if (q !== 'low') {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: q === 'high' ? 4 : 2 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.55, 0.7, 0.9); composer.addPass(bloom);
    blurPass = new ShaderPass(RadialBlurShader); blurPass.enabled = false; composer.addPass(blurPass);
    composer.addPass(new OutputPass());
  }
}
addEventListener('resize', setupQuality);

/* ------------------------------ world ------------------------------ */
const sky = new Sky(scene, renderer);
const world = new World(scene);
const traffic = new Traffic(world);
const police = new Police(); traffic.police = police;
const audio = new GameAudio();
const cockpit = new Cockpit();
const fx = new Fx(world);
const streaks = new SpeedStreaks(world.frame);
const speedVig = document.getElementById('speedvig');
sky.onThunder = (d) => audio.thunder(d);

const spot = new THREE.SpotLight(0xfff0d8, 0, 260, 0.3, 0.95, 1.4);
const spotTarget = new THREE.Object3D(); scene.add(spot, spotTarget); spot.target = spotTarget;
const blueLight = new THREE.PointLight(0x2050ff, 0, 45, 1.6); scene.add(blueLight);

// the player car: rig (position, heading, pitch, roll about its centre) > body mesh
const rig = new THREE.Group(); rig.rotation.order = 'YXZ'; scene.add(rig);
let carMesh = null, shadow = null;
const veh = new Vehicle(CARS[0]);
const run = { score: 0, combo: 0, comboT: 0, near: 0, fines: 0, top: 0, time: 0, limit: 0, clubs: {}, wreckT: 0, end: '', recoverT: 0, hintShown: false, lastHit: 0 };
const view = { pitch: 0, lean: 0, camYaw: 0, head: new THREE.Vector3(), headRoll: 0, pull: 0, rush: 0, off: 0 };
const SPEED_FEEL = 1.5;
let mode = 'menu', prevScreen = 'main', camMode = +settings.cam || 0, shake = 0, orbit = 0.75, orbitV = 0, revHeld = false, flashT = 0, camX = 0, touchMode = isTouch;

function setCar(i) {
  i = (i + CARS.length) % CARS.length; settings.car = i; save();
  if (carMesh) { rig.remove(carMesh); carMesh.traverse((o) => { if (o.isMesh && o !== shadow) o.geometry.dispose(); }); }
  if (shadow) scene.remove(shadow);
  const spec = CARS[i], ci = settings.colors[spec.id] || 0;
  carMesh = buildPlayerCar(spec, ci); carMesh.position.y = -spec.body.H / 2; rig.add(carMesh);
  shadow = carMesh.children.find((c) => c.userData.isShadow); carMesh.remove(shadow); scene.add(shadow);
  const keep = { x: veh.x, s: veh.s, v: veh.vs }; veh.setSpec(spec); veh.reset(keep.x || LANES[1], keep.s, keep.v);
  cockpit.build(spec, carMesh);
  audio.setEngine(spec); updateGarageUI();
}
const player = veh;   // traffic and police read x, s, v, L, footW from the vehicle

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
    if (e.code === 'KeyC') { camMode = (camMode + 1) % 3; settings.cam = camMode; save(); toast(['CHASE CAM', 'FAR CAM', 'COCKPIT'][camMode], '', ''); }
    if (e.code === 'KeyF') { flashT = 0.35; traffic.flashAt(veh); }
    if (e.code === 'KeyH') audio.horn(true);
    if (e.code === 'KeyR') recover();
  } else if (e.code === 'Enter' && (mode === 'menu' || mode === 'over')) go('play');
  if (mode === 'garage') { if (e.code === 'ArrowLeft') setCar(settings.car - 1); if (e.code === 'ArrowRight') setCar(settings.car + 1); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'KeyH') audio.horn(false); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; audio.horn(false); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') go('pause'); audio.setHidden(document.hidden); });
addEventListener('pagehide', () => audio.setHidden(true)); addEventListener('pageshow', () => { if (!document.hidden) audio.setHidden(false); });
// phones: on-screen pedals and steering, or tilt
const tc = new TouchControls($('touch'), (a) => {
  if (mode !== 'play') return;
  if (a === 'pause') go('pause');
  else if (a === 'cam') { camMode = (camMode + 1) % 3; settings.cam = camMode; save(); toast(['CHASE CAM', 'FAR CAM', 'COCKPIT'][camMode], '', ''); }
  else if (a === 'flash') { flashT = 0.35; traffic.flashAt(veh); }
  else if (a === 'radio') audio.radio?.cycle(1);
  else if (a === 'recover') recover();
});
function applyControls() { tc.setMode(settings.controls, settings.gas === 'auto'); setHaptics(settings.haptics === '1'); }
function setTouchMode(on) { touchMode = on; document.body.classList.toggle('touch', on); if (mode === 'play') show(null); }
setTouchMode(isTouch);
addEventListener('touchstart', () => { if (!touchMode) setTouchMode(true); }, { passive: true });
document.addEventListener('contextmenu', (e) => { if (touchMode) e.preventDefault(); });
// landscape only on phones
// both orientations are supported; the body class lets the layout adapt
function checkOrientation() { document.body.classList.toggle('portrait', innerHeight > innerWidth); }
addEventListener('resize', checkOrientation); addEventListener('orientationchange', () => setTimeout(checkOrientation, 200));

function readInput(dt) {
  let t = keys.KeyW || keys.ArrowUp ? 1 : 0, b = keys.KeyS || keys.ArrowDown || keys.Space ? 1 : 0, s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  if (touchMode) { t = Math.max(t, tc.throttle); b = Math.max(b, tc.brake); if (tc.steer) s = tc.steer; }
  const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
  if (gp) { if (Math.abs(gp.axes[0]) > 0.12) s = gp.axes[0]; t = Math.max(t, gp.buttons[7]?.value || 0, gp.buttons[0]?.value || 0); b = Math.max(b, gp.buttons[6]?.value || 0); }
  const bot = window.__bot; if (bot) { t = bot.throttle; b = bot.brake; s = bot.steer; }   // test drivers (like a gamepad)
  input.throttle = t; input.brake = b; input.steer += (s - input.steer) * Math.min(1, dt * (14 + 8 * clamp(1 - veh.speed / 36, 0, 1)));   // snappier at low speed
}

/* ------------------------------ game flow ------------------------------ */
function startRun() {
  world.reset(); traffic.reset(); police.reset(); fx.reset();
  veh.reset(LANES[1], 0, 100 / KMH);
  Object.assign(run, { score: 0, combo: 0, comboT: 0, near: 0, fines: 0, top: 0, time: 0, limit: 0, clubs: {}, wreckT: 0, end: '', recoverT: 0, hintShown: false, lastHit: 0, continued: false, adDue: false, doubled: false, paidScore: 0, paidKm: 0, cleanKm: 0, statT: 0, statKm: 0, statLand: 0, statOff: 0 });
  camX = veh.x; view.camYaw = 0; $('toasts').innerHTML = '';
  toast('FREIE FAHRT', 'No limit. Don\'t hit anything.', 'good');
  showRadioPop();
  if (touchMode) { enterGameMode(); setTimeout(() => tc.calibrate(), 250); }
}
function toast(text, sub, cls = '') {
  const el = document.createElement('div'); el.className = 'toast ' + cls; el.textContent = t(text);
  if (sub) { const s = document.createElement('small'); s.textContent = t(sub); el.appendChild(s); }
  const box = $('toasts'); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => el.remove(), 2400);
}
const SCREENS = ['main', 'garage', 'music', 'settings', 'pause', 'over'];
function show(name) { for (const s of SCREENS) $('s-' + s).classList.toggle('hidden', s !== name); $('hud').classList.toggle('hidden', mode !== 'play'); $('touch').classList.toggle('hidden', !(touchMode && mode === 'play')); }
function go(target) {
  audio.click();
  if (target === 'back') target = prevScreen;
  switch (target) {
    case 'play':
      if (!career.owns(CARS[settings.car].id)) setCar(settings.lastCar || 0);
      if (!settings.tutorialDone) { showTutorial(() => go('play')); return; }
      mode = 'play'; startRun(); show(null); break;
    case 'resume': mode = 'play'; show(null); if (touchMode) { enterGameMode(); tc.calibrate(); } break;
    case 'pause': mode = 'paused'; prevScreen = 'pause'; show('pause'); releaseWake(); break;
    case 'main': mode = 'menu'; prevScreen = 'main'; resetToCruise(); updateMainUI(); show('main'); break;
    case 'garage': mode = 'garage'; prevScreen = 'main'; resetToCruise(); updateGarageUI(); show('garage'); break;
    case 'music': if (mode !== 'paused') { if (mode !== 'menu') resetToCruise(); mode = 'menu'; prevScreen = 'main'; } musicSel = audio.radio?.station >= 0 ? audio.radio.station : musicSel; updateMusicUI(); show('music'); break;
    case 'settings': if (mode !== 'paused') { if (mode !== 'menu') resetToCruise(); mode = 'menu'; prevScreen = 'main'; } show('settings'); break;
    case 'over': mode = 'over'; show('over'); releaseWake(); break;
  }
}
function showTutorial(done) {
  const el = $('tutorial'), steps = [...el.querySelectorAll('.tut-step')]; let i = 0;
  const draw = () => { steps.forEach((s, k) => s.classList.toggle('hidden', k !== i)); $('tut-next').textContent = t(i === steps.length - 1 ? "LET'S GO" : 'NEXT'); };
  const finish = () => { el.classList.add('hidden'); settings.tutorialDone = true; save(); done?.(); };
  $('tut-next').onclick = () => { audio.click(); if (++i >= steps.length) finish(); else draw(); }; $('tut-skip').onclick = () => { audio.click(); finish(); };
  draw(); el.classList.remove('hidden');
}
function resetToCruise() { traffic.reset(); police.reset(); fx.reset(); veh.reset(LANES[1], veh.s, veh.vs); }
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-go]'); if (!b) return; boot();
  if (mode === 'over' && run.adDue && !settings.noAds) { run.adDue = false; await ads.interstitial(adOn, adOff); }   // every 3rd run, between runs
  go(b.dataset.go);
});
// keep going after a crash or an arrest by watching one rewarded ad (once per run)
$('o-continue').addEventListener('click', async (e) => {
  e.stopPropagation(); if (run.continued || mode !== 'over') return; boot();
  const ok = await rewarded();
  if (ok) revive(); else toast('KEINE WERBUNG VERFÜGBAR', 'Try again in a moment', '');
});
$('set-tutorial').addEventListener('click', () => showTutorial());
// codes: only a hash is stored here, never the code itself
const CODES = { '5778141d117aae66ecb8a295ee0a533b6fb1f95fed6b36ef4b0241235abeca83': 'all' };
async function redeem(code) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code.trim()));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (CODES[hex] !== 'all') return false;
  settings.owned = CARS.map((c) => c.id); settings.paints = Object.fromEntries(CARS.map((c) => [c.id, c.colors.map((_, i) => i)]));
  settings.noAds = true; settings.money = Math.max(settings.money, 1000000); settings.tutorialDone = true; save();
  $('m-noads').classList.add('hidden'); games.unlock('collector'); updateMainUI(); updateGarageUI(); return true;
}
$('set-code-go').addEventListener('click', async () => { const el = $('set-code'); const ok = await redeem(el.value).catch(() => false); el.value = '';
  el.placeholder = t(ok ? 'Everything unlocked' : 'Invalid code'); el.classList.toggle('ok', ok); el.classList.toggle('bad', !ok); if (ok) audio.bonus(); });
$('set-code').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $('set-code-go').click(); });
$('set-policy').addEventListener('click', () => { window.open(PRIVACY_URL, '_system') || (location.href = PRIVACY_URL); });
$('set-errors').addEventListener('click', async () => { const r = await sendErrorReport(`car ${veh.spec?.id} · lang ${settings.lang}`); if (r === 'copied') toast('Report copied – paste it into an e-mail or GitHub issue', '', ''); });
// in the app: "remove ads" purchase and Google Play Games
$('m-noads').addEventListener('click', async () => { boot(); if (await store.buy()) { settings.noAds = true; save(); toast('Ads removed. Thank you!', '', 'good'); $('m-noads').classList.add('hidden'); } });
$('set-restore').addEventListener('click', async () => { if (await store.restore()) { settings.noAds = true; save(); toast('Ads removed. Thank you!', '', 'good'); $('m-noads').classList.add('hidden'); } });
$('m-lb').addEventListener('click', () => games.showLeaderboards()); $('m-ach').addEventListener('click', () => games.showAchievements());
if (window.Capacitor?.isNativePlatform?.()) {
  store.init().then((owned) => { if (owned) { settings.noAds = true; save(); }
    $('m-noads').classList.toggle('hidden', settings.noAds || !store.available); $('set-restore').classList.toggle('hidden', !store.available); if (store.price) $('m-noads-price').textContent = store.price; });
  games.init().then((on) => $('m-games').classList.toggle('hidden', !on));
}
// consent can be changed at any time (needed where the consent form applies)
$('privacy').addEventListener('click', () => ads.privacyOptions());
if (window.Capacitor?.isNativePlatform?.()) $('privacy').classList.remove('hidden');
// a rewarded ad (free and instant for players who bought "remove ads"); the game is held while it shows
async function rewarded() { if (settings.noAds) return true; const was = mode; if (was === 'play') mode = 'paused'; const ok = await ads.rewarded(adOn, adOff); if (was === 'play' && mode === 'paused') mode = 'play'; return ok; }
$('o-double').addEventListener('click', async (e) => { e.stopPropagation(); if (run.doubled) return; boot();
  if (await rewarded()) { run.doubled = true; career.earn(run.earned); $('o-money').textContent = '+' + euro(run.earned * 2); $('o-double').classList.add('hidden'); audio.bonus(); } });
// a speed-camera fine can be waived by watching an ad (offered for a few seconds)
let waiveT = 0;
$('h-waive').addEventListener('click', async (e) => { e.stopPropagation(); const f = run.lastFine; if (!f) return; $('h-waive').classList.add('hidden'); run.lastFine = 0;
  if (await rewarded()) { run.score += f; toast('FINE WAIVED', '+' + f, 'good'); } });
function revive() {
  run.continued = true; run.adDue = false; ads.runs = Math.max(0, ads.runs - 1);   // a continued run is the same try
  const { rd, h } = roadHeading();
  let x; if (rd) { const lo = rd.kind === 'land' ? 2.2 : rd.kind === 'kreis' ? 1.75 : 0, xc = rd.xAt(veh.s); x = rd.kind === 'area' ? clamp(veh.x, xc - rd.hwAt(veh.s) + 2, xc + rd.hwAt(veh.s) - 2) : xc + lo; }
  else x = LANES.reduce((b, l) => (Math.abs(l - veh.x) < Math.abs(b - veh.x) ? l : b), LANES[1]);
  veh.reset(x, veh.s, 16); veh.psi = h; veh.vx = Math.sin(h) * 16; veh.vs = Math.cos(h) * 16;
  police.reset();
  for (const c of [...traffic.cars]) if (Math.abs(c.s - veh.s) < 140) { traffic._release(c); traffic.cars.splice(traffic.cars.indexOf(c), 1); }
  world.obstacles = world.obstacles.filter((o) => o.rock || Math.abs(o.s - veh.s) > 60 || Math.abs(o.x - veh.x) > 6);
  run.wreckT = 0; run.end = ''; camX = veh.x; mode = 'play'; show(null); if (touchMode) enterGameMode();
  toast('WEITER GEHT\'S', 'Wagen repariert · Polizei abgeschüttelt', 'good');
}

let booted = false;
async function boot() {
  if (booted) { audio.resume(); return; } booted = true; ads.init();
  await audio.init(); applyAudioSettings(); audio.setEngine(veh.spec);
  audio.radio.hidden = settings.hidden;
  audio.radio.onChange = (info) => { settings.station = audio.radio.station; save(); updateRadioUI(info); showRadioPop(); };
  await audio.radio.user.ready; audio.radio.setStation(Math.min(settings.station, STATIONS.length - 1));
}
addEventListener('pointerdown', boot);

function fmtSpeed(ms) { return Math.round(ms * (settings.units === 'mph' ? 2.23694 : 3.6)); }

function gameOver() {
  const best = Math.max(settings.best, Math.round(run.score)), isBest = run.score > settings.best && run.score > 0; settings.best = best; save();
  $('o-kicker').textContent = t(run.end || 'TOTALSCHADEN');
  $('o-score').textContent = Math.round(run.score).toLocaleString('en'); $('o-best').textContent = t(isBest ? 'NEW BEST' : 'BEST ' + best.toLocaleString('en'));
  $('o-dist').textContent = (veh.s / PACE / 1000).toFixed(1); $('o-top').textContent = fmtSpeed(run.top); $('o-unit').textContent = 'top ' + (settings.units === 'mph' ? 'mph' : 'km/h');
  $('o-near').textContent = run.near; $('o-fines').textContent = run.fines;
  run.adDue = !settings.noAds && ads.countRun(); $('o-continue').classList.toggle('hidden', !!run.continued);
  // money for this run (once, even if the run is continued later: only the new part counts)
  const km = veh.s / PACE / 1000, earned = career.payout(run.score - (run.paidScore || 0), km - (run.paidKm || 0)); run.paidScore = run.score; run.paidKm = km;
  career.earn(earned); run.earned = earned; $('o-money').textContent = '+' + euro(earned); $('o-double').classList.toggle('hidden', !!run.doubled || earned < 20);
  for (const el of document.querySelectorAll('.adcta small')) el.classList.toggle('hidden', !!settings.noAds);
  games.submit('score', run.score); games.submit('speed', run.top * KMH); games.submit('distance', km * 1000);
  go('over');
}
function endRun(reason) { if (run.wreckT > 0) return; run.end = reason; run.wreckT = 0.001; }

/* ------------------------------ physics ------------------------------ */
function grip() {
  let g = 1 - 0.38 * sky.wet - 0.12 * sky.cur.storm - 0.62 * sky.snowCover;
  if (sky.cur.rain > 0.3) g *= 1 - 0.16 * clamp((veh.speed - 30) / 40, 0, 1) * sky.cur.rain;   // aquaplaning
  return Math.max(0.3, g);
}
const env = { mu: null, base: 1, assist: true, canRoll: true };
const PAINT = () => carMesh.userData.paint.color.getHex();
const ads = new Ads();
const adOn = () => audio.setHidden(true), adOff = () => audio.setHidden(document.hidden);

function physics(dt, driving) {
  const n = 4, h = dt / n, base = grip();
  env.base = base; env.mu = (x, s) => base * world.surface(x, s);
  env.land = !world.land.onAutobahn(veh.x, veh.s);
  env.drag = (x, s) => (x > 8.9 ? world.land.drag(x, s) : 0);   // grass, mud and rough ground slow you down   // country-road steering, and no pull back to the Autobahn's heading
  const inp = driving && !veh.wrecked ? input : { throttle: 0, brake: veh.wrecked ? 0.6 : 0, steer: 0 };
  for (let k = 0; k < n; k++) {
    veh.step(h, inp, env);
    // guardrails and closures
    const hw = walls(veh, (s) => world.bounds(s, veh.x), 0.2, 0.35);
    if (hw && hw.j > 0) {
      const dv = hw.j / veh.m;
      if (dv > 0.6) hurt(dv, 'wall');
      veh.scrape = Math.min(1, veh.speed / 25);
      if (Math.random() < 0.5) fx.spark(hw.p[0], 0.35, hw.p[1], veh.vx, veh.vs, 2);
      if (dv > 4) { audio.crash(clamp(dv / 15, 0.2, 1)); haptic(Math.round(20 + dv * 6)); fx.debris(hw.p[0], 0.5, hw.p[1], veh.vx, veh.vs, 4, PAINT()); shake = Math.max(shake, clamp(dv / 25, 0.1, 0.5)); }
      if (dv > 4 && veh.sideways > 0.55 && Math.abs(veh.w) > 11 && Math.random() < 0.22) veh.startRoll(Math.sign(hw.n[0]), Math.abs(veh.w));
    }
    // traffic
    for (const c of traffic.cars) {
      if (Math.abs(c.s - veh.s) > 14 || Math.abs(c.x - veh.x) > 5) continue;
      const hit = sat(veh, c); if (!hit) continue;
      const pre = { v: veh.speed, closing: Math.hypot(veh.vs - c.vs, veh.vx - (c.vx || 0)) };   // before the impulse changes them
      const j = resolve(veh, c, hit, 0.12, 0.35);
      if (j > 0) carHit(c, j, hit, pre);
    }
    for (const o of world.obstacles) {
      if (Math.abs(o.s - veh.s) > 14 || Math.abs(o.x - veh.x) > 10) continue;
      const hit = sat(veh, o); if (!hit) continue;
      const j = resolve(veh, o, hit, 0.1, 0.4);
      if (j > 0) { const dv = j / veh.m; hurt(dv, 'obstacle'); if (dv > 2) { audio.crash(clamp(dv / 15, 0.3, 1)); fx.debris(hit.p[0], 0.6, hit.p[1], veh.vx, veh.vs, 6, PAINT()); shake = Math.max(shake, 0.3); } }
    }
  }
  // rollover events
  for (const e of veh.events) {
    if (e.type === 'tip') { audio.crash(0.3); shake = Math.max(shake, 0.25); haptic(60); }
    if (e.type === 'land') { audio.impact(e.strength); hurt(2.5 + e.strength * 3, 'land'); shake = Math.max(shake, 0.35); haptic(80); toast('GLÜCK GEHABT', 'Back on four wheels', 'good'); }
    if (e.type === 'roll') { endRun('ÜBERSCHLAG'); toast('ÜBERSCHLAG!', '', 'bad'); audio.crash(1); audio.glass(); shake = 0.6; }
    if (e.type === 'impact') { audio.impact(e.strength); haptic(Math.round(30 + e.strength * 80)); fx.debris(veh.x, 0.4, veh.s, veh.vx, veh.vs, 3 + (e.strength * 8 | 0), PAINT()); fx.puff(veh.x, 0.3, veh.s, veh.vx, veh.vs, 3, false, 2); shake = Math.max(shake, e.strength * 0.5); if (e.strength > 0.5) audio.glass(); }
  }
  veh.events.length = 0;
}
function hurt(dv, what, cap = 100) {
  if (run.wreckT > 0 && what !== 'car') return;
  veh.damage = Math.min(Math.max(veh.damage, cap), veh.damage + dv * dv * 0.3 + dv * 1.2);
  if (veh.damage >= 100 && !veh.wrecked) { veh.wrecked = true; endRun('TOTALSCHADEN'); audio.crash(1); audio.glass(); shake = 0.5; toast('TOTALSCHADEN', '', 'bad'); fx.puff(veh.x, 0.9, veh.s, 0, veh.vs, 8, true, 1.8); }
}
function carHit(c, j, hit, pre) {
  const dv = j / veh.m, dvc = j / c.m;
  // below 150 km/h, or when both cars were going about the same speed, a car-to-car hit dents and smokes but never writes the car off
  const hostile = c.police && (police.phase === 'chase' || police.phase === 'hunt');
  if (hostile) hurt(dv * (c.kind === 'swat' ? 1.5 : 1.2), 'car', 100);
  else hurt(dv, 'car', pre.v * KMH < 150 || pre.closing * KMH < 40 ? 88 : 100);
  traffic.knock(c, dvc);
  const strength = clamp(Math.max(dv, dvc) / 12, 0.15, 1);
  if (performance.now() - run.lastHit > 180) { audio.crash(strength); if (strength > 0.4) audio.glass(); run.lastHit = performance.now(); haptic(Math.round(25 + strength * 90)); }
  fx.debris(hit.p[0], 0.55, hit.p[1], (veh.vx + c.vx) / 2, (veh.vs + c.vs) / 2, 2 + (strength * 10 | 0), c.mesh.userData.paint ? c.mesh.userData.paint.color.getHex() : PAINT());
  shake = Math.max(shake, strength * 0.6); run.combo = 0;
  if (mode !== 'play' || veh.wrecked) return;
  // touching another car and driving on is a crime
  // ramming a patrol car is resistance; being bumped by one is not your fault
  const myFault = c.s > veh.s + 1 || (Math.abs(veh.vx) > 2 && Math.sign(c.x - veh.x) === Math.sign(veh.vx));
  if (c.police) { if (police.active && myFault) police.trigger('WIDERSTAND', 40, 4); }
  else if (!c.touched) { c.touched = true; if (police.trigger('UNFALLFLUCHT', 45, 3)) { toast('UNFALLFLUCHT', 'Polizei alarmiert', 'bad'); haptic([40, 40, 40]); } }
  if (Math.abs(hit.n[0]) > 0.7 && veh.sideways > 0.55 && Math.abs(veh.w) > 12 && Math.random() < 0.12) veh.startRoll(Math.sign(-hit.n[0]) || 1, Math.abs(veh.w));
}
// the direction of the road under the car (0 on the Autobahn)
function roadHeading() { const rd = world.land.onAutobahn(veh.x, veh.s) ? null : world.land.roadAt(veh.x, veh.s); return { rd, h: rd ? Math.atan(rd.slope(veh.s)) : 0 }; }
function recover() {
  const { rd, h } = roadHeading();
  if (veh.rolling || veh.wrecked || veh.speed > 6 || (Math.abs(veh.psi - h) < 0.5 && veh.speed > 1)) return;
  let x;
  if (rd) { const lo = rd.kind === 'land' ? 2.2 : rd.kind === 'kreis' ? 1.75 : 0, xc = rd.xAt(veh.s); x = rd.kind === 'area' ? clamp(veh.x, xc - rd.hwAt(veh.s) + 2, xc + rd.hwAt(veh.s) - 2) : xc + lo; }
  else x = LANES.reduce((b, l) => (Math.abs(l - veh.x) < Math.abs(b - veh.x) ? l : b), LANES[1]);
  Object.assign(veh, { psi: h, r: 0, vx: Math.sin(h) * 4, vs: Math.cos(h) * 4, x }); run.recoverT = 0; run.score = Math.max(0, run.score - 500); toast('ZURÜCK AUF DER SPUR', '−500', '');
}

/* ------------------------------ career ------------------------------ */
function mission(stat, v, how) {
  for (const q of career.track(stat, v, how)) { toast('MISSION COMPLETE', `${t(q.text, { n: q.target })} · +${euro(q.reward)}`, 'good'); audio.bonus(); }
  if (career.daily().list.every((q) => q.done)) games.unlock('missions');
}
function renderMissions() {
  const ul = $('m-missions'); ul.innerHTML = '';
  for (const q of career.daily().list) { const li = document.createElement('li'); if (q.done) li.className = 'done';
    li.innerHTML = `<small>${q.done ? '✓' : '+' + euro(q.reward)}</small>${t(q.text, { n: q.target })}<i><u style="width:${Math.min(100, q.progress / q.target * 100)}%"></u></i>`; ul.appendChild(li); }
}

/* ------------------------------ scoring & rules ------------------------------ */
function rules(dt) {
  const vk = veh.vs * KMH, limit = world.limitAt(veh.s, veh.x);
  run.time += dt; run.top = Math.max(run.top, veh.speed);
  if (run.wreckT <= 0) run.score += Math.max(0, veh.vs) * dt * 0.1 * Math.pow(Math.max(0, vk) / 100, 2);
  if (run.comboT > 0) { run.comboT -= dt; if (run.comboT <= 0) run.combo = 0; }
  // which road we are on: announce it when it changes (off the Autobahn, onto a Feldweg, back on)
  const rd = world.land.onAutobahn(veh.x, veh.s) ? null : world.land.roadAt(veh.x, veh.s), rk = rd ? rd.kind + rd.id : 'A';
  if (rk !== run.roadKey && run.time > 0.5) {
    const was = run.roadKind; run.roadKey = rk; run.roadKind = rd ? rd.kind : 'A';
    if (!rd) { if (was && was !== 'A') toast('AUTOBAHN', 'Back on the A 9', 'good'); }
    else if (rd.kind === 'ramp') { if (!rd.toAutobahn) mission('exits', 1); const j = world.land.junctions.find((q) => q.exit === rd || q.entry === rd); toast(rd.toAutobahn ? 'AUFFAHRT' : `AUSFAHRT ${j ? j.no : ''}`, rd.toAutobahn ? 'A 9 · München' : j ? j.name : '', ''); }
    else if (rd.kind === 'land' && was !== 'land') toast('LANDSTRASSE', 'Limit 100 · mind the curves and tractors', '');
    else if (rd.kind === 'kreis') toast('KREISSTRASSE', 'Narrow and quiet', '');
    else if (rd.kind === 'dirt') toast('FELDWEG', 'Gravel · Landwirtschaftlicher Verkehr frei', '');
    else if (rd.kind === 'trail') toast('WALDWEG', 'Mud, ruts and puddles', '');
    else if (rd.kind === 'area') { toast('OFFROAD-GELÄNDE', 'Rocks, mud, water · go anywhere inside', 'good'); games.unlock('offroad'); }
  } else if (run.time <= 0.5) { run.roadKey = rk; run.roadKind = rd ? rd.kind : 'A'; }
  const town = rd && rd.kind === 'land' ? world.land.townAt(veh.s) : null;
  if (town !== run.town) { if (town) { toast(town.name.toUpperCase(), 'Ortschaft · 50 km/h', ''); mission('towns', 1); } run.town = town; }
  // distance-based missions, counted once a second
  const dKm = Math.max(0, veh.vs) * dt / 1000; run.statKm += dKm; if (rd && (rd.kind === 'land' || rd.kind === 'kreis' || rd.kind === 'street')) run.statLand += dKm; if (rd && (rd.kind === 'trail' || rd.kind === 'area' || rd.kind === 'dirt')) run.statOff += dKm;
  run.cleanKm = veh.damage < 0.5 ? run.cleanKm + dKm : 0; if (police.phase === 'hunt') run.sawHunt = true;
  if ((run.statT += dt) > 1) { run.statT = 0; mission('km', run.statKm); mission('landKm', run.statLand); mission('offKm', run.statOff); run.statKm = run.statLand = run.statOff = 0; mission('top', veh.speed * KMH, 'max'); mission('cleanKm', run.cleanKm, 'max'); }
  const onA = !rd;
  if (limit !== run.limit) { if (limit) toast(`TEMPOLIMIT ${limit}`, onA ? 'Blitzer ahead? Maybe.' : '', ''); else if (onA) toast('FREIE FAHRT', 'End of all restrictions', 'good'); run.limit = limit; }
  for (const b of world.blitzers) if (!b.done && veh.s > b.s) {
    b.done = true; const over = vk - b.limit;
    if (over > 9) { const fine = Math.round(over * 15); run.score = Math.max(0, run.score - fine); run.fines++; b.obj.userData.flash.opacity = 1; audio.blitz();
      const f = $('flash'); f.style.transition = 'none'; f.style.background = '#ff3020'; f.style.opacity = 0.55; requestAnimationFrame(() => { f.style.transition = 'opacity 0.5s'; f.style.opacity = 0; });
      toast('GEBLITZT!', `${fmtSpeed(veh.vs)} in a ${b.limit} zone · −${fine}`, 'bad');
      run.lastFine = fine; $('h-waive').classList.remove('hidden'); clearTimeout(waiveT); waiveT = setTimeout(() => $('h-waive').classList.add('hidden'), 6000);
      if (over > 50 && police.trigger('RASEREI', 60, 4)) setTimeout(() => toast('RASEREI', `${Math.round(over)} km/h zu schnell · Polizei alarmiert`, 'bad'), 900); }
  }
  for (const club of [300, 350, 400]) if (vk >= club && !run.clubs[club]) { run.clubs[club] = 1; if (club === 300) games.unlock('club300'); if (club === 400) games.unlock('club400'); run.score += club * 5; toast(`${club} KM/H CLUB`, `+${club * 5}`, 'good'); audio.bonus(); }
  // overtakes and near misses (clean passes only: touching is a crime, not a bonus)
  for (const c of traffic.cars) {
    if (c.crashed) continue;
    const dx = veh.x - c.x, sw = (veh.footW + c.W) / 2;
    if (!c.passed && veh.s - veh.L / 2 > c.s - c.L * 0.25) {
      c.passed = true; const gap = Math.abs(dx) - sw, dvk = (veh.vs - c.vs) * KMH;
      if (gap < 5 && dvk > 15) audio.whoosh(clamp((c.x - veh.x) / 4, -1, 1), clamp(dvk / 200, 0, 1) * (c.kind === 'truck' ? 1.3 : 1));
      if (gap < 1.15 && gap > 0.02 && dvk > 30 && !c.touched && run.wreckT <= 0 && !c.police && c.dir !== -1) {
        run.combo = Math.min(9, run.combo + 1); run.comboT = 5; run.near++; mission('near', 1); const pts = Math.round((100 + dvk) * run.combo); run.score += pts;
        toast(`NEAR MISS ×${run.combo}`, `+${pts}`, 'good'); audio.bonus(); haptic(12);
      }
    } else if (c.passed && c.s - c.L / 2 > veh.s + veh.L / 2 + 4) c.passed = false;
  }
  // police
  const res = police.update(dt, veh, traffic, sky.night); world.policeActive = police.active;
  if (police.events.includes('spikes')) { audio.crash(0.5); audio.glass(); shake = Math.max(shake, 0.45); haptic([60, 30, 60, 30, 120]); }
  if (res === 'busted') { endRun('FESTGENOMMEN'); toast('FESTGENOMMEN', 'Aussteigen, Hände aufs Dach.', 'bad'); audio.busted(); haptic([80, 60, 80, 60, 200]); }
  else if (res === 'escaped') { run.score += 2500; toast('ENTKOMMEN!', 'Polizei abgehängt · +2500', 'good'); audio.bonus(); mission('escapes', 1); games.unlock('firstEscape'); if (police.phase === 'hunt' || run.sawHunt) games.unlock('hunt'); }
  else if (res === 'gaveup') { run.score += 1500; toast('POLIZEI GIBT AUF', '+1500', 'good'); audio.bonus(); }
  else if (res === 'ticket') { mission('tickets', 1); games.unlock('ticket'); const fine = { RASEREI: 900, UNFALLFLUCHT: 1200 }[police.reason] || 600; run.score = Math.max(0, run.score - fine); toast('VERKEHRSKONTROLLE', `Bußgeld −${fine} · Gute Fahrt!`, ''); }
  for (const m of police.msgs.splice(0)) { toast(m.title, m.sub, m.kind); if (m.kind === 'bad') haptic([40, 40, 40]); }
  // stuck facing the wrong way: offer a recovery
  if (!veh.wrecked && veh.speed < 3 && Math.abs(veh.psi - roadHeading().h) > 0.5 && (run.roadKind !== 'area')) { run.recoverT += dt; if (run.recoverT > 1.2 && !run.hintShown) { run.hintShown = true; toast(touchMode ? 'TAP ↻' : 'DRÜCKE R', 'to get back on track', ''); } if (run.recoverT > 6) recover(); }
  else { run.recoverT = 0; if (veh.speed > 10) run.hintShown = false; }
  if (run.wreckT > 0) { run.wreckT += dt; if (run.wreckT > (veh.rolling ? 2 : 2.4) && (veh.settled || !veh.rolling) && veh.speed < 4 && mode === 'play') gameOver(); else if (run.wreckT > 9 && mode === 'play') gameOver(); }
}

/* ------------------------------ per-frame visuals ------------------------------ */
const _v = new THREE.Vector3(), _t = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
function updateCar(dt) {
  const u = carMesh.userData, H = veh.H;
  view.pitch += (clamp(veh.ax, -12, 8) * 0.0032 - view.pitch) * Math.min(1, dt * 6);
  view.lean += (clamp(-veh.ay, -12, 12) * 0.0045 - view.lean) * Math.min(1, dt * 5);
  // rough ground: the body bounces and rocks over ruts and stones (more with speed)
  const rg = veh.x > 8 && !veh.rolling ? world.land.rough(veh.x, veh.s) : 0, sp = clamp(veh.speed / 10, 0, 1.6), ss = veh.s;
  const bump = rg * sp * (Math.sin(ss * 1.9) * 0.6 + Math.sin(ss * 4.7 + veh.x * 0.8) * 0.4), rock = rg * sp * Math.sin(ss * 3.3 + veh.x) * 0.9;
  rig.position.set(veh.x, (veh.rolling ? veh.yc : H / 2) + bump, -(veh.s - world.s));
  rig.rotation.set((veh.rolling ? 0 : view.pitch) + bump * 0.5, -veh.psi, -(veh.phi + (veh.rolling ? 0 : view.lean)) + rock * 0.35);
  if (rg && veh.speed > 3) shake = Math.max(shake, rg * sp * 0.8);
  rig.updateMatrixWorld(true);
  shadow.position.set(veh.x, 0.02, rig.position.z); shadow.rotation.set(-Math.PI / 2, 0, -veh.psi); shadow.material.opacity = 0.75 * clamp(1 - (veh.yc - H / 2) / 3, 0, 1);
  const spin = veh.u * dt * PACE / u.wheelR; for (const w of u.wheels) w.rotation.z -= spin;
  for (const f of u.front) f.rotation.y = -input.steer * 0.42 * clamp(1 - veh.speed / 50, 0.12, 1);
  const braking = mode === 'play' && (input.brake > 0.1 || veh.wrecked);
  u.tail.emissiveIntensity = braking ? 8 : 0.35 + sky.night * 2 + sky.cur.rain;
  // headlights, aimed along the car
  const needLights = clamp(sky.night + sky.cur.rain * 0.5 + sky.fogLevel * 0.8, 0, 1);
  flashT = Math.max(0, flashT - dt);
  spot.intensity = veh.rolling ? 0 : needLights * 620 + (flashT > 0 ? 1100 : 0);
  carMesh.localToWorld(spot.position.set(0, 0.95, -veh.L / 2 + 0.2)); carMesh.localToWorld(spotTarget.position.set(0, -2.5, -130));
  if (flashT > 0) MATS.head.emissiveIntensity = 14;
  // skid marks and tyre smoke from the rear wheels (and the fronts when they lock)
  const fxs = Math.sin(veh.psi), fcs = Math.cos(veh.psi), t2 = veh.track / 2, onRoad = !veh.rolling;
  const wheelsAt = (d) => [[veh.x + fxs * d - fcs * t2, veh.s + fcs * d + fxs * t2], [veh.x + fxs * d + fcs * t2, veh.s + fcs * d - fxs * t2]];
  const k = onRoad && mode !== 'menu' && mode !== 'garage' ? veh.skid : 0;
  wheelsAt(-veh.b).forEach(([x, s], i) => { fx.skid('r' + i, x, s, k); if (k > 0.45 && Math.random() < k * 0.5) fx.puff(x, 0.25, s, veh.vx, veh.vs, 1, false, 1.2); });
  const kf = input.brake > 0.5 && veh.mu < 0.5 ? k : veh.sliding ? k * 0.8 : 0;
  wheelsAt(veh.a).forEach(([x, s], i) => fx.skid('f' + i, x, s, kf));
  // loud cars spit flames and crackle when you lift off at high revs
  const snd = veh.spec.sound;
  if (mode === 'play' && !veh.wrecked && snd.pops >= 0.9 && input.throttle < 0.05 && veh.rpm > veh.spec.redline * 0.5 && Math.random() < dt * 9 * snd.pops) {
    const n = veh.spec.body.exhaust === 'quad' ? [-0.55, 0.55] : [-0.12, 0.12], side = n[(Math.random() * n.length) | 0];
    carMesh.localToWorld(_v.set(side, veh.spec.body.c + 0.1, veh.L / 2 + 0.08)); fx.flame(_v.x, _v.y, -_v.z + world.s, veh.vx, veh.vs); audio.pop(snd.gain);
  }
  if (mode === 'play' && veh.flats && veh.speed > 4) {
    veh.scrape = Math.max(veh.scrape || 0, Math.min(0.7, veh.flats * 0.06 * veh.speed / 10));
    if (Math.random() < dt * veh.flats * Math.min(10, veh.speed * 0.4)) { carMesh.localToWorld(_v.set((Math.random() < 0.5 ? -1 : 1) * veh.W * 0.42, 0.1, (Math.random() < 0.5 ? -1 : 1) * veh.wb * 0.5)); fx.spark(_v.x, 0.08, -_v.z + world.s, veh.vx, veh.vs, 2); }
  }
  // gravel: a dust trail behind the car on a Feldweg
  if (mode === 'play' && veh.x > 8 && veh.speed > 4) { const pt = world.land.patchAt(veh.x, veh.s);
    if (pt && Math.random() < dt * Math.min(30, veh.speed * 1.2)) { carMesh.localToWorld(_v.set((Math.random() - 0.5) * veh.W * 1.2, 0.4, -veh.L * 0.2)); fx.puff(_v.x, 0.5, -_v.z + world.s, veh.vx * 0.5 + (Math.random() - 0.5) * 6, veh.vs * 0.5, 2, pt.kind === 'mud', pt.kind === 'water' ? 1.1 : 0.8); } }
  if (mode === 'play' && (run.roadKind === 'dirt' || run.roadKind === 'area') && veh.speed > 7 && Math.random() < dt * Math.min(14, veh.speed * 0.5)) { carMesh.localToWorld(_v.set((Math.random() - 0.5) * veh.W, 0.3, veh.L / 2)); fx.puff(_v.x, 0.35, -_v.z + world.s, veh.vx * 0.3, veh.vs * 0.4, 1, false, 1.6 + veh.speed * 0.03); }
  if (veh.wrecked && Math.random() < dt * 6) { carMesh.localToWorld(_v.set(0, 0.9, -veh.L / 2 + 0.6)); fx.puff(_v.x, _v.y, -_v.z + world.s, 0, 0, 1, true, 1.6); }
}

// a landscape field of view, converted so a tall portrait screen still shows a sensible width of road
const D2R = Math.PI / 180;
function viewFov(v) { const a = camera.aspect; if (a >= 1) return v; const h = 2 * Math.atan(Math.tan(v * D2R / 2) * 1.78) * 0.62; return Math.min(96, 2 * Math.atan(Math.tan(h / 2) / a) / D2R); }
function updateCamera(dt, t) {
  const portrait = camera.aspect < 1;
  // speed feel: every speed cue (field of view, camera pull-back, shake, streaks, blur) acts as if the car were ~1.5x faster
  const vf = veh.speed * SPEED_FEEL, vn = clamp(vf / 110, 0, 1.3), sh = settings.shake === '1' ? 1 : 0, pz = rig.position.z;
  const rush = mode === 'play' ? clamp((vf - 45) / 75, 0, 1) : 0;    // 0 below ~110 km/h, 1 from ~290 km/h
  view.rush += (rush - view.rush) * Math.min(1, dt * 2);
  streaks.update(veh, veh.speed, view.rush * 0.9);
  if (blurPass) { blurPass.uniforms.strength.value = view.rush * view.rush * 1.6; blurPass.enabled = view.rush > 0.03; }
  speedVig.style.opacity = (view.rush * 0.85).toFixed(3);
  shake = Math.max(0, shake - dt * 1.4);
  const inCar = camMode === 2 && (mode === 'play' || mode === 'paused') && !veh.rolling;
  cockpit.setVisible(inCar); $('hud').classList.toggle('incar', inCar);
  const near = inCar ? 0.05 : 0.3; if (camera.near !== near) { camera.near = near; camera.updateProjectionMatrix(); }
  if (mode === 'play' || mode === 'paused' || mode === 'over') {
    // off the Autobahn roads bend, so the camera sits squarely behind the car and turns fully with it
    // (on the Autobahn it lags a little sideways, which keeps lane changes smooth); blended over ~1 s
    const offA = veh.x > 8 && !world.land.onAutobahn(veh.x, veh.s) ? 1 : 0; view.off += (offA - view.off) * Math.min(1, dt * 1.5);
    camX += (veh.x - camX) * Math.min(1, dt * (6 + 40 * view.off));
    // the chase camera swings round with the car, but lags behind spins
    const target = veh.rolling ? view.camYaw : clamp(veh.psi, -1.2 - 0.4 * view.off, 1.2 + 0.4 * view.off) * (0.85 + 0.15 * view.off);
    view.camYaw += (target - view.camYaw) * Math.min(1, dt * (Math.abs(veh.r) > 1 ? 1.2 : 3 + 2 * view.off));
    const cy = Math.cos(view.camYaw), syw = Math.sin(view.camYaw);
    if (inCar) {
      // eye in the driver's seat: the head moves with g-forces, looks a little into turns
      view.head.x += (clamp(veh.ay * -0.004, -0.05, 0.05) - view.head.x) * Math.min(1, dt * 6);
      view.head.z += (clamp(veh.ax * 0.003, -0.04, 0.03) - view.head.z) * Math.min(1, dt * 6);
      view.headRoll += (clamp(veh.ay * 0.0035, -0.05, 0.05) - view.headRoll) * Math.min(1, dt * 5);
      _v.copy(cockpit.eye).add(view.head); _v.y += Math.sin(t * 31) * 0.002 * vn + (Math.random() - 0.5) * 0.007 * vn * vn * vn * sh;
      carMesh.localToWorld(camera.position.copy(_v));
      carMesh.getWorldQuaternion(_q); camera.quaternion.copy(_q).multiply(new THREE.Quaternion().setFromEuler(_e.set(-0.045, -input.steer * 0.06, view.headRoll, 'YXZ')));
      const fov = viewFov(68 + 16 * vn * vn); camera.fov += (fov - camera.fov) * Math.min(1, dt * 4);
      if (shake > 0 && sh) camera.position.addScaledVector(_t.set(Math.random() - 0.5, Math.random() - 0.5, 0), shake * 0.15);
      camera.updateProjectionMatrix(); if (window.__debugCam) window.__debugCam(camera, rig); return;
    }
    // at speed the camera drops back and a little lower behind the car while the view widens: the road rushes at you
    const pull = Math.min(1.2, vn) ** 2 * (camMode === 0 ? 1.9 : 2.4);
    view.pull += (pull - view.pull) * Math.min(1, dt * (pull > view.pull ? 1.1 : 2.5));      // eases back under acceleration, snaps in when braking
    const back = (camMode === 0 ? 5.9 : 10.2) + view.pull + (portrait ? 1.6 : 0), up = (camMode === 0 ? 2.0 - vn * 0.3 : 3.6 - vn * 0.4) + (portrait ? 0.7 : 0);
    const cx = (veh.rolling ? veh.x : camX * 0.9 * (1 - view.off) + veh.x * (0.1 + 0.9 * view.off));
    camera.position.set(cx - syw * back * (0.9 + 0.1 * view.off), up, pz + cy * back);
    _t.set(veh.x + syw * 14, camMode === 0 ? 1.05 : 0.8, pz - cy * (camMode === 0 ? 16 : 20));
    if (veh.rolling) _t.set(veh.x, veh.yc, pz);
    const fov = viewFov(56 + 30 * vn * vn / (0.35 + vn));
    const k = (shake + vn * vn * vn * 0.045 + (run.roadKind === 'dirt' ? Math.min(0.05, veh.speed * 0.0025) : 0)) * sh;   // gravel rumbles
    camera.position.x += (Math.random() - 0.5) * k; camera.position.y += (Math.random() - 0.5) * k * 0.7;
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 4);
  } else {
    orbit += orbitV * dt; orbitV *= Math.pow(0.02, dt);
    const garage = mode === 'garage', a = garage ? orbit : 0.75 + Math.sin(t * 0.07) * 0.55, r = garage ? 6.6 : 7.4;
    camera.position.set(veh.x + Math.sin(a) * r, garage ? 1.45 : 1.6 + Math.sin(t * 0.05) * 0.3, pz - Math.cos(a) * r);
    _t.set(veh.x, 0.75, pz);
    if (innerWidth > 720 && !portrait) { _v.subVectors(_t, camera.position).normalize(); _v.set(_v.z, 0, -_v.x); _t.addScaledVector(_v, 1.9); }
    if (portrait) _t.y -= 1.0;                     // car in the top half, menus below
    camera.fov += (viewFov(38) - camera.fov) * Math.min(1, dt * 4);
  }
  camera.lookAt(_t); camera.updateProjectionMatrix();
  if (window.__debugCam) window.__debugCam(camera, rig);
}

/* ------------------------------ HUD ------------------------------ */
const hud = { last: {} };
function setText(id, v) { if (hud.last[id] !== v) { hud.last[id] = v; $(id).textContent = v; } }
function updateHUD() {
  const vk = veh.vs * KMH, limit = run.limit;
  setText('h-speed', fmtSpeed(veh.speed)); setText('h-unit', settings.units === 'mph' ? 'mph' : 'km/h'); setText('h-gear', veh.gear);
  $('h-rpm').style.width = (veh.rpm / veh.spec.redline * 100).toFixed(1) + '%';
  setText('h-score', Math.round(run.score).toLocaleString('en')); setText('h-dist', (veh.s / PACE / 1000).toFixed(1) + ' km');
  setText('h-combo', run.combo > 1 ? `COMBO ×${run.combo}` : '');
  const d = $('h-damage'); d.style.width = (100 - veh.damage) + '%'; d.style.background = veh.damage > 66 ? '#ff5a4f' : veh.damage > 33 ? '#ffd60a' : '#4ade80';
  const sign = $('h-sign'), over = limit && vk > limit + 5, cls = 'sign' + (limit ? '' : ' free') + (over ? ' over' : '');
  if (sign.className !== cls) sign.className = cls; setText('h-sign', limit ? String(settings.units === 'mph' ? Math.round(limit / 1.609) : limit) : '');
  document.querySelector('.speed').classList.toggle('over', !!over);
  setText('h-clock', sky.clockString()); const w = WEATHERS[sky.weather]; setText('h-weather', `${w.icon} ${t(w.label)}`);
  $('touch').querySelector('.recover').classList.toggle('hidden', !(run.recoverT > 1.2));
  const slip = $('h-slip'); slip.classList.toggle('hidden', !(veh.sliding || veh.onSlick) || veh.rolling);
  setText('h-slip', t(veh.onSlick ? (world.spills.find((s) => s.kind === 'oil') ? 'ÖL!' : 'GLATT!') : 'SLIDE'));
  // police pill
  const pol = $('h-police'); pol.classList.toggle('hidden', !police.active);
  if (police.active) { const live = police.chasing, near = live.reduce((m, c) => Math.min(m, Math.abs(c.s - veh.s)), Infinity);
    const stop = police.phase === 'stop';
    setText('h-police-t', stop ? `BITTE FOLGEN · ${isFinite(near) ? Math.round(near) + ' m' : '—'}` : `${police.phase === 'hunt' ? 'FAHNDUNG · ' : ''}${police.heliOn ? 'HELI · ' : ''}${veh.flats ? 'REIFEN PLATT · ' : ''}${live.length} · ${isFinite(near) ? Math.round(near) + ' m' : '—'} · ${Math.max(0, Math.ceil(police.heat))} s`);
    $('h-police-bar').style.width = (stop ? clamp(police.stopT / 2.5, 0, 1) : clamp(police.bustT / 2.4, 0, 1)) * 100 + '%'; }
}
let popT = 0;
function showRadioPop() { const info = audio.radio?.info; if (!info) return; setText('rp-station', t(info.station)); setText('rp-track', info.title ? `${info.title} — ${info.artist}` : '');
  const el = $('radio-pop'); el.classList.add('show'); clearTimeout(popT); popT = setTimeout(() => el.classList.remove('show'), 3600); }

/* ------------------------------ menus ------------------------------ */
function updateMainUI() {
  $('m-car').textContent = veh.spec ? veh.spec.name : ''; $('m-best').textContent = settings.best ? t(`BEST ${settings.best.toLocaleString('en')} PTS`) : '';
  $('m-money').textContent = euro(settings.money); renderMissions();
  $('m-radio').textContent = audio.radio && audio.radio.station >= 0 ? STATIONS[audio.radio.station].name : 'Radio';
}
function updateGarageUI() {
  const s = veh.spec; if (!s || !carMesh) return; const ci = settings.colors[s.id] || 0;
  $('g-index').textContent = `${settings.car + 1} / ${CARS.length}`; $('g-name').textContent = s.name; $('g-sub').textContent = s.sub; $('g-engine').textContent = s.engine;
  $('g-ps').textContent = s.ps; $('g-vmax').textContent = s.vmax; $('g-acc').textContent = s.zeroTo100.toFixed(1);
  $('g-b1').style.width = (s.vmax / 440 * 100) + '%'; $('g-b2').style.width = clamp((5.2 - s.zeroTo100) / 3 * 100, 10, 100) + '%'; $('g-b3').style.width = clamp((s.handling - 0.6) / 0.55 * 100, 10, 100) + '%';
  const box = $('g-colors'); box.innerHTML = '';
  s.colors.forEach((c, i) => { const b = document.createElement('button'); b.style.background = '#' + c.toString(16).padStart(6, '0'); if (i === ci) b.className = 'on';
    const have = career.paintOwned(s.id, i); if (!have) { b.classList.add('locked'); b.title = euro(PAINT_PRICE); }
    b.onclick = () => { if (!have) { if (!career.owns(s.id) || !career.buyPaint(s.id, i)) { toast(career.owns(s.id) ? 'Not enough money' : 'LOCKED · ' + euro(priceOf(s.id)), euro(PAINT_PRICE), 'bad'); return; } toast('New paint', '−' + euro(PAINT_PRICE), 'good'); }
      settings.colors[s.id] = i; save(); setCarColor(carMesh, s, i); updateGarageUI(); audio.click(); }; box.appendChild(b); });
  const own = career.owns(s.id), price = priceOf(s.id), drive = $('g-drive');
  drive.textContent = own ? t('DRIVE') : t((settings.money >= price ? 'BUY · ' : 'LOCKED · ') + euro(price));
  drive.classList.toggle('primary', own || settings.money >= price); $('g-money').textContent = euro(settings.money);
  if (own) { settings.lastCar = settings.car; save(); }
  updateMainUI();
}
$('g-drive').onclick = () => { boot(); const s = veh.spec;
  if (career.owns(s.id)) { go('play'); return; }
  if (career.buyCar(s.id)) { toast('Unlocked!', s.name, 'good'); audio.bonus(); updateGarageUI(); if (career.st.owned.length >= 8) games.unlock('collector'); }
  else toast('Not enough money', euro(priceOf(s.id)), 'bad'); };
$('g-prev').onclick = () => { setCar(settings.car - 1); audio.click(); }; $('g-next').onclick = () => { setCar(settings.car + 1); audio.click(); };
const rev = $('g-rev'); rev.addEventListener('pointerdown', () => { boot(); revHeld = true; }); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) rev.addEventListener(ev, () => { revHeld = false; });
let dragging = false, dragX = 0;
addEventListener('pointerdown', (e) => { if (mode === 'garage' && !e.target.closest('.panel')) { dragging = true; dragX = e.clientX; } });
addEventListener('pointerup', () => { dragging = false; }); addEventListener('pointercancel', () => { dragging = false; });
addEventListener('pointermove', (e) => { if (dragging) { const dx = e.clientX - dragX; dragX = e.clientX; orbit -= dx * 0.008; orbitV = -dx * 0.3; } });

let musicSel = 0, confirmDel = null;   // { i, until }: a delete waiting for its second click
function updateRadioUI(info) {
  info = info || audio.radio?.info; if (!info) return;
  $('mu-station').textContent = t(info.station) + (info.freq ? ' · ' + info.freq : ''); $('mu-track').textContent = info.title || '—'; $('mu-artist').textContent = info.artist;
  for (const b of document.querySelectorAll('#mu-stations button')) b.classList.toggle('on', +b.dataset.i === audio.radio.station);
  if (mode !== 'play' && !$('s-music').classList.contains('hidden')) renderTracks();
  updateMainUI();
}
function updateMusicUI() {
  const box = $('mu-stations'); box.innerHTML = '';
  STATIONS.forEach((s, i) => { const b = document.createElement('button'); b.dataset.i = i; b.classList.toggle('sel', i === musicSel);
    b.innerHTML = `<em>${s.freq}</em><span>${s.name}</span><small>${s.genre}</small>`;
    b.onclick = async () => { await boot(); musicSel = i; audio.radio.setStation(i); audio.tuning(); updateMusicUI(); }; box.appendChild(b); });
  renderTracks(); updateRadioUI();
}
// the track list of the selected station: play, remove (built-in tracks can be restored; your own files are deleted)
function renderTracks() {
  const st = STATIONS[musicSel], list = $('mu-tracks'), hidden = settings.hidden[st.id] || [], r = audio.radio;
  $('mu-tracks-title').textContent = st.user ? 'MEINE MUSIK · YOUR FILES' : `${st.name} · TRACKS`;
  $('mu-user-tools').classList.toggle('hidden', !st.user);
  list.innerHTML = '';
  const rows = st.user ? (r ? r.user.list.map((t, i) => ({ i, title: t.name, artist: 'Your file' })) : []) : st.tracks.map((t, i) => ({ i, title: t[0], artist: t[1], off: hidden.includes(i) }));
  if (!rows.length) { const e = document.createElement('div'); e.className = 'muted small'; e.textContent = st.user ? 'No files yet. Add your own music below.' : ''; list.appendChild(e); }
  for (const row of rows) {
    const d = document.createElement('div'); d.className = 'trk' + (row.off ? ' off' : '') + (r && r.station === musicSel && r.track === row.i ? ' on' : '');
    const play = document.createElement('button'); play.className = 'ic'; play.textContent = '▶'; play.title = 'Play'; play.disabled = !!row.off;
    play.onclick = async () => { await boot(); audio.radio.setStation(musicSel, row.i); };
    const name = document.createElement('span'); name.innerHTML = `<b></b><small></small>`; name.querySelector('b').textContent = row.title; name.querySelector('small').textContent = row.artist;
    const x = document.createElement('button'), sure = st.user && confirmDel && confirmDel.i === row.i && confirmDel.until > performance.now();
    x.className = 'ic del' + (sure ? ' sure' : ''); x.textContent = sure ? 'DELETE?' : row.off ? '↺' : '✕'; x.title = st.user ? 'Delete this file' : row.off ? 'Put back' : 'Remove from rotation';
    x.onclick = async () => {
      await boot();
      if (st.user) { if (!(confirmDel && confirmDel.i === row.i && confirmDel.until > performance.now())) { confirmDel = { i: row.i, until: performance.now() + 3000 }; renderTracks(); setTimeout(() => { if (confirmDel && confirmDel.until <= performance.now()) { confirmDel = null; renderTracks(); } }, 3100); return; }
        confirmDel = null; const playing = audio.radio.station === musicSel && audio.radio.track === row.i; await audio.radio.user.remove(row.i);
        if (playing) audio.radio.setStation(musicSel); else if (audio.radio.station === musicSel && audio.radio.track > row.i) audio.radio.track--; }
      else { const h = settings.hidden[st.id] || (settings.hidden[st.id] = []); if (row.off) h.splice(h.indexOf(row.i), 1); else h.push(row.i); save(); audio.radio.hidden = settings.hidden; audio.radio.refresh(); }
      renderTracks();
    };
    d.append(play, name, x); list.appendChild(d);
  }
  const removed = hidden.length;
  $('mu-restore').classList.toggle('hidden', st.user || !removed); $('mu-restore').textContent = `RESTORE ${removed} REMOVED`;
}
$('mu-restore').onclick = () => { delete settings.hidden[STATIONS[musicSel].id]; save(); if (audio.radio) { audio.radio.hidden = settings.hidden; audio.radio.refresh(); } renderTracks(); };
$('mu-prev').onclick = () => audio.radio?.next(-1); $('mu-next').onclick = () => audio.radio?.next(1); $('mu-off').onclick = () => audio.radio?.stop();
$('mu-files').addEventListener('change', async (e) => { await boot(); await audio.radio.user.add([...e.target.files]); e.target.value = ''; musicSel = STATIONS.findIndex((s) => s.user); audio.radio.setStation(musicSel, Math.max(0, audio.radio.user.list.length - 1)); updateMusicUI(); });

function applyAudioSettings() { audio.vol = { master: settings.master / 100, music: settings.music / 100, engine: settings.engine / 100, sfx: settings.sfx / 100 }; audio.applyVolumes(); }
function applyWorldSettings() { sky.setTimeMode(settings.time); sky.setWeatherMode(settings.weather); traffic.density = +settings.traffic; }
for (const el of document.querySelectorAll('[data-set]')) {
  const k = el.dataset.set; el.value = settings[k];
  el.addEventListener('input', () => { settings[k] = el.type === 'range' ? +el.value : el.value; save(); applyAudioSettings(); applyWorldSettings(); applyControls(); if (k === 'quality') setupQuality(); if (k === 'lang') { applyLang(resolveLang(settings.lang)); updateMainUI(); updateGarageUI(); updateMusicUI(); } });
}

/* ------------------------------ main loop ------------------------------ */
const clock = new THREE.Clock();
let elapsed = 0;
const perf = { t: 0, n: 0 };
let saverAcc = 0;
function frame() {
  requestAnimationFrame(frame);
  if (settings.quality === 'saver') { saverAcc += clock.getDelta(); if (saverAcc < 1 / 31) return; }   // battery saver: about 30 fps
  const real = settings.quality === 'saver' ? Math.min(0.1, saverAcc) : clock.getDelta(); saverAcc = 0;
  simulate(Math.min(0.05, real));
  render();
  // Auto graphics: if driving runs below ~28 fps for a few seconds, step the quality down
  if (settings.quality === 'auto' && mode === 'play' && autoQ !== 'low') {
    perf.t += real; perf.n++;
    if (perf.t > 4) { if (perf.t / perf.n > 1 / 28) { autoQ = autoQ === 'high' ? 'medium' : 'low'; setupQuality(); toast('GRAPHICS: ' + autoQ.toUpperCase(), 'for smoother driving', ''); } perf.t = 0; perf.n = 0; }
  } else { perf.t = 0; perf.n = 0; }
}
function sirenState() {
  let best = null, bd = Infinity;
  for (const c of police.chasing) { const d = Math.hypot(c.x - veh.x, c.s - veh.s); if (d < bd) { bd = d; best = c; } }
  if (!best || bd > 600) { blueLight.intensity = 0; return null; }
  const polite = police.phase === 'stop';   // pulling someone over: blue lights, no siren
  const k = ((performance.now() / 60) | 0) % 8;
  blueLight.position.set(best.x, 2.2, -(best.s - world.s)); blueLight.intensity = (k === 0 || k === 2 || k === 4 || k === 6 ? 30 : 0) * (0.3 + sky.night * 0.7 + sky.fogLevel * 0.5);
  const approach = (best.vs - veh.vs) * Math.sign(veh.s - best.s);
  return { level: polite ? 0 : Math.pow(clamp(1 - bd / 550, 0, 1), 1.4), pan: clamp((best.x - veh.x) / 14, -1, 1), cents: 1200 * Math.log2(343 / (343 - clamp(approach, -60, 60))) };
}
function simulate(dt) {
  if (mode === 'paused') { audio.update({ rpm: veh.spec.idle, throttle: 0, engineOn: false, bedsOn: false, speed: 0, wet: 0, rain: sky.cur.rain, scrape: 0 }); return; }
  if (mode === 'play' && veh.rolling) dt *= 0.6;            // a little slow motion while the car tumbles
  elapsed += dt; readInput(dt);
  let engineOn = true, thr = 0; veh.scrape = 0;
  if (mode === 'play') { physics(dt, true); rules(dt); thr = veh.thrAudio; engineOn = !veh.wrecked; }
  else if (mode === 'over') { physics(dt, false); engineOn = false; }
  else { // menu / garage: the car idles or cruises for the camera
    const tv = mode === 'garage' ? 0 : 118 / KMH; veh.vs += (tv - veh.vs) * Math.min(1, dt * 0.9); veh.s += veh.vs * dt * PACE; veh.vx = 0;
    veh.x += (LANES[1] - veh.x) * Math.min(1, dt * 2); veh.psi = 0; veh.r = 0; veh.ax = 0; veh.ay = 0; veh.damage = 0; veh.phi = 0; veh.rolling = false; veh.wrecked = false; veh.skid = 0; input.steer = 0; run.wreckT = 0;
    const spec = veh.spec;
    if (mode === 'garage') { const target = revHeld ? spec.redline * 0.97 : spec.idle; veh.rpm += (target - veh.rpm) * Math.min(1, dt * (revHeld ? 2.6 : 2.0)); thr = revHeld ? 1 : 0; }
    else { veh.rpm += (spec.redline * 0.3 - veh.rpm) * dt * 2; thr = 0.2; engineOn = false; }
  }
  world.update(dt, veh.s, sky);
  traffic.update(dt, veh, sky, mode === 'play' || mode === 'over');
  fx.update(dt);
  updateCar(dt); updateCamera(dt, elapsed);
  sky.update(dt, camera, veh.speed, veh.s);
  const info = audio.radio?.info || {};
  cockpit.update(dt, { speed: veh.speed, speedText: fmtSpeed(veh.speed), unit: settings.units === 'mph' ? 'MPH' : 'KM/H', rpm: veh.rpm, redline: veh.spec.redline, gear: veh.gear, steer: input.steer,
    rain: Math.max(sky.cur.rain, sky.cur.snow * 0.6), limit: run.limit, station: info.station === 'RADIO OFF' ? '' : info.station, freq: info.freq, title: info.title, artist: info.artist,
    clock: sky.clockString(), temp: Math.round(sky.snowCover > 0.2 || sky.cur.snow > 0.3 ? -2 : 12 + 9 * sky.daylight - 6 * sky.cur.rain), weather: WEATHERS[sky.weather].label.toUpperCase(),
    police: police.active, slide: veh.sliding, onSlick: veh.onSlick, flash: flashT > 0, fog: sky.fogLevel > 0.3, damage: veh.damage, trip: (veh.s / 1000).toFixed(1), wrecked: veh.wrecked });
  if (mode === 'play') updateHUD();
  audio.update({ rpm: veh.rpm, throttle: thr, engineOn, bedsOn: mode === 'play', interior: camMode === 2, speed: veh.speed, wet: sky.wet, rain: sky.cur.rain, scrape: veh.scrape,
    skid: mode === 'play' && !veh.rolling ? veh.skid : 0, siren: mode === 'play' || mode === 'over' ? sirenState() : null, heli: mode === 'play' ? police.heliLevel || 0 : 0 });
  if (bloom) bloom.strength = 0.35 + sky.night * 0.45 + sky.cur.fog * 20;
  renderer.toneMappingExposure = 1.0 - sky.night * 0.1;
}
function render() {
  if (cockpit.group?.visible) cockpit.renderMirror(renderer, scene, carMesh);
  if (composer) composer.render(); else renderer.render(scene, camera);
}

setupQuality(); applyWorldSettings(); applyControls(); checkOrientation(); setCar(settings.car); updateMainUI(); updateMusicUI();
{ const done = world.land.warmup(); try { renderer.compile(scene, camera); } catch {} done(); }   // compile the country-road shaders now, not mid-drive
// offline play and installing as an app (needs http(s), not file://)
const nativeApp = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.App : null;
if (!nativeApp && 'serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
// Android app: the system back button pauses, closes the open panel, or leaves the app from the main menu
if (nativeApp) {
  nativeApp.addListener('backButton', () => {
    if (mode === 'play') go('pause');
    else if (mode === 'paused') go(document.querySelector('#s-pause.hidden') ? 'back' : 'resume');
    else if (mode === 'menu' && !document.querySelector('#s-main.hidden')) nativeApp.minimizeApp();
    else go('main');
  });
  nativeApp.addListener('appStateChange', ({ isActive }) => { if (!isActive && mode === 'play') go('pause'); audio.setHidden(!isActive); });
}
sky.setWeather(settings.weather === 'dynamic' ? 'clear' : settings.weather, true);
window.__game = { simulate, input, keys, player: veh, veh, run, sky, world, traffic, police, audio, settings, cockpit, fx, go, setCar,
  get mode() { return mode; }, get carMesh() { return carMesh; }, set cam(v) { camMode = v; }, get cam() { return camMode; }, set orbit(v) { orbit = v; } };
frame();
