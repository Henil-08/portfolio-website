// The park's common ground between the place islands, dressed the way
// folio-2025 (MIT, see public/vendor/LICENSE.md) dresses its park: stepping-slab
// paths between the islands (the original's terrain's two-tone slabs, toned to our palette), the original's
// lanterns where a path reaches an island, the original's benches beside the paths, small
// wildflower clusters on the verges (Flowers.js, see ./hills.ts) and a run of the original's
// fence round the north side of the football island. Pure data, read by ./index.tsx.
import * as THREE from "three";
import { TRACK_WIDTH, inLand, nearestT, zoneById, zones, type ZoneId } from "../layout";
import { nearGarden } from "../garden/layout";
import { heightAt } from "../terrain";
import { compose, rng } from "../street/common";
import { BENCH, FENCE, LANTERN } from "../models/props/propModels";
import { PROP_SCALE, propFoot } from "../models/props/kit";
import { ISLANDS, islandDist } from "../park/layout";
import { C } from "../palette";

const TONES = ["#c9ab8a", "#d8c3a2", "#bf9c7f", "#e0cfb2"].map((c) => new THREE.Color(c));
const PETALS = [C.white, C.white, C.cream, C.pink, C.yellow].map((c) => new THREE.Color(c));

const at = (id: ZoneId) => zoneById[id].pos;
const isl = (i: number) => [ISLANDS[i].x, ISLANDS[i].z] as [number, number];

// Which islands the slab paths join: podium, football, playbook, contact, the
// grandstand lawn and the three small islands (park/layout.ts ISLANDS order).
const LINKS: [[number, number], [number, number]][] = [
  [at("podium"), at("football")],
  [at("football"), at("playbook")],
  [at("football"), at("contact")],
  [at("podium"), isl(5)],
  [at("playbook"), isl(6)],
  [isl(7), at("contact")],
  [at("contact"), isl(4)],
  [isl(7), at("podium")],
];

/** Free for a path: on land, clear of the road, the garden and every place's footprint. */
function onSand(x: number, z: number) {
  if (!inLand(x, z, 1) || nearestT(x, z).dist < TRACK_WIDTH / 2 + 3 || nearGarden(x, z, 0.6)) return false;
  return !zones.some((zn) => {
    if (zn.id.startsWith("sector") || zn.id.startsWith("garage")) return false;
    const pad = zn.id === "contact" ? 2.5 : 1.2;
    return Math.abs(x - zn.pos[0]) < zn.size[0] / 2 + pad && Math.abs(z - zn.pos[1]) < zn.size[1] / 2 + pad;
  });
}

