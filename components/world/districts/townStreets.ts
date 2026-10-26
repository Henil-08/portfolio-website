// Town streets (roadmap step 8): where the town's buildings front the circuit, a raised
// pavement runs along the facade with a stone kerb on the road side, street trees in
// planters, bollards along the kerb, café tables outside some ground floors, one bus
// stop and one kiosk. Pure data, read by ./Streets.tsx. No zebra crossings: the circuit
// carries no paint (art direction, docs/ROADMAP.md).
import * as THREE from "three";
import { TRACK_WIDTH } from "../layout";
import { heightAt } from "../terrain";
import { BUILDINGS, type Bld } from "../street/town";
import { compose, distToTrack, nearTree, rng } from "../street/common";
import { FLOODS } from "../street/layoutStreet";
import { STAND_SPOTS } from "../street/standSpots";

const HALF = TRACK_WIDTH / 2;
/** Pavement top above the ground, and its kerb. */
export const KERB_H = 0.14;
const SLAB = 1.2;
const MIN_DEPTH = 1.8;
const MAX_DEPTH = 3.0;
const SLAB_TONES = ["#d3d0c8", "#cac7be", "#dcd9d2"].map((c) => new THREE.Color(c));

function toWorld(b: Bld, lx: number, lz: number) {
  const c = Math.cos(b.yaw);
  const s = Math.sin(b.yaw);
  return [b.x + lx * c + lz * s, b.z - lx * s + lz * c] as const;
}

function inBuilding(x: number, z: number, pad: number) {
  return BUILDINGS.some((o) => {
    const c = Math.cos(o.yaw);
    const s = Math.sin(o.yaw);
    const dx = x - o.x;
    const dz = z - o.z;
    return Math.abs(dx * c - dz * s) < o.w / 2 + pad && Math.abs(dx * s + dz * c) < o.d / 2 + pad;
  });
}

const blocked = (x: number, z: number, r: number) =>
  FLOODS.some((f) => Math.hypot(f.x - x, f.z - z) < r + 1) || STAND_SPOTS.some((s) => Math.hypot(s.x - x, s.z - z) < r + 7) || nearTree(x, z, r);

/** A building's street: how deep its pavement can be before the road (0 = none). */
function pavementDepth(b: Bld) {
  if (b.old) return 0; // the old town has its own forecourts (oldTown.ts)
  const [x, z] = toWorld(b, 0, b.front * (b.d / 2));
  const room = distToTrack(x, z) - HALF - 1.2; // leave a strip before the kerb line
  if (room > 12) return 0; // set back: not on the street
  return room >= MIN_DEPTH ? Math.min(MAX_DEPTH, room) : 0;
}

export type Street = { b: Bld; depth: number };

