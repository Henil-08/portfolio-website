// Where each journey sits on the island (world x, z), as plain numbers: the grass mask
// (Grass.tsx), the garden paths' ends (garden/layout.ts) and the review page read these without
// loading the journeys themselves.
import { JOURNEY, type JourneyId } from "./choice";
import { ROAD, roadSamples } from "./bRoad";

export type Box = { minX: number; maxX: number; minZ: number; maxZ: number };

/** A, the pit straight: lane x -17 to 4.2 on z = 3, the pit wall and its boards on the north side. */
export const FOOT_A: Box = { minX: -17.4, maxX: 4.6, minZ: -0.8, maxZ: 5.4 };
/** B, the hairpin road: the leg along z = 3.2, the hairpin to the east, the back leg at z = -6. */
export const FOOT_B: Box = { minX: -17.3, maxX: 2.4, minZ: -9.2, maxZ: 6.1 };
/** C, the datasheet slab. */
export const FOOT_C: Box = { minX: -14.0, maxX: 1.8, minZ: -4.6, maxZ: 10.6 };

const FOOT: Record<JourneyId, Box | null> = { current: null, a: FOOT_A, b: FOOT_B, c: FOOT_C };

/** The drawn journey's bounds, or null for the current terrace (Grass.tsx masks that one itself). */
export const JOURNEY_FOOT = FOOT[JOURNEY];

/** Paints the drawn journey's ground into a mask (white = covered): B along its road, A and C their box. */
export function paintJourney(g: CanvasRenderingContext2D, tx: (v: number) => number, s: number) {
  const f = JOURNEY_FOOT;
  if (!f) return;
  if (JOURNEY !== "b") {
    g.fillRect(tx(f.minX), tx(f.minZ), (f.maxX - f.minX) * s, (f.maxZ - f.minZ) * s);
    return;
  }
  g.save();
  g.lineWidth = (ROAD.half + ROAD.verge + 0.4) * 2 * s;
  g.lineCap = "butt";
  g.lineJoin = "round";
  g.beginPath();
  roadSamples(0.5).forEach((p, i) => (i ? g.lineTo(tx(p.x), tx(p.z)) : g.moveTo(tx(p.x), tx(p.z))));
  g.stroke();
  g.restore();
}
