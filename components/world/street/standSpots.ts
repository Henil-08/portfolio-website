// Where the extra grandstands go. Kept separate so the skyline, lamps and
// stands can all avoid each other without import cycles.
import { GANTRY, N_FRAMES, barrierOffset, farSign, farSpot, frameAt, inSectorScene, nearPlace, nearTree, type Spot } from "./common";
import { nearPromenade } from "../waterfront/layout";
import { TRACK_WIDTH, inLand, nearestT } from "../layout";

/** `open`: the back faces the camera, so it has no tall back wall. */
export type StandSpot = { x: number; z: number; yaw: number; raise: number; label: string; open: boolean };

const placed: { x: number; z: number }[] = [];

/** The stand's footprint (11 x 5 m, local +Z toward the road) stays off every bit of track. */
function clearOfRoad(x: number, z: number, yaw: number) {
  const c = Math.cos(yaw);
  const sn = Math.sin(yaw);
  for (const lx of [-5.4, -2.7, 0, 2.7, 5.4])
    for (const lz of [-2.7, 0, 2.1])
      if (nearestT(x + lx * c + lz * sn, z - lx * sn + lz * c).dist < TRACK_WIDTH / 2 + 1) return false;
  return true;
}

/** A spot `extra` m past the barrier line on one side of the road, local +Z toward the road. */
function sideSpot(u: number, near: boolean, extra: number): Spot {
  if (!near) return farSpot(u, extra);
  const f = frameAt(u);
  const i = Math.floor((((u % 1) + 1) % 1) * N_FRAMES) % N_FRAMES;
  const sd = -farSign(f) as 1 | -1;
  const q = f.p.clone().addScaledVector(f.n, sd * (Math.abs(barrierOffset(i, sd)) + extra));
  return { x: q.x, z: q.z, yaw: Math.atan2(-sd * f.n.x, -sd * f.n.z), u };
}

/** Footprint corners (local, m) of a stand. */
const FOOT: [number, number][] = [-5.4, 0, 5.4].flatMap((lx) => [-2.7, 2.1].map((lz) => [lx, lz] as [number, number]));

/**
 * Nearest clear spot to `u0` (no trees, scenes or places under the stand). Far-side stands
 * face the camera; near-side ones (the camera side) are set further back so the roof never
 * comes between the camera and the car, and show the camera their open back.
 */
function pick(u0: number, label: string, near = false): StandSpot | null {
  for (let k = 0; k < 40; k++) {
    const du = (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 0.0015;
    const s = sideSpot(u0 + du, near, near ? 5 : 3.7);
    const c = Math.cos(s.yaw);
    const sn = Math.sin(s.yaw);
    const ok =
      !nearTree(s.x, s.z, 6.2) &&
      !inSectorScene(s.x, s.z, 6) &&
      !nearPlace(s.x, s.z, 4) &&
      inLand(s.x, s.z, 7) && // a stand is ~11 m wide: keep it out of the river and the harbour
      clearOfRoad(s.x, s.z, s.yaw) &&
      !FOOT.some(([lx, lz]) => nearPromenade(s.x + lx * c + lz * sn, s.z - lx * sn + lz * c, 0)) &&
      Math.hypot(s.x - GANTRY.p.x, s.z - GANTRY.p.z) > 9 &&
      !placed.some((p) => Math.hypot(p.x - s.x, p.z - s.z) < 12.5);
    if (ok) {
      placed.push(s);
      return { x: s.x, z: s.z, yaw: s.yaw, raise: 0, label, open: near };
    }
  }
  return null;
}

export const STAND_SPOTS: StandSpot[] = [
  // east esses, the tunnel straight and the west side, on the far side of the barrier
  pick(0.27, "EAST ESSES"),
  pick(0.46, "TUNNEL STRAIGHT"),
  pick(0.86, "WEST TERRACE"),
  // the main straight (the pit lane fills its far side) and round the outside of T1
  ...[0.02, 0.035, 0.05, 0.075, 0.09, 0.105, 0.12, 0.135, 0.15].map((u) => pick(u, "", true)),
  ...[0.17, 0.185, 0.2].map((u) => pick(u, "", true)),
].filter((s): s is StandSpot => s !== null);