export const PARK = (() => {
  const r = rng(5150);
  const slabs = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const lanterns: THREE.Matrix4[] = [];
  const benches: THREE.Matrix4[] = [];
  const fences: THREE.Matrix4[] = [];
  const flowers = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const lFoot = propFoot(LANTERN) * PROP_SCALE * 0.9;
  const bFoot = propFoot(BENCH) * PROP_SCALE * 0.85;
  const fFoot = propFoot(FENCE) * PROP_SCALE;
  const lamps: [number, number][] = [];
  const lamp = (x: number, z: number) => {
    if (lamps.some(([lx, lz]) => Math.hypot(lx - x, lz - z) < 5)) return;
    lamps.push([x, z]);
    lanterns.push(compose(x, heightAt(x, z) + lFoot, z, r() * 6, 0.9 * PROP_SCALE, 0.9 * PROP_SCALE, 0.9 * PROP_SCALE));
  };
  const bloom = (x: number, z: number) => {
    const tint = PETALS[Math.floor(r() * PETALS.length)];
    for (let j = 3 + Math.floor(r() * 5); j > 0; j--) {
      const fx = x + (r() - 0.5) * 2.2;
      const fz = z + (r() - 0.5) * 2.2;
      if (nearestT(fx, fz).dist < TRACK_WIDTH / 2 + 3) continue;
      const s = 0.6 + r() * 0.4;
      flowers.m.push(compose(fx, heightAt(fx, fz) + 0.1 * s, fz, r() * Math.PI * 2, s, s, s));
      flowers.c.push(tint);
    }
  };

  for (const [[ax, az], [bx, bz]] of LINKS) {
    const len = Math.hypot(bx - ax, bz - az);
    const dx = (bx - ax) / len;
    const dz = (bz - az) / len;
    const yaw = Math.atan2(-dz, dx);
    // a gentle bow so the paths don't read as ruler lines
    const bow = (r() - 0.5) * 0.18 * len;
    const point = (t: number) => {
      const b = Math.sin(Math.PI * t) * bow;
      return [ax + dx * len * t - dz * b, az + dz * len * t + dx * b] as const;
    };
    const on: number[] = [];
    const n = Math.floor(len / 0.95);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const [x, z] = point(t);
      if (!onSand(x, z)) continue;
      on.push(t);
      // two slabs a row, staggered, each a little turned
      for (const side of [-0.42, 0.42]) {
        const jx = x - dz * (side + (r() - 0.5) * 0.18);
        const jz = z + dx * (side + (r() - 0.5) * 0.18);
        const w = 0.7 + r() * 0.25;
        const d = 0.55 + r() * 0.25;
        slabs.m.push(compose(jx, heightAt(jx, jz) + 0.015, jz, yaw + (r() - 0.5) * 0.35, w, 0.07, d));
        slabs.c.push(TONES[Math.floor(r() * TONES.length)]);
      }
    }
    if (on.length < 3) continue;
    // lanterns where the path leaves the sand onto each island
    for (const t of [on[0], on[on.length - 1]]) {
      const [x, z] = point(t);
      const side = r() < 0.5 ? 1 : -1;
      lamp(x - dz * 1.5 * side, z + dx * 1.5 * side);
    }
    // a bench beside the middle of the path, facing it, and flowers either side
    const [mx, mz] = point(on[Math.floor(on.length / 2)]);
    const side = r() < 0.5 ? 1 : -1;
    const bx2 = mx - dz * 2.1 * side;
    const bz2 = mz + dx * 2.1 * side;
    if (onSand(bx2, bz2)) benches.push(compose(bx2, heightAt(bx2, bz2) + bFoot, bz2, yaw + (side > 0 ? Math.PI : 0), 0.85 * PROP_SCALE, 0.85 * PROP_SCALE, 0.85 * PROP_SCALE));
    for (const t of [on[Math.floor(on.length / 4)], on[Math.floor((on.length * 3) / 4)]]) {
      const [x, z] = point(t);
      const s = r() < 0.5 ? 1 : -1;
      bloom(x - dz * 2.4 * s, z + dx * 2.4 * s);
    }
  }

  // Flowers round the edges of the place islands.
  for (const i of ISLANDS.slice(0, 4)) {
    for (let k = 0; k < 6; k++) {
      const a = r() * Math.PI * 2;
      const x = i.x + Math.cos(a) * (i.rx + 0.6);
      const z = i.z + Math.sin(a) * (i.rz + 0.6);
      if (Math.abs(islandDist(x, z)) < 1.5) bloom(x, z);
    }
  }

  // A fence round the north side of the football island (the side facing the
  // tunnel straight): even panels on a smooth ellipse just inside its grass edge,
  // with gaps where a slab path comes through.
  const fi = ISLANDS[1];
  const pitch = zoneById.football;
  const edge = (a: number) => {
    const u = Math.cos(a) * fi.rx * 0.84;
    const v = Math.sin(a) * fi.rz * 0.84;
    const c = Math.cos(fi.yaw);
    const sn = Math.sin(fi.yaw);
    return [fi.x + u * c + v * sn, fi.z - u * sn + v * c] as const;
  };
  const steps = 40;
  for (let k = 0; k < steps; k++) {
    const a0 = Math.PI * (1.15 + (0.7 * k) / steps);
    const a1 = Math.PI * (1.15 + (0.7 * (k + 1)) / steps);
    const [x0, z0] = edge(a0);
    const [x1, z1] = edge(a1);
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    const l = Math.hypot(x1 - x0, z1 - z0);
    if (Math.abs(mx - pitch.pos[0]) < pitch.size[0] / 2 + 1 && Math.abs(mz - pitch.pos[1]) < pitch.size[1] / 2 + 1) continue;
    if (slabs.m.some((m) => Math.hypot(m.elements[12] - mx, m.elements[14] - mz) < 2.6)) continue;
    if (benches.some((m) => Math.hypot(m.elements[12] - mx, m.elements[14] - mz) < 2.5)) continue;
    const ya = heightAt(x0, z0);
    const yb = heightAt(x1, z1);
    fences.push(compose(mx, (ya + yb) / 2 + fFoot - 0.12, mz, Math.atan2(-(z1 - z0), x1 - x0), (l / 1.88) * 1.02, PROP_SCALE * 0.85, PROP_SCALE));
  }

  return { slabs, lanterns, benches, fences, flowers };
})();

/** Paint the slabs black onto the grass mask (Grass.tsx) so no blades poke through them. */
export function paintParkSlabs(g: CanvasRenderingContext2D, tx: (v: number) => number, s: number) {
  g.fillStyle = "#000";
  for (const m of PARK.slabs.m) {
    const e = m.elements;
    // the matrix columns hold the slab's scaled local x and z axes
    const w = Math.hypot(e[0], e[2]);
    const d = Math.hypot(e[8], e[10]);
    g.save();
    g.translate(tx(e[12]), tx(e[14]));
    g.rotate(Math.atan2(e[2], e[0]));
    g.fillRect((-w / 2 - 0.1) * s, (-d / 2 - 0.1) * s, (w + 0.2) * s, (d + 0.2) * s);
    g.restore();
  }
}
