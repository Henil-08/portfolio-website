"use client";

// The whole island in the Datasheet palette, for the start sequence's build-in: land from the
// coast outline, the circuit at true width, the pit lane, every building, the garages, groves,
// the floodlight masts, the lakes, the river and the sea. All of it is placed from the real
// world data (components/world/layout.ts, street/town.ts) and arrives when an orange
// shockwave ring, centred on the car on the start grid, reaches it. Repeated things are
// instanced; nothing sets React state per frame.
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

/* ------------------------------------------------------------------ the grid slot and the clock */

const TRACK_LEN = trackCurve.getLength();
/** The car's slot: 9 m behind the start line, on the left of the grid. */
const CAR_T = START_T - 9 / TRACK_LEN;
const carP = trackPoint(CAR_T);
const carF = trackTangent(CAR_T).setY(0).normalize();
const carN = new THREE.Vector3(-carF.z, 0, carF.x);
const slot = carP.clone().addScaledVector(carN, -TRACK_WIDTH * 0.2);
/** Where the vehicle waits: position, heading (rotation about y turning local +z forward), and forward. */
export const GRID = { x: slot.x, y: 0.09, z: slot.z, yaw: Math.atan2(carF.x, carF.z), fx: carF.x, fz: carF.z };

/** Furthest coast point from the car: the ring has to reach it. */
const RMAX = (() => {
  let m = 0;
  for (let i = 0; i < 360; i++) {
    const a = (i / 360) * Math.PI * 2;
    const r = coastR(a);
    m = Math.max(m, Math.hypot(Math.cos(a) * r - GRID.x, Math.sin(a) * r - GRID.z));
  }
  return m + 14;
})();

/** Build timeline, seconds. */
export const T = {
  ring0: 0.45, // the ring leaves the car
  ringDur: 3.0, // and reaches the furthest coast
  water0: 3.05, // the sea fades in last
  waterDur: 0.9,
  cam0: 0.2, // camera: close orbit -> high arc -> chase
  camDur: 4.55,
};
const RING_POW = 1.3;
/** Ring radius (m) at build time t. */
export const ringR = (t: number) => RMAX * Math.pow(clamp01((t - T.ring0) / T.ringDur), RING_POW);
/** When the ring reaches a point d metres from the car. */
const reach = (d: number) => T.ring0 + T.ringDur * Math.pow(Math.min(1, d / RMAX), 1 / RING_POW);
const reachAt = (x: number, z: number) => reach(Math.hypot(x - GRID.x, z - GRID.z));

/* ------------------------------------------------------------------ ring reveal for flat things */

const RING = { uRing: { value: 0 }, uC: { value: new THREE.Vector2(GRID.x, GRID.z) } };

/** Discards fragments outside the ring (or inside it, for the paper floor). */
function reveal<M extends THREE.Material>(m: M, inside = false): M {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRing = RING.uRing;
    sh.uniforms.uC = RING.uC;
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
      .replace("#include <common>", "#include <common>\nvarying vec2 vRw;\nuniform float uRing;\nuniform vec2 uC;")
      .replace("void main() {", `void main() {\n  if (distance(vRw, uC) ${inside ? "<" : ">"} uRing) discard;`);
  };
  m.customProgramCacheKey = () => (inside ? "ring-in" : "ring-out");
  return m;
}

const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, ...extra });

const MAT = {
  land: reveal(std(W.concrete)),
  grass: reveal(std(W.grass)),
  ink: reveal(std(W.ink, { roughness: 0.8 })),
  water: reveal(std(W.paper, { roughness: 0.35 })),
  lines: reveal(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide })),
  track: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }),
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
  return { geo: g, per };
}

const coastPts = (inset: number, n = 360) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = coastR(a) - inset;
    return new THREE.Vector2(Math.cos(a) * r, -Math.sin(a) * r); // shape space: y = -z
  });

/* ------------------------------------------------------------------ data, built once */

type Item = { x: number; y?: number; z: number; yaw: number; sx: number; sy: number; sz: number; at: number };

