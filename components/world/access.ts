// The way from the start to the circuit: the car is parked at the head of a
// short asphalt lane by the name, which runs east along the garden path, south
// past the end of the garages and into the pit exit, and so out onto the track
// at T1. Painted chevrons point along it. Nothing says "this way"; the road does.
// Pure data, drawn by ./AccessRoad.tsx and masked out of the grass and bushes.
import * as THREE from "three";

export const ACCESS_WIDTH = 4.4;

export const ACCESS_PTS: [number, number][] = [
  [13, 3],
  [22, 3.2],
  [27.5, 4.2],
  [30, 7.5],
  [30.2, 12],
  [30.6, 18],
  [32, 24],
  [34, 28.6],
  [37.5, 32.6],
];

export const accessCurve = new THREE.CatmullRomCurve3(
  ACCESS_PTS.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  false,
  "centripetal",
);

const SAMPLED = accessCurve.getSpacedPoints(120);

/** Plan distance from (x, z) to the lane's centreline. */
export function accessDist(x: number, z: number) {
  let best = Infinity;
  for (const p of SAMPLED) best = Math.min(best, (p.x - x) ** 2 + (p.z - z) ** 2);
  return Math.sqrt(best);
}

/** True if something of radius `pad` at (x, z) would sit on the lane. */
export function nearAccess(x: number, z: number, pad = 0) {
  return accessDist(x, z) < ACCESS_WIDTH / 2 + pad;
}

/** Paint the lane black onto the grass mask (Grass.tsx). */
export function paintAccess(g: CanvasRenderingContext2D, tx: (v: number) => number, s: number) {
  g.save();
  g.strokeStyle = "#000";
  g.lineWidth = (ACCESS_WIDTH + 0.6) * s;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  SAMPLED.forEach((p, i) => (i ? g.lineTo(tx(p.x), tx(p.z)) : g.moveTo(tx(p.x), tx(p.z))));
  g.stroke();
  g.restore();
}
