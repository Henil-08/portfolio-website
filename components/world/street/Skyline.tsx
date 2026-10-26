"use client";

// The town around the circuit: W09 concrete blocks (../buildings/townBlocks.ts) where
// town.ts places them, merged into two draw calls (bodies with the window shader, trims).
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { dayNight } from "../daynight";
import { mat } from "../models/props/shared";
import { facadeMaterial, facadeUniforms, townParts } from "../buildings/townBlocks";
import { distToTrack } from "./common";
import { BUILDINGS, footing } from "./town";

export { BUILDINGS };

const facadeMat = facadeMaterial();

const PARTS = townParts(
  BUILDINGS.map((b) => {
    const { floor, low } = footing(b);
    return { ...b, floor, low };
  }),
);

export function Skyline() {
  useFrame(() => {
    facadeUniforms.uNight.value = dayNight.night;
  });
  return (
    <>
      <mesh geometry={PARTS.bodies} material={facadeMat} castShadow receiveShadow frustumCulled={false} />
      <mesh geometry={PARTS.trims} material={mat("#ffffff", { r: 0.8, vc: true })} castShadow receiveShadow frustumCulled={false} />
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
