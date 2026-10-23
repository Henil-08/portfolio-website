// Procedural layout of the street circuit: where every barrier block, lamp,
// board, fence panel and marshal post goes. Pure data, computed once.
import * as THREE from "three";
import { LEN, FRAMES, N_FRAMES, barrierOffset, farSign, farSpot, inPitSide, inSectorScene, nearCones, nearPlace, nearTree, outSign, RUNOFF, type Spot } from "./common";
import { STAND_SPOTS } from "./standSpots";
import { PIT } from "../layout";

export const BLOCK = 2.0;

export type Block = {
  x: number;
  z: number;
  yaw: number;
  /** frame index */
  i: number;
  side: 1 | -1;
  far: boolean;
  /** contiguous run id (breaks at gaps) */
  run: number;
  /** running block count, for colours */
  k: number;
  /** direction along the barrier */
  dx: number;
  dz: number;
};

// Extra access gaps on the inside (u, half length in m) so the infield is reachable.
const ACCESS: [number, number][] = [
  [0.62, 7],
  [0.85, 7],
  [0.33, 6],
];

function skip(side: 1 | -1, i: number, x: number, z: number) {
  const f = FRAMES[i];
  const inner = side !== outSign(f);
  const far = side === farSign(f);
  if (inner && inPitSide(x, z)) return true;
  if (far && inSectorScene(x, z, 2)) return true;
  if (nearPlace(x, z, 1)) return true;
  if (nearCones(x, z, 3.5)) return true;
  if (inner) {
    for (const [u, h] of ACCESS) {
      let du = Math.abs(f.u - u);
      du = Math.min(du, 1 - du);
      if (du * LEN < h) return true;
    }
  }
  return false;
}

function offsetLine(side: 1 | -1) {
  return FRAMES.map((f, i) => f.p.clone().addScaledVector(f.n, barrierOffset(i, side)));
}

export const BLOCKS: Block[] = (() => {
  const out: Block[] = [];
  let run = 0;
  for (const side of [1, -1] as const) {
    const line = offsetLine(side);
    let acc = 0;
    let next = BLOCK / 2;
    let k = 0;
    let open = false;
    for (let i = 0; i < N_FRAMES; i++) {
      const a = line[i];
      const b = line[(i + 1) % N_FRAMES];
      const seg = a.distanceTo(b);
      while (next <= acc + seg) {
        const t = (next - acc) / seg;
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        const dx = (b.x - a.x) / seg;
        const dz = (b.z - a.z) / seg;
        if (skip(side, i, x, z)) {
          if (open) run++;
          open = false;
        } else {
          open = true;
          out.push({ x, z, yaw: Math.atan2(-dz, dx), i, side, far: side === farSign(FRAMES[i]), run, k: k++, dx, dz });
        }
        next += BLOCK;
      }
      acc += seg;
    }
    run++;
  }
  return out;
})();

export type Chunk = { x: number; z: number; yaw: number; len: number };

/** Collider chunks: up to 3 consecutive blocks of the same run. */
export const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  let cur: Block[] = [];
  const flush = () => {
    if (!cur.length) return;
    const a = cur[0];
    const b = cur[cur.length - 1];
    const ax = a.x - (a.dx * BLOCK) / 2;
    const az = a.z - (a.dz * BLOCK) / 2;
    const bx = b.x + (b.dx * BLOCK) / 2;
    const bz = b.z + (b.dz * BLOCK) / 2;
    out.push({ x: (ax + bx) / 2, z: (az + bz) / 2, yaw: Math.atan2(-(bz - az), bx - ax), len: Math.hypot(bx - ax, bz - az) });
    cur = [];
  };
  for (const b of BLOCKS) {
    if (cur.length && (cur[0].run !== b.run || cur.length >= 3)) flush();
    cur.push(b);
  }
  flush();
  return out;
})();

// ------------------------------------------------------------ lamps

export type Lamp = { x: number; z: number; yaw: number; hx: number; hz: number; px: number; pz: number };
export const LAMP_SPACING = 22;
export const LAMP_ARM = 2.6;

