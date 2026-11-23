// Career: euros earned per run buy cars and paint, and three daily missions
// pay a bonus. Everything is stored in the settings object (localStorage).
import { CARS } from './specs.js';

// what each car costs to unlock (the first two are free)
export const PRICES = { m3: 0, r6: 0, rs6: 1500, m5b: 2500, kay: 3000, dakar: 3500, xm: 4000, g4: 4500, maybach: 5000, gt3: 6500, gtb: 8000, v10: 9000, v12: 12000, w16: 20000 };
export const PAINT_PRICE = 300;
export const priceOf = (id) => PRICES[id] ?? 5000;

// mission templates: what to do, how much, and the reward
const POOL = [
  { id: 'near', stat: 'near', n: [12, 25], reward: [500, 900], text: 'Get {n} near misses' },
  { id: 'km', stat: 'km', n: [8, 20], reward: [400, 900], text: 'Drive {n} km' },
  { id: 'speed', stat: 'top', n: [250, 300], reward: [500, 1000], text: 'Reach {n} km/h', max: true },
  { id: 'land', stat: 'landKm', n: [3, 7], reward: [500, 900], text: 'Drive {n} km on country roads' },
  { id: 'off', stat: 'offKm', n: [1, 3], reward: [600, 1100], text: 'Drive {n} km off-road or on forest tracks' },
  { id: 'town', stat: 'towns', n: [2, 4], reward: [500, 900], text: 'Drive through {n} villages' },
  { id: 'escape', stat: 'escapes', n: [1, 2], reward: [800, 1400], text: 'Escape the police {n}×' },
  { id: 'ticket', stat: 'tickets', n: [1, 1], reward: [500, 700], text: 'Get pulled over politely and take the ticket' },
  { id: 'exit', stat: 'exits', n: [2, 4], reward: [400, 800], text: 'Take {n} Autobahn exits' },
  { id: 'clean', stat: 'cleanKm', n: [5, 10], reward: [600, 1100], text: 'Drive {n} km in one run without damage', max: true },
];

const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function seeded(seed) { let x = 0; for (const c of seed) x = (x * 31 + c.charCodeAt(0)) >>> 0; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; }

export class Career {
  constructor(settings, save) {
    this.st = settings; this.save = save;
    settings.money ??= 0; settings.owned ??= ['m3', 'r6']; settings.paints ??= {};
    if (!this.owns(CARS[settings.car]?.id)) settings.car = CARS.findIndex((c) => c.id === 'm3');
    this.daily();
  }
  owns(id) { return priceOf(id) === 0 || this.st.owned.includes(id); }
  paintOwned(id, i) { return i === 0 || (this.st.paints[id] || []).includes(i); }
  buyCar(id) { const p = priceOf(id); if (this.owns(id) || this.st.money < p) return false; this.st.money -= p; this.st.owned.push(id); this.save(); return true; }
  buyPaint(id, i) { if (this.paintOwned(id, i) || this.st.money < PAINT_PRICE) return false; this.st.money -= PAINT_PRICE; (this.st.paints[id] ||= []).push(i); this.save(); return true; }
  earn(n) { this.st.money += Math.max(0, Math.round(n)); this.save(); }
  /** euros for a run: about one euro per 8 points, plus a little for distance */
  payout(score, km) { return Math.round(score / 8 + km * 20); }

  // three missions a day, the same for everyone on that day
  daily() {
    const d = today(); if (this.st.missions?.day === d) return this.st.missions;
    const rnd = seeded(d), pool = [...POOL], list = [];
    while (list.length < 3) { const t = pool.splice((rnd() * pool.length) | 0, 1)[0]; const k = rnd();
      list.push({ id: t.id, stat: t.stat, max: !!t.max, target: Math.round(t.n[0] + (t.n[1] - t.n[0]) * k), reward: Math.round((t.reward[0] + (t.reward[1] - t.reward[0]) * k) / 50) * 50, progress: 0, done: false, text: t.text }); }
    this.st.missions = { day: d, list }; this.save(); return this.st.missions;
  }
  /** report progress: `add` for counters (km, near misses...), `max` for records within a run (top speed, clean km). Returns missions completed just now. */
  track(stat, value, mode = 'add') {
    const done = []; const m = this.daily();
    for (const q of m.list) { if (q.done || q.stat !== stat) continue;
      q.progress = q.max || mode === 'max' ? Math.max(q.progress, value) : q.progress + value;
      if (q.progress >= q.target) { q.done = true; q.progress = q.target; this.st.money += q.reward; done.push(q); } }
    if (done.length || stat === 'km' || Math.random() < 0.05) this.save();
    return done;
  }
}
