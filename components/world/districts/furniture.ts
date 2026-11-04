// Street furniture in Concrete & Ink, on the same origin as the original props they replaced
// (models/props/propModels.ts), so placement stays put: the kit lamp and bench (the approved
// concepts) and a fence bay (ink posts, paper top rail).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CI } from "../buildings/concrete";
import { geo } from "../models/props/shared";
import { bake, part } from "../kit/shared";
import { benchModel, lampModel } from "../kit/street";

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
 * The placements put a lantern's or bench's local origin above its foot and scale it about
 * 1.1-1.17 (0.85-0.9 x PROP_SCALE); the kit models (components/world/kit/street.ts, the approved
 * lamp and bench concepts) are in metres from the foot, so they're shrunk by that much and
 * dropped to the old foot here, and come out at their real size.
 */
const LANTERN_FOOT = -0.51;
const BENCH_FOOT = -0.78;
const PLACED = 1.15;

/** Lantern: the kit street lamp (ink post, concrete foot, ink cap), vertex coloured, without its lit cube. */
export const lanternGeo = () => geo("kit-lantern", () => bake(lampModel(), { skip: ["glow"], xf: { s: 1 / PLACED, p: [0, LANTERN_FOOT, 0] } }));

/** The lantern's lit paper cube (its own glowing material). */
export const lanternLightGeo = () => geo("kit-lantern-light", () => part(lampModel(), "glow", { s: 1 / PLACED, p: [0, LANTERN_FOOT, 0] })!);

/** Bench: the kit bench (concrete block, ink slats, back toward -z), vertex coloured. */
export const benchGeo = () => geo("kit-bench", () => bake(benchModel(), { xf: { s: 1 / 1.1, p: [0, BENCH_FOOT, 0] } }));

/** Fence bay, vertex coloured, x -1.07..1.07, y -1.04..0.2. */
export const fenceGeo = () =>
  geo("ci-fence", () =>
    boxes([
      ...[-1.0, 1.0].map((x): B => [0.1, 1.24, 0.1, x, -0.42, 0, CI.ink]),
      [2.14, 0.06, 0.06, 0, -0.5, 0, CI.ink],
      [2.14, 0.08, 0.14, 0, 0.16, 0, CI.paper],
    ]),
  );
