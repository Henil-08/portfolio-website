"use client";

// Toy-like F1 car: soft, chunky bodywork, fat balloon tyres and thick
// wings that read well from a high game camera. CarBody origin is the
// CHASSIS CENTRE, forward is +X, right is +Z, ground sits at y = GROUND_Y.
// Bodywork is lofted from cross-sections and painted with a small
// position-based livery shader. Parts that share a material are baked into
// one geometry to keep the draw count low.

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
  white: "#f7f5ef",
  red: "#d3121c",
  carbon: "#1a1b1f",
  yellow: "#ffc20e",
  rubber: "#1c1c1f",
  gun: "#25272c",
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

/* ------------------------------------------------------------------ */
/* Body stations                                                       */
/* ------------------------------------------------------------------ */

// Monocoque + nose. Toy proportions: a fat, blunt, rounded nose that
// swells into a wide tub around the cockpit.
const TUB: Station[] = [
  { x: 1.38, t: -0.115, b: -0.16, w: 0.001, n: 2.2 },
  { x: 1.374, t: -0.085, b: -0.192, w: 0.05, n: 2.2 },
  { x: 1.33, t: -0.055, b: -0.208, w: 0.108, n: 2.4 },
  { x: 1.18, t: -0.02, b: -0.215, w: 0.126, n: 2.5 },
  { x: 0.96, t: 0.03, b: -0.22, w: 0.138, n: 2.5 },
  { x: 0.64, t: 0.09, b: -0.225, w: 0.172, wb: 0.135, n: 2.5 },
  { x: 0.32, t: 0.13, b: -0.232, w: 0.21, wb: 0.15, n: 2.6 },
  { x: -0.04, t: 0.13, b: -0.236, w: 0.222, wb: 0.16, n: 2.7 },
  { x: -0.32, t: 0.1, b: -0.236, w: 0.2, wb: 0.15, n: 2.6 },
  { x: -0.5, t: 0.05, b: -0.21, w: 0.12, n: 2.5 },
  { x: -0.56, t: 0.0, b: -0.17, w: 0.02, n: 2.5 },
];

// Engine cover: a tall, rounded hump with a big airbox over the driver's
// head, tapering in a soft curve to the gearbox.
const COVER: Station[] = [
  { x: -0.115, t: 0.375, b: 0.305, w: 0.03, n: 2, nb: 2.4 },
  { x: -0.135, t: 0.415, b: 0.08, w: 0.08, wb: 0.12, n: 2, nb: 2.6, m: 0.28 },
  { x: -0.24, t: 0.455, b: 0.0, w: 0.105, wb: 0.17, n: 2, nb: 2.6, m: 0.23 },
  { x: -0.42, t: 0.425, b: -0.12, w: 0.135, wb: 0.2, n: 2.1, nb: 2.6, m: 0.12 },
  { x: -0.64, t: 0.31, b: -0.17, w: 0.145, wb: 0.17, n: 2.2, nb: 2.6, m: 0.05 },
  { x: -0.86, t: 0.165, b: -0.17, w: 0.115, wb: 0.12, n: 2.3 },
  { x: -1.04, t: 0.065, b: -0.15, w: 0.085, n: 2.4 },
  { x: -1.17, t: 0.005, b: -0.13, w: 0.062, n: 2.4 },
  { x: -1.215, t: -0.03, b: -0.108, w: 0.022, n: 2.4 },
  { x: -1.222, t: -0.068, b: -0.072, w: 0.001, n: 2.4 },
];

