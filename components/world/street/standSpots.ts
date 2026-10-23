// Where the extra grandstands go. Kept separate so the skyline, lamps and
// stands can all avoid each other without import cycles.
import { farSpot, inSectorScene, nearPlace, nearTree } from "./common";

export type StandSpot = { x: number; z: number; yaw: number; raise: number; label: string };

const placed: { x: number; z: number }[] = [];

/** Nearest clear far-side spot to `u0` (no trees, scenes or places under the stand). */
function pick(u0: number, label: string): StandSpot | null {
  for (let k = 0; k < 40; k++) {
    const du = (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 0.0015;
    const s = farSpot(u0 + du, 3.7);
    const ok =
      !nearTree(s.x, s.z, 6.2) &&
      !inSectorScene(s.x, s.z, 6) &&
      !nearPlace(s.x, s.z, 4) &&
      !placed.some((p) => Math.hypot(p.x - s.x, p.z - s.z) < 12.5);
    if (ok) {
      placed.push(s);
      return { x: s.x, z: s.z, yaw: s.yaw, raise: 0, label };
    }
  }
  return null;
}

export const STAND_SPOTS: StandSpot[] = [
  // main straight: raised on a podium behind the garages, looking over the pit roofs
  { x: -10.2, z: 14.4, yaw: 0, raise: 3.2, label: "PIT STRAIGHT · A" },
  { x: 2.2, z: 14.4, yaw: 0, raise: 3.2, label: "PIT STRAIGHT · B" },
  // back straight and the west side, on the far side of the barrier
  pick(0.655, "BACK STRAIGHT"),
  pick(0.62, "BACK STRAIGHT"),
  pick(0.823, "WEST TERRACE"),
].filter((s): s is StandSpot => s !== null);
