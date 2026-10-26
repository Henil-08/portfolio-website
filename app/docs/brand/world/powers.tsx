"use client";

// Special powers for the start sequence mock (owner, 2026-10-26): once the world has landed,
// hold Shift to use the chosen vehicle's power. It starts from 10% charge (the charge it starts
// with sets its size: height, speed), runs while held and drains the meter (components/world/
// powers/meter.ts, shared with the game), ends on release or an empty bar, and the meter refills
// to full in 5 s when not in use.
//   V03 Atlas   SKYLINE   thruster flight: lifts off, hovers, glides back down
//   V01 TH-18   OVERTAKE  a burst down the track with DRS open, a light trail, fov kick and shake
//   V04 Apollo  SPLIT     turns ghost and dashes through a row of boards, then solidifies
//   V02 E14     SEND IT   a run-up, a big Baja jump, a heavy landing and a dust burst
// Every power is a pure function of the time since it started and how long it was held, so
// `window.__powerT` can freeze it for stills. Nothing sets React state per frame: the scene writes refs in useFrame and the HUD
// meter writes its DOM in requestAnimationFrame.
import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { GRID, PLAN, gridAhead, type BuildClock } from "./island";
import { M, W } from "./models";
import { ghostLook, type GhostLook } from "@/components/world/powers/ghost";
import Meter, { type MeterReading } from "@/components/ui/PowerMeter";
import { LAST, chargeOf as meterCharge, meterState, newPower as newMeter, powerName, startPower, stopPower, type PowerState as Meter0 } from "@/components/world/powers/meter";

declare global {
  interface Window {
    /** Dev only: freeze the running power at this many seconds since it started (for stills). */
    __powerT?: number;
    /** Dev only: hold the meter at this charge, 0..1 (for stills). */
    __powerCharge?: number;
  }
}

const DEV = process.env.NODE_ENV !== "production";
export { powerName };

/** A power in use: when it started, with how much charge, how long it was held (Infinity while it still is). */
type Fire = { t0: number; k: number; hold: number; /** the run's length, for the hold it was worked out at */ total?: [number, number] };
/** The shared meter, plus the power it's running. */
export type PowerState = Meter0 & { fire: Fire | null; code: string };

const now = () => performance.now() / 1000;
export const newPower = (code: string): PowerState => ({ ...newMeter(now()), fire: null, code });
const elapsed = (f: Fire, t: number) => (DEV && typeof window.__powerT === "number" ? window.__powerT : t - f.t0);
/** How long it's held, at most until the bar the power started with runs dry. */
const held = (f: Fire, code: string) => Math.min(f.hold, f.k * (LAST[code] ?? 2.5));

/** The meter, 0..1. */
const chargeOf = (P: PowerState, t = now()) => (DEV && typeof window.__powerCharge === "number" ? window.__powerCharge : meterCharge(P, t));

/** Lets go when the bar has run dry while held. */
function settle(P: PowerState, t: number) {
  const f = P.fire;
  if (f && f.hold === Infinity && t - f.t0 >= f.k * (LAST[P.code] ?? 2.5)) release(P, t);
}
/** Shift let go: the meter refills from here and the power winds down. */
function release(P: PowerState, t: number) {
  const f = P.fire;
  if (!f || f.hold !== Infinity) return;
  f.hold = held({ ...f, hold: t - f.t0 }, P.code);
  stopPower(P, t);
}
/** A power is still running (or flickering home). */
function busy(P: PowerState, t: number) {
  const f = P.fire;
  if (!f) return false;
  if (f.total?.[0] !== f.hold) f.total = [f.hold, (RUNS[P.code] ?? RUNS.V03)(f.k, held(f, P.code)).total];
  return elapsed(f, t) < f.total[1];
}

/** Starts the power if the world has landed, nothing is running and the meter holds at least MIN. */
function tryStart(P: PowerState) {
  const t = now();
  if (!P.armed || busy(P, t)) return false;
  if (DEV && typeof window.__powerCharge === "number") Object.assign(P, { c0: window.__powerCharge, t0: t, drain: 0 });
  const k = startPower(P, t, P.code);
  if (!k) return false;
  P.fire = { t0: t, k, hold: Infinity };
  return true;
}

