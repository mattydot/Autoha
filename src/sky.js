// Sky dome, day/night cycle, weather state machine, precipitation.
import * as THREE from 'three';

export const WEATHERS = {
  clear:    { label: 'Clear',    icon: '☀', cloud: 0.12, fog: 0.00030, rain: 0, snow: 0, storm: 0 },
  cloudy:   { label: 'Cloudy',   icon: '⛅', cloud: 0.55, fog: 0.00045, rain: 0, snow: 0, storm: 0 },
  overcast: { label: 'Overcast', icon: '☁', cloud: 0.95, fog: 0.00070, rain: 0, snow: 0, storm: 0 },
  rain:     { label: 'Rain',     icon: '🌧', cloud: 1.0,  fog: 0.0016,  rain: 0.6, snow: 0, storm: 0 },
  storm:    { label: 'Storm',    icon: '⛈', cloud: 1.0,  fog: 0.0024,  rain: 1.0, snow: 0, storm: 1 },
  mist:     { label: 'Nebel',    icon: '🌫', cloud: 0.7,  fog: 0.0105,  rain: 0, snow: 0, storm: 0 },
  snow:     { label: 'Snow',     icon: '❄', cloud: 0.95, fog: 0.0036,  rain: 0, snow: 1, storm: 0 },
};
const NEXT = { // plausible transitions
  clear: ['clear', 'cloudy', 'cloudy', 'mist', 'mist'], cloudy: ['clear', 'overcast', 'rain', 'mist', 'mist'],
  overcast: ['cloudy', 'rain', 'rain', 'storm', 'snow', 'mist'], rain: ['storm', 'storm', 'overcast', 'cloudy'],
  storm: ['rain', 'rain', 'overcast', 'mist'], mist: ['clear', 'cloudy', 'overcast', 'mist'], snow: ['overcast', 'cloudy', 'snow', 'mist'],
};

const C = (h) => new THREE.Color(h);
// keyframes over sun height h = sin(elevation)
const KEYS = [
  { h: -0.35, zen: C(0x03060f), hor: C(0x0a1020), sun: C(0x8fa8ff), sunI: 0.4, amb: 0.3 },
  { h: -0.12, zen: C(0x070b22), hor: C(0x1c2244), sun: C(0x8fa8ff), sunI: 0.3, amb: 0.3 },
  { h: -0.02, zen: C(0x1b2a5e), hor: C(0xe0683a), sun: C(0xff7a3a), sunI: 0.9, amb: 0.75 },
  { h: 0.07,  zen: C(0x3565ad), hor: C(0xf7a85e), sun: C(0xffa25a), sunI: 2.3, amb: 1.0 },
  { h: 0.22,  zen: C(0x2f6fd0), hor: C(0xc5d8ea), sun: C(0xffe2b8), sunI: 2.8, amb: 1.05 },
  { h: 0.6,   zen: C(0x2468d6), hor: C(0xa8cbee), sun: C(0xfff6e8), sunI: 3.2, amb: 1.1 },
];

