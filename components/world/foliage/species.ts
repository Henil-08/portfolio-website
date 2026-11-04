// W10 trees, now the approved concepts (docs/BRAND.md 2026-11-05, public/models/concepts):
// the faceted cypress in its square planter, the tiled round crown in its tray and the
// three-bush gravel tray, built in components/world/kit/nature.ts. Each kind is one merged
// geometry with its colours as vertex colours, so the registry draws every tree of a kind
// in one instanced call; the material's flat shading gives the facets.
import type * as THREE from "three";
import { bushModel, cypressModel, roundTreeModel } from "../kit/nature";
import { bake } from "../kit/shared";

export type TreeKind = "cypress" | "round" | "bush";

/** Concrete & Ink: leaf, leaf light, ink (sRGB). */
export const LEAF = { leaf: "#5c6a4b", leafLight: "#73805c", ink: "#151515" } as const;

/**
 * Sizes at scale 1, metres. Placement scales them 0.8-1.35.
 * cypress: ~1.6 x 5.6 x 1.6 (planter 1.56)   round: ~3.5 x 5 x 3.5 (tray 1.9)   bush: ~2 x 1 x 1.6 (tray)
 */
export const KINDS: Record<TreeKind, { build: () => THREE.BufferGeometry; /** seeded height stretch, +- */ stretch: number }> = {
  cypress: { build: () => bake(cypressModel(), { xf: { s: 1.3 } }), stretch: 0.1 },
  round: { build: () => bake(roundTreeModel(), { xf: { s: 1.05 } }), stretch: 0.04 },
  // the world's bushes carry fewer gravel chips than the review model
  bush: { build: () => bake(bushModel(90), { xf: { s: 0.75 } }), stretch: 0.06 },
};

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