/* ------------------------------------------------------------------ easing */

const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
const smooth = (a: number, b: number, x: number) => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const inOut3 = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ the powers, as timelines */

/** Where the vehicle is at one moment of a power. d is metres down the track from its slot. */
type Pose = {
  d: number;
  y: number;
  pitch: number;
  roll: number;
  squash: number;
  vis: boolean;
  /** 0..1: SPLIT's ghost */
  ghost: number;
  /** 0..1: SKYLINE's thrusters */
  thrust: number;
  /** 0..1: the light trail */
  trail: number;
  /** 0..1: TH-18's DRS flap open */
  drs: number;
  fov: number;
  shake: number;
};
const rest = (o: Pose) => {
  o.d = o.y = o.pitch = o.roll = o.ghost = o.thrust = o.trail = o.drs = o.fov = o.shake = 0;
  o.squash = 1;
  o.vis = true;
};
const newPose = (): Pose => {
  const o = {} as Pose;
  rest(o);
  return o;
};

/** A square particle: born at t0 at p, flies with v under gravity g, shrinks out over life. */
type Part = { t0: number; life: number; p: [number, number, number]; v: [number, number, number]; g: number; size: number; color: THREE.Color };

type Run = {
  /** when the vehicle stops moving (then it flickers home) */
  dur: number;
  /** until the vehicle is back on its slot */
  total: number;
  pose: (e: number, o: Pose) => void;
  /** how much of the climb the camera follows */
  camY: number;
  parts: Part[];
  /** SPLIT's boards, metres down the track */
  boards: number[];
  /** light trail: [x, y, width, colour] in the vehicle's frame, and its length in seconds */
  trail: { lines: [number, number, number, THREE.Color][]; lag: number } | null;
};

const ORANGE = new THREE.Color(W.orange);
const INK = new THREE.Color(W.ink);
const DUST = [new THREE.Color("#cfcdc4"), new THREE.Color("#5d5d58"), new THREE.Color("#e1ded6"), new THREE.Color("#b9b6ab")];

/** After a power that moved the vehicle away: it flickers out, the camera glides home, it flickers in on its slot. */
const OUT = 0.3;
const GAP = 0.6;
const IN = 0.3;
const HOME = OUT + GAP + IN;
const BLINK = 0.06;
function homeward(x: number, dEnd: number, o: Pose) {
  if (x < OUT) {
    o.d = dEnd;
    o.vis = x < OUT - BLINK && Math.floor(x / BLINK) % 2 === 0;
    return;
  }
  // the vehicle is hidden while it goes home, so the camera, which follows it, glides back
  o.d = dEnd * (1 - inOut3(clamp01((x - OUT) / GAP)));
  const xi = x - OUT - GAP;
  o.vis = xi >= 0 && (xi > IN - BLINK || Math.floor(xi / BLINK) % 2 === 1);
}

/** World position of the vehicle at a pose (yaw follows the track). */
const scratch = new THREE.Vector3();
function placeOf(o: Pose, out: THREE.Vector3) {
  const { p, yaw } = gridAhead(o.d, out);
  p.y += o.y;
  return yaw;
}

/** Particles from a timeline: `spawn` is called with the pose at each birth time. */
function emit(pose: Run["pose"], times: number[], make: (i: number, o: Pose, at: THREE.Vector3, yaw: number) => Part | Part[]) {
  const o = newPose();
  const out: Part[] = [];
  times.forEach((t, i) => {
    rest(o);
    pose(t, o);
    const at = new THREE.Vector3();
    const yaw = placeOf(o, at);
    const r = make(i, o, at, yaw);
    if (Array.isArray(r)) out.push(...r);
    else out.push(r);
  });
  return out;
}
/** A local offset (x right, z forward) turned by yaw. */
const local = (yaw: number, x: number, z: number): [number, number] => [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)];

