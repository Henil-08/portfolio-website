// Bushes through the infield, the park and along the garden paths, like
// folio-2025 (MIT, see public/vendor/LICENSE.md; sources/Game/World/Bushes.js
// places ~130 single foliage clumps from a Blender reference file). Ours are
// scattered from the layout: a loose line beside each garden path, a ring round
// each park island's edge, and small clusters in the open infield. Pure data,
// drawn by ./index.tsx with the foliage registry's <Bush>.
import { TIMELINE, LETTERS, inLand, zones } from "../layout";
import { PATHS, clearOfRoad, nearGarden, pathSamples } from "../garden/layout";
import { ISLANDS, islandDist, parkSand } from "./layout";
import { BUILDINGS } from "../street/town";
import { inSectorScene, nearTree, rng } from "../street/common";
import { FOOTBRIDGES } from "./layout";
import { START_SPOT } from "../startSpot";

export type BushSpot = { x: number; z: number; s: number; rot: number; seed: number };

/** Inside a place's own footprint (pitch, podium, contact ring) plus a margin. */
function onPlace(x: number, z: number, pad: number) {
  return zones.some((zn) => {
    if (zn.id.startsWith("sector") || zn.id.startsWith("garage")) return false;
    return Math.abs(x - zn.pos[0]) < zn.size[0] / 2 + pad && Math.abs(z - zn.pos[1]) < zn.size[1] / 2 + pad;
  });
}

function free(x: number, z: number, out: BushSpot[]) {
  if (!inLand(x, z, 2) || !clearOfRoad(x, z, 4.5)) return false;
  if (Math.hypot(x - START_SPOT[0], z - START_SPOT[1]) < 5) return false;
  if (nearGarden(x, z, 1.3) || nearTree(x, z, 1.6) || onPlace(x, z, 2.5)) return false;
  if (inSectorScene(x, z, 3, 12)) return false;
  if (Math.abs(x - TIMELINE.pos[0]) < TIMELINE.hx + 2 && Math.abs(z - TIMELINE.pos[1]) < TIMELINE.hz + 2) return false;
  if (Math.abs(x - LETTERS.center[0]) < LETTERS.hx + 2 && Math.abs(z - LETTERS.center[1]) < 3) return false;
  if (FOOTBRIDGES.some((b) => Math.hypot(x - b.x, z - b.z) < b.len / 2 + 3)) return false;
  if (BUILDINGS.some((b) => Math.hypot(b.x - x, b.z - z) < Math.hypot(b.w, b.d) / 2 + 1.5)) return false;
  return !out.some((o) => Math.hypot(o.x - x, o.z - z) < 1.7 * Math.max(o.s, 1));
}

export const BUSHES: BushSpot[] = (() => {
  const r = rng(4242);
  const out: BushSpot[] = [];
  const add = (x: number, z: number, s: number) => {
    if (free(x, z, out)) out.push({ x, z, s, rot: r() * Math.PI * 2, seed: Math.floor(r() * 1000) });
  };

  // A loose line beside every garden path, alternating sides, with gaps.
  for (const p of PATHS) {
    const pts = pathSamples(p, 1);
    for (let i = 3; i < pts.length - 3; i += 6 + Math.floor(r() * 5)) {
      if (r() < 0.35) continue;
      const [ax, az] = pts[i - 1];
      const [bx, bz] = pts[i + 1];
      const l = Math.hypot(bx - ax, bz - az) || 1;
      const side = r() < 0.5 ? 1 : -1;
      const off = p.w / 2 + 1.5 + r() * 0.8;
      add(pts[i][0] - ((bz - az) / l) * off * side, pts[i][1] + ((bx - ax) / l) * off * side, 0.75 + r() * 0.35);
    }
  }

  // A ring just inside each park island's edge, where the grass meets the sand.
  for (const isl of ISLANDS) {
    const n = Math.round((isl.rx + isl.rz) * 0.9);
    for (let k = 0; k < n; k++) {
      if (r() < 0.45) continue;
      const a = (k / n) * Math.PI * 2 + r() * 0.2;
      // walk in from outside until we're ~1.2 m onto the grass
      for (let f = 1.3; f > 0.4; f -= 0.03) {
        const x = isl.x + Math.cos(a) * isl.rx * f;
        const z = isl.z + Math.sin(a) * isl.rz * f;
        if (islandDist(x, z) < -1.2) {
          add(x, z, 0.8 + r() * 0.4);
          break;
        }
      }
    }
  }

  // Small clusters in the open infield (inside the loop, off the park sand).
  for (let tries = 0; tries < 400 && out.length < 150; tries++) {
    const cx = -60 + r() * 120;
    const cz = -45 + r() * 75;
    if (parkSand(cx, cz) > 0.2 || !free(cx, cz, out)) continue;
    const m = 2 + Math.floor(r() * 3);
    for (let j = 0; j < m; j++) add(cx + (r() - 0.5) * 4.5, cz + (r() - 0.5) * 4.5, 0.7 + r() * 0.45);
  }
  return out;
})();
