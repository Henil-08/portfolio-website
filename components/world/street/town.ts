// Where the town's buildings stand and what they look like: pure data, shared
// by the renderer (./Skyline.tsx) and anything that must keep clear of them.
import { CROSSINGS, MAX_R, PIT, inLand, trackTangent } from "../layout";
import { heightAt } from "../terrain";
import { AWAY, FRAMES, RUNOFF, barrierOffset, distToTrack, farSign, inSectorScene, nearPlace, nearTree, nearestFrame, outSign, rng } from "./common";
import { FLOODS } from "./layoutStreet";
import { nearPromenade } from "../waterfront/layout";
import { STAND_SPOTS } from "./standSpots";

// ------------------------------------------------------------ palette

export const CREAM = "#f3e9d8";
export const TERRACOTTA = "#d9826b";
export const SAGE = "#9fb79a";
export const DUSTY_BLUE = "#8fa9c4";
export const BUTTER = "#f0d48a";
export const WARM_WHITE = "#faf5ec";

const WALLS = [CREAM, CREAM, CREAM, WARM_WHITE, WARM_WHITE, TERRACOTTA, TERRACOTTA, SAGE, SAGE, DUSTY_BLUE, DUSTY_BLUE, BUTTER, BUTTER];
export const ROOF_TILE = "#c4694f";
export const ROOF_SLATE = "#66707d";
export const ROOF_SAGE = "#7d9879";
export const AWNINGS = [TERRACOTTA, SAGE, DUSTY_BLUE, BUTTER, "#c4694f", "#6f8f5a"];

// Storeys: a taller ground floor (shops), then even floors, then a parapet.
// Kept low so buildings read only a little taller than the car, like the original (4b-b).
export const G0 = 3.0;
export const FH = 2.6;
const bodyH = (floors: number) => G0 + (floors - 1) * FH + 0.7;
const MAX_TOP = 12;
// Buildings this close to the track (m) stay at one or two storeys.
const NEAR_TRACK = 30;

// ------------------------------------------------------------ placement

/** 0 flat, 1 pitched, 2 flat with a roof garden, 3 vaulted. */
export type Roof = 0 | 1 | 2 | 3;
export type Bld = {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  yaw: number;
  /** 0 regular windows, 1 wide windows, 2 tall narrow windows (landmarks) */
  style: number;
  color: string;
  seed: number;
  /** +1 if local +z faces the road, else -1 */
  front: 1 | -1;
  floors: number;
  roof: Roof;
  /** pitched/vaulted roof height */
  rh: number;
  /** one of the old town's buildings round the crossover */
  old?: boolean;
};

// Buildings may stand on slopes. The walls stay vertical: the floor sits at the
// highest ground under the footprint and a stone plinth reaches down to the
// lowest, so the low side shows more stone and no edge ever floats. On steeper
// ground (an embankment) the plinth stops at PLINTH m and the building sits into
// the high side instead.
const MAX_FALL = 5;
const PLINTH = 2.5;

/** Ground under a building's footprint: its `floor`, and `low`, where its plinth ends. */
export function footing(b: Pick<Bld, "x" | "z" | "w" | "d" | "yaw">) {
  const c = Math.cos(b.yaw);
  const sn = Math.sin(b.yaw);
  let top = -Infinity;
  let low = Infinity;
  for (let i = -2; i <= 2; i++)
    for (let j = -2; j <= 2; j++) {
      const lx = (i / 2) * (b.w / 2 + 0.2);
      const lz = (j / 2) * (b.d / 2 + 0.2);
      const y = heightAt(b.x + lx * c + lz * sn, b.z - lx * sn + lz * c);
      top = Math.max(top, y);
      low = Math.min(low, y);
    }
  return { floor: Math.min(top, low + PLINTH), low, fall: top - low };
}

