"use client";

// The whole island in the Datasheet palette, for the start sequence's build-in: land from the
// coast outline, the circuit at true width, the pit lane, every building, the garages, groves,
// the floodlight masts, the lakes, the river and the sea. All of it is placed from the real
// world data (components/world/layout.ts, street/town.ts).
//
// The world first shows as a field of square dots in its own layout (the track's centreline and
// edges, the coast, building footprints, garages, trees, lakes and the river), then the solid
// geometry rises out of them and each piece's dots fade as it lands. Bloom (locked 2026-10-26):
// the dots bloom outward from the car by distance, and the geometry follows them outward.
// Repeated things are instanced, the dots are one draw call, and nothing sets React state per frame.
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { GARAGES, LAKES, PIT, PIT_LANE_WIDTH, RIVER, SEA_FLOOR, SEA_Y, START_T, TRACK_WIDTH, canalDist, coastR, lakeDepthDist, nearestT, pitRoadCurves, shoreDist, trackCurve, trackPoint, trackTangent } from "@/components/world/layout";
import { BUILDINGS } from "@/components/world/street/town";
import { FLOODS } from "@/components/world/street/layoutStreet";
import { Gantry, W } from "./models";

/** Maps the real clock to build seconds (frozen by `window.__buildT` in dev). */
export type BuildClock = (now: number) => number;

const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
const power2Out = (k: number) => 1 - (1 - k) * (1 - k);
const backOut = (k: number, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ the grid slot */

const TRACK_LEN = trackCurve.getLength();
/** The car's slot: 9 m behind the start line, on the left of the grid. */
const CAR_T = START_T - 9 / TRACK_LEN;
const carP = trackPoint(CAR_T);
const carF = trackTangent(CAR_T).setY(0).normalize();
const carN = new THREE.Vector3(-carF.z, 0, carF.x);
const slot = carP.clone().addScaledVector(carN, -TRACK_WIDTH * 0.2);
/** Where the vehicle waits: position, heading (rotation about y turning local +z forward), and forward. */
export const GRID = { x: slot.x, y: 0.09, z: slot.z, yaw: Math.atan2(carF.x, carF.z), fx: carF.x, fz: carF.z };

/** A point d metres down the track from the grid slot, in the same lane: position and heading. */
export function gridAhead(d: number, out = new THREE.Vector3()) {
  const t = CAR_T + d / TRACK_LEN;
  const p = trackPoint(t);
  const f = trackTangent(t).setY(0).normalize();
  out.set(p.x - f.z * -TRACK_WIDTH * 0.2, p.y + GRID.y, p.z + f.x * -TRACK_WIDTH * 0.2);
  return { p: out, yaw: Math.atan2(f.x, f.z) };
}

/* ------------------------------------------------------------------ the bloom: when a place arrives */

const COAST_RING = Array.from({ length: 360 }, (_, i) => {
  const a = (i / 360) * Math.PI * 2;
  const r = coastR(a);
  return [Math.cos(a) * r, Math.sin(a) * r] as const;
});
/** Furthest coast point from the car. */
const RMAX = Math.max(...COAST_RING.map(([x, z]) => Math.hypot(x - GRID.x, z - GRID.z))) + 14;
/** The island's middle and radius, for cameras that frame all of it. */
export const ISLAND = (() => {
  const xs = COAST_RING.map((p) => p[0]);
  const zs = COAST_RING.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  return { x: cx, z: cz, r: Math.max(...COAST_RING.map(([x, z]) => Math.hypot(x - cx, z - cz))) };
})();

/** arrive = a + b * s, where s runs 0..1 outward from the car. */
type Wave = { a: number; b: number };
const RAD_POW = 1.3;
const waveS = (x: number, z: number) => Math.pow(Math.min(1, Math.hypot(x - GRID.x, z - GRID.z) / RMAX), 1 / RAD_POW);
const at = (w: Wave, x: number, z: number) => w.a + w.b * waveS(x, z);

/** The bloom's timeline (s). */
export const PLAN = {
  /** when the dots arrive */
  dot: { a: 0.3, b: 2.1 } as Wave,
  /** when the flat land, coast and water arrive, and the outward extrude of everything else */
  solid: { a: 1.05, b: 2.35 } as Wave,
  water0: 3.2,
  /** when the camera settles on the game's chase view */
  camEnd: 4.7,
};

/* ------------------------------------------------------------------ shader reveal for flat things */

/** Shared by every reveal shader; the Driver writes them once a frame. */
const U = {
  uTime: { value: 0 },
  uA: { value: PLAN.solid.a },
  uB: { value: PLAN.solid.b },
  uC: { value: new THREE.Vector2(GRID.x, GRID.z) },
  uR: { value: RMAX },
};
const ARRIVE_GLSL = `
uniform float uTime; uniform float uA; uniform float uB; uniform vec2 uC; uniform float uR;
float arrive(vec2 p){
  return uA + uB * pow(min(1.0, distance(p, uC) / uR), ${(1 / RAD_POW).toFixed(5)});
}`;

/** Discards fragments the wave hasn't reached (or, for the paper floor, the ones it has). */
function reveal<M extends THREE.Material>(m: M, inside = false): M {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vRw;").replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      {
        vec4 rw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          rw = instanceMatrix * rw;
        #endif
        vRw = (modelMatrix * rw).xz;
      }`,
    );
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec2 vRw;\n${ARRIVE_GLSL}`)
      .replace("void main() {", `void main() {\n  if (arrive(vRw) ${inside ? "<=" : ">"} uTime) discard;`);
  };
  m.customProgramCacheKey = () => (inside ? "wave-in" : "wave-out");
  return m;
}

