// Stump bounds: cylinder r=0.06 h=0.72 (origin at its foot)
// Bail bounds: capsule along X, length 0.26, r=0.03 (origin at its center)
// Wicket = 3 stumps at x = -0.15, 0, 0.15 plus 2 bails resting on top (center y = 0.75)
// CricketPitch: flat 2.6 x 20 strip at y=0.01 (no collider needed), stumps at z = +-PITCH_STUMPS_Z
"use client";

import { C } from "../../palette";
import { mat, unitBox, type GroupProps } from "./shared";
import { KitModel } from "../../kit/KitModel";
import { bailModel, stumpModel } from "../../kit/park";

export const STUMP_H = 0.72;
export const STUMP_R = 0.06;
export const STUMP_GAP = 0.15;
export const BAIL_LEN = 0.26;
export const PITCH_W = 2.6;
export const PITCH_L = 20;
export const PITCH_STUMPS_Z = 8.8;

/** A single stump: the kit stump (slender paper post, flared foot, chamfered tip, ink pin line), origin at its foot. */
export function Stump(props: GroupProps) {
  return <KitModel model={stumpModel(STUMP_H, 0.032)} {...props} />;
}

/** A bail, centred on its origin, lying along X: the kit's orange bail. */
export function Bail(props: GroupProps) {
  return <KitModel model={bailModel(STUMP_GAP + 0.04, 1.3)} {...props} />;
}

/** Visual helper: 3 stumps and 2 bails, facing +Z. */
export function Wicket(props: GroupProps) {
  return (
    <group {...props}>
      {[-1, 0, 1].map((i) => (
        <Stump key={i} position={[i * STUMP_GAP, 0, 0]} />
      ))}
      <Bail position={[-STUMP_GAP / 2, STUMP_H + 0.03, 0]} />
      <Bail position={[STUMP_GAP / 2, STUMP_H + 0.03, 0]} />
    </group>
  );
}

const LINE = 0.06;

/** Gravel pitch strip, 2.6 x 20 m, with paper crease lines at both ends. Long axis is Z. */
export function CricketPitch(props: GroupProps) {
  const lines: [number, number, number, number][] = []; // x, z, w, d
  for (const s of [-1, 1]) {
    const zb = s * PITCH_STUMPS_Z; // bowling crease
    const zp = s * (PITCH_STUMPS_Z - 1.22); // popping crease
    lines.push([0, zb, 2.64 * 0.85, LINE]);
    lines.push([0, zp, PITCH_W - 0.1, LINE]);
    for (const x of [-1.32, 1.32]) lines.push([x * 0.85, zb + s * 0.3, LINE, 2.44 * 0.85]);
  }
  return (
    <group {...props}>
      <mesh
        geometry={unitBox()}
        scale={[PITCH_W, 0.02, PITCH_L]}
        position={[0, 0.0, 0]}
        material={mat(C.sand, { r: 0.9 })}
        receiveShadow
      />
      {/* a slightly darker worn strip down the middle */}
      <mesh
        geometry={unitBox()}
        scale={[1.0, 0.02, PITCH_L - 4]}
        position={[0, 0.003, 0]}
        material={mat(C.rock, { r: 0.9 })}
        receiveShadow
      />
      {lines.map(([x, z, w, d], i) => (
        <mesh
          key={i}
          geometry={unitBox()}
          scale={[w, 0.02, d]}
          position={[x, 0.006, z]}
          material={mat(C.paper, { r: 0.6 })}
          receiveShadow
        />
      ))}
    </group>
  );
}
