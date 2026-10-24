// Trees are static. Collider suggestion: trunk cylinder r=0.25 h=2 at the origin
// (palm: r=0.22, leaning toward +X by ~0.6 m at the top).
// round/oak: ~3.5 x 5 x 3.5   cherry: ~4 x 4.5 x 3.5 (leans to -X)   pine (birch): ~2.6 x 5 x 2.6
// palm: ~4 x 4.8 x 4   Bush: ~1.9 x 1.4 x 1.9   Rock: ~1.2 x 0.7 x 1.0
// Style: folio-2025 trees (MIT, see public/vendor/LICENSE.md): the original's
// low-poly trunk + branch models, crowns of SDF leaf-card clumps with spherical
// normals and wind sway, in our sage two-tone. Oak, cherry, pine and bush are not
// meshes here: they register with components/world/foliage/registry.ts, which
// draws every clump in one instanced call and every trunk model in one more.
"use client";

import { useLayoutEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { C } from "../../palette";
import { geo, mat, rng, type GroupProps } from "./shared";
import { registerTree, type TreeKind } from "../../foliage/registry";
import type { SpeciesId } from "../../foliage/species";

type TreeVariant = "round" | "pine" | "palm" | "oak" | "cherry";
type TreeProps = GroupProps & { variant?: TreeVariant; seed?: number };


/** An empty group whose world transform feeds the shared foliage + trunk instances. */
function FoliageTree({ species, seed, ...props }: GroupProps & { species: TreeKind; seed: number }) {
  const ref = useRef<THREE.Group>(null);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    return registerTree(scene, g, species, seed);
  }, [scene, species, seed]);
  return <group ref={ref} {...props} />;
}

/** "round" is mostly oak with the odd dusty-pink cherry, picked by seed. */
function speciesFor(variant: TreeVariant, seed: number): SpeciesId {
  if (variant === "pine") return "pine";
  if (variant === "cherry") return "cherry";
  if (variant === "oak") return "oak";
  return Math.abs(Math.round(seed)) % 8 === 3 ? "cherry" : "oak";
}

/** tree: oak / cherry (round), conifer stack (pine), or the beach palm. */
export function Tree({ variant = "round", seed = 1, ...props }: TreeProps) {
  if (variant === "palm") return <FoliageTree species="palm" seed={seed} {...props} />;
  return <FoliageTree species={speciesFor(variant, seed)} seed={seed} {...props} />;
}

/** The original bush: one round leaf clump. */
export function Bush({ seed = 1, ...props }: GroupProps & { seed?: number }) {
  return <FoliageTree species="bush" seed={seed} {...props} />;
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