// Sidepod (right side, mirrored). Big, soft and rounded, a small undercut.
const POD: Station[] = [
  { x: 0.505, t: 0.055, b: -0.035, w: 0.05, z: 0.28, n: 2.3, m: 0.01 },
  { x: 0.48, t: 0.115, b: -0.11, w: 0.1, wb: 0.085, z: 0.288, zb: 0.27, n: 2.4, m: 0.0 },
  { x: 0.34, t: 0.145, b: -0.175, w: 0.125, wb: 0.095, z: 0.288, zb: 0.255, n: 2.6, nb: 2.3, m: -0.01 },
  { x: 0.08, t: 0.13, b: -0.2, w: 0.125, wb: 0.095, z: 0.278, zb: 0.245, n: 2.6, nb: 2.3, m: -0.03 },
  { x: -0.2, t: 0.075, b: -0.21, w: 0.112, wb: 0.085, z: 0.25, zb: 0.225, n: 2.5, nb: 2.4, m: -0.065 },
  { x: -0.48, t: -0.02, b: -0.21, w: 0.08, wb: 0.065, z: 0.2, zb: 0.185, n: 2.4, m: -0.11 },
  { x: -0.7, t: -0.1, b: -0.2, w: 0.04, z: 0.15, n: 2.4 },
  { x: -0.78, t: -0.13, b: -0.19, w: 0.01, z: 0.13, n: 2.4 },
];

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

const R = glslColor(LIVERY.red);
const K = glslColor(LIVERY.carbon);
const Y = glslColor(LIVERY.yellow);

// Satin red body, black lower body, and a thin yellow pinstripe riding the
// shoulder line between them.
const BODY_GLSL = /* glsl */ `
vec4 livery(vec3 p, vec3 n) {
  vec3 col = ${R};
  float rough = 0.42;
  float under = lvAA(-n.y - 0.35) * lvAA(-0.02 - p.y);
  float low = max(lvAA(-0.172 - p.y), under);
  float pin = lvBand(p.y, -0.16, -0.148) * (1.0 - under) * lvAA(0.62 - p.x) * lvAA(p.x + 0.8);
  col = mix(col, ${Y}, pin);
  col = mix(col, ${K}, low);
  rough = mix(rough, 0.6, low);
  return vec4(col, rough);
}
`;

// Wing elements: painted top, black underside.
const wingGlsl = (top: string) => /* glsl */ `
vec4 livery(vec3 p, vec3 n) {
  float under = lvAA(-n.y - 0.05);
  return vec4(mix(${top}, ${K}, under), mix(0.42, 0.6, under));
}
`;

// Endplates: black with a red cap along the top edge and a yellow pin under it.
const ENDPLATE_GLSL = /* glsl */ `
vec4 livery(vec3 p, vec3 n) {
  float top = p.x > 0.0 ? ${(G + 0.168).toFixed(4)} : ${(G + 0.742).toFixed(4)};
  float cap = lvAA(p.y - top);
  float pin = lvBand(p.y - top, -0.02, -0.011);
  vec3 col = mix(${K}, ${R}, cap);
  col = mix(col, ${Y}, pin);
  return vec4(col, mix(0.58, 0.42, cap));
}
`;

// Tyre: soft rubber with a fat yellow sidewall band broken into logo blocks.
const TYRE_GLSL = /* glsl */ `
vec4 livery(vec3 p, vec3 n) {
  float r = length(p.xy);
  float side = lvAA(abs(p.z) - 0.1);
  float band = lvBand(r, 0.196, 0.224) * side;
  float a = atan(p.y, p.x);
  float seg = fract(a / 6.2832 * 3.0 + 0.1);
  float gaps = lvBand(seg, 0.0, 0.07);
  // small tick marks inside each block, like lettering
  float ticks = lvBand(fract(seg * 18.0), 0.0, 0.32) * lvBand(seg, 0.14, 0.62) * lvBand(r, 0.203, 0.217);
  float y = band * (1.0 - gaps) * (1.0 - ticks);
  vec3 col = mix(${glslColor(LIVERY.rubber)}, ${Y}, y);
  return vec4(col, mix(0.82, 0.5, y));
}
`;

