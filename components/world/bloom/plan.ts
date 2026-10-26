// The Bloom's timeline and its dots (docs/BRAND.md, locked 2026-10-26; the approved mock is
// app/docs/brand/world/island.tsx). Everything arrives by its distance from the car: first a
// field of square dots in the world's own layout (the track's centreline and edges, the pit lane,
// the coast, lakes, the river, building and garage footprints, floodlight masts, trees), then the
// solid world rises out of them and each dot fades as its piece lands. The water comes in last
// (`water0`): until then the sea and lakes are paper.
import * as THREE from "three";
import { GARAGES, LAKES, PIT, RIVER, START_T, TRACK_WIDTH, coastR, pitRoadCurves, trackCurve, trackPoint, trackTangent } from "../layout";
import { BUILDINGS } from "../street/town";
import { FLOODS } from "../street/layoutStreet";
import { heightAt } from "../terrain";

/** arrive = a + b * s, where s runs 0..1 outward from the car. */
export type Wave = { a: number; b: number };

/** The bloom's timeline (s), the mock's. */
export const PLAN = {
  /** when the dots arrive */
  dot: { a: 0.3, b: 2.1 } as Wave,
  /** when the world arrives: flat things at the wave, things that stand up rise from there */
  solid: { a: 1.05, b: 2.35 } as Wave,
  /** things that stand up start this much after the wave and rise over `rise` */
  standOff: 0.08,
  rise: 0.6,
  /** the water comes in last, everywhere at once: paper (the sea) until here, then its own colour over `waterIn` */
  water0: 3.2,
  waterIn: 0.9,
  /** when the camera settles on the game's chase view and driving starts */
  camEnd: 4.7,
};
/** The wave slows as it spreads: s = (d / R)^(1 / RAD_POW). */
export const RAD_POW = 1.3;

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

const COAST_RING = Array.from({ length: 360 }, (_, i) => {
  const a = (i / 360) * Math.PI * 2;
  const r = coastR(a);
  return [Math.cos(a) * r, Math.sin(a) * r] as const;
});

/** The island's middle and radius, for the overview that frames all of it. */
export const ISLAND = (() => {
  const xs = COAST_RING.map((p) => p[0]);
  const zs = COAST_RING.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  return { x: cx, z: cz, r: Math.max(...COAST_RING.map(([x, z]) => Math.hypot(x - cx, z - cz))) };
})();

/** The wave's reach from a centre: the furthest coast point, plus a margin. */
export const reachFrom = (cx: number, cz: number) => Math.max(...COAST_RING.map(([x, z]) => Math.hypot(x - cx, z - cz))) + 14;

/** One bloom, centred on the car. */
export type Bloom = { cx: number; cz: number; y: number; R: number };
export const arrive = (b: Bloom, w: Wave, x: number, z: number) => w.a + w.b * Math.pow(Math.min(1, Math.hypot(x - b.cx, z - b.cz) / b.R), 1 / RAD_POW);

/* ------------------------------------------------------------------ the dots */

/** Dot groups: what a dot belongs to decides when its piece lands. */
const STAND = new Set(["building", "garage", "mast", "tree"]);

export type Dots = { geo: THREE.BufferGeometry; log: [string, number][] };

/**
 * The world's layout as square points, each with when it shows (aDot) and when its piece lands
 * and it fades (aSolid). `trees` are the real tree positions (read off the scene).
 */