/**
 * A burst along the track that pulls hard while held and coasts down after: speed v(e) = V(1 - e^(-e/up))
 * while held (h seconds), then v(h) e^(-(e - h)/off). Returns the distance at e, and when it has all but stopped.
 */
function burst(V: number, up: number, off: number, h: number) {
  const vh = V * (1 - Math.exp(-h / up));
  const dh = V * (h - up * (1 - Math.exp(-h / up)));
  const at = (e: number) => (e < h ? V * (e - up * (1 - Math.exp(-e / up))) : dh + vh * off * (1 - Math.exp(-(e - h) / off)));
  return { at, stop: h + 3 * off };
}

/** Each power from the charge k it started with and how long it was held (h, already capped by the bar). */
const RUNS: Record<string, (k: number, h: number) => Run> = {
  /** V03 Atlas: thruster flight, hovering while held, then a glide back down from wherever it is. */
  V03: (k, h) => {
    const up = 0.8;
    const H = 5.5 + 3.5 * k;
    const bob = (x: number) => 0.22 * Math.sin((x * Math.PI * 2) / 1.5);
    const climb = (x: number) => (x < up ? H * inOut3(x / up) : H + bob(x - up));
    const hOff = climb(h);
    const down = 1.0 * Math.sqrt(Math.max(0.15, hOff / H));
    const dur = h + down;
    const pose = (e: number, o: Pose) => {
      if (e < 0) return;
      if (e < h) {
        o.y = climb(e);
        if (e < up) {
          o.pitch = -0.07 * Math.sin((Math.PI * e) / up);
          o.thrust = smooth(0, 0.12, e);
        } else {
          o.roll = 0.025 * Math.sin(((e - up) * Math.PI * 2) / 2.1);
          o.thrust = 0.62;
        }
      } else if (e < dur) {
        const u = (e - h) / down;
        o.y = hOff * (1 - inOut3(u));
        o.pitch = 0.04 * Math.sin(Math.PI * u);
        o.thrust = 0.8 * (1 - smooth(0.8, 1, u));
      } else {
        // touchdown: a little suspension bounce
        const x = e - dur;
        o.squash = 1 - 0.09 * Math.sin(x * 15) * Math.exp(-6 * x);
      }
    };
    const r = rng(303);
    const times: number[] = [];
    for (let t = 0.1; t < dur - 0.3; t += 1 / 28) times.push(t);
    const parts = emit(pose, times, (i, o, at, yaw) => {
      const [lx, lz] = local(yaw, i % 2 ? 0.62 : -0.62, (i >> 1) % 2 ? 1.35 : -1.35);
      return {
        t0: times[i],
        life: 1.0 + r() * 0.5,
        p: [at.x + lx, at.y + 0.05, at.z + lz],
        v: [(r() - 0.5) * 0.9, -1.4 - r() * 1.6, (r() - 0.5) * 0.9],
        g: -6,
        size: 0.13 + r() * 0.12,
        color: r() < 0.55 ? ORANGE : INK,
      };
    });
    return { dur, total: dur + 0.8, pose, camY: 0.45, parts, boards: [], trail: null };
  },

  /** V01 TH-18: a speed burst down the track while held; let go, it coasts down and DRS closes. */
  V01: (k, h) => {
    const B = burst(16 + 12 * k, 0.35, 0.4, h);
    const dur = B.stop;
    const off = (e: number, a: number) => (e < h ? 1 : 1 - smooth(0, a, e - h));
    const pose = (e: number, o: Pose) => {
      if (e < 0) return;
      if (e >= dur) return homeward(e - dur, B.at(dur), o);
      o.d = B.at(e);
      o.pitch = -0.035 * Math.sin(Math.PI * Math.min(1, e / 0.6)) * off(e, 0.4);
      const env = smooth(0, 0.18, e) * off(e, 0.5);
      o.fov = 7 * env;
      o.shake = 0.07 * env;
      o.trail = smooth(0, 0.12, e) * off(e, 0.6);
      o.drs = smooth(0, 0.2, e) * off(e, 0.3);
    };
    return {
      dur,
      total: dur + HOME,
      pose,
      camY: 0,
      parts: [],
      boards: [],
      trail: {
        lag: 0.6,
        lines: [
          [0, 0.86, 0.18, ORANGE],
          [-0.5, 0.96, 0.05, ORANGE],
          [0.5, 0.96, 0.05, ORANGE],
          [-0.78, 0.14, 0.36, INK],
          [0.78, 0.14, 0.36, INK],
        ],
      },
    };
  },

  /** V04 Apollo: lane split, as a ghost while held, through a row of boards; let go, it turns solid. */
  V04: (k, h) => {
    const V = 10 + 8 * k;
    const B = burst(V, 0.4, 0.3, h);
    const dur = B.stop;
    const g0 = 0.3;
    const g1 = 0.35;
    const pose = (e: number, o: Pose) => {
      if (e < 0) return;
      if (e >= dur) return homeward(e - dur, B.at(dur), o);
      o.d = B.at(e);
      o.ghost = smooth(0, g0, Math.min(e, h)) * (e < h ? 1 : 1 - smooth(0, g1, e - h));
      o.roll = 0.07 * Math.sin(Math.PI * 2 * Math.min(1, e / 1.6)) * Math.max(0, 1 - e / 1.6);
      o.trail = smooth(0, 0.1, e) * (e < h ? 1 : 1 - smooth(0, 0.5, e - h));
      o.fov = 3 * Math.sin(Math.PI * Math.min(1, e / dur));
    };
    // boards along the whole run a full hold would cover; a shorter hold stops among them
    const full = burst(V, 0.4, 0.3, k * (LAST.V04 ?? 3));
    const D = full.at(full.stop);
    const boards: number[] = [];
    for (let d = 4.5; d < D - 2.5 && boards.length < 8; d += 3.2) boards.push(d);
    return { dur, total: dur + HOME, pose, camY: 0, parts: [], boards, trail: { lag: 0.35, lines: [[0, 0.72, 0.08, ORANGE]] } };
  },

  /** V02 E14: a big Baja jump; held in the air, lift carries 45% of its weight (a hang), let go it falls. */
  V02: (k, h) => {
    // the run-up takes it under the start gantry, so the jump is clear of it
    const run = 0.9;
    const R = 11;
    const T = 0.95 + 0.35 * k;
    const H = 2.8 + 1.2 * k;
    const Dj = 8 + 6 * k;
    const L = 0.8;
    const roll = 3.2;
    // the plain jump: a parabola H high, T long; held after take-off, gravity drops to 55%
    const g = (8 * H) / (T * T);
    const vy0 = (4 * H) / T;
    const g1 = 0.55 * g;
    const a1 = Math.min(Math.max(0, h - run), (2 * vy0) / g1);
    const yA = vy0 * a1 - 0.5 * g1 * a1 * a1;
    const vA = vy0 - g1 * a1;
    const Ta = a1 + (vA + Math.sqrt(vA * vA + 2 * g * yA)) / g;
    const vx = Dj / T;
    const fly = (a: number) => (a < a1 ? { y: vy0 * a - 0.5 * g1 * a * a, v: vy0 - g1 * a } : { y: yA + vA * (a - a1) - 0.5 * g * (a - a1) ** 2, v: vA - g * (a - a1) });
    const dur = run + Ta + L;
    const pose = (e: number, o: Pose) => {
      if (e < 0) return;
      if (e < run) {
        const u = e / run;
        o.d = R * u * u;
        o.pitch = -0.04 * u;
        o.squash = 1 - 0.07 * smooth(0, 1, (u - 0.55) / 0.45);
      } else if (e < run + Ta) {
        const a = e - run;
        const f = fly(a);
        o.d = R + vx * a;
        o.y = Math.max(0, f.y);
        o.pitch = lerp(-0.04, THREE.MathUtils.clamp((-0.3 * f.v) / vy0, -0.3, 0.14), smooth(0, 0.15, a / T));
      } else if (e < dur) {
        const x = e - run - Ta;
        o.d = R + vx * Ta + roll * (1 - Math.pow(1 - x / L, 2));
        o.squash = 1 - 0.5 * Math.sin(13 * x) * Math.exp(-4.5 * x);
        o.pitch = 0.14 * Math.exp(-10 * x) * Math.cos(11 * x);
        o.shake = 0.16 * Math.exp(-7 * x);
      } else return homeward(e - dur, R + vx * Ta + roll, o);
    };
    const r = rng(202);
    const tl = run + Ta;
    const puff = (t: number, n: number, speed: number, up: number, rear: number) =>
      emit(pose, [t], (_, _o, at, yaw) =>
        Array.from({ length: n }, () => {
          const a = r() * Math.PI * 2;
          const sp = speed * (0.4 + r() * 0.6);
          const [lx, lz] = local(yaw, (r() - 0.5) * 1.6, rear + (r() - 0.5) * 1.4);
          return {
            t0: t + r() * 0.06,
            life: 0.7 + r() * 0.5,
            p: [at.x + lx, 0.15, at.z + lz] as [number, number, number],
            v: [Math.cos(a) * sp, up * (0.5 + r() * 0.7), Math.sin(a) * sp] as [number, number, number],
            g: -9.8,
            size: 0.12 + r() * 0.16,
            color: DUST[Math.floor(r() * DUST.length)],
          };
        }),
      );
    const parts = [...puff(run - 0.02, 14, 1.6, 1.4, -0.9), ...puff(tl + 0.02, 48, 4.6, 3.2, 0)];
    return { dur, total: dur + HOME, pose, camY: 0.45, parts, boards: [], trail: null };
  },
};

