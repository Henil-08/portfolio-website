"use client";

import { useMemo } from "react";
import { CuboidCollider, HeightfieldCollider, RigidBody, TrimeshCollider } from "@react-three/rapier";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C } from "./palette";
import { CANALS, LAKES, SEA_Y, canalDist, duneMask, START_T, TRACK_WIDTH, lakeDepthDist, shoreDist, trackCurve } from "./layout";
import Water from "./Water";
import Embankments from "./Embankments";
import { patchSeeThrough } from "./seeThrough";
import Harbour from "./Harbour";
import { EXTENT, GRID, heightGrid } from "./terrain";
import { parkSand as parkSandAt } from "./park/layout";

const SEGMENTS = 320;

// Ribbon along the track curve, following its height, slightly above the ground.
function ribbon(width: number, y: number, offset = 0) {
  const pos: number[] = [];
  const idx: number[] = [];
  const pts = trackCurve.getSpacedPoints(SEGMENTS);
  for (let i = 0; i <= SEGMENTS; i++) {
    const p = pts[i % SEGMENTS];
    // wrap the tangent with the point, or the closing quad leaves a hairline wedge at t=0
    const t = trackCurve.getTangentAt((i % SEGMENTS) / SEGMENTS);
    const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
    const a = p.clone().addScaledVector(n, offset - width / 2);
    const b = p.clone().addScaledVector(n, offset + width / 2);
    pos.push(a.x, p.y + y, a.z, b.x, p.y + y, b.z);
    if (i < SEGMENTS) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Make sure the ribbon faces up whichever way the curve winds.
  if (g.getAttribute("normal").getY(0) < 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  // The first and last pairs are the same points: give them the same normal so no seam shades in.
  const nrm = g.getAttribute("normal");
  for (const k of [0, 1]) {
    const e = SEGMENTS * 2 + k;
    const x = nrm.getX(k) + nrm.getX(e), ny = nrm.getY(k) + nrm.getY(e), z = nrm.getZ(k) + nrm.getZ(e);
    const l = Math.hypot(x, ny, z) || 1;
    nrm.setXYZ(k, x / l, ny / l, z / l);
    nrm.setXYZ(e, x / l, ny / l, z / l);
  }
  return g;
}

// Rumble kerbs, Bruno style: one continuous strip hugging each bend on both edges,
// red and white stripes that touch, a low ramp up from the road, a flat top and a
// bevelled outer edge. Each run fades up out of the road at its ends.
const KERB_W = 0.7;
const KERB_H = 0.06;
const KERB_STRIPE = 1.2; // metres per stripe
const KERB_STEP = 0.3; // sampling along the lap
const KERB_RAMP = 0.9; // metres to rise to full height at a run's ends
// across the kerb from the road edge: [offset, height]
const KERB_PROFILE: [number, number][] = [
  [0, 0],
  [0.12, KERB_H],
  [KERB_W - 0.16, KERB_H],
  [KERB_W, 0.008],
];

/** Index ranges [start, end) (end may pass n, wrap with % n) of the bends, in samples. */
function kerbRuns(n: number) {
  // a bend is tighter than ~55 m radius: the heading turns 0.11 rad over 6 m
  const du = 6 / trackCurve.getLength();
  const bend = Array.from({ length: n }, (_, i) => {
    const u = i / n;
    return trackCurve.getTangentAt(u).angleTo(trackCurve.getTangentAt((u + du) % 1)) >= 0.11;
  });
  // close short gaps between bends, then drop slivers
  const gap = Math.round(3 / KERB_STEP);
  const min = Math.round(4 / KERB_STEP);
  const runs: [number, number][] = [];
  const first = bend.indexOf(false);
  if (first < 0) return [[0, n] as [number, number]];
  for (let k = 0; k < n; k++) {
    const i = first + k;
    if (!bend[i % n]) continue;
    const last = runs[runs.length - 1];
    if (last && i - last[1] <= gap) last[1] = i + 1;
    else runs.push([i, i + 1]);
  }
  const a = runs[0];
  const b = runs[runs.length - 1];
  if (runs.length > 1 && a[0] + n - b[1] <= gap) {
    b[1] = a[1] + n;
    runs.shift();
  }
  return runs.filter(([s, e]) => e - s >= min);
}

function kerbGeometry() {
  const n = Math.round(trackCurve.getLength() / KERB_STEP);
  const red = new THREE.Color(C.red);
  const white = new THREE.Color(C.white);
  const parts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    for (const [s0, s1] of kerbRuns(n)) {
      const stripes = Math.max(2, Math.round(((s1 - s0) * KERB_STEP) / KERB_STRIPE));
      for (let k = 0; k < stripes; k++) {
        const a = s0 + Math.round(((s1 - s0) * k) / stripes);
        const b = s0 + Math.round(((s1 - s0) * (k + 1)) / stripes);
        const c = k % 2 ? white : red;
        const base = pos.length / 3;
        for (let i = a; i <= b; i++) {
          const u = (i % n) / n;
          const p = trackCurve.getPointAt(u);
          const t = trackCurve.getTangentAt(u);
          const nx = -t.z * side;
          const nz = t.x * side;
          const lift = Math.min(1, ((i - s0) * KERB_STEP) / KERB_RAMP, ((s1 - i) * KERB_STEP) / KERB_RAMP);
          for (const [o, h] of KERB_PROFILE) {
            const d = TRACK_WIDTH / 2 + o;
            pos.push(p.x + nx * d, p.y + 0.03 + h * lift, p.z + nz * d);
            col.push(c.r, c.g, c.b);
          }
        }
        const m = KERB_PROFILE.length;
        for (let i = 0; i < b - a; i++)
          for (let j = 0; j < m - 1; j++) {
            const v = base + i * m + j;
            idx.push(v, v + 1, v + m, v + 1, v + m + 1, v + m);
          }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    // face up whichever way this edge winds
    if (g.getAttribute("normal").getY(1) < 0) {
      for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
      g.setIndex(idx);
      g.computeVertexNormals();
    }
    parts.push(g);
  }
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return g;
}

// Road surfaces fade round the car when they pass over it (the crossover deck), like
// everything else between the car and the camera (see seeThrough.ts).
const ROAD = {
  asphalt: patchSeeThrough(new THREE.MeshStandardMaterial({ color: C.asphalt, roughness: 0.9 })),
  line: patchSeeThrough(new THREE.MeshStandardMaterial({ color: C.asphaltLine, roughness: 0.8 })),
  centre: patchSeeThrough(new THREE.MeshStandardMaterial({ color: C.yellow, roughness: 0.8, transparent: true, opacity: 0.55 })),
  kerb: patchSeeThrough(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })),
};

function Kerbs() {
  const geo = useMemo(() => kerbGeometry(), []);
  return <mesh geometry={geo} receiveShadow material={ROAD.kerb} />;
}

function StartLine() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 16;
    const g = c.getContext("2d")!;
    for (let x = 0; x < 8; x++)
      for (let y = 0; y < 2; y++) {
        g.fillStyle = (x + y) % 2 ? "#1f2133" : "#ffffff";
        g.fillRect(x * 8, y * 8, 8, 8);
      }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const p = trackCurve.getPointAt(START_T);
  const tan = trackCurve.getTangentAt(START_T);
  return (
    <mesh position={[p.x, p.y + 0.045, p.z]} rotation={[-Math.PI / 2, 0, Math.atan2(tan.z, tan.x) + Math.PI / 2]} receiveShadow>
      <planeGeometry args={[TRACK_WIDTH, 1.6]} />
      <meshStandardMaterial map={tex} roughness={0.8} />
    </mesh>
  );
}

