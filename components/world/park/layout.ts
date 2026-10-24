// The park north of the garden, after folio-2025 (MIT): each place
// stands on its own grass island in a field of warm sand, and the sand between
// the islands is the path network (the original's terrain paint, static/terrain/terrain.png).
// Pure data, shared by the ground colours (Island.tsx), the grass mask (Grass.tsx)
// and the footbridge (./index.tsx).
import * as THREE from "three";
import { CANALS, zoneById } from "../layout";

export type ParkIsland = { x: number; z: number; rx: number; rz: number; yaw: number; seed: number };

const at = (id: keyof typeof zoneById) => zoneById[id].pos;

export const ISLANDS: ParkIsland[] = [
  { x: at("podium")[0], z: at("podium")[1], rx: 9, rz: 7.5, yaw: 0.15, seed: 1 },
  { x: at("football")[0], z: at("football")[1], rx: 13, rz: 10.5, yaw: -0.05, seed: 2 },
  { x: at("playbook")[0], z: at("playbook")[1], rx: 9, rz: 7, yaw: 0.35, seed: 3 },
  { x: at("contact")[0], z: at("contact")[1] - 3, rx: 10, rz: 9.5, yaw: 0, seed: 4 },
  // the infield grandstand's lawn
  { x: 44, z: -44, rx: 10.5, rz: 7.5, yaw: 0.1, seed: 5 },
  // small ones with a tree or two
  { x: -14, z: -16, rx: 4.5, rz: 3.6, yaw: 0.6, seed: 6 },
  { x: 31, z: -10, rx: 3.6, rz: 2.8, yaw: -0.4, seed: 7 },
  { x: 6, z: -33, rx: 4.2, rz: 3.4, yaw: 0.2, seed: 8 },
];

/** Sand ring around each island (m); rings that meet make the paths. */
export const SAND = 4.5;

function wobble(i: ParkIsland, a: number) {
  return 1 + 0.08 * Math.sin(a * 3 + i.seed * 1.7) + 0.05 * Math.sin(a * 5 + i.seed * 2.9);
}

/** Metres outside island `i`'s edge (negative inside). */
function edgeDist(i: ParkIsland, x: number, z: number) {
  const dx = x - i.x;
  const dz = z - i.z;
  const c = Math.cos(i.yaw);
  const s = Math.sin(i.yaw);
  const u = dx * c - dz * s;
  const v = dx * s + dz * c;
  const w = wobble(i, Math.atan2(v, u));
  return (Math.hypot(u / (i.rx * w), v / (i.rz * w)) - 1) * Math.min(i.rx, i.rz);
}

/** Metres outside the nearest island's edge (negative on an island). */
export function islandDist(x: number, z: number) {
  let e = Infinity;
  for (const i of ISLANDS) e = Math.min(e, edgeDist(i, x, z));
  return e;
}

/** 0..1 how much of the ground at (x, z) is park sand. */
export function parkSand(x: number, z: number) {
  const e = islandDist(x, z);
  // soft edges: the ground's colours live on a ~1.1 m grid, a hard edge would stair-step
  return THREE.MathUtils.smoothstep(e, -0.8, 1.6) * (1 - THREE.MathUtils.smoothstep(e, SAND, SAND + 2.5));
}

/** Outline of island `i` pushed out by `off` metres, for canvas painting. */
export function islandOutline(i: ParkIsland, off = 0, n = 72): [number, number][] {
  const out: [number, number][] = [];
  const c = Math.cos(i.yaw);
  const s = Math.sin(i.yaw);
  const m = Math.min(i.rx, i.rz);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const w = wobble(i, a) * (1 + off / m);
    const u = Math.cos(a) * i.rx * w;
    const v = Math.sin(a) * i.rz * w;
    // inverse of the rotation in edgeDist
    out.push([i.x + u * c + v * s, i.z - u * s + v * c]);
  }
  return out;
}

/** Paint the park into the grass mask: no blades on the sand, blades back on the islands. */
export function paintPark(g: CanvasRenderingContext2D, tx: (v: number) => number) {
  const poly = (pts: [number, number][]) => {
    g.beginPath();
    pts.forEach(([x, z], k) => (k ? g.lineTo(tx(x), tx(z)) : g.moveTo(tx(x), tx(z))));
    g.closePath();
    g.fill();
  };
  g.fillStyle = "#000";
  for (const i of ISLANDS) poly(islandOutline(i, SAND));
  g.fillStyle = "#fff";
  for (const i of ISLANDS) poly(islandOutline(i, 0));
}

// ------------------------------------------------------------ footbridge

/** A wooden footbridge over the river, east of the tyre wall's island. */
export const FOOTBRIDGES = (() => {
  const river = CANALS[0];
  const [ax, az] = river.pts[1];
  const [bx, bz] = river.pts[2];
  const f = 0.45;
  const l = Math.hypot(bx - ax, bz - az);
  // across the river: perpendicular to its course
  const dx = -(bz - az) / l;
  const dz = (bx - ax) / l;
  const w = river.w[1] + (river.w[2] - river.w[1]) * f;
  return [{ x: ax + (bx - ax) * f, z: az + (bz - az) * f, dx, dz, len: w + 4.5, width: 3.6 }]; // wide enough for the scaled car (4b-b)
})();
