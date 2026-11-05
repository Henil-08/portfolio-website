// Trees are static. Collider suggestion: trunk cylinder r=0.25 h=2 at the origin.
// At scale 1, in the world (foliage/species.ts): round ~2.8 x 4.3 x 2.8, cypress ~1.4 x 5 x 1.4,
// Bush ~1.8 x 0.83 x 1.5 (tray), Rock ~0.8 x 0.47 x 0.67.
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
import { WORLD_SCALE } from "../../scale";

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

/** A chamfered concrete boulder from the rocks concept (components/world/kit/nature.ts): a real 1.2 x 0.7 x 1 m stone at the world's scale. */
export function Rock({ seed = 1, ...props }: GroupProps & { seed?: number }) {
  return (
    <group {...props}>
      <mesh geometry={boulderGeometry(Math.round(seed) % 4, 1.2 * WORLD_SCALE, 0.7 * WORLD_SCALE, 1.0 * WORLD_SCALE, true)} material={kitMat("concrete")} position={[0, -0.03, 0]} castShadow receiveShadow />
    </group>
  );
}
