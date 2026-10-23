"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { CuboidCollider, HeightfieldCollider, RigidBody, TrimeshCollider } from "@react-three/rapier";
import * as THREE from "three";
import { C } from "./palette";
import { CANALS, LAKES, SEA_Y, canalDist, START_T, TRACK_WIDTH, lakeDepthDist, shoreDist, trackCurve } from "./layout";
import Water from "./Water";
import Harbour from "./Harbour";
import { EXTENT, GRID, heightGrid } from "./terrain";

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

function Kerbs() {
  // Red/white blocks along both edges, only where the track bends.
  const { matrices, colors } = useMemo(() => {
    const m: THREE.Matrix4[] = [];
    const c: THREE.Color[] = [];
    const n = 260;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const t0 = trackCurve.getTangentAt(u);
      const t1 = trackCurve.getTangentAt((u + 0.01) % 1);
      const bend = Math.abs(t0.angleTo(t1));
      if (bend < 0.075) continue;
      const p = trackCurve.getPointAt(u);
      const nrm = new THREE.Vector3(-t0.z, 0, t0.x).normalize();
      for (const side of [-1, 1]) {
        const q = p.clone().addScaledVector(nrm, side * (TRACK_WIDTH / 2 + 0.3));
        const rot = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), t0);
        m.push(new THREE.Matrix4().compose(new THREE.Vector3(q.x, p.y + 0.035, q.z), rot, new THREE.Vector3(1, 1, 1)));
        c.push(new THREE.Color(i % 2 ? C.red : C.white));
      }
    }
    return { matrices: m, colors: c };
  }, []);

  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.95, 0.05, 0.6), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((mat, i) => {
      mesh.setMatrixAt(i, mat);
      mesh.setColorAt(i, colors[i]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [matrices, colors]);

  return (
    <instancedMesh ref={ref} args={[geo, undefined, matrices.length]} receiveShadow castShadow>
      <meshStandardMaterial roughness={0.7} />
    </instancedMesh>
  );
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
      tmp.copy(grass).lerp(sand, 1 - THREE.MathUtils.smoothstep(d, 2.5, 6.5));
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

      <mesh geometry={asphalt} receiveShadow>
        <meshStandardMaterial color={C.asphalt} roughness={0.9} />
      </mesh>
      <mesh geometry={edgeL}>
        <meshStandardMaterial color={C.asphaltLine} roughness={0.8} />
      </mesh>
      <mesh geometry={edgeR}>
        <meshStandardMaterial color={C.asphaltLine} roughness={0.8} />
      </mesh>
      <mesh geometry={centre}>
        <meshStandardMaterial color={C.yellow} roughness={0.8} transparent opacity={0.55} />
      </mesh>
      <Kerbs />
      <StartLine />


    </group>
  );
}
