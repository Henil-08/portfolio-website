// Procedural layout of the street circuit: where every barrier block, lamp,
// board, fence panel and marshal post goes. Pure data, computed once.
import * as THREE from "three";
import { GANTRY, LEN, FRAMES, N_FRAMES, barrierOffset, farSign, farSpot, inPitSide, inSectorScene, nearCones, nearPlace, nearTree, outSign, RUNOFF, type Spot } from "./common";
import { STAND_SPOTS } from "./standSpots";
import { nearGarden } from "../garden/layout";
import { nearPromenade } from "../waterfront/layout";
import { GARAGES, PIT, PIT_LANE_WIDTH, PIT_WALL, STRAIGHT_Z, TRACK_WIDTH, inLand, nearCrossing, nearestT, onBridge, pitWallZ } from "../layout";

// The original circuit has no walls: open run-off past the kerbs, and a short TecPro
// barrier (W03) on the outside of the tight corners only.

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
  // never on any stretch of road (where the lap doubles back, another stretch can be near)
  if (nearestT(x, z).dist < TRACK_WIDTH / 2 + 0.8) return true;
  if (inner && inPitSide(x, z)) return true;
  if (x > PIT.from - 8 && x < PIT.to + 8 && z > PIT.garageZ - 5 && z < PIT.z + PIT_LANE_WIDTH / 2 + 1) return true; // pit lane and garages
  if (far && inSectorScene(x, z, 2)) return true;
  if (nearPlace(x, z, 1)) return true;
  if (nearCones(x, z, 3.5)) return true;
  if (nearTree(x, z, 0.6)) return true;
  if (!inLand(x, z, 1)) return true;
  if (inner) {
    for (const [u, h] of ACCESS) {
      let du = Math.abs(f.u - u);
      du = Math.min(du, 1 - du);
      if (du * LEN < h) return true;
    }
  }
  return false;
}

/** TecPro block size: `BLOCK` along the wall, `BLOCK_H` tall, `BLOCK_D` deep. */
export const BLOCK = 1.0;
export const BLOCK_H = 0.8;
export const BLOCK_D = 0.8;
const WALL_MIN = 4; // m
const WALL_MAX = 16; // m
const RUN_MIN = 0.35; // run-off amount that marks a tight corner

/**
 * A TecPro block on the outside of a corner: two rows, the top row set half a block along.
 * `end` marks the first and last block of a row, `wall` and `i` which wall and which block.
 */
export type WallPiece = { x: number; z: number; yaw: number; k: number; row: 0 | 1; wall: number; i: number; end: boolean };

/** The TecPro walls (the name is from the tyre walls they replaced; Grass.tsx reads it too). */
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
  let wall = 0;
  for (const [a, b] of runs) {
    // the wall sits around the deepest run-off, where a car that runs wide ends up
    let peak = a;
    for (let i = a; i < b; i++) if (RUNOFF[i % N_FRAMES] > RUNOFF[peak % N_FRAMES]) peak = i;
    const f = FRAMES[peak % N_FRAMES];
    const side = (-Math.sign(f.k) || 1) as 1 | -1;
    const line: THREE.Vector3[] = [];
    for (let i = a; i < b; i++) {
      const j = i % N_FRAMES;
      line.push(FRAMES[j].p.clone().addScaledVector(FRAMES[j].n, barrierOffset(j, side) + side * 0.45));
    }
    const lens = [0];
    for (let i = 1; i < line.length; i++) lens.push(lens[i - 1] + line[i].distanceTo(line[i - 1]));
    const total = lens[lens.length - 1];
    const want = Math.min(WALL_MAX, total * 0.6);
    if (want < WALL_MIN) continue;
    const mid = lens[peak - a];
    const from = THREE.MathUtils.clamp(mid - want / 2, 0, total - want);
    const n = Math.floor(want / BLOCK);
    const pieces: WallPiece[] = [];
    for (const row of [0, 1] as const) {
      const count = row ? n - 1 : n;
      for (let m = 0; m < count; m++) {
        const d = from + (m + 0.5 + row * 0.5) * BLOCK;
        let s = 1;
        while (s < lens.length - 1 && lens[s] < d) s++;
        const p0 = line[s - 1];
        const p1 = line[s];
        const t = THREE.MathUtils.clamp((d - lens[s - 1]) / Math.max(1e-6, lens[s] - lens[s - 1]), 0, 1);
        const x = p0.x + (p1.x - p0.x) * t;
        const z = p0.z + (p1.z - p0.z) * t;
        if (skip(side, (a + s) % N_FRAMES, x, z)) continue;
        pieces.push({ x, z, yaw: Math.atan2(-(p1.z - p0.z), p1.x - p0.x), k: k++, row, wall, i: m, end: m === 0 || m === count - 1 });
      }
    }
    // a top block needs both blocks under it
    const base = new Set(pieces.filter((p) => p.row === 0).map((p) => p.i));
    const kept = pieces.filter((p) => p.row === 0 || (base.has(p.i) && base.has(p.i + 1)));
    if (kept.filter((p) => p.row === 0).length >= 3) {
      out.push(...kept);
      wall++;
    }
  }
  return out;
})();

// ------------------------------------------------------------ floodlights

