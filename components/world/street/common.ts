// Shared placement maths for the street circuit dressing. Everything here is
// computed once at module load from the track curve, deterministically, so the
// city looks identical on every visit and nothing random runs during render.
import * as THREE from "three";
import { GANTRY_T, GRANDSTAND, BRIDGE_HALF, nearCrossing, inLand, PIT, SECTORS, TRACK_WIDTH, trackCurve, zones } from "../layout";

export const HALF = TRACK_WIDTH / 2;
/** Barrier centre line, measured from the track centre (kerbs end at ~4.6 m). */
export const BARRIER_OFF = HALF + 1.3;
export const BARRIER_H = 0.62;
export const BARRIER_D = 0.5;

/** Seeded PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const LEN = trackCurve.getLength();

// ------------------------------------------------------------ track frames

export type Frame = {
  u: number;
  p: THREE.Vector3;
  tan: THREE.Vector3;
  /** left normal (-tz, 0, tx), same convention as the Island ribbon offsets */
  n: THREE.Vector3;
  /** signed curvature, > 0 when turning toward +n */
  k: number;
};

export const N_FRAMES = 800;
export const FRAMES: Frame[] = (() => {
  const out: Frame[] = [];
  const ds = LEN / N_FRAMES;
  for (let i = 0; i < N_FRAMES; i++) {
    const u = i / N_FRAMES;
    const p = trackCurve.getPointAt(u);
    const tan = trackCurve.getTangentAt(u);
    const t1 = trackCurve.getTangentAt((u + 1 / N_FRAMES) % 1);
    const cross = tan.z * t1.x - tan.x * t1.z;
    out.push({ u, p, tan, n: new THREE.Vector3(-tan.z, 0, tan.x), k: -cross / ds });
  }
  // smooth curvature a little so run-off and fence decisions don't flicker
  const raw = out.map((f) => f.k);
  for (let i = 0; i < N_FRAMES; i++) {
    let s = 0;
    for (let j = -6; j <= 6; j++) s += raw[(i + j + N_FRAMES) % N_FRAMES];
    out[i].k = s / 13;
  }
  return out;
})();

export function frameAt(u: number) {
  const f = ((u % 1) + 1) % 1;
  return FRAMES[Math.floor(f * N_FRAMES) % N_FRAMES];
}

// The camera sits at +X/+Z of the car. "Far" is the side away from it.
export const AWAY = new THREE.Vector3(-1, 0, -1).normalize();
/** +1 when the +n side of the track is the far side at this frame. */
export function farSign(f: Frame) {
  return f.n.dot(AWAY) >= 0 ? 1 : -1;
}
/** +1 when the +n side is the outside of the loop (away from the island centre). */
export function outSign(f: Frame) {
  return f.n.x * f.p.x + f.n.z * (f.p.z + 3) >= 0 ? 1 : -1;
}