const skyVert = /* glsl */`varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`;
const skyFrag = /* glsl */`
uniform vec3 zen, hor, sunCol, sunDir, moonDir; uniform float cloud, time, flash, night, dark;
varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+vec2(17.0,5.0); a*=0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float y = max(d.y, 0.0);
  vec3 col = mix(hor, zen, pow(y, 0.45));
  float sd = max(dot(d, sunDir), 0.0);
  float clear = 1.0 - cloud;
  col += sunCol * (pow(sd, 6.0) * 0.25 + pow(sd, 40.0) * 0.5) * (0.25 + 0.75 * clear) * (1.0 - night);
  col += sunCol * smoothstep(0.9993, 0.9997, sd) * 30.0 * clear * clear * (1.0 - night);
  float md = max(dot(d, moonDir), 0.0);
  col += vec3(0.8,0.85,1.0) * (smoothstep(0.9996, 0.9998, md) * 4.0 + pow(md, 300.0) * 0.25) * night * clear;
  // stars
  vec3 sp = d * 220.0; vec3 cell = floor(sp); float st = fract(sin(dot(cell, vec3(12.9898,78.233,37.719))) * 43758.5453);
  float tw = 0.7 + 0.3 * sin(time * 2.0 + st * 60.0);
  col += vec3(1.0) * step(0.9975, st) * smoothstep(0.0, 0.25, d.y) * night * clear * clear * tw * 1.5;
  // clouds on a virtual plane
  if (d.y > 0.0) {
    vec2 uv = d.xz / (d.y + 0.12) * 1.3 + vec2(time * 0.012, time * 0.004);
    float n = fbm(uv);
    float cover = smoothstep(1.0 - cloud * 1.05, 1.25 - cloud * 0.95, n + 0.25);
    float lum = dot(mix(hor, zen, 0.35), vec3(0.3, 0.5, 0.2));
    vec3 lit = mix(vec3(lum) * 1.25 + 0.05 * (1.0 - night), sunCol * 0.9 + hor * 0.4, pow(sd, 3.0) * 0.6 * (1.0 - night));
    vec3 shade = lit * mix(0.95, 0.35, fbm(uv * 2.3 + 4.0)) * mix(1.0, 0.45, dark);
    col = mix(col, shade, cover * smoothstep(0.0, 0.12, d.y));
  }
  col = mix(col, hor, smoothstep(0.06, -0.02, d.y));
  col += vec3(0.75, 0.8, 1.0) * flash * (0.35 + 0.65 * smoothstep(-0.1, 0.6, d.y));
  gl_FragColor = vec4(col, 1.0);
}`;

const rainVert = /* glsl */`
attribute vec3 seed; attribute float end;
uniform float time, fall, len, travel, slant; uniform vec3 boxSize;
varying float vA;
void main(){
  vec3 p = seed * boxSize;
  p.y = mod(p.y - time * fall * (0.8 + 0.4 * fract(seed.x * 91.7)), boxSize.y);
  p.z = mod(p.z + travel, boxSize.z) - boxSize.z * 0.8;
  p.x = p.x - boxSize.x * 0.5 + sin(time * 1.3 + seed.z * 40.0) * slant;
  vec3 dir = normalize(vec3(0.0, -fall, uTrail));
  p -= dir * len * end;
  vec4 mv = viewMatrix * vec4(p + vec3(cameraPosition.x, 0.0, cameraPosition.z), 1.0);
  vA = smoothstep(-boxSize.z * 0.8, -boxSize.z * 0.55, p.z) * (1.0 - end * 0.6);
  gl_Position = projectionMatrix * mv;
}`.replace('uniform vec3 boxSize;', 'uniform vec3 boxSize; uniform float uTrail;');
const rainFrag = /* glsl */`uniform vec3 color; uniform float opacity; varying float vA; void main(){ gl_FragColor = vec4(color, opacity * vA); }`;