/** Lamps on the far side, every ~22 m, set back behind the barrier. Arm reaches over the road. */
export const LAMPS: Lamp[] = (() => {
  const out: Lamp[] = [];
  const step = Math.round(N_FRAMES / (LEN / LAMP_SPACING));
  for (let i = 3; i < N_FRAMES; i += step) {
    const f = FRAMES[i];
    const s = farSign(f);
    let off = Math.abs(barrierOffset(i, s as 1 | -1)) + 1.6;
    let q = f.p.clone().addScaledVector(f.n, s * off);
    if (inPitSide(q.x, q.z)) {
      // main straight: stand on the pit-wall line, between the track and the pit lane
      off = f.p.z - (PIT.z + 4.3);
      q = f.p.clone().addScaledVector(f.n, s * off);
      if (Math.abs(Math.abs(q.x) - 18) < 3.6) continue;
    }
    if (inSectorScene(q.x, q.z, 2.5) || nearPlace(q.x, q.z, 2) || nearTree(q.x, q.z, 0.8) || nearCones(q.x, q.z, 3)) continue;
    if (STAND_SPOTS.some((st) => Math.hypot(st.x - q.x, st.z - q.z) < 8)) continue;
    // head and pool on the road side
    const h = f.p.clone().addScaledVector(f.n, s * (off - LAMP_ARM));
    const pool = f.p.clone().addScaledVector(f.n, s * Math.min(off - LAMP_ARM - 1, 2.6));
    out.push({ x: q.x, z: q.z, yaw: Math.atan2(-(-s * f.n.z), -s * f.n.x), hx: h.x, hz: h.z, px: pool.x, pz: pool.z });
  }
  return out;
})();

// ------------------------------------------------------------ catch fence (far side of fast sections)

export type FenceRun = { pts: THREE.Vector3[] };
export const FENCE_H = 2.8;
export const FENCES: FenceRun[] = (() => {
  const runs: FenceRun[] = [];
  let cur: THREE.Vector3[] = [];
  const flush = () => {
    if (cur.length > 6) runs.push({ pts: cur });
    cur = [];
  };
  let lastSide = 0;
  for (let i = 0; i < N_FRAMES; i += 4) {
    const f = FRAMES[i];
    const s = farSign(f);
    const fast = Math.abs(f.k) < 0.018 && RUNOFF[i] < 0.3;
    const off = Math.abs(barrierOffset(i, s as 1 | -1)) + 0.75;
    const q = f.p.clone().addScaledVector(f.n, s * off);
    const ok = fast && !STAND_SPOTS.some((st) => Math.hypot(st.x - q.x, st.z - q.z) < 7) && !inSectorScene(q.x, q.z, 3) && !nearPlace(q.x, q.z, 2) && !nearTree(q.x, q.z, 0.4) && !inPitSide(q.x, q.z) && !nearCones(q.x, q.z, 4);
    if (!ok || s !== lastSide) flush();
    lastSide = s;
    if (ok) cur.push(q);
  }
  flush();
  return runs;
})();

// ------------------------------------------------------------ boards and marshals

/** Sponsor boards sit on top of far-side barrier blocks. */
const BOARD_WANT: [number, string][] = [
  [0.3, "HG RACING"],
  [0.355, "LIGHTS OUT"],
  [0.4, "BOX BOX"],
  [0.585, "DRS ZONE"],
  [0.645, "08"],
  [0.665, "HG RACING"],
  [0.83, "LIGHTS OUT"],
  [0.875, "BOX BOX"],
  [0.94, "08"],
  [0.12, "DRS ZONE"],
];
export const BOARDS: (Spot & { text: string })[] = BOARD_WANT.map(([u, text]) => ({ ...farSpot(u, 0), text })).filter(
  (sp) =>
    BLOCKS.some((b) => b.far && Math.hypot(b.x - sp.x, b.z - sp.z) < 1.2) &&
    !STAND_SPOTS.some((st) => Math.hypot(st.x - sp.x, st.z - sp.z) < 8)
);

export const MARSHALS: Spot[] = [0.235, 0.47, 0.715, 0.79, 0.965]
  .map((u) => farSpot(u, 3.2))
  .filter((s) => !inSectorScene(s.x, s.z, 1) && !nearPlace(s.x, s.z, 0) && !nearTree(s.x, s.z, 1.5));
