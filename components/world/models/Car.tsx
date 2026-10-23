"use client";

// Collectible-grade modern F1 car. CarBody origin is the CHASSIS CENTRE,
// forward is +X, right is +Z, ground sits at y = GROUND_Y.
// Bodywork is lofted from cross-sections and painted with a small
// position-based livery shader so the wave stays crisp on curved panels.
// Parts that share a material are baked into one geometry to keep the
// draw count low (about 45 meshes with wheels and decals).

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

type GroupProps = ThreeElements["group"];
type V3 = [number, number, number];
const PI = Math.PI;

/* ------------------------------------------------------------------ */
/* Physics-facing constants                                            */
/* ------------------------------------------------------------------ */

/** Front tyre radius (m). */
export const WHEEL_RADIUS = 0.26;
/** Rear wheels are the front wheel scaled uniformly by this. */
export const REAR_WHEEL_SCALE = 1.08;
/** Ground height relative to the chassis centre when sitting on the tyres. */
export const GROUND_Y = -0.3;
/** Half extents of a cuboid enclosing the main body (no wings). */
export const CHASSIS_HALF: [number, number, number] = [1.12, 0.25, 0.44];

const FRONT_X = 0.86;
const REAR_X = -0.94;
const TRACK_Z = 0.5;
const REAR_R = WHEEL_RADIUS * REAR_WHEEL_SCALE;

/** Wheel centres relative to the chassis centre, at rest on flat ground. */
export const WHEEL_POSITIONS: { x: number; y: number; z: number; front: boolean }[] = [
  { x: FRONT_X, y: GROUND_Y + WHEEL_RADIUS, z: TRACK_Z, front: true },
  { x: FRONT_X, y: GROUND_Y + WHEEL_RADIUS, z: -TRACK_Z, front: true },
  { x: REAR_X, y: GROUND_Y + REAR_R, z: TRACK_Z, front: false },
  { x: REAR_X, y: GROUND_Y + REAR_R, z: -TRACK_Z, front: false },
];

const G = GROUND_Y;

export const LIVERY = {
  white: "#f4f3ef",
  red: "#d8101c",
  carbon: "#141519",
  yellow: "#f6c400",
  rubber: "#1a1a1d",
  gun: "#1f2126",
};

/* ------------------------------------------------------------------ */
/* Shared helpers (also used by Avatar.tsx)                            */
/* ------------------------------------------------------------------ */

/** Hex -> GLSL vec3 in linear space. */
export function glslColor(hex: string) {
  const c = new THREE.Color(hex);
  return `vec3(${c.r.toFixed(4)},${c.g.toFixed(4)},${c.b.toFixed(4)})`;
}

const GLSL_HELPERS = /* glsl */ `
float lvAA(float d) { float w = fwidth(d) * 0.8 + 1e-5; return smoothstep(-w, w, d); }
float lvBand(float v, float a, float b) { return lvAA(v - a) * lvAA(b - v); }
float lvCat(float a, float b, float c, float d, float t) {
  float t2 = t * t; float t3 = t2 * t;
  return 0.5 * (2.0 * b + (-a + c) * t + (2.0 * a - 5.0 * b + 4.0 * c - d) * t2 + (-a + 3.0 * b - 3.0 * c + d) * t3);
}
`;

/**
 * MeshPhysicalMaterial whose colour and roughness come from
 * `vec4 livery(vec3 p, vec3 n)` (geometry-space position and normal,
 * returns rgb + roughness).
 */
