// Static. The pit wall stand: the approved four booths (kit/builtTrackside.tsx, concept
// pitwall), one per vehicle, each with its ink canopy, console, seat and number plate 1-4,
// without the kit's own wall (PitWallRun.tsx runs the wall and fence along the pit straight).
// ~8.4 x 2.3 x 1.8 m at the world's scale. Seats and screens face +Z (the track, over the wall);
// the consoles' backs are at local z = +0.45, against the wall.
// Collider: one cuboid 8.8 x 1.2 x 1.4 centered at (0, 0.6, -0.25) covers consoles and pillars.
"use client";

import { Built } from "../../kit/builtShared";
import { PITWALL, boothPlateAt, numberPlate, pitWallParts } from "../../kit/builtTrackside";
import type { GroupProps } from "./shared";
import { WORLD_SCALE } from "../../scale";

/** The concept's 2.9 m booths at the world's scale (../../scale.ts). */
export const PIT_WALL_SCALE = WORLD_SCALE;
const S = PIT_WALL_SCALE;
// the kit's consoles start at z = -1.3 (toward its wall); turned to face +Z, that lands at +0.45
const OZ = 0.45 - 1.3 * S;

export function PitWall(props: GroupProps) {
  return (
    <group {...props}>
      <group position={[0, 0, OZ]} rotation={[0, Math.PI, 0]} scale={S}>
        <Built parts={pitWallParts(false)} />
        {Array.from({ length: PITWALL.booths }, (_, i) => (
          <mesh key={i} position={boothPlateAt(i)} material={numberPlate(String(i + 1))}>
            <planeGeometry args={[0.32, 0.32]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
