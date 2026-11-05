// Every placed structure's footprint, reserved before anything grows. The island's tree scatter
// (./trees.ts, drawn by Places.tsx Nature) and the groves (../Groves.tsx) keep off these, so a
// grandstand, floodlight, marshal post, board, TecPro wall, flag, the gantry or a building never
// loses its spot to a tree. Structures themselves never look at trees. Pure data.
import { GANTRY } from "./common";
import { BOARDS, FLAG_SPOTS, FLOODS, MARSHALS, TYRE_WALLS } from "./layoutStreet";
import { STAND_SPOTS } from "./standSpots";
import { BUILDINGS } from "./town";

/** x, z and the radius a structure needs clear round its centre (m). */
export type Footprint = [x: number, z: number, r: number];

/**
 * A stand with its fascia and catch fence, a floodlight's foot and ladder, a marshal post with
 * its pad, a 4.2 m board, a TecPro block, a flagpole, the gantry's two feet, and a building with
 * its pavement and forecourt (the street furniture stands there: ../districts/townStreets.ts).
 */
export const STRUCTURES: Footprint[] = [
  ...STAND_SPOTS.map((s): Footprint => [s.x, s.z, 6.2]),
  ...FLOODS.map((f): Footprint => [f.x, f.z, 1.2]),
  ...MARSHALS.map((m): Footprint => [m.x, m.z, 2]),
  ...BOARDS.map((b): Footprint => [b.x, b.z, 2.2]),
  ...TYRE_WALLS.map((w): Footprint => [w.x, w.z, 0.7]),
  ...FLAG_SPOTS.map((f): Footprint => [f.x, f.z, 1]),
  [GANTRY.p.x, GANTRY.p.z, 7],
];
export const BUILDING_FOOTPRINTS: Footprint[] = BUILDINGS.map((b): Footprint => [b.x, b.z, Math.hypot(b.w, b.d) / 2 + 3.5]);

/** True if something `r` m round at (x, z) would stand on a structure (or, with `buildings`, a building or its street). */
export function onStructure(x: number, z: number, r = 0, buildings = true) {
  const hit = ([sx, sz, sr]: Footprint) => Math.hypot(sx - x, sz - z) < sr + r;
  return STRUCTURES.some(hit) || (buildings && BUILDING_FOOTPRINTS.some(hit));
}
