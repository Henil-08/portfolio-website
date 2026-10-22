// Trees are static. Collider suggestion: trunk cylinder r=0.25 h=2 at the origin
// (palm: r=0.22, leaning toward +X by ~0.6 m at the top).
// round: ~2.8 x 3.6 x 2.8   pine: ~2.4 x 4.4 x 2.4   palm: ~4 x 4.8 x 4
// Bush: ~1.4 x 0.9 x 1.1    Rock: ~1.2 x 0.75 x 1.0 (cuboid works, scale with the group)
"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { geo, lowSphere, mat, rng, type GroupProps } from "./shared";

type TreeProps = GroupProps & { variant?: "round" | "pine" | "palm"; seed?: number };

const leafMat = () => mat(C.grass, { r: 0.85, flat: true });
const leafDarkMat = () => mat(C.grassDark, { r: 0.85, flat: true });
const trunkMat = () => mat(C.woodDark, { r: 0.9 });

function trunkGeo() {
  return geo("tree-trunk", () => {
    const g = new THREE.CylinderGeometry(0.15, 0.24, 1, 10);
    g.translate(0, 0.5, 0);
    return g;
  });
}

function RoundTree({ seed }: { seed: number }) {
  const blobs = useMemo(() => {
    const r = rng(seed);
    return [
      { p: [0, 2.4, 0], s: 1.15, dark: false },
      { p: [0.7 + r() * 0.2, 2.0, 0.25], s: 0.75, dark: true },
      { p: [-0.65, 2.05 + r() * 0.2, -0.2], s: 0.8, dark: true },
      { p: [0.1, 3.15, 0.15], s: 0.7, dark: false },
      { p: [-0.1, 1.95, 0.65], s: 0.62, dark: false },
    ] as { p: [number, number, number]; s: number; dark: boolean }[];
  }, [seed]);
  return (
    <>
      <mesh geometry={trunkGeo()} scale={[1, 2.0, 1]} material={trunkMat()} castShadow receiveShadow />
      {blobs.map((b, i) => (
        <mesh
          key={i}
          geometry={lowSphere()}
          position={b.p}
          scale={b.s}
          rotation={[i, i * 2, 0]}
          material={b.dark ? leafDarkMat() : leafMat()}
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
}

function pineGeo(i: number) {
  return geo(`pine-${i}`, () => {
    const r = 1.2 - i * 0.3;
    const g = new THREE.ConeGeometry(r, 1.5 - i * 0.2, 8, 1);
    return g;
  });
}

function PineTree() {
  return (
    <>
      <mesh geometry={trunkGeo()} scale={[0.9, 1.2, 0.9]} material={trunkMat()} castShadow receiveShadow />
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          geometry={pineGeo(i)}
          position={[0, 1.6 + i * 0.82, 0]}
          rotation={[0, i * 0.4, 0]}
          material={i % 2 ? leafMat() : leafDarkMat()}
          castShadow
          receiveShadow
        />
      ))}
      {/* a little snowless "star" cap so the tip reads round */}
      <mesh geometry={lowSphere()} position={[0, 3.78, 0]} scale={0.16} material={leafMat()} castShadow />
    </>
  );
}

function frondGeo() {
  return geo("palm-frond", () => {
    // a long leaf drooping away from the trunk top along +X, pinched at both ends
    const g = new THREE.SphereGeometry(1, 14, 6);
    g.scale(0.85, 0.08, 0.3);
    g.translate(0.8, 0, 0);
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setY(i, p.getY(i) + 0.25 * x - 0.42 * x * x);
    }
    g.computeVertexNormals();
    return g;
  });
}

function palmSegGeo() {
  return geo("palm-seg", () => {
    // slightly flared ring, like stacked coconut-husk collars
    const g = new THREE.CylinderGeometry(1.08, 0.86, 1, 10);
    g.translate(0, 0.5, 0);
    return g;
  });
}