/* ------------------------------------------------------------------ shared pieces */

const MAXP = 200;
const partGeo = new THREE.BoxGeometry(1, 1, 1);
const partMat = new THREE.MeshBasicMaterial({ toneMapped: false });
const glowMat = new THREE.MeshBasicMaterial({ color: W.orange, transparent: true, depthWrite: false, toneMapped: false });
/** a square-sided flame, tip down, its base at y = 0 */
const flameGeo = new THREE.ConeGeometry(0.27, 1, 4, 1).rotateX(Math.PI).rotateY(Math.PI / 4).translate(0, -0.5, 0);
const padGeo = new THREE.BoxGeometry(0.34, 0.04, 0.34);
/** SPLIT's boards: a paper board on ink legs, an ink band, one orange square, and an orange frame that flashes as it's passed */
const BOARD = {
  board: new THREE.BoxGeometry(2.2, 0.8, 0.16),
  band: new THREE.BoxGeometry(2.22, 0.16, 0.18),
  mark: new THREE.BoxGeometry(0.28, 0.28, 0.18),
  leg: new THREE.BoxGeometry(0.1, 0.42, 0.5),
  frame: new THREE.EdgesGeometry(new THREE.BoxGeometry(2.4, 1.2, 0.3)),
};
const BOARD_N = 8;
const flashMat = new THREE.LineBasicMaterial({ color: W.orange, toneMapped: false });