export class Sky {
  constructor(scene, renderer) {
    this.scene = scene;
    this.time = 9.5;              // hours
    this.dayLength = 420;         // seconds for 24h
    this.timeMode = 'cycle';
    this.weatherMode = 'dynamic';
    this.weather = 'clear'; this.nextChange = 40;
    this.cur = { cloud: 0.12, fog: 0.0003, rain: 0, snow: 0, storm: 0 };
    this.wet = 0; this.snowCover = 0; this.flash = 0; this.nextBolt = 5; this.onThunder = null;
    this.daylight = 1; this.night = 0; this.fogLevel = 0;

    this.u = { zen: { value: C(0) }, hor: { value: C(0) }, sunCol: { value: C(0xffffff) }, sunDir: { value: new THREE.Vector3(0, 1, 0) },
      moonDir: { value: new THREE.Vector3(0, 1, 0) }, cloud: { value: 0 }, time: { value: 0 }, flash: { value: 0 }, night: { value: 0 }, dark: { value: 0 } };
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false }));
    this.dome.frustumCulled = false; this.dome.renderOrder = -10; scene.add(this.dome);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 1); scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 3); scene.add(this.sun); scene.add(this.sun.target);
    scene.fog = new THREE.FogExp2(0xa8cbee, 0.0003);

    // precipitation: line streaks in a box that follows the camera
    const N = 3600, seed = new Float32Array(N * 2 * 3), end = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { const a = Math.random(), b = Math.random(), c = Math.random(); for (let k = 0; k < 2; k++) { seed.set([a, b, c], (i * 2 + k) * 3); end[i * 2 + k] = k; } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 3)); g.setAttribute('end', new THREE.BufferAttribute(end, 1));
    this.pu = { time: this.u.time, fall: { value: 22 }, len: { value: 0.9 }, travel: { value: 0 }, slant: { value: 0 }, uTrail: { value: 0 },
      boxSize: { value: new THREE.Vector3(36, 16, 60) }, color: { value: C(0xc8d4e6) }, opacity: { value: 0 } };
    this.precip = new THREE.LineSegments(g, new THREE.ShaderMaterial({ uniforms: this.pu, vertexShader: rainVert, fragmentShader: rainFrag, transparent: true, depthWrite: false }));
    this.precip.frustumCulled = false; this.precip.visible = false; this.precip.renderOrder = 5; scene.add(this.precip);
    this.fullCount = N * 2;
  }

  setWeather(name, instant = false) {
    this.weather = name; if (instant) Object.assign(this.cur, WEATHERS[name], { label: undefined, icon: undefined });
  }
  setTimeMode(mode) {
    this.timeMode = mode;
    const fixed = { dawn: 5.95, day: 13, sunset: 20.0, night: 0.5 }[mode];
    if (fixed !== undefined) this.time = fixed;
  }
  setWeatherMode(mode) { this.weatherMode = mode; if (mode !== 'dynamic') this.weather = mode; else this.nextChange = 30 + Math.random() * 30; }

  clockString() { const h = Math.floor(this.time), m = Math.floor((this.time - h) * 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }

  update(dt, camera, speed, travel) {
    if (this.timeMode === 'cycle') this.time = (this.time + dt * 24 / this.dayLength) % 24;
    this.u.time.value += dt;

    // weather state machine
    if (this.weatherMode === 'dynamic') {
      this.nextChange -= dt;
      if (this.nextChange <= 0) { const o = NEXT[this.weather], dawn = this.time > 4 && this.time < 9.5;
        this.weather = dawn && this.weather !== 'mist' && Math.random() < 0.35 ? 'mist' : o[(Math.random() * o.length) | 0]; this.nextChange = 40 + Math.random() * 45; }
    }
    const tgt = WEATHERS[this.weather], k = 1 - Math.exp(-dt / 6);
    for (const key of ['cloud', 'rain', 'snow', 'storm']) this.cur[key] += (tgt[key] - this.cur[key]) * k;
    this.cur.fog *= Math.pow(tgt.fog / this.cur.fog, k);   // fog blends in log space
    this.wet = THREE.MathUtils.clamp(this.wet + (this.cur.rain > 0.15 ? dt / 8 : -dt / 45), 0, 1);
    this.snowCover = THREE.MathUtils.clamp(this.snowCover + (this.cur.snow > 0.3 ? dt / 25 : -dt / 40), 0, 1);

    // sun
    // long summer day: sunrise 05:30, sunset 20:30
    const tt = this.time, a = tt >= 5.5 && tt <= 20.5 ? (tt - 5.5) / 15 * Math.PI : Math.PI + (((tt - 20.5 + 24) % 24) / 9) * Math.PI, h = Math.sin(a);
    const sunDir = this.u.sunDir.value.set(Math.cos(a) * 0.55, h, -0.25 - 0.75 * Math.abs(Math.cos(a))).normalize();
    this.u.moonDir.value.set(-0.35, Math.max(0.25, -h * 0.8), -0.7).normalize();
    let i = 0; while (i < KEYS.length - 2 && h > KEYS[i + 1].h) i++;
    const A = KEYS[i], B = KEYS[i + 1], t = THREE.MathUtils.smoothstep(h, A.h, B.h);
    const zen = this.u.zen.value.copy(A.zen).lerp(B.zen, t), hor = this.u.hor.value.copy(A.hor).lerp(B.hor, t);
    const sunCol = this.u.sunCol.value.copy(A.sun).lerp(B.sun, t);
    let sunI = A.sunI + (B.sunI - A.sunI) * t, amb = A.amb + (B.amb - A.amb) * t;
    this.night = 1 - THREE.MathUtils.smoothstep(h, -0.14, 0.02);
    this.daylight = THREE.MathUtils.smoothstep(h, -0.1, 0.25);

    // overcast greys the sky, storms darken it
    const cl = this.cur.cloud, grey = (zen.r + zen.g + zen.b) / 3, gh = (hor.r * 0.3 + hor.g * 0.5 + hor.b * 0.2);
    const dark = this.cur.storm * 0.55 + this.cur.rain * 0.15;
    zen.lerp(_c.setScalar(grey * 0.9), cl * 0.85).multiplyScalar(1 - dark);
    hor.lerp(_c.setScalar(gh), cl * 0.7 + this.cur.snow * 0.2).multiplyScalar(1 - dark * 0.8);
    const fogMix = Math.min(1, this.cur.fog * 120);
    hor.lerp(_c.setScalar(gh * 0.9 + 0.05 * this.daylight), fogMix * 0.6);
    this.u.cloud.value = cl; this.u.night.value = this.night; this.u.dark.value = dark;
    sunI *= (1 - cl * 0.8) * (1 - dark * 0.5); amb *= (1 - cl * 0.25) * (1 - dark * 0.45);

    // lightning
    this.flash = Math.max(0, this.flash - dt * 4.5);
    if (this.cur.storm > 0.5) {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) { this.flash = 1; this.flickerAt = 0.12; this.nextBolt = 3 + Math.random() * 9; if (this.onThunder) this.onThunder(0.4 + Math.random() * 2.2); }
      if (this.flickerAt > 0) { this.flickerAt -= dt; if (this.flickerAt <= 0 && Math.random() < 0.7) this.flash = 0.8; }
    }
    this.u.flash.value = this.flash;

    // lights
    const fromMoon = h < -0.04;
    this.sun.color.copy(sunCol); this.sun.intensity = sunI + this.flash * 3;
    this.sun.position.copy(fromMoon ? this.u.moonDir.value : sunDir).multiplyScalar(100).add(camera.position); this.sun.target.position.copy(camera.position);
    this.hemi.color.copy(zen).lerp(hor, 0.6).lerp(_c.setScalar(1), 0.35); this.hemi.groundColor.copy(hor).multiplyScalar(0.35);
    this.hemi.intensity = amb * 1.25 + this.flash * 2.5;
    this.scene.fog.color.copy(hor).lerp(_c.setRGB(0.8, 0.85, 1), this.flash * 0.4); // fog comes in banks along the road: in Nebel you drive in and out of thick patches,
    // and on clear mornings there are shallow banks in the low spots
    const n = 0.5 + 0.5 * Math.sin(travel / 640 + 1.3) * Math.cos(travel / 1730 + 0.4), mistW = clamp01((this.cur.fog - 0.002) / 0.006);
    const dawnBank = this.time > 4.5 && this.time < 9 && this.cur.rain < 0.2 ? Math.max(0, n - 0.62) / 0.38 * 0.0055 : 0;
    const density = this.cur.fog * (1 - mistW + mistW * (0.4 + 1.25 * n * n)) + dawnBank;
    this.fogLevel = clamp01((density - 0.0025) / 0.008);
    this.scene.fog.density = density;
    this.scene.environmentIntensity = 0.12 + 0.75 * this.daylight * (1 - cl * 0.4);
    this.dome.position.copy(camera.position);

    // precipitation
    const rain = this.cur.rain, snow = this.cur.snow, amt = Math.max(rain, snow);
    this.precip.visible = amt > 0.02;
    if (this.precip.visible) {
      const isSnow = snow > rain, p = this.pu;
      p.travel.value = travel % 60;
      p.fall.value = isSnow ? 2.2 : 24; p.len.value = isSnow ? 0.06 : 0.45 + Math.min(speed, 60) * 0.006;
      p.uTrail.value = Math.min(speed, 28) * (isSnow ? 0.5 : 0.9); p.slant.value = isSnow ? 0.6 : 0.05;
      p.color.value.setScalar(isSnow ? 1 : 0.75).multiplyScalar(0.35 + 0.65 * this.daylight + this.flash);
      p.opacity.value = isSnow ? 0.9 : 0.26;
      this.precip.geometry.setDrawRange(0, Math.floor(this.fullCount * Math.min(1, amt) / 2) * 2);
    }
  }
}
const _c = new THREE.Color();
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
