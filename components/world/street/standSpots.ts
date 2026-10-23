// Where the extra grandstands go. Kept separate so the skyline, lamps and
// stands can all avoid each other without import cycles.
import { farSpot, inSectorScene, nearPlace, nearTree } from "./common";
import { TRACK_WIDTH, inLand, nearestT } from "../layout";

export type StandSpot = { x: number; z: number; yaw: number; raise: number; label: string };

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

/** Nearest clear far-side spot to `u0` (no trees, scenes or places under the stand). */
function pick(u0: number, label: string): StandSpot | null {
  for (let k = 0; k < 40; k++) {
    const du = (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 0.0015;
    const s = farSpot(u0 + du, 3.7);
    const ok =
      !nearTree(s.x, s.z, 6.2) &&
      !inSectorScene(s.x, s.z, 6) &&
      !nearPlace(s.x, s.z, 4) &&
      inLand(s.x, s.z, 7) && // a stand is ~11 m wide: keep it out of the river and the harbour
      clearOfRoad(s.x, s.z, s.yaw) &&
      !placed.some((p) => Math.hypot(p.x - s.x, p.z - s.z) < 12.5);
    if (ok) {
      placed.push(s);
      return { x: s.x, z: s.z, yaw: s.yaw, raise: 0, label };
    }
  }
  return null;
}

export const STAND_SPOTS: StandSpot[] = [
  // east esses, the tunnel straight and the west side, on the far side of the barrier
  pick(0.27, "EAST ESSES"),
  pick(0.46, "TUNNEL STRAIGHT"),
  pick(0.86, "WEST TERRACE"),
].filter((s): s is StandSpot => s !== null);