/** Discards fragments whose own arrival time (a vertex attribute, aT) is still ahead. */
function revealAttr<M extends THREE.Material>(m: M): M {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aT;\nvarying float vT;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvT = aT;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vT;\nuniform float uTime;").replace("void main() {", "void main() {\n  if (vT > uTime) discard;");
  };
  m.customProgramCacheKey = () => "attr-t";
  return m;
}

const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, ...extra });

const MAT = {
  land: reveal(std(W.concrete)),
  grass: reveal(std(W.grass)),
  water: reveal(std(W.paper, { roughness: 0.35 })),
  lines: reveal(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide })),
  track: revealAttr(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide })),
  solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
  faceted: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }),
  sea: std(W.paper, { roughness: 0.4 }),
};
const FLOOR_C = new THREE.Color("#ebe9e3");
/** Lakes and the river are dry rule-grey basins until the water comes in. */
const BASIN_C = new THREE.Color("#cfcdc4");
const WATER_C = new THREE.Color(W.water);

/* ------------------------------------------------------------------ geometry helpers */

const col = (hex: string) => new THREE.Color(hex);
const C = { asphalt: col(W.asphalt), paper: col(W.paper), ink: col(W.ink), orange: col(W.orange), pit: col("#55565a"), concrete: col(W.concrete), concreteDark: col(W.concreteDark), leaf: col(W.leaf), leafLight: col(W.leafLight), graphite: col(W.graphite) };

/** Paints a geometry one colour (as a non-indexed vertex-colour part, ready to merge). */
function paint(g: THREE.BufferGeometry, c: THREE.Color) {
  const out = g.index ? g.toNonIndexed() : g;
  const n = out.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(a, i * 3);
  out.setAttribute("color", new THREE.BufferAttribute(a, 3));
  out.deleteAttribute("uv");
  return out;
}

function merge(parts: THREE.BufferGeometry[]) {
  let n = 0;
  for (const p of parts) n += p.attributes.position.count;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const colr = new Float32Array(n * 3);
  let o = 0;
  for (const p of parts) {
    pos.set(p.attributes.position.array as Float32Array, o * 3);
    nor.set(p.attributes.normal.array as Float32Array, o * 3);
    colr.set(p.attributes.color.array as Float32Array, o * 3);
    o += p.attributes.position.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.BufferAttribute(colr, 3));
  return g;
}

const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: THREE.Color) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c);

/** Flat strips along a polyline: each strip is [from, to] across it, at a height, in a colour per segment. */
type Strip = { a: number; b: number; y: number; color: (i: number) => THREE.Color };
function ribbon(pts: THREE.Vector3[], strips: Strip[], closed: boolean, width?: (i: number) => number) {
  const n = pts.length;
  const segs = closed ? n : n - 1;
  const norms = pts.map((_, i) => {
    const p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const p1 = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    return new THREE.Vector3(-(p1.z - p0.z), 0, p1.x - p0.x).normalize();
  });
  const per = strips.length * 6;
  const pos = new Float32Array(segs * per * 3);
  const colr = new Float32Array(segs * per * 3);
  const nor = new Float32Array(segs * per * 3);
  for (let i = 0; i < nor.length; i += 3) nor[i + 1] = 1;
  let o = 0;
  const put = (v: THREE.Vector3, c: THREE.Color) => {
    v.toArray(pos, o * 3);
    c.toArray(colr, o * 3);
    o++;
  };
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n;
    const wi = width ? width(i) : 1;
    const wj = width ? width(j) : 1;
    for (const s of strips) {
      const c = s.color(i);
      v[0].copy(pts[i]).addScaledVector(norms[i], s.a * wi).setY(pts[i].y + s.y);
      v[1].copy(pts[i]).addScaledVector(norms[i], s.b * wi).setY(pts[i].y + s.y);
      v[2].copy(pts[j]).addScaledVector(norms[j], s.b * wj).setY(pts[j].y + s.y);
      v[3].copy(pts[j]).addScaledVector(norms[j], s.a * wj).setY(pts[j].y + s.y);
      for (const k of [0, 1, 2, 0, 2, 3]) put(v[k], c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.BufferAttribute(colr, 3));
  return { geo: g, per, norms };
}

const coastPts = (inset: number, n = 360) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = coastR(a) - inset;
    return new THREE.Vector2(Math.cos(a) * r, -Math.sin(a) * r); // shape space: y = -z
  });

