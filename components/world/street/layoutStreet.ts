// Procedural layout of the street circuit: where every barrier block, lamp,
// board, fence panel and marshal post goes. Pure data, computed once.
import * as THREE from "three";
import { LEN, FRAMES, N_FRAMES, barrierOffset, farSign, farSpot, inPitSide, inSectorScene, nearCones, nearPlace, nearTree, outSign, RUNOFF, type Spot } from "./common";
import { STAND_SPOTS } from "./standSpots";
import { PIT, TRACK_WIDTH, inLand, nearCrossing, nearestT, onBridge } from "../layout";

// Bruno's circuit has no walls: open run-off past the kerbs, and a short tyre wall
// on the outside of the tight corners only, with a rounded block at each end.

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
  if (onBridge(f.u, 2)) return true; // the bridge has its own parapets
  if (nearCrossing(x, z, 20)) return true;
  if (inner && inPitSide(x, z)) return true;
  if (far && inSectorScene(x, z, 2)) return true;
  if (nearPlace(x, z, 1)) return true;
  if (nearCones(x, z, 3.5)) return true;
  if (nearTree(x, z, 0.6)) return true;
  if (inner) {
    for (const [u, h] of ACCESS) {
      let du = Math.abs(f.u - u);
      du = Math.min(du, 1 - du);
      if (du * LEN < h) return true;
    }
  }
  return false;
}

export const STACK_GAP = 0.92; // tyre stacks touch
const WALL_MIN = 4; // m
const WALL_MAX = 16; // m
const RUN_MIN = 0.35; // run-off amount that marks a tight corner

/** A tyre stack (`end` false) or a rounded end block (`end` true) on the outside of a corner. */
export type WallPiece = { x: number; z: number; yaw: number; k: number; end: boolean };

export const TYRE_WALLS: WallPiece[] = (() => {
  const out: WallPiece[] = [];
  // corners: runs of frames with run-off (cyclic)
  const on = RUNOFF.map((r) => r > RUN_MIN);
  const first = on.indexOf(false);
  if (first < 0) return out;
  const runs: [number, number][] = [];
  for (let k = 0; k < N_FRAMES; k++) {
    const i = first + k;
    if (!on[i % N_FRAMES]) continue;
    const last = runs[runs.length - 1];
    if (last && last[1] === i) last[1] = i + 1;
    else runs.push([i, i + 1]);
  }
  let k = 0;
  for (const [a, b] of runs) {
    // the wall sits around the deepest run-off, where a car that runs wide ends up
    let peak = a;
    for (let i = a; i < b; i++) if (RUNOFF[i % N_FRAMES] > RUNOFF[peak % N_FRAMES]) peak = i;
    const f = FRAMES[peak % N_FRAMES];
    const side = (-Math.sign(f.k) || 1) as 1 | -1;
    const line: THREE.Vector3[] = [];
    for (let i = a; i < b; i++) {
      const j = i % N_FRAMES;
      line.push(FRAMES[j].p.clone().addScaledVector(FRAMES[j].n, barrierOffset(j, side) + side * 0.3));
    }
    const lens = [0];
    for (let i = 1; i < line.length; i++) lens.push(lens[i - 1] + line[i].distanceTo(line[i - 1]));
    const total = lens[lens.length - 1];
    const want = Math.min(WALL_MAX, total * 0.6);
    if (want < WALL_MIN) continue;
    const mid = lens[peak - a];
    const from = THREE.MathUtils.clamp(mid - want / 2, 0, total - want);
    const n = Math.floor(want / STACK_GAP);
    const pieces: WallPiece[] = [];
    for (let m = 0; m <= n + 1; m++) {
      const d = from + (m - 0.5) * STACK_GAP;
      let s = 1;
      while (s < lens.length - 1 && lens[s] < d) s++;
      const p0 = line[s - 1];
      const p1 = line[s];
      const t = THREE.MathUtils.clamp((d - lens[s - 1]) / Math.max(1e-6, lens[s] - lens[s - 1]), 0, 1);
      const x = p0.x + (p1.x - p0.x) * t;
      const z = p0.z + (p1.z - p0.z) * t;
      const end = m === 0 || m === n + 1;
      if (skip(side, (a + s) % N_FRAMES, x, z)) continue;
      pieces.push({ x, z, yaw: Math.atan2(-(p1.z - p0.z), p1.x - p0.x), k: k++, end });
    }
    if (pieces.filter((p) => !p.end).length >= 3) out.push(...pieces);
  }
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
    if (onBridge(f.u, 6)) continue;
    const s = farSign(f);
    let off = Math.abs(barrierOffset(i, s as 1 | -1)) + 1.6;
    let q = f.p.clone().addScaledVector(f.n, s * off);
    if (inPitSide(q.x, q.z)) {
      // main straight: stand on the pit-wall line, between the track and the pit lane
      off = f.p.z - (PIT.z + 4.3);
      q = f.p.clone().addScaledVector(f.n, s * off);
      if (Math.abs(Math.abs(q.x) - 18) < 3.6) continue;
    }
    // never on the road: the pit-wall rule above misfires where the lap bends away (T1, the last corner)
    if (nearestT(q.x, q.z).dist < TRACK_WIDTH / 2 + 0.6) continue;
    if (nearCrossing(q.x, q.z)) continue;
    if (!inLand(q.x, q.z, 1.5)) continue; // not in the harbour or the sea
    if (inSectorScene(q.x, q.z, 2.5) || nearPlace(q.x, q.z, 2) || nearTree(q.x, q.z, 0.8) || nearCones(q.x, q.z, 3)) continue;
    if (STAND_SPOTS.some((st) => Math.hypot(st.x - q.x, st.z - q.z) < 8)) continue;
    // head and pool on the road side
    const h = f.p.clone().addScaledVector(f.n, s * (off - LAMP_ARM));
    if (nearCrossing(h.x, h.z)) continue;
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

/** Sponsor boards on two legs at the far edge of the run-off. */
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
    !inSectorScene(sp.x, sp.z, 2) &&
    !nearPlace(sp.x, sp.z, 1) &&
    !nearTree(sp.x, sp.z, 1.5) &&
    !nearCrossing(sp.x, sp.z, 20) &&
    !TYRE_WALLS.some((w) => Math.hypot(w.x - sp.x, w.z - sp.z) < 3) &&
    !STAND_SPOTS.some((st) => Math.hypot(st.x - sp.x, st.z - sp.z) < 8)
);

export const MARSHALS: Spot[] = [0.235, 0.47, 0.715, 0.79, 0.965]
  .map((u) => farSpot(u, 3.2))
  .filter((s) => !inSectorScene(s.x, s.z, 1) && !nearPlace(s.x, s.z, 0) && !nearTree(s.x, s.z, 1.5));