/** The light trail: up to five flat strips, each a ribbon of SEG quads, with alpha in its vertex colours. */
const SEG = 28;
function ribbonGeo() {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((SEG + 1) * 2 * 3), 3));
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array((SEG + 1) * 2 * 4), 4));
  const idx: number[] = [];
  for (let i = 0; i < SEG; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  g.setIndex(idx);
  return g;
}
const RIBS = Array.from({ length: 5 }, ribbonGeo);
const ribMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });

/* ------------------------------------------------------------------ the scene part */

type Inner = { fire: Fire | null; hold: number; run: Run | null; ghost: GhostLook | null; flap: THREE.Object3D | null | undefined; flapX: number; flapY: number; partsLive: boolean };

/** Where BuildCamera should look, relative to the grid slot, and the power's fov kick and shake. */
export type Follow = { x: number; y: number; z: number; fov: number; shake: number };

const o = newPose();
const lagged = newPose();
const sample = newPose();
const m4 = new THREE.Matrix4();
const q4 = new THREE.Quaternion();
const s3 = new THREE.Vector3();
const p3 = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

/** Camera trails the vehicle by this much (s), so a burst reads as speed. */
const LAG = 0.12;
const THRUSTERS: [number, number][] = [
  [-0.62, -1.35],
  [0.62, -1.35],
  [-0.62, 1.35],
  [0.62, 1.35],
];

