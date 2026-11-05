"use client";

// The town around the circuit: the three approved blocks (../kit/builtTown.tsx) where
// town.ts places them, each fitted to its footprint, one instanced draw per block and
// material. A concrete plinth under each reaches down a slope. Windows glow at night;
// everything fades round the car (see-through).
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { dayNight } from "../daynight";
import { patchSeeThrough, seeThrough } from "../seeThrough";
import { B, bm, type MatKey } from "../kit/builtShared";
import { BuiltInstances, placeMatrix } from "../kit/builtInstances";
import { townLowParts, townMidParts, towerParts } from "../kit/builtTown";
import { distToTrack } from "./common";
import { BUILDINGS, footing, type TownKind } from "./town";

export { BUILDINGS };

const PARTS: Record<TownKind, () => ReturnType<typeof townLowParts>> = { low: townLowParts, mid: townMidParts, tower: towerParts };

const FOOT = BUILDINGS.map((b) => footing(b));
const MATRICES: Record<TownKind, THREE.Matrix4[]> = { low: [], mid: [], tower: [] };
const PLINTHS: THREE.Matrix4[] = [];
BUILDINGS.forEach((b, i) => {
  const { floor, low } = FOOT[i];
  MATRICES[b.kind].push(placeMatrix(b.x, floor, b.z, b.yaw + (b.front < 0 ? Math.PI : 0), b.s));
  const h = floor - low + 0.4;
  PLINTHS.push(placeMatrix(b.x, low - 0.3 + h / 2, b.z, b.yaw, [b.w + 0.3, h, b.d + 0.3]));
});

/** The town's glass: the shared colour, lit from inside at night. */
const glass = patchSeeThrough(new THREE.MeshStandardMaterial({ color: "#3d4142", roughness: 0.25, metalness: 0.1, emissive: B.lamp, emissiveIntensity: 0 }));
/** The tower's paler glass, lit the same way. */
const glassPale = patchSeeThrough(new THREE.MeshStandardMaterial({ color: "#7a8183", roughness: 0.25, metalness: 0.1, emissive: B.lamp, emissiveIntensity: 0 }));
const material = (k: MatKey) => (k === "glass" ? glass : k === "glassPale" ? glassPale : seeThrough(bm(k)));
const plinth = { concreteDark: new THREE.BoxGeometry(1, 1, 1) };

export function Skyline() {
  useFrame(() => {
    glass.emissiveIntensity = dayNight.night * 0.55;
    glassPale.emissiveIntensity = dayNight.night * 0.45;
  });
  return (
    <>
      {(Object.keys(MATRICES) as TownKind[]).map((k) => (
        <BuiltInstances key={k} parts={PARTS[k]()} matrices={MATRICES[k]} material={material} />
      ))}
      <BuiltInstances parts={plinth} matrices={PLINTHS} material={material} />
      <RigidBody type="fixed" colliders={false}>
        {BUILDINGS.filter((b) => distToTrack(b.x, b.z) < 40).map((b, i) => {
          // from the foot of the plinth to 4 m above the floor
          const { floor, low } = footing(b);
          const h = floor + 4 - (low - 0.3);
          return <CuboidCollider key={i} args={[b.w / 2 + 0.18, h / 2, b.d / 2 + 0.18]} position={[b.x, low - 0.3 + h / 2, b.z]} rotation={[0, b.yaw, 0]} />;
        })}
      </RigidBody>
    </>
  );
}
