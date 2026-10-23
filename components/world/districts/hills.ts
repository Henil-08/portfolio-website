// The north hills: wildflower clusters (Bruno Simon's Flowers.js, MIT, (c) 2025
// Bruno Simon: eight tiny petal cards on a dome, scattered in clusters of 3 to 10)
// and grey rock outcrops half sunk in the slope. Pure data, read by ./index.tsx.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MAX_R, TRACK_WIDTH, duneMask, inLand, nearestT, reliefAt } from "../layout";
import { heightAt } from "../terrain";
import { compose, inSectorScene, nearPlace, nearTree, rng } from "../street/common";
import { BUILDINGS } from "../street/town";
import { C } from "../palette";

/** Up on a hill, not the dunes, not the road, a building or a place. */
function onHill(x: number, z: number, pad: number) {
  if (reliefAt(x, z) < 1 || duneMask(x, z) > 0.05) return false;
  if (!inLand(x, z, 2) || nearestT(x, z).dist < TRACK_WIDTH / 2 + 4 + pad) return false;
  if (nearPlace(x, z, pad) || inSectorScene(x, z, pad + 3, 10)) return false;
  return !BUILDINGS.some((b) => Math.hypot(b.x - x, b.z - z) < Math.hypot(b.w, b.d) / 2 + 1 + pad);
}

/** Bruno's flower: eight small cards on a 1 m dome, the dome's top 25 cm above its origin. Normals point up, so every card is lit alike. */
export function flowerGeometry() {
  const r = rng(808);
  const planes: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const plane = new THREE.PlaneGeometry(0.1, 0.1);
    const dir = new THREE.Vector3().setFromSpherical(new THREE.Spherical(1, Math.PI * 0.2 * r(), Math.PI * 2 * r()));
    const p = dir.clone().setLength(1 + (r() - 0.5) * 0.5);
    p.y -= 0.75;
    const m = new THREE.Matrix4().lookAt(dir, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
    m.setPosition(p);
    m.scale(new THREE.Vector3().setScalar(1 + (r() - 0.5)));
    plane.applyMatrix4(m);
    plane.deleteAttribute("uv");
    planes.push(plane);
  }
  const g = mergeGeometries(planes);
  const n = g.getAttribute("normal");
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}

const PETALS = [C.white, C.white, C.white, C.cream, C.pink, C.yellow].map((c) => new THREE.Color(c));
const STONE = ["#bfb8ad", "#b1aa9f", "#c9c2b6", "#a9a398"].map((c) => new THREE.Color(c));

export const HILLS = (() => {
  const r = rng(4242);
  const flowers = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const rocks = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  let clusters = 0;
  let outcrops = 0;
  for (let tries = 0; tries < 9000 && (clusters < 90 || outcrops < 34); tries++) {
    const x = (r() * 2 - 1) * MAX_R;
    const z = (r() * 2 - 1) * MAX_R;
    if (!onHill(x, z, 0)) continue;
    if (clusters < 90 && r() < 0.7) {
      clusters++;
      const tint = PETALS[Math.floor(r() * PETALS.length)];
      for (let j = 3 + Math.floor(r() * 8); j > 0; j--) {
        const fx = x + (r() - 0.5) * 3;
        const fz = z + (r() - 0.5) * 3;
        if (!onHill(fx, fz, 0)) continue;
        const s = 0.6 + r() * 0.4;
        flowers.m.push(compose(fx, heightAt(fx, fz) + 0.1 * s, fz, r() * Math.PI * 2, s, s, s));
        flowers.c.push(tint);
      }
    } else if (outcrops < 34 && !nearTree(x, z, 1.5)) {
      outcrops++;
      for (let j = 1 + Math.floor(r() * 3); j > 0; j--) {
        const rx = x + (r() - 0.5) * 2.4;
        const rz = z + (r() - 0.5) * 2.4;
        const s = 0.45 + r() * 0.9;
        const sy = s * (0.5 + r() * 0.35);
        rocks.m.push(compose(rx, heightAt(rx, rz) + sy * 0.25, rz, r() * 6, s * (0.9 + r() * 0.4), sy, s, (r() - 0.5) * 0.4, (r() - 0.5) * 0.4));
        rocks.c.push(STONE[Math.floor(r() * STONE.length)]);
      }
    }
  }
  return { flowers, rocks };
})();