let cache: ReturnType<typeof build> | null = null;
const data = () => (cache ??= build());

function build() {
  const HW = TRACK_WIDTH / 2;

  // the track: segments sorted by when they arrive, so a draw range grows it both ways from the car
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
  const iCar = Math.round(CAR_T * N + N) % N;
  const segLen = TRACK_LEN / N;
  const arcV = TRACK_LEN / 2 / 2.4; // each way reaches the far side in 2.4 s
  const keys = pts.map((p, i) => {
    const q = pts[(i + 1) % N];
    const arc = Math.min(Math.abs(i - iCar), N - Math.abs(i - iCar)) * segLen;
    return Math.max(reachAt((p.x + q.x) / 2, (p.z + q.z) / 2), T.ring0 + arc / arcV);
  });
  const order = keys.map((_, i) => i).sort((a, b) => keys[a] - keys[b]);
  const track = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "color"]) {
    const src = raw.geo.attributes[name].array as Float32Array;
    const dst = new Float32Array(src.length);
    const w = raw.per * 3;
    order.forEach((seg, k) => dst.set(src.subarray(seg * w, seg * w + w), k * w));
    track.setAttribute(name, new THREE.BufferAttribute(dst, 3));
  }
  track.setDrawRange(0, 0);
  const trackKeys = order.map((i) => keys[i]);

  // pit lane and its two link roads
  const PW = PIT_LANE_WIDTH / 2;
  const pitStrips: Strip[] = [
    { a: -PW - 0.5, b: PW + 0.5, y: 0.05, color: () => C.ink },
    { a: -PW, b: PW, y: 0.07, color: () => C.pit },
    { a: -PW + 0.25, b: -PW + 0.45, y: 0.085, color: () => C.paper },
    { a: PW - 0.45, b: PW - 0.25, y: 0.085, color: () => C.paper },
  ];
  const lane = Array.from({ length: 40 }, (_, k) => new THREE.Vector3(PIT.from + ((PIT.to - PIT.from) * k) / 39, 0, PIT.z));
  const pitParts = [ribbon(lane, pitStrips, false).geo, ...pitRoadCurves().map((c) => ribbon(c.getPoints(24), pitStrips, false).geo)];
  const pit = merge(pitParts);

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
  const river = ribbon(riverPts, [{ a: -0.5, b: 0.5, y: 0.04, color: () => C.paper }], false, (i) => RIVER.w[i]).geo;

  // buildings: concrete bodies, an ink roof rim, a darker roof deck. Unit box, scaled per instance.
  const bld = merge([box(1, 1, 1, 0, 0.5, 0, C.concrete), box(1.04, 0.035, 1.04, 0, 1.0175, 0, C.ink), box(0.92, 0.01, 0.92, 0, 1.04, 0, C.concreteDark)]);
  const buildings: Item[] = BUILDINGS.map((b) => ({ x: b.x, z: b.z, yaw: b.yaw, sx: b.w, sy: b.h, sz: b.d, at: reachAt(b.x, b.z) + 0.04 }));

  // garages: an ink row facing the pit lane, paper doors, one orange line
  const gar = merge([box(1, 1, 1, 0, 0.5, 0, C.ink), box(0.8, 0.62, 0.02, 0, 0.31, 0.5, C.paper), box(1.002, 0.05, 0.02, 0, 0.8, 0.505, C.orange)]);
  const garages: Item[] = GARAGES.map((g) => ({ x: g.x, z: PIT.garageZ - 5.5, yaw: 0, sx: 9, sy: 5.2, sz: 7, at: reachAt(g.x, PIT.garageZ - 5.5) + 0.04 }));

  // floodlight masts: every tower of the real world, ink poles, a paper lamp bank
  const mast = merge([
    box(1.1, 0.3, 1.1, 0, 0.15, 0, C.concreteDark),
    paint(new THREE.CylinderGeometry(0.11, 0.19, 11, 6).translate(0, 5.5, 0), C.ink),
    box(2.6, 1.4, 0.3, 0, 11.3, 0.25, C.ink),
    box(2.3, 1.1, 0.04, 0, 11.3, 0.42, C.paper),
  ]);
  const masts: Item[] = FLOODS.map((f) => ({ x: f.x, z: f.z, yaw: f.yaw, sx: 1, sy: 1, sz: 1, at: reachAt(f.x, f.z) + 0.18 }));

  // bridge piers under the raised loop
  const pier = merge([box(1, 1, 1, 0, 0.5, 0, C.ink)]);
  const piers: Item[] = [];
  for (let i = 0; i < N; i += 7) {
    const p = pts[i];
    if (p.y < 1.2) continue;
    const tan = trackTangent(i / N);
    const yaw = Math.atan2(tan.x, tan.z);
    piers.push({ x: p.x, z: p.z, yaw, sx: TRACK_WIDTH * 0.7, sy: p.y + 0.05, sz: 0.7, at: keys[i] });
  }

  // trees: groves and strays on the grass, clear of the track, the town, the pit and the water
  const r = rng(808);
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
    const it = { x, z, yaw: r() * 6.28, sx: s, sy: s * (0.9 + r() * 0.3), sz: s, at: reachAt(x, z) + 0.08 };
    (r() < 0.45 ? pines : rounds).push(it);
  }

  // when each kind first arrives, for the HUD log
  const first = (xs: Item[]) => Math.min(...xs.map((i) => i.at));
  return { track, trackKeys, per: raw.per, pit, slab, grass, coastLine, river, bld, buildings, gar, garages, mast, masts, pier, piers, pine, pines, round, rounds, first };
}

