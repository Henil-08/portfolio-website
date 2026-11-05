// Street furniture in Concrete & Ink at the world's scale (../scale.ts): the kit lamp and bench
// (the approved concepts), origin at the foot, and a fence bay (ink posts, paper top rail).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CI } from "../buildings/concrete";
import { geo } from "../models/props/shared";
import { bake, kitMat, part, type Paint } from "../kit/shared";
import { studioMaterial } from "../studio/materials";
import { BENCH, LAMP_H, benchModel, lampModel } from "../kit/street";
import { WORLD_SCALE } from "../scale";

type B = [sx: number, sy: number, sz: number, x: number, y: number, z: number, color: string];

function boxes(list: B[]) {
  return mergeGeometries(
    list.map(([sx, sy, sz, x, y, z, color]) => {
      const g = new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z).toNonIndexed();
      g.deleteAttribute("uv");
      const c = new THREE.Color(color);
      const col = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < col.length; i += 3) col.set([c.r, c.g, c.b], i);
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      return g;
    }),
  );
}

/**
 * The kit lamp and bench (components/world/kit/street.ts, the approved concepts) are drawn in real
 * metres from their foot; here they are baked at the world's scale (../scale.ts), origin at the
 * foot, so every placement puts them on the ground at scale 1: a 3.7 m lamp stands 2.45 m, the
 * 2.1 m bench is 1.4 m long with its seat 0.32 m up.
 */
const AT_WORLD = { s: WORLD_SCALE };

/** Lantern: the kit street lamp (ink post, concrete foot, ink cap), vertex coloured, without its lit cube. */
export const lanternGeo = () => geo("kit-lantern-world", () => bake(lampModel(), { skip: ["glow"], xf: AT_WORLD }));

/** The lantern's lit paper cube (its own glowing material). */
export const lanternLightGeo = () => geo("kit-lantern-light-world", () => part(lampModel(), "glow", AT_WORLD)!);

/** The lamp's height in the world (m). */
export const LANTERN_H = LAMP_H * WORLD_SCALE;

let benchList: { geometry: THREE.BufferGeometry; material: THREE.Material }[] | null = null;
/**
 * Bench: the kit bench (seat toward +z, back toward -z) as one part per paint with the kit's
 * materials, so the slats keep their grain and the block its concrete grain. The block comes
 * first (Movables takes its collider from the first part). Place at the ground, scale 1.
 */
export function benchParts() {
  if (!benchList) {
    const m = benchModel();
    const order = ["concrete", ...m.map((x) => x.paint).filter((p) => p !== "concrete")] as Paint[];
    benchList = order.map((p) => ({ geometry: part(m, p, AT_WORLD)!, material: p === "concrete" ? studioMaterial(kitMat(p), { grain: 1 }) : kitMat(p) }));
  }
  return benchList;
}

/** The bench in the world: length, depth and seat height (m). */
export const BENCH_W = { L: BENCH.L * WORLD_SCALE, D: BENCH.D * WORLD_SCALE, seat: BENCH.seat * WORLD_SCALE };

/** Fence bay (below): its foot under the origin and its height at scale 1. */
export const FENCE_BAY = { foot: 1.04, h: 1.24, len: 2.14 };
/** A fence bay's height scale: a real 1.1 m post-and-rail fence at the world's scale. */
export const FENCE_SY = (1.1 * WORLD_SCALE) / FENCE_BAY.h;

/** Fence bay, vertex coloured, x -1.07..1.07, y -1.04..0.2. */
export const fenceGeo = () =>
  geo("ci-fence", () =>
    boxes([
      ...[-1.0, 1.0].map((x): B => [0.1, 1.24, 0.1, x, -0.42, 0, CI.ink]),
      [2.14, 0.06, 0.06, 0, -0.5, 0, CI.ink],
      [2.14, 0.08, 0.14, 0, 0.16, 0, CI.paper],
    ]),
  );
