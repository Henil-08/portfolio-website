"use client";

// The four cars in the garage, in the "Concrete & Ink" language of models.tsx: ink, paper,
// one orange. Procedural three.js in metres, noses toward +z, wheels on y = 0.
// Bodies are lofted from cross-sections and flat shaded so the panels read as facets.
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Box, M, W, useLabel } from "./models";

type V3 = [number, number, number];
type P2 = [number, number];

/* ------------------------------------------------------------------ shared kit */

const std = (color: string, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

const K = {
  silver: std("#c9c7c0", 0.32, 0.65),
  steel: std("#8d8c87", 0.4, 0.7),
  rim: std("#26272a", 0.45, 0.55),
  spoke: std("#4a4b4f", 0.38, 0.6),
  shell: std("#e9e8e3", 0.34, 0.22),
  canopy: std("#151a1f", 0.1, 0.6),
  paperLine: std(W.paper, 0.7),
  lampWhite: std("#ffffff", 0.3, 0, { emissive: "#ffffff", emissiveIntensity: 2.2, toneMapped: false }),
  lampOrange: std(W.orange, 0.3, 0, { emissive: W.orange, emissiveIntensity: 2.4, toneMapped: false }),
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

export function Formula() {
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
  const num = useLabel("08", { fg: W.ink, bg: W.paper, w: 256, h: 128, size: 104 });
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
      <mesh geometry={geo.tub} material={M.ink} castShadow />
      <mesh geometry={geo.pods} material={M.ink} castShadow />
      <mesh geometry={geo.podTops} material={M.paper} castShadow />
      <mesh geometry={geo.cover} material={M.paper} castShadow />
      <mesh geometry={geo.fin} material={M.paper} castShadow />
      {SIDES.map((s) => (
        <mesh key={s} position={[s * 0.01, 0.84, -1.28]} rotation={[0, (s * Math.PI) / 2, 0]} material={num}>
          <planeGeometry args={[0.4, 0.2]} />
        </mesh>
      ))}
      {/* the one orange line, along the top of the nose */}
      <Tube a={[0, 0.296, 2.6]} b={[0, 0.54, 1.62]} r={0.012} m={M.orange} />
      <Tube a={[0, 0.54, 1.62]} b={[0, 0.66, 0.85]} r={0.012} m={M.orange} />
      {/* cockpit opening, headrest, airbox mouth, halo */}
      <Box s={[0.46, 0.03, 0.95]} p={[0, 0.655, 0.0]} m={K.canopy} />
      <Box s={[0.5, 0.08, 0.22]} p={[0, 0.69, -0.42]} m={M.graphite} />
      <Box s={[0.18, 0.13, 0.02]} p={[0, 0.9, -0.31]} m={K.canopy} />
      <mesh geometry={halo} material={M.ink} castShadow />
      <Tube a={[0, 0.66, 0.38]} b={[0, 0.9, 0.08]} r={0.03} />
      {/* sidepod inlets */}
      {SIDES.map((s) => (
        <Box key={s} s={[0.3, 0.2, 0.02]} p={[s * 0.5, 0.48, 0.61]} m={K.canopy} />
      ))}
      {/* mirrors */}
      {SIDES.map((s) => (
        <group key={s}>
          <Tube a={[s * 0.36, 0.62, 0.42]} b={[s * 0.5, 0.74, 0.42]} r={0.012} />
          <Box s={[0.14, 0.06, 0.04]} p={[s * 0.53, 0.76, 0.42]} m={M.ink} />
        </group>
      ))}
      {/* front wing: three elements and endplates */}
      <mesh geometry={geo.main} position={[0, 0.09, 2.62]} material={M.ink} castShadow />
      <mesh geometry={geo.el2} position={[0, 0.15, 2.4]} rotation={[-0.32, 0, 0]} material={M.ink} castShadow />
      <mesh geometry={geo.el3} position={[0, 0.22, 2.3]} rotation={[-0.55, 0, 0]} material={M.paper} castShadow />
      {SIDES.map((s) => (
        <mesh key={s} geometry={geo.fEnd} position={[s * 0.95, 0, 0]} material={M.ink} castShadow />
      ))}
      {/* rear wing: main plane, paper flap, beam wing, endplates, pylon, diffuser */}
      <mesh geometry={geo.rMain} position={[0, 0.8, -2.3]} rotation={[0.12, 0, 0]} material={M.ink} castShadow />
      <mesh geometry={geo.rFlap} position={[0, 0.9, -2.46]} rotation={[0.5, 0, 0]} material={M.paper} castShadow />
      <mesh geometry={geo.beam} position={[0, 0.46, -2.3]} rotation={[0.2, 0, 0]} material={M.ink} castShadow />
      {SIDES.map((s) => (
        <mesh key={s} geometry={geo.rEnd} position={[s * 0.52, 0, 0]} material={M.ink} castShadow />
      ))}
      <mesh geometry={geo.pylon} material={M.ink} castShadow />
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

/* ------------------------------------------------------------------ V02 ATV (E14) */

/** A knobby off-road tyre: a round-shouldered carcass with blocks in a staggered chevron. */
function knobbyGeo(r: number, w: number) {
  const parts: THREE.BufferGeometry[] = [tyreGeo(r - 0.03, w, r * 0.55, 0.35)];
  const n = 18;
  for (let i = 0; i < n; i++) {
    for (const row of [-1, 1]) {
      const a = ((i + (row > 0 ? 0.5 : 0)) / n) * Math.PI * 2;
      const g = new THREE.BoxGeometry(0.04, w * 0.36, 0.06);
      g.rotateX(row * 0.35);
      g.translate(r - 0.03, row * w * 0.24, 0);
      g.rotateY(-a);
      parts.push(g);
    }
    // shoulder lugs so the sidewall reads knobby in profile
    const g = new THREE.BoxGeometry(0.06, 0.04, 0.06);
    g.translate(r - 0.065, (i % 2 ? 1 : -1) * (w / 2 - 0.005), 0);
    g.rotateY(-((i + 0.25) / n) * Math.PI * 2);
    parts.push(g);
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}

function OffroadWheel({ p, geo, r, w }: { p: V3; geo: THREE.BufferGeometry; r: number; w: number }) {
  const s = Math.sign(p[0]);
  return (
    <group position={p} rotation={[0, 0, Math.PI / 2]}>
      <mesh geometry={geo} material={M.tyre} castShadow />
      {/* silver dished rim with six slots, an ink hub */}
      <mesh position={[0, -s * (w / 2 - 0.035), 0]} material={K.silver}>
        <cylinderGeometry args={[r * 0.56, r * 0.56, 0.05, 24]} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[Math.cos((i / 6) * Math.PI * 2) * r * 0.34, -s * (w / 2 - 0.005), Math.sin((i / 6) * Math.PI * 2) * r * 0.34]} material={M.graphite}>
          <cylinderGeometry args={[0.022, 0.022, 0.012, 8]} />
        </mesh>
      ))}
      <mesh position={[0, -s * (w / 2 + 0.005), 0]} material={M.ink}>
        <cylinderGeometry args={[r * 0.16, r * 0.16, 0.04, 10]} />
      </mesh>
    </group>
  );
}