/** A floodlight tower: foot (x, z), facing the road (yaw turns local +Z onto it), and the light pool on the road. */
export type Flood = { x: number; z: number; yaw: number; px: number; pz: number; py: number; pyaw: number; pitch: number };
export const FLOOD_SPACING = 17;
const FLOOD_STRAIGHT = 9; // m between towers on the pit wall
const FLOOD_BACK = 2.6; // m past the barrier line, clear of the TecPro walls and the catch fence
const FLOOD_FAR = 3.2; // m past the straight's far edge, for the towers moved off the pit wall
const GARAGE_CLEAR = 8; // m past the outer garages' centres that the pit wall stays clear of towers

/**
 * Night-race floodlight towers on the far side, set back outside the run-off, every ~17 m.
 * The main straight has its own denser row on the pit wall.
 */
export const FLOODS: Flood[] = (() => {
  const out: Flood[] = [];
  const clear = (x: number, z: number) =>
    nearestT(x, z).dist >= TRACK_WIDTH / 2 + 0.6 &&
    !nearCrossing(x, z, 14) &&
    inLand(x, z, 1.5) &&
    !inSectorScene(x, z, 2.5) &&
    !nearPlace(x, z, 2) &&
    !nearGarden(x, z, 1) &&
    !nearTree(x, z, 0.8) &&
    !nearCones(x, z, 3) &&
    !STAND_SPOTS.some((st) => Math.hypot(st.x - x, st.z - z) < 8) &&
    !TYRE_WALLS.some((w) => Math.hypot(w.x - x, w.z - z) < 1.6);
  const step = Math.round(N_FRAMES / (LEN / FLOOD_SPACING));
  for (let i = 5; i < N_FRAMES; i += step) {
    const f = FRAMES[i];
    if (onBridge(f.u, 8)) continue;
    const s = farSign(f);
    const off = Math.abs(barrierOffset(i, s as 1 | -1)) + FLOOD_BACK;
    let q = f.p.clone().addScaledVector(f.n, s * off);
    if (inPitSide(q.x, q.z)) continue; // the main straight gets its own row on the pit wall, below
    // something in the way: step further back before giving the spot up
    const pit = inPitSide(q.x, q.z);
    let ok = clear(q.x, q.z);
    for (let back = 2; !ok && !pit && back <= 8; back += 2) {
      q = f.p.clone().addScaledVector(f.n, s * (off + back));
      ok = clear(q.x, q.z);
    }
    if (!ok) continue;
    const pool = f.p.clone().addScaledVector(f.n, s * 1.2);
    const pitch = Math.atan2(f.tan.y, Math.hypot(f.tan.x, f.tan.z));
    if (nearCrossing(pool.x, pool.z, 14)) continue;
    out.push({ x: q.x, z: q.z, yaw: Math.atan2(-s * f.n.x, -s * f.n.z), px: pool.x, pz: pool.z, py: f.p.y, pyaw: Math.atan2(-f.tan.z, f.tan.x), pitch });
  }
  // The main straight, lit like a night race's pit straight: a tower every FLOOD_STRAIGHT m,
  // its bank facing the track. On the pit wall (facing +z) past the ends of the garage block;
  // in front of the garages they would stand in the bays' view, so there they move to the
  // far side of the straight (facing -z).
  const x0 = PIT_WALL[0][0] + 2;
  const x1 = PIT_WALL[PIT_WALL.length - 1][0] - 2;
  const g0 = GARAGES[0].x - GARAGE_CLEAR;
  const g1 = GARAGES[GARAGES.length - 1].x + GARAGE_CLEAR;
  const n = Math.round((x1 - x0) / FLOOD_STRAIGHT);
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n;
    if (Math.abs(x - GANTRY.p.x) < 4) continue;
    if (x > g0 && x < g1) {
      // just off the far edge, short of the waterfront promenade
      const z = [FLOOD_FAR, FLOOD_FAR - 0.8].map((o) => STRAIGHT_Z + TRACK_WIDTH / 2 + o).find((zz) => clear(x, zz) && !nearPromenade(x, zz, 0.5));
      if (z !== undefined) out.push({ x, z, yaw: Math.PI, px: x, pz: STRAIGHT_Z, py: 0, pyaw: 0, pitch: 0 });
      continue;
    }
    const z = pitWallZ(x);
    if (z === null) continue;
    out.push({ x, z, yaw: 0, px: x, pz: STRAIGHT_Z, py: 0, pyaw: 0, pitch: 0 });
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
  [0.3, "HG-08"],
  [0.355, "LIGHTS OUT"],
  [0.4, "BOX BOX"],
  [0.585, "DRS ZONE"],
  [0.645, "08"],
  [0.665, "HG-08"],
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
    inLand(sp.x, sp.z, 2) &&
    !TYRE_WALLS.some((w) => Math.hypot(w.x - sp.x, w.z - sp.z) < 3) &&
    !STAND_SPOTS.some((st) => Math.hypot(st.x - sp.x, st.z - sp.z) < 8)
);

export const MARSHALS: Spot[] = [0.235, 0.47, 0.715, 0.79, 0.965]
  .map((u) => farSpot(u, 3.2))
  .filter((s) => !inSectorScene(s.x, s.z, 1) && !nearPlace(s.x, s.z, 0) && !nearTree(s.x, s.z, 1.5) && inLand(s.x, s.z, 2));