function overlaps(a: Bld, b: Bld, gap: number) {
  // separating axis test for two rotated rectangles
  const axes = [a.yaw, a.yaw + Math.PI / 2, b.yaw, b.yaw + Math.PI / 2].map((t) => [Math.cos(t), -Math.sin(t)]);
  const corners = (r: Bld) => {
    const c = Math.cos(r.yaw);
    const s = Math.sin(r.yaw);
    const hw = r.w / 2 + gap / 2;
    const hd = r.d / 2 + gap / 2;
    return [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ].map(([lx, lz]) => [r.x + lx * c + lz * s, r.z - lx * s + lz * c]);
  };
  const ca = corners(a);
  const cb = corners(b);
  for (const [ax, az] of axes) {
    let amin = Infinity;
    let amax = -Infinity;
    let bmin = Infinity;
    let bmax = -Infinity;
    for (const [x, z] of ca) {
      const p = x * ax + z * az;
      amin = Math.min(amin, p);
      amax = Math.max(amax, p);
    }
    for (const [x, z] of cb) {
      const p = x * ax + z * az;
      bmin = Math.min(bmin, p);
      bmax = Math.max(bmax, p);
    }
    if (amax < bmin || bmax < amin) return false;
  }
  return true;
}

// The chase camera's offset from the car (Rig.tsx OFFSET at zoom 1).
const CAM = { x: 10.5, y: 12.5, z: 14 };

/** True if the building would stand between the car and the chase camera anywhere along the lap nearby. */
function blocksCamera(b: Bld) {
  const c = Math.cos(b.yaw);
  const sn = Math.sin(b.yaw);
  const floor = footing(b).floor;
  for (const f of FRAMES) {
    if (Math.hypot(f.p.x - b.x, f.p.z - b.z) > 40) continue;
    const top = floor - f.p.y + b.h + b.rh + 0.5; // roof above this bit of road
    for (let k = 1; k <= 20; k++) {
      const t = k / 20;
      if (CAM.y * t > top) break; // the sight line is above the roof from here on
      const dx = f.p.x + CAM.x * t - b.x;
      const dz = f.p.z + CAM.z * t - b.z;
      // into the building's frame (inverse of a Y rotation by yaw)
      const lx = dx * c - dz * sn;
      const lz = dx * sn + dz * c;
      if (Math.abs(lx) < b.w / 2 + 0.5 && Math.abs(lz) < b.d / 2 + 0.5) return true;
    }
  }
  return false;
}

/** True if every corner of the footprint is at least `gap` from every road centreline. */
function cornersClear(b: Bld, gap: number) {
  const c = Math.cos(b.yaw);
  const sn = Math.sin(b.yaw);
  for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
    const x = b.x + (lx * b.w * c) / 2 + (lz * b.d * sn) / 2;
    const z = b.z - (lx * b.w * sn) / 2 + (lz * b.d * c) / 2;
    if (distToTrack(x, z) < gap) return false;
  }
  return true;
}

function clear(b: Bld, out: Bld[], tight = false) {
  const hd = Math.hypot(b.w, b.d) / 2;
  if (!inLand(b.x, b.z, Math.max(b.w, b.d) * 0.45 + 2)) return false;
  if (footing(b).fall > MAX_FALL) return false;
  if (nearPromenade(b.x, b.z, Math.max(b.w, b.d) * 0.55 + 1)) return false;
  if (inSectorScene(b.x, b.z, hd + 5, 14)) return false;
  if (nearPlace(b.x, b.z, hd, !tight)) return false;
  if (nearTree(b.x, b.z, Math.min(b.w, b.d) * 0.45)) return false;
  if (FLOODS.some((l) => Math.hypot(l.x - b.x, l.z - b.z) < hd + 1)) return false;
  if (STAND_SPOTS.some((s) => Math.hypot(s.x - b.x, s.z - b.z) < hd + 8)) return false;
  if (tight ? !cornersClear(b, 6.5) : distToTrack(b.x, b.z) - Math.min(b.w, b.d) / 2 < 7.5) return false;
  if (out.some((o) => overlaps(o, b, 1.1))) return false;
  return !blocksCamera(b);
}

/** Which way local +z points relative to the road beside the building. */
function frontOf(x: number, z: number, yaw: number): 1 | -1 {
  const f = nearestFrame(x, z);
  return Math.sin(yaw) * (f.p.x - x) + Math.cos(yaw) * (f.p.z - z) >= 0 ? 1 : -1;
}

