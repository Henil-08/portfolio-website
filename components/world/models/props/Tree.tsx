// Trees are static. Collider suggestion: trunk cylinder r=0.25 h=2 at the origin
// (palm: r=0.22, leaning toward +X by ~0.6 m at the top).
// round: ~2.6 x 3.7 x 2.6   pine: ~2.3 x 4.4 x 2.3   palm: ~4 x 4.8 x 4
// Bush: ~1.4 x 0.85 x 1.1    Rock: ~1.2 x 0.7 x 1.0 (cuboid works, scale with the group)
// Style: architectural-model trees. Smooth ellipsoids or faceted cones in two muted greens,
// clean straight trunks, smooth pebble rocks.
"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { geo, mat, rng, type GroupProps } from "./shared";

type TreeProps = GroupProps & { variant?: "round" | "pine" | "palm"; seed?: number };

const leafMat = () => mat(C.leaf, { r: 0.55 });
const leafDarkMat = () => mat(C.leafDark, { r: 0.55 });
const facetMat = (dark: boolean) => mat(dark ? C.leafDark : C.leaf, { r: 0.6, flat: true });
const trunkMat = () => mat(C.woodDark, { r: 0.55 });

function trunkGeo() {
  return geo("tree-trunk-v2", () => {
    const g = new THREE.CylinderGeometry(0.09, 0.14, 1, 16);
    g.translate(0, 0.5, 0);
    return g;
  });
}

function canopyGeo() {
  return geo("tree-canopy", () => new THREE.SphereGeometry(1, 40, 28));
}

function RoundTree({ seed }: { seed: number }) {
  const v = useMemo(() => {
    const r = rng(seed);
    return { tall: 1.25 + r() * 0.2, w: 1.15 + r() * 0.15, dark: r() > 0.5, tilt: (r() - 0.5) * 0.08 };
  }, [seed]);
  // one smooth ellipsoid canopy (with a smaller second one on half the trees)
  const cy = 1.0 + v.tall;
  return (
    <>
      <mesh geometry={trunkGeo()} scale={[1, cy, 1]} material={trunkMat()} castShadow receiveShadow />
      <mesh geometry={canopyGeo()} position={[0, cy, 0]} rotation={[0, 0, v.tilt]} scale={[v.w, v.tall, v.w]} material={v.dark ? leafDarkMat() : leafMat()} castShadow receiveShadow />
    </>
  );
}

function pineGeo() {
  return geo("pine-v2", () => {
    // one tall faceted cone with a soft-cut base
    const g = new THREE.ConeGeometry(1.1, 3.4, 7, 1);
    g.translate(0, 1.7, 0);
    return g;
  });
}

function PineTree({ seed }: { seed: number }) {
  const v = useMemo(() => {
    const r = rng(seed + 3);
    return { s: 0.9 + r() * 0.2, dark: r() > 0.35, rot: r() * Math.PI };
  }, [seed]);
  return (
    <>
      <mesh geometry={trunkGeo()} scale={[0.9, 1.2, 0.9]} material={trunkMat()} castShadow receiveShadow />
      <mesh geometry={pineGeo()} position={[0, 0.85, 0]} rotation={[0, v.rot, 0]} scale={[v.s, 1, v.s]} material={facetMat(v.dark)} castShadow receiveShadow />
    </>
  );
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
      <mesh geometry={palmTrunkGeo()} material={mat(C.wood, { r: 0.6 })} castShadow receiveShadow />
      <group position={top}>
        <mesh geometry={canopyGeo()} scale={0.16} material={mat(C.woodDark, { r: 0.5 })} castShadow />
        {Array.from({ length: 9 }, (_, i) => (
          <mesh
            key={i}
            geometry={frondGeo()}
            rotation={[0, (i / 9) * Math.PI * 2 + 0.3, (i % 2) * 0.22 - 0.05]}
            scale={i % 2 ? 0.92 : 1.05}
            material={mat(i % 3 ? C.leafPalm : C.leafDark, { r: 0.55, side: THREE.DoubleSide })}
            castShadow
          />
        ))}
      </group>
    </>
  );
}

/** Stylised tree: smooth ellipsoid (round), faceted cone (pine) or (beach) palm. */
export function Tree({ variant = "round", seed = 1, ...props }: TreeProps) {
  return (
    <group {...props}>
      {variant === "round" && <RoundTree seed={seed} />}
      {variant === "pine" && <PineTree seed={seed} />}
      {variant === "palm" && <PalmTree />}
    </group>
  );
}

/** Low hedge form: two overlapping smooth ellipsoids. */
export function Bush({ seed = 1, ...props }: GroupProps & { seed?: number }) {
  const v = useMemo(() => {
    const r = rng(seed);
    return { a: 0.5 + r() * 0.08, b: 0.36 + r() * 0.06, dark: r() > 0.5 };
  }, [seed]);
  return (
    <group {...props}>
      <mesh geometry={canopyGeo()} position={[-0.12, 0.38, 0]} scale={[v.a * 1.15, v.a * 0.85, v.a]} material={v.dark ? leafDarkMat() : leafMat()} castShadow receiveShadow />
      <mesh geometry={canopyGeo()} position={[0.4, 0.28, 0.1]} scale={[v.b * 1.1, v.b * 0.85, v.b]} material={v.dark ? leafMat() : leafDarkMat()} castShadow receiveShadow />
    </group>
  );
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
