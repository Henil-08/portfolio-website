// Trees are static. Collider suggestion: trunk cylinder r=0.25 h=2 at the origin.
// round: ~3.4 x 5.1 x 3.4   cypress: ~1.8 x 6 x 1.8   Bush: ~2 x 1.1 x 1.6   Rock: ~1.2 x 0.7 x 1.0
// Style: W10 (docs/BRAND.md "World"): faceted cypresses and round faceted crowns on
// ink trunks, in the muted leaf colours. They are not meshes here: they register with
// components/world/foliage/registry.ts, which draws every tree of a kind in one instanced call.
"use client";

import { useLayoutEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { GroupProps } from "./shared";
import { boulderGeometry } from "../../kit/nature";
import { kitMat } from "../../kit/shared";
import { registerTree, type TreeKind } from "../../foliage/registry";

/** An empty group whose world transform feeds the shared tree instances. */
function FoliageTree({ kind, seed, ...props }: GroupProps & { kind: TreeKind; seed: number }) {
  const ref = useRef<THREE.Group>(null);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    return registerTree(scene, g, kind, seed);
  }, [scene, kind, seed]);
  return <group ref={ref} {...props} />;
}

/** tree: a round faceted crown or a tall faceted cypress. */
export function Tree({ variant = "round", seed = 1, ...props }: GroupProps & { variant?: "round" | "cypress"; seed?: number }) {
  return <FoliageTree kind={variant} seed={seed} {...props} />;
}

/** A low faceted bush. */
export function Bush({ seed = 1, ...props }: GroupProps & { seed?: number }) {
  return <FoliageTree kind="bush" seed={seed} {...props} />;
}

/** A chamfered concrete boulder from the rocks concept (components/world/kit/nature.ts). */
export function Rock({ seed = 1, ...props }: GroupProps & { seed?: number }) {
  return (
    <group {...props}>
      <mesh geometry={boulderGeometry(Math.round(seed) % 4, 1.2, 0.7, 1.0, true)} material={kitMat("concrete")} position={[0, -0.04, 0]} castShadow receiveShadow />
    </group>
  );
}