function dress(r: () => number, b: Omit<Bld, "roof" | "rh" | "style" | "front">, styleBias = 0): Bld {
  const roll = r();
  const roof: Roof = roll < 0.45 ? 1 : roll < 0.75 ? 2 : roll < 0.85 ? 3 : 0;
  const short = Math.min(b.w, b.d);
  const rh = roof === 1 ? Math.min(Math.max(1.4, short * 0.3), 2.6, MAX_TOP - b.h) : roof === 3 ? Math.min(short * 0.3, MAX_TOP - b.h) : 0;
  const style = r() < 0.22 + styleBias ? 1 : 0;
  return { ...b, roof, rh, style, front: frontOf(b.x, b.z, b.yaw) };
}

/** A continuous street wall on the far side, close enough to frame the chase camera. */
function frontage(out: Bld[]) {
  const r = rng(404);
  let i = 0;
  while (i < FRAMES.length) {
    const f = FRAMES[i];
    // The outer side of the lap where it is also the side away from the camera
    // (buildings on the camera's side would hide the car), straights and gentle bends.
    const s = outSign(f);
    if (s !== farSign(f) || Math.abs(f.k) > 0.1) {
      i += 2;
      continue;
    }
    // Narrower on bends, so the frontage steps round the corner instead of jutting into it.
    const bend = Math.abs(f.k) > 0.025;
    const w = bend ? 4.2 + r() * 2 : 6 + r() * 4.5;
    const d = 5.5 + r() * 3;
    // Right behind the pavement: pushed back until both front corners clear it.
    const need = Math.abs(barrierOffset(i, s as 1 | -1)) + 3.6 + r() * 1.2;
    let off = need + d / 2;
    const yawF = Math.atan2(-f.tan.z, f.tan.x);
    for (let k = 0; k < 8; k++) {
      const c = f.p.clone().addScaledVector(f.n, s * off);
      const nearest = Math.min(
        ...[-1, 1].map((sx) => {
          // front corners: along the tangent by +-w/2, toward the road by d/2
          const x = c.x + Math.cos(yawF) * (sx * w) / 2 - f.n.x * s * (d / 2);
          const z = c.z - Math.sin(yawF) * (sx * w) / 2 - f.n.z * s * (d / 2);
          return distToTrack(x, z);
        }),
      );
      if (nearest >= need - 0.1) break;
      off += need - nearest;
    }
    const q = f.p.clone().addScaledVector(f.n, s * off);
    const floors = r() < 0.45 ? 1 : 2;
    const color = WALLS[Math.floor(r() * WALLS.length)];
    const yaw = Math.atan2(-f.tan.z, f.tan.x);
    const b = dress(r, { x: q.x, z: q.z, w, d, h: bodyH(floors), yaw, color, seed: r() * 100, floors });
    if (clear(b, out)) {
      out.push(b);
      i += Math.max(2, Math.round(((w + 1.4) / LEN_M) * FRAMES.length));
    } else i += 3;
  }
}
const LEN_M = FRAMES.length * FRAMES[1].p.distanceTo(FRAMES[0].p);

/**
 * The old town: buildings packed into the four corners where the climbing road
 * crosses over the tunnel straight, so you drive under the deck down a street
 * canyon. Squared to the lower road; low on the camera's side so the car stays
 * in view under the bridge.
 */
function oldTown(out: Bld[]) {
  const r = rng(1897);
  for (const c of CROSSINGS) {
    const t = trackTangent(c.lowerT);
    const yaw = Math.atan2(-t.z, t.x);
    const tx = t.x / Math.hypot(t.x, t.z);
    const tz = t.z / Math.hypot(t.x, t.z);
    for (let k = 0; k < 240; k++) {
      // along the lower road, and out to one side of it
      const along = (r() * 2 - 1) * 40;
      const side = r() < 0.5 ? 1 : -1;
      const off = 7 + r() * 15;
      const x = c.x + tx * along - tz * off * side;
      const z = c.z + tz * along + tx * off * side;
      const camSide = (-tz * side) * AWAY.x + (tx * side) * AWAY.z < 0;
      const w = 5 + r() * 3.5;
      const d = 5.5 + r() * 2.5;
      const floors = camSide ? 1 : 2;
      const color = WALLS[Math.floor(r() * WALLS.length)];
      const b = dress(r, { x, z, w, d, h: bodyH(floors), yaw, color, seed: r() * 100, floors }, 0.1);
      if (clear(b, out, true)) out.push({ ...b, old: true });
    }
  }
}

