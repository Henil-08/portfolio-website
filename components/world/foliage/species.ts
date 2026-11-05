// W10 trees, now the approved concepts (docs/BRAND.md 2026-11-05, public/models/concepts):
// the faceted cypress in its square planter, the tiled round crown in its tray and the
// three-bush gravel tray, built in components/world/kit/nature.ts. Each kind is one merged
// geometry with its colours as vertex colours, so the registry draws every tree of a kind
// in one instanced call; the material's flat shading gives the facets.
import type * as THREE from "three";
import { bushModel, cypressModel, roundTreeModel } from "../kit/nature";
import { bake } from "../kit/shared";
import { WORLD_SCALE } from "../scale";

export type TreeKind = "cypress" | "round" | "bush";

/** Concrete & Ink: leaf, leaf light, ink (sRGB). */
export const LEAF = { leaf: "#5c6a4b", leafLight: "#73805c", ink: "#151515" } as const;

/**
 * Real heights at scale 1 (docs/research/model-fidelity.md "World scale"); placement scales them
 * about 0.75-1.4, so a cypress is a real 6-10 m, a round tree 5-8 m and a bush 0.9-1.7 m. Each kind
 * is its model brought to that real height, times WORLD_SCALE:
 * cypress 4.32 m model -> 7.5 m real -> 5.0 m   round 4.95 m -> 6.5 m real -> 4.3 m
 * bush: the kit tray as modelled (bushes to 1.25 m, tray 2.7 x 2.3 m) -> 0.83 m, tray 1.8 m
 */
export const TREE_REAL = { cypress: 7.5 / 4.32, round: 6.5 / 4.95, bush: 1 };
export const KINDS: Record<TreeKind, { build: () => THREE.BufferGeometry; /** seeded height stretch, +- */ stretch: number }> = {
  cypress: { build: () => bake(cypressModel(), { xf: { s: TREE_REAL.cypress * WORLD_SCALE } }), stretch: 0.1 },
  round: { build: () => bake(roundTreeModel(), { xf: { s: TREE_REAL.round * WORLD_SCALE } }), stretch: 0.04 },
  // the world's bushes carry fewer gravel chips than the review model
  bush: { build: () => bake(bushModel(160), { xf: { s: TREE_REAL.bush * WORLD_SCALE } }), stretch: 0.06 },
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