export const STREETS = (() => {
  const r = rng(808);
  const fronts: Street[] = BUILDINGS.map((b) => ({ b, depth: pavementDepth(b) })).filter((s) => s.depth > 0);

  const slabs = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const kerbs = { m: [] as THREE.Matrix4[] };
  const planters: THREE.Matrix4[] = [];
  const trees: { x: number; z: number; y: number; rot: number; seed: number }[] = [];
  const bollards: THREE.Matrix4[] = [];
  const tables: THREE.Matrix4[] = [];
  const chairs: THREE.Matrix4[] = [];
  const seen = new Set<string>();
  let busStop: { x: number; z: number; y: number; yaw: number } | null = null;
  let kiosk: { x: number; z: number; y: number; yaw: number } | null = null;

  for (const { b, depth } of fronts) {
    const fz = b.front * (b.d / 2);
    const yawOut = b.yaw + (b.front < 0 ? Math.PI : 0); // local +z of street furniture toward the road
    const n = Math.ceil((b.w + 0.8) / SLAB);
    const x0 = -(n * SLAB) / 2;
    // pavement slabs, one row deep, and the kerb along the road edge
    for (let i = 0; i < n; i++) {
      const lx = x0 + (i + 0.5) * SLAB;
      const [cx, cz] = toWorld(b, lx, fz + b.front * (depth / 2));
      const key = `${Math.round(cx / SLAB)},${Math.round(cz / SLAB)}`;
      if (seen.has(key) || distToTrack(cx, cz) < HALF + 0.6 || inBuilding(cx, cz, -0.2)) continue;
      seen.add(key);
      const y = heightAt(cx, cz);
      slabs.m.push(compose(cx, y + KERB_H / 2, cz, b.yaw, SLAB - 0.05, KERB_H, depth));
      slabs.c.push(SLAB_TONES[Math.floor(r() * SLAB_TONES.length)].clone());
      const [kx, kz] = toWorld(b, lx, fz + b.front * (depth + 0.11));
      kerbs.m.push(compose(kx, heightAt(kx, kz) + (KERB_H + 0.04) / 2, kz, b.yaw, SLAB, KERB_H + 0.04, 0.22));
    }
    const y = heightAt(...toWorld(b, 0, fz)) + KERB_H;
    // a planter with a street tree at one end of every other frontage
    if (r() < 0.55 && b.w > 5) {
      const sx = r() < 0.5 ? -1 : 1;
      const [px, pz] = toWorld(b, sx * (b.w / 2 - 0.7), fz + b.front * (depth - 0.65));
      if (!blocked(px, pz, 1.2) && distToTrack(px, pz) > HALF + 1.4) {
        planters.push(compose(px, y + 0.3, pz, b.yaw, 1.0, 0.6, 1.0));
        trees.push({ x: px, z: pz, y: y + 0.55, rot: r() * 6, seed: Math.floor(r() * 1000) });
      }
    }
    // bollards along the kerb
    for (const fx of [-0.25, 0.25]) {
      const [bx, bz] = toWorld(b, fx * b.w, fz + b.front * (depth - 0.3));
      if (blocked(bx, bz, 0.3) || distToTrack(bx, bz) < HALF + 0.9) continue;
      if (trees.some((t) => Math.hypot(t.x - bx, t.z - bz) < 1.2)) continue;
      bollards.push(compose(bx, y + 0.42, bz, 0, 1, 1, 1));
    }
    // café tables outside some one-storey buildings with room for them
    if (b.floors === 1 && depth >= 2.4 && r() < 0.5) {
      for (const fx of [-0.18, 0.18]) {
        const [tx, tz] = toWorld(b, fx * b.w, fz + b.front * (depth * 0.45));
        if (blocked(tx, tz, 0.8)) continue;
        tables.push(compose(tx, y, tz, yawOut));
        for (const side of [-1, 1]) {
          const [cx, cz] = toWorld(b, fx * b.w + side * 0.62, fz + b.front * (depth * 0.45));
          chairs.push(compose(cx, y, cz, yawOut + (side * Math.PI) / 2));
        }
      }
    }
    // the first deep, long frontage gets the bus stop, the next the kiosk
    if (depth >= 2.6 && b.w >= 7) {
      const [sx, sz] = toWorld(b, 0, fz + b.front * (depth - 1.0));
      const ok = !blocked(sx, sz, 2) && distToTrack(sx, sz) > HALF + 1.6;
      if (ok && !busStop) busStop = { x: sx, z: sz, y, yaw: yawOut };
      else if (ok && !kiosk && Math.hypot(sx - (busStop?.x ?? 1e9), sz - (busStop?.z ?? 1e9)) > 30) kiosk = { x: sx, z: sz, y, yaw: yawOut };
    }
  }
  return { slabs, kerbs, planters, trees, bollards, tables, chairs, busStop, kiosk, count: fronts.length };
})();

/** Clear the grass under the pavements, the bus stop and the kiosk (Grass.tsx mask). */
export function paintStreets(g: CanvasRenderingContext2D, tx: (v: number) => number, s: number) {
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const e = new THREE.Euler();
  const rect = (x: number, z: number, yaw: number, w: number, d: number) => {
    g.save();
    g.translate(tx(x), tx(z));
    g.rotate(-yaw);
    g.fillRect((-w / 2) * s, (-d / 2) * s, w * s, d * s);
    g.restore();
  };
  for (const m of [...STREETS.slabs.m, ...STREETS.kerbs.m]) {
    m.decompose(p, q, sc);
    e.setFromQuaternion(q, "YXZ");
    rect(p.x, p.z, e.y, sc.x + 0.1, sc.z + 0.2);
  }
  for (const st of [STREETS.busStop, STREETS.kiosk]) if (st) rect(st.x, st.z, st.yaw, 4.2, 2.6);
}
