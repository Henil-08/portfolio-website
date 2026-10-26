// Street furniture in Concrete & Ink, drawn to the same footprint and origin as the
// original props they replace (models/props/propModels.ts), so placement stays put:
// a ground lantern (concrete foot, ink body and cap, a paper light box), a bench (concrete
// legs, ink seat and back, the back toward -z) and a fence bay (ink posts, paper top rail).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CI } from "../buildings/concrete";
import { geo } from "../models/props/shared";

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

/** Lantern body, vertex coloured. Model units: y -0.51..0.71, like the original. */
export const lanternGeo = () =>
  geo("ci-lantern", () =>
    boxes([
      [0.9, 0.12, 0.9, 0, -0.45, 0, CI.concreteDark],
      [0.42, 0.55, 0.42, 0, -0.115, 0, CI.ink],
      [0.66, 0.1, 0.66, 0, 0.64, 0, CI.ink],
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz): B => [0.05, 0.44, 0.05, sx * 0.27, 0.38, sz * 0.27, CI.ink])),
    ]),
  );

/** The lantern's light box (its own glowing material). */
export const lanternLightGeo = () => geo("ci-lantern-light", () => new THREE.BoxGeometry(0.5, 0.42, 0.5).translate(0, 0.38, 0));

/** Bench, vertex coloured, x -1.19..1.19, y -0.78..0.78, back toward -z. */
export const benchGeo = () =>
  geo("ci-bench", () =>
    boxes([
      ...[-0.9, 0.9].map((x): B => [0.3, 0.66, 0.62, x, -0.45, 0.05, CI.concrete]),
      [2.38, 0.12, 0.7, 0, -0.06, 0.05, CI.ink],
      [2.38, 0.62, 0.1, 0, 0.42, -0.5, CI.ink],
      [2.38, 0.06, 0.12, 0, 0.75, -0.5, CI.paper],
    ]),
  );

/** Fence bay, vertex coloured, x -1.07..1.07, y -1.04..0.2. */
export const fenceGeo = () =>
  geo("ci-fence", () =>
    boxes([
      ...[-1.0, 1.0].map((x): B => [0.1, 1.24, 0.1, x, -0.42, 0, CI.ink]),
      [2.14, 0.06, 0.06, 0, -0.5, 0, CI.ink],
      [2.14, 0.08, 0.14, 0, 0.16, 0, CI.paper],
    ]),
  );