export function liveryMaterial(key: string, glsl: string, params: THREE.MeshPhysicalMaterialParameters = {}) {
  const m = new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15, ...params });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vLvP;\nvarying vec3 vLvN;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLvP = position;\nvLvN = normal;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vLvP;\nvarying vec3 vLvN;\n${GLSL_HELPERS}\n${glsl}`)
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nvec4 lvOut = livery(vLvP, normalize(vLvN));\ndiffuseColor.rgb = lvOut.rgb;",
      )
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = lvOut.a;");
  };
  m.customProgramCacheKey = () => "livery-" + key;
  return m;
}

export function physical(color: string, roughness = 0.3, extra: THREE.MeshPhysicalMaterialParameters = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness, ...extra });
}

/** Indexed grid surface, smooth normals, oriented outward. */
export function gridGeometry(
  rows: number,
  cols: number,
  f: (i: number, j: number, out: THREE.Vector3) => void,
  closedCols = true,
) {
  const pos = new Float32Array(rows * cols * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      f(i, j, v);
      pos.set([v.x, v.y, v.z], (i * cols + j) * 3);
    }
  const idx: number[] = [];
  const cc = closedCols ? cols : cols - 1;
  for (let i = 0; i < rows - 1; i++)
    for (let j = 0; j < cc; j++) {
      const a = i * cols + j;
      const b = i * cols + ((j + 1) % cols);
      const c = (i + 1) * cols + j;
      const d = (i + 1) * cols + ((j + 1) % cols);
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // orientation: normals on the middle ring should point away from its centroid
  const mid = Math.floor(rows / 2);
  const cen = new THREE.Vector3();
  for (let j = 0; j < cols; j++) cen.add(v.fromArray(pos, (mid * cols + j) * 3));
  cen.divideScalar(cols);
  const nrm = g.getAttribute("normal") as THREE.BufferAttribute;
  let dot = 0;
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let j = 0; j < cols; j++) {
    const k = mid * cols + j;
    p.fromArray(pos, k * 3).sub(cen);
    n.fromBufferAttribute(nrm, k);
    dot += p.dot(n);
  }
  if (dot < 0) {
    for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return g;
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/**
 * Cross-section keyframe. t/b: top and bottom y, w: half width at the
 * waist (y = m), wb: half width at the bottom, z: centre offset at the
 * waist, zb: centre offset at the bottom (pulls the lower half inboard for
 * undercuts), n/nb: superellipse exponents of the upper and lower halves.
 */
type Station = {
  x: number;
  t: number;
  b: number;
  w: number;
  wb?: number;
  z?: number;
  zb?: number;
  n?: number;
  m?: number;
  nb?: number;
};
type Row = Required<Station>;

const spow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);

const KEYS = ["x", "t", "b", "w", "wb", "z", "zb", "n", "m", "nb"] as const;
function full(s: Station): Row {
  const z = s.z ?? 0;
  return {
    x: s.x,
    t: s.t,
    b: s.b,
    w: s.w,
    wb: s.wb ?? s.w,
    z,
    zb: s.zb ?? z,
    n: s.n ?? 2.6,
    m: s.m ?? (s.t + s.b) / 2,
    nb: s.nb ?? s.n ?? 2.6,
  };
}

/** Catmull-Rom resampling of a station list, `sub` rows per segment. */
function loftRows(st: Station[], sub: number): Row[] {
  const arr = st.map(full);
  const rows = (arr.length - 1) * sub + 1;
  return Array.from({ length: rows }, (_, i) => {
    const seg = Math.min(Math.floor(i / sub), arr.length - 2);
    const t = i / sub - seg;
    const a = arr[Math.max(seg - 1, 0)];
    const b = arr[seg];
    const c = arr[seg + 1];
    const d = arr[Math.min(seg + 2, arr.length - 1)];
    const r = {} as Row;
    for (const k of KEYS) r[k] = catmull(a[k], b[k], c[k], d[k], t);
    return r;
  });
}

/** Interpolated cross-section at a given x (for placing decals on the skin). */
function stationAt(st: Station[], x: number): Row {
  const rows = loftRows(st, 24);
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    if ((a.x - x) * (b.x - x) <= 0) {
      const f = (x - a.x) / (b.x - a.x || 1);
      const r = {} as Row;
      for (const k of KEYS) r[k] = a[k] + (b[k] - a[k]) * f;
      return r;
    }
  }
  return rows[rows.length - 1];
}

/** Outer z of a loft's upper half at (x, y), for laying decals on curved panels. */
function surfaceZ(st: Station[], x: number, y: number) {
  const r = stationAt(st, x);
  const k = THREE.MathUtils.clamp((y - r.m) / (r.t - r.m), 0, 1);
  const s = Math.pow(k, r.n / 2);
  const c = Math.sqrt(Math.max(0, 1 - s * s));
  return r.z + r.w * Math.pow(c, 2 / r.n);
}

/** Superellipse loft along a list of stations (Catmull-Rom between them). */
function loft(st: Station[], { cols = 56, sub = 6, side = 1 } = {}) {
  const rowsData = loftRows(st, sub);
  return gridGeometry(rowsData.length, cols, (i, j, out) => {
    const r = rowsData[i];
    const th = (j / cols) * PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const e = 2 / (s >= 0 ? r.n : r.nb);
    const k = s >= 0 ? 0 : -s;
    const w = r.w + (r.wb - r.w) * k;
    const z = r.z + (r.zb - r.z) * k;
    const y = s >= 0 ? r.m + (r.t - r.m) * spow(s, e) : r.m + (r.m - r.b) * spow(s, e);
    out.set(r.x, y, (z + w * spow(c, e)) * side);
  });
}

/** Cambered airfoil swept along Z. Leading edge at (x, y), chord toward -X, `aoa` lifts the trailing edge. */
function airfoil({
  x,
  y,
  chord,
  thick = 0.1,
  camber = 0.05,
  aoa = 0,
  z0,
  z1,
  bend,
  rows = 28,
  cols = 30,
}: {
  x: number;
  y: number;
  chord: number;
  thick?: number;
  camber?: number;
  aoa?: number;
  z0: number;
  z1: number;
  bend?: (z: number) => [number, number, number?];
  rows?: number;
  cols?: number;
}) {
  const ca = Math.cos(aoa);
  const sa = Math.sin(aoa);
  return gridGeometry(rows, cols, (i, j, out) => {
    const z = z0 + ((z1 - z0) * i) / (rows - 1);
    const [bx, by, bs = 1] = bend ? bend(z) : [0, 0, 1];
    const phi = (j / cols) * PI * 2;
    const xc = (1 + Math.cos(phi)) / 2; // 1 = trailing edge, 0 = leading edge
    const yt =
      5 * thick * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc * xc + 0.2843 * xc ** 3 - 0.1036 * xc ** 4) + 0.004;
    const yc = -camber * 4 * xc * (1 - xc);
    const dy = (yc + yt * Math.sign(Math.sin(phi) || 1)) * chord * bs;
    const dx = -xc * chord * bs;
    out.set(x + bx + dx * ca + dy * sa, y + by - dx * sa + dy * ca, z);
  });
}

/** Thin plate from a side-view outline (XY), centred on z. */
function plate(pts: [number, number][], thick: number, z: number, bevel = 0.004) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, thick - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 6,
  });
  g.translate(0, 0, z - thick / 2 + bevel);
  return g;
}

/** Polygon with filleted corners (crisp endplates and fins). r: fillet size per corner or for all. */
function roundedPoly(pts: [number, number][], r: number | number[], seg = 5): [number, number][] {
  const out: [number, number][] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = pts[(i + n - 1) % n];
    const b = pts[(i + 1) % n];
    const ri = Array.isArray(r) ? r[i] : r;
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const ka = Math.min(ri, la * 0.45) / la;
    const kb = Math.min(ri, lb * 0.45) / lb;
    const p0: [number, number] = [p[0] + (a[0] - p[0]) * ka, p[1] + (a[1] - p[1]) * ka];
    const p2: [number, number] = [p[0] + (b[0] - p[0]) * kb, p[1] + (b[1] - p[1]) * kb];
    for (let k = 0; k <= seg; k++) {
      const t = k / seg;
      const u = 1 - t;
      out.push([u * u * p0[0] + 2 * u * t * p[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p[1] + t * t * p2[1]]);
    }
  }
  return out;
}

/** Thin rod between two points, as a transformed unit cylinder (elliptical section). */
function rod(geo: THREE.BufferGeometry, from: V3, to: V3, r: number) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const g = geo.clone();
  g.applyMatrix4(new THREE.Matrix4().compose(a.add(b).multiplyScalar(0.5), q, new THREE.Vector3(r * 1.6, len, r)));
  return g;
}

/** Clone with a baked transform. */
function bake(geo: THREE.BufferGeometry, pos: V3, scale: V3 = [1, 1, 1], rot: V3 = [0, 0, 0]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...scale),
  );
  return geo.clone().applyMatrix4(m);
}

/** Merge geometries that share a material into one draw (position + normal only). */
function merge(list: THREE.BufferGeometry[]) {
  const parts = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal") n.deleteAttribute(k);
    if (!n.getAttribute("normal")) n.computeVertexNormals();
    return n;
  });
  const out = mergeGeometries(parts);
  if (!out) throw new Error("Car: geometry merge failed");
  out.computeBoundingSphere();
  return out;
}

/** GLSL function `float name(float x)`: Catmull-Rom through (x, y) keys. */
function glslCurve(name: string, keys: [number, number][]) {
  const p = [...keys].sort((a, b) => a[0] - b[0]);
  const f = (v: number) => v.toFixed(4);
  const P = (i: number) => p[Math.max(0, Math.min(p.length - 1, i))][1];
  let s = `float ${name}(float x) {\n  x = clamp(x, ${f(p[0][0])}, ${f(p[p.length - 1][0])});\n`;
  for (let i = 0; i < p.length - 1; i++) {
    const x0 = p[i][0];
    const x1 = p[i + 1][0];
    s += `  if (x <= ${f(x1)}) return lvCat(${f(P(i - 1))}, ${f(P(i))}, ${f(P(i + 1))}, ${f(P(i + 2))}, (x - ${f(x0)}) / ${f(x1 - x0)});\n`;
  }
  return s + `  return ${f(p[p.length - 1][1])};\n}\n`;
}

/* ------------------------------------------------------------------ */
/* Body stations                                                       */
/* ------------------------------------------------------------------ */

// Monocoque + nose, from the nose tip (resting on the front wing main
// plane) back into the engine cover. Narrow, low, gently rising nose.
const TUB: Station[] = [
  { x: 1.484, t: -0.197, b: -0.2, w: 0.001, n: 2.6 },
  { x: 1.48, t: -0.19, b: -0.207, w: 0.012, n: 2.6 },
  { x: 1.46, t: -0.168, b: -0.214, w: 0.044, n: 3.2 },
  { x: 1.3, t: -0.135, b: -0.222, w: 0.054, n: 3.2 },
  { x: 1.06, t: -0.088, b: -0.224, w: 0.06, n: 3 },
  { x: 0.8, t: -0.025, b: -0.222, w: 0.07, n: 3 },
  { x: 0.52, t: 0.045, b: -0.226, w: 0.112, wb: 0.085, n: 3.2 },
  { x: 0.26, t: 0.084, b: -0.235, w: 0.168, wb: 0.12, n: 3.4 },
  { x: -0.04, t: 0.088, b: -0.24, w: 0.186, wb: 0.13, n: 3.4 },
  { x: -0.32, t: 0.07, b: -0.24, w: 0.17, wb: 0.12, n: 3.2 },
  { x: -0.5, t: 0.04, b: -0.22, w: 0.1, n: 3 },
  { x: -0.55, t: 0.0, b: -0.18, w: 0.02, n: 3 },
];

// Engine cover: roll-hoop airbox over the driver's head, a pronounced
// spine, then a tight coke-bottle taper to the gearbox and crash structure.
const COVER: Station[] = [
  { x: -0.13, t: 0.345, b: 0.285, w: 0.022, n: 2, nb: 3 },
  { x: -0.148, t: 0.375, b: 0.07, w: 0.058, wb: 0.09, n: 1.8, nb: 3, m: 0.25 },
  { x: -0.24, t: 0.405, b: 0.0, w: 0.072, wb: 0.14, n: 1.8, nb: 3, m: 0.2 },
  { x: -0.42, t: 0.37, b: -0.12, w: 0.1, wb: 0.165, n: 1.9, nb: 3, m: 0.1 },
  { x: -0.62, t: 0.265, b: -0.17, w: 0.11, wb: 0.15, n: 2.1, nb: 3, m: 0.04 },
  { x: -0.84, t: 0.13, b: -0.17, w: 0.085, wb: 0.1, n: 2.4 },
  { x: -1.02, t: 0.03, b: -0.15, w: 0.06, n: 2.6 },
  { x: -1.16, t: -0.03, b: -0.13, w: 0.045, n: 2.8 },
  { x: -1.205, t: -0.05, b: -0.11, w: 0.01, n: 2.8 },
  { x: -1.21, t: -0.079, b: -0.081, w: 0.001, n: 2.8 },
];

// Sidepod (right side, mirrored). Small high inlet, deep undercut pulled
// inboard (zb), steep downwash ramp sweeping into the coke bottle.
const POD: Station[] = [
  { x: 0.485, t: 0.06, b: -0.02, w: 0.06, z: 0.27, zb: 0.26, n: 3.2, m: 0.025 },
  { x: 0.47, t: 0.085, b: -0.06, w: 0.095, wb: 0.06, z: 0.275, zb: 0.24, n: 3.4, m: 0.025 },
  { x: 0.36, t: 0.1, b: -0.12, w: 0.105, wb: 0.055, z: 0.27, zb: 0.205, n: 3.6, nb: 2.2, m: 0.02 },
  { x: 0.12, t: 0.088, b: -0.18, w: 0.105, wb: 0.06, z: 0.26, zb: 0.19, n: 3.4, nb: 2.2, m: 0.0 },
  { x: -0.18, t: 0.035, b: -0.205, w: 0.095, wb: 0.065, z: 0.235, zb: 0.18, n: 3, nb: 2.4, m: -0.04 },
  { x: -0.48, t: -0.055, b: -0.21, w: 0.075, wb: 0.06, z: 0.185, zb: 0.16, n: 2.8, nb: 2.6, m: -0.11 },
  { x: -0.74, t: -0.13, b: -0.21, w: 0.04, z: 0.12, n: 2.6 },
  { x: -0.83, t: -0.16, b: -0.2, w: 0.01, z: 0.1, n: 2.6 },
];

function coverTop(x: number) {
  for (let i = 1; i < COVER.length; i++) {
    const a = COVER[i - 1];
    const b = COVER[i];
    if (x <= a.x && x >= b.x) return a.t + ((b.t - a.t) * (x - a.x)) / (b.x - a.x);
  }
  return 0;
}

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

const W = glslColor(LIVERY.white);
const R = glslColor(LIVERY.red);
const K = glslColor(LIVERY.carbon);

// The red wave, in side projection (x -> y). Below `waveHi` and above
// `waveLo` is red. It fills the nose tip, runs back along the nose flanks,
// rides the sidepod shoulders and climbs the engine cover to the fin.
const WAVE_HI: [number, number][] = [
  [1.6, 0.2],
  [1.22, -0.1],
  [1.0, -0.125],
  [0.78, -0.105],
  [0.56, -0.05],
  [0.36, 0.02],
  [0.1, 0.012],
  [-0.2, -0.012],
  [-0.44, 0.04],
  [-0.66, 0.17],
  [-0.86, 0.33],
  [-1.1, 0.5],
  [-1.4, 0.6],
];
const WAVE_LO: [number, number][] = [
  [1.6, -0.5],
  [0.9, -0.5],
  [0.62, -0.4],
  [0.44, -0.05],
  [0.2, -0.065],
  [-0.1, -0.09],
  [-0.4, -0.1],
  [-0.64, -0.02],
  [-0.86, 0.04],
  [-1.1, 0.0],
  [-1.4, -0.05],
];

const BODY_GLSL = /* glsl */ `
${glslCurve("waveHi", WAVE_HI)}
${glslCurve("waveLo", WAVE_LO)}
vec4 livery(vec3 p, vec3 n) {
  vec3 col = ${W};
  float rough = 0.24;
  float hi = waveHi(p.x);
  float lo = waveLo(p.x);
  float wave = lvAA(hi - p.y) * lvAA(p.y - lo);
  // a fine red speed line riding just above the wave
  float line = lvBand(p.y - hi, 0.016, 0.023) * lvAA(0.95 - p.x) * lvAA(p.x + 0.7);
  col = mix(col, ${R}, max(wave, line));
  // carbon lower body, and carbon in the shadowed undercuts beneath the sidepods
  float under = lvAA(-n.y - 0.45) * lvAA(0.0 - p.y) * lvAA(0.47 - p.x) * lvAA(abs(p.z) - 0.17);
  float low = max(lvAA(-0.195 - p.y), under);
  col = mix(col, ${K}, low);
  rough = mix(rough, 0.42, low);
  return vec4(col, rough);
}
`;

// Wing elements: painted top, carbon underside.
const wingGlsl = (top: string) => /* glsl */ `
vec4 livery(vec3 p, vec3 n) {
  float under = lvAA(-n.y - 0.05);
  return vec4(mix(${top}, ${K}, under), mix(0.26, 0.45, under));
}
`;

// Wing endplates: carbon with a red cap following the top edge.
const ENDPLATE_GLSL = /* glsl */ `
vec4 livery(vec3 p, vec3 n) {
  float top = p.x > 0.0 ? ${(G + 0.09).toFixed(4)} + (1.58 - p.x) * 0.4 - 0.032 : ${(G + 0.752).toFixed(4)};
  float cap = lvAA(p.y - top);
  float pin = lvBand(p.y - top, -0.014, -0.008);
  return vec4(mix(${K}, ${R}, max(cap, pin)), mix(0.42, 0.26, cap));
}
`;

// Tyre: rubber with a yellow sidewall band (Pirelli-style), axis = local Z.
const TYRE_GLSL = /* glsl */ `
vec4 livery(vec3 p, vec3 n) {
  float r = length(p.xy);
  float side = lvAA(abs(p.z) - 0.07);
  float band = lvBand(r, 0.207, 0.226) * side;
  float thin = lvBand(r, 0.186, 0.191) * side;
  // short arcs break the band like the maker's logo blocks
  float a = atan(p.y, p.x);
  float gaps = lvBand(abs(fract(a / 6.2832 * 2.0 + 0.25) - 0.5), -1.0, 0.055);
  float y = max(band * (1.0 - gaps), thin);
  vec3 col = mix(${glslColor(LIVERY.rubber)}, ${glslColor(LIVERY.yellow)}, y);
  return vec4(col, mix(0.86, 0.5, y));
}
`;

// Wheel cover ring: black with a red pinstripe.
const COVER_GLSL = /* glsl */ `
vec4 livery(vec3 p, vec3 n) {
  float r = length(p.xy);
  float pin = lvBand(r, 0.151, 0.157);
  return vec4(mix(vec3(0.012), ${R}, pin), 0.22);
}
`;

let MATS: ReturnType<typeof makeMaterials> | null = null;
function makeMaterials() {
  const gloss = { clearcoat: 1, clearcoatRoughness: 0.12 };
  return {
    body: liveryMaterial("car-body-v2", BODY_GLSL),
    wingRed: liveryMaterial("wing-red-v2", wingGlsl(R)),
    wingWhite: liveryMaterial("wing-white-v2", wingGlsl(W)),
    red: physical(LIVERY.red, 0.26, gloss),
    endplate: liveryMaterial("endplate", ENDPLATE_GLSL, { clearcoat: 0.9, clearcoatRoughness: 0.2 }),
    carbon: physical(LIVERY.carbon, 0.42, { clearcoat: 0.8, clearcoatRoughness: 0.25 }),
    hole: physical("#050506", 0.85),
    mirror: physical("#c9ced6", 0.08, { metalness: 1 }),
    tyre: liveryMaterial("tyre-v2", TYRE_GLSL, { clearcoat: 0, roughness: 0.9 }),
    gun: physical(LIVERY.gun, 0.3, { metalness: 0.85 }),
    cover: liveryMaterial("wheel-cover", COVER_GLSL, { clearcoat: 1, clearcoatRoughness: 0.1 }),
    hub: physical(LIVERY.red, 0.25, { metalness: 0.5, ...gloss }),
    textWhite: physical(LIVERY.white, 0.3, gloss),
    textRed: physical(LIVERY.red, 0.3, gloss),
    textBlack: physical("#0d0d10", 0.3, gloss),
  };
}
function useMaterials() {
  return useMemo(() => (MATS ??= makeMaterials()), []);
}

const FONT = "/fonts/racero.otf";

/* ------------------------------------------------------------------ */
/* Wheel                                                               */
/* ------------------------------------------------------------------ */

let WHEEL_GEO: ReturnType<typeof makeWheelGeometry> | null = null;
function makeWheelGeometry() {
  const R0 = WHEEL_RADIUS;
  const RIM = 0.17;
  const HW = 0.12;
  // low-profile tyre: superellipse profile revolved about the axle
  const pts: THREE.Vector2[] = [];
  const n = 56;
  for (let i = 0; i <= n; i++) {
    const phi = -PI / 2 + (PI * i) / n;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const r = RIM + (R0 - RIM) * Math.pow(Math.abs(c), 2 / 3.8);
    const z = HW * spow(s, 2 / 4.4);
    pts.push(new THREE.Vector2(r, z));
  }
  const tyre = new THREE.LatheGeometry(pts, 72).rotateX(PI / 2);

  const disc = (outer: number, holes: (s: THREE.Shape) => void, depth: number) => {
    const s = new THREE.Shape();
    s.absarc(0, 0, outer, 0, PI * 2, false);
    holes(s);
    return new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
      curveSegments: 40,
    });
  };
  // ten slim spokes
  const spokes = disc(
    0.142,
    (s) => {
      const N = 10;
      for (let k = 0; k < N; k++) {
        const a0 = (k / N) * PI * 2 + 0.07;
        const a1 = ((k + 1) / N) * PI * 2 - 0.07;
        const h = new THREE.Path();
        h.absarc(0, 0, 0.13, a0, a1, false);
        h.absarc(0, 0, 0.052, a1 - 0.14, a0 + 0.14, true);
        h.closePath();
        s.holes.push(h);
      }
    },
    0.01,
  );
  // aero cover ring over the rim lip
  const ring = disc(
    0.172,
    (s) => {
      const h = new THREE.Path();
      h.absarc(0, 0, 0.136, 0, PI * 2, true);
      s.holes.push(h);
    },
    0.006,
  );
  const barrel = new THREE.CylinderGeometry(0.165, 0.165, 0.2, 40, 1, true).rotateX(PI / 2);
  const hubDisc = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24).rotateX(PI / 2);
  const nut = new THREE.CylinderGeometry(0.028, 0.034, 0.032, 6).rotateX(PI / 2);
  const flip: V3 = [0, PI, 0];
  const rim = merge([barrel, bake(spokes, [0, 0, 0.068]), bake(spokes, [0, 0, -0.068], [1, 1, 1], flip)]);
  const cover = merge([bake(ring, [0, 0, 0.082]), bake(ring, [0, 0, -0.082], [1, 1, 1], flip)]);
  const hub = merge([
    bake(hubDisc, [0, 0, 0.074]),
    bake(hubDisc, [0, 0, -0.074]),
    bake(nut, [0, 0, 0.09]),
    bake(nut, [0, 0, -0.09]),
  ]);
  return { tyre, rim, cover, hub };
}

/** One wheel. Origin at wheel centre, rolling axis = local Z. Rear wheels: scale by REAR_WHEEL_SCALE. */
export function CarWheel(props: GroupProps) {
  const m = useMaterials();
  const g = useMemo(() => (WHEEL_GEO ??= makeWheelGeometry()), []);
  return (
    <group {...props}>
      <mesh geometry={g.tyre} material={m.tyre} castShadow receiveShadow />
      <mesh geometry={g.rim} material={m.gun} castShadow />
      <mesh geometry={g.cover} material={m.cover} castShadow />
      <mesh geometry={g.hub} material={m.hub} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Body geometry                                                       */
/* ------------------------------------------------------------------ */

let BODY_GEO: ReturnType<typeof makeBodyGeometry> | null = null;
function makeBodyGeometry() {
  const body = merge([
    loft(TUB, { cols: 64, sub: 8 }),
    loft(COVER, { cols: 56, sub: 8 }),
    loft(POD, { cols: 60, sub: 8, side: 1 }),
    loft(POD, { cols: 60, sub: 8, side: -1 }),
  ]);

  const carbon: THREE.BufferGeometry[] = [];
  const red: THREE.BufferGeometry[] = [];
  const hole: THREE.BufferGeometry[] = [];
  const plates: THREE.BufferGeometry[] = [];

  /* ---- floor ---- */
  const fl: [number, number][] = [
    [0.6, 0.0],
    [0.6, 0.12],
    [0.52, 0.3],
    [0.38, 0.45],
    [-0.42, 0.47],
    [-0.56, 0.41],
    [-0.64, 0.35],
    [-1.12, 0.34],
  ];
  const floorShape = new THREE.Shape();
  const outline = [...fl, ...fl.slice().reverse().map(([x, z]) => [x, -z] as [number, number])];
  floorShape.moveTo(outline[0][0], outline[0][1]);
  outline.slice(1).forEach(([x, z]) => floorShape.lineTo(x, z));
  carbon.push(
    new THREE.ExtrudeGeometry(floorShape, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.005,
      bevelSegments: 2,
    })
      .rotateX(PI / 2)
      .translate(0, G + 0.062, 0),
  );
  for (const s of [1, -1]) {
    // upturned floor edge wing
    carbon.push(
      plate(
        [
          [0.34, G + 0.058],
          [0.26, G + 0.088],
          [-0.36, G + 0.098],
          [-0.42, G + 0.058],
        ],
        0.01,
        s * 0.466,
      ),
    );
    // red edge stripe along the floor lip
    red.push(
      plate(
        [
          [0.3, G + 0.05],
          [0.3, G + 0.056],
          [-0.4, G + 0.056],
          [-0.4, G + 0.05],
        ],
        0.012,
        s * 0.466,
        0.002,
      ),
    );
    // floor fences under the leading edge, toeing outboard
    for (const [z, h] of [
      [0.12, 0.034],
      [0.2, 0.038],
      [0.28, 0.04],
      [0.36, 0.036],
    ]) {
      const f = plate(
        [
          [0.58, G + 0.062],
          [0.56, G + 0.062 - h],
          [0.22, G + 0.062 - h * 0.8],
          [0.16, G + 0.062],
        ],
        0.007,
        0,
        0.002,
      );
      f.rotateY(s * 0.12);
      f.translate(0, 0, s * z);
      carbon.push(f);
    }
  }
  // diffuser ramp + strakes
  carbon.push(new THREE.BoxGeometry(0.46, 0.01, 0.66).rotateZ(-0.3).translate(-0.9, G + 0.12, 0));
  for (const z of [0.12, -0.12, 0.26, -0.26])
    carbon.push(
      plate(
        [
          [-0.68, G + 0.06],
          [-1.12, G + 0.2],
          [-1.12, G + 0.06],
        ],
        0.008,
        z,
      ),
    );

  /* ---- front wing: main plane + three flaps, swept, rising inboard ---- */
  const inner = (z: number) => 1 - THREE.MathUtils.smoothstep(Math.abs(z), 0.06, 0.5);
  const sweep = (z: number) => -0.045 * (Math.abs(z) / 0.6) ** 2;
  const fwBend = (lift: number, shrink: number) => (z: number): [number, number, number] => {
    const k = inner(z);
    return [sweep(z) + k * 0.012, k * lift, 1 - k * shrink];
  };
  const FW = 0.598;
  const fwMain = airfoil({ x: 1.56, y: G + 0.058, chord: 0.2, thick: 0.065, camber: 0.06, aoa: 0.05, z0: -FW, z1: FW, bend: fwBend(0.02, 0), rows: 40 });
  const fwFlaps = merge([
    airfoil({ x: 1.385, y: G + 0.082, chord: 0.1, thick: 0.08, camber: 0.05, aoa: 0.36, z0: -FW, z1: FW, bend: fwBend(0.022, 0.2), rows: 40 }),
    airfoil({ x: 1.305, y: G + 0.118, chord: 0.082, thick: 0.08, camber: 0.05, aoa: 0.62, z0: -FW, z1: FW, bend: fwBend(0.03, 0.3), rows: 40 }),
    airfoil({ x: 1.252, y: G + 0.163, chord: 0.064, thick: 0.08, camber: 0.04, aoa: 0.92, z0: -FW, z1: FW, bend: fwBend(0.036, 0.35), rows: 40 }),
  ]);
  for (const s of [1, -1])
    plates.push(
      plate(
        roundedPoly(
          [
            [1.58, G + 0.028],
            [1.58, G + 0.09],
            [1.47, G + 0.15],
            [1.28, G + 0.21],
            [1.225, G + 0.19],
            [1.235, G + 0.1],
            [1.31, G + 0.028],
          ],
          [0.01, 0.03, 0.06, 0.03, 0.02, 0.04, 0.02],
        ),
        0.01,
        s * 0.605,
      ),
    );

  /* ---- rear wing: spoon main plane, DRS flap, beam wing, swan neck ---- */
  const spoon = (z: number): [number, number] => [0, -0.02 * (1 - (z / 0.425) ** 2)];
  const rwMain = airfoil({ x: -1.12, y: G + 0.6, chord: 0.2, thick: 0.1, camber: 0.08, aoa: 0.12, z0: -0.426, z1: 0.426, bend: spoon });
  // flap leading edge sits on the DRS hinge
  const rwFlap = airfoil({
    x: DRS_PIVOT[0],
    y: DRS_PIVOT[1],
    chord: 0.145,
    thick: 0.08,
    camber: 0.05,
    aoa: 0.58,
    z0: -0.426,
    z1: 0.426,
    bend: spoon,
  });
  carbon.push(
    airfoil({ x: -1.275, y: G + 0.3, chord: 0.095, thick: 0.1, camber: 0.05, aoa: 0.12, z0: -0.426, z1: 0.426 }),
    airfoil({ x: -1.36, y: G + 0.335, chord: 0.07, thick: 0.1, camber: 0.05, aoa: 0.5, z0: -0.426, z1: 0.426 }),
  );
  for (const s of [1, -1])
    plates.push(
      plate(
        roundedPoly(
          [
            [-1.095, G + 0.55],
            [-1.095, G + 0.73],
            [-1.17, G + 0.795],
            [-1.47, G + 0.795],
            [-1.47, G + 0.5],
            [-1.43, G + 0.29],
            [-1.31, G + 0.29],
            [-1.3, G + 0.42],
          ],
          [0.02, 0.04, 0.06, 0.02, 0.06, 0.02, 0.02, 0.08],
        ),
        0.012,
        s * 0.432,
      ),
    );
  carbon.push(
    plate(
      roundedPoly(
        [
          [-1.03, G + 0.2],
          [-1.13, G + 0.5],
          [-1.15, G + 0.566],
          [-1.215, G + 0.566],
          [-1.18, G + 0.48],
          [-1.1, G + 0.19],
        ],
        0.025,
      ),
      0.014,
      0,
    ),
  );

  /* ---- shark fin ---- */
  carbon.push(
    plate(
      [
        [-0.27, coverTop(-0.27) - 0.02],
        [-0.33, 0.43],
        [-0.93, 0.24],
        [-0.99, 0.17],
        [-0.99, coverTop(-0.99) - 0.02],
        [-0.7, coverTop(-0.7) - 0.02],
        [-0.45, coverTop(-0.45) - 0.02],
      ],
      0.008,
      0,
      0.003,
    ),
  );

  /* ---- halo ---- */
  const hoop = new THREE.CatmullRomCurve3(
    (
      [
        [-0.215, 0.07, 0.178],
        [-0.195, 0.2, 0.174],
        [-0.12, 0.29, 0.16],
        [0.02, 0.326, 0.126],
        [0.13, 0.332, 0.05],
        [0.152, 0.332, 0],
        [0.13, 0.332, -0.05],
        [0.02, 0.326, -0.126],
        [-0.12, 0.29, -0.16],
        [-0.195, 0.2, -0.174],
        [-0.215, 0.07, -0.178],
      ] as V3[]
    ).map(([a, b, c]) => new THREE.Vector3(a, b, c)),
    false,
    "centripetal",
  );
  carbon.push(new THREE.TubeGeometry(hoop, 100, 0.023, 12, false));
  const pillarCurve = new THREE.CatmullRomCurve3(
    (
      [
        [0.14, 0.338, 0],
        [0.25, 0.262, 0],
        [0.33, 0.15, 0],
        [0.37, 0.05, 0],
      ] as V3[]
    ).map(([a, b, c]) => new THREE.Vector3(a, b, c)),
  );
  carbon.push(new THREE.TubeGeometry(pillarCurve, 24, 0.017, 10, false).scale(1, 1, 1.4));

  /* ---- suspension, brake ducts ---- */
  const unit = new THREE.CylinderGeometry(1, 1, 1, 10);
  const ry = G + WHEEL_RADIUS;
  const rry = G + REAR_R;
  for (const s of [1, -1]) {
    const z = (v: number) => v * s;
    carbon.push(
      rod(unit, [1.0, ry + 0.03, z(0.06)], [FRONT_X, ry + 0.09, z(0.38)], 0.0075),
      rod(unit, [0.7, ry + 0.07, z(0.12)], [FRONT_X, ry + 0.09, z(0.38)], 0.0075),
      rod(unit, [1.04, ry - 0.09, z(0.05)], [FRONT_X, ry - 0.09, z(0.38)], 0.0075),
      rod(unit, [0.66, ry - 0.1, z(0.12)], [FRONT_X, ry - 0.09, z(0.38)], 0.0075),
      rod(unit, [FRONT_X + 0.03, ry - 0.07, z(0.36)], [0.8, ry + 0.11, z(0.08)], 0.006),
      rod(unit, [-0.78, rry + 0.06, z(0.08)], [REAR_X, rry + 0.1, z(0.37)], 0.0075),
      rod(unit, [-1.08, rry + 0.08, z(0.06)], [REAR_X, rry + 0.1, z(0.37)], 0.0075),
      rod(unit, [-0.8, rry - 0.1, z(0.12)], [REAR_X, rry - 0.09, z(0.37)], 0.0075),
      rod(unit, [-1.06, rry - 0.1, z(0.07)], [REAR_X, rry - 0.09, z(0.37)], 0.0075),
    );
    const drum = new THREE.CylinderGeometry(0.075, 0.09, 0.05, 20).rotateX(PI / 2);
    carbon.push(bake(drum, [FRONT_X, ry, z(0.385)]), bake(drum, [REAR_X, rry, z(0.385)]));
  }

  /* ---- mirrors ---- */
  const housing = new RoundedBoxGeometry(0.048, 0.032, 0.1, 3, 0.014);
  const glass = new THREE.SphereGeometry(1, 20, 12);
  const mirrorGlass: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    const p: V3 = [0.2, 0.17, s * 0.29];
    red.push(bake(housing, p, [1, 1, 1], [s * 0.1, 0, 0]));
    mirrorGlass.push(bake(glass, [p[0] - 0.023, p[1], p[2]], [0.004, 0.011, 0.038]));
    carbon.push(rod(unit, [0.235, 0.08, s * 0.2], [0.205, 0.16, s * 0.28], 0.007));
    carbon.push(rod(unit, [0.21, 0.08, s * 0.3], [0.2, 0.155, s * 0.3], 0.006));
  }

  /* ---- cockpit, intakes ---- */
  const sph = new THREE.SphereGeometry(1, 24, 16);
  const cockpit = stationAt(TUB, -0.03);
  hole.push(bake(new THREE.CylinderGeometry(1, 1, 0.02, 40), [-0.03, cockpit.t - 0.002, 0], [0.25, 1, 0.152]));
  carbon.push(bake(new THREE.TorusGeometry(1, 0.08, 10, 48).rotateX(PI / 2), [-0.03, cockpit.t + 0.004, 0], [0.255, 0.17, 0.158]));
  // roll-hoop airbox mouth, sidepod letterbox inlets
  hole.push(bake(sph, [-0.137, 0.315, 0], [0.012, 0.036, 0.036]));
  for (const s of [1, -1]) hole.push(bake(sph, [0.478, 0.022, s * 0.272], [0.01, 0.036, 0.075]));

  return {
    body,
    carbon: merge(carbon),
    red: merge(red),
    hole: merge(hole),
    plates: merge(plates),
    mirror: merge(mirrorGlass),
    fwMain,
    fwFlaps,
    rwMain,
    rwFlap,
    light: sph,
  };
}

/* ------------------------------------------------------------------ */
/* Decals                                                              */
/* ------------------------------------------------------------------ */

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

/** Text lying on a surface: `right` and `up` are the text's in-plane axes (its normal is right x up). */
function Decal({
  children,
  position,
  right = X_AXIS,
  up = Y_AXIS,
  size,
  material,
  spacing = 0.02,
}: {
  children: string;
  position: V3;
  right?: THREE.Vector3;
  up?: THREE.Vector3;
  size: number;
  material: THREE.Material;
  spacing?: number;
}) {
  const quaternion = useMemo(() => {
    const r = right.clone().normalize();
    const n = r.clone().cross(up).normalize();
    const u = n.clone().cross(r);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(r, u, n));
  }, [right, up]);
  return (
    <Text
      font={FONT}
      position={position}
      quaternion={quaternion}
      fontSize={size}
      material={material}
      anchorX="center"
      anchorY="middle"
      letterSpacing={spacing}
    >
      {children}
    </Text>
  );
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// Decal placements, read off the lofted skin.
const DECALS = (() => {
  // nose number: lies on the nose top, reads from behind the car (from the cockpit)
  const nx = 1.08;
  const a = stationAt(TUB, nx + 0.05);
  const b = stationAt(TUB, nx - 0.05);
  const nose = stationAt(TUB, nx);
  const noseUp = v(a.x - b.x, a.t - b.t, 0).normalize();
  // name on the engine cover flank behind the cockpit
  const fx = -0.42;
  const fy = 0.175;
  const d = 0.08;
  const flank = {
    pos: [fx, fy, surfaceZ(COVER, fx, fy) + 0.004] as V3,
    right: v(2 * d, 0, surfaceZ(COVER, fx + d, fy) - surfaceZ(COVER, fx - d, fy)).normalize(),
    up: v(0, 0.04, surfaceZ(COVER, fx, fy + 0.02) - surfaceZ(COVER, fx, fy - 0.02)).normalize(),
  };
  return { nose: { pos: [nx, nose.t + 0.0035, 0] as V3, up: noseUp }, flank };
})();

/* ------------------------------------------------------------------ */
/* Body                                                                */
/* ------------------------------------------------------------------ */

export type CarBodyProps = GroupProps & {
  brakeLight?: boolean;
  /** Group around the DRS flap, pivoting at its leading edge. Rotate +Z to open. */
  drsRef?: React.Ref<THREE.Group>;
};

/** Leading edge of the DRS flap, the hinge it opens around (chassis space). */
export const DRS_PIVOT: [number, number, number] = [-1.27, GROUND_Y + 0.67, 0];
/** Rear wing endplate tips, where boost trails come from (chassis space). */
export const WING_TIPS: [number, number, number][] = [
  [-1.42, GROUND_Y + 0.72, 0.44],
  [-1.42, GROUND_Y + 0.72, -0.44],
];

export function CarBody({ brakeLight = false, drsRef, children, ...props }: CarBodyProps) {
  const m = useMaterials();
  const g = useMemo(() => (BODY_GEO ??= makeBodyGeometry()), []);
  const NEG_X = useMemo(() => v(-1, 0, 0), []);
  const POS_Z = useMemo(() => v(0, 0, 1), []);
  const flankL = useMemo(
    () => ({ right: DECALS.flank.right.clone().multiply(v(-1, 1, -1)), up: DECALS.flank.up.clone().multiply(v(1, 1, -1)) }),
    [],
  );

  return (
    <group {...props}>
      <mesh geometry={g.body} material={m.body} castShadow receiveShadow />
      <mesh geometry={g.carbon} material={m.carbon} castShadow receiveShadow />
      <mesh geometry={g.red} material={m.red} castShadow />
      <mesh geometry={g.hole} material={m.hole} />
      <mesh geometry={g.plates} material={m.endplate} castShadow />
      <mesh geometry={g.mirror} material={m.mirror} />

      {/* front wing */}
      <mesh geometry={g.fwMain} material={m.carbon} castShadow receiveShadow />
      <mesh geometry={g.fwFlaps} material={m.wingRed} castShadow />

      {/* rear wing */}
      <mesh geometry={g.rwMain} material={m.wingWhite} castShadow receiveShadow />
      <group ref={drsRef} position={DRS_PIVOT} name="drs-flap">
        <mesh
          geometry={g.rwFlap}
          material={m.wingRed}
          position={[-DRS_PIVOT[0], -DRS_PIVOT[1], -DRS_PIVOT[2]]}
          castShadow
        />
      </group>

      {/* rain light */}
      <mesh position={[-1.205, -0.08, 0]} scale={[0.012, 0.035, 0.045]} geometry={g.light}>
        <meshStandardMaterial
          color={brakeLight ? "#ff2a2a" : "#5a0d10"}
          emissive="#ff1a1a"
          emissiveIntensity={brakeLight ? 3 : 0.15}
          toneMapped={!brakeLight}
          roughness={0.3}
        />
      </mesh>

      {/* 08 on the nose, the fin and the rear wing endplates */}
      <Decal position={DECALS.nose.pos} right={POS_Z} up={DECALS.nose.up} size={0.075} material={m.textBlack}>
        08
      </Decal>
      {[1, -1].map((s) => (
        <Decal key={"fin" + s} position={[-0.765, 0.238, s * 0.0045]} right={s > 0 ? X_AXIS : NEG_X} size={0.08} material={m.textWhite}>
          08
        </Decal>
      ))}
      {[1, -1].map((s) => (
        <Decal key={"rw" + s} position={[-1.3, G + 0.68, s * 0.4385]} right={s > 0 ? X_AXIS : NEG_X} size={0.12} material={m.textWhite}>
          08
        </Decal>
      ))}

      {/* sponsor-style marks */}
      {[1, -1].map((s) => (
        <Decal
          key={"name" + s}
          position={[DECALS.flank.pos[0], DECALS.flank.pos[1], s * DECALS.flank.pos[2]]}
          right={s > 0 ? DECALS.flank.right : flankL.right}
          up={s > 0 ? DECALS.flank.up : flankL.up}
          size={0.03}
          spacing={0.06}
          material={m.textBlack}
        >
          HENIL GAJJAR
        </Decal>
      ))}
      {[1, -1].map((s) => (
        <Decal key={"fw" + s} position={[1.4, G + 0.135, s * 0.6115]} right={s > 0 ? X_AXIS : NEG_X} size={0.05} material={m.textWhite}>
          HG
        </Decal>
      ))}
      {[1, -1].map((s) => (
        <Decal key={"rwhg" + s} position={[-1.37, G + 0.36, s * 0.4385]} right={s > 0 ? X_AXIS : NEG_X} size={0.05} material={m.textRed}>
          HG
        </Decal>
      ))}
      <Decal position={[0.2, 0.32, 0]} right={POS_Z} up={v(1, -0.69, 0)} size={0.02} material={m.textWhite}>
        HG
      </Decal>
      <Decal position={[-1.2, G + 0.62, 0]} right={POS_Z} up={v(1, 0.12, 0)} size={0.05} material={m.textRed} spacing={0.08}>
        HENIL GAJJAR
      </Decal>

      {children}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Preview                                                             */
/* ------------------------------------------------------------------ */

/** Body + 4 wheels, origin at chassis centre (lift by -GROUND_Y to sit on the ground). */
export function CarPreview({ brakeLight, children, steer = 0, ...props }: CarBodyProps & { steer?: number }) {
  return (
    <group {...props}>
      <CarBody brakeLight={brakeLight}>{children}</CarBody>
      {WHEEL_POSITIONS.map((p, i) => (
        <CarWheel
          key={i}
          position={[p.x, p.y, p.z]}
          rotation={[0, p.front ? steer * 0.4 : 0, 0]}
          scale={p.front ? 1 : REAR_WHEEL_SCALE}
        />
      ))}
    </group>
  );
}
