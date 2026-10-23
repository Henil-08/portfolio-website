// Shared bits for the project showcase objects: materials, small geometry helpers
// and the `active` liveliness hook. Every object sits in a 1.2 x 1.2 x 1.4 m box,
// origin at its base centre, facing +Z, meant to stand on a plinth top (y ~1.0).
"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { geo, mat, unitBox, type GroupProps } from "../props/shared";

export type ObjProps = GroupProps & {
  /** car parked next to it: brighter glow, faster motion */
  active?: boolean;
};

/** Studio materials, all cached (shared across every object). */
export const M = {
  white: () => mat(C.white, { r: 0.24 }),
  cream: () => mat(C.cream, { r: 0.45 }),
  stone: () => mat(C.sand, { r: 0.6 }),
  red: () => mat(C.red, { r: 0.28 }),
  redDark: () => mat(C.redDark, { r: 0.35 }),
  ink: () => mat(C.ink, { r: 0.4, m: 0.1 }),
  charcoal: () => mat(C.charcoal, { r: 0.35, m: 0.1 }),
  grey: () => mat(C.grey, { r: 0.45 }),
  greyLight: () => mat(C.greyLight, { r: 0.4 }),
  alu: () => mat(C.metal, { r: 0.28, m: 0.55 }),
  chrome: () => mat(C.silver, { r: 0.16, m: 0.85 }),
  rubber: () => mat(C.black, { r: 0.75 }),
  screen: () => mat("#1b2128", { glow: 0.9, e: "#202831", r: 0.2 }),
  glowWhite: (k = 1.2) => mat(C.white, { glow: k, r: 0.4 }),
  glowRed: (k = 1.6) => mat(C.red, { glow: k, r: 0.4 }),
  glowTeal: (k = 1.8) => mat(C.teal, { glow: k, r: 0.4 }),
};

export type Live = { a: number; t: number };

/**
 * Smoothed activity (0 idle .. 1 active) plus an animation clock that runs
 * `1 + boost * a` times faster when active. Registered first, so the caller's
 * own useFrame sees fresh values.
 */
export function useLive(active?: boolean, boost = 1.6) {
  const live = useRef<Live>({ a: 0, t: 0 });
  useFrame((_, dt) => {
    const l = live.current;
    const d = Math.min(dt, 0.1);
    l.a = THREE.MathUtils.damp(l.a, active ? 1 : 0, 4, d);
    l.t += d * (1 + boost * l.a);
  });
  return live;
}

/** A per-instance glow material (cloned from the cache) so `active` can brighten it alone. */
export function useGlowMat(color: string, k: number, o?: number) {
  const m = useMemo(() => mat(color, { glow: k, r: 0.4, o }).clone(), [color, k, o]);
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

/** Animate a per-instance material from useFrame (kept as functions so the React compiler lint is happy). */
export function setGlow(m: THREE.MeshStandardMaterial, k: number) {
  m.emissiveIntensity = k;
}
export function setOpacity(m: THREE.Material, o: number) {
  m.opacity = o;
}

/** Capsule between two points (rounded tube segment). */
export function Bone({ a, b, r, material, cast = true }: { a: THREE.Vector3Tuple; b: THREE.Vector3Tuple; r: number; material: THREE.Material; cast?: boolean }) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const pos = va.add(vb).multiplyScalar(0.5);
  const g = geo(`proj-cap-${r.toFixed(3)}-${len.toFixed(3)}`, () => new THREE.CapsuleGeometry(r, Math.max(0.001, len), 6, 16));
  return <mesh geometry={g} position={pos} quaternion={quat} material={material} castShadow={cast} />;
}

export type BarSpec = [x: number, y: number, z: number, w: number, h: number, d: number];

/** Many small boxes of one material as a single instanced mesh. */
export function Bars({ items, material, cast = false }: { items: BarSpec[]; material: THREE.Material; cast?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach(([x, y, z, w, h, d], i) => {
      o.position.set(x, y, z);
      o.scale.set(w, h, d);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={ref} args={[unitBox(), material, items.length]} castShadow={cast} receiveShadow />;
}

/** Extruded, softly bevelled shape, centred on its bounds. Cached by key. */
export function extruded(key: string, make: () => THREE.Shape, depth: number, bevel: number, segs = 4, center = true) {
  return geo(`proj-ext-${key}`, () => {
    const g = new THREE.ExtrudeGeometry(make(), {
      depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: segs,
      curveSegments: 24,
    });
    if (center) g.center();
    g.computeVertexNormals();
    return g;
  });
}

/** Lathe from [radius, y] pairs, cached by key. */
export function lathe(key: string, pts: [number, number][], segs = 48) {
  return geo(`proj-lathe-${key}`, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segs));
}