/* ------------------------------------------------------------------ data, built once */

type Item = { x: number; y?: number; z: number; yaw: number; sx: number; sy: number; sz: number; seed: number; seg?: number };
type Timed = Item & { at: number };

/** Dot groups: what a dot belongs to decides when it shows and when it fades. */
const G = { track: 0, coast: 1, water: 2, pit: 3, building: 4, garage: 5, mast: 6, pine: 7, round: 8 } as const;

let baseCache: ReturnType<typeof buildBase> | null = null;
const base = () => (baseCache ??= buildBase());

function buildBase() {
  const HW = TRACK_WIDTH / 2;
  const r = rng(808);

  // the track as one ribbon; each segment gets its arrival time as a vertex attribute
  const N = 1100;
  const pts = Array.from({ length: N }, (_, i) => trackPoint(i / N));
  const turn = pts.map((_, i) => {
    const a = trackTangent(((i - 4 + N) % N) / N);
    const b = trackTangent(((i + 4) % N) / N);
    return a.angleTo(b);
  });
  const kerbColor = (i: number) => (turn[i] > 0.13 ? (Math.floor(i / 2) % 2 ? C.paper : C.ink) : C.ink);
  const strips: Strip[] = [
    { a: -HW - 0.9, b: -HW, y: 0.06, color: kerbColor },
    { a: HW, b: HW + 0.9, y: 0.06, color: kerbColor },
    { a: -HW, b: HW, y: 0.08, color: () => C.asphalt },
    { a: -HW + 0.3, b: -HW + 0.55, y: 0.1, color: () => C.paper },
    { a: HW - 0.55, b: HW - 0.3, y: 0.1, color: () => C.paper },
  ];
  const raw = ribbon(pts, strips, true);
  const iStart = Math.round(START_T * N) % N;
  const segMid = pts.map((p, i) => {
    const q = pts[(i + 1) % N];
    return [(p.x + q.x) / 2, (p.z + q.z) / 2] as const;
  });

  // pit lane and its two link roads
  const PW = PIT_LANE_WIDTH / 2;
  const pitStrips: Strip[] = [
    { a: -PW - 0.5, b: PW + 0.5, y: 0.05, color: () => C.ink },
    { a: -PW, b: PW, y: 0.07, color: () => C.pit },
    { a: -PW + 0.25, b: -PW + 0.45, y: 0.085, color: () => C.paper },
    { a: PW - 0.45, b: PW - 0.25, y: 0.085, color: () => C.paper },
  ];
  const lane = Array.from({ length: 40 }, (_, k) => new THREE.Vector3(PIT.from + ((PIT.to - PIT.from) * k) / 39, 0, PIT.z));
  const pitLines = [lane, ...pitRoadCurves().map((c) => c.getPoints(24))];
  const pit = merge(pitLines.map((l) => ribbon(l, pitStrips, false).geo));

  // land: a concrete slab from the coast, a grass inset, an ink coast line
  const slab = new THREE.ExtrudeGeometry(new THREE.Shape(coastPts(0)), { depth: -SEA_FLOOR, bevelEnabled: false, curveSegments: 1 });
  const grass = new THREE.ShapeGeometry(new THREE.Shape(coastPts(5)));
  const coastLine = ribbon(
    coastPts(0, 360).map((v) => new THREE.Vector3(v.x, 0, -v.y)),
    [{ a: -0.9, b: 0, y: 0.045, color: () => C.ink }],
    true,
  ).geo;

  // water: the river as a ribbon at its widths, the lakes as ellipses
  const riverPts = RIVER.pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const riverRib = ribbon(riverPts, [{ a: -0.5, b: 0.5, y: 0.04, color: () => C.paper }], false, (i) => RIVER.w[i]);
  const river = riverRib.geo;

  // buildings: concrete bodies, an ink roof rim, a darker roof deck. Unit box, scaled per instance.
  const bld = merge([box(1, 1, 1, 0, 0.5, 0, C.concrete), box(1.04, 0.035, 1.04, 0, 1.0175, 0, C.ink), box(0.92, 0.01, 0.92, 0, 1.04, 0, C.concreteDark)]);
  const buildings: Item[] = BUILDINGS.map((b) => ({ x: b.x, z: b.z, yaw: b.yaw, sx: b.w, sy: b.h, sz: b.d, seed: r() }));

  // garages: an ink row facing the pit lane, paper doors, one orange line
  const gar = merge([box(1, 1, 1, 0, 0.5, 0, C.ink), box(0.8, 0.62, 0.02, 0, 0.31, 0.5, C.paper), box(1.002, 0.05, 0.02, 0, 0.8, 0.505, C.orange)]);
  const garages: Item[] = GARAGES.map((g) => ({ x: g.x, z: PIT.garageZ - 5.5, yaw: 0, sx: 9, sy: 5.2, sz: 7, seed: r() }));

  // floodlight masts: every tower of the real world, ink poles, a paper lamp bank
  const mast = merge([
    box(1.1, 0.3, 1.1, 0, 0.15, 0, C.concreteDark),
    paint(new THREE.CylinderGeometry(0.11, 0.19, 11, 6).translate(0, 5.5, 0), C.ink),
    box(2.6, 1.4, 0.3, 0, 11.3, 0.25, C.ink),
    box(2.3, 1.1, 0.04, 0, 11.3, 0.42, C.paper),
  ]);
  const masts: Item[] = FLOODS.map((f) => ({ x: f.x, z: f.z, yaw: f.yaw, sx: 1, sy: 1, sz: 1, seed: r() }));

  // bridge piers under the raised loop
  const pier = merge([box(1, 1, 1, 0, 0.5, 0, C.ink)]);
  const piers: Item[] = [];
  for (let i = 0; i < N; i += 7) {
    const p = pts[i];
    if (p.y < 1.2) continue;
    const tan = trackTangent(i / N);
    piers.push({ x: p.x, z: p.z, yaw: Math.atan2(tan.x, tan.z), sx: TRACK_WIDTH * 0.7, sy: p.y + 0.05, sz: 0.7, seed: 0, seg: i });
  }

  // trees: groves and strays on the grass, clear of the track, the town, the pit and the water
  const clear = (x: number, z: number) => {
    if (shoreDist(x, z) < 6) return false;
    if (nearestT(x, z).dist < TRACK_WIDTH / 2 + 5) return false;
    if (LAKES.some((l) => lakeDepthDist(l, x, z) > -2.5)) return false;
    if (canalDist(RIVER, x, z) > -2.5) return false;
    if (z > PIT.garageZ - 13 && z < PIT.z + 5 && x > PIT.from - 8 && x < PIT.to + 8) return false;
    if (BUILDINGS.some((b) => Math.hypot(b.x - x, b.z - z) < Math.hypot(b.w, b.d) / 2 + 1.6)) return false;
    if (FLOODS.some((f) => Math.hypot(f.x - x, f.z - z) < 2.2)) return false;
    return true;
  };
  const spots: [number, number, number][] = [];
  const groves: [number, number][] = [];
  for (let k = 0; k < 400 && groves.length < 46; k++) {
    const a = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * coastR(a);
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad;
    if (clear(x, z)) groves.push([x, z]);
  }
  for (let k = 0; k < 9000 && spots.length < 560; k++) {
    let x: number;
    let z: number;
    if (r() < 0.72) {
      const [gx, gz] = groves[Math.floor(r() * groves.length)];
      const a = r() * Math.PI * 2;
      const d = Math.pow(r(), 0.7) * 11;
      x = gx + Math.cos(a) * d;
      z = gz + Math.sin(a) * d;
    } else {
      const a = r() * Math.PI * 2;
      const rad = Math.sqrt(r()) * coastR(a);
      x = Math.cos(a) * rad;
      z = Math.sin(a) * rad;
    }
    if (spots.some(([sx, sz]) => (sx - x) ** 2 + (sz - z) ** 2 < 5.3)) continue;
    if (!clear(x, z)) continue;
    spots.push([x, z, 0.75 + r() * 0.6]);
  }
  const pine = merge([paint(new THREE.CylinderGeometry(0.1, 0.14, 1.2, 5).translate(0, 0.6, 0), C.graphite), paint(new THREE.ConeGeometry(1.25, 3.8, 6).translate(0, 2.9, 0), C.leaf)]);
  const round = merge([paint(new THREE.CylinderGeometry(0.11, 0.16, 1.6, 5).translate(0, 0.8, 0), C.graphite), paint(new THREE.IcosahedronGeometry(1.55, 0).translate(0, 2.7, 0), C.leafLight)]);
  const pines: Item[] = [];
  const rounds: Item[] = [];
  for (const [x, z, s] of spots) {
    const it = { x, z, yaw: r() * 6.28, sx: s, sy: s * (0.9 + r() * 0.3), sz: s, seed: r() };
    (r() < 0.45 ? pines : rounds).push(it);
  }

  /* ---------------- the dots: the world's layout as square points */
  const dp: number[] = []; // x, y, z
  const dGroup: number[] = [];
  const dRef: number[] = []; // track segment or item index
  const dSize: number[] = [];
  const dHot: number[] = []; // 1 = orange
  const dot = (x: number, y: number, z: number, group: number, ref: number, size = 1, hot = 0) => {
    dp.push(x, y + 0.18, z);
    dGroup.push(group);
    dRef.push(ref);
    dSize.push(size);
    dHot.push(hot);
  };
  // track: the centreline every 4 m, both edges every 2 m, following the curves (and the bridge)
  const segLen = TRACK_LEN / N;
  for (let i = 0; i < N; i++) {
    const p = pts[i];
    const n = raw.norms[i];
    const along = i * segLen;
    if (Math.floor(along / 2) !== Math.floor((along + segLen) / 2)) {
      for (const s of [-HW - 0.45, HW + 0.45]) dot(p.x + n.x * s, p.y, p.z + n.z * s, G.track, i, 1);
    }
    if (Math.floor(along / 4) !== Math.floor((along + segLen) / 4)) dot(p.x, p.y, p.z, G.track, i, 0.75);
  }
  // the start line and the car's grid slot, in orange
  {
    const sp = trackPoint(START_T);
    const sf = trackTangent(START_T).setY(0).normalize();
    const sn = new THREE.Vector3(-sf.z, 0, sf.x);
    for (let k = 0; k <= 10; k++) {
      const s = -HW + (k / 10) * TRACK_WIDTH;
      dot(sp.x + sn.x * s, sp.y, sp.z + sn.z * s, G.track, iStart, 1.15, 1);
    }
    const hl = 3.0;
    const hw = 1.5;
    for (let k = 0; k < 16; k++) {
      const u = k / 16;
      // walk the slot's outline: 2 long sides and 2 short ones
      const per = 2 * (2 * hl + 2 * hw);
      let d = u * per;
      let lx: number;
      let lz: number;
      if (d < 2 * hl) [lx, lz] = [-hw, -hl + d];
      else if ((d -= 2 * hl) < 2 * hw) [lx, lz] = [-hw + d, hl];
      else if ((d -= 2 * hw) < 2 * hl) [lx, lz] = [hw, hl - d];
      else [lx, lz] = [hw - (d - 2 * hl), -hl];
      dot(GRID.x + carN.x * lx + GRID.fx * lz, carP.y, GRID.z + carN.z * lx + GRID.fz * lz, G.track, Math.round(CAR_T * N + N) % N, 1.15, 1);
    }
  }
  // pit lane centreline (each dot still draws from the seeded sequence, so the jitter below is unchanged)
  for (const l of pitLines) {
    const c = new THREE.CatmullRomCurve3(l);
    const len = c.getLength();
    for (let k = 0, m = Math.floor(len / 3); k <= m; k++) {
      const p = c.getPointAt(k / m);
      r();
      dot(p.x, 0, p.z, G.pit, 0, 0.8);
    }
  }
  // coast: every 2.2 m
  {
    const len = COAST_RING.reduce((s, p, i) => s + Math.hypot(p[0] - COAST_RING[(i + 1) % 360][0], p[1] - COAST_RING[(i + 1) % 360][1]), 0);
    const n = Math.round(len / 2.2);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const rr = coastR(a) - 0.6;
      dot(Math.cos(a) * rr, 0, Math.sin(a) * rr, G.coast, 0, 0.9);
    }
  }
  // lakes: the shore, and a sparse grid on the water
  for (const l of LAKES) {
    const n = Math.round((Math.PI * (l.rx + l.rz)) / 1.6);
    r();
    const cy = Math.cos(l.yaw);
    const sy = Math.sin(l.yaw);
    // the lake mesh is a circle in its own plane (scaled rx, rz, turned by yaw), laid flat: plane y = -world z
    const put = (px: number, py: number, size: number) => dot(l.x + px * cy - py * sy, 0, l.z - (px * sy + py * cy), G.water, 0, size);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      put(Math.cos(a) * l.rx, Math.sin(a) * l.rz, 0.9);
    }
    for (let gx = -l.rx; gx <= l.rx; gx += 2.4)
      for (let gz = -l.rz; gz <= l.rz; gz += 2.4) if ((gx / l.rx) ** 2 + (gz / l.rz) ** 2 < 0.6) put(gx, gz, 0.6);
  }
  // river: both banks and the middle
  {
    const c = new THREE.CatmullRomCurve3(riverPts, false, "catmullrom", 0);
    const len = c.getLength();
    const m = Math.floor(len / 2.2);
    r();
    for (let k = 0; k <= m; k++) {
      const u = k / m;
      const p = c.getPointAt(u);
      const tan = c.getTangentAt(u);
      const f = u * (RIVER.pts.length - 1);
      const i = Math.min(RIVER.pts.length - 2, Math.floor(f));
      const w = (RIVER.w[i] + (RIVER.w[i + 1] - RIVER.w[i]) * (f - i)) / 2;
      dot(p.x - tan.z * w, 0, p.z + tan.x * w, G.water, 0, 0.9);
      dot(p.x + tan.z * w, 0, p.z - tan.x * w, G.water, 0, 0.9);
      if (k % 2 === 0) dot(p.x, 0, p.z, G.water, 0, 0.6);
    }
  }
  // footprints: the outline of every building and garage, a dot at each corner and every ~2 m
  const footprint = (it: Item, group: number, ref: number) => {
    const c = Math.cos(it.yaw);
    const s = Math.sin(it.yaw);
    const hx = it.sx / 2;
    const hz = it.sz / 2;
    const corners: [number, number][] = [
      [-hx, -hz],
      [hx, -hz],
      [hx, hz],
      [-hx, hz],
    ];
    for (let e = 0; e < 4; e++) {
      const [ax, az] = corners[e];
      const [bx, bz] = corners[(e + 1) % 4];
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 2));
      for (let k = 0; k < n; k++) {
        const lx = ax + ((bx - ax) * k) / n;
        const lz = az + ((bz - az) * k) / n;
        dot(it.x + lx * c + lz * s, 0, it.z - lx * s + lz * c, group, ref, k === 0 ? 1 : 0.8);
      }
    }
  };
  buildings.forEach((b, i) => footprint(b, G.building, i));
  garages.forEach((g, i) => footprint(g, G.garage, i));
  masts.forEach((m, i) => dot(m.x, 0, m.z, G.mast, i, 1));
  pines.forEach((t, i) => dot(t.x, 0, t.z, G.pine, i, 1.1));
  rounds.forEach((t, i) => dot(t.x, 0, t.z, G.round, i, 1.1));

  const dots = {
    count: dGroup.length,
    pos: new THREE.BufferAttribute(new Float32Array(dp), 3),
    size: new THREE.BufferAttribute(new Float32Array(dSize), 1),
    hot: new THREE.BufferAttribute(new Float32Array(dHot), 1),
    group: dGroup,
    ref: dRef,
    jitter: dGroup.map(() => r()),
  };

  return { N, pts, segMid, raw, pit, slab, grass, coastLine, river, bld, buildings, gar, garages, mast, masts, pier, piers, pine, pines, round, rounds, dots };
}

