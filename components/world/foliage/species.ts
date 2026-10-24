// Tree species: which of the original trunk models to use, how big, where the foliage
// clumps sit, and their two tones. The original colours are bright (oak #b4b536 ->
// #d8cf3b, cherry #ff6d6d -> #ff9990); these are pulled toward our sage palette
// (palette.ts leaf / leafDark) and a dusty, quiet pink.
import * as THREE from "three";
import { BIRCH, CHERRY, OAK, type TreeModel } from "./treeModels";

export type TrunkId = "oak" | "cherry" | "birch";
export type SpeciesId = "oak" | "cherry" | "pine" | "bush";

export type Species = {
  trunk: TrunkId | null;
  /** model -> world scale (the original oak is ~7 m to the trunk top, ours ~4.5 m) */
  scale: number;
  /** foliage clumps in model space: [x, y, z, radius-ish scale] */
  crowns: [number, number, number, number][];
  /** shade side -> sun side, sRGB hex */
  colA: string;
  colB: string;
  /** metres of push per metre of height at full wind */
  sway: number;
};

export const TRUNKS: Record<TrunkId, TreeModel> = { oak: OAK, cherry: CHERRY, birch: BIRCH };

export const SPECIES: Record<SpeciesId, Species> = {
  oak: { trunk: "oak", scale: 0.62, crowns: OAK.crowns, colA: "#5a7650", colB: "#a6b87c", sway: 0.05 },
  cherry: { trunk: "cherry", scale: 0.72, crowns: CHERRY.crowns, colA: "#c08a8c", colB: "#ebc3b9", sway: 0.05 },
  // "pine" is the original birch: tall, narrow, darker green
  pine: { trunk: "birch", scale: 0.55, crowns: BIRCH.crowns, colA: "#4a6548", colB: "#88a070", sway: 0.04 },
  bush: {
    trunk: null,
    scale: 1,
    // The original bush: one round clump about as tall as its jeep (Bushes.js references)
    crowns: [[0, 0.55, 0, 0.75]],
    colA: "#5f7a52",
    colB: "#a2b27c",
    sway: 0.12,
  },
};

const linear = new Map<string, THREE.Color>();
/** sRGB hex -> linear colour (what the shader mixes), cached. */
export function linearColor(hex: string) {
  let c = linear.get(hex);
  if (!c) {
    c = new THREE.Color(hex);
    linear.set(hex, c);
  }
  return c;
}

const trunkGeos = new Map<TrunkId, THREE.BufferGeometry>();
/** The original trunk + branches mesh as a BufferGeometry, built once per model. */
export function trunkGeometry(id: TrunkId) {
  let g = trunkGeos.get(id);
  if (!g) {
    const m = TRUNKS[id];
    g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(m.position, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(m.normal, 3));
    g.setIndex(m.index);
    g.computeBoundingSphere();
    trunkGeos.set(id, g);
  }
  return g;
}
