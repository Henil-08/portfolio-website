// Shared, cached materials and geometries for the props. Every prop pulls from
// these so a scene with fifty cones still has one cone material.
// Look: premium designer-toy diorama. Satin plastic (r ~0.45), painted resin
// (r ~0.6), gloss (r ~0.25). Small precise bevels, no wobbly blobs.
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";

export type GroupProps = ThreeElements["group"];

type MatOpts = {
  /** roughness, default 0.5 (satin plastic) */
  r?: number;
  /** metalness, default 0.05 */
  m?: number;
  /** emissive color (defaults to the base color when `glow` is set) */
  e?: string;
  /** emissive intensity */
  glow?: number;
  /** opacity < 1 makes it transparent */
  o?: number;
  flat?: boolean;
  side?: THREE.Side;
  vc?: boolean;
};

const mats = new Map<string, THREE.MeshStandardMaterial>();

/** Cached MeshStandardMaterial keyed by color + options. Never dispose these. */
export function mat(color: string, o: MatOpts = {}): THREE.MeshStandardMaterial {
  const key = color + JSON.stringify(o);
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: o.r ?? 0.5,
      metalness: o.m ?? 0.05,
      flatShading: o.flat ?? false,
      side: o.side ?? THREE.FrontSide,
      vertexColors: o.vc ?? false,
    });
    if (o.glow) {
      m.emissive.set(o.e ?? color);
      m.emissiveIntensity = o.glow;
      m.toneMapped = false;
    }
    if (o.o !== undefined && o.o < 1) {
      m.transparent = true;
      m.opacity = o.o;
      m.depthWrite = false;
    }
    mats.set(key, m);
  }
  return m;
}

const geos = new Map<string, THREE.BufferGeometry>();

/** Cached geometry by key; `make` runs once per key. */
export function geo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geos.get(key) as T | undefined;
  if (!g) {
    g = make();
    geos.set(key, g);
  }
  return g;
}

// Unit primitives: scale them per mesh.
export const unitBox = () => geo("box", () => new THREE.BoxGeometry(1, 1, 1));
export const unitCyl = () => geo("cyl", () => new THREE.CylinderGeometry(1, 1, 1, 28));
export const unitSphere = () => geo("sphere", () => new THREE.SphereGeometry(1, 28, 18));
export const lowSphere = () => geo("lowSphere", () => new THREE.IcosahedronGeometry(1, 2));

/** Small deterministic PRNG so variants stay stable between renders. */
export function rng(seed: number) {
  let s = (Math.floor(seed * 9301 + 49297) % 233280 + 233280) % 233280 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
