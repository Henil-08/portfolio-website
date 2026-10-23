// Trees are static. Collider suggestion: trunk cylinder r=0.25 h=2 at the origin
// (palm: r=0.22, leaning toward +X by ~0.6 m at the top).
// round/oak: ~3.5 x 5 x 3.5   cherry: ~4 x 4.5 x 3.5 (leans to -X)   pine (birch): ~2.6 x 5 x 2.6
// palm: ~4 x 4.8 x 4   Bush: ~1.9 x 1.4 x 1.9   Rock: ~1.2 x 0.7 x 1.0
// Style: Bruno Simon's folio-2025 trees (MIT, see public/bruno/LICENSE.md): his
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
import { withWind } from "../../alive/sway";
import { registerTree } from "../../foliage/registry";
import type { SpeciesId } from "../../foliage/species";

type TreeVariant = "round" | "pine" | "palm" | "oak" | "cherry";
type TreeProps = GroupProps & { variant?: TreeVariant; seed?: number };

const PALM_SWAY = { amount: 0.05, flutter: 0.05 };

function canopyGeo() {
  return geo("tree-canopy", () => new THREE.SphereGeometry(1, 40, 28));
}

/** An empty group whose world transform feeds the shared foliage + trunk instances. */
function FoliageTree({ species, seed, ...props }: GroupProps & { species: SpeciesId; seed: number }) {
  const ref = useRef<THREE.Group>(null);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    return registerTree(scene, g, species, seed);
  }, [scene, species, seed]);
  return <group ref={ref} {...props} />;
}

function frondGeo() {
  return geo("palm-frond-v2", () => {
    // a tapered leaf blade drooping away from the trunk top along +X, with a centre crease
    const segs = 14;
    const pos: number[] = [];
    const idx: number[] = [];
    const L = 1.9;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = t * L;
      const y = 0.35 * t - 0.95 * t * t;
      const w = Math.sin(Math.PI * Math.pow(t, 0.7)) * 0.3 + 0.02;
      pos.push(x, y, -w, x, y + 0.06 * (1 - t), 0, x, y, w);
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 3;
      const b = a + 3;
      idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
}

function palmTrunkGeo() {
  return geo("palm-trunk-v2", () => {
    // smooth curved tube, tapering, leaning toward +X
    const pts = Array.from({ length: 8 }, (_, i) => {
      const t = i / 7;
      return new THREE.Vector3(0.9 * t * t, t * 3.9, 0);
    });
    const curve = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.TubeGeometry(curve, 24, 1, 14, false);
    // taper: radius 0.2 at the base -> 0.12 at the top
    const p = g.getAttribute("position");
    const c = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const t = Math.min(1, Math.max(0, y / 3.9));
      const along = curve.getPoint(t, c);
      const r = 0.2 - t * 0.08;
      p.setXYZ(i, along.x + (p.getX(i) - along.x) * r, y, p.getZ(i) * r);
    }
    g.computeVertexNormals();
    return g;
  });
}

function PalmTree() {
  const top: [number, number, number] = [0.9, 3.95, 0];
  return (
    <>
      <mesh geometry={palmTrunkGeo()} material={withWind(mat(C.wood, { r: 0.6 }), { ...PALM_SWAY, flutter: 0 })} castShadow receiveShadow />
      <group position={top}>
        <mesh geometry={canopyGeo()} scale={0.16} material={withWind(mat(C.woodDark, { r: 0.5 }), { ...PALM_SWAY, flutter: 0 })} castShadow />
        {Array.from({ length: 9 }, (_, i) => (
          <mesh
            key={i}
            geometry={frondGeo()}
            rotation={[0, (i / 9) * Math.PI * 2 + 0.3, (i % 2) * 0.22 - 0.05]}
            scale={i % 2 ? 0.92 : 1.05}
            material={withWind(mat(i % 3 ? C.leafPalm : C.leafDark, { r: 0.55, side: THREE.DoubleSide }), PALM_SWAY)}
            castShadow
          />
        ))}
      </group>
    </>
  );
}

/** "round" is mostly oak with the odd dusty-pink cherry, picked by seed. */
function speciesFor(variant: TreeVariant, seed: number): SpeciesId {
  if (variant === "pine") return "pine";
  if (variant === "cherry") return "cherry";
  if (variant === "oak") return "oak";
  return Math.abs(Math.round(seed)) % 8 === 3 ? "cherry" : "oak";
}

/** Bruno-style tree: oak / cherry (round), conifer stack (pine), or the beach palm. */
export function Tree({ variant = "round", seed = 1, ...props }: TreeProps) {
  if (variant === "palm")
    return (
      <group {...props}>
        <PalmTree />
      </group>
    );
  return <FoliageTree species={speciesFor(variant, seed)} seed={seed} {...props} />;
}

/** Bruno's bush: one round leaf clump. */
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
