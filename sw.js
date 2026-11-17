// Offline support: everything the game needs is cached on first load, then
// served from the cache while a fresh copy is fetched in the background
// (so an update shows up on the next launch). Bump VERSION to force a refresh.
const VERSION = 'autobahn-rush-2';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  "css/style.css",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "src/audio.js",
  "src/cars.js",
  "src/cockpit.js",
  "src/engine-worklet.js",
  "src/fx.js",
  "src/main.js",
  "src/mobile.js",
  "src/physics.js",
  "src/police.js",
  "src/props.js",
  "src/radio.js",
  "src/sky.js",
  "src/specs.js",
  "src/traffic.js",
  "src/vehicle.js",
  "src/world.js",
  "vendor/addons/environments/RoomEnvironment.js",
  "vendor/addons/postprocessing/EffectComposer.js",
  "vendor/addons/postprocessing/MaskPass.js",
  "vendor/addons/postprocessing/OutputPass.js",
  "vendor/addons/postprocessing/Pass.js",
  "vendor/addons/postprocessing/RenderPass.js",
  "vendor/addons/postprocessing/ShaderPass.js",
  "vendor/addons/postprocessing/UnrealBloomPass.js",
  "vendor/addons/shaders/CopyShader.js",
  "vendor/addons/shaders/LuminosityHighPassShader.js",
  "vendor/addons/shaders/OutputShader.js",
  "vendor/addons/utils/BufferGeometryUtils.js",
  "vendor/three.module.min.js",
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
