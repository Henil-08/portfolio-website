// The sea beaches: weathered rocks in small groups and bleached driftwood lying
// along the tide line, kept off the promenade, the pier, the road and the town.
// Pure data, read by ./index.tsx.
import * as THREE from "three";
import { MAX_R, SEA_Y, TRACK_WIDTH, nearestT, shoreDist } from "../layout";
import { heightAt } from "../terrain";
import { compose, nearPlace, rng } from "../street/common";
import { BUILDINGS } from "../street/town";
import { PIER, nearPromenade } from "../waterfront/layout";

function onBeach(x: number, z: number) {
  const sd = shoreDist(x, z);
  if (sd < 0.4 || sd > 4.5 || heightAt(x, z) < SEA_Y + 0.05) return false;
  if (nearestT(x, z).dist < TRACK_WIDTH / 2 + 3 || nearPromenade(x, z, 2) || nearPlace(x, z, 0)) return false;
  if (Math.hypot(PIER.x - x, PIER.z - z) < 8) return false;
  return !BUILDINGS.some((b) => Math.hypot(b.x - x, b.z - z) < Math.hypot(b.w, b.d) / 2 + 1);
}

const STONE = ["#bfb8ad", "#b1aa9f", "#c9c2b6", "#a9a398"].map((c) => new THREE.Color(c));
const WOOD = ["#cdbfa8", "#bfb09a", "#d8cbb6"].map((c) => new THREE.Color(c));

export const BEACHES = (() => {
  const r = rng(3131);
  const rocks = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const wood = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  let groups = 0;
  let logs = 0;
  for (let tries = 0; tries < 12000 && (groups < 34 || logs < 22); tries++) {
    const a = r() * Math.PI * 2;
    const rad = MAX_R * (0.75 + r() * 0.3);
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad;
    if (!onBeach(x, z)) continue;
    if (groups < 34 && r() < 0.6) {
      groups++;
      for (let j = 1 + Math.floor(r() * 3); j > 0; j--) {
        const rx = x + (r() - 0.5) * 2;
        const rz = z + (r() - 0.5) * 2;
        if (!onBeach(rx, rz)) continue;
        const s = 0.3 + r() * 0.7;
        rocks.m.push(compose(rx, heightAt(rx, rz) + s * 0.12, rz, r() * 6, s * (1 + r() * 0.4), s * (0.45 + r() * 0.3), s, (r() - 0.5) * 0.3, (r() - 0.5) * 0.3));
        rocks.c.push(STONE[Math.floor(r() * STONE.length)]);
      }
    } else if (logs < 22) {
      logs++;
      // a log lying along the tide line (tangent to the shore), half sunk in the sand
      const len = 1.2 + r() * 1.6;
      const rad = 0.08 + r() * 0.07;
      const yaw = Math.atan2(-z, x) + (r() - 0.5) * 0.8; // local z along the shore
      wood.m.push(compose(x, heightAt(x, z) + rad * 0.5, z, yaw, rad, len, rad, Math.PI / 2, (r() - 0.5) * 0.15));
      wood.c.push(WOOD[Math.floor(r() * WOOD.length)]);
      if (r() < 0.5) {
        // a short stub of a branch
        const off = (r() - 0.5) * len * 0.6;
        const bx = x + Math.sin(yaw) * off;
        const bz = z + Math.cos(yaw) * off;
        wood.m.push(compose(bx, heightAt(bx, bz) + rad * 1.2, bz, yaw + 0.9, rad * 0.6, len * 0.3, rad * 0.6, Math.PI / 2 - 0.4, 0));
        wood.c.push(WOOD[Math.floor(r() * WOOD.length)]);
      }
    }
  }
  return { rocks, wood };
})();
