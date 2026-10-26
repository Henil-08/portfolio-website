// Shared bits for the project showcase objects: materials, small geometry helpers
// and the `active` liveliness hook. Every object sits in a 1.2 x 1.2 x 1.4 m box,
// origin at its base centre, facing +Z, meant to stand on a plinth top (y ~1.0).
"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import type { ThreeElements } from "@react-three/fiber";
import { geo, mat, unitBox, type GroupProps } from "../props/shared";

export type ObjProps = GroupProps & {
  /** car parked next to it: brighter glow, faster motion */
  active?: boolean;
};

/**
 * Studio materials in Concrete & Ink (docs/BRAND.md, World), all cached and shared:
 * matte paper, concrete and ink, graphite for metal, glass for screens, one orange
 * (`red`) for each object's accent. Flat shaded so the faceted forms read. The key
 * names are the old ones so every object keeps its parts.
 */
export const M = {
  white: () => mat(C.paper, { r: 0.6, flat: true }),
  cream: () => mat(C.concrete, { r: 0.9, flat: true }),
  stone: () => mat(C.gravel, { r: 0.95, flat: true }),
  red: () => mat(C.orange, { r: 0.55, flat: true }),
  redDark: () => mat(C.ink, { r: 0.6, m: 0.2, flat: true }),
  ink: () => mat(C.ink, { r: 0.6, m: 0.2, flat: true }),
  charcoal: () => mat(C.charcoal, { r: 0.6, m: 0.2, flat: true }),
  grey: () => mat(C.concreteDark, { r: 0.85, flat: true }),
  greyLight: () => mat(C.concrete, { r: 0.85, flat: true }),
  alu: () => mat(C.charcoal, { r: 0.5, m: 0.4, flat: true }),
  chrome: () => mat(C.concreteDark, { r: 0.4, m: 0.4, flat: true }),
  rubber: () => mat(C.black, { r: 0.9, flat: true }),
  screen: () => mat(C.glass, { glow: 0.9, e: C.glass, r: 0.2 }),
  glowWhite: (k = 1.2) => mat(C.paper, { glow: k, r: 0.4 }),
  glowRed: (k = 1.6) => mat(C.orange, { glow: k, r: 0.4 }),
  glowTeal: (k = 1.8) => mat(C.paper, { glow: k, r: 0.4 }),
};

/** Faceted unit sphere (radius 1) and eight-sided unit prism (radius 1, height 1): no turned toy shapes. */
export const facet = () => geo("proj-facet", () => new THREE.IcosahedronGeometry(1, 1));
export const prism = () => geo("proj-prism", () => new THREE.CylinderGeometry(1, 1, 1, 8));

type BlockProps = Omit<ThreeElements["mesh"], "args"> & { args: [number, number, number]; radius?: number; smoothness?: number };
/** A hard-edged box with RoundedBox's props (radius and smoothness are ignored). */
export function Block({ args, radius: _r, smoothness: _s, children, ...props }: BlockProps) {
  void _r;
  void _s;
  return (
    <mesh geometry={unitBox()} scale={args} {...props}>
      {children}
    </mesh>
  );
}

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

/** Six-sided strut between two points. */
export function Bone({ a, b, r, material, cast = true }: { a: THREE.Vector3Tuple; b: THREE.Vector3Tuple; r: number; material: THREE.Material; cast?: boolean }) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const pos = va.add(vb).multiplyScalar(0.5);
  const g = geo(`proj-strut-${r.toFixed(3)}-${len.toFixed(3)}`, () => new THREE.CylinderGeometry(r, r, Math.max(0.001, len) + r, 6));
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

/** Extruded shape with a hard chamfer, centred on its bounds. Cached by key. */
export function extruded(key: string, make: () => THREE.Shape, depth: number, bevel: number, segs = 1, center = true) {
  return geo(`proj-ext-${key}`, () => {
    const g = new THREE.ExtrudeGeometry(make(), {
      depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: Math.min(1, segs),
      curveSegments: 6,
    });
    if (center) g.center();
    g.computeVertexNormals();
    return g;
  });
}

/** Lathe from [radius, y] pairs, cached by key. */
export function lathe(key: string, pts: [number, number][], segs = 8) {
  return geo(`proj-lathe-${key}`, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segs));
}
