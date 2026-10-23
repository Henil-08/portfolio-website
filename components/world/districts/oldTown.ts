// The old town round the crossover: each building gets a forecourt of stone slabs
// (Bruno's two-tone slabs, toned to our palette), his lanterns at the forecourt's
// outer corners, and now and then one of his benches against the facade.
// Pure data, read by ./index.tsx.
import * as THREE from "three";
import { TRACK_WIDTH } from "../layout";
import { heightAt } from "../terrain";
import { BUILDINGS, type Bld } from "../street/town";
import { compose, distToTrack, rng } from "../street/common";
import { BENCH, LANTERN } from "../models/props/brunoProps";
import { propFoot } from "../models/props/bruno";

const SLAB = 0.9; // slab pitch
const GAP = 0.07; // joint between slabs
const DEPTH = 3.4; // forecourt depth in front of the facade
const SIDE = 1.4; // forecourt overhang past each side wall
const TONES = ["#c9ab8a", "#d8c3a2", "#bf9c7f", "#e0cfb2"].map((c) => new THREE.Color(c));

const old = BUILDINGS.filter((b) => b.old);

/** Building-local (x, z) to world. */
function toWorld(b: Bld, lx: number, lz: number) {
  const c = Math.cos(b.yaw);
  const s = Math.sin(b.yaw);
  return [b.x + lx * c + lz * s, b.z - lx * s + lz * c] as const;
}

/** True if (x, z) is inside any building's footprint (plus a margin). */
function inBuilding(x: number, z: number, pad: number) {
  return BUILDINGS.some((o) => {
    const c = Math.cos(o.yaw);
    const s = Math.sin(o.yaw);
    const dx = x - o.x;
    const dz = z - o.z;
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    return Math.abs(lx) < o.w / 2 + pad && Math.abs(lz) < o.d / 2 + pad;
  });
}

const onRoad = (x: number, z: number) => distToTrack(x, z) < TRACK_WIDTH / 2 + 2.4;

/** Slabs: flat-shaded quads that follow the ground, one tone each. */
function paving() {
  const r = rng(731);
  const pos: number[] = [];
  const col: number[] = [];
  const seen = new Set<string>();
  for (const b of old) {
    const fz = b.front * (b.d / 2);
    const nx = Math.ceil((b.w / 2 + SIDE) / SLAB);
    const nz = Math.ceil(DEPTH / SLAB);
    for (let i = -nx; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        // slab corners in building-local space (j counts away from the facade)
        const x0 = i * SLAB + GAP / 2;
        const x1 = (i + 1) * SLAB - GAP / 2;
        const z0 = fz + b.front * (j * SLAB + GAP / 2 - 0.15);
        const z1 = fz + b.front * ((j + 1) * SLAB - GAP / 2 - 0.15);
        const [cx, cz] = toWorld(b, (x0 + x1) / 2, (z0 + z1) / 2);
        if (onRoad(cx, cz) || inBuilding(cx, cz, 0.1)) continue;
        // neighbouring forecourts overlap: one slab per spot
        const key = `${Math.round(cx / SLAB)},${Math.round(cz / SLAB)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const tone = TONES[Math.floor(r() * TONES.length)].clone().multiplyScalar(0.94 + r() * 0.1);
        const q = [
          [x0, z0],
          [x1, z0],
          [x1, z1],
          [x0, z1],
        ].map(([lx, lz]) => {
          const [x, z] = toWorld(b, lx, lz);
          return [x, heightAt(x, z) + 0.05, z];
        });
        // wind both triangles upward whichever way the building faces
        const tris = b.front > 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
        for (const k of tris) {
          pos.push(...q[k]);
          col.push(tone.r, tone.g, tone.b);
        }
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function furniture() {
  const r = rng(913);
  const lanterns: THREE.Matrix4[] = [];
  const benches: THREE.Matrix4[] = [];
  const lFoot = propFoot(LANTERN);
  const bFoot = propFoot(BENCH);
  for (const b of old) {
    const fz = b.front * (b.d / 2);
    for (const sx of [-1, 1]) {
      const [x, z] = toWorld(b, sx * (b.w / 2 + SIDE - 0.5), fz + b.front * (DEPTH - 0.6));
      if (onRoad(x, z) || inBuilding(x, z, 0.4)) continue;
      if (lanterns.some((m) => Math.hypot(m.elements[12] - x, m.elements[14] - z) < 2.5)) continue;
      lanterns.push(compose(x, heightAt(x, z) + lFoot * 0.9, z, r() * 6, 0.9, 0.9, 0.9));
    }
    if (b.w > 5.5 && r() < 0.6) {
      const [x, z] = toWorld(b, (r() - 0.5) * (b.w - 3), fz + b.front * 0.95);
      if (!onRoad(x, z) && !inBuilding(x, z, 0.3)) benches.push(compose(x, heightAt(x, z) + bFoot * 0.85, z, b.yaw + (b.front < 0 ? Math.PI : 0), 0.85, 0.85, 0.85));
    }
  }
  return { lanterns, benches };
}

export const OLD_TOWN = { paving: paving(), ...furniture() };