// One coil spring, 1 m long along y, scaled to fit.
const springGeo = (() => {
  const pts: THREE.Vector3[] = [];
  const turns = 9;
  for (let i = 0; i <= turns * 16; i++) {
    const t = i / (turns * 16);
    pts.push(new THREE.Vector3(Math.cos(t * turns * Math.PI * 2) * 0.042, t - 0.5, Math.sin(t * turns * Math.PI * 2) * 0.042));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 16, 0.009, 5);
})();

/** Long-travel coilover: a silver shaft, a graphite body, the orange spring round it. */
function Coilover({ a, b }: { a: V3; b: V3 }) {
  const va = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(va);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const at = (k: number) => va.clone().addScaledVector(dir, k).toArray() as V3;
  return (
    <>
      <Tube a={a} b={at(0.5)} r={0.012} m={K.silver} />
      <Tube a={at(0.4)} b={b} r={0.026} m={M.graphite} />
      <mesh geometry={springGeo} position={at(0.56)} quaternion={q} scale={[1, len * 0.62, 1]} material={M.orange} castShadow />
    </>
  );
}

// Baja space frame, right side (x mirrors). Rear roll hoop, overhead members, sloped front
// bracing to a front bulkhead, side impact members, lower frame sides, the motor bay.
const RRHb: V3 = [0.36, 0.3, -0.36];
const RRHs: V3 = [0.38, 0.92, -0.4];
const RRHt: V3 = [0.32, 1.36, -0.46];
const RHOf: V3 = [0.29, 1.32, 0.2];
const FBMm: V3 = [0.25, 0.86, 0.56];
const BHt: V3 = [0.2, 0.62, 0.84];
const BHb: V3 = [0.18, 0.3, 0.86];
const LFSm: V3 = [0.36, 0.28, 0.12];
const SIMr: V3 = [0.38, 0.62, -0.38];
const SIMm: V3 = [0.36, 0.64, 0.14];
const RBu: V3 = [0.3, 0.66, -0.9];
const RBb: V3 = [0.26, 0.32, -0.92];
const half: [V3, V3][] = [
  [RRHb, RRHs],
  [RRHs, RRHt],
  [RRHt, RHOf],
  [RHOf, FBMm],
  [FBMm, BHt],
  [BHt, BHb],
  [BHb, LFSm],
  [LFSm, RRHb],
  [SIMr, SIMm],
  [SIMm, BHt],
  [SIMm, FBMm],
  [SIMm, LFSm],
  [RRHs, RBu],
  [RBu, RBb],
  [RBb, RRHb],
  [RRHb, RBu],
  [SIMr, RBu],
];
const ATV_TUBES: [V3, V3][] = [];
for (const s of SIDES) for (const [a, b] of half) ATV_TUBES.push([mx(a, s), mx(b, s)]);
// cross members
for (const p of [RRHb, RRHs, RRHt, RHOf, FBMm, BHt, BHb, RBu, RBb, LFSm]) ATV_TUBES.push([p, mx(p, -1)]);
// rear hoop X brace
ATV_TUBES.push([RRHb, mx(RRHs, -1)], [mx(RRHb, -1), RRHs]);


