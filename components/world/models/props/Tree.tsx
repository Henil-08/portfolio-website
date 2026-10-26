// Trees are static. Collider suggestion: trunk cylinder r=0.25 h=2 at the origin.
// round: ~3.4 x 5.1 x 3.4   cypress: ~1.8 x 6 x 1.8   Bush: ~2 x 1.1 x 1.6   Rock: ~1.2 x 0.7 x 1.0
// Style: W10 (docs/BRAND.md "World"): faceted cypresses and round faceted crowns on
// ink trunks, in the muted leaf colours. They are not meshes here: they register with
// components/world/foliage/registry.ts, which draws every tree of a kind in one instanced call.
"use client";

import { useLayoutEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { C } from "../../palette";
import { geo, mat, rng, type GroupProps } from "./shared";
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

function rockGeo(seed: number) {
  return geo(`pebble-${seed}`, () => {
    // smooth pebble: a squashed sphere with a couple of gentle, low-frequency dents
    const g = new THREE.SphereGeometry(0.6, 36, 24);
    const r = rng(seed + 11);
    const dents = Array.from({ length: 3 }, () => ({
      d: new THREE.Vector3(r() - 0.5, r() * 0.6, r() - 0.5).normalize(),
      k: 0.06 + r() * 0.06,
    }));
    const p = g.getAttribute("position");
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = v.clone().normalize();
      let f = 1;
      for (const dt of dents) f -= dt.k * Math.max(0, n.dot(dt.d)) ** 3;
      v.multiplyScalar(f);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.scale(1, 0.55 + r() * 0.15, 0.8 + r() * 0.1);
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.translate(0, -g.boundingBox!.min.y - 0.04, 0);
    return g;
  });
}

/** Smooth pebble-form rock in warm stone grey. */
export function Rock({ seed = 1, ...props }: GroupProps & { seed?: number }) {
  return (
    <group {...props}>
      <mesh geometry={rockGeo(Math.round(seed) % 4)} material={mat(C.rock, { r: 0.45 })} castShadow receiveShadow />
    </group>
  );
}
