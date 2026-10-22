"use client";

// Collectible-grade 2022+ F1 car. CarBody origin is the CHASSIS CENTRE,
// forward is +X, right is +Z, ground sits at y = GROUND_Y.
// Bodywork is lofted from cross-sections and painted with a small
// position-based livery shader so stripes stay crisp on curved panels.

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";

type GroupProps = ThreeElements["group"];
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
  white: "#f3f2ee",
  red: "#e0111f",
  carbon: "#16171b",
  yellow: "#f5c400",
  rubber: "#1c1c1f",
  gun: "#2c2e33",
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

/** Cross-section keyframe. top/bot: y extents, w: half width (wb: half width at the bottom, for undercuts). */
type Station = { x: number; t: number; b: number; w: number; wb?: number; z?: number; n?: number; m?: number; nb?: number };

const spow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);

/** Superellipse loft along a list of stations (Catmull-Rom between them). */
function loft(st: Station[], { cols = 56, sub = 6, side = 1 } = {}) {
  const arr = st.map((s) => [s.x, s.t, s.b, s.w, s.wb ?? s.w, s.z ?? 0, s.n ?? 2.6, s.m ?? (s.t + s.b) / 2, s.nb ?? s.n ?? 2.6]);
  const rows = (arr.length - 1) * sub + 1;
  const sample = (i: number) => {
    const seg = Math.min(Math.floor(i / sub), arr.length - 2);
    const t = i / sub - seg;
    const a = arr[Math.max(seg - 1, 0)];
    const b = arr[seg];
    const c = arr[seg + 1];
    const d = arr[Math.min(seg + 2, arr.length - 1)];
    return b.map((_, k) => catmull(a[k], b[k], c[k], d[k], t));
  };
  const rowsData = Array.from({ length: rows }, (_, i) => sample(i));
  return gridGeometry(rows, cols, (i, j, out) => {
    const [X, T, B, W, WB, Z, N, M, NB] = rowsData[i];
    const th = (j / cols) * PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const e = 2 / (s >= 0 ? N : NB);
    const w = s >= 0 ? W : W + (WB - W) * -s;
    const y = s >= 0 ? M + (T - M) * spow(s, e) : M + (M - B) * spow(s, e);
    out.set(X, y, (Z + w * spow(c, e)) * side);
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

/** Smooth closed outline through control points (side views of endplates, fin). */
function smoothOutline(ctrl: [number, number][], n = 60): [number, number][] {
  const curve = new THREE.CatmullRomCurve3(
    ctrl.map(([a, b]) => new THREE.Vector3(a, b, 0)),
    true,
    "centripetal",
  );
  return curve.getPoints(n).map((p) => [p.x, p.y]);
}

/** Thin rod between two points, as a transformed unit cylinder. */
function rod(geo: THREE.BufferGeometry, from: [number, number, number], to: [number, number, number], r: number) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const g = geo.clone();
  g.applyMatrix4(new THREE.Matrix4().compose(a.add(b).multiplyScalar(0.5), q, new THREE.Vector3(r * 1.6, len, r)));
  return g;
}

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

const W = glslColor(LIVERY.white);
const R = glslColor(LIVERY.red);
const K = glslColor(LIVERY.carbon);

// Body livery in car space. White base, red nose tip, red swoosh along the
// sidepods that climbs the engine cover, carbon lower body.
const BODY_GLSL = /* glsl */ `
vec4 livery(vec3 p, vec3 n) {
  float az = abs(p.z);
  vec3 col = ${W};
  float rough = 0.28;
  // red nose tip with a raked edge
  float tip = lvAA(p.x + p.y * 0.6 - 1.02);
  // pinstripe framing the tip
  float pin = lvBand(p.x + p.y * 0.6, 0.955, 0.975);
  // sidepod swoosh: follows the pod's downward ramp
  float yc = mix(0.035, -0.105, smoothstep(0.42, -0.75, p.x));
  float sw = lvBand(p.y - yc, -0.024, 0.024) * lvAA(az - 0.205) * lvAA(0.46 - p.x) * lvAA(p.x + 0.86);
  // thin second line under it
  float sw2 = lvBand(p.y - yc, -0.052, -0.040) * lvAA(az - 0.215) * lvAA(0.38 - p.x) * lvAA(p.x + 0.8);
  // engine cover spine stripe
  float sp = lvBand(az, -1.0, 0.03) * lvAA(-0.3 - p.x) * lvAA(p.y - mix(0.4, -0.05, smoothstep(-0.3, -1.1, p.x)) + 0.06);
  // nose top stripes running back to the cockpit
  float ns = lvBand(az, 0.035, 0.05) * lvAA(p.x - 0.28) * lvAA(n.y - 0.55);
  // red airbox / roll hoop
  float box = lvAA(p.y - 0.2) * lvAA(p.x + 0.38 + (p.y - 0.2) * 0.6);
  float red = max(max(max(tip, sw), max(max(sp, ns), sw2)), box);
  col = mix(col, ${R}, red * (1.0 - pin));
  col = mix(col, ${K}, pin);
  // carbon lower body
  float low = lvAA(-0.19 - p.y);
  col = mix(col, ${K}, low);
  rough = mix(rough, 0.48, low);
  return vec4(col, rough);
}
`;

// Wing elements: painted top, carbon underside.
const wingGlsl = (top: string) => /* glsl */ `
vec4 livery(vec3 p, vec3 n) {
  float under = lvAA(-n.y - 0.05);
  return vec4(mix(${top}, ${K}, under), mix(0.3, 0.5, under));
}
`;

// Tyre: rubber with a yellow sidewall band (Pirelli-style), axis = local Z.
const TYRE_GLSL = /* glsl */ `
vec4 livery(vec3 p, vec3 n) {
  float r = length(p.xy);
  float band = lvBand(r, 0.205, 0.224) * lvAA(abs(p.z) - 0.07);
  float thin = lvBand(r, 0.182, 0.188) * lvAA(abs(p.z) - 0.07);
  vec3 col = mix(${glslColor(LIVERY.rubber)}, ${glslColor(LIVERY.yellow)}, max(band, thin));
  return vec4(col, mix(0.88, 0.55, max(band, thin)));
}
`;

let MATS: ReturnType<typeof makeMaterials> | null = null;
function makeMaterials() {
  const gloss = { clearcoat: 1, clearcoatRoughness: 0.15 };
  return {
    body: liveryMaterial("car-body", BODY_GLSL),
    wingRed: liveryMaterial("wing-red", wingGlsl(R)),
    wingWhite: liveryMaterial("wing-white", wingGlsl(W)),
    red: physical(LIVERY.red, 0.3, gloss),
    white: physical(LIVERY.white, 0.3, gloss),
    carbon: physical(LIVERY.carbon, 0.5, { clearcoat: 0.6, clearcoatRoughness: 0.35 }),
    hole: physical("#060607", 0.8),
    mirror: physical("#c9ced6", 0.08, { metalness: 1 }),
    tyre: liveryMaterial("tyre", TYRE_GLSL, { clearcoat: 0, roughness: 0.9 }),
    gun: physical(LIVERY.gun, 0.32, { metalness: 0.85 }),
    coverBlack: physical("#111114", 0.25, gloss),
    nut: physical(LIVERY.red, 0.25, { metalness: 0.4, ...gloss }),
    textWhite: physical(LIVERY.white, 0.3, gloss),
    textRed: physical(LIVERY.red, 0.3, gloss),
    textBlack: physical(LIVERY.carbon, 0.3, gloss),
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
  // tyre: superellipse profile revolved about the axle
  const pts: THREE.Vector2[] = [];
  const n = 56;
  for (let i = 0; i <= n; i++) {
    const phi = -PI / 2 + (PI * i) / n;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const r = RIM + (R0 - RIM) * Math.pow(Math.abs(c), 2 / 3.6);
    const z = HW * spow(s, 2 / 4.2);
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
  const spokes = disc(
    0.142,
    (s) => {
      const N = 10;
      for (let k = 0; k < N; k++) {
        const a0 = (k / N) * PI * 2 + 0.11;
        const a1 = ((k + 1) / N) * PI * 2 - 0.11;
        const h = new THREE.Path();
        h.absarc(0, 0, 0.128, a0, a1, false);
        h.absarc(0, 0, 0.058, a1 - 0.08, a0 + 0.08, true);
        h.closePath();
        s.holes.push(h);
      }
    },
    0.008,
  );
  const cover = disc(
    0.172,
    (s) => {
      const h = new THREE.Path();
      h.absarc(0, 0, 0.138, 0, PI * 2, true);
      s.holes.push(h);
    },
    0.006,
  );
  const barrel = new THREE.CylinderGeometry(0.165, 0.165, 0.2, 40, 1, true).rotateX(PI / 2);
  const hub = new THREE.CylinderGeometry(0.15, 0.15, 0.02, 32).rotateX(PI / 2);
  const nut = new THREE.CylinderGeometry(0.03, 0.036, 0.03, 6).rotateX(PI / 2);
  return { tyre, spokes, cover, barrel, hub, nut };
}

/** One wheel. Origin at wheel centre, rolling axis = local Z. Rear wheels: scale by REAR_WHEEL_SCALE. */
export function CarWheel(props: GroupProps) {
  const m = useMaterials();
  const g = useMemo(() => (WHEEL_GEO ??= makeWheelGeometry()), []);
  return (
    <group {...props}>
      <mesh geometry={g.tyre} material={m.tyre} castShadow receiveShadow />
      <mesh geometry={g.barrel} material={m.gun} />
      <mesh geometry={g.hub} material={m.carbon} />
      {[1, -1].map((s) => (
        <group key={s} rotation={[0, s > 0 ? 0 : PI, 0]}>
          <mesh geometry={g.spokes} material={m.gun} position={[0, 0, 0.07]} castShadow />
          <mesh geometry={g.cover} material={m.coverBlack} position={[0, 0, 0.082]} castShadow />
          <mesh geometry={g.nut} material={m.nut} position={[0, 0, 0.09]} />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Body geometry                                                       */
/* ------------------------------------------------------------------ */

// Monocoque + nose, from the nose tip back into the engine cover.
const TUB: Station[] = [
  { x: 1.385, t: -0.19, b: -0.215, w: 0.006, n: 2.4 },
  { x: 1.37, t: -0.165, b: -0.235, w: 0.035, n: 2.4 },
  { x: 1.24, t: -0.135, b: -0.24, w: 0.052, n: 2.6 },
  { x: 1.0, t: -0.075, b: -0.225, w: 0.072, n: 2.8 },
  { x: 0.72, t: -0.005, b: -0.215, w: 0.1, n: 3 },
  { x: 0.45, t: 0.055, b: -0.22, w: 0.15, wb: 0.12, n: 3.2 },
  { x: 0.22, t: 0.085, b: -0.235, w: 0.19, wb: 0.15, n: 3.4 },
  { x: -0.05, t: 0.085, b: -0.24, w: 0.2, wb: 0.16, n: 3.4 },
  { x: -0.32, t: 0.07, b: -0.24, w: 0.18, wb: 0.15, n: 3.2 },
  { x: -0.5, t: 0.04, b: -0.22, w: 0.1, n: 3 },
  { x: -0.55, t: 0.0, b: -0.18, w: 0.02, n: 3 },
];

// Engine cover with airbox, tapering to the gearbox and crash structure.
const COVER: Station[] = [
  { x: -0.15, t: 0.33, b: 0.27, w: 0.02, n: 2, nb: 3 },
  { x: -0.165, t: 0.355, b: 0.06, w: 0.055, wb: 0.09, n: 1.9, nb: 3, m: 0.24 },
  { x: -0.25, t: 0.39, b: 0.0, w: 0.08, wb: 0.15, n: 1.9, nb: 3, m: 0.18 },
  { x: -0.42, t: 0.35, b: -0.12, w: 0.13, wb: 0.17, n: 2.1, nb: 3, m: 0.07 },
  { x: -0.63, t: 0.23, b: -0.17, w: 0.15, wb: 0.16, n: 2.4, nb: 3, m: 0.02 },
  { x: -0.86, t: 0.1, b: -0.17, w: 0.11, n: 2.6 },
  { x: -1.04, t: 0.02, b: -0.15, w: 0.07, n: 2.6 },
  { x: -1.17, t: -0.03, b: -0.13, w: 0.05, n: 2.8 },
  { x: -1.205, t: -0.05, b: -0.11, w: 0.01, n: 2.8 },
];

// Sidepod (right side, mirrored). Letterbox inlet, undercut, downwash ramp.
const POD: Station[] = [
  { x: 0.47, t: 0.045, b: -0.075, w: 0.09, wb: 0.06, z: 0.31, n: 3.2 },
  { x: 0.455, t: 0.07, b: -0.11, w: 0.12, wb: 0.07, z: 0.31, n: 3.4 },
  { x: 0.33, t: 0.09, b: -0.17, w: 0.135, wb: 0.07, z: 0.305, n: 3.4, m: 0.0 },
  { x: 0.05, t: 0.075, b: -0.21, w: 0.14, wb: 0.08, z: 0.295, n: 3.2, m: -0.03 },
  { x: -0.3, t: 0.02, b: -0.215, w: 0.125, wb: 0.09, z: 0.255, n: 3, m: -0.07 },
  { x: -0.6, t: -0.07, b: -0.215, w: 0.085, wb: 0.07, z: 0.18, n: 2.8, m: -0.13 },
  { x: -0.82, t: -0.13, b: -0.21, w: 0.04, z: 0.11, n: 2.6 },
  { x: -0.88, t: -0.155, b: -0.2, w: 0.01, z: 0.09, n: 2.6 },
];

function coverTop(x: number) {
  // piecewise-linear top of the engine cover (stations), for the fin root
  for (let i = 1; i < COVER.length; i++) {
    const a = COVER[i - 1];
    const b = COVER[i];
    if (x <= a.x && x >= b.x) return a.t + ((b.t - a.t) * (x - a.x)) / (b.x - a.x);
  }
  return 0;
}

let BODY_GEO: ReturnType<typeof makeBodyGeometry> | null = null;
function makeBodyGeometry() {
  const tub = loft(TUB, { cols: 64, sub: 8 });
  const cover = loft(COVER, { cols: 56, sub: 8 });
  const podR = loft(POD, { cols: 56, sub: 8, side: 1 });
  const podL = loft(POD, { cols: 56, sub: 8, side: -1 });

  // floor plank (outline in XZ), carbon
  const fl: [number, number][] = [
    [0.6, 0.0],
    [0.6, 0.14],
    [0.5, 0.34],
    [0.36, 0.46],
    [-0.42, 0.47],
    [-0.56, 0.4],
    [-0.64, 0.35],
    [-1.12, 0.34],
  ];
  const floorShape = new THREE.Shape();
  const outline = [...fl, ...fl.slice().reverse().map(([x, z]) => [x, -z] as [number, number])];
  floorShape.moveTo(outline[0][0], outline[0][1]);
  outline.slice(1).forEach(([x, z]) => floorShape.lineTo(x, z));
  const floor = new THREE.ExtrudeGeometry(floorShape, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.006,
    bevelSegments: 2,
  })
    .rotateX(PI / 2)
    .translate(0, G + 0.065, 0);

  // floor edge fences, diffuser
  const edges = [1, -1].map((s) =>
    plate(
      [
        [0.36, G + 0.06],
        [0.3, G + 0.1],
        [-0.38, G + 0.1],
        [-0.44, G + 0.06],
      ],
      0.012,
      s * 0.465,
    ),
  );
  const diffuser = new THREE.BoxGeometry(0.46, 0.012, 0.66)
    .rotateZ(-0.3)
    .translate(-0.9, G + 0.12, 0);
  const strakes = [0.12, -0.12, 0.26, -0.26].map((z) =>
    plate(
      [
        [-0.68, G + 0.06],
        [-1.12, G + 0.2],
        [-1.12, G + 0.06],
      ],
      0.01,
      z,
    ),
  );

  // front wing: main plane + two flaps; flaps sweep up toward the nose
  const fwLift = (k: number) => (z: number): [number, number, number] => {
    const a = Math.abs(z);
    const inner = 1 - THREE.MathUtils.smoothstep(a, 0.06, 0.42);
    return [inner * 0.02 * k, inner * 0.03 * k, 1 - inner * 0.18 * k];
  };
  const fwMain = airfoil({ x: 1.53, y: G + 0.07, chord: 0.2, thick: 0.07, camber: 0.05, aoa: 0.08, z0: -0.6, z1: 0.6 });
  const fwFlap1 = airfoil({ x: 1.415, y: G + 0.105, chord: 0.12, thick: 0.08, camber: 0.05, aoa: 0.38, z0: -0.6, z1: 0.6, bend: fwLift(1) });
  const fwFlap2 = airfoil({ x: 1.335, y: G + 0.14, chord: 0.09, thick: 0.08, camber: 0.04, aoa: 0.68, z0: -0.6, z1: 0.6, bend: fwLift(1.4) });
  const fwEnd = [1, -1].map((s) =>
    plate(
      [
        [1.555, G + 0.04],
        [1.555, G + 0.12],
        [1.5, G + 0.165],
        [1.3, G + 0.175],
        [1.25, G + 0.13],
        [1.27, G + 0.04],
      ],
      0.012,
      s * 0.605,
    ),
  );

  // rear wing: main plane + DRS flap, endplates, beam wing, swan-neck pylon
  const spoon = (z: number): [number, number] => [0, -0.018 * (1 - (z / 0.42) ** 2)];
  const rwMain = airfoil({ x: -1.17, y: G + 0.62, chord: 0.21, thick: 0.1, camber: 0.07, aoa: 0.14, z0: -0.425, z1: 0.425, bend: spoon });
  const rwFlap = airfoil({ x: -1.33, y: G + 0.665, chord: 0.13, thick: 0.08, camber: 0.05, aoa: 0.5, z0: -0.425, z1: 0.425, bend: spoon });
  const beam1 = airfoil({ x: -1.2, y: G + 0.31, chord: 0.12, thick: 0.1, camber: 0.05, aoa: 0.12, z0: -0.425, z1: 0.425 });
  const beam2 = airfoil({ x: -1.32, y: G + 0.34, chord: 0.08, thick: 0.1, camber: 0.05, aoa: 0.45, z0: -0.425, z1: 0.425 });
  const rwEnd = [1, -1].map((s) =>
    plate(
      smoothOutline(
        [
          [-1.16, G + 0.44],
          [-1.15, G + 0.62],
          [-1.17, G + 0.72],
          [-1.25, G + 0.765],
          [-1.45, G + 0.765],
          [-1.5, G + 0.71],
          [-1.5, G + 0.45],
          [-1.45, G + 0.3],
          [-1.36, G + 0.27],
          [-1.25, G + 0.32],
        ],
        80,
      ),
      0.014,
      s * 0.432,
    ),
  );
  const pylon = plate(
    smoothOutline([
      [-1.06, G + 0.2],
      [-1.17, G + 0.42],
      [-1.26, G + 0.6],
      [-1.31, G + 0.59],
      [-1.22, G + 0.4],
      [-1.13, G + 0.19],
    ]),
    0.016,
    0,
  );

  // shark fin
  const finPts: [number, number][] = [
    [-0.27, coverTop(-0.27) - 0.02],
    [-0.32, 0.415],
    [-1.02, 0.25],
    [-1.06, 0.2],
    [-1.04, coverTop(-1.04) - 0.02],
    [-0.7, coverTop(-0.7) - 0.02],
    [-0.45, coverTop(-0.45) - 0.02],
  ];
  const fin = plate(finPts, 0.008, 0, 0.003);

  // halo hoop + centre pillar
  const hoop = new THREE.CatmullRomCurve3(
    [
      [-0.21, 0.07, 0.18],
      [-0.19, 0.2, 0.175],
      [-0.12, 0.29, 0.16],
      [0.02, 0.325, 0.125],
      [0.13, 0.33, 0.05],
      [0.15, 0.33, 0],
      [0.13, 0.33, -0.05],
      [0.02, 0.325, -0.125],
      [-0.12, 0.29, -0.16],
      [-0.19, 0.2, -0.175],
      [-0.21, 0.07, -0.18],
    ].map(([a, b, c]) => new THREE.Vector3(a, b, c)),
    false,
    "centripetal",
  );
  const halo = new THREE.TubeGeometry(hoop, 90, 0.018, 12, false);
  const pillarCurve = new THREE.CatmullRomCurve3(
    [
      [0.14, 0.335, 0],
      [0.25, 0.26, 0],
      [0.33, 0.15, 0],
      [0.37, 0.05, 0],
    ].map(([a, b, c]) => new THREE.Vector3(a, b, c)),
  );
  const pillar = new THREE.TubeGeometry(pillarCurve, 24, 0.017, 10, false).scale(1, 1, 1.4);

  // suspension (carbon, elliptical cross-section)
  const unit = new THREE.CylinderGeometry(1, 1, 1, 10);
  const ry = G + WHEEL_RADIUS; // front axle height
  const rry = G + REAR_R;
  const susp: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    const z = (v: number) => v * s;
    susp.push(
      rod(unit, [1.0, ry + 0.02, z(0.07)], [FRONT_X, ry + 0.09, z(0.39)], 0.0075),
      rod(unit, [0.7, ry + 0.06, z(0.13)], [FRONT_X, ry + 0.09, z(0.39)], 0.0075),
      rod(unit, [1.04, ry - 0.1, z(0.06)], [FRONT_X, ry - 0.09, z(0.39)], 0.0075),
      rod(unit, [0.66, ry - 0.11, z(0.13)], [FRONT_X, ry - 0.09, z(0.39)], 0.0075),
      rod(unit, [FRONT_X + 0.03, ry - 0.07, z(0.37)], [0.8, ry + 0.11, z(0.09)], 0.006),
      rod(unit, [-0.78, rry + 0.06, z(0.08)], [REAR_X, rry + 0.1, z(0.37)], 0.0075),
      rod(unit, [-1.08, rry + 0.08, z(0.06)], [REAR_X, rry + 0.1, z(0.37)], 0.0075),
      rod(unit, [-0.8, rry - 0.1, z(0.12)], [REAR_X, rry - 0.09, z(0.37)], 0.0075),
      rod(unit, [-1.06, rry - 0.1, z(0.07)], [REAR_X, rry - 0.09, z(0.37)], 0.0075),
    );
  }

  // mirrors
  const mirrorHousing = new THREE.SphereGeometry(1, 24, 16);
  const mirrorStalks = [1, -1].map((s) => rod(unit, [0.24, 0.075, s * 0.2], [0.215, 0.15, s * 0.27], 0.007));

  // cockpit opening (dark) and padded rim
  const pit = new THREE.CylinderGeometry(1, 1, 0.02, 40);
  const rim = new THREE.TorusGeometry(1, 0.11, 10, 48).rotateX(PI / 2);
  // airbox intake and sidepod inlets
  const intake = new THREE.SphereGeometry(1, 24, 16);

  return {
    tub, cover, podR, podL, floor, edges, diffuser, strakes,
    fwMain, fwFlap1, fwFlap2, fwEnd, rwMain, rwFlap, beam1, beam2, rwEnd, pylon, fin,
    halo, pillar, susp, mirrorHousing, mirrorStalks, pit, rim, intake,
  };
}

/* ------------------------------------------------------------------ */
/* Body                                                                */
/* ------------------------------------------------------------------ */

export type CarBodyProps = GroupProps & { brakeLight?: boolean };

/** Decal-like text lying on a surface. `normal` rotation is applied first, then the in-plane `spin`. */
function Decal({
  children,
  position,
  rotation,
  size,
  material,
}: {
  children: string;
  position: [number, number, number];
  rotation: [number, number, number];
  size: number;
  material: THREE.Material;
}) {
  return (
    <Text
      font={FONT}
      position={position}
      rotation={rotation}
      fontSize={size}
      material={material}
      anchorX="center"
      anchorY="middle"
      letterSpacing={0.02}
    >
      {children}
    </Text>
  );
}

export function CarBody({ brakeLight = false, children, ...props }: CarBodyProps) {
  const m = useMaterials();
  const g = useMemo(() => (BODY_GEO ??= makeBodyGeometry()), []);

  return (
    <group {...props}>
      {/* bodywork */}
      <mesh geometry={g.tub} material={m.body} castShadow receiveShadow />
      <mesh geometry={g.cover} material={m.body} castShadow receiveShadow />
      <mesh geometry={g.podR} material={m.body} castShadow receiveShadow />
      <mesh geometry={g.podL} material={m.body} castShadow receiveShadow />
      <mesh geometry={g.fin} material={m.white} castShadow />

      {/* floor */}
      <mesh geometry={g.floor} material={m.carbon} castShadow receiveShadow />
      {g.edges.map((e, i) => (
        <mesh key={i} geometry={e} material={m.red} castShadow />
      ))}
      <mesh geometry={g.diffuser} material={m.carbon} castShadow />
      {g.strakes.map((e, i) => (
        <mesh key={i} geometry={e} material={m.carbon} />
      ))}

      {/* front wing */}
      <mesh geometry={g.fwMain} material={m.wingWhite} castShadow receiveShadow />
      <mesh geometry={g.fwFlap1} material={m.wingRed} castShadow />
      <mesh geometry={g.fwFlap2} material={m.wingRed} castShadow />
      {g.fwEnd.map((e, i) => (
        <mesh key={i} geometry={e} material={m.carbon} castShadow />
      ))}

      {/* rear wing */}
      <mesh geometry={g.rwMain} material={m.wingWhite} castShadow receiveShadow />
      <mesh geometry={g.rwFlap} material={m.wingRed} castShadow />
      <mesh geometry={g.beam1} material={m.carbon} castShadow />
      <mesh geometry={g.beam2} material={m.carbon} castShadow />
      {g.rwEnd.map((e, i) => (
        <mesh key={i} geometry={e} material={m.carbon} castShadow />
      ))}
      <mesh geometry={g.pylon} material={m.carbon} castShadow />

      {/* halo */}
      <mesh geometry={g.halo} material={m.carbon} castShadow />
      <mesh geometry={g.pillar} material={m.carbon} castShadow />

      {/* cockpit */}
      <mesh geometry={g.pit} material={m.hole} position={[-0.03, 0.082, 0]} scale={[0.25, 1, 0.155]} />
      <mesh geometry={g.rim} material={m.carbon} position={[-0.03, 0.088, 0]} scale={[0.255, 0.18, 0.16]} castShadow />

      {/* airbox intake + sidepod inlets */}
      <mesh geometry={g.intake} material={m.hole} position={[-0.17, 0.295, 0]} scale={[0.014, 0.045, 0.042]} />
      {[1, -1].map((s) => (
        <mesh key={s} geometry={g.intake} material={m.hole} position={[0.462, -0.01, s * 0.315]} scale={[0.012, 0.045, 0.095]} />
      ))}

      {/* mirrors */}
      {[1, -1].map((s) => (
        <group key={s}>
          <group position={[0.215, 0.158, s * 0.3]} rotation={[s * 0.12, 0, 0]}>
            <RoundedBox args={[0.05, 0.036, 0.1]} radius={0.016} smoothness={3} material={m.red} castShadow />
            <mesh geometry={g.mirrorHousing} material={m.mirror} position={[-0.024, 0, 0]} scale={[0.004, 0.012, 0.038]} />
          </group>
          <mesh geometry={g.mirrorStalks[s > 0 ? 0 : 1]} material={m.carbon} />
        </group>
      ))}

      {/* suspension */}
      {g.susp.map((e, i) => (
        <mesh key={i} geometry={e} material={m.carbon} castShadow />
      ))}

      {/* rain light */}
      <mesh position={[-1.2, -0.08, 0]} scale={[0.012, 0.035, 0.045]} geometry={g.intake}>
        <meshStandardMaterial
          color={brakeLight ? "#ff2a2a" : "#5a0d10"}
          emissive="#ff1a1a"
          emissiveIntensity={brakeLight ? 3 : 0.15}
          toneMapped={!brakeLight}
          roughness={0.3}
        />
      </mesh>

      {/* numbers + initials */}
      <group position={[0.86, -0.036, 0]} rotation={[0, 0, -0.25]}>
        <Decal position={[0, 0.008, 0]} rotation={[-PI / 2, 0, -PI / 2]} size={0.085} material={m.textBlack}>
          08
        </Decal>
      </group>
      {[1, -1].map((s) => (
        <Decal key={s} position={[-0.68, 0.265, s * 0.0062]} rotation={[0, s > 0 ? 0 : PI, 0]} size={0.12} material={m.textRed}>
          08
        </Decal>
      ))}
      <group position={[-1.235, G + 0.643, 0]} rotation={[0, 0, 0.14]}>
        <Decal position={[0, 0.006, 0]} rotation={[-PI / 2, 0, -PI / 2]} size={0.085} material={m.textRed}>
          HG
        </Decal>
      </group>
      {[1, -1].map((s) => (
        <Decal key={s} position={[-1.33, G + 0.56, s * 0.44]} rotation={[0, s > 0 ? 0 : PI, 0]} size={0.075} material={m.textWhite}>
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
