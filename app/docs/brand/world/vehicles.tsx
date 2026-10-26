"use client";

// The four cars in the garage, in the "Concrete & Ink" language of models.tsx: ink, paper,
// one orange. Procedural three.js in metres, noses toward +z, wheels on y = 0.
// Bodies are lofted from cross-sections. Every vehicle takes a livery (body, trim, accent).
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import { Box, M, W, useLabel } from "./models";

type V3 = [number, number, number];
type P2 = [number, number];

/* ------------------------------------------------------------------ liveries */

/** A paint scheme: body is the main colour, trim the second, accent the one highlight. */
export type Livery = {
  name: string;
  body: string;
  trim: string;
  accent: string;
  /** tube frame (ATV) */
  frame?: string;
  /** coilovers (ATV) */
  spring?: string;
  /** tail lamp */
  lamp?: string;
};

const INK = W.ink;
const PAPER = W.paper;
const ORANGE = W.orange;

export const LIVERIES: Record<"V01" | "V02" | "V03" | "V04", Livery[]> = {
  V01: [
    { name: "Ink", body: INK, trim: PAPER, accent: ORANGE },
    { name: "Paper", body: PAPER, trim: INK, accent: ORANGE },
    { name: "Graphite", body: "#3d3e40", trim: PAPER, accent: ORANGE },
    { name: "Orange", body: ORANGE, trim: INK, accent: PAPER },
  ],
  V02: [
    { name: "Ink", body: INK, trim: PAPER, accent: ORANGE, frame: INK, spring: ORANGE },
    { name: "Paper", body: PAPER, trim: INK, accent: ORANGE, frame: INK, spring: INK },
    { name: "Graphite", body: "#3d3e40", trim: PAPER, accent: ORANGE, frame: INK, spring: PAPER },
    { name: "Orange", body: ORANGE, trim: PAPER, accent: INK, frame: INK, spring: INK },
    { name: "Team", body: "#141414", trim: "#ffffff", accent: "#d01c24", frame: "#1a1a1a", spring: "#2463d8", lamp: "#ff2418" },
  ],
  V03: [
    { name: "Paper", body: "#e3e2dc", trim: INK, accent: ORANGE },
    { name: "Ink", body: "#2f3032", trim: "#0e0e0e", accent: ORANGE },
    { name: "Graphite", body: "#6b6b67", trim: INK, accent: ORANGE },
    { name: "Orange", body: ORANGE, trim: INK, accent: PAPER },
  ],
  V04: [
    { name: "Paper", body: PAPER, trim: INK, accent: ORANGE },
    { name: "Ink", body: "#1b1b1c", trim: "#3d3e40", accent: ORANGE },
    { name: "Graphite", body: "#5d5d58", trim: INK, accent: PAPER },
    { name: "Orange", body: ORANGE, trim: INK, accent: PAPER },
  ],
};

const std = (color: string, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

const glow = (color: string, k = 2.4) => std(color, 0.3, 0, { emissive: color, emissiveIntensity: k, toneMapped: false });

/** The livery's materials, rebuilt when the livery changes and freed after. */
function useMats(l: Livery, body: [number, number] = [0.55, 0.2]) {
  const [br, bm] = body;
  const m = useMemo(
    () => ({
      body: std(l.body, br, bm),
      trim: std(l.trim, 0.6, 0.1),
      accent: std(l.accent, 0.5, 0.1),
      frame: std(l.frame ?? INK, 0.5, 0.3),
      spring: std(l.spring ?? ORANGE, 0.35, 0.45),
      lamp: glow(l.lamp ?? l.accent),
    }),
    [l, br, bm],
  );
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m]);
  return m;
}

/* ------------------------------------------------------------------ shared kit */

const K = {
  silver: std("#c9c7c0", 0.32, 0.65),
  steel: std("#8d8c87", 0.4, 0.7),
  rim: std("#26272a", 0.45, 0.55),
  spoke: std("#8b8b87", 0.35, 0.6),
  /** tinted glass, a warm smoke like the roadster's canopy */
  smoke: std("#3b302b", 0.12, 0.35),
  shell: std("#e9e8e3", 0.34, 0.22),
  canopy: std("#151a1f", 0.1, 0.6),
  paperLine: std(W.paper, 0.7),
  lampWhite: std("#ffffff", 0.3, 0, { emissive: "#ffffff", emissiveIntensity: 2.2, toneMapped: false }),
  lampOrange: std(W.orange, 0.3, 0, { emissive: W.orange, emissiveIntensity: 2.4, toneMapped: false }),
  beacon: std("#ff7a10", 0.3, 0, { emissive: "#ff6a00", emissiveIntensity: 2.2, toneMapped: false }),
};

const unitTube = new THREE.CylinderGeometry(1, 1, 1, 10);
const UP = new THREE.Vector3(0, 1, 0);

/** A round tube from a to b (frame members, arms, forks). */
function Tube({ a, b, r = 0.022, m = M.ink }: { a: V3; b: V3; r?: number; m?: THREE.Material }) {
  const va = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(va);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const mid = va.addScaledVector(dir, 0.5);
  return <mesh geometry={unitTube} position={mid.toArray()} quaternion={q} scale={[r, len, r]} material={m} castShadow />;
}

const mx = (p: V3, s: number): V3 => [p[0] * s, p[1], p[2]];
const SIDES = [1, -1] as const;

/** Linear interpolation through a table of [z, value] (any order). */
function curve(table: P2[]) {
  const t = [...table].sort((a, b) => a[0] - b[0]);
  return (z: number) => {
    if (z <= t[0][0]) return t[0][1];
    for (let i = 1; i < t.length; i++) {
      if (z <= t[i][0]) {
        const k = (z - t[i - 1][0]) / (t[i][0] - t[i - 1][0]);
        return t[i - 1][1] + (t[i][1] - t[i - 1][1]) * k;
      }
    }
    return t[t.length - 1][1];
  };
}

type Sec = { z: number; p: P2[] };

/**
 * A solid lofted through cross-sections along z, flat shaded (one normal per facet).
 * Each section is a half profile (x >= 0) from the bottom centre, out, up and back to the top
 * centre; it is mirrored to close the ring. With mirror = false, p is the whole ring, counter-
 * clockwise seen from +z. All sections need the same number of points.
 */