let MATS: ReturnType<typeof makeMaterials> | null = null;
function makeMaterials() {
  const satin = { clearcoat: 0.35, clearcoatRoughness: 0.45 };
  return {
    body: liveryMaterial("car-body-cute", BODY_GLSL, satin),
    wingRed: liveryMaterial("wing-red-cute", wingGlsl(R), satin),
    wingBlack: liveryMaterial("wing-black-cute", wingGlsl(K), satin),
    red: physical(LIVERY.red, 0.42, satin),
    yellow: physical(LIVERY.yellow, 0.45, satin),
    endplate: liveryMaterial("endplate-cute", ENDPLATE_GLSL, satin),
    carbon: physical(LIVERY.carbon, 0.58, { clearcoat: 0.25, clearcoatRoughness: 0.5 }),
    hole: physical("#050506", 0.9),
    mirror: physical("#c9ced6", 0.08, { metalness: 1 }),
    tyre: liveryMaterial("tyre-cute", TYRE_GLSL, { clearcoat: 0, roughness: 0.85 }),
    rim: physical(LIVERY.gun, 0.45, { metalness: 0.4 }),
    hub: physical(LIVERY.red, 0.4, { metalness: 0.2, ...satin }),
    textWhite: physical(LIVERY.white, 0.4, satin),
    textYellow: physical(LIVERY.yellow, 0.4, satin),
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
  const RIM = 0.145;
  const HW = 0.165;
  // balloon tyre: tall sidewall, round shoulders, revolved about the axle
  const pts: THREE.Vector2[] = [];
  const n = 56;
  for (let i = 0; i <= n; i++) {
    const phi = -PI / 2 + (PI * i) / n;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const r = RIM + (R0 - RIM) * Math.pow(Math.abs(c), 2 / 3);
    const z = HW * spow(s, 2 / 3.2);
    pts.push(new THREE.Vector2(r, z));
  }
  const tyre = new THREE.LatheGeometry(pts, 72).rotateX(PI / 2);

  const disc = (outer: number, holes: (s: THREE.Shape) => void, depth: number, bevel = 0.006) => {
    const s = new THREE.Shape();
    s.absarc(0, 0, outer, 0, PI * 2, false);
    holes(s);
    return new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 40,
    });
  };
  // six chunky spokes
  const spokes = disc(
    0.138,
    (s) => {
      const N = 6;
      for (let k = 0; k < N; k++) {
        const a0 = (k / N) * PI * 2 + 0.17;
        const a1 = ((k + 1) / N) * PI * 2 - 0.17;
        const h = new THREE.Path();
        h.absarc(0, 0, 0.118, a0, a1, false);
        h.absarc(0, 0, 0.056, a1 - 0.22, a0 + 0.22, true);
        h.closePath();
        s.holes.push(h);
      }
    },
    0.014,
  );
  // red rim lip
  const ring = disc(
    0.152,
    (s) => {
      const h = new THREE.Path();
      h.absarc(0, 0, 0.137, 0, PI * 2, true);
      s.holes.push(h);
    },
    0.01,
    0.005,
  );
  const barrel = new THREE.CylinderGeometry(0.148, 0.148, 0.26, 40, 1, true).rotateX(PI / 2);
  const dish = new THREE.CylinderGeometry(0.13, 0.13, 0.01, 40).rotateX(PI / 2);
  const hubCap = new THREE.SphereGeometry(0.042, 20, 12).scale(1, 1, 0.55);
  const flip: V3 = [0, PI, 0];
  const rim = merge([
    barrel,
    bake(dish, [0, 0, 0.06]),
    bake(dish, [0, 0, -0.06]),
    bake(spokes, [0, 0, 0.08]),
    bake(spokes, [0, 0, -0.08], [1, 1, 1], flip),
  ]);
  const hub = merge([
    bake(ring, [0, 0, 0.1]),
    bake(ring, [0, 0, -0.1], [1, 1, 1], flip),
    bake(hubCap, [0, 0, 0.1]),
    bake(hubCap, [0, 0, -0.1]),
  ]);
  return { tyre, rim, hub };
}