// The ground: the terrain grid as a mesh, grass on the land and sand on the
// beaches and lake shores (vertex colours), the sea floor dipping under the water.
function terrainGeometry() {
  const h = heightGrid();
  const n = GRID + 1;
  const pos = new Float32Array(n * n * 3);
  const col = new Float32Array(n * n * 3);
  const grass = new THREE.Color(C.grass);
  const sand = new THREE.Color(C.sand);
  const wet = new THREE.Color(C.sand).multiplyScalar(0.78);
  const parkSand = new THREE.Color("#e8cfa6"); // Bruno's park sand, toned to our palette
  const tmp = new THREE.Color();
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const x = (i / GRID - 0.5) * EXTENT;
      const z = (j / GRID - 0.5) * EXTENT;
      const y = h[k];
      pos.set([x, y, z], k * 3);
      // sand along the shores (by distance to the water), darker where it's wet
      const d = Math.min(shoreDist(x, z), ...LAKES.map((l) => -lakeDepthDist(l, x, z)), ...CANALS.map((c) => -canalDist(c, x, z)));
      tmp.copy(grass).lerp(sand, 1 - THREE.MathUtils.smoothstep(d, 2, 9.5)); // a soft, wide blend from sand into grass
      tmp.lerp(sand, duneMask(x, z) * 0.85); // the east dunes are sand with a little grass
      tmp.lerp(parkSand, parkSandAt(x, z)); // the park: grass islands in warm sand
      tmp.lerp(wet, 1 - THREE.MathUtils.smoothstep(y - SEA_Y, 0.02, 0.18));
      col.set([tmp.r, tmp.g, tmp.b], k * 3);
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < GRID; j++)
    for (let i = 0; i < GRID; i++) {
      const a = j * n + i;
      idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Rapier heightfield from the same grid. Columns run along X, rows along Z.
function heightfieldArgs(): [number, number, number[], { x: number; y: number; z: number }] {
  const h = heightGrid();
  const n = GRID + 1;
  const out = new Array<number>(n * n);
  for (let ix = 0; ix < n; ix++) for (let iz = 0; iz < n; iz++) out[ix * n + iz] = h[iz * n + ix];
  return [GRID, GRID, out, { x: EXTENT, y: 1, z: EXTENT }];
}

export default function Island() {
  const asphalt = useMemo(() => ribbon(TRACK_WIDTH, 0.03), []);
  const edgeL = useMemo(() => ribbon(0.25, 0.05, -TRACK_WIDTH / 2 + 0.35), []);
  const edgeR = useMemo(() => ribbon(0.25, 0.05, TRACK_WIDTH / 2 - 0.35), []);
  const centre = useMemo(() => ribbon(0.18, 0.05, 0), []);
  const ground = useMemo(() => terrainGeometry(), []);
  const field = useMemo(() => heightfieldArgs(), []);
  // The road surface itself is the driving surface: a slightly wide trimesh of the ribbon.
  const road = useMemo(() => {
    const g = ribbon(TRACK_WIDTH + 3, 0.03);
    return [g.getAttribute("position").array as Float32Array, g.getIndex()!.array as Uint32Array] as const;
  }, []);

  return (
    <group>
      <RigidBody type="fixed" colliders={false} friction={1}>
        {/* The land, hills and all */}
        <HeightfieldCollider args={field} />
        <TrimeshCollider args={[road[0], road[1]]} />
        {/* Sea floor catches anything that drives off, the car then respawns */}
        <CuboidCollider args={[400, 1, 400]} position={[0, -7, 0]} />
      </RigidBody>

      {/* The land with its beaches, then the sea and the lakes over it. */}
      <mesh geometry={ground} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.92} />
      </mesh>
      <Water />
      <Harbour />
      <Embankments />

      <mesh geometry={asphalt} receiveShadow material={ROAD.asphalt} />
      <mesh geometry={edgeL} material={ROAD.line} />
      <mesh geometry={edgeR} material={ROAD.line} />
      <mesh geometry={centre} material={ROAD.centre} />
      <Kerbs />
      <StartLine />


    </group>
  );
}