/* ------------------------------------------------------------------ timings */

let planCache: ReturnType<typeof buildPlan> | null = null;
const plan = () => (planCache ??= buildPlan());

function buildPlan() {
  const B = base();
  const P = PLAN;

  // track segments follow the wave outward
  const segT = B.segMid.map(([x, z]) => at(P.solid, x, z));
  const track = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "color"]) track.setAttribute(name, B.raw.geo.attributes[name]);
  const aT = new Float32Array(B.N * B.raw.per);
  for (let i = 0; i < B.N; i++) aT.fill(segT[i], i * B.raw.per, (i + 1) * B.raw.per);
  track.setAttribute("aT", new THREE.BufferAttribute(aT, 1));

  // things that stand up: when their dots show, then when they rise
  const timed = (items: Item[], off: number) => {
    const dotAt = items.map((it) => at(P.dot, it.x, it.z));
    const list: Timed[] = items.map((it, i) => ({ ...it, at: Math.max(it.seg !== undefined ? segT[it.seg] : at(P.solid, it.x, it.z) + off, dotAt[i] + 0.35) }));
    return { dotAt, list };
  };
  const buildings = timed(B.buildings, 0.04);
  const garages = timed(B.garages, 0.04);
  const masts = timed(B.masts, 0.18);
  const pines = timed(B.pines, 0.08);
  const rounds = timed(B.rounds, 0.08);
  const piers = timed(B.piers, 0);
  const itemsOf = [null, null, null, null, buildings, garages, masts, pines, rounds];

  // every dot: when it shows (aDot) and when its piece lands and it fades (aSolid)
  const D = B.dots;
  const aDot = new Float32Array(D.count);
  const aSolid = new Float32Array(D.count);
  const pa = D.pos.array as Float32Array;
  for (let k = 0; k < D.count; k++) {
    const x = pa[k * 3];
    const z = pa[k * 3 + 2];
    const g = D.group[k];
    const j = D.jitter[k];
    const own = itemsOf[g];
    if (own) {
      aDot[k] = own.dotAt[D.ref[k]] + j * 0.05;
      aSolid[k] = own.list[D.ref[k]].at;
      continue;
    }
    aDot[k] = at(P.dot, x, z) + j * 0.04;
    aSolid[k] = Math.max(g === G.track ? segT[D.ref[k]] : at(P.solid, x, z), aDot[k] + 0.35);
  }
  const dots = new THREE.BufferGeometry();
  dots.setAttribute("position", D.pos);
  dots.setAttribute("aSize", D.size);
  dots.setAttribute("aHot", D.hot);
  dots.setAttribute("aDot", new THREE.BufferAttribute(aDot, 1));
  dots.setAttribute("aSolid", new THREE.BufferAttribute(aSolid, 1));

  const first = (xs: Timed[]) => Math.min(...xs.map((i) => i.at));
  const firstDot = Math.min(...aDot);
  const gantryP = trackPoint(START_T);
  const gantryAt = at(P.solid, gantryP.x, gantryP.z) + 0.25;
  return {
    track,
    dots,
    buildings: buildings.list,
    garages: garages.list,
    masts: masts.list,
    pines: pines.list,
    rounds: rounds.list,
    piers: piers.list,
    gantryAt,
    log: { firstDot, track: Math.min(...segT), town: first(buildings.list), garages: first(garages.list), trees: Math.min(first(pines.list), first(rounds.list)), lights: first(masts.list) },
  };
}

