// The harbour quays: benches facing the water, lanterns along the
// land side, and stacks of crates and barrels between them. Pure data, read by
// ./index.tsx.
import * as THREE from "three";
import { CANALS, QUAY_Y } from "../layout";
import { quayRuns } from "../Harbour";
import { compose, rng } from "../street/common";
import { WORLD_SCALE } from "../scale";

const TOP = QUAY_Y + 0.13; // the coping's top
// crates in concrete tones and graphite, barrels ink with the odd orange one
const CRATES = ["#cfccc4", "#b8b4a9", "#2b2c2e"].map((c) => new THREE.Color(c));

export const HARBOUR = (() => {
  const r = rng(5150);
  const lanterns: THREE.Matrix4[] = [];
  const benches: THREE.Matrix4[] = [];
  const crates = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const barrels = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  for (const c of CANALS)
    for (const run of quayRuns(c)) {
      for (let k = 3; k < run.length - 3; k++) {
        const [x, z, rx, rz] = run[k];
        const at = (o: number) => [x + rx * o, z + rz * o] as const;
        const water = Math.atan2(-rx, -rz); // local +z toward the water
        if (k % 16 === 8) {
          const [lx, lz] = at(2.05);
          lanterns.push(compose(lx, TOP, lz, r() * 6));
        } else if (k % 16 === 0) {
          const [bx, bz] = at(1.35);
          benches.push(compose(bx, TOP, bz, water));
        } else if (k % 32 === 12) {
          // a small stack: two or three crates, and a barrel or two behind them
          const [sx, sz] = at(1.7);
          const n = 2 + Math.floor(r() * 2);
          for (let i = 0; i < n; i++) {
            // real crates of 0.55-0.7 m, at the world's scale
            const s = (0.55 + r() * 0.15) * WORLD_SCALE;
            const up = i === 2;
            const ox = (up ? 0.1 : (i - 0.5) * 0.7) * WORLD_SCALE;
            crates.m.push(compose(sx + rz * ox, TOP + s / 2 + (up ? 0.6 * WORLD_SCALE : 0), sz - rx * ox, water + (r() - 0.5) * 0.5, s, s, s));
            crates.c.push(CRATES[Math.floor(r() * CRATES.length)]);
          }
          const [ux, uz] = at(2.45); // behind the crates, on the land side
          // 200 l drums (0.88 m tall, 0.58 m across) at the world's scale
          for (let i = 0; i < 1 + Math.floor(r() * 2); i++) {
            const ox = (i - 0.5) * 0.62 * WORLD_SCALE;
            barrels.m.push(compose(ux + rz * ox, TOP + 0.44 * WORLD_SCALE, uz - rx * ox, 0, 0.29 * WORLD_SCALE, 0.88 * WORLD_SCALE, 0.29 * WORLD_SCALE));
            barrels.c.push(new THREE.Color(r() < 0.85 ? "#151515" : "#ff4f00"));
          }
        }
      }
    }
  return { lanterns, benches, crates, barrels };
})();
