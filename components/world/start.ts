// The start: the car waits on the verge beside the main straight, in the shade
// of a tree, facing a short slab path that runs onto the circuit just behind the
// start line. Drive forward and you are racing; nothing has to say so. Bushes,
// a bench and flowers frame the opening circle (Reveal.tsx). Pure data, drawn by
// ./StartGarden.tsx (and masked out of the grass by Grass.tsx).
import { compose, rng } from "./street/common";
import { heightAt } from "./terrain";
import type * as THREE from "three";
import { START_SPOT } from "./startSpot";

export { REVEAL_AT, START_SPOT } from "./startSpot";


const fx = Math.cos(START_SPOT[2]);
const fz = -Math.sin(START_SPOT[2]);
/** Along the start's forward (a) and to its left (b, toward -x/-z side), in world x/z. */
const at = (a: number, b: number): [number, number] => [START_SPOT[0] + fx * a + fz * b, START_SPOT[1] + fz * a - fx * b];

export const START_TREE = { x: at(-1.5, 3.6)[0], z: at(-1.5, 3.6)[1], seed: 11, s: 1.2 };
export const START_BUSHES: [number, number, number][] = [
  [...at(-3.5, -2.6), 1.0],
  [...at(3.5, -3.2), 0.85],
  [...at(5.5, 3.4), 0.8],
  [...at(-5, 4.5), 0.9],
];
/** Bench in the tree's shade, facing the track. */
export const START_BENCH = { x: at(-2.8, 5.6)[0], z: at(-2.8, 5.6)[1], yaw: START_SPOT[2] + Math.PI / 2 };
export const START_FLOWERS: [number, number][] = [at(2, 2.4), at(1, -2.6), at(6.5, -2.2), at(-1, -4.5)];

/** Stepping slabs from in front of the car to the road edge (z ~46.3). */
export const START_PATH = (() => {
  const r = rng(3131);
  const m: THREE.Matrix4[] = [];
  const yaw = START_SPOT[2];
  for (let a = 2.4; ; a += 0.95) {
    const [x, z] = at(a, 0);
    if (z < 46.8) break;
    for (const side of [-0.5, 0.5]) {
      const [sx, sz] = at(a + (r() - 0.5) * 0.15, side + (r() - 0.5) * 0.16);
      m.push(compose(sx, heightAt(sx, sz) + 0.015, sz, yaw + (r() - 0.5) * 0.35, 0.72 + r() * 0.22, 0.07, 0.6 + r() * 0.2));
    }
    void x;
  }
  return m;
})();

/** Paint the start path black onto the grass mask so no blades poke through it. */
export function paintStartPath(g: CanvasRenderingContext2D, tx: (v: number) => number, s: number) {
  g.fillStyle = "#000";
  for (const m of START_PATH) {
    const e = m.elements;
    const w = Math.hypot(e[0], e[2]);
    const d = Math.hypot(e[8], e[10]);
    g.save();
    g.translate(tx(e[12]), tx(e[14]));
    g.rotate(Math.atan2(e[2], e[0]));
    g.fillRect((-w / 2 - 0.1) * s, (-d / 2 - 0.1) * s, (w + 0.2) * s, (d + 0.2) * s);
    g.restore();
  }
}