/** The build log: what arrives when (ms), in order. */
export const BUILD_LOG = (): [string, number][] => {
  const L = plan().log;
  const rows: [string, number][] = [
    ["Bloom", L.firstDot],
    ["Track", L.track],
    ["Town", L.town],
    ["Garages", L.garages],
    ["Trees", L.trees],
    ["Lights", L.lights],
    ["Water", PLAN.water0],
    ["Game cam", PLAN.camEnd - 0.2],
  ];
  return rows.map(([s, t]) => [s, Math.round(t * 20) * 50] as [string, number]).sort((a, b) => a[1] - b[1]);
};

/* ------------------------------------------------------------------ pieces */

type Mode = "grow" | "pop" | "lift";
const m4 = new THREE.Matrix4();
const q4 = new THREE.Quaternion();
const p3 = new THREE.Vector3();
const s3 = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** Many copies of one geometry, each arriving at its own time. One draw call. */
function Pops({ geo, mat, items, mode, dur, clock, shadow = true }: { geo: THREE.BufferGeometry; mat: THREE.Material; items: Timed[]; mode: Mode; dur: number; clock: BuildClock; shadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const last = useRef(-1);
  const end = useMemo(() => Math.max(...items.map((i) => i.at)) + dur, [items, dur]);
  useFrame((s) => {
    const t = clock(s.clock.elapsedTime);
    if (t === last.current || (t > end && last.current > end)) return;
    last.current = t;
    const im = ref.current;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const k = clamp01((t - it.at) / dur);
      q4.setFromAxisAngle(UP, it.yaw);
      p3.set(it.x, it.y ?? 0, it.z);
      if (k <= 0) s3.set(0, 0, 0);
      else if (mode === "grow") s3.set(it.sx, it.sy * Math.max(1e-3, backOut(k, 1.6)), it.sz);
      else if (mode === "pop") s3.set(it.sx, it.sy, it.sz).multiplyScalar(Math.max(1e-3, backOut(k, 2.4)));
      else {
        s3.set(it.sx, it.sy, it.sz);
        p3.y -= 12 * (1 - backOut(k, 1.3));
      }
      im.setMatrixAt(i, m4.compose(p3, q4, s3));
    }
    im.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} castShadow={shadow} receiveShadow frustumCulled={false} />;
}

/** One object lifting in through the ground at its time. */
function Lift({ at: t0, depth, clock, children }: { at: number; depth: number; clock: BuildClock; children: ReactNode }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((s) => {
    const k = clamp01((clock(s.clock.elapsedTime) - t0) / 0.6);
    g.current.visible = k > 0;
    g.current.position.y = -depth * (1 - backOut(k, 1.3));
  });
  return (
    <group ref={g} visible={false}>
      {children}
    </group>
  );
}

/** Grid slots and the orange start line: they arrive with the ground under the car. */
function GridMarks() {
  const g = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const startP = trackPoint(START_T);
    const startF = trackTangent(START_T).setY(0).normalize();
    const yaw = Math.atan2(startF.x, startF.z);
    const put = (geo: THREE.BufferGeometry, x: number, z: number) => {
      geo.rotateY(yaw).translate(x, 0, z);
      parts.push(geo);
    };
    put(box(TRACK_WIDTH, 0.02, 0.9, 0, 0.11, 0, C.orange), startP.x, startP.z);
    for (let k = 0; k < 6; k++) {
      const p = trackPoint(CAR_T - (k * 7) / TRACK_LEN + 3.2 / TRACK_LEN);
      const side = k % 2 ? 0.2 : -0.2;
      const x = p.x + carN.x * side * TRACK_WIDTH;
      const z = p.z + carN.z * side * TRACK_WIDTH;
      put(box(2.4, 0.02, 0.18, 0, 0.11, 0, C.paper), x, z);
      put(box(0.18, 0.02, 1.4, side < 0 ? -1.1 : 1.1, 0.11, -0.7, C.paper), x, z);
    }
    return merge(parts);
  }, []);
  return <mesh geometry={g} material={MAT.lines} receiveShadow />;
}

