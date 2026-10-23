// Where the town's buildings stand and what they look like: pure data, shared
// by the renderer (./Skyline.tsx) and anything that must keep clear of them.
import { MAX_R, PIT, duneMask, inLand, reliefAt } from "../layout";
import { AWAY, FRAMES, RUNOFF, barrierOffset, distToTrack, farSign, inSectorScene, nearPlace, nearTree, nearestFrame, outSign, rng } from "./common";
import { LAMPS } from "./layoutStreet";
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
export const G0 = 3.6;
export const FH = 3.0;
const bodyH = (floors: number) => G0 + (floors - 1) * FH + 0.7;
const MAX_TOP = 18;

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
};

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

function clear(b: Bld, out: Bld[]) {
  const hd = Math.hypot(b.w, b.d) / 2;
  if (!inLand(b.x, b.z, Math.max(b.w, b.d) * 0.45 + 2)) return false;
  if (reliefAt(b.x, b.z) > 0.6 || duneMask(b.x, b.z) > 0.1) return false; // not on the hills or the dunes, a box would float on the slope
  if (nearPromenade(b.x, b.z, Math.max(b.w, b.d) * 0.55 + 1)) return false;
  if (inSectorScene(b.x, b.z, hd + 5, 14)) return false;
  if (nearPlace(b.x, b.z, hd)) return false;
  if (nearTree(b.x, b.z, Math.min(b.w, b.d) * 0.45)) return false;
  if (LAMPS.some((l) => Math.hypot(l.x - b.x, l.z - b.z) < hd + 1)) return false;
  if (STAND_SPOTS.some((s) => Math.hypot(s.x - b.x, s.z - b.z) < hd + 8)) return false;
  if (distToTrack(b.x, b.z) - Math.min(b.w, b.d) / 2 < 7.5) return false;
  return !out.some((o) => overlaps(o, b, 1.1));
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
    const floors = 2 + Math.floor(Math.pow(r(), 1.2) * 3.999);
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

export const BUILDINGS: Bld[] = (() => {
  const r = rng(2026);
  const out: Bld[] = [];
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
    if (reliefAt(x, z) > 0.6 || duneMask(x, z) > 0.1) continue; // the hills and the dunes stay open
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
    if (LAMPS.some((l) => Math.hypot(l.x - x, l.z - z) < hd + 1)) continue;
    if (STAND_SPOTS.some((s) => Math.hypot(s.x - x, s.z - z) < hd + 8)) continue;
    if (z > PIT.garageZ - 8 && z < 44 && Math.abs(x) < 46) continue;
    // orientation: square to the road close by, square to the shore further out
    const yaw = dt < 34 ? Math.atan2(-f.tan.z, f.tan.x) : Math.atan2(z, -x) + Math.PI / 2;
    // storeys: more on the far side, low where the camera looks over them
    const camSide = vx * AWAY.x + vz * AWAY.z < 0;
    let floors = 2 + Math.floor(Math.pow(r(), 1.3) * (1.5 + far01 * 2.5));
    if (camSide) floors = Math.min(floors, Math.floor((4.3 + Math.max(0, dt - 13) * 0.55 - 0.7 - G0) / FH) + 1);
    const color = WALLS[Math.floor(r() * WALLS.length)];
    const b = dress(r, { x, z, w, d, h: bodyH(floors), yaw, color, seed: r() * 100, floors });
    if (out.some((o) => overlaps(o, b, 1.1))) continue;
    out.push(b);
  }
  // A few landmarks on the far side: slim towers with tall windows and a steep roof.
  let marks = 0;
  for (const b of out) {
    if (marks >= 4) break;
    const g = (b.x * AWAY.x + b.z * AWAY.z) / Math.hypot(b.x, b.z);
    if (g < 0.55 || b.floors < 4 || (marks && b.seed % 3 > 1)) continue;
    b.w = b.d = Math.min(b.w, b.d, 5.6);
    b.floors = 4;
    b.h = bodyH(4);
    b.roof = 1;
    b.rh = Math.min(4.4, MAX_TOP - b.h);
    b.style = 2;
    marks++;
  }
  return out;
})();