function loft(secs: Sec[], { mirror = true, caps = true }: { mirror?: boolean; caps?: boolean } = {}) {
  const rings = secs.map(({ z, p }) => {
    const r: V3[] = p.map(([x, y]) => [x, y, z]);
    if (mirror) for (let i = p.length - 1; i >= 0; i--) r.push([-p[i][0], p[i][1], z]);
    return r;
  });
  const out: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const tri = (p: V3, q: V3, r: V3, flip: boolean) => {
    a.set(...p);
    b.set(...q).sub(a);
    c.set(...r).sub(a);
    if (b.cross(c).lengthSq() < 1e-12) return;
    if (flip) out.push(...p, ...r, ...q);
    else out.push(...p, ...q, ...r);
  };
  const flip = secs[secs.length - 1].z < secs[0].z;
  for (let s = 0; s < rings.length - 1; s++) {
    const r0 = rings[s];
    const r1 = rings[s + 1];
    for (let j = 0; j < r0.length; j++) {
      const k = (j + 1) % r0.length;
      tri(r0[j], r0[k], r1[k], flip);
      tri(r0[j], r1[k], r1[j], flip);
    }
  }
  if (caps) {
    for (const [ri, back] of [
      [0, secs[0].z < secs[secs.length - 1].z],
      [rings.length - 1, secs[secs.length - 1].z < secs[0].z],
    ] as const) {
      const ring = rings[ri].filter((p, i, arr) => {
        const q = arr[(i + 1) % arr.length];
        return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6;
      });
      const pts = ring.map(([x, y]) => new THREE.Vector2(x, y));
      for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(pts, [])) {
        const p = ring[i];
        const q = ring[j];
        const r = ring[k];
        const nz = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
        tri(p, q, r, back ? nz > 0 : nz < 0);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  return g;
}

/** Mirror a right-hand ring to the left, keeping it counter-clockwise. */
const mirrorRing = (p: P2[]): P2[] => p.map(([x, y]): P2 => [-x, y]).reverse();

/** A flat plate from a side outline in (z, y), t thick, centred on x = 0 (endplates, struts, fins). */
function plate(pts: P2[], t: number) {
  const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
  g.translate(0, 0, -t / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}

/** A wing element across x: an aerofoil of chord c (leading edge +z), span w. */
function aerofoil(c: number, th: number, w: number) {
  const h = c / 2;
  return plate(
    [
      [h, 0],
      [h * 0.75, th * 0.75],
      [h * 0.2, th],
      [-h * 0.6, th * 0.55],
      [-h, th * 0.1],
      [-h, 0],
      [-h * 0.2, -th * 0.2],
      [h * 0.75, -th * 0.25],
    ],
    w,
  );
}

/** A tyre as a lathe: rounded shoulders, axis along y (rotate the parent to put it on x). */
function tyreGeo(r: number, w: number, rim: number, round = 0.25) {
  const sh = Math.min(w, r - rim) * round;
  const pts = [
    new THREE.Vector2(rim, -w / 2),
    new THREE.Vector2(r - sh, -w / 2),
    new THREE.Vector2(r - sh * 0.3, -w / 2 + sh * 0.3),
    new THREE.Vector2(r, -w / 2 + sh),
    new THREE.Vector2(r, w / 2 - sh),
    new THREE.Vector2(r - sh * 0.3, w / 2 - sh * 0.3),
    new THREE.Vector2(r - sh, w / 2),
    new THREE.Vector2(rim, w / 2),
  ];
  return new THREE.LatheGeometry(pts.reverse(), 40);
}

/* ------------------------------------------------------------------ V01 Formula (HG-08) */

const F = { fz: 1.78, rz: -1.82, r: 0.36 };

function FormulaWheel({ x, z, w }: { x: number; z: number; w: number }) {
  const geo = useMemo(() => tyreGeo(F.r, w, 0.24, 0.3), [w]);
  const s = Math.sign(x);
  return (
    <group position={[x, F.r, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh geometry={geo} material={M.tyre} castShadow />
      {/* paper sidewall band, the wheel cover and the nut */}
      <mesh position={[0, -s * (w / 2 + 0.002), 0]} rotation={[s * Math.PI / 2, 0, 0]} material={K.paperLine}>
        <ringGeometry args={[0.265, 0.29, 40]} />
      </mesh>
      <mesh position={[0, -s * (w / 2 - 0.02), 0]} material={M.graphite}>
        <cylinderGeometry args={[0.24, 0.24, 0.02, 32]} />
      </mesh>
      <mesh position={[0, -s * (w / 2 + 0.005), 0]} material={M.ink}>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 6]} />
      </mesh>
    </group>
  );
}

export function Formula({ livery = LIVERIES.V01[0] }: { livery?: Livery }) {
  const mt = useMats(livery);
  const geo = useMemo(() => {
    // nose and survival cell: half profiles, bottom centre → out → top centre
    const cell = (z: number, yb: number, yt: number, w: number): Sec => ({
      z,
      p: [
        [0, yb],
        [w * 0.8, yb],
        [w, (yb + yt) / 2],
        [w * 0.82, yt],
        [0, yt + w * 0.12],
      ],
    });
    const tub = loft([
      cell(2.72, 0.17, 0.25, 0.07),
      cell(2.4, 0.17, 0.34, 0.12),
      cell(1.9, 0.19, 0.47, 0.17),
      cell(1.35, 0.17, 0.58, 0.24),
      cell(0.75, 0.1, 0.64, 0.3),
      cell(0.2, 0.1, 0.63, 0.4),
      cell(-0.45, 0.1, 0.62, 0.4),
      cell(-0.9, 0.1, 0.56, 0.32),
    ]);
    // sidepods with a deep undercut, the widest point up high
    const pod = (z: number, xo: number, yt: number, yb = 0.1): P2[] => [
      [0.3, yb],
      [xo - 0.24, yb + 0.03],
      [xo - 0.02, yt - 0.2],
      [xo, yt - 0.08],
      [xo - 0.14, yt],
      [0.3, yt + 0.02],
    ];
    const podR: Sec[] = [
      { z: 0.6, p: pod(0.6, 0.66, 0.6) },
      { z: 0.3, p: pod(0.3, 0.72, 0.62) },
      { z: -0.4, p: pod(-0.4, 0.68, 0.6) },
      { z: -1.0, p: pod(-1.0, 0.54, 0.5) },
      { z: -1.55, p: pod(-1.55, 0.38, 0.36) },
    ];
    const lower = podR.map(({ z, p }) => ({ z, p: [p[0], p[1], p[2], p[3], [0.3, p[3][1]]] as P2[] }));
    const upper = podR.map(({ z, p }) => ({ z, p: [[0.3, p[3][1] - 0.001], p[3], p[4], p[5]] as P2[] }));
    const pair = (secs: Sec[]) => mergeGeometries([loft(secs, { mirror: false }), loft(secs.map(({ z, p }) => ({ z, p: mirrorRing(p) })), { mirror: false })]);
    const pods = pair(lower);
    const podTops = pair(upper);
    // paper engine cover from the airbox to the rear crash structure
    const cv = (z: number, yb: number, yt: number, wb: number, wm: number, ym: number, wt: number): Sec => ({
      z,
      p: [
        [0, yb],
        [wb, yb],
        [wm, ym],
        [wt, yt],
        [0, yt + 0.01],
      ],
    });
    const cover = loft([
      cv(-0.32, 0.52, 0.99, 0.3, 0.2, 0.86, 0.1),
      cv(-0.7, 0.45, 0.94, 0.38, 0.3, 0.76, 0.13),
      cv(-1.2, 0.34, 0.8, 0.33, 0.24, 0.62, 0.1),
      cv(-1.7, 0.3, 0.6, 0.22, 0.16, 0.5, 0.07),
      cv(-2.18, 0.3, 0.44, 0.1, 0.08, 0.4, 0.04),
    ]);
    // floor in plan, extruded down
    const fs = new THREE.Shape(
      ([
        [0.3, 1.35],
        [0.82, 0.75],
        [0.86, -1.1],
        [0.62, -1.45],
        [0.5, -2.15],
        [-0.5, -2.15],
        [-0.62, -1.45],
        [-0.86, -1.1],
        [-0.82, 0.75],
        [-0.3, 1.35],
      ] as P2[]).map(([x, z]) => new THREE.Vector2(x, z)),
    );
    const floor = new THREE.ExtrudeGeometry(fs, { depth: 0.035, bevelEnabled: false });
    floor.rotateX(Math.PI / 2);
    floor.translate(0, 0.1, 0);
    const fin = plate(
      [
        [-0.55, 0.9],
        [-0.62, 0.99],
        [-1.95, 0.9],
        [-1.95, 0.5],
      ],
      0.016,
    );
    const fEnd = plate(
      [
        [2.86, 0.06],
        [2.86, 0.27],
        [2.6, 0.33],
        [2.24, 0.31],
        [2.2, 0.06],
      ],
      0.025,
    );
    const rEnd = plate(
      [
        [-2.0, 0.44],
        [-2.04, 1.0],
        [-2.62, 1.0],
        [-2.62, 0.72],
        [-2.44, 0.44],
      ],
      0.03,
    );
    const pylon = plate(
      [
        [-2.05, 0.4],
        [-2.2, 0.84],
        [-2.32, 0.84],
        [-2.2, 0.4],
      ],
      0.04,
    );
    return {
      tub,
      pods,
      podTops,
      cover,
      floor,
      fin,
      fEnd,
      rEnd,
      pylon,
      main: aerofoil(0.34, 0.05, 1.9),
      el2: aerofoil(0.22, 0.04, 1.72),
      el3: aerofoil(0.17, 0.035, 1.6),
      rMain: aerofoil(0.38, 0.06, 1.02),
      rFlap: aerofoil(0.24, 0.04, 1.02),
      beam: aerofoil(0.2, 0.035, 0.9),
    };
  }, []);
  const num = useLabel("08", { fg: livery.body, bg: livery.trim, w: 256, h: 128, size: 104 });
  const halo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(
      ([
        [-0.3, 0.64, -0.5],
        [-0.31, 0.82, -0.32],
        [-0.22, 0.88, -0.02],
        [0, 0.9, 0.08],
        [0.22, 0.88, -0.02],
        [0.31, 0.82, -0.32],
        [0.3, 0.64, -0.5],
      ] as V3[]).map((p) => new THREE.Vector3(...p)),
    );
    return new THREE.TubeGeometry(c, 40, 0.032, 8);
  }, []);
  const { fz, rz } = F;
  return (
    <group>
      <mesh geometry={geo.floor} material={M.inkMatte} castShadow receiveShadow />
      <mesh geometry={geo.tub} material={mt.body} castShadow />
      <mesh geometry={geo.pods} material={mt.body} castShadow />
      <mesh geometry={geo.podTops} material={mt.trim} castShadow />
      <mesh geometry={geo.cover} material={mt.trim} castShadow />
      <mesh geometry={geo.fin} material={mt.trim} castShadow />
      {SIDES.map((s) => (
        <mesh key={s} position={[s * 0.01, 0.84, -1.28]} rotation={[0, (s * Math.PI) / 2, 0]} material={num}>
          <planeGeometry args={[0.4, 0.2]} />
        </mesh>
      ))}
      {/* the one orange line, along the top of the nose */}
      <Tube a={[0, 0.296, 2.6]} b={[0, 0.54, 1.62]} r={0.012} m={mt.accent} />
      <Tube a={[0, 0.54, 1.62]} b={[0, 0.66, 0.85]} r={0.012} m={mt.accent} />
      {/* cockpit opening, headrest, airbox mouth, halo */}
      <Box s={[0.46, 0.03, 0.95]} p={[0, 0.655, 0.0]} m={K.canopy} />
      <Box s={[0.5, 0.08, 0.22]} p={[0, 0.69, -0.42]} m={M.graphite} />
      <Box s={[0.18, 0.13, 0.02]} p={[0, 0.9, -0.31]} m={K.canopy} />
      <mesh geometry={halo} material={mt.body} castShadow />
      <Tube a={[0, 0.66, 0.38]} b={[0, 0.9, 0.08]} r={0.03} />
      {/* sidepod inlets */}
      {SIDES.map((s) => (
        <Box key={s} s={[0.3, 0.2, 0.02]} p={[s * 0.5, 0.48, 0.61]} m={K.canopy} />
      ))}
      {/* mirrors */}
      {SIDES.map((s) => (
        <group key={s}>
          <Tube a={[s * 0.36, 0.62, 0.42]} b={[s * 0.5, 0.74, 0.42]} r={0.012} />
          <Box s={[0.14, 0.06, 0.04]} p={[s * 0.53, 0.76, 0.42]} m={mt.body} />
        </group>
      ))}
      {/* front wing: three elements and endplates */}
      <mesh geometry={geo.main} position={[0, 0.09, 2.62]} material={mt.body} castShadow />
      <mesh geometry={geo.el2} position={[0, 0.15, 2.4]} rotation={[-0.32, 0, 0]} material={mt.body} castShadow />
      <mesh geometry={geo.el3} position={[0, 0.22, 2.3]} rotation={[-0.55, 0, 0]} material={mt.trim} castShadow />
      {SIDES.map((s) => (
        <mesh key={s} geometry={geo.fEnd} position={[s * 0.95, 0, 0]} material={mt.body} castShadow />
      ))}
      {/* rear wing: main plane, paper flap, beam wing, endplates, pylon, diffuser */}
      <mesh geometry={geo.rMain} position={[0, 0.8, -2.3]} rotation={[0.12, 0, 0]} material={mt.body} castShadow />
      <mesh geometry={geo.rFlap} position={[0, 0.9, -2.46]} rotation={[0.5, 0, 0]} material={mt.trim} castShadow />
      <mesh geometry={geo.beam} position={[0, 0.46, -2.3]} rotation={[0.2, 0, 0]} material={mt.body} castShadow />
      {SIDES.map((s) => (
        <mesh key={s} geometry={geo.rEnd} position={[s * 0.52, 0, 0]} material={mt.body} castShadow />
      ))}
      <mesh geometry={geo.pylon} material={mt.body} castShadow />
      <Box s={[0.96, 0.03, 0.5]} p={[0, 0.16, -2.02]} r={[-0.3, 0, 0]} m={M.inkMatte} />
      <Box s={[0.14, 0.14, 0.3]} p={[0, 0.36, -2.24]} m={M.graphite} />
      {/* suspension: wishbones and pushrods to the uprights */}
      {SIDES.map((s) => (
        <group key={s}>
          <Tube a={[s * 0.18, 0.3, fz + 0.2]} b={[s * 0.66, 0.3, fz]} r={0.015} />
          <Tube a={[s * 0.18, 0.3, fz - 0.25]} b={[s * 0.66, 0.3, fz]} r={0.015} />
          <Tube a={[s * 0.2, 0.46, fz + 0.15]} b={[s * 0.64, 0.5, fz]} r={0.015} />
          <Tube a={[s * 0.2, 0.46, fz - 0.25]} b={[s * 0.64, 0.5, fz]} r={0.015} />
          <Tube a={[s * 0.6, 0.3, fz]} b={[s * 0.22, 0.56, fz - 0.15]} r={0.013} m={M.graphite} />
          <Tube a={[s * 0.16, 0.28, rz + 0.3]} b={[s * 0.6, 0.3, rz]} r={0.015} />
          <Tube a={[s * 0.16, 0.28, rz - 0.25]} b={[s * 0.6, 0.3, rz]} r={0.015} />
          <Tube a={[s * 0.14, 0.5, rz + 0.2]} b={[s * 0.6, 0.52, rz]} r={0.015} />
          <Tube a={[s * 0.14, 0.5, rz - 0.2]} b={[s * 0.6, 0.52, rz]} r={0.015} />
          <FormulaWheel x={s * 0.8} z={fz} w={0.3} />
          <FormulaWheel x={s * 0.78} z={rz} w={0.4} />
        </group>
      ))}
    </group>
  );
}


/* ------------------------------------------------------------------ small helpers */

/** The rotation that lays a +z-facing plane flat on a face with normal n, its text upright. */
function faceQuat(n: THREE.Vector3) {
  const up = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
  const right = new THREE.Vector3().crossVectors(up, n);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, n));
}