/**
 * The chosen vehicle on its grid slot, and its power. Also arms the meter once the build-in has
 * landed and writes where the camera should look (followRef) for BuildCamera.
 */
export function Powers({
  code,
  clock,
  powerRef,
  followRef,
  children,
}: {
  code: string;
  clock: BuildClock;
  powerRef: RefObject<PowerState | null>;
  followRef: RefObject<Follow>;
  children: ReactNode;
}) {
  const root = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const model = useRef<THREE.Group>(null!);
  const thr = useRef<THREE.Group>(null!);
  const parts = useRef<THREE.InstancedMesh>(null!);
  const boards = useRef<THREE.Group>(null!);
  const trail = useRef<THREE.Group>(null!);
  const inner = useRef<Inner>({ fire: null, hold: 0, run: null, ghost: null, flap: undefined, flapX: 0, flapY: 0, partsLive: true });

  // a fresh meter for every run of stage B; the ghost's copies go with it
  useEffect(() => {
    const I = inner.current;
    powerRef.current = newPower(code);
    return () => {
      powerRef.current = null;
      I.ghost?.drop();
    };
  }, [powerRef, code]);

  useFrame((s) => {
    const P = powerRef.current;
    const I = inner.current;
    if (P) P.armed = clock(s.clock.elapsedTime) >= PLAN.camEnd;
    if (P) settle(P, now());
    const f = P?.fire ?? null;
    // a new power, or the one running was let go: its timeline from here on is known
    if (f !== I.fire || (f && f.hold !== I.hold)) {
      if (f !== I.fire) I.partsLive = true;
      I.fire = f;
      I.hold = f?.hold ?? 0;
      I.run = f ? (RUNS[code] ?? RUNS.V03)(f.k, held(f, code)) : null;
    }
    const run = I.run;
    const e = f && run ? elapsed(f, now()) : Infinity;
    const live = !!run && e < run.total;
    rest(o);
    rest(lagged);
    if (live) {
      run.pose(e, o);
      run.pose(e - LAG, lagged);
    }

    // the vehicle
    const yaw = placeOf(o, p3);
    root.current.position.copy(p3);
    root.current.rotation.y = yaw;
    root.current.visible = o.vis;
    const b = body.current;
    b.rotation.x = o.pitch;
    b.rotation.z = o.roll;
    const wide = 1 / Math.sqrt(o.squash);
    b.scale.set(wide, o.squash, wide);

    // the camera: where the vehicle was a moment ago, and how much of its climb
    const fl = followRef.current;
    placeOf(lagged, scratch);
    fl.x = scratch.x - GRID.x;
    fl.z = scratch.z - GRID.z;
    fl.y = scratch.y - lagged.y - GRID.y + lagged.y * (run?.camY ?? 0);
    fl.fov = o.fov;
    fl.shake = o.shake;

    // SKYLINE: thrusters, flickering
    if (thr.current) {
      thr.current.visible = o.thrust > 0.01;
      if (o.thrust > 0.01) {
        const w = s.clock.elapsedTime;
        glowMat.opacity = 0.75 + 0.25 * Math.sin(w * 61) * Math.sin(w * 23);
        thr.current.children.forEach((c, i) => {
          const fl2 = 0.85 + 0.3 * Math.abs(Math.sin(w * 37 + i * 1.7));
          c.children[0].scale.set(1, o.thrust * 1.6 * fl2, 1);
        });
      }
    }

    // TH-18: the DRS flap, found once by where it sits on the rear wing
    if (code === "V01") {
      if (I.flap === undefined) {
        I.flap = null;
        model.current.traverse((x) => {
          if (x.name === "drs-flap" || (!I.flap && x instanceof THREE.Mesh && x.position.z < -2.1 && x.position.y > 0.85 && x.rotation.x > 0.3)) {
            I.flap = x;
            I.flapX = x.rotation.x;
            I.flapY = x.position.y;
          }
        });
      }
      if (I.flap) {
        I.flap.rotation.x = I.flapX - 0.6 * o.drs;
        I.flap.position.y = I.flapY + 0.05 * o.drs;
      }
    }

    // SPLIT: ghost
    if (code === "V04") (I.ghost ??= ghostLook(W.orange)).set(model.current, o.ghost);

    // SPLIT: the boards pop up ahead, flash orange as the bike passes, and sink as it goes home
    if (boards.current) {
      const list = live ? run.boards : [];
      boards.current.children.forEach((c, i) => {
        const d = list[i];
        if (d === undefined) {
          c.visible = false;
          return;
        }
        const pop = clamp01((e - i * 0.05) / 0.3);
        const sink = run!.dur + OUT < e ? smooth(run!.dur + OUT, run!.dur + OUT + GAP * 0.7, e) : 0;
        const k = Math.max(0.001, (1 + 2.4 * Math.pow(pop - 1, 3) + 1.4 * Math.pow(pop - 1, 2)) * (1 - sink));
        c.visible = pop > 0;
        const { p, yaw: by } = gridAhead(d, c.position);
        c.position.copy(p);
        c.rotation.y = by;
        c.scale.set(1, k, 1);
        // flash for 0.18 s after the bike's nose reaches it
        c.children[c.children.length - 1].visible = o.d > d - 0.9 && o.d < d + 3.5 && o.ghost > 0.5;
      });
    }

    // light trail: strips through where the vehicle was over the last `lag` seconds
    if (trail.current) {
      const T = live ? run.trail : null;
      trail.current.visible = !!T && o.trail > 0.001;
      if (T && o.trail > 0.001) {
        T.lines.forEach(([lx, ly, lw, c], li) => {
          const g = RIBS[li];
          const pos = g.attributes.position.array as Float32Array;
          const col = g.attributes.color.array as Float32Array;
          for (let i = 0; i <= SEG; i++) {
            rest(sample);
            run!.pose(Math.max(0, e - (T.lag * i) / SEG), sample);
            const sy = placeOf(sample, scratch);
            const cx = Math.cos(sy);
            const sz = -Math.sin(sy);
            const x0 = scratch.x + cx * lx;
            const z0 = scratch.z + sz * lx;
            const y0 = scratch.y + ly;
            for (let side = 0; side < 2; side++) {
              const h = (side ? 0.5 : -0.5) * lw;
              const v = (i * 2 + side) * 3;
              pos[v] = x0 + cx * h;
              pos[v + 1] = y0;
              pos[v + 2] = z0 + sz * h;
              const a = (i * 2 + side) * 4;
              col[a] = c.r;
              col[a + 1] = c.g;
              col[a + 2] = c.b;
              col[a + 3] = Math.pow(1 - i / SEG, 1.4) * o.trail;
            }
          }
          g.attributes.position.needsUpdate = true;
          g.attributes.color.needsUpdate = true;
          g.computeBoundingSphere();
        });
        trail.current.children.forEach((c, i) => (c.visible = i < T.lines.length));
      }
    }

    // particles
    const im = parts.current;
    if (im && (live || I.partsLive)) {
      I.partsLive = live;
      const list = live ? run.parts : [];
      for (let i = 0; i < MAXP; i++) {
        const pt = list[i];
        const age = pt ? e - pt.t0 : -1;
        if (!pt || age < 0 || age > pt.life) {
          im.setMatrixAt(i, m4.makeScale(0, 0, 0));
          continue;
        }
        const x = pt.p[0] + pt.v[0] * age;
        const z = pt.p[2] + pt.v[2] * age;
        const y = Math.max(0.1, pt.p[1] + pt.v[1] * age + 0.5 * pt.g * age * age);
        const sz = pt.size * Math.sqrt(1 - age / pt.life);
        q4.setFromAxisAngle(Y, i * 0.7 + age * 2);
        im.setMatrixAt(i, m4.compose(p3.set(x, y, z), q4, s3.set(sz, sz, sz)));
        im.setColorAt(i, pt.color);
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <group ref={root} position={[GRID.x, GRID.y, GRID.z]} rotation={[0, GRID.yaw, 0]}>
        <group ref={body}>
          <group ref={model}>{children}</group>
          {code === "V03" && (
            <group ref={thr} visible={false}>
              {THRUSTERS.map(([x, z]) => (
                <group key={`${x}${z}`} position={[x, 0.2, z]}>
                  <mesh geometry={flameGeo} material={glowMat} />
                  <mesh geometry={padGeo} material={glowMat} />
                </group>
              ))}
            </group>
          )}
        </group>
      </group>
      {code === "V04" && (
        <group ref={boards}>
          {Array.from({ length: BOARD_N }, (_, i) => (
            <group key={i} visible={false}>
              <mesh geometry={BOARD.board} material={M.paper} position={[0, 0.82, 0]} castShadow receiveShadow />
              <mesh geometry={BOARD.band} material={M.ink} position={[0, 1.15, 0]} castShadow />
              <mesh geometry={BOARD.mark} material={M.orange} position={[0, 0.76, 0]} />
              {[-0.9, 0.9].map((x) => (
                <mesh key={x} geometry={BOARD.leg} material={M.ink} position={[x, 0.21, 0]} castShadow />
              ))}
              <lineSegments geometry={BOARD.frame} material={flashMat} position={[0, 0.8, 0]} visible={false} />
            </group>
          ))}
        </group>
      )}
      <group ref={trail} visible={false}>
        {RIBS.map((g, i) => (
          <mesh key={i} geometry={g} material={ribMat} frustumCulled={false} renderOrder={6} />
        ))}
      </group>
      <instancedMesh ref={parts} args={[partGeo, partMat, MAXP]} frustumCulled={false} castShadow />
    </>
  );
}

/* ------------------------------------------------------------------ the HUD meter */

/**
 * The power meter (the game's sticker, components/ui/PowerMeter.tsx) with the mock's Shift:
 * it only works while the mock is on screen (liveRef) and the build-in has landed.
 */
export function PowerMeter({ code, powerRef, liveRef }: { code: string; powerRef: RefObject<PowerState | null>; liveRef: RefObject<boolean> }) {
  const refused = useRef(0);
  const read = useCallback((): MeterReading | null => {
    const P = powerRef.current;
    if (!P) return null;
    const t = now();
    settle(P, t);
    const c = chargeOf(P, t);
    // while a power winds down or flickers home it can't start again: no orange head
    return { charge: c, state: busy(P, t) ? "busy" : meterState(P, c), refused: refused.current };
  }, [powerRef]);

  // hold Shift: down starts the power, up (or the window losing focus) lets go
  useEffect(() => {
    const isShift = (e: KeyboardEvent) => e.code === "ShiftLeft" || e.code === "ShiftRight" || e.key === "Shift";
    const onDown = (e: KeyboardEvent) => {
      if (!isShift(e) || e.repeat || !liveRef.current) return;
      const P = powerRef.current;
      if (!P || !P.armed) return;
      if (!tryStart(P)) refused.current++;
    };
    const onUp = (e: KeyboardEvent) => {
      if (!isShift(e)) return;
      const P = powerRef.current;
      if (P) release(P, now());
    };
    const onBlur = () => {
      const P = powerRef.current;
      if (P) release(P, now());
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [code, powerRef, liveRef]);

  return <Meter label={powerName(code)} read={read} />;
}
