"use client";

// V03 Atlas, the roadster. Nose toward +z, wheels on y = 0.
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Box, K, M, SIDES, Tube, WheelSlot, aerofoil, curve, loft, plate, tyreGeo, useMats, type P2, type Sec, type WheelSpec } from "./kit";
import { LIVERIES, type Livery } from "./liveries";

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
/** Wheel centres for the game, in WheelSlot order: front right, front left, rear right, rear left. */
export const ROADSTER_WHEELS: WheelSpec[] = [
  { x: rsHw(RS.fz) - 0.17, z: RS.fz, r: RS.r, front: true },
  { x: -(rsHw(RS.fz) - 0.17), z: RS.fz, r: RS.r, front: true },
  { x: rsHw(RS.rz) - 0.17, z: RS.rz, r: RS.r, front: false },
  { x: -(rsHw(RS.rz) - 0.17), z: RS.rz, r: RS.r, front: false },
];

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

function RoadsterWheel({ i, w }: { i: number; w: number }) {
  const geo = useMemo(() => tyreGeo(RS.r, w, 0.285, 0.22), [w]);
  const { x, z } = ROADSTER_WHEELS[i];
  const s = Math.sign(x);
  const face = -s * (w / 2 - 0.012);
  return (
    <WheelSlot i={i} p={[x, RS.r, z]}>
      <group rotation={[0, 0, Math.PI / 2]}>
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
    </WheelSlot>
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
      // the rear fascia: a solid slab in the tail's own outline, so the back reads closed from any angle
      fascia: (() => {
        const ring = [...back.p, ...back.p.slice(1, -1).reverse().map(([x, y]): P2 => [-x, y])].filter((q, i, arr) => {
          const n = arr[(i + 1) % arr.length];
          return Math.hypot(q[0] - n[0], q[1] - n[1]) > 1e-6;
        });
        const g = new THREE.ExtrudeGeometry(new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x * 0.995, y))), { depth: 0.07, bevelEnabled: false });
        g.translate(0, 0, back.z - 0.055);
        return g;
      })(),
      // the engine cover: a low hump from under the canopy's tail to the fascia, closing the gap behind the glass
      cover: loft([
        { z: -1.5, p: [[0, 0.76], [0.44, 0.76], [0.44, 0.86], [0.3, 0.91], [0, 0.915]] },
        { z: -1.62, p: [[0, 0.76], [0.45, 0.76], [0.45, 0.87], [0.31, 0.905], [0, 0.91]] },
        { z: -1.9, p: [[0, 0.76], [0.56, 0.76], [0.56, 0.9], [0.4, 0.93], [0, 0.935]] },
        { z: -2.24, p: [[0, 0.76], [0.62, 0.76], [0.62, 0.885], [0.45, 0.91], [0, 0.915]] },
      ]),
      // a liner over the top of each wheel: half a drum round the axle, and the inboard wall
      liner: (() => {
        const drum = new THREE.CylinderGeometry(RS.ra - 0.012, RS.ra - 0.012, 0.36, 28, 1, true, 0, Math.PI);
        drum.rotateZ(Math.PI / 2);
        const wall = new THREE.CircleGeometry(RS.ra - 0.012, 28, 0, Math.PI);
        wall.rotateY(Math.PI / 2);
        wall.translate(-0.18, 0, 0);
        return mergeGeometries([drum, wall]);
      })(),
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
      {/* the back: a solid fascia, the full-width light bar on a dark strip, the engine cover with
          louvres, a diffuser box with the four round exhausts set into it, and arch liners */}
      <mesh geometry={geo.fascia} material={mt.body} castShadow receiveShadow />
      <Box s={[1.8, 0.08, 0.02]} p={[0, 0.79, -2.362]} m={mt.trim} />
      <Box name="lamp" s={[1.72, 0.026, 0.02]} p={[0, 0.79, -2.374]} m={mt.lamp} />
      <Box s={[1.5, 0.05, 0.016]} p={[0, 0.6, -2.358]} m={mt.trim} />
      <mesh geometry={geo.cover} material={mt.body} castShadow />
      {[-1.72, -1.82, -1.92, -2.02, -2.12].map((z) => (
        <Box key={z} s={[0.86, 0.012, 0.035]} p={[0, rsYt(z) + 0.045, z]} m={mt.trim} />
      ))}
      <Box s={[1.5, 0.3, 0.6]} p={[0, 0.27, -2.07]} m={mt.trim} />
      <Box s={[1.42, 0.03, 0.2]} p={[0, 0.405, -2.27]} m={M.inkMatte} />
      {[-0.45, -0.15, 0.15, 0.45].map((x) => (
        <group key={x} position={[x, 0.27, -2.385]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={K.steel}>
            <cylinderGeometry args={[0.055, 0.055, 0.04, 20]} />
          </mesh>
          <mesh position={[0, -0.021, 0]} material={M.ink}>
            <cylinderGeometry args={[0.04, 0.04, 0.004, 18]} />
          </mesh>
        </group>
      ))}
      {[-0.6, -0.3, 0, 0.3, 0.6].map((x) => (
        <Box key={x} s={[0.02, 0.07, 0.42]} p={[x, 0.11, -2.13]} m={M.ink} />
      ))}
      {SIDES.map((s) =>
        [
          [RS.fz, rsHw(RS.fz)],
          [RS.rz, rsHw(RS.rz)],
        ].map(([z, hw]) => <mesh key={`${s}${z}`} geometry={geo.liner} position={[s * (hw - 0.24), RS.cy, z]} scale={[s, 1, 1]} material={K.liner} />),
      )}
      {/* the accent: one line along each sill, between the arches */}
      {SIDES.map((s) => (
        <Tube key={s} a={[s * (rsHw(0.98) - 0.072), rsYs(0.98) + 0.012, 0.98]} b={[s * (rsHw(-0.88) - 0.072), rsYs(-0.88) + 0.012, -0.88]} r={0.011} m={mt.accent} />
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
          <RoadsterWheel i={s > 0 ? 0 : 1} w={0.27} />
          <RoadsterWheel i={s > 0 ? 2 : 3} w={0.32} />
        </group>
      ))}
    </group>
  );
}