export function buildDots(b: Bloom, trees: [number, number][], car: { yaw: number }): Dots {
  const r = rng(808);
  const dp: number[] = [];
  const dSize: number[] = [];
  const dHot: number[] = [];
  const dDot: number[] = [];
  const dSolid: number[] = [];
  const first: Record<string, number> = {};
  const dot = (x: number, y: number, z: number, group: string, size = 1, hot = 0, ax = x, az = z) => {
    // on the ground (or the bridge deck, or the water's surface, whichever is higher)
    dp.push(x, Math.max(y, heightAt(x, z)) + 0.18, z);
    dSize.push(size);
    dHot.push(hot);
    const t = arrive(b, PLAN.dot, ax, az) + r() * 0.05;
    const solid = Math.max(arrive(b, PLAN.solid, ax, az) + (STAND.has(group) ? PLAN.standOff : 0), t + 0.35);
    dDot.push(t);
    dSolid.push(solid);
    first.dots = Math.min(first.dots ?? 1e9, t);
    first[group] = Math.min(first[group] ?? 1e9, solid);
  };

  // track: the centreline every 4 m, both edges every 2 m, following the curves (and the bridge)
  const HW = TRACK_WIDTH / 2;
  const LEN = trackCurve.getLength();
  const N = 1100;
  const segLen = LEN / N;
  for (let i = 0; i < N; i++) {
    const p = trackPoint(i / N);
    const f = trackTangent(i / N).setY(0).normalize();
    const along = i * segLen;
    if (Math.floor(along / 2) !== Math.floor((along + segLen) / 2)) for (const s of [-HW - 0.45, HW + 0.45]) dot(p.x - f.z * s, p.y, p.z + f.x * s, "track");
    if (Math.floor(along / 4) !== Math.floor((along + segLen) / 4)) dot(p.x, p.y, p.z, "track", 0.75);
  }
  // the start line, in orange
  {
    const sp = trackPoint(START_T);
    const sf = trackTangent(START_T).setY(0).normalize();
    for (let k = 0; k <= 10; k++) {
      const s = -HW + (k / 10) * TRACK_WIDTH;
      dot(sp.x - sf.z * s, sp.y, sp.z + sf.x * s, "track", 1.15, 1);
    }
  }
  // the car's own slot: an orange outline round it
  {
    const fx = Math.sin(car.yaw);
    const fz = Math.cos(car.yaw);
    const hl = 2.4;
    const hw = 1.2;
    const per = 2 * (2 * hl + 2 * hw);
    for (let k = 0; k < 16; k++) {
      let d = (k / 16) * per;
      let lx: number;
      let lz: number;
      if (d < 2 * hl) [lx, lz] = [-hw, -hl + d];
      else if ((d -= 2 * hl) < 2 * hw) [lx, lz] = [-hw + d, hl];
      else if ((d -= 2 * hw) < 2 * hl) [lx, lz] = [hw, hl - d];
      else [lx, lz] = [hw - (d - 2 * hl), -hl];
      // right of the heading is (-fz, fx)
      dot(b.cx - fz * lx + fx * lz, b.y - 0.1, b.cz + fx * lx + fz * lz, "car", 1.15, 1);
    }
  }
  // the pit lane and its links
  const lane = Array.from({ length: 40 }, (_, k) => new THREE.Vector3(PIT.from + ((PIT.to - PIT.from) * k) / 39, 0, PIT.z));
  for (const l of [lane, ...pitRoadCurves().map((c) => c.getPoints(24))]) {
    const c = new THREE.CatmullRomCurve3(l);
    for (let k = 0, m = Math.floor(c.getLength() / 3); k <= m; k++) {
      const p = c.getPointAt(k / m);
      dot(p.x, 0, p.z, "track", 0.8);
    }
  }
  // coast: every 2.2 m
  {
    const len = COAST_RING.reduce((s, p, i) => s + Math.hypot(p[0] - COAST_RING[(i + 1) % 360][0], p[1] - COAST_RING[(i + 1) % 360][1]), 0);
    const n = Math.round(len / 2.2);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const rr = coastR(a) - 0.6;
      dot(Math.cos(a) * rr, 0, Math.sin(a) * rr, "water", 0.9);
    }
  }
  // lakes: the shore and a sparse grid on the water
  for (const l of LAKES) {
    const n = Math.round((Math.PI * (l.rx + l.rz)) / 1.6);
    const cy = Math.cos(l.yaw);
    const sy = Math.sin(l.yaw);
    const put = (px: number, py: number, size: number) => dot(l.x + px * cy - py * sy, 0, l.z - (px * sy + py * cy), "water", size);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      put(Math.cos(a) * l.rx, Math.sin(a) * l.rz, 0.9);
    }
    for (let gx = -l.rx; gx <= l.rx; gx += 2.4) for (let gz = -l.rz; gz <= l.rz; gz += 2.4) if ((gx / l.rx) ** 2 + (gz / l.rz) ** 2 < 0.6) put(gx, gz, 0.6);
  }
  // river: both banks and the middle
  {
    const pts = RIVER.pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const c = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0);
    const m = Math.floor(c.getLength() / 2.2);
    for (let k = 0; k <= m; k++) {
      const u = k / m;
      const p = c.getPointAt(u);
      const tan = c.getTangentAt(u);
      const f = u * (RIVER.pts.length - 1);
      const i = Math.min(RIVER.pts.length - 2, Math.floor(f));
      const w = (RIVER.w[i] + (RIVER.w[i + 1] - RIVER.w[i]) * (f - i)) / 2;
      dot(p.x - tan.z * w, 0, p.z + tan.x * w, "water", 0.9);
      dot(p.x + tan.z * w, 0, p.z - tan.x * w, "water", 0.9);
      if (k % 2 === 0) dot(p.x, 0, p.z, "water", 0.6);
    }
  }
  // footprints: the outline of every building and garage, a dot at each corner and every ~2 m
  const footprint = (x: number, z: number, yaw: number, sx: number, sz: number, group: string) => {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const corners: [number, number][] = [
      [-sx / 2, -sz / 2],
      [sx / 2, -sz / 2],
      [sx / 2, sz / 2],
      [-sx / 2, sz / 2],
    ];
    for (let e = 0; e < 4; e++) {
      const [ax, az] = corners[e];
      const [bx, bz] = corners[(e + 1) % 4];
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 2));
      for (let k = 0; k < n; k++) {
        const lx = ax + ((bx - ax) * k) / n;
        const lz = az + ((bz - az) * k) / n;
        dot(x + lx * c + lz * s, 0, z - lx * s + lz * c, group, k === 0 ? 1 : 0.8, 0, x, z);
      }
    }
  };
  for (const bl of BUILDINGS) footprint(bl.x, bl.z, bl.yaw, bl.w, bl.d, "building");
  for (const g of GARAGES) footprint(g.x, PIT.garageZ - 5.5, 0, 9, 7, "garage");
  for (const f of FLOODS) dot(f.x, 0, f.z, "mast");
  for (const [x, z] of trees) dot(x, 0, z, "tree", 1.1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(dp), 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(dSize), 1));
  geo.setAttribute("aHot", new THREE.BufferAttribute(new Float32Array(dHot), 1));
  geo.setAttribute("aDot", new THREE.BufferAttribute(new Float32Array(dDot), 1));
  geo.setAttribute("aSolid", new THREE.BufferAttribute(new Float32Array(dSolid), 1));

  // the build log: what arrives when (ms), in order
  const rows: [string, number][] = [
    ["Bloom", first.dots],
    ["Track", first.track],
    ["Town", first.building],
    ["Garages", first.garage],
    ["Trees", first.tree ?? first.building],
    ["Lights", first.mast],
    ["Water", PLAN.water0],
    ["Game cam", PLAN.camEnd - 0.2],
  ];
  const log = rows.filter(([, t]) => Number.isFinite(t)).map(([s, t]) => [s, Math.round(t * 20) * 50] as [string, number]).sort((x, y) => x[1] - y[1]);
  return { geo, log };
}
