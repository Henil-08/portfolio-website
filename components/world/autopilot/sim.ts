import { TRACK_WIDTH, trackCurve } from "../layout";

// A tiny self-driving lab: a kinematic car model, a small neural network per car,
// and a genetic algorithm that evolves them to lap the circuit. Runs in the browser.

const N = 600;
const PTS = trackCurve.getSpacedPoints(N);
const TAN = PTS.map((_, i) => trackCurve.getTangentAt(i / N));
const LENGTH = trackCurve.getLength();
const SEG = LENGTH / N;
const HALF = TRACK_WIDTH / 2;

// Network shape: inputs -> hidden -> outputs (steer, throttle).
// Inputs: five distance sensors to the track edge (like lidar), speed, bias.
const RAYS = [-1.0, -0.45, 0, 0.45, 1.0]; // angles relative to heading, radians
const RAY_STEP = 1.6;
const RAY_STEPS = 12;
const IN = RAYS.length + 2;
const HID = 10;
const OUT = 2;
export const GENES = IN * HID + HID + HID * OUT + OUT;

export type Car = {
  x: number;
  z: number;
  h: number; // heading, radians (forward = (cos h, -sin h) like the real car)
  v: number;
  idx: number; // nearest track sample
  progress: number; // samples travelled, unwrapped
  alive: boolean;
  age: number;
  genes: Float32Array;
};

function nearestIdx(x: number, z: number, hint: number) {
  // Search near the last index first; the car only moves a little per step.
  let best = hint;
  let bd = Infinity;
  for (let k = -14; k <= 14; k++) {
    const i = (hint + k + N) % N;
    const p = PTS[i];
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

function offTrack(x: number, z: number, hint: number) {
  const i = nearestIdx(x, z, hint);
  const p = PTS[i];
  return Math.hypot(x - p.x, z - p.z) > HALF;
}

// What the network sees: how far it can go before leaving the track in five directions.
function sense(c: Car, out: Float32Array) {
  for (let r = 0; r < RAYS.length; r++) {
    const a = c.h + RAYS[r];
    const dx = Math.cos(a);
    const dz = -Math.sin(a);
    let d = RAY_STEPS;
    for (let k = 1; k <= RAY_STEPS; k++) {
      if (offTrack(c.x + dx * k * RAY_STEP, c.z + dz * k * RAY_STEP, c.idx)) {
        d = k - 1;
        break;
      }
    }
    out[r] = d / RAY_STEPS;
  }
  out[RAYS.length] = c.v / 25;
  out[RAYS.length + 1] = 1;
}

const hidden = new Float32Array(HID);
function think(g: Float32Array, x: Float32Array, out: Float32Array) {
  let o = 0;
  for (let j = 0; j < HID; j++) {
    let s = 0;
    for (let i = 0; i < IN; i++) s += x[i] * g[o + j * IN + i];
    hidden[j] = Math.tanh(s + g[IN * HID + j]);
  }
  o = IN * HID + HID;
  for (let k = 0; k < OUT; k++) {
    let s = g[o + HID * OUT + k];
    for (let j = 0; j < HID; j++) s += hidden[j] * g[o + k * HID + j];
    out[k] = Math.tanh(s);
  }
}

export function randomGenes() {
  const g = new Float32Array(GENES);
  for (let i = 0; i < GENES; i++) g[i] = (Math.random() * 2 - 1) * 0.25;
  return g;
}

function gauss() {
  return Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(2 * Math.PI * Math.random());
}

export class Population {
  cars: Car[] = [];
  gen = 1;
  best = 0; // best lap fraction ever
  history: number[] = [];
  private elite: Float32Array[] = [];
  private sense = new Float32Array(IN);
  private act = new Float32Array(OUT);
  private time = 0;

  constructor(public size = 40, private start = 0.06) {
    this.spawn(Array.from({ length: size }, randomGenes));
  }

  private spawn(genes: Float32Array[]) {
    const i0 = Math.round(this.start * N) % N;
    const p = PTS[i0];
    const t = TAN[i0];
    this.cars = genes.map((g) => ({
      x: p.x,
      z: p.z,
      h: Math.atan2(-t.z, t.x),
      v: 0,
      idx: i0,
      progress: 0,
      alive: true,
      age: 0,
      genes: g,
    }));
    this.time = 0;
  }

  step(dt: number) {
    let alive = 0;
    for (const c of this.cars) {
      if (!c.alive) continue;
      sense(c, this.sense);
      think(c.genes, this.sense, this.act);
      const steer = this.act[0];
      const throttle = (this.act[1] + 1) / 2;
      c.v += (throttle * 24 - c.v * 0.6) * dt;
      c.h += steer * 2.2 * dt * Math.min(1, c.v / 4);
      c.x += Math.cos(c.h) * c.v * dt;
      c.z += -Math.sin(c.h) * c.v * dt;
      const prev = c.idx;
      c.idx = nearestIdx(c.x, c.z, c.idx);
      let d = c.idx - prev;
      if (d > N / 2) d -= N;
      if (d < -N / 2) d += N;
      c.progress += d;
      c.age += dt;
      const p = PTS[c.idx];
      const off = Math.hypot(c.x - p.x, c.z - p.z);
      // Off track, going backwards, or dawdling: out.
      if (off > HALF + 0.6 || c.progress < -5 || (c.age > 4 && c.progress / c.age < 3)) c.alive = false;
      if (c.progress >= N * 2) c.alive = false; // two clean laps is plenty
      if (c.alive) alive++;
    }
    this.time += dt;
    if (alive === 0 || this.time > 25) this.evolve();
  }

  private evolve() {
    const ranked = [...this.cars].sort((a, b) => b.progress - a.progress);
    const lap = Math.min(2, ranked[0].progress / N);
    this.best = Math.max(this.best, lap);
    this.history.push(lap);
    this.elite = ranked.slice(0, 5).map((c) => c.genes);
    const next: Float32Array[] = [...this.elite];
    while (next.length < this.size) {
      const a = this.elite[Math.floor(Math.random() * this.elite.length)];
      const b = this.elite[Math.floor(Math.random() * this.elite.length)];
      const g = new Float32Array(GENES);
      const rate = this.best > 1 ? 0.05 : 0.12;
      for (let i = 0; i < GENES; i++) {
        g[i] = (Math.random() < 0.5 ? a[i] : b[i]) + (Math.random() < rate ? gauss() * 0.4 : 0);
      }
      next.push(g);
    }
    this.gen++;
    this.spawn(next);
  }

  leader() {
    let best: Car | null = null;
    for (const c of this.cars) if (c.alive && (!best || c.progress > best.progress)) best = c;
    return best ?? this.cars[0];
  }
}

export const SEGMENT_LENGTH = SEG;