/** One wheel. Origin at wheel centre, rolling axis = local Z. Rear wheels: scale by REAR_WHEEL_SCALE. */
export function CarWheel(props: GroupProps) {
  const m = useMaterials();
  const g = useMemo(() => (WHEEL_GEO ??= makeWheelGeometry()), []);
  return (
    <group {...props}>
      <mesh geometry={g.tyre} material={m.tyre} castShadow receiveShadow />
      <mesh geometry={g.rim} material={m.rim} castShadow />
      <mesh geometry={g.hub} material={m.hub} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Body geometry                                                       */
/* ------------------------------------------------------------------ */

/** Chunky rounded slab between two side-view outlines (endplates, pylons). */
function slab(pts: [number, number][], thick: number, z: number, r: number | number[]) {
  return plate(roundedPoly(pts, r), thick, z, Math.min(0.012, thick * 0.35));
}

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
  const yellow: THREE.BufferGeometry[] = [];
  const hole: THREE.BufferGeometry[] = [];
  const plates: THREE.BufferGeometry[] = [];

  /* ---- floor: rounded tray ---- */
  const fl: [number, number][] = [
    [0.62, 0.0],
    [0.62, 0.12],
    [0.54, 0.3],
    [0.4, 0.43],
    [-0.42, 0.45],
    [-0.56, 0.38],
    [-0.64, 0.3],
    [-1.14, 0.29],
  ];
  const floorShape = new THREE.Shape();
  const outline = [...fl, ...fl.slice().reverse().map(([x, z]) => [x, -z] as [number, number])];
  floorShape.moveTo(outline[0][0], outline[0][1]);
  outline.slice(1).forEach(([x, z]) => floorShape.lineTo(x, z));
  carbon.push(
    new THREE.ExtrudeGeometry(floorShape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.012,
      bevelSegments: 3,
    })
      .rotateX(PI / 2)
      .translate(0, G + 0.07, 0),
  );
  // diffuser ramp
  carbon.push(new RoundedBoxGeometry(0.44, 0.026, 0.56, 2, 0.01).rotateZ(-0.32).translate(-0.92, G + 0.12, 0));
  for (const z of [0.15, -0.15])
    carbon.push(
      slab(
        [
          [-0.68, G + 0.06],
          [-1.13, G + 0.21],
          [-1.13, G + 0.06],
        ],
        0.018,
        z,
        0.02,
      ),
    );

  /* ---- front wing: one fat main plane + one flap, thick endplates ---- */
  const FW = 0.585;
  const sweep = (z: number): [number, number, number] => {
    const k = 1 - THREE.MathUtils.smoothstep(Math.abs(z), 0.08, 0.45);
    return [-0.03 * (Math.abs(z) / 0.6) ** 2, k * 0.018, 1];
  };
  const fwMain = airfoil({ x: 1.49, y: G + 0.064, chord: 0.22, thick: 0.14, camber: 0.05, aoa: 0.06, z0: -FW, z1: FW, bend: sweep, rows: 36 });
  const fwFlaps = airfoil({ x: 1.31, y: G + 0.108, chord: 0.12, thick: 0.15, camber: 0.04, aoa: 0.5, z0: -FW, z1: FW, bend: sweep, rows: 36 });
  for (const s of [1, -1])
    plates.push(
      slab(
        [
          [1.525, G + 0.03],
          [1.525, G + 0.14],
          [1.44, G + 0.2],
          [1.23, G + 0.215],
          [1.195, G + 0.17],
          [1.23, G + 0.03],
        ],
        0.036,
        s * 0.6,
        [0.02, 0.04, 0.08, 0.04, 0.03, 0.03],
      ),
    );
  // nose pillars down to the wing
  for (const s of [1, -1])
    carbon.push(
      slab(
        [
          [1.33, G + 0.13],
          [1.28, G + 0.1],
          [1.16, G + 0.1],
          [1.18, G + 0.13],
        ],
        0.016,
        s * 0.06,
        0.01,
      ),
    );

  /* ---- rear wing: fat main plane, DRS flap, beam wing, chunky pylon ---- */
  const rwMain = airfoil({ x: -1.1, y: G + 0.6, chord: 0.21, thick: 0.15, camber: 0.06, aoa: 0.1, z0: -0.42, z1: 0.42 });
  // flap leading edge sits on the DRS hinge
  const rwFlap = airfoil({
    x: DRS_PIVOT[0],
    y: DRS_PIVOT[1],
    chord: 0.15,
    thick: 0.14,
    camber: 0.04,
    aoa: 0.5,
    z0: -0.42,
    z1: 0.42,
  });
  carbon.push(airfoil({ x: -1.28, y: G + 0.31, chord: 0.12, thick: 0.15, camber: 0.04, aoa: 0.18, z0: -0.42, z1: 0.42 }));
  for (const s of [1, -1])
    plates.push(
      slab(
        [
          [-1.08, G + 0.55],
          [-1.08, G + 0.79],
          [-1.48, G + 0.79],
          [-1.48, G + 0.5],
          [-1.42, G + 0.28],
          [-1.27, G + 0.28],
          [-1.27, G + 0.46],
        ],
        0.036,
        s * 0.432,
        [0.04, 0.06, 0.06, 0.06, 0.04, 0.04, 0.1],
      ),
    );
  carbon.push(
    slab(
      [
        [-1.02, G + 0.2],
        [-1.12, G + 0.52],
        [-1.15, G + 0.57],
        [-1.23, G + 0.57],
        [-1.19, G + 0.48],
        [-1.11, G + 0.19],
      ],
      0.03,
      0,
      0.03,
    ),
  );

  /* ---- halo: chunky hoop + centre pillar ---- */
  const hoop = new THREE.CatmullRomCurve3(
    (
      [
        [-0.2, 0.09, 0.19],
        [-0.18, 0.22, 0.185],
        [-0.1, 0.31, 0.17],
        [0.03, 0.345, 0.13],
        [0.14, 0.352, 0.05],
        [0.163, 0.352, 0],
        [0.14, 0.352, -0.05],
        [0.03, 0.345, -0.13],
        [-0.1, 0.31, -0.17],
        [-0.18, 0.22, -0.185],
        [-0.2, 0.09, -0.19],
      ] as V3[]
    ).map(([a, b, c]) => new THREE.Vector3(a, b, c)),
    false,
    "centripetal",
  );
  carbon.push(new THREE.TubeGeometry(hoop, 100, 0.032, 14, false));
  const pillarCurve = new THREE.CatmullRomCurve3(
    (
      [
        [0.15, 0.36, 0],
        [0.26, 0.28, 0],
        [0.34, 0.18, 0],
        [0.38, 0.09, 0],
      ] as V3[]
    ).map(([a, b, c]) => new THREE.Vector3(a, b, c)),
  );
  carbon.push(new THREE.TubeGeometry(pillarCurve, 24, 0.024, 12, false).scale(1, 1, 1.3));

  /* ---- suspension: two thick wishbones per corner, brake drums ---- */
  const unit = new THREE.CylinderGeometry(1, 1, 1, 12);
  const ry = G + WHEEL_RADIUS;
  const rry = G + REAR_R;
  const IN = 0.31; // inner face of the fat tyres
  for (const s of [1, -1]) {
    const z = (v: number) => v * s;
    carbon.push(
      rod(unit, [0.96, ry + 0.05, z(0.07)], [FRONT_X, ry + 0.07, z(IN)], 0.011),
      rod(unit, [0.72, ry + 0.08, z(0.12)], [FRONT_X, ry + 0.07, z(IN)], 0.011),
      rod(unit, [1.0, ry - 0.07, z(0.07)], [FRONT_X, ry - 0.07, z(IN)], 0.011),
      rod(unit, [0.7, ry - 0.08, z(0.12)], [FRONT_X, ry - 0.07, z(IN)], 0.011),
      rod(unit, [-0.8, rry + 0.06, z(0.1)], [REAR_X, rry + 0.08, z(IN - 0.01)], 0.011),
      rod(unit, [-1.06, rry + 0.08, z(0.07)], [REAR_X, rry + 0.08, z(IN - 0.01)], 0.011),
      rod(unit, [-0.8, rry - 0.09, z(0.12)], [REAR_X, rry - 0.08, z(IN - 0.01)], 0.011),
      rod(unit, [-1.06, rry - 0.09, z(0.08)], [REAR_X, rry - 0.08, z(IN - 0.01)], 0.011),
    );
    const drum = new THREE.CylinderGeometry(0.08, 0.095, 0.05, 24).rotateX(PI / 2);
    carbon.push(bake(drum, [FRONT_X, ry, z(IN)]), bake(drum, [REAR_X, rry, z(IN - 0.01)]));
  }

  /* ---- mirrors: round red pods on black stalks ---- */
  const housing = new RoundedBoxGeometry(0.06, 0.05, 0.12, 4, 0.022);
  const glass = new THREE.SphereGeometry(1, 20, 12);
  const mirrorGlass: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    const p: V3 = [0.22, 0.2, s * 0.31];
    red.push(bake(housing, p, [1, 1, 1], [s * 0.1, 0, 0]));
    mirrorGlass.push(bake(glass, [p[0] - 0.029, p[1], p[2]], [0.004, 0.016, 0.045]));
    carbon.push(rod(unit, [0.25, 0.1, s * 0.2], [0.225, 0.19, s * 0.3], 0.011));
  }

  /* ---- cockpit, intakes, T-cam ---- */
  const sph = new THREE.SphereGeometry(1, 24, 16);
  const cockpit = stationAt(TUB, -0.03);
  hole.push(bake(new THREE.CylinderGeometry(1, 1, 0.02, 40), [-0.03, cockpit.t - 0.004, 0], [0.26, 1, 0.16]));
  carbon.push(bake(new THREE.TorusGeometry(1, 0.13, 12, 48).rotateX(PI / 2), [-0.03, cockpit.t + 0.006, 0], [0.27, 0.2, 0.168]));
  // airbox mouth and sidepod inlets: soft rounded holes
  hole.push(bake(sph, [-0.122, 0.34, 0], [0.016, 0.05, 0.05]));
  carbon.push(bake(new THREE.TorusGeometry(1, 0.16, 10, 32).rotateY(PI / 2), [-0.124, 0.34, 0], [1, 0.055, 0.055]));
  for (const s of [1, -1]) hole.push(bake(sph, [0.49, 0.015, s * 0.29], [0.014, 0.06, 0.075]));
  // T-cam on the airbox
  yellow.push(bake(new RoundedBoxGeometry(0.05, 0.022, 0.13, 3, 0.009), [-0.21, 0.475, 0]));
  carbon.push(bake(new THREE.CylinderGeometry(0.008, 0.01, 0.03, 10), [-0.21, 0.455, 0]));
  // floor-edge accent
  for (const s of [1, -1]) yellow.push(bake(new RoundedBoxGeometry(0.7, 0.012, 0.016, 2, 0.005), [-0.04, G + 0.07, s * 0.455]));

  return {
    body,
    carbon: merge(carbon),
    red: merge(red),
    yellow: merge(yellow),
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

/** A decal laid on the right-hand flank of a loft at (x, y), with its mirror on the left. */
function flankDecal(st: Station[], x: number, y: number) {
  const d = 0.05;
  const pos: V3 = [x, y, surfaceZ(st, x, y) + 0.004];
  const right = v(2 * d, 0, surfaceZ(st, x + d, y) - surfaceZ(st, x - d, y)).normalize();
  const up = v(0, 0.04, surfaceZ(st, x, y + 0.02) - surfaceZ(st, x, y - 0.02)).normalize();
  return {
    pos,
    right,
    up,
    posL: [x, y, -pos[2]] as V3,
    rightL: right.clone().multiply(v(-1, 1, -1)),
    upL: up.clone().multiply(v(1, 1, -1)),
  };
}

// Decal placements, read off the lofted skin.
const DECALS = (() => {
  // nose number: lies on the nose top, reads from behind the car (from the cockpit)
  const nx = 1.1;
  const a = stationAt(TUB, nx + 0.05);
  const b = stationAt(TUB, nx - 0.05);
  const nose = stationAt(TUB, nx);
  const noseUp = v(a.x - b.x, a.t - b.t, 0).normalize();
  return {
    nose: { pos: [nx, nose.t + 0.004, 0] as V3, up: noseUp },
    num: flankDecal(COVER, -0.5, 0.2),
    name: flankDecal(POD, 0.2, 0.06),
  };
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
  const WING_UP = useMemo(() => v(1, 0.1, 0), []);
  const { num, name } = DECALS;

  return (
    <group {...props}>
      <mesh geometry={g.body} material={m.body} castShadow receiveShadow />
      <mesh geometry={g.carbon} material={m.carbon} castShadow receiveShadow />
      <mesh geometry={g.red} material={m.red} castShadow />
      <mesh geometry={g.yellow} material={m.yellow} />
      <mesh geometry={g.hole} material={m.hole} />
      <mesh geometry={g.plates} material={m.endplate} castShadow />
      <mesh geometry={g.mirror} material={m.mirror} />

      {/* front wing */}
      <mesh geometry={g.fwMain} material={m.wingBlack} castShadow receiveShadow />
      <mesh geometry={g.fwFlaps} material={m.wingRed} castShadow />

      {/* rear wing */}
      <mesh geometry={g.rwMain} material={m.wingBlack} castShadow receiveShadow />
      <group ref={drsRef} position={DRS_PIVOT} name="drs-flap">
        <mesh
          geometry={g.rwFlap}
          material={m.wingRed}
          position={[-DRS_PIVOT[0], -DRS_PIVOT[1], -DRS_PIVOT[2]]}
          castShadow
        />
      </group>

      {/* rain light */}
      <mesh position={[-1.222, -0.07, 0]} scale={[0.014, 0.04, 0.05]} geometry={g.light}>
        <meshStandardMaterial
          color={brakeLight ? "#ff2a2a" : "#5a0d10"}
          emissive="#ff1a1a"
          emissiveIntensity={brakeLight ? 3 : 0.15}
          toneMapped={!brakeLight}
          roughness={0.3}
        />
      </mesh>

      {/* 08 on the nose, the engine cover and the rear wing */}
      <Decal position={DECALS.nose.pos} right={POS_Z} up={DECALS.nose.up} size={0.1} material={m.textWhite}>
        08
      </Decal>
      <Decal position={num.pos} right={num.right} up={num.up} size={0.15} material={m.textWhite}>
        08
      </Decal>
      <Decal position={num.posL} right={num.rightL} up={num.upL} size={0.15} material={m.textWhite}>
        08
      </Decal>
      {[1, -1].map((s) => (
        <Decal key={"rw" + s} position={[-1.29, G + 0.6, s * 0.4505]} right={s > 0 ? X_AXIS : NEG_X} size={0.16} material={m.textWhite}>
          08
        </Decal>
      ))}
      <Decal position={[-1.19, G + 0.628, 0]} right={POS_Z} up={WING_UP} size={0.075} material={m.textYellow} spacing={0.06}>
        HG 08
      </Decal>

      {/* small HG marks */}
      <Decal position={name.pos} right={name.right} up={name.up} size={0.06} spacing={0.05} material={m.textYellow}>
        HG
      </Decal>
      <Decal position={name.posL} right={name.rightL} up={name.upL} size={0.06} spacing={0.05} material={m.textYellow}>
        HG
      </Decal>
      {[1, -1].map((s) => (
        <Decal key={"fw" + s} position={[1.36, G + 0.1, s * 0.6185]} right={s > 0 ? X_AXIS : NEG_X} size={0.06} material={m.textYellow}>
          HG
        </Decal>
      ))}

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