/** The build log: what arrives when (ms), in order. */
export const BUILD_LOG = (): [string, number][] => {
  const D = data();
  const rows: [string, number][] = [
    ["Floor", 0],
    ["Track", T.ring0],
    ["Town", D.first(D.buildings)],
    ["Garages", D.first(D.garages)],
    ["Trees", Math.min(D.first(D.pines), D.first(D.rounds))],
    ["Lights", D.first(D.masts)],
    ["Water", T.water0],
    ["Chase cam", T.cam0 + T.camDur - 0.25],
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
function Pops({ geo, mat, items, mode, dur, clock, shadow = true }: { geo: THREE.BufferGeometry; mat: THREE.Material; items: Item[]; mode: Mode; dur: number; clock: BuildClock; shadow?: boolean }) {
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

/** One object lifting in through the ground when the ring reaches it. */
function Lift({ at, depth, clock, children }: { at: number; depth: number; clock: BuildClock; children: ReactNode }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((s) => {
    const k = clamp01((clock(s.clock.elapsedTime) - at) / 0.6);
    g.current.visible = k > 0;
    g.current.position.y = -depth * (1 - backOut(k, 1.3));
  });
  return (
    <group ref={g} visible={false}>
      {children}
    </group>
  );
}

/** Grid slots and the orange start line: they arrive with the track under the car. */
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

/** The shockwave: a thin orange line on the floor with a faint wash behind it. */
const ringMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: { uR: { value: 0 }, uA: { value: 1 }, uC: RING.uC, uCol: { value: new THREE.Color(W.orange) } },
  vertexShader: `varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uR; uniform float uA; uniform vec2 uC; uniform vec3 uCol; varying vec2 vW;
    void main(){
      float d = distance(vW, uC);
      float w = 0.18 + uR * 0.006;
      float line = 1.0 - smoothstep(0.0, w, abs(d - uR));
      float echo = (1.0 - smoothstep(0.0, w * 0.6, abs(d - uR * 0.86))) * 0.45;
      float wash = step(d, uR) * smoothstep(uR - 6.0 - uR * 0.05, uR, d) * 0.035;
      float a = max(line, max(echo, wash)) * uA;
      if (a < 0.01) discard;
      gl_FragColor = vec4(uCol, a);
    }`,
});

function Shockwave({ clock }: { clock: BuildClock }) {
  useFrame((s) => {
    const t = clock(s.clock.elapsedTime);
    const r = ringR(t);
    RING.uRing.value = t < T.ring0 ? -1 : r;
    ringMat.uniforms.uR.value = r;
    ringMat.uniforms.uA.value = t < T.ring0 ? 0 : 1 - clamp01((t - T.ring0 - T.ringDur) / 0.35);
    const w = power2Out(clamp01((t - T.water0) / T.waterDur));
    MAT.water.color.copy(BASIN_C).lerp(WATER_C, w);
    MAT.sea.color.copy(FLOOR_C).lerp(WATER_C, w);
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[GRID.x, 0.16, GRID.z]} material={ringMat} renderOrder={5}>
      <planeGeometry args={[RMAX * 2.4, RMAX * 2.4]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ the island */

/** The paper dot floor: everywhere the ring hasn't reached yet. */
export function PaperFloor({ map }: { map: THREE.Texture | null }) {
  const mat = useMemo(() => reveal(new THREE.MeshBasicMaterial({ map }), true), [map]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={mat}>
      <planeGeometry args={[900, 900]} />
    </mesh>
  );
}

function Track({ clock }: { clock: BuildClock }) {
  const D = data();
  const last = useRef(-1);
  useFrame((s) => {
    const t = clock(s.clock.elapsedTime);
    if (t === last.current) return;
    last.current = t;
    // binary search: how many segments have arrived
    let lo = 0;
    let hi = D.trackKeys.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (D.trackKeys[m] <= t) lo = m + 1;
      else hi = m;
    }
    D.track.setDrawRange(0, lo * D.per);
  });
  return <mesh geometry={D.track} material={MAT.track} receiveShadow frustumCulled={false} />;
}

export function Island({ clock }: { clock: BuildClock }) {
  const D = data();
  const gantryP = trackPoint(START_T);
  return (
    <>
      {/* the ring: a plane on the floor, drawn by its own shader */}
      <Shockwave clock={clock} />
      {/* sea under everything: paper until the water fades in */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_Y, 0]} material={MAT.sea}>
        <planeGeometry args={[1400, 1400]} />
      </mesh>
      {/* land */}
      <mesh geometry={D.slab} material={MAT.land} rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_FLOOR, 0]} receiveShadow />
      <mesh geometry={D.grass} material={MAT.grass} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow />
      <mesh geometry={D.coastLine} material={MAT.lines} />
      {/* water inside the land */}
      <mesh geometry={D.river} material={MAT.water} receiveShadow />
      {LAKES.map((l, k) => (
        <mesh key={k} material={MAT.water} position={[l.x, 0.04, l.z]} rotation={[-Math.PI / 2, 0, l.yaw]} scale={[l.rx, l.rz, 1]}>
          <circleGeometry args={[1, 40]} />
        </mesh>
      ))}
      {/* roads */}
      <Track clock={clock} />
      <mesh geometry={D.pit} material={MAT.lines} receiveShadow />
      <GridMarks />
      <Pops geo={D.pier} mat={MAT.solid} items={D.piers} mode="grow" dur={0.4} clock={clock} />
      {/* town, garages, groves, masts */}
      <Pops geo={D.bld} mat={MAT.solid} items={D.buildings} mode="grow" dur={0.75} clock={clock} />
      <Pops geo={D.gar} mat={MAT.solid} items={D.garages} mode="grow" dur={0.7} clock={clock} />
      <Pops geo={D.pine} mat={MAT.faceted} items={D.pines} mode="pop" dur={0.45} clock={clock} />
      <Pops geo={D.round} mat={MAT.faceted} items={D.rounds} mode="pop" dur={0.45} clock={clock} />
      <Pops geo={D.mast} mat={MAT.solid} items={D.masts} mode="lift" dur={0.6} clock={clock} />
      <group position={[gantryP.x, 0, gantryP.z]} rotation={[0, GRID.yaw, 0]}>
        <Lift at={reachAt(gantryP.x, gantryP.z) + 0.25} depth={8} clock={clock}>
          <Gantry />
        </Lift>
      </group>
    </>
  );
}
