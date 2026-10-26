"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { dayNight } from "./daynight";
import { CuboidCollider, HeightfieldCollider, RigidBody, TrimeshCollider } from "@react-three/rapier";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C } from "./palette";
import { CANALS, LAKES, SEA_Y, canalDist, duneMask, START_T, TRACK_WIDTH, PIT_LANE_WIDTH, pitRoadCurves, lakeDepthDist, shoreDist, trackCurve } from "./layout";
import Water from "./Water";
import Embankments from "./Embankments";
import Harbour from "./Harbour";
import { EXTENT, GRID, heightGrid } from "./terrain";
import { tracks } from "./alive/Tracks";
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

// Kerbs (W05): flat ink and paper stripes just outside the road edge, only in the bends,
// both edges. A low ramp up from the road, a flat top and a bevelled outer edge down to
// the gravel; each run fades up out of the road at its ends.
const KERB_W = 1.0;
const KERB_H = 0.05;
const KERB_STRIPE = 0.9; // metres per stripe, as the proposal
const KERB_STEP = 0.3; // sampling along the lap
const KERB_RAMP = 0.9; // metres to rise to full height at a run's ends
// across the kerb from the road edge: [offset, height]
const KERB_PROFILE: [number, number][] = [
  [0, 0],
  [0.1, KERB_H],
  [KERB_W - 0.12, KERB_H],
  [KERB_W, 0.006],
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

/** True where a pit lane peels off or rejoins the lap: no kerb and no edge line there. */
function onPitLane(margin = 0.6) {
  const lanePts = pitRoadCurves().flatMap((c) => c.getSpacedPoints(80));
  return (x: number, z: number) => lanePts.some((q) => (q.x - x) ** 2 + (q.z - z) ** 2 < (PIT_LANE_WIDTH / 2 + margin) ** 2);
}

// The paper edge line (W05): a thin painted line just inside each edge of the road,
// the whole lap, broken where the pit lanes meet it.
const EDGE_IN = 0.3; // from the road edge to the line's outer side
const EDGE_W = 0.2;

function edgeLineGeometry() {
  const n = Math.round(trackCurve.getLength() / KERB_STEP);
  const onLane = onPitLane();
  const pos: number[] = [];
  const idx: number[] = [];
  for (const side of [-1, 1]) {
    let prev = -1;
    for (let i = 0; i <= n; i++) {
      const u = (i % n) / n;
      const p = trackCurve.getPointAt(u);
      const t = trackCurve.getTangentAt(u);
      const nx = -t.z * side;
      const nz = t.x * side;
      const a = TRACK_WIDTH / 2 - EDGE_IN - EDGE_W;
      const b = TRACK_WIDTH / 2 - EDGE_IN;
      if (onLane(p.x + nx * b, p.z + nz * b)) {
        prev = -1;
        continue;
      }
      const k = pos.length / 3;
      pos.push(p.x + nx * a, p.y + 0.036, p.z + nz * a, p.x + nx * b, p.y + 0.036, p.z + nz * b);
      if (prev >= 0) idx.push(prev, prev + 1, k, k, prev + 1, k + 1);
      prev = k;
    }
  }
  // wind every triangle to face up, whichever way its edge runs
  for (let i = 0; i < idx.length; i += 3) {
    const [p, q, r] = [idx[i] * 3, idx[i + 1] * 3, idx[i + 2] * 3];
    const ny = (pos[q + 2] - pos[p + 2]) * (pos[r] - pos[p]) - (pos[q] - pos[p]) * (pos[r + 2] - pos[p + 2]);
    if (ny < 0) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const nrm = new Float32Array(pos.length);
  for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  g.setIndex(idx);
  return g;
}

function kerbGeometry() {
  const n = Math.round(trackCurve.getLength() / KERB_STEP);
  const ink = new THREE.Color(C.ink);
  const paper = new THREE.Color(C.paper);
  const parts: THREE.BufferGeometry[] = [];
  const onLane = onPitLane(1.1); // clear of the lanes' paper lines (PitRoads.tsx, 3 m off their centre)
  for (const side of [-1, 1]) {
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const cut = (i: number) => {
      const u = (i % n) / n;
      const p = trackCurve.getPointAt(u);
      const t = trackCurve.getTangentAt(u);
      const d = TRACK_WIDTH / 2 + KERB_W / 2;
      return onLane(p.x - t.z * side * d, p.z + t.x * side * d);
    };
    const runs = kerbRuns(n).flatMap(([s0, s1]) => {
      const out: [number, number][] = [];
      let start = -1;
      for (let i = s0; i <= s1; i++) {
        const ok = i < s1 && !cut(i);
        if (ok && start < 0) start = i;
        if (!ok && start >= 0) {
          if (i - start >= Math.round(4 / KERB_STEP)) out.push([start, i]);
          start = -1;
        }
      }
      return out;
    });
    for (const [s0, s1] of runs) {
      const stripes = Math.max(2, Math.round(((s1 - s0) * KERB_STEP) / KERB_STRIPE));
      for (let k = 0; k < stripes; k++) {
        const a = s0 + Math.round(((s1 - s0) * k) / stripes);
        const b = s0 + Math.round(((s1 - s0) * (k + 1)) / stripes);
        const c = k % 2 ? paper : ink;
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

// The land. Where wheel tracks have parted the grass (alive/Tracks.tsx), grassy
// ground turns to bare earth.
const LAND = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
LAND.onBeforeCompile = (shader) => {
  Object.assign(shader.uniforms, tracks.uniforms);
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec2 vLandXZ;")
    .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvLandXZ = (modelMatrix * vec4(transformed, 1.0)).xz;");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying vec2 vLandXZ;\nuniform sampler2D uTracks; uniform vec2 uTracksFocus; uniform float uTracksSize;")
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec2 tuv = (vLandXZ - uTracksFocus) / uTracksSize + 0.5;
      if (tuv.x > 0.0 && tuv.x < 1.0 && tuv.y > 0.0 && tuv.y < 1.0) {
        float tr = texture2D(uTracks, tuv).r;
        float green = clamp((diffuseColor.g - diffuseColor.b) * 6.0, 0.0, 1.0) * (1.0 - clamp((diffuseColor.r - diffuseColor.g) * 12.0, 0.0, 1.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.33, 0.27), clamp(tr, 0.0, 1.0) * green * 0.75);
      }`,
    );
};

// The road (W05): clean matte asphalt, near black, no texture. The only paint is the
// paper edge line, the pit lane lines and the start line, all in ink and paper.
const ASPHALT = "#2b2c2f"; // darker than the proposal's #3a3b3e: the game's brighter sun lifts it to the near-black the proposal renders

/**
 * Night-race lighting on the tarmac: the floodlit lap reads evenly lit at night, so the
 * road, kerbs and paint get a warm light added in proportion to their own colour, set
 * from `dayNight.night` each frame. The towers are only the look.
 */
export const roadLight = { value: 0 };

/** `k` scales the light: bright paint would bloom at the asphalt's level, and the near-black asphalt needs more. */
function lit(m: THREE.MeshStandardMaterial, k = 1) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRoadLight = roadLight;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uRoadLight;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.95, 0.86) * uRoadLight * ${k.toFixed(2)};`
      );
  };
  m.customProgramCacheKey = () => "road-lit-" + k.toFixed(2);
  return m;
}

// night tarmac stays near-black like the proposal: only a faint lift, so the floodlight
// pools, the paper edge lines and the kerbs carry the lap
const ASPHALT_NIGHT = 0.1;

const ROAD = {
  asphalt: lit(new THREE.MeshStandardMaterial({ color: ASPHALT, roughness: 0.95 }), ASPHALT_NIGHT),
  kerb: lit(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), 0.25),
};
/** Paper paint on the asphalt: edge lines, the pit lanes' lines, the start line's paper squares. */
export const roadPaint = lit(
  new THREE.MeshStandardMaterial({ color: C.paper, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
  0.25
);
/** The pit lane and its entry and exit: the same night-lit asphalt, drawn over the track where they meet. */
export const pitAsphalt = lit(
  new THREE.MeshStandardMaterial({ color: ASPHALT, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
  ASPHALT_NIGHT
);

function Kerbs() {
  const geo = useMemo(() => kerbGeometry(), []);
  return <mesh geometry={geo} receiveShadow material={ROAD.kerb} />;
}

function EdgeLines() {
  const geo = useMemo(() => edgeLineGeometry(), []);
  return <mesh geometry={geo} receiveShadow material={roadPaint} />;
}

// The start line: one row of ink and paper squares across the road.
function StartLine() {
  const mat = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 16;
    const g = c.getContext("2d")!;
    for (let x = 0; x < 8; x++)
      for (let y = 0; y < 2; y++) {
        g.fillStyle = (x + y) % 2 ? C.ink : C.paper;
        g.fillRect(x * 8, y * 8, 8, 8);
      }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return lit(new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }), 0.25);
  }, []);
  const p = trackCurve.getPointAt(START_T);
  const tan = trackCurve.getTangentAt(START_T);
  return (
    <mesh position={[p.x, p.y + 0.04, p.z]} rotation={[-Math.PI / 2, 0, Math.atan2(tan.z, tan.x) + Math.PI / 2]} receiveShadow material={mat}>
      <planeGeometry args={[TRACK_WIDTH, 1.6]} />
    </mesh>
  );
}

// The ground: the terrain grid as a mesh (vertex colours), grass on the land, a concrete
// band along the coast and the lake and river shores, gravel on the dunes and in the
// park, the sea floor dipping under the water.
function terrainGeometry() {
  const h = heightGrid();
  const n = GRID + 1;
  const pos = new Float32Array(n * n * 3);
  const col = new Float32Array(n * n * 3);
  const grass = new THREE.Color(C.grass);
  const shore = new THREE.Color(C.concrete);
  const gravel = new THREE.Color(C.gravel);
  const wet = new THREE.Color(C.concreteDark).multiplyScalar(0.82);
  const tmp = new THREE.Color();
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const x = (i / GRID - 0.5) * EXTENT;
      const z = (j / GRID - 0.5) * EXTENT;
      const y = h[k];
      pos.set([x, y, z], k * 3);
      // concrete along the shores (by distance to the water), darker where it's wet
      const d = Math.min(shoreDist(x, z), ...LAKES.map((l) => -lakeDepthDist(l, x, z)), ...CANALS.map((c) => -canalDist(c, x, z)));
      tmp.copy(grass).lerp(shore, 1 - THREE.MathUtils.smoothstep(d, 3, 5)); // a crisp edge from concrete into grass
      tmp.lerp(gravel, duneMask(x, z) * 0.85); // the east dunes are gravel with a little grass
      tmp.lerp(gravel, parkSandAt(x, z)); // the park: grass islands in gravel
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
  useFrame(() => {
    roadLight.value = dayNight.night * 1.3;
  });
  const asphalt = useMemo(() => ribbon(TRACK_WIDTH, 0.03), []);
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
      <mesh geometry={ground} receiveShadow material={LAND} />
      <Water />
      <Harbour />
      <Embankments />

      <mesh geometry={asphalt} receiveShadow material={ROAD.asphalt} />
      <EdgeLines />
      <Kerbs />
      <StartLine />
    </group>
  );
}
