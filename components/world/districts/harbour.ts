// The harbour quays: benches facing the water, lanterns along the
// land side, and stacks of crates and barrels between them. Pure data, read by
// ./index.tsx.
import * as THREE from "three";
import { CANALS, QUAY_Y } from "../layout";
import { quayRuns } from "../Harbour";
import { compose, rng } from "../street/common";
import { BENCH, LANTERN } from "../models/props/propModels";
import { PROP_SCALE, propFoot } from "../models/props/kit";

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
          lanterns.push(compose(lx, TOP + propFoot(LANTERN) * 0.85 * PROP_SCALE, lz, r() * 6, 0.85 * PROP_SCALE, 0.85 * PROP_SCALE, 0.85 * PROP_SCALE));
        } else if (k % 16 === 0) {
          const [bx, bz] = at(1.35);
          benches.push(compose(bx, TOP + propFoot(BENCH) * 0.85 * PROP_SCALE, bz, water, 0.85 * PROP_SCALE, 0.85 * PROP_SCALE, 0.85 * PROP_SCALE));
        } else if (k % 32 === 12) {
          // a small stack: two or three crates, and a barrel or two behind them
          const [sx, sz] = at(1.7);
          const n = 2 + Math.floor(r() * 2);
          for (let i = 0; i < n; i++) {
            const s = 0.55 + r() * 0.15;
            const up = i === 2;
            const ox = up ? 0.1 : (i - 0.5) * 0.7;
            crates.m.push(compose(sx + rz * ox, TOP + s / 2 + (up ? 0.6 : 0), sz - rx * ox, water + (r() - 0.5) * 0.5, s, s, s));
            crates.c.push(CRATES[Math.floor(r() * CRATES.length)]);
          }
          const [ux, uz] = at(2.45); // behind the crates, on the land side
          for (let i = 0; i < 1 + Math.floor(r() * 2); i++) {
            const ox = (i - 0.5) * 0.62;
            barrels.m.push(compose(ux + rz * ox, TOP + 0.4, uz - rx * ox, 0, 0.27, 0.8, 0.27));
            barrels.c.push(new THREE.Color(r() < 0.85 ? "#151515" : "#ff4f00"));
          }
        }
      }
    }
  return { lanterns, benches, crates, barrels };
})();