/* ------------------------------------------------------------------ the dots */

const dotMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: { uTime: U.uTime, uDpr: { value: 1 }, uInk: { value: new THREE.Color(W.ink) }, uHot: { value: new THREE.Color(W.orange) } },
  vertexShader: `
    attribute float aSize; attribute float aHot; attribute float aDot; attribute float aSolid;
    uniform float uTime; uniform float uDpr; uniform vec3 uInk; uniform vec3 uHot;
    varying vec3 vCol; varying float vA;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      float age = uTime - aDot;
      float gone = clamp((uTime - aSolid) / 0.5, 0.0, 1.0);
      vA = step(0.0, age) * (1.0 - gone);
      // a square dot a few pixels wide at any distance; it lands with a small overshoot
      float px = clamp(1100.0 / -mv.z, 2.2, 6.0) * aSize;
      float pop = 1.0 + 0.9 * exp(-max(age, 0.0) * 9.0);
      gl_PointSize = vA > 0.0 ? px * pop * (1.0 - 0.4 * gone) * uDpr : 0.0;
      // it lights up orange as it appears, then settles to ink (the start marks stay orange)
      vCol = mix(uInk, uHot, max(aHot, 1.0 - smoothstep(0.05, 0.32, age)));
    }`,
  fragmentShader: `
    varying vec3 vCol; varying float vA;
    void main(){
      if (vA <= 0.0) discard;
      gl_FragColor = vec4(vCol, vA);
      #include <colorspace_fragment>
    }`,
});