export const BUILDINGS: Bld[] = (() => {
  const r = rng(2026);
  const out: Bld[] = [];
  oldTown(out);
  frontage(out);
  for (let tries = 0; tries < 16000 && out.length < 280; tries++) {
    const a = r() * Math.PI * 2;
    const rad = 30 + Math.sqrt(r()) * (MAX_R - 34);
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad;
    const g = (x * AWAY.x + z * AWAY.z) / rad; // 1 far, -1 near
    const far01 = (g + 1) / 2;
    const w = 5 + r() * (4 + far01 * 3.5);
    const d = 5 + r() * (3.5 + far01 * 3);
    const hd = Math.hypot(w, d) / 2;
    if (!inLand(x, z, hd + 2)) continue;
    if (nearPromenade(x, z, hd + 1)) continue;
    const f = nearestFrame(x, z);
    const dt = distToTrack(x, z);
    const ri = Math.round(f.u * RUNOFF.length) % RUNOFF.length;
    if (dt - hd * 0.85 < 8.5 + RUNOFF[ri]) continue;
    // keep the infield open: only build outside the loop
    const vx = x - f.p.x;
    const vz = z - f.p.z;
    const outside = vx * f.p.x + vz * (f.p.z + 3) > 0;
    if (!outside) continue;
    if (inSectorScene(x, z, hd + 5, 14)) continue;
    if (nearPlace(x, z, hd)) continue;
    if (nearTree(x, z, Math.min(w, d) * 0.45)) continue;
    if (FLOODS.some((l) => Math.hypot(l.x - x, l.z - z) < hd + 1)) continue;
    if (STAND_SPOTS.some((s) => Math.hypot(s.x - x, s.z - z) < hd + 8)) continue;
    if (z > PIT.garageZ - 8 && z < 44 && Math.abs(x) < 46) continue;
    // orientation: square to the road close by, square to the shore further out
    const yaw = dt < 34 ? Math.atan2(-f.tan.z, f.tan.x) : Math.atan2(z, -x) + Math.PI / 2;
    // storeys: more on the far side, low where the camera looks over them
    const camSide = vx * AWAY.x + vz * AWAY.z < 0;
    let floors = 1 + Math.floor(Math.pow(r(), 1.3) * (1.5 + far01 * 1.5));
    if (dt < NEAR_TRACK) floors = Math.min(floors, 2);
    if (camSide) floors = Math.min(floors, Math.floor((4.3 + Math.max(0, dt - 13) * 0.55 - 0.7 - G0) / FH) + 1);
    const color = WALLS[Math.floor(r() * WALLS.length)];
    const b = dress(r, { x, z, w, d, h: bodyH(floors), yaw, color, seed: r() * 100, floors });
    if (out.some((o) => overlaps(o, b, 1.1))) continue;
    if (footing(b).fall > MAX_FALL) continue;
    if (blocksCamera(b)) continue;
    out.push(b);
  }
  // A few landmarks on the far side: slim towers with tall windows and a steep roof.
  let marks = 0;
  for (const b of out) {
    if (marks >= 4) break;
    const g = (b.x * AWAY.x + b.z * AWAY.z) / Math.hypot(b.x, b.z);
    if (g < 0.55 || b.floors < 3 || (marks && b.seed % 3 > 1)) continue;
    const mark = { ...b, w: Math.min(b.w, b.d, 5.6), d: Math.min(b.w, b.d, 5.6), floors: 3, h: bodyH(3), roof: 1 as Roof, style: 2 };
    mark.rh = Math.min(3.4, MAX_TOP - mark.h);
    if (blocksCamera(mark)) continue; // taller now: it mustn't hide the car
    Object.assign(b, mark);
    marks++;
  }
  return out;
})();