function PalmTree() {
  const segs = 7;
  const parts = useMemo(() => {
    const out: { p: [number, number, number]; r: number; a: number }[] = [];
    const curve = (t: number) => 0.9 * t * t;
    const segH = 0.56;
    for (let i = 0; i < segs; i++) {
      const t = i / segs;
      const t2 = (i + 1) / segs;
      const a = Math.atan2(curve(t2) - curve(t), segH);
      out.push({ p: [curve(t), i * segH, 0], r: 0.22 - t * 0.07, a });
    }
    return out;
  }, []);
  const top: [number, number, number] = [0.9, segs * 0.56 + 0.05, 0];
  return (
    <>
      {parts.map((s, i) => (
        <mesh
          key={i}
          geometry={palmSegGeo()}
          position={s.p}
          rotation={[0, 0, -s.a]}
          scale={[s.r, 0.62, s.r]}
          material={i % 2 ? mat(C.wood, { r: 0.9 }) : trunkMat()}
          castShadow
          receiveShadow
        />
      ))}
      <group position={top}>
        <mesh geometry={lowSphere()} scale={0.2} material={leafDarkMat()} castShadow />
        {Array.from({ length: 8 }, (_, i) => (
          <mesh
            key={i}
            geometry={frondGeo()}
            rotation={[0, (i / 8) * Math.PI * 2 + 0.3, (i % 2) * 0.18]}
            scale={i % 2 ? 1 : 1.15}
            material={i % 2 ? leafMat() : leafDarkMat()}
            castShadow
            receiveShadow
          />
        ))}
        {[0, 2.1, 4.2].map((a, i) => (
          <mesh
            key={i}
            geometry={lowSphere()}
            position={[Math.cos(a) * 0.17, -0.16, Math.sin(a) * 0.17]}
            scale={0.14}
            material={mat(C.woodDark, { r: 0.8, flat: true })}
            castShadow
          />
        ))}
      </group>
    </>
  );
}

/** Cute tree: round blob tree, pine or (beach) palm. */
export function Tree({ variant = "round", seed = 1, ...props }: TreeProps) {
  return (
    <group {...props}>
      {variant === "round" && <RoundTree seed={seed} />}
      {variant === "pine" && <PineTree />}
      {variant === "palm" && <PalmTree />}
    </group>
  );
}

/** Low cluster of leafy blobs. */
export function Bush({ seed = 1, ...props }: GroupProps & { seed?: number }) {
  const blobs = useMemo(() => {
    const r = rng(seed);
    return [
      { p: [0, 0.42, 0], s: 0.5 },
      { p: [0.45, 0.3, 0.1 + r() * 0.1], s: 0.36 },
      { p: [-0.42, 0.28, -0.05], s: 0.38 + r() * 0.06 },
      { p: [0.05, 0.26, 0.38], s: 0.3 },
    ] as { p: [number, number, number]; s: number }[];
  }, [seed]);
  return (
    <group {...props}>
      {blobs.map((b, i) => (
        <mesh
          key={i}
          geometry={lowSphere()}
          position={b.p}
          scale={[b.s, b.s * 0.9, b.s]}
          rotation={[i, i * 1.7, 0]}
          material={i % 2 ? leafDarkMat() : leafMat()}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

function rockGeo(seed: number) {
  return geo(`rock-${seed}`, () => {
    const g = new THREE.DodecahedronGeometry(0.6, 1);
    const r = rng(seed);
    const p = g.getAttribute("position");
    // jitter shared vertices consistently (keyed by rounded position)
    const offs = new Map<string, number>();
    for (let i = 0; i < p.count; i++) {
      const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      if (!offs.has(k)) offs.set(k, 0.85 + r() * 0.25);
      const f = offs.get(k)!;
      p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
    }
    g.scale(1, 0.62, 0.85);
    g.computeVertexNormals();
    g.translate(0, 0.3, 0);
    return g;
  });
}

/** Chunky faceted rock. */
export function Rock({ seed = 1, ...props }: GroupProps & { seed?: number }) {
  return (
    <group {...props}>
      <mesh geometry={rockGeo(Math.round(seed) % 4)} material={mat(C.rock, { r: 0.9, flat: true })} castShadow receiveShadow />
    </group>
  );
}
