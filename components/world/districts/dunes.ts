// The east beach and dunes: short runs of Bruno Simon's timber fence (MIT,
// (c) 2025 Bruno Simon) leaning along the dunes like sand fences, and tufts of
// marram grass. Pure data, read by ./index.tsx.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MAX_R, TRACK_WIDTH, duneMask, inLand, nearestT } from "../layout";
import { heightAt } from "../terrain";
import { compose, nearPlace, rng } from "../street/common";
import { BUILDINGS } from "../street/town";
import { FENCE } from "../models/props/brunoProps";
import { propFoot } from "../models/props/bruno";

const PANEL = 2.1; // fence panel length

function onDune(x: number, z: number, pad: number) {
  if (duneMask(x, z) < 0.35 || !inLand(x, z, 1.5)) return false;
  if (nearestT(x, z).dist < TRACK_WIDTH / 2 + 4 + pad || nearPlace(x, z, pad)) return false;
  return !BUILDINGS.some((b) => Math.hypot(b.x - x, b.z - z) < Math.hypot(b.w, b.d) / 2 + 1 + pad);
}

/** A marram tuft: a dozen thin blades fanning out from one point, 40 to 70 cm tall. */
export function tuftGeometry() {
  const r = rng(77);
  const blades: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 12; i++) {
    const h = 0.4 + r() * 0.3;
    const g = new THREE.ConeGeometry(0.025, h, 3, 1);
    g.translate(0, h / 2, 0);
    g.rotateZ((r() - 0.5) * 0.9);
    g.rotateY(r() * Math.PI * 2);
    g.translate((r() - 0.5) * 0.12, 0, (r() - 0.5) * 0.12);
    g.deleteAttribute("uv");
    blades.push(g);
  }
  return mergeGeometries(blades);
}

const GRASS = ["#b9b58a", "#a8a77a", "#c7bd92", "#9fa477"].map((c) => new THREE.Color(c));

export const DUNES = (() => {
  const r = rng(6161);
  const fences: THREE.Matrix4[] = [];
  const tufts = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const foot = propFoot(FENCE);
  let runs = 0;
  for (let tries = 0; tries < 6000 && runs < 14; tries++) {
    const x = MAX_R * (0.3 + r() * 0.7);
    const z = (r() * 2 - 1) * MAX_R;
    if (!onDune(x, z, 1)) continue;
    // along the shore: tangent to a circle round the island's centre, a little crooked
    const a = Math.atan2(z, x) + Math.PI / 2 + (r() - 0.5) * 0.5;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const n = 3 + Math.floor(r() * 4);
    const run: THREE.Matrix4[] = [];
    let ok = true;
    for (let k = 0; k < n && ok; k++) {
      const ax = x + dx * PANEL * k;
      const az = z + dz * PANEL * k;
      const bx = ax + dx * PANEL;
      const bz = az + dz * PANEL;
      if (!onDune(ax, az, 0) || !onDune(bx, bz, 0)) {
        ok = k >= 2;
        break;
      }
      const ya = heightAt(ax, az);
      const yb = heightAt(bx, bz);
      // each panel leans with the ground between its posts, and a few sag a little
      const pitch = Math.atan2(yb - ya, PANEL);
      run.push(compose((ax + bx) / 2, (ya + yb) / 2 + foot - 0.12, (az + bz) / 2, Math.atan2(-dz, dx), 1, 0.85 + r() * 0.15, 1, (r() - 0.5) * 0.12, pitch));
    }
    if (!ok || run.length < 2) continue;
    // runs keep apart: no panel within 6 m of another run's
    const near = (m: THREE.Matrix4) => fences.some((f) => Math.hypot(f.elements[12] - m.elements[12], f.elements[14] - m.elements[14]) < 6);
    if (run.some(near)) continue;
    fences.push(...run);
    runs++;
  }
  let clumps = 0;
  for (let tries = 0; tries < 8000 && clumps < 160; tries++) {
    const x = MAX_R * (0.3 + r() * 0.7);
    const z = (r() * 2 - 1) * MAX_R;
    if (!onDune(x, z, 0)) continue;
    clumps++;
    for (let j = 2 + Math.floor(r() * 4); j > 0; j--) {
      const tx = x + (r() - 0.5) * 1.6;
      const tz = z + (r() - 0.5) * 1.6;
      const s = 0.7 + r() * 0.6;
      tufts.m.push(compose(tx, heightAt(tx, tz) - 0.03, tz, r() * 6, s, s, s));
      tufts.c.push(GRASS[Math.floor(r() * GRASS.length)]);
    }
  }
  return { fences, tufts };
})();
