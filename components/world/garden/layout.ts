// The garden in the infield: where its paths, beds, pond, hedges, benches and
// lamps sit. Pure data, shared by the renderer (./index.tsx), the grass mask
// (Grass.tsx) and anything that scatters props and must keep off the paths.
//
// The infield is flat from z ~ -6 to the pit lane; south of that the land rises
// onto the embankment of the descending leg, so the garden stays north of it.
// The timeline terrace (TIMELINE) is the garden's east-west spine; the paths
// run around it and out to each place.
import * as THREE from "three";
import { nearCrossing, nearestT, TIMELINE, TRACK_WIDTH } from "../layout";

export type Path = { pts: [number, number][]; w: number };

export const PATHS: Path[] = [
  // Promenade behind the garages, from the pond to the east corner.
  { pts: [[-42, 14.5], [-30, 15], [-14, 15.2], [2, 15.2], [16, 15], [27, 14.2]], w: 2.6 },
  // West: past the pond, down to the cricket ground.
  { pts: [[-42, 14.5], [-41, 6], [-38.5, -2.5]], w: 2 },
  // From the terrace's west end out to the west path.
  { pts: [[TIMELINE.pos[0] - TIMELINE.hx - 0.3, 3], [-31, 3.4], [-40.8, 4]], w: 2 },
  // From the terrace's east end, along the tyre wall, out to the east path.
  { pts: [[TIMELINE.pos[0] + TIMELINE.hx + 0.3, 3], [19, 3.4], [31, 3]], w: 2 },
  // East: from the promenade, down past the letters and out to the park.
  { pts: [[27, 14.2], [31, 6], [31.2, -2], [25.5, -10]], w: 2 },
  // The way to the circuit (owner: a sandy road, no paving): from the promenade's
  // east end, past the end of the garages, to the pit lane. The car starts on the
  // terrace path in front of the name, which leads here.
  { pts: [[27, 14.2], [30, 20], [32.5, 26], [35, 31.2]], w: 2.6 },
  // From the east path, between HENIL and GAJJAR (the word gap is at x ~18), down to the park.
  { pts: [[18, 3.2], [18, -3.2], [17.2, -10.5]], w: 1.2 },
];

