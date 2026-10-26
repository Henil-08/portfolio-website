// W10 trees (docs/BRAND.md "World", /docs/brand/world): two forms only, a tall
// faceted cypress and a round faceted crown, on ink trunks, plus a low faceted
// bush in the same language. Each kind is one merged geometry with its colours as
// vertex colours, so the registry draws every tree of a kind in one instanced call;
// the material's flat shading gives the facets.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type TreeKind = "cypress" | "round" | "bush";

/** Concrete & Ink: leaf, leaf light, ink (sRGB). */
export const LEAF = { leaf: "#5c6a4b", leafLight: "#73805c", ink: "#151515" } as const;

/**
 * Sizes at scale 1, metres. Placement scales them 0.8-1.35.
 * cypress: ~1.8 x 6 x 1.8   round: ~3.4 x 5.1 x 3.4   bush: ~2 x 1.1 x 1.6
 */
export const KINDS: Record<TreeKind, { build: () => THREE.BufferGeometry; /** seeded height stretch, +- */ stretch: number }> = {
  cypress: { build: () => tree(trunk(0.22, 1), cone(0.88, 5.2, 0.8), LEAF.leaf), stretch: 0.14 },
  round: { build: () => tree(trunk(0.26, 2.2), crown(1.7, 2.2 + 1.7 * 0.7), LEAF.leafLight), stretch: 0.06 },
  bush: { build: bush, stretch: 0.1 },
};

function trunk(w: number, h: number) {
  return new THREE.BoxGeometry(w, h, w).translate(0, h / 2, 0);
}

/** Six-sided cone from `base` up, like the proposal's cypress. */
function cone(r: number, h: number, base: number) {
  return new THREE.ConeGeometry(r, h, 6).translate(0, base + h / 2, 0);
}

/** Icosahedron crown (detail 0: twenty facets) centred at y. */
function crown(r: number, y: number) {
  return new THREE.IcosahedronGeometry(r, 0).translate(0, y, 0);
}

function painted(g: THREE.BufferGeometry, hex: string) {
  const out = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(hex);
  const n = out.getAttribute("position").count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return out;
}

/** Three faceted balls of two greens, so a bush reads as leaves and not as a rock. */
function bush() {
  const ball = (r: number, x: number, y: number, z: number, hex: string) => painted(new THREE.IcosahedronGeometry(r, 0).rotateY(x * 3).translate(x, y, z), hex);
  const g = mergeGeometries([
    ball(0.62, 0, 0.52, 0, LEAF.leafLight),
    ball(0.48, 0.58, 0.38, 0.22, LEAF.leaf),
    ball(0.44, -0.42, 0.34, -0.38, LEAF.leaf),
  ])!;
  g.computeBoundingSphere();
  return g;
}

function tree(stem: THREE.BufferGeometry, top: THREE.BufferGeometry, leaf: string) {
  const g = mergeGeometries([painted(stem, LEAF.ink), painted(top, leaf)])!;
  g.computeBoundingSphere();
  return g;
}

const built = new Map<TreeKind, THREE.BufferGeometry>();
/** The shared geometry for a kind, built once. */
export function kindGeometry(kind: TreeKind) {
  let g = built.get(kind);
  if (!g) {
    g = KINDS[kind].build();
    built.set(kind, g);
  }
  return g;
}