/** A canvas texture drawn once; flip mirrors it left to right (for the other side of a car). */
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, flip = false) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (flip) {
    t.repeat.x = -1;
    t.offset.x = 1;
  }
  return t;
}

/* ------------------------------------------------------------------ V02 ATV (E14) */

/** A knobby off-road tyre: a round-shouldered carcass with big blocks in a staggered chevron. */
function knobbyGeo(r: number, w: number) {
  const parts: THREE.BufferGeometry[] = [tyreGeo(r - 0.035, w, r * 0.5, 0.35)];
  const n = 20;
  for (let i = 0; i < n; i++) {
    for (const row of [-1, 1]) {
      const a = ((i + (row > 0 ? 0.5 : 0)) / n) * Math.PI * 2;
      const g = new THREE.BoxGeometry(0.05, w * 0.4, 0.07);
      g.rotateX(row * 0.3);
      g.translate(r - 0.035, row * w * 0.24, 0);
      g.rotateY(-a);
      parts.push(g);
    }
    // shoulder lugs so the sidewall reads knobby in profile
    const g = new THREE.BoxGeometry(0.07, 0.05, 0.07);
    g.translate(r - 0.07, (i % 2 ? 1 : -1) * (w / 2 - 0.01), 0);
    g.rotateY(-((i + 0.25) / n) * Math.PI * 2);
    parts.push(g);
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}

/** Big knobby on a silver dished rim: a star-cut centre with four lugs. */
function OffroadWheel({ p, geo, r, w }: { p: V3; geo: THREE.BufferGeometry; r: number; w: number }) {
  const s = Math.sign(p[0]);
  const face = -s * (w / 2 - 0.03);
  return (
    <group position={p} rotation={[0, 0, Math.PI / 2]}>
      <mesh geometry={geo} material={M.tyre} castShadow />
      <mesh position={[0, face, 0]} material={K.silver}>
        <cylinderGeometry args={[r * 0.55, r * 0.55, 0.05, 28]} />
      </mesh>
      <mesh position={[0, face - s * 0.026, 0]} rotation={[s * Math.PI / 2, 0, 0]} material={K.steel}>
        <ringGeometry args={[r * 0.46, r * 0.5, 28]} />
      </mesh>
      {/* four cut-outs round the hub, four lug nuts between them */}
      {Array.from({ length: 4 }, (_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const b = a + Math.PI / 4;
        return (
          <group key={i}>
            <mesh position={[Math.cos(a) * r * 0.3, face - s * 0.027, Math.sin(a) * r * 0.3]} material={M.inkMatte}>
              <cylinderGeometry args={[r * 0.1, r * 0.1, 0.004, 12]} />
            </mesh>
            <mesh position={[Math.cos(b) * r * 0.2, face - s * 0.032, Math.sin(b) * r * 0.2]} material={K.steel}>
              <cylinderGeometry args={[0.014, 0.014, 0.016, 6]} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, face - s * 0.03, 0]} material={K.steel}>
        <cylinderGeometry args={[r * 0.12, r * 0.12, 0.03, 12]} />
      </mesh>
    </group>
  );
}

// One coil spring, 1 m long along y, scaled to fit.
const springGeo = (() => {
  const pts: THREE.Vector3[] = [];
  const turns = 10;
  for (let i = 0; i <= turns * 16; i++) {
    const t = i / (turns * 16);
    pts.push(new THREE.Vector3(Math.cos(t * turns * Math.PI * 2) * 0.042, t - 0.5, Math.sin(t * turns * Math.PI * 2) * 0.042));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 16, 0.009, 5);
})();

/** Long-travel coilover from the arm (a) to the frame (b): shaft, body and the coil round it. */
function Coilover({ a, b, body, coil }: { a: V3; b: V3; body: THREE.Material; coil: THREE.Material }) {
  const va = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(va);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const at = (k: number) => va.clone().addScaledVector(dir, k).toArray() as V3;
  return (
    <>
      <Tube a={a} b={at(0.45)} r={0.013} m={K.silver} />
      <Tube a={at(0.4)} b={b} r={0.028} m={body} />
      <Tube a={at(0.86)} b={at(0.93)} r={0.05} m={body} />
      <mesh geometry={springGeo} position={at(0.5)} quaternion={q} scale={[1.05, len * 0.62, 1.05]} material={coil} castShadow />
    </>
  );
}

/** Air shock (the front pair): a dark body over a bare silver shaft, no coil. */
function Shock({ a, b }: { a: V3; b: V3 }) {
  const va = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(va);
  const at = (k: number) => va.clone().addScaledVector(dir, k).toArray() as V3;
  return (
    <>
      <Tube a={a} b={at(0.45)} r={0.012} m={K.silver} />
      <Tube a={at(0.38)} b={b} r={0.032} m={M.graphite} />
    </>
  );
}

const E = { fz: 0.74, rz: -0.74, r: 0.32, fx: 0.7, rx: 0.68 };

// Space frame nodes, right side (x mirrors). The rear roll hoop narrows to the top, the roof runs
// forward level, the front bracing drops to the bumper; a rear bay carries the motor.
const EN: Record<string, V3> = {
  hb: [0.4, 0.34, -0.46],
  hm: [0.4, 0.8, -0.46],
  ht: [0.19, 1.5, -0.5],
  rf: [0.24, 1.5, 0.2],
  bu: [0.3, 0.8, 0.88],
  bl: [0.24, 0.36, 0.86],
  sf: [0.4, 0.8, 0.55],
  lf: [0.4, 0.34, 0.5],
  rt: [0.37, 0.84, -0.98],
  rb: [0.32, 0.36, -0.98],
};
const E_EDGES: [string, string][] = [
  ["hb", "hm"],
  ["hm", "ht"],
  ["ht", "rf"],
  ["rf", "bu"],
  ["rf", "sf"],
  ["hm", "sf"],
  ["sf", "bu"],
  ["bu", "bl"],
  ["hb", "lf"],
  ["lf", "bl"],
  ["lf", "sf"],
  ["hm", "rt"],
  ["hb", "rb"],
  ["rt", "rb"],
  ["hb", "rt"],
];
const E_TUBES: [V3, V3][] = [];
for (const s of SIDES) for (const [a, b] of E_EDGES) E_TUBES.push([mx(EN[a], s), mx(EN[b], s)]);
for (const k of ["hb", "ht", "rf", "bl", "rt", "rb"]) E_TUBES.push([EN[k], mx(EN[k], -1)]);
// a diagonal across the roof
E_TUBES.push([EN.ht, mx(EN.rf, -1)]);

// The firewall "tent" behind the seat: a ridge on the hoop top, down to the rear of the bay.
const TENT: V3[] = [
  [0.17, 1.49, -0.5],
  [0.39, 0.8, -0.45],
  [0.37, 0.84, -0.97],
];
const tentN = {
  rear: new THREE.Vector3(0, 0.66, 0.48).normalize().cross(new THREE.Vector3(-1, 0, 0)).negate().normalize(),
  side: (() => {
    const [a, b, c] = TENT.map((p) => new THREE.Vector3(...p));
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    return n.x < 0 ? n.negate() : n;
  })(),
};

/** Side graphics: diagonal accent and trim stripes falling toward the nose, a band low at the front. */
function drawSide(l: Livery) {
  return (g: CanvasRenderingContext2D) => {
    const w = 512;
    const h = 218;
    g.fillStyle = l.body;
    g.fillRect(0, 0, w, h);
    const band = (y0: number, y1: number, th: number, c: string, x0 = 0) => {
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(x0 * w, y0 * h);
      g.lineTo(w, y1 * h);
      g.lineTo(w, (y1 + th) * h);
      g.lineTo(x0 * w, (y0 + th) * h);
      g.closePath();
      g.fill();
    };
    band(0.06, 0.3, 0.12, l.accent, 0.08);
    band(0.24, 0.46, 0.035, l.trim, 0.02);
    band(0.33, 0.55, 0.08, l.accent, 0.18);
    band(0.47, 0.66, 0.03, l.trim, 0.3);
    // the low band with a jagged leading edge
    g.fillStyle = l.accent;
    g.beginPath();
    g.moveTo(0.36 * w, 0.82 * h);
    g.lineTo(0.42 * w, 0.72 * h);
    g.lineTo(w, 0.68 * h);
    g.lineTo(w, 0.94 * h);
    g.lineTo(0.3 * w, 0.98 * h);
    g.lineTo(0.4 * w, 0.88 * h);
    g.closePath();
    g.fill();
    // a thin edge line top and bottom
    g.fillStyle = l.trim;
    g.fillRect(0, 0, w, 3);
  };
}

/** Hood graphics: two accent chevrons pointing forward. */
function drawHood(l: Livery) {
  return (g: CanvasRenderingContext2D) => {
    const w = 256;
    const h = 256;
    g.fillStyle = l.body;
    g.fillRect(0, 0, w, h);
    const chev = (y: number, th: number, c: string) => {
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(0, y + 70);
      g.lineTo(w / 2, y);
      g.lineTo(w, y + 70);
      g.lineTo(w, y + 70 + th);
      g.lineTo(w / 2, y + th);
      g.lineTo(0, y + 70 + th);
      g.closePath();
      g.fill();
    };
    chev(70, 46, l.accent);
    chev(132, 12, l.trim);
    chev(160, 28, l.accent);
  };
}

export function Atv({ livery = LIVERIES.V02[0] }: { livery?: Livery }) {
  const { fz, rz, r, fx, rx } = E;
  const mt = useMats(livery, [0.62, 0.15]);
  const tyre = useMemo(() => knobbyGeo(r, 0.24), [r]);
  const tyreR = useMemo(() => knobbyGeo(r, 0.27), [r]);
  const num = useLabel("E14", { fg: livery.trim, bg: livery.body, w: 256, h: 128, size: 98 });
  const plate = useLabel("E14", { fg: livery.trim, bg: livery.body, w: 256, h: 300, size: 118 });
  const paint = useMemo(() => {
    const side = drawSide(livery);
    const mk = (t: THREE.Texture) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, side: THREE.DoubleSide });
    return {
      left: mk(canvasTex(512, 218, side)),
      right: mk(canvasTex(512, 218, side, true)),
      hood: mk(canvasTex(256, 256, drawHood(livery))),
    };
  }, [livery]);
  useEffect(
    () => () =>
      Object.values(paint).forEach((m) => {
        m.map?.dispose();
        m.dispose();
      }),
    [paint],
  );
  const tent = useMemo(() => new ConvexGeometry(TENT.flatMap((p) => SIDES.map((s) => new THREE.Vector3(...mx(p, s))))), []);
  const q = useMemo(() => ({ rear: faceQuat(tentN.rear), side: faceQuat(tentN.side), sideL: faceQuat(tentN.side.clone().setX(-tentN.side.x)) }), []);
  const sideC = new THREE.Vector3(...TENT.reduce((a, p) => [a[0] + p[0] / 3, a[1] + p[1] / 3, a[2] + p[2] / 3], [0, 0, 0] as V3));
  const rearAt = (k: number, off = 0.006) => new THREE.Vector3(0, 0.84 + 0.66 * k, -0.98 + 0.48 * k).addScaledVector(tentN.rear, off).toArray() as V3;
  const hoodTilt = -Math.PI / 2 + Math.atan2(0.17, 0.46);
  const cornerN = new THREE.Vector3(0.33, 0, 0.1).normalize();
  return (
    <group>
      {E_TUBES.map(([a, b], i) => (
        <Tube key={i} a={a} b={b} r={0.02} m={mt.frame} />
      ))}
      {/* front bumper bar, proud of the body */}
      <Tube a={[-0.38, 0.8, 0.9]} b={[0.38, 0.8, 0.9]} r={0.02} m={mt.frame} />

      {/* body: side panels with the stripes, the angled corners with the plate, the nose, the hood */}
      {SIDES.map((s) => (
        <group key={s}>
          <mesh position={[s * 0.405, 0.575, 0.045]} rotation={[0, (s * Math.PI) / 2, 0]} material={s > 0 ? paint.right : paint.left} castShadow>
            <planeGeometry args={[1.01, 0.43]} />
          </mesh>
          <mesh position={[s * 0.352, 0.575, 0.715]} quaternion={faceQuat(cornerN.clone().setX(s * cornerN.x))} material={plate} castShadow>
            <planeGeometry args={[0.345, 0.43]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.58, 0.885]} material={mt.body} castShadow>
        <planeGeometry args={[0.6, 0.44]} />
      </mesh>
      <mesh position={[0, 0.885, 0.65]} rotation={[hoodTilt, 0, 0]} material={paint.hood} castShadow>
        <planeGeometry args={[0.62, 0.49]} />
      </mesh>
      {/* floor pan */}
      <Box s={[0.8, 0.02, 1.0]} p={[0, 0.34, 0.02]} m={M.graphite} />
      <Box s={[0.5, 0.02, 0.36]} p={[0, 0.35, 0.68]} m={M.graphite} />

      {/* the firewall tent: E14 on the back and both flanks, the brake light and the beacon */}
      <mesh geometry={tent} material={mt.body} castShadow />
      <mesh position={rearAt(0.42)} quaternion={q.rear} material={num}>
        <planeGeometry args={[0.4, 0.2]} />
      </mesh>
      <mesh position={rearAt(0.8, 0.02)} quaternion={q.rear} material={mt.lamp}>
        <boxGeometry args={[0.24, 0.045, 0.03]} />
      </mesh>
      {SIDES.map((s) => (
        <mesh key={s} position={sideC.clone().setX(s * sideC.x).addScaledVector(s > 0 ? tentN.side : tentN.side.clone().setX(-tentN.side.x), 0.006).toArray()} quaternion={s > 0 ? q.side : q.sideL} material={num}>
          <planeGeometry args={[0.24, 0.12]} />
        </mesh>
      ))}
      <mesh position={[0, 1.52, -0.5]} material={M.ink}>
        <boxGeometry args={[0.12, 0.03, 0.08]} />
      </mesh>
      <mesh position={[0, 1.565, -0.5]} material={K.beacon}>
        <cylinderGeometry args={[0.04, 0.045, 0.07, 14]} />
      </mesh>

      {/* cockpit: seat, steering, fire extinguisher */}
      <Box s={[0.4, 0.08, 0.42]} p={[0, 0.4, -0.18]} m={mt.accent} />
      <Box s={[0.4, 0.56, 0.07]} p={[0, 0.7, -0.4]} r={[-0.14, 0, 0]} m={mt.accent} />
      <Tube a={[0, 0.74, 0.66]} b={[0, 0.88, 0.32]} r={0.016} m={M.graphite} />
      <mesh position={[0, 0.9, 0.3]} rotation={[1.0, 0, 0]} material={M.ink}>
        <torusGeometry args={[0.13, 0.017, 6, 22]} />
      </mesh>
      <mesh position={[-0.3, 0.62, -0.36]} material={mt.accent} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.26, 14]} />
      </mesh>
      <mesh position={[-0.3, 0.77, -0.36]} material={K.silver}>
        <cylinderGeometry args={[0.02, 0.03, 0.05, 10]} />
      </mesh>

      {/* the bay: motor, gearbox, battery, the orange HV runs, half shafts */}
      <mesh position={[0, 0.5, -0.8]} rotation={[0, 0, Math.PI / 2]} material={K.silver} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.28, 18]} />
      </mesh>
      <Box s={[0.32, 0.2, 0.18]} p={[0, 0.42, -0.64]} m={M.graphite} />
      <Box s={[0.5, 0.2, 0.28]} p={[0, 0.7, -0.66]} m={M.inkMatte} />
      {SIDES.map((s) => (
        <group key={s}>
          <Tube a={[s * 0.06, 0.62, -0.84]} b={[s * 0.16, 0.72, -0.9]} r={0.012} m={M.orange} />
          <Tube a={[s * 0.16, 0.72, -0.9]} b={[s * 0.22, 0.66, -0.56]} r={0.012} m={M.orange} />
          <Tube a={[s * 0.14, 0.42, -0.72]} b={[s * (rx - 0.1), r, rz]} r={0.018} m={K.steel} />
        </group>
      ))}

      {/* front: double A-arms, air shocks, uprights, wheels */}
      {SIDES.map((s) => (
        <group key={`f${s}`}>
          <Tube a={[s * 0.24, 0.37, fz + 0.12]} b={[s * 0.56, 0.25, fz]} r={0.016} m={mt.accent} />
          <Tube a={[s * 0.36, 0.36, fz - 0.22]} b={[s * 0.56, 0.25, fz]} r={0.016} m={mt.accent} />
          <Tube a={[s * 0.25, 0.6, fz + 0.1]} b={[s * 0.54, 0.43, fz]} r={0.016} m={mt.accent} />
          <Tube a={[s * 0.36, 0.6, fz - 0.18]} b={[s * 0.54, 0.43, fz]} r={0.016} m={mt.accent} />
          <Box s={[0.05, 0.24, 0.06]} p={[s * 0.57, 0.34, fz]} m={M.graphite} />
          <Shock a={[s * 0.47, 0.28, fz - 0.02]} b={[s * 0.38, 0.86, 0.56]} />
          <OffroadWheel p={[s * fx, r, fz]} geo={tyre} r={r} w={0.24} />
        </group>
      ))}
      {/* rear: trailing arms and toe links, the long coilovers, wheels */}
      {SIDES.map((s) => (
        <group key={`r${s}`}>
          <Tube a={[s * 0.4, 0.4, -0.18]} b={[s * 0.54, 0.3, rz]} r={0.022} m={mt.accent} />
          <Tube a={[s * 0.3, 0.38, -0.92]} b={[s * 0.53, 0.26, rz]} r={0.015} m={mt.accent} />
          <Tube a={[s * 0.32, 0.58, -0.94]} b={[s * 0.52, 0.42, rz]} r={0.015} m={mt.accent} />
          <Box s={[0.05, 0.24, 0.06]} p={[s * 0.53, 0.33, rz]} m={M.graphite} />
          <Coilover a={[s * 0.5, 0.36, rz + 0.1]} b={[s * 0.41, 0.98, -0.6]} body={mt.spring} coil={livery.name === "Team" ? M.ink : mt.spring} />
          <OffroadWheel p={[s * rx, r, rz]} geo={tyreR} r={r} w={0.27} />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ V03 Roadster */

const RS = { fz: 1.45, rz: -1.35, r: 0.36, ra: 0.41, cy: 0.35 };

/** Height of the wheel-arch cut at z, or 0 outside the arches. */
function archAt(z: number) {
  for (const cz of [RS.fz, RS.rz]) {
    const d = z - cz;
    if (Math.abs(d) <= RS.ra) return RS.cy + Math.sqrt(RS.ra * RS.ra - d * d);
  }
  return 0;
}

// Plan and elevation of the creases, front (z = 2.3) to tail (z = -2.3).
const rsHw = curve([
  [2.3, 0.84],
  [2.15, 0.92],
  [1.9, 0.97],
  [1.45, 0.99],
  [0.6, 0.96],
  [-0.3, 0.95],
  [-1.35, 1.0],
  [-2.0, 0.98],
  [-2.3, 0.93],
]);
/** shoulder crease, the widest line */
const rsYc = curve([
  [2.3, 0.47],
  [2.0, 0.62],
  [1.45, 0.8],
  [0.9, 0.72],
  [0.2, 0.66],
  [-0.6, 0.7],
  [-1.35, 0.82],
  [-2.0, 0.82],
  [-2.3, 0.8],
]);
/** where the dark lower body ends, rising toward the tail */
const rsYs = curve([
  [2.3, 0.24],
  [1.9, 0.26],
  [0.6, 0.29],
  [-0.6, 0.31],
  [-1.8, 0.35],
  [-2.3, 0.38],
]);
/** hood and deck edge: the inner crease of the fenders */
const rsXe = curve([
  [2.3, 0.7],
  [1.45, 0.74],
  [0.95, 0.72],
  [0.2, 0.76],
  [-1.35, 0.78],
  [-2.3, 0.72],
]);
const rsYd = curve([
  [2.3, 0.5],
  [2.0, 0.63],
  [1.45, 0.82],
  [0.95, 0.86],
  [0.3, 0.8],
  [-0.6, 0.8],
  [-1.35, 0.87],
  [-2.0, 0.88],
  [-2.3, 0.86],
]);
/** centre line: hood, (hidden under the canopy), rear deck */
const rsYt = curve([
  [2.3, 0.505],
  [2.0, 0.6],
  [1.45, 0.76],
  [0.95, 0.865],
  [0.6, 0.78],
  [-1.5, 0.82],
  [-1.7, 0.89],
  [-2.3, 0.875],
]);

/** Half section at z: 0 bottom centre, 1-2 the dark sill (or the wheel-well roof), 3 shoulder, 4 deck edge, 5 top centre. */
function rsProfile(z: number, arch: number): P2[] {
  const hw = rsHw(z);
  const yc = rsYc(z);
  const yb = 0.14 + Math.max(0, (z - 1.9) / 0.4) * 0.08;
  const a = arch > 0 ? Math.min(arch, yc - 0.03) : 0;
  return [
    [0, yb],
    a ? [hw - 0.3, a - 0.01] : [hw - 0.1, yb],
    [hw - 0.08, a || rsYs(z)],
    [hw, yc],
    [rsXe(z), Math.max(rsYd(z), yc + 0.02)],
    [0, rsYt(z)],
  ];
}

function rsSections(): Sec[] {
  const out: Sec[] = [];
  const push = (z: number, arch = archAt(z)) => out.push({ z, p: rsProfile(z, arch) });
  for (const z of [2.3, 2.24, 2.14, 2.0]) push(z);
  for (const cz of [RS.fz, RS.rz]) {
    if (cz === RS.rz) for (const z of [1.0, 0.95, 0.6, 0.2, -0.3, -0.6]) push(z);
    push(cz + RS.ra, 0);
    for (let i = 0; i <= 14; i++) push(cz + RS.ra - (i / 14) * RS.ra * 2);
    push(cz - RS.ra, 0);
  }
  for (const z of [-1.95, -2.15, -2.26, -2.3]) push(z);
  return out;
}

/**
 * Smooth-shaded strip through the points a..b of every section: one indexed grid, so the
 * normals are smooth inside the strip and crisp where it meets the next one. A strip that ends
 * on the centre line runs on across it; any other is mirrored to the left as its own piece.
 */
function strip(secs: Sec[], a: number, b: number) {
  const rings: P2[][] = [];
  const zs: number[] = [];
  for (const { z, p } of secs) {
    const pts = p.slice(a, b + 1);
    const prev = rings[rings.length - 1];
    // a repeated section (the vertical edge of an arch) only matters to the strips it changes
    if (prev && zs[zs.length - 1] === z && pts.every((q, i) => q[0] === prev[i][0] && q[1] === prev[i][1])) continue;
    rings.push(pts);
    zs.push(z);
  }
  const first = rings[0][0][0] === 0;
  const last = rings[0][rings[0].length - 1][0] === 0;
  const full = (r: P2[]): P2[] => {
    if (last) return [...r, ...r.slice(0, -1).reverse().map(([x, y]): P2 => [-x, y])];
    if (first) return [...r.slice(1).reverse().map(([x, y]): P2 => [-x, y]), ...r];
    return r;
  };
  const build = (rs: P2[][], mirror: boolean) => {
    const pos: number[] = [];
    const idx: number[] = [];
    const C = rs[0].length;
    rs.forEach((r, s) => r.forEach(([x, y]) => pos.push(mirror ? -x : x, y, zs[s])));
    const flip = (zs[zs.length - 1] < zs[0]) !== mirror;
    for (let s = 0; s < rs.length - 1; s++) {
      for (let j = 0; j < C - 1; j++) {
        const p = s * C + j;
        const q = p + 1;
        const t = p + C + 1;
        const u = p + C;
        if (flip) idx.push(p, t, q, p, u, t);
        else idx.push(p, q, t, p, t, u);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  if (first || last) return build(rings.map(full), false);
  return mergeGeometries([build(rings, false), build(rings, true)]);
}

/** A flat cap over a whole section (mirrored), facing +z or -z. */
function cap(p: P2[], z: number, back: boolean) {
  const ring = [...p, ...p.slice(1, -1).reverse().map(([x, y]): P2 => [-x, y])].filter((q, i, arr) => {
    const n = arr[(i + 1) % arr.length];
    return Math.hypot(q[0] - n[0], q[1] - n[1]) > 1e-6;
  });
  const s = new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ShapeGeometry(s);
  if (back) {
    g.scale(-1, 1, 1);
    g.rotateY(Math.PI);
  }
  g.translate(0, 0, z);
  return g;
}

function RoadsterWheel({ x, z, w }: { x: number; z: number; w: number }) {
  const geo = useMemo(() => tyreGeo(RS.r, w, 0.285, 0.22), [w]);
  const s = Math.sign(x);
  const face = -s * (w / 2 - 0.012);
  return (
    <group position={[x, RS.r, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh geometry={geo} material={M.tyre} castShadow />
      <mesh position={[0, face + s * 0.014, 0]} material={K.rim}>
        <cylinderGeometry args={[0.285, 0.285, 0.03, 36]} />
      </mesh>
      {/* turbine: five twin spokes, a touch lighter than the dark disc */}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (Math.floor(i / 2) / 5) * Math.PI * 2 + (i % 2 ? 0.12 : -0.12);
        return (
          <mesh key={i} position={[Math.cos(a) * 0.15, face - s * 0.004, Math.sin(a) * 0.15]} rotation={[0, -a + (i % 2 ? 0.1 : -0.1), 0]} material={K.spoke}>
            <boxGeometry args={[0.25, 0.014, 0.026]} />
          </mesh>
        );
      })}
      <mesh position={[0, face - s * 0.008, 0]} material={K.spoke}>
        <cylinderGeometry args={[0.05, 0.05, 0.016, 12]} />
      </mesh>
    </group>
  );
}

export function Roadster({ livery = LIVERIES.V03[0] }: { livery?: Livery }) {
  const mt = useMats(livery, [0.3, 0.35]);
  const geo = useMemo(() => {
    const secs = rsSections();
    const front = secs[0];
    const back = secs[secs.length - 1];
    // the canopy: dark glass from the windscreen over the roof, falling into the rear deck
    const cz = [0.95, 0.75, 0.5, 0.2, -0.2, -0.6, -0.9, -1.2, -1.45, -1.62];
    const roofY = curve([
      [0.95, 0.87],
      [0.75, 0.94],
      [0.5, 1.02],
      [0.2, 1.08],
      [-0.2, 1.11],
      [-0.6, 1.1],
      [-0.9, 1.06],
      [-1.2, 0.99],
      [-1.45, 0.93],
      [-1.62, 0.885],
    ]);
    const roofX = curve([
      [0.95, 0.62],
      [0.75, 0.6],
      [0.5, 0.56],
      [0.2, 0.53],
      [-0.6, 0.52],
      [-1.2, 0.47],
      [-1.62, 0.4],
    ]);
    const csec = (z: number): Sec => {
      const xe = rsXe(z) - 0.01;
      const yd = rsYd(z) + 0.004;
      const yr = roofY(z);
      const k = Math.min(1, Math.max(0, (yr - yd) / 0.2));
      return { z, p: [[xe, yd], [roofX(z) + (xe - roofX(z)) * (1 - k) * 0.6, yd + (yr - yd) * 0.88], [0, yr]] };
    };
    const canopySecs = cz.map(csec);
    const rearSide = canopySecs.filter(({ z }) => z <= -0.6);
    // a body-coloured rail along each roof edge, between the roof glass and the side glass
    const rail = (sx: number) =>
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(canopySecs.slice(1, -1).map(({ z, p }) => new THREE.Vector3(sx * (p[1][0] + 0.004), p[1][1] + 0.004, z))), 48, 0.016, 6);
    return {
      lower: strip(secs, 0, 2),
      side: strip(secs, 2, 3),
      fender: strip(secs, 3, 4),
      deck: strip(secs, 4, 5),
      nose: cap(front.p, front.z, false),
      tail: cap(back.p, back.z, true),
      glassSide: strip(canopySecs.filter(({ z }) => z >= -0.6), 0, 1),
      sail: strip(rearSide, 0, 1),
      roof: strip(canopySecs, 1, 2),
      rails: mergeGeometries([rail(1), rail(-1)]),
      strut: plate(
        [
          [-1.86, 0.84],
          [-1.92, 1.0],
          [-2.06, 1.12],
          [-2.18, 1.13],
          [-2.2, 1.08],
          [-2.08, 1.07],
          [-2.0, 0.98],
          [-1.98, 0.84],
        ],
        0.03,
      ),
      wing: aerofoil(0.34, 0.04, 1.86),
      end: plate(
        [
          [-2.0, 1.16],
          [-2.36, 1.16],
          [-2.36, 1.02],
          [-2.2, 1.06],
        ],
        0.02,
      ),
    };
  }, []);
  const glass = K.smoke;
  return (
    <group>
      <mesh geometry={geo.side} material={mt.body} castShadow receiveShadow />
      <mesh geometry={geo.fender} material={mt.body} castShadow receiveShadow />
      <mesh geometry={geo.deck} material={mt.body} castShadow receiveShadow />
      <mesh geometry={geo.lower} material={mt.trim} castShadow />
      <mesh geometry={geo.nose} material={mt.body} castShadow />
      <mesh geometry={geo.tail} material={mt.body} castShadow />
      <mesh geometry={geo.glassSide} material={glass} castShadow />
      <mesh geometry={geo.roof} material={glass} castShadow />
      <mesh geometry={geo.sail} material={mt.body} castShadow />
      <mesh geometry={geo.rails} material={mt.body} castShadow />
      {/* the face: a thin light bar along the leading edge over a dark intake */}
      <Box s={[1.5, 0.018, 0.02]} p={[0, 0.48, 2.302]} m={K.lampWhite} />
      <Box s={[1.42, 0.17, 0.03]} p={[0, 0.3, 2.296]} m={mt.trim} />
      {/* the back: a full-width light bar under a dark strip, the diffuser and four round exhausts */}
      <Box s={[1.78, 0.07, 0.02]} p={[0, 0.79, -2.302]} m={mt.trim} />
      <Box s={[1.7, 0.026, 0.02]} p={[0, 0.79, -2.314]} m={mt.lamp} />
      <Box s={[1.36, 0.24, 0.05]} p={[0, 0.3, -2.29]} m={mt.trim} />
      {[-0.45, -0.15, 0.15, 0.45].map((x) => (
        <group key={x} position={[x, 0.36, -2.32]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={K.steel}>
            <cylinderGeometry args={[0.045, 0.045, 0.05, 18]} />
          </mesh>
          <mesh position={[0, 0.026, 0]} material={M.ink}>
            <cylinderGeometry args={[0.032, 0.032, 0.004, 16]} />
          </mesh>
        </group>
      ))}
      {[-0.55, -0.3, 0, 0.3, 0.55].map((x) => (
        <Box key={x} s={[0.02, 0.12, 0.2]} p={[x, 0.2, -2.2]} m={M.ink} />
      ))}
      {/* the wing on two struts, endplates angled down */}
      {SIDES.map((s) => (
        <mesh key={s} geometry={geo.strut} position={[s * 0.4, 0, 0]} material={mt.trim} castShadow />
      ))}
      <mesh geometry={geo.wing} position={[0, 1.13, -2.2]} rotation={[0.08, 0, 0]} material={mt.trim} castShadow />
      {SIDES.map((s) => (
        <mesh key={s} geometry={geo.end} position={[s * 0.93, 0, 0]} material={mt.trim} castShadow />
      ))}
      {SIDES.map((s) => (
        <group key={s}>
          <RoadsterWheel x={s * (rsHw(RS.fz) - 0.17)} z={RS.fz} w={0.27} />
          <RoadsterWheel x={s * (rsHw(RS.rz) - 0.17)} z={RS.rz} w={0.32} />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ V04 Bike (R-08) */

const B = { fz: 0.72, rz: -0.7, r: 0.31 };

function BikeWheel({ z, w, front }: { z: number; w: number; front?: boolean }) {
  const geo = useMemo(() => tyreGeo(B.r, w, 0.22, 0.5), [w]);
  return (
    <group position={[0, B.r, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh geometry={geo} material={M.tyre} castShadow />
      <mesh material={M.graphite}>
        <cylinderGeometry args={[0.215, 0.215, 0.05, 28]} />
      </mesh>
      {/* split five-spoke wheel, the hub, and the brake discs */}
      {SIDES.map((s) => (
        <group key={s}>
          {Array.from({ length: 5 }, (_, i) => (
            <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.1, s * 0.03, Math.sin((i / 5) * Math.PI * 2) * 0.1]} rotation={[0, -(i / 5) * Math.PI * 2, 0]} material={K.spoke}>
              <boxGeometry args={[0.2, 0.012, 0.028]} />
            </mesh>
          ))}
          {(front || s > 0) && (
            <mesh position={[0, s * (front ? 0.065 : 0.05), 0]} material={K.silver}>
              <cylinderGeometry args={[front ? 0.16 : 0.11, front ? 0.16 : 0.11, 0.008, 28]} />
            </mesh>
          )}
        </group>
      ))}
      <mesh material={M.ink}>
        <cylinderGeometry args={[0.045, 0.045, 0.16, 10]} />
      </mesh>
    </group>
  );
}

export function Bike({ livery = LIVERIES.V04[0] }: { livery?: Livery }) {
  const { fz, rz, r } = B;
  const mt = useMats(livery, [0.5, 0.15]);
  const geo = useMemo(() => {
    // the fairing: a sharp nose with the twin-light face, flaring to wide flanks
    const fr = (z: number, yb: number, yt: number, wb: number, wm: number, ym: number, wt: number): Sec => ({
      z,
      p: [
        [0, yb],
        [wb, yb + 0.02],
        [wm, ym],
        [wt, yt - 0.04],
        [wt * 0.45, yt],
        [0, yt + 0.01],
      ],
    });
    const mask = loft([fr(0.9, 0.8, 0.86, 0.02, 0.04, 0.83, 0.03), fr(0.8, 0.71, 0.95, 0.055, 0.14, 0.83, 0.105)]);
    const fairing = loft([
      fr(0.8, 0.71, 0.95, 0.055, 0.14, 0.83, 0.105),
      fr(0.7, 0.63, 0.99, 0.07, 0.18, 0.8, 0.13),
      fr(0.58, 0.5, 1.0, 0.08, 0.2, 0.72, 0.14),
      fr(0.44, 0.33, 0.96, 0.09, 0.2, 0.6, 0.15),
      fr(0.3, 0.24, 0.88, 0.09, 0.19, 0.52, 0.15),
      fr(0.08, 0.23, 0.78, 0.09, 0.18, 0.48, 0.14),
      fr(-0.12, 0.3, 0.66, 0.07, 0.14, 0.46, 0.1),
    ]);
    const tank = loft([
      fr(0.42, 0.82, 0.98, 0.1, 0.13, 0.9, 0.11),
      fr(0.28, 0.78, 1.02, 0.12, 0.17, 0.92, 0.13),
      fr(0.06, 0.76, 0.99, 0.12, 0.16, 0.88, 0.12),
      fr(-0.16, 0.76, 0.86, 0.1, 0.12, 0.81, 0.1),
    ]);
    // tail cowl: wide under the seat, kicking up to a short blunt tail with the lamp in its face
    const tail = loft([
      fr(-0.1, 0.66, 0.84, 0.1, 0.125, 0.76, 0.1),
      fr(-0.28, 0.7, 0.9, 0.1, 0.125, 0.8, 0.1),
      fr(-0.44, 0.76, 0.96, 0.085, 0.11, 0.86, 0.085),
      fr(-0.56, 0.83, 0.99, 0.06, 0.08, 0.91, 0.06),
      fr(-0.6, 0.86, 0.985, 0.05, 0.065, 0.925, 0.05),
    ]);
    const seat = loft([
      fr(-0.12, 0.8, 0.87, 0.11, 0.12, 0.84, 0.1),
      fr(-0.36, 0.84, 0.92, 0.085, 0.095, 0.885, 0.075),
    ]);
    const screen = loft([
      { z: 0.6, p: [[0, 0.98], [0.15, 0.97], [0.13, 1.0], [0, 1.01]] },
      { z: 0.42, p: [[0, 1.1], [0.11, 1.08], [0.09, 1.105], [0, 1.115]] },
    ]);
    // twin-spar frame from the headstock round the engine to the swingarm pivot
    const frame = loft(
      [
        { z: 0.42, p: [[0.1, 0.88], [0.125, 0.88], [0.125, 0.97], [0.1, 0.97]] as P2[] },
        { z: 0.12, p: [[0.14, 0.66], [0.17, 0.66], [0.17, 0.78], [0.14, 0.78]] as P2[] },
        { z: -0.12, p: [[0.14, 0.42], [0.17, 0.42], [0.17, 0.6], [0.14, 0.6]] as P2[] },
      ],
      { mirror: false },
    );
    const frameL = frame.clone();
    frameL.scale(-1, 1, 1);
    const swing = loft(
      [
        { z: -0.1, p: [[0.11, 0.4], [0.15, 0.4], [0.15, 0.5], [0.11, 0.5]] as P2[] },
        { z: rz, p: [[0.1, r - 0.035], [0.13, r - 0.035], [0.13, r + 0.035], [0.1, r + 0.035]] as P2[] },
      ],
      { mirror: false },
    );
    const swingL = swing.clone();
    swingL.scale(-1, 1, 1);
    // a negative scale flips winding: rebuild the triangles the other way round
    for (const g of [frameL, swingL]) {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i += 3) {
        const x = p.getX(i + 1);
        const y = p.getY(i + 1);
        const z = p.getZ(i + 1);
        p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
        p.setXYZ(i + 2, x, y, z);
      }
      g.computeVertexNormals();
    }
    return { mask, fairing, tank, tail, seat, screen, frame: mergeGeometries([frame, frameL]), swing: mergeGeometries([swing, swingL]) };
  }, [rz, r]);
  // fork axis: from the front axle up and back at 24 degrees
  const rake = Math.tan((24 * Math.PI) / 180);
  const fk = (y: number): number => fz - (y - r) * rake;
  return (
    <group>
      <BikeWheel z={fz} w={0.12} front />
      <BikeWheel z={rz} w={0.19} />
      {/* USD forks: thick tubes up top, silver legs at the axle; the triple clamp and clip-ons */}
      {SIDES.map((s) => (
        <group key={s}>
          <Tube a={[s * 0.09, r, fz]} b={[s * 0.09, 0.62, fk(0.62)]} r={0.022} m={K.silver} />
          <Tube a={[s * 0.09, 0.56, fk(0.56)]} b={[s * 0.09, 0.97, fk(0.97)]} r={0.034} m={M.graphite} />
          <Tube a={[s * 0.09, 0.93, fk(0.93)]} b={[s * 0.27, 0.9, fk(0.93) - 0.1]} r={0.013} m={M.ink} />
          <Box s={[0.03, 0.12, 0.06]} p={[s * 0.085, r + 0.12, fz - 0.08]} r={[0.6, 0, 0]} m={M.ink} />
          <Tube a={[s * 0.14, 0.95, 0.62]} b={[s * 0.24, 0.99, 0.6]} r={0.01} m={M.ink} />
          <Box s={[0.11, 0.05, 0.03]} p={[s * 0.27, 1.0, 0.6]} r={[0, s * 0.2, 0]} m={M.ink} />
          {/* rearsets and their hangers */}
          <Tube a={[s * 0.12, 0.5, -0.24]} b={[s * 0.2, 0.5, -0.26]} r={0.012} m={M.graphite} />
          <Tube a={[s * 0.14, 0.56, -0.14]} b={[s * 0.13, 0.48, -0.26]} r={0.012} m={K.steel} />
          {/* the subframe under the tail: an upper rail and a stay down to the frame */}
          <Tube a={[s * 0.12, 0.76, -0.08]} b={[s * 0.07, 0.86, -0.54]} r={0.012} m={K.steel} />
          <Tube a={[s * 0.14, 0.52, -0.12]} b={[s * 0.08, 0.84, -0.5]} r={0.011} m={K.steel} />
        </group>
      ))}
      <Box s={[0.24, 0.04, 0.08]} p={[0, 0.96, fk(0.96)]} m={M.graphite} />
      {/* frame, swingarm */}
      <mesh geometry={geo.frame} material={M.graphite} castShadow />
      <mesh geometry={geo.swing} material={M.graphite} castShadow />
      {/* engine: crankcase, the cylinder block leaning forward, the head and its cover */}
      <Box s={[0.24, 0.18, 0.34]} p={[0, 0.36, 0.02]} m={M.graphite} />
      <Box s={[0.22, 0.2, 0.2]} p={[0, 0.54, 0.14]} r={[0.35, 0, 0]} m={K.steel} />
      <Box s={[0.24, 0.07, 0.2]} p={[0, 0.67, 0.2]} r={[0.35, 0, 0]} m={M.ink} />
      <mesh position={[0.125, 0.36, -0.02]} rotation={[0, 0, Math.PI / 2]} material={K.silver}>
        <cylinderGeometry args={[0.08, 0.08, 0.012, 20]} />
      </mesh>
      {/* under the seat: the rear shock, the battery box behind it */}
      <Tube a={[0, 0.44, -0.24]} b={[0, 0.7, -0.14]} r={0.018} m={K.silver} />
      <mesh geometry={springGeo} position={[0, 0.6, -0.18]} rotation={[-0.37, 0, 0]} scale={[0.75, 0.2, 0.75]} material={mt.accent} />
      <Box s={[0.05, 0.05, 0.05]} p={[0, 0.72, -0.13]} m={M.ink} />
      <Box s={[0.15, 0.12, 0.17]} p={[0, 0.72, -0.34]} m={M.inkMatte} />
      {/* chain side (left): sprockets and the two runs of chain */}
      <mesh position={[-0.14, 0.46, -0.08]} rotation={[0, 0, Math.PI / 2]} material={K.steel}>
        <cylinderGeometry args={[0.05, 0.05, 0.012, 14]} />
      </mesh>
      <mesh position={[-0.14, r, rz]} rotation={[0, 0, Math.PI / 2]} material={K.steel}>
        <cylinderGeometry args={[0.12, 0.12, 0.012, 24]} />
      </mesh>
      <Tube a={[-0.14, 0.51, -0.08]} b={[-0.14, r + 0.12, rz]} r={0.008} m={K.steel} />
      <Tube a={[-0.14, 0.41, -0.08]} b={[-0.14, r - 0.12, rz]} r={0.008} m={K.steel} />
      {/* bodywork: body fairing and tail, trim tank, graphite seat, dark screen */}
      <mesh geometry={geo.fairing} material={mt.body} castShadow />
      <mesh geometry={geo.mask} material={mt.trim} castShadow />
      <mesh geometry={geo.tank} material={mt.trim} castShadow />
      <mesh geometry={geo.tail} material={mt.body} castShadow />
      <mesh geometry={geo.seat} material={M.graphite} castShadow />
      <mesh geometry={geo.screen} material={K.canopy} castShadow />
      {SIDES.map((s) => (
        <Box key={s} s={[0.09, 0.024, 0.012]} p={[s * 0.075, 0.855, 0.848]} r={[0.1, s * 0.84, s * -0.2]} m={K.lampWhite} />
      ))}
      {/* winglets on the flanks */}
      {SIDES.map((s) => (
        <Box key={s} s={[0.12, 0.018, 0.16]} p={[s * 0.24, 0.8, 0.6]} r={[-0.12, 0, s * -0.12]} m={mt.trim} />
      ))}
      {/* the accent: a line along each flank of the fairing */}
      {SIDES.map((s) => (
        <Tube key={s} a={[s * 0.203, 0.74, 0.56]} b={[s * 0.195, 0.5, 0.22]} r={0.009} m={mt.accent} />
      ))}
      {/* front mudguard, tail lamp in the tail's face, hugger */}
      <Box s={[0.12, 0.02, 0.36]} p={[0, r + 0.33, fz - 0.02]} r={[0.2, 0, 0]} m={mt.body} />
      <Box s={[0.09, 0.03, 0.012]} p={[0, 0.925, -0.606]} m={K.lampOrange} />
      <Box s={[0.12, 0.02, 0.3]} p={[0, r + 0.34, rz + 0.12]} r={[-0.25, 0, 0]} m={M.ink} />
      {/* exhaust: header under the engine to a short can on the right */}
      <Tube a={[0.1, 0.5, 0.3]} b={[0.12, 0.26, 0.1]} r={0.025} m={K.steel} />
      <Tube a={[0.12, 0.26, 0.1]} b={[0.16, 0.3, -0.16]} r={0.03} m={K.steel} />
      <Tube a={[0.17, 0.3, -0.12]} b={[0.21, 0.44, -0.46]} r={0.055} m={M.graphite} />
      <Tube a={[0.21, 0.44, -0.46]} b={[0.215, 0.455, -0.5]} r={0.04} m={M.ink} />
    </group>
  );
}