/** Dense polyline of a path (about every 0.5 m), smoothed through its points. */
export function pathSamples(p: Path, step = 0.5) {
  const curve = new THREE.CatmullRomCurve3(p.pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal");
  const n = Math.max(2, Math.ceil(curve.getLength() / step));
  return curve.getSpacedPoints(n).map((v) => [v.x, v.z] as [number, number]);
}

const SAMPLED = PATHS.map((p) => pathSamples(p, 0.5));

/** Distance (plan) from a point to the nearest path's centreline, and that path's half width. */
export function pathDist(x: number, z: number, skip = -1) {
  let best = Infinity;
  let half = 0;
  SAMPLED.forEach((pts, i) => {
    if (i === skip) return;
    for (const [px, pz] of pts) {
      const d = Math.hypot(px - x, pz - z);
      if (d < best) {
        best = d;
        half = PATHS[i].w / 2;
      }
    }
  });
  return { d: best, half };
}

/** Flower beds: rounded ellipses of soil with a stone edge. */
export type Bed = { x: number; z: number; rx: number; rz: number; yaw: number };
export const BEDS: Bed[] = [
  { x: -34, z: 8.5, rx: 3, rz: 1.8, yaw: 0.2 },
  { x: 13, z: 9, rx: 1.6, rz: 2.6, yaw: 0 },
  { x: 34, z: 10, rx: 2.2, rz: 1.5, yaw: -0.6 },
  { x: 23.5, z: -7.6, rx: 2.4, rz: 1.1, yaw: 0.1 },
];

/** Bed-local coordinates of a world point (x along rx, z along rz). */
export function bedLocal(b: Bed, x: number, z: number) {
  const dx = x - b.x;
  const dz = z - b.z;
  const c = Math.cos(b.yaw);
  const sn = Math.sin(b.yaw);
  return [dx * c - dz * sn, dx * sn + dz * c] as const;
}

/** A small round pond with a stone rim, west of the podium. */
export const POND = { x: -64, z: 6, r: 3.4 }; // v5: inside the bottom-left chicane

/** Hedge runs: [x1, z1, x2, z2]. Filled with rounded blocks about 1.8 m long. */
export const HEDGES: [number, number, number, number][] = [
  // Framing the pond's back.
  [-51, 16.5, -51, 25],
  // Along the east path's outer side, between it and the run-off.
  [34, 8, 34, 0],
  // Behind the letters.
  [15.5, 5.6, 25, 5.6],
  // Low line along the cricket ground's north side.
  [-52, -1.5, -42, -1.5],
];
export const HEDGE = { h: 0.9, d: 0.9, block: 1.8 };

/** Benches: position and yaw (seat faces local +Z). */
export const BENCHES: { x: number; z: number; yaw: number }[] = [
  { x: -41.2, z: 21, yaw: -Math.PI / 2 },
  { x: -36, z: 13, yaw: Math.PI },
  { x: 6, z: 13, yaw: Math.PI },
  { x: 33, z: -4, yaw: -Math.PI / 2 },
  { x: 7.2, z: -9.6, yaw: Math.PI },
];

/** Garden lamps along the paths, every ~13 m, alternating sides. */
export const LAMPS_GARDEN: [number, number][] = (() => {
  const out: [number, number][] = [];
  PATHS.forEach((p, i) => {
    const pts = pathSamples(p, 0.5);
    let side = i % 2 ? 1 : -1;
    for (let k = 10; k < pts.length - 6; k += 26) {
      const [x0, z0] = pts[k - 1];
      const [x1, z1] = pts[k + 1];
      const len = Math.hypot(x1 - x0, z1 - z0) || 1;
      const nx = -(z1 - z0) / len;
      const nz = (x1 - x0) / len;
      const off = p.w / 2 + 0.7;
      const x = pts[k][0] + nx * off * side;
      const z = pts[k][1] + nz * off * side;
      side = -side;
      if (pathDist(x, z).d < 1.6) continue;
      if (out.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < 7)) continue;
      out.push([x, z]);
    }
  });
  return out.filter(([x, z]) => clearOfRoad(x, z, 3));
})();

/** True if a point is a safe distance off the circuit and away from the bridge. */
export function clearOfRoad(x: number, z: number, pad = 2) {
  return nearestT(x, z).dist > TRACK_WIDTH / 2 + pad && !nearCrossing(x, z, 20);
}

/** True if something at (x, z) with radius `pad` would sit on a garden feature. */
export function nearGarden(x: number, z: number, pad = 0) {
  const p = pathDist(x, z);
  if (p.d < p.half + pad) return true;
  if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.8 + pad) return true;
  for (const b of BEDS) {
    const [u, v] = bedLocal(b, x, z);
    if (Math.hypot(u / (b.rx + pad + 0.3), v / (b.rz + pad + 0.3)) < 1) return true;
  }
  return false;
}

/**
 * Paint the garden's ground features (paths, pond, beds) onto a 2D canvas in
 * world space, e.g. black on the grass mask so no blades grow there.
 * `tx` maps a world coordinate to canvas pixels; `s` is pixels per metre.
 */
export function paintGarden(g: CanvasRenderingContext2D, tx: (v: number) => number, s: number) {
  g.save();
  g.lineJoin = g.lineCap = "round";
  for (const p of PATHS) {
    g.lineWidth = (p.w + 0.5) * s;
    g.beginPath();
    pathSamples(p, 1).forEach(([x, z], i) => (i ? g.lineTo(tx(x), tx(z)) : g.moveTo(tx(x), tx(z))));
    g.stroke();
  }
  g.beginPath();
  g.arc(tx(POND.x), tx(POND.z), (POND.r + 0.9) * s, 0, Math.PI * 2);
  g.fill();
  for (const b of BEDS) {
    g.beginPath();
    g.ellipse(tx(b.x), tx(b.z), (b.rx + 0.3) * s, (b.rz + 0.3) * s, -b.yaw, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}