function Dots({ geo }: { geo: THREE.BufferGeometry }) {
  return <points geometry={geo} material={dotMat} frustumCulled={false} renderOrder={4} />;
}

/** Writes the shared uniforms once a frame: the clock and the water. */
function Driver({ clock }: { clock: BuildClock }) {
  useFrame((s) => {
    const t = clock(s.clock.elapsedTime);
    U.uTime.value = t;
    dotMat.uniforms.uDpr.value = s.gl.getPixelRatio();
    const w = power2Out(clamp01((t - PLAN.water0) / 0.9));
    MAT.water.color.copy(BASIN_C).lerp(WATER_C, w);
    MAT.sea.color.copy(FLOOR_C).lerp(WATER_C, w);
  });
  return null;
}

/* ------------------------------------------------------------------ the island */

/** The paper dot floor: everywhere the world hasn't arrived yet. */
export function PaperFloor({ map }: { map: THREE.Texture | null }) {
  const mat = useMemo(() => reveal(new THREE.MeshBasicMaterial({ map }), true), [map]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={mat}>
      <planeGeometry args={[900, 900]} />
    </mesh>
  );
}

export function Island({ clock }: { clock: BuildClock }) {
  const B = base();
  const P = plan();
  const gantryP = trackPoint(START_T);
  return (
    <>
      <Driver clock={clock} />
      <Dots geo={P.dots} />
      {/* sea under everything: paper until the water fades in */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_Y, 0]} material={MAT.sea}>
        <planeGeometry args={[1400, 1400]} />
      </mesh>
      {/* land */}
      <mesh geometry={B.slab} material={MAT.land} rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_FLOOR, 0]} receiveShadow />
      <mesh geometry={B.grass} material={MAT.grass} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow />
      <mesh geometry={B.coastLine} material={MAT.lines} />
      {/* water inside the land */}
      <mesh geometry={B.river} material={MAT.water} receiveShadow />
      {LAKES.map((l, k) => (
        <mesh key={k} material={MAT.water} position={[l.x, 0.04, l.z]} rotation={[-Math.PI / 2, 0, l.yaw]} scale={[l.rx, l.rz, 1]}>
          <circleGeometry args={[1, 40]} />
        </mesh>
      ))}
      {/* roads */}
      <mesh geometry={P.track} material={MAT.track} receiveShadow frustumCulled={false} />
      <mesh geometry={B.pit} material={MAT.lines} receiveShadow />
      <GridMarks />
      <Pops geo={B.pier} mat={MAT.solid} items={P.piers} mode="grow" dur={0.4} clock={clock} />
      {/* town, garages, groves, masts */}
      <Pops geo={B.bld} mat={MAT.solid} items={P.buildings} mode="grow" dur={0.75} clock={clock} />
      <Pops geo={B.gar} mat={MAT.solid} items={P.garages} mode="grow" dur={0.7} clock={clock} />
      <Pops geo={B.pine} mat={MAT.faceted} items={P.pines} mode="pop" dur={0.45} clock={clock} />
      <Pops geo={B.round} mat={MAT.faceted} items={P.rounds} mode="pop" dur={0.45} clock={clock} />
      <Pops geo={B.mast} mat={MAT.solid} items={P.masts} mode="lift" dur={0.6} clock={clock} />
      <group position={[gantryP.x, 0, gantryP.z]} rotation={[0, GRID.yaw, 0]}>
        <Lift at={P.gantryAt} depth={8} clock={clock}>
          <Gantry />
        </Lift>
      </group>
    </>
  );
}
