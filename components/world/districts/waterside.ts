// By the water, in Concrete & Ink: faceted reeds (leaf-toned blades and a few slim seed
// spikes) and concrete-toned rocks round the spring lake and along the river banks, and
// hexagonal lily pads (one in a few in flower) floating on the lake.
// Pure data, read by ./index.tsx.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CANALS, LAKES, SEA_Y, TRACK_WIDTH, canalDist, lakeDepthDist, nearCrossing, nearestT } from "../layout";
import { heightAt } from "../terrain";
import { compose, nearPlace, rng } from "../street/common";
import { BUILDINGS } from "../street/town";
import { FOOTBRIDGES } from "../park/layout";

const RIVER = CANALS[0];

function clear(x: number, z: number) {
  if (nearestT(x, z).dist < TRACK_WIDTH / 2 + 3.5 || nearCrossing(x, z, 18) || nearPlace(x, z, 0)) return false;
  if (FOOTBRIDGES.some((f) => Math.hypot(f.x - x, f.z - z) < f.len / 2 + 2)) return false;
  return !BUILDINGS.some((b) => Math.hypot(b.x - x, b.z - z) < Math.hypot(b.w, b.d) / 2 + 1);
}

/** Signed distance to the nearest lake or river edge: + in the water, - on land. */
function waterEdge(x: number, z: number) {
  return Math.max(canalDist(RIVER, x, z), ...LAKES.map((l) => lakeDepthDist(l, x, z)));
}

/** Reeds: a dozen tall three-sided blades and three seed spikes on stems, vertex coloured, muted. */
export function reedGeometry() {
  const r = rng(515);
  const parts: THREE.BufferGeometry[] = [];
  const paint = (g: THREE.BufferGeometry, c: string) => {
    const col = new THREE.Color(c);
    const n = g.getAttribute("position").count;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([col.r, col.g, col.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(a, 3));
    g.deleteAttribute("uv");
    return g;
  };
  for (let i = 0; i < 12; i++) {
    const h = 0.8 + r() * 0.6;
    const g = new THREE.ConeGeometry(0.03, h, 3, 1);
    g.translate(0, h / 2, 0);
    g.rotateZ((r() - 0.5) * 0.5);
    g.rotateY(r() * Math.PI * 2);
    g.translate((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3);
    parts.push(paint(g, r() < 0.5 ? "#5c6a4b" : "#73805c")); // leaf dark / leaf
  }
  for (let i = 0; i < 3; i++) {
    const h = 1.1 + r() * 0.35;
    const stem = new THREE.CylinderGeometry(0.012, 0.012, h, 4);
    stem.translate(0, h / 2, 0);
    // a hard four-sided seed spike, not a soft cattail
    const head = new THREE.CylinderGeometry(0.03, 0.04, 0.2, 4);
    head.translate(0, h + 0.05, 0);
    const ox = (r() - 0.5) * 0.25;
    const oz = (r() - 0.5) * 0.25;
    stem.translate(ox, 0, oz);
    head.translate(ox, 0, oz);
    parts.push(paint(stem, "#8b9270"), paint(head, "#a9a08c")); // sage stem, dry gravel-toned spike
  }
  return mergeGeometries(parts);
}

/** A lily pad: a flat faceted disc with its notch. */
export function padGeometry() {
  const g = new THREE.CircleGeometry(0.34, 6, 0.35, Math.PI * 2 - 0.7);
  g.rotateX(-Math.PI / 2);
  return g;
}

const STONE = ["#d9d6ce", "#c6c2b8", "#b8b4a9"].map((c) => new THREE.Color(c)); // concrete to concrete dark
const PADS = ["#5c6a4b", "#73805c", "#68755a"].map((c) => new THREE.Color(c)); // leaf tones

export const WATERSIDE = (() => {
  const r = rng(9090);
  const reeds = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const rocks = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const pads = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const flowers: THREE.Matrix4[] = [];
  // walk the banks: sample around each lake and along the river, both sides
  const spots: [number, number][] = [];
  for (const l of LAKES)
    for (let a = 0; a < Math.PI * 2; a += 0.09) {
      const c = Math.cos(l.yaw);
      const sn = Math.sin(l.yaw);
      const u = Math.cos(a) * l.rx * (0.93 + r() * 0.1);
      const v = Math.sin(a) * l.rz * (0.93 + r() * 0.1);
      spots.push([l.x + u * c + v * sn, l.z - u * sn + v * c]);
    }
  for (let i = 0; i < RIVER.pts.length - 1; i++) {
    const [ax, az] = RIVER.pts[i];
    const [bx, bz] = RIVER.pts[i + 1];
    const l = Math.hypot(bx - ax, bz - az);
    const nx = -(bz - az) / l;
    const nz = (bx - ax) / l;
    for (let f = 0; f < l; f += 0.6) {
      const w = (RIVER.w[i] + (RIVER.w[i + 1] - RIVER.w[i]) * (f / l)) / 2;
      for (const s of [-1, 1]) spots.push([ax + ((bx - ax) * f) / l + nx * s * (w - 0.3 + r() * 0.6), az + ((bz - az) * f) / l + nz * s * (w - 0.3 + r() * 0.6)]);
    }
  }
  for (const [x, z] of spots) {
    const e = waterEdge(x, z);
    if (e < -1.4 || e > 0.6 || !clear(x, z)) continue;
    const roll = r();
    if (roll < 0.5) {
      const s = 0.8 + r() * 0.5;
      reeds.m.push(compose(x, Math.max(heightAt(x, z), SEA_Y - 0.3) - 0.05, z, r() * 6, s, s * (0.85 + r() * 0.3), s));
      reeds.c.push(new THREE.Color().setScalar(0.9 + r() * 0.15));
    } else if (roll < 0.58 && e < 0) {
      const s = 0.3 + r() * 0.5;
      rocks.m.push(compose(x, heightAt(x, z) + s * 0.1, z, r() * 6, s * 1.2, s * 0.6, s, (r() - 0.5) * 0.3));
      rocks.c.push(STONE[Math.floor(r() * STONE.length)]);
    }
  }
  // lily pads on the lake, out past the reeds
  for (const l of LAKES)
    for (let k = 0; k < 160 && pads.m.length < 26; k++) {
      const x = l.x + (r() * 2 - 1) * l.rx;
      const z = l.z + (r() * 2 - 1) * l.rx;
      const d = lakeDepthDist(l, x, z);
      if (d < 1.2 || d > 3.6) continue;
      if (pads.m.some((m) => Math.hypot(m.elements[12] - x, m.elements[14] - z) < 0.75)) continue;
      const s = 0.7 + r() * 0.6;
      pads.m.push(compose(x, SEA_Y + 0.015, z, r() * 6, s, 1, s));
      pads.c.push(PADS[Math.floor(r() * PADS.length)]);
      if (r() < 0.25) flowers.push(compose(x + 0.08 * s, SEA_Y + 0.07, z, r() * 6, 0.11, 0.08, 0.11));
    }
  return { reeds, rocks, pads, flowers };
})();