const TRACK_PTS = FRAMES.filter((_, i) => i % 2 === 0).map((f) => f.p);
export function distToTrack(x: number, z: number) {
  let best = Infinity;
  for (const p of TRACK_PTS) {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
export function nearestFrame(x: number, z: number) {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < N_FRAMES; i += 2) {
    const p = FRAMES[i].p;
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return FRAMES[best];
}

// ------------------------------------------------------------ obstacles

/**
 * The town's belt: outside the lap and within 30 m of it. The island's scattered
 * trees keep out of it (./trees.ts, drawn by Places.tsx Nature) so the town has room;
 * its greenery comes from Groves and the street trees instead.
 */
export function inTownBelt(x: number, z: number) {
  const f = nearestFrame(x, z);
  const vx = x - f.p.x;
  const vz = z - f.p.z;
  const outside = vx * f.p.x + vz * (f.p.z + 3) > 0;
  return outside && Math.hypot(vx, vz) < 30;
}

/** Sector scenery footprint test (local +Z faces the track). */
export function inSectorScene(x: number, z: number, margin = 0, back = 11) {
  for (const s of SECTORS) {
    const dx = x - s.scene[0];
    const dz = z - s.scene[1];
    const c = Math.cos(s.sceneRot);
    const sn = Math.sin(s.sceneRot);
    const lx = dx * c - dz * sn;
    const lz = dx * sn + dz * c;
    if (Math.abs(lx) < 14 + margin && lz > -back - margin && lz < 4 + margin) return true;
  }
  return false;
}

/**
 * Dev only: a structure that couldn't find its spot, and why. Structures are placed before
 * anything grows (the tree scatter keeps off them: ./trees.ts), so a warning here means a real
 * clash (a scene, a place, the shore), never a tree.
 */
export function placementWarning(what: string) {
  if (process.env.NODE_ENV !== "production") console.warn(`[placement] ${what}`);
}

/** Cone spots from Places (t, along +n from the kerb). Keep the barrier open there. */
const CONE_T = [0.18, 0.44, 0.68, 0.9];

/** Things placed by Places that sit near the track and need clear access. */
export function nearPlace(x: number, z: number, pad = 0, bridge = true) {
  for (const zn of zones) {
    if (zn.id.startsWith("sector") || zn.id.startsWith("garage")) continue;
    const r = Math.hypot(zn.size[0], zn.size[1]) / 2 + 6 + pad;
    if (Math.hypot(x - zn.pos[0], z - zn.pos[1]) < r) return true;
  }
  if (Math.hypot(x - GRANDSTAND.pos[0], z - GRANDSTAND.pos[1]) < 9 + pad) return true;
  // Nothing stands under or through the bridge. (The old town opts out: it keeps every
  // corner 6.5 m off both roads instead, which keeps it off the deck and the piers.)
  if (bridge && nearCrossing(x, z, BRIDGE_HALF + 1 + pad)) return true;
  return false;
}

export function nearCones(x: number, z: number, r = 4) {
  return CONE_T.some((t) => {
    const f = frameAt(t);
    const q = f.p.clone().addScaledVector(f.n, HALF + 2.7);
    return Math.hypot(q.x - x, q.z - z) < r;
  });
}

export const GANTRY = frameAt(GANTRY_T);

// ------------------------------------------------------------ run-off

/** Extra distance the outside barrier sits from its normal line, per frame. */
export const RUNOFF: number[] = (() => {
  const want = FRAMES.map((f) => {
    const k = Math.abs(f.k);
    return THREE.MathUtils.clamp((k - 0.022) / 0.02, 0, 1) * 7;
  });
  // widen the shape along the track
  const wide = want.map((_, i) => {
    let m = 0;
    for (let j = -14; j <= 14; j++) m = Math.max(m, want[(i + j + N_FRAMES) % N_FRAMES] * (1 - Math.abs(j) / 18));
    return m;
  });
  // cap by obstacles (scenes, places, the shore). Trees grow after the run-off is laid out and
  // keep off it (./trees.ts), so they never shorten it.
  const capped = wide.map((w, i) => {
    if (w <= 0) return 0;
    const f = FRAMES[i];
    const s = -Math.sign(f.k) || 1; // outside of the bend
    for (let d = 0; d <= w; d += 0.5) {
      const q = f.p.clone().addScaledVector(f.n, s * (BARRIER_OFF + d + 0.8));
      if (inSectorScene(q.x, q.z, 1) || nearPlace(q.x, q.z, -4) || !inLand(q.x, q.z, 4))
        return Math.max(0, d - 1);
    }
    return w;
  });
  // min filter + blur so the barrier line stays smooth
  const out = capped.map((_, i) => {
    let s = 0;
    for (let j = -8; j <= 8; j++) {
      let m = Infinity;
      for (let k = -4; k <= 4; k++) m = Math.min(m, capped[(i + j + k + N_FRAMES * 2) % N_FRAMES]);
      s += m;
    }
    return s / 17;
  });
  return out;
})();

/** Barrier offset (signed, along n) for a side at a frame index. */
export function barrierOffset(i: number, side: 1 | -1) {
  const f = FRAMES[i];
  const outside = -Math.sign(f.k) || 1;
  return side * (BARRIER_OFF + (side === outside ? RUNOFF[i] : 0));
}

/** True if (x, z) is between the road and its barrier line (the verge, a bend's run-off), plus `pad`. */
export function onRunoff(x: number, z: number, pad = 0) {
  const f = nearestFrame(x, z);
  const i = Math.round(f.u * N_FRAMES) % N_FRAMES;
  const d = (x - f.p.x) * f.n.x + (z - f.p.z) * f.n.z; // across the road, signed along n
  return Math.abs(d) < Math.abs(barrierOffset(i, (Math.sign(d) || 1) as 1 | -1)) + 0.8 + pad;
}

// ------------------------------------------------------------ helpers

const _o = new THREE.Object3D();
export function compose(x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  _o.position.set(x, y, z);
  _o.rotation.set(rx, ry, rz, "YXZ");
  _o.scale.set(sx, sy, sz);
  _o.updateMatrix();
  return _o.matrix.clone();
}

/** Yaw that turns local +X onto the direction (dx, dz). */
export function yawOf(dx: number, dz: number) {
  return Math.atan2(-dz, dx);
}

/** Main straight inside (pit lane side): left open. */
export function inPitSide(x: number, z: number) {
  return z > PIT.z - 10 && z < 46 && x > PIT.from - 28 && x < PIT.to + 26;
}

export type Spot = { x: number; z: number; yaw: number; u: number };

/** A point on the far side at a given distance past the barrier, facing the track (+Z local toward the road). */
export function farSpot(u: number, extra: number): Spot {
  const f = frameAt(u);
  const i = Math.floor((((u % 1) + 1) % 1) * N_FRAMES) % N_FRAMES;
  const s = farSign(f);
  const off = Math.abs(barrierOffset(i, s as 1 | -1)) + extra;
  const q = f.p.clone().addScaledVector(f.n, s * off);
  // local +Z should point back at the road: -s*n
  const tz = new THREE.Vector3(-s * f.n.x, 0, -s * f.n.z);
  return { x: q.x, z: q.z, yaw: Math.atan2(tz.x, tz.z), u };
}