export function Atv() {
  const R = 0.3;
  const W2 = 0.24;
  const front = 0.78;
  const rear = -0.74;
  const tyre = useMemo(() => knobbyGeo(R, W2), []);
  const num = useLabel("E14", { fg: W.paper, bg: W.ink, w: 256, h: 128, size: 92 });

  // ink panels: hood over the sloped front, a skid plate, the side panels
  const panels = useMemo(() => {
    const quad = (pts: V3[]) => {
      const out: number[] = [];
      for (let i = 1; i < pts.length - 1; i++) out.push(...pts[0], ...pts[i], ...pts[i + 1]);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
      g.computeVertexNormals();
      return g;
    };
    const hood = quad([mx(BHt, -1), BHt, FBMm, mx(FBMm, -1)].map(([x, y, z]): V3 => [x * 1.05, y + 0.03, z]).reverse());
    const nose = quad([mx(BHb, -1), BHb, BHt, mx(BHt, -1)].map(([x, y, z]): V3 => [x * 1.05, y, z + 0.02]).reverse());
    return { hood, nose };
  }, []);

  return (
    <group>
      {ATV_TUBES.map(([a, b], i) => (
        <Tube key={i} a={a} b={b} r={0.021} />
      ))}
      {/* front bumper loop */}
      <Tube a={[-0.2, 0.42, 0.98]} b={[0.2, 0.42, 0.98]} r={0.018} />
      {SIDES.map((s) => (
        <Tube key={s} a={[s * 0.2, 0.42, 0.98]} b={mx(BHt, s)} r={0.018} />
      ))}
      <mesh geometry={panels.hood} material={M.inkMatte} castShadow />
      <mesh geometry={panels.nose} material={M.inkMatte} castShadow />
      {/* skid plate, upturned at the front */}
      <Box s={[0.66, 0.02, 1.26]} p={[0, 0.26, -0.24]} m={M.graphite} />
      <Box s={[0.4, 0.02, 0.36]} p={[0, 0.33, 0.52]} r={[-0.22, 0, 0]} m={M.graphite} />
      {/* side panels with the number */}
      {SIDES.map((s) => (
        <group key={s} position={[s * 0.385, 0.46, -0.12]} rotation={[0, s * 0.04, 0]}>
          <Box s={[0.012, 0.3, 0.5]} p={[0, 0, 0]} m={M.inkMatte} />
          <mesh position={[s * 0.008, 0, 0]} rotation={[0, (s * Math.PI) / 2, 0]} material={num}>
            <planeGeometry args={[0.46, 0.23]} />
          </mesh>
        </group>
      ))}
      {/* seat, belts' anchor bar, firewall */}
      <Box s={[0.44, 0.08, 0.4]} p={[0, 0.38, -0.12]} m={M.graphite} />
      <Box s={[0.44, 0.6, 0.08]} p={[0, 0.7, -0.3]} r={[-0.16, 0, 0]} m={M.graphite} />
      <Box s={[0.7, 0.86, 0.02]} p={[0, 0.74, -0.42]} r={[-0.06, 0, 0]} m={M.inkMatte} />
      {/* steering column and wheel */}
      <Tube a={[0, 0.66, 0.66]} b={[0, 0.86, 0.34]} r={0.016} m={M.graphite} />
      <mesh position={[0, 0.88, 0.32]} rotation={[0.95, 0, 0]} material={M.ink}>
        <torusGeometry args={[0.13, 0.017, 6, 22]} />
      </mesh>
      {/* motor, gearbox and battery in the rear bay */}
      <mesh position={[0, 0.5, -0.7]} rotation={[0, 0, Math.PI / 2]} material={K.silver} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.34, 16]} />
      </mesh>
      <Box s={[0.42, 0.22, 0.24]} p={[0, 0.44, -0.5]} m={M.graphite} />
      <Box s={[0.5, 0.14, 0.34]} p={[0, 0.76, -0.66]} m={M.inkMatte} />
      {/* front double A-arms and coilovers */}
      {SIDES.map((s) => (
        <group key={`f${s}`}>
          <Tube a={[s * 0.2, 0.32, front + 0.08]} b={[s * 0.56, 0.26, front]} r={0.015} />
          <Tube a={[s * 0.2, 0.32, front - 0.2]} b={[s * 0.56, 0.26, front]} r={0.015} />
          <Tube a={[s * 0.21, 0.54, front + 0.04]} b={[s * 0.54, 0.44, front]} r={0.015} />
          <Tube a={[s * 0.23, 0.56, front - 0.18]} b={[s * 0.54, 0.44, front]} r={0.015} />
          <Box s={[0.04, 0.22, 0.05]} p={[s * 0.57, 0.35, front]} m={M.graphite} />
          <Coilover a={[s * 0.44, 0.29, front - 0.03]} b={[s * 0.27, 0.98, front - 0.36]} />
          <OffroadWheel p={[s * 0.69, R, front]} geo={tyre} r={R} w={W2} />
        </group>
      ))}
      {/* rear trailing arms, toe links and coilovers */}
      {SIDES.map((s) => (
        <group key={`r${s}`}>
          <Tube a={[s * 0.37, 0.34, -0.1]} b={[s * 0.56, R, rear]} r={0.022} />
          <Tube a={[s * 0.26, 0.32, -0.88]} b={[s * 0.56, R - 0.04, rear]} r={0.015} />
          <Tube a={[s * 0.27, 0.6, -0.88]} b={[s * 0.56, R + 0.12, rear]} r={0.015} />
          <Coilover a={[s * 0.52, R + 0.04, rear + 0.06]} b={[s * 0.35, 1.0, -0.42]} />
          <OffroadWheel p={[s * 0.68, R, rear]} geo={tyre} r={R} w={W2} />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ V03 Roadster */

const RS = { fz: 1.42, rz: -1.34, r: 0.355, ra: 0.415, cy: 0.355 };

/** Height of the wheel-arch cut at z, or 0 outside the arches. */
function archAt(z: number) {
  for (const cz of [RS.fz, RS.rz]) {
    const d = z - cz;
    if (Math.abs(d) <= RS.ra) return RS.cy + Math.sqrt(RS.ra * RS.ra - d * d);
  }
  return 0;
}

const rHalf = curve([
  [2.3, 0.78],
  [2.12, 0.9],
  [1.85, 0.96],
  [1.42, 0.98],
  [0.9, 0.95],
  [0.2, 0.91],
  [-0.5, 0.94],
  [-1.0, 1.0],
  [-1.7, 1.0],
  [-2.05, 0.97],
  [-2.3, 0.9],
]);
const rTop = curve([
  [2.3, 0.42],
  [1.9, 0.62],
  [1.42, 0.73],
  [0.6, 0.75],
  [-1.6, 0.84],
  [-2.05, 0.86],
  [-2.3, 0.8],
]);
const rShoulder = curve([
  [2.3, 0.42],
  [1.9, 0.66],
  [1.42, 0.83],
  [1.0, 0.8],
  [0.6, 0.75],
  [-0.6, 0.77],
  [-1.34, 0.9],
  [-2.05, 0.88],
  [-2.3, 0.8],
]);
const rBelt = curve([
  [2.3, 0.33],
  [1.42, 0.6],
  [0.6, 0.53],
  [-0.4, 0.5],
  [-1.34, 0.66],
  [-2.3, 0.62],
]);

// top of the ink skirt: a dark wedge rising toward the rear wheel and into the diffuser
const rSkirt = curve([
  [2.3, 0.29],
  [1.0, 0.3],
  [0.0, 0.35],
  [-0.85, 0.43],
  [-1.8, 0.42],
  [-2.3, 0.47],
]);

/** Half profile of the roadster at z. Points 0-4 are the ink skirt, 4-8 the body. */
function roadsterProfile(z: number, arch: number): P2[] {
  const hw = rHalf(z);
  const yb = 0.15;
  const nose = Math.max(0, (z - 1.95) / 0.35); // the chin rises toward the light bar
  const yl = arch > 0 ? arch : 0.18 + nose * 0.06;
  const raw: P2[] = [
    [0, yb],
    [hw - 0.34, yb],
    [hw - 0.34, Math.max(yb, yl)],
    [hw - 0.07, yl],
    [hw - 0.02, Math.max(yl + 0.03, rSkirt(z))],
    [hw, Math.max(yl + 0.05, rBelt(z))],
    [hw - 0.14, rShoulder(z)],
    [Math.min(0.52, hw - 0.3), rTop(z) + 0.025],
    [0, rTop(z)],
  ];
  // keep the creases stacked: each at least a hair above the one below it
  for (let i = 4; i < 6; i++) raw[i + 1][1] = Math.max(raw[i + 1][1], raw[i][1] + 0.025);
  // the hood and deck run as one flat plane from the fender crease to the centre, a hair crowned
  raw[7][1] = raw[8][1] + (raw[6][1] - raw[8][1]) * (raw[7][0] / raw[6][0]) + 0.012;
  return raw;
}

function roadsterSections() {
  const zs: [number, number | null][] = [];
  const push = (z: number, arch: number | null = null) => zs.push([z, arch]);
  push(2.3);
  push(2.22);
  push(2.08);
  push(RS.fz + RS.ra, 0);
  for (let i = 0; i <= 10; i++) {
    const z = RS.fz + RS.ra - (i / 10) * RS.ra * 2;
    push(z, archAt(z));
  }
  push(RS.fz - RS.ra, 0);
  for (const z of [0.6, 0.2, -0.3, -0.7]) push(z);
  push(RS.rz + RS.ra, 0);
  for (let i = 0; i <= 10; i++) {
    const z = RS.rz + RS.ra - (i / 10) * RS.ra * 2;
    push(z, archAt(z));
  }
  push(RS.rz - RS.ra, 0);
  push(-2.0);
  push(-2.18);
  push(-2.3);
  return zs.map(([z, a]) => ({ z, p: roadsterProfile(z, a ?? archAt(z)) }));
}

function RoadsterWheel({ x, z, w }: { x: number; z: number; w: number }) {
  const geo = useMemo(() => tyreGeo(RS.r, w, 0.27, 0.22), [w]);
  const s = Math.sign(x);
  const face = -s * (w / 2 - 0.012);
  return (
    <group position={[x, RS.r, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh geometry={geo} material={M.tyre} castShadow />
      <mesh position={[0, face + s * 0.012, 0]} material={K.rim}>
        <cylinderGeometry args={[0.27, 0.27, 0.03, 32]} />
      </mesh>
      {/* five twin spokes, a touch lighter than the dark aero disc */}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (Math.floor(i / 2) / 5) * Math.PI * 2 + (i % 2 ? 0.13 : -0.13);
        return (
          <mesh key={i} position={[Math.cos(a) * 0.14, face - s * 0.006, Math.sin(a) * 0.14]} rotation={[0, -a, 0]} material={K.spoke}>
            <boxGeometry args={[0.24, 0.012, 0.03]} />
          </mesh>
        );
      })}
      <mesh position={[0, face - s * 0.01, 0]} material={K.spoke}>
        <cylinderGeometry args={[0.055, 0.055, 0.016, 12]} />
      </mesh>
    </group>
  );
}

export function Roadster() {
  const geo = useMemo(() => {
    const secs = roadsterSections();
    // the skirt closes back in under the wheel-well wall, so it never shows through the hood
    const skirt = loft(secs.map(({ z, p }) => ({ z, p: [...p.slice(0, 5), [p[1][0] - 0.015, p[4][1]], [p[1][0] - 0.015, p[0][1] + 0.02]] })));
    const body = loft(secs.map(({ z, p }) => ({ z, p: p.slice(4) })));
    // dark glass canopy from the windscreen over the roof, down into the rear deck
    const cn = (z: number, wb: number, wm: number, ym: number, wt: number, yt: number): Sec => ({
      z,
      p: [
        [0, rTop(z) - 0.06],
        [wb, rTop(z) - 0.06],
        [wb, rTop(z) + 0.005],
        [wm, ym],
        [wt, yt],
        [0, yt + 0.012],
      ],
    });
    const canopy = loft([
      cn(0.62, 0.66, 0.66, rTop(0.62) + 0.01, 0.64, rTop(0.62) + 0.015),
      cn(0.25, 0.7, 0.63, 0.88, 0.47, 0.99),
      cn(-0.3, 0.72, 0.64, 0.95, 0.44, 1.1),
      cn(-0.85, 0.72, 0.62, 0.95, 0.42, 1.08),
      cn(-1.35, 0.66, 0.55, 0.92, 0.36, 0.99),
      cn(-1.82, 0.5, 0.44, 0.88, 0.27, 0.9),
    ]);
    const strut = plate(
      [
        [-1.8, 0.82],
        [-1.86, 1.02],
        [-1.98, 1.2],
        [-2.12, 1.3],
        [-2.26, 1.31],
        [-2.27, 1.24],
        [-2.14, 1.245],
        [-2.02, 1.15],
        [-1.94, 1.0],
        [-1.94, 0.82],
      ],
      0.03,
    );
    return { skirt, body, canopy, strut, wing: aerofoil(0.34, 0.045, 1.78) };
  }, []);
  return (
    <group>
      <mesh geometry={geo.body} material={K.shell} castShadow receiveShadow />
      <mesh geometry={geo.skirt} material={M.inkMatte} castShadow />
      <mesh geometry={geo.canopy} material={K.canopy} castShadow />
      {/* front light bar on the leading edge, the full-width orange bar at the back */}
      <Box s={[1.42, 0.022, 0.03]} p={[0, 0.375, 2.3]} m={K.lampWhite} />
      <Box s={[1.62, 0.035, 0.03]} p={[0, 0.72, -2.3]} m={K.lampOrange} />
      {/* swan-neck wing on two struts */}
      {SIDES.map((s) => (
        <mesh key={s} geometry={geo.strut} position={[s * 0.42, 0, 0]} material={M.ink} castShadow />
      ))}
      <mesh geometry={geo.wing} position={[0, 1.205, -2.2]} rotation={[0.06, 0, 0]} material={K.shell} castShadow />
      {SIDES.map((s) => (
        <Box key={s} s={[0.02, 0.1, 0.36]} p={[s * 0.9, 1.21, -2.2]} m={M.ink} />
      ))}
      {/* rear diffuser fins and four round exhausts */}
      {[-0.6, -0.3, 0, 0.3, 0.6].map((x) => (
        <Box key={x} s={[0.02, 0.16, 0.24]} p={[x, 0.23, -2.22]} m={M.ink} />
      ))}
      {[-0.46, -0.18, 0.18, 0.46].map((x) => (
        <group key={x} position={[x * 1.0, 0.27, -2.3]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={K.steel}>
            <cylinderGeometry args={[0.048, 0.048, 0.06, 16]} />
          </mesh>
          <mesh position={[0, 0.031, 0]} material={M.ink}>
            <cylinderGeometry args={[0.034, 0.034, 0.005, 14]} />
          </mesh>
        </group>
      ))}
      {SIDES.map((s) => (
        <group key={s}>
          <RoadsterWheel x={s * (rHalf(RS.fz) - 0.17)} z={RS.fz} w={0.26} />
          <RoadsterWheel x={s * (rHalf(RS.rz) - 0.18)} z={RS.rz} w={0.3} />
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

export function Bike() {
  const { fz, rz, r } = B;
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
    const tail = loft([
      fr(-0.1, 0.7, 0.84, 0.1, 0.12, 0.77, 0.1),
      fr(-0.4, 0.8, 0.93, 0.07, 0.1, 0.86, 0.08),
      fr(-0.64, 0.93, 1.02, 0.03, 0.055, 0.97, 0.04),
      fr(-0.76, 1.0, 1.04, 0.01, 0.015, 1.02, 0.01),
    ]);
    const seat = loft([
      fr(-0.12, 0.8, 0.87, 0.11, 0.12, 0.84, 0.1),
      fr(-0.42, 0.84, 0.93, 0.08, 0.09, 0.89, 0.07),
    ]);
    const screen = loft([
      { z: 0.6, p: [[0, 0.98], [0.15, 0.97], [0.13, 1.0], [0, 1.01]] },
      { z: 0.42, p: [[0, 1.1], [0.11, 1.08], [0.09, 1.105], [0, 1.115]] },
    ]);
    const frame = loft(
      [
        { z: 0.42, p: [[0.1, 0.86], [0.13, 0.86], [0.13, 0.98], [0.1, 0.98]] as P2[] },
        { z: -0.12, p: [[0.15, 0.5], [0.19, 0.5], [0.19, 0.72], [0.15, 0.72]] as P2[] },
      ].map(({ z, p }) => ({ z, p })),
      { mirror: false },
    );
    const frameL = frame.clone();
    frameL.scale(-1, 1, 1);
    const swing = loft(
      [
        { z: -0.12, p: [[0.12, 0.42], [0.16, 0.42], [0.16, 0.54], [0.12, 0.54]] as P2[] },
        { z: rz, p: [[0.1, r - 0.04], [0.13, r - 0.04], [0.13, r + 0.04], [0.1, r + 0.04]] as P2[] },
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
      {/* USD forks: thick ink tubes up top, silver legs at the axle; the triple clamp and clip-ons */}
      {SIDES.map((s) => (
        <group key={s}>
          <Tube a={[s * 0.09, r, fz]} b={[s * 0.09, 0.62, fk(0.62)]} r={0.022} m={K.silver} />
          <Tube a={[s * 0.09, 0.56, fk(0.56)]} b={[s * 0.09, 0.97, fk(0.97)]} r={0.034} m={M.graphite} />
          <Tube a={[s * 0.09, 0.93, fk(0.93)]} b={[s * 0.27, 0.9, fk(0.93) - 0.1]} r={0.013} m={M.ink} />
          {/* front calipers */}
          <Box s={[0.03, 0.12, 0.06]} p={[s * 0.085, r + 0.12, fz - 0.08]} r={[0.6, 0, 0]} m={M.ink} />
          {/* mirrors on the fairing */}
          <Tube a={[s * 0.14, 0.95, 0.62]} b={[s * 0.24, 0.99, 0.6]} r={0.01} m={M.ink} />
          <Box s={[0.11, 0.05, 0.03]} p={[s * 0.27, 1.0, 0.6]} r={[0, s * 0.2, 0]} m={M.ink} />
          {/* rearsets */}
          <Tube a={[s * 0.12, 0.5, -0.24]} b={[s * 0.2, 0.5, -0.26]} r={0.012} m={M.graphite} />
        </group>
      ))}
      <Box s={[0.24, 0.04, 0.08]} p={[0, 0.96, fk(0.96)]} m={M.graphite} />
      {/* frame, swingarm, engine */}
      <mesh geometry={geo.frame} material={M.ink} castShadow />
      <mesh geometry={geo.swing} material={M.ink} castShadow />
      <Box s={[0.26, 0.34, 0.4]} p={[0, 0.46, 0.06]} m={M.graphite} />
      {/* chain side (left): sprockets and the two runs of chain */}
      <mesh position={[-0.14, 0.46, -0.08]} rotation={[0, 0, Math.PI / 2]} material={K.steel}>
        <cylinderGeometry args={[0.05, 0.05, 0.012, 14]} />
      </mesh>
      <mesh position={[-0.14, r, rz]} rotation={[0, 0, Math.PI / 2]} material={K.steel}>
        <cylinderGeometry args={[0.12, 0.12, 0.012, 24]} />
      </mesh>
      <Tube a={[-0.14, 0.51, -0.08]} b={[-0.14, r + 0.12, rz]} r={0.008} m={K.steel} />
      <Tube a={[-0.14, 0.41, -0.08]} b={[-0.14, r - 0.12, rz]} r={0.008} m={K.steel} />
      {/* bodywork: paper fairing and tail, ink tank, graphite seat, dark screen */}
      <mesh geometry={geo.fairing} material={M.paper} castShadow />
      <mesh geometry={geo.mask} material={M.ink} castShadow />
      <mesh geometry={geo.tank} material={M.ink} castShadow />
      <mesh geometry={geo.tail} material={M.paper} castShadow />
      <mesh geometry={geo.seat} material={M.graphite} castShadow />
      <mesh geometry={geo.screen} material={K.canopy} castShadow />
      {/* the face: two angled headlights either side of a ram-air intake */}
      {SIDES.map((s) => (
        <Box key={s} s={[0.09, 0.024, 0.012]} p={[s * 0.075, 0.855, 0.848]} r={[0.1, s * 0.84, s * -0.2]} m={K.lampWhite} />
      ))}

      {/* winglets on the flanks */}
      {SIDES.map((s) => (
        <Box key={s} s={[0.12, 0.018, 0.16]} p={[s * 0.24, 0.8, 0.6]} r={[-0.12, 0, s * -0.12]} m={M.ink} />
      ))}
      {/* the orange accent: a line along each flank of the fairing */}
      {SIDES.map((s) => (
        <Tube key={s} a={[s * 0.203, 0.74, 0.56]} b={[s * 0.195, 0.5, 0.22]} r={0.009} m={M.orange} />
      ))}
      {/* front mudguard, tail light, hugger */}
      <Box s={[0.12, 0.02, 0.36]} p={[0, r + 0.33, fz - 0.02]} r={[0.2, 0, 0]} m={M.paper} />
      <Box s={[0.05, 0.025, 0.02]} p={[0, 0.99, -0.72]} m={K.lampOrange} />
      <Box s={[0.12, 0.02, 0.3]} p={[0, r + 0.34, rz + 0.12]} r={[-0.25, 0, 0]} m={M.ink} />
      {/* exhaust: header under the engine to a short can on the right */}
      <Tube a={[0.1, 0.5, 0.3]} b={[0.12, 0.26, 0.1]} r={0.025} m={K.steel} />
      <Tube a={[0.12, 0.26, 0.1]} b={[0.16, 0.3, -0.16]} r={0.03} m={K.steel} />
      <Tube a={[0.17, 0.3, -0.12]} b={[0.21, 0.44, -0.46]} r={0.055} m={M.graphite} />
      <Tube a={[0.21, 0.44, -0.46]} b={[0.215, 0.455, -0.5]} r={0.04} m={M.ink} />
    </group>
  );
}
