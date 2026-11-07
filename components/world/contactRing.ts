// The contact area's half ring of monuments, as plain data for everything that must keep off it
// (the park's slabs, lanterns and flowers, the tree scatter, the grass). The monuments themselves
// are placed by social/index.tsx (SOCIAL, MONUMENTS): one per link on a half ring of radius 6.2,
// 3 m behind the contact hotspot, bowing away from the camera. Keep the two in step.
import { zoneById } from "./layout";

/** The ring's centre and radius, and how many monuments stand on it (social/index.tsx LINKS). */
export const RING = { center: [zoneById.contact.pos[0], zoneById.contact.pos[1] - 3] as [number, number], radius: 6.2, count: 7 };
/** The widest plinth's corner, from the monument's centre (m): Hugging Face's 0.64 half footprint at the world's scale. */
export const PLINTH_R = 0.95;

/** Each monument's centre (x, z). */
export const MONUMENT_SPOTS: [number, number][] = Array.from({ length: RING.count }, (_, i) => {
  const a = (i * Math.PI) / (RING.count - 1);
  return [RING.center[0] + Math.cos(a) * RING.radius, RING.center[1] - Math.sin(a) * RING.radius];
});

/** True if something `r` m round at (x, z) would touch a monument's plinth. */
export const nearMonument = (x: number, z: number, r = 0) => MONUMENT_SPOTS.some(([mx, mz]) => Math.hypot(x - mx, z - mz) < PLINTH_R + r);

/** True within the ring (out to its plinths' outer edge, plus `r`). */
export const inRing = (x: number, z: number, r = 0) => Math.hypot(x - RING.center[0], z - RING.center[1]) < RING.radius + PLINTH_R + r;
