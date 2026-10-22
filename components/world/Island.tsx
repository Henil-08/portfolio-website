"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { C } from "./palette";
import { ISLAND_RADIUS, TRACK_WIDTH, trackCurve } from "./layout";

const SEGMENTS = 320;

// Flat ribbon along the track curve, slightly above the grass.
function ribbon(width: number, y: number, offset = 0) {
  const pos: number[] = [];
  const idx: number[] = [];
  const pts = trackCurve.getSpacedPoints(SEGMENTS);
  for (let i = 0; i <= SEGMENTS; i++) {
    const p = pts[i % SEGMENTS];
    const t = trackCurve.getTangentAt(i / SEGMENTS);
    const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
    const a = p.clone().addScaledVector(n, offset - width / 2);
    const b = p.clone().addScaledVector(n, offset + width / 2);
    pos.push(a.x, y, a.z, b.x, y, b.z);
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
      if (bend < 0.045) continue;
      const p = trackCurve.getPointAt(u);
      const nrm = new THREE.Vector3(-t0.z, 0, t0.x).normalize();
      for (const side of [-1, 1]) {
        const q = p.clone().addScaledVector(nrm, side * (TRACK_WIDTH / 2 + 0.45));
        const rot = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), t0);
        m.push(new THREE.Matrix4().compose(new THREE.Vector3(q.x, 0.07, q.z), rot, new THREE.Vector3(1, 1, 1)));
        c.push(new THREE.Color(i % 2 ? C.red : C.white));
      }
    }
    return { matrices: m, colors: c };
  }, []);

  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(1.1, 0.14, 0.9), []);
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
  const p = trackCurve.getPointAt(0.98);
  const tan = trackCurve.getTangentAt(0.98);
  return (
    <mesh position={[p.x, 0.045, p.z]} rotation={[-Math.PI / 2, 0, Math.atan2(tan.z, tan.x) + Math.PI / 2]} receiveShadow>
      <planeGeometry args={[TRACK_WIDTH, 1.6]} />
      <meshStandardMaterial map={tex} roughness={0.8} />
    </mesh>
  );
}

function Water() {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring.current) {
      const s = 1 + Math.sin(t * 0.8) * 0.006;
      ring.current.scale.set(s, 1, s);
    }
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]} receiveShadow>
        <circleGeometry args={[600, 64]} />
        <meshStandardMaterial ref={mat} color={C.water} roughness={0.35} metalness={0.05} />
      </mesh>
      {/* Foam ring hugging the beach */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.82, 0]}>
        <ringGeometry args={[ISLAND_RADIUS + 6.5, ISLAND_RADIUS + 8.5, 96]} />
        <meshBasicMaterial color="#e9fbff" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

export default function Island() {
  const asphalt = useMemo(() => ribbon(TRACK_WIDTH, 0.03), []);
  const edgeL = useMemo(() => ribbon(0.25, 0.05, -TRACK_WIDTH / 2 + 0.35), []);
  const edgeR = useMemo(() => ribbon(0.25, 0.05, TRACK_WIDTH / 2 - 0.35), []);
  const centre = useMemo(() => ribbon(0.18, 0.05, 0), []);

  return (
    <group>
      <RigidBody type="fixed" colliders={false} friction={1}>
        {/* Island top sits at y=0 */}
        <CylinderCollider args={[2, ISLAND_RADIUS + 5]} position={[0, -2, 0]} />
        {/* Sea floor catches anything that drives off, the car then respawns */}
        <CuboidCollider args={[400, 1, 400]} position={[0, -7, 0]} />
      </RigidBody>

      {/* Grass top, sand beach and a cliff band */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[ISLAND_RADIUS, 96]} />
        <meshStandardMaterial color={C.grass} roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.52, 0]} receiveShadow>
        <cylinderGeometry args={[ISLAND_RADIUS + 5, ISLAND_RADIUS + 7, 0.9, 96]} />
        <meshStandardMaterial color={C.sand} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <ringGeometry args={[ISLAND_RADIUS, ISLAND_RADIUS + 5, 96]} />
        <meshStandardMaterial color={C.sand} roughness={1} />
      </mesh>

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

      {/* Plaza where the car starts */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 3]} receiveShadow>
        <circleGeometry args={[9, 48]} />
        <meshStandardMaterial color={C.cream} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 3]}>
        <ringGeometry args={[8.4, 9, 48]} />
        <meshStandardMaterial color={C.red} roughness={0.8} />
      </mesh>

      <Water />
    </group>
  );
}
