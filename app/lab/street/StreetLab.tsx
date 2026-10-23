"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import Street from "@/components/world/street";
import Island from "@/components/world/Island";
import Places from "@/components/world/Places";
import { TREES } from "@/components/world/street/common";
import { dayNight } from "@/components/world/daynight";
import { C } from "@/components/world/palette";
import { GARAGES, GRANDSTAND, ISLAND_RADIUS, PIT, SECTORS, TRACK_WIDTH, trackCurve, trackPoint, zones } from "@/components/world/layout";

function ribbon(width: number, y: number, offset = 0) {
  const N = 320;
  const pos: number[] = [];
  const idx: number[] = [];
  const pts = trackCurve.getSpacedPoints(N);
  for (let i = 0; i <= N; i++) {
    const p = pts[i % N];
    const t = trackCurve.getTangentAt((i % N) / N);
    const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
    const a = p.clone().addScaledVector(n, offset - width / 2);
    const b = p.clone().addScaledVector(n, offset + width / 2);
    pos.push(a.x, y, a.z, b.x, y, b.z);
    if (i < N) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const nrm = new Float32Array(pos.length);
  for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  return g;
}

function Ground({ guides }: { guides: boolean }) {
  const track = useMemo(() => ribbon(TRACK_WIDTH, 0.03), []);
  const edgeA = useMemo(() => ribbon(0.25, 0.04, -TRACK_WIDTH / 2 + 0.35), []);
  const edgeB = useMemo(() => ribbon(0.25, 0.04, TRACK_WIDTH / 2 - 0.35), []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[ISLAND_RADIUS, 128]} />
        <meshStandardMaterial color={C.grass} roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <ringGeometry args={[ISLAND_RADIUS, ISLAND_RADIUS + 5, 128]} />
        <meshStandardMaterial color={C.sand} roughness={0.85} />
      </mesh>
      <mesh geometry={track} receiveShadow>
        <meshStandardMaterial color={C.asphalt} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={edgeA}>
        <meshStandardMaterial color={C.asphaltLine} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={edgeB}>
        <meshStandardMaterial color={C.asphaltLine} side={THREE.DoubleSide} />
      </mesh>
      {guides && (
        <>
          {/* pit lane + garages as grey blocks */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, PIT.z]}>
            <planeGeometry args={[PIT.to - PIT.from + 10, 6]} />
            <meshStandardMaterial color={C.asphalt} />
          </mesh>
          {GARAGES.map((g) => (
            <mesh key={g.x} position={[g.x, 2.25, PIT.garageZ - 1]} castShadow receiveShadow>
              <boxGeometry args={[9, 4.5, 7]} />
              <meshStandardMaterial color={C.greyLight} />
            </mesh>
          ))}
          {/* sector scenery footprints */}
          {SECTORS.map((s) => (
            <group key={s.id} position={[s.scene[0], 0, s.scene[1]]} rotation={[0, s.sceneRot, 0]}>
              <mesh position={[0, 3, -4.5]} castShadow>
                <boxGeometry args={[26, 6, 9]} />
                <meshStandardMaterial color={C.teal} transparent opacity={0.45} />
              </mesh>
            </group>
          ))}
          {zones
            .filter((z) => !z.id.startsWith("sector"))
            .map((z) => (
              <mesh key={z.id} rotation={[-Math.PI / 2, 0, 0]} position={[z.pos[0], 0.02, z.pos[1]]}>
                <planeGeometry args={z.size} />
                <meshStandardMaterial color={C.yellow} transparent opacity={0.6} />
              </mesh>
            ))}
          <mesh position={[GRANDSTAND.pos[0], 2.6, GRANDSTAND.pos[1]]}>
            <boxGeometry args={[10.6, 5.2, 5]} />
            <meshStandardMaterial color={C.white} />
          </mesh>
          {TREES.map(([x, z, r], i) => (
            <mesh key={i} position={[x, 1.6, z]} castShadow>
              <coneGeometry args={[r * 0.7, 3.2, 8]} />
              <meshStandardMaterial color={C.leaf} />
            </mesh>
          ))}
        </>
      )}
    </>
  );
}

function Rig({ cam, t }: { cam: string; t: number }) {
  const camera = useThree((s) => s.camera);
  const target = useMemo(() => {
    if (cam === "high") {
      const p = trackPoint(t);
      return new THREE.Vector3(p.x, 0, p.z);
    }
    return new THREE.Vector3(0, 0, -6);
  }, [cam, t]);
  useLayoutEffect(() => {
    if (cam === "high") camera.position.set(target.x + 10.5 * 1.15, 12.5 * 1.15, target.z + 14 * 1.15);
    else if (cam === "top") camera.position.set(0.01, 260, 0.01);
    else camera.position.set(118, 112, 150);
    camera.lookAt(target);
  }, [camera, cam, target]);
  return <OrbitControls makeDefault target={target} />;
}

function Car({ t }: { t: number }) {
  const p = trackPoint(t);
  const tan = trackCurve.getTangentAt(((t % 1) + 1) % 1);
  return (
    <mesh position={[p.x, 0.5, p.z]} rotation={[0, Math.atan2(-tan.z, tan.x), 0]} castShadow>
      <boxGeometry args={[4.6, 0.9, 1.9]} />
      <meshStandardMaterial color={C.red} />
    </mesh>
  );
}

function NightDriver({ night }: { night: boolean }) {
  useFrame(() => {
    dayNight.night = night ? 1 : 0;
  }, -10);
  return null;
}

export default function StreetLab({ cam, t, night, guides, full, shadows = true }: { cam: string; t: number; night: boolean; guides: boolean; full: boolean; shadows?: boolean }) {
  const bg = night ? "#151b33" : "#e6e4df";
  const sh = cam === "high" ? 40 : 110;
  const p = trackPoint(t);
  const center: [number, number, number] = cam === "high" ? [p.x, 0, p.z] : [0, 0, 0];
  return (
    <div style={{ position: "fixed", inset: 0, background: bg }}>
      <Canvas
        shadows={shadows}
        dpr={[1, 1.5]}
        camera={{ fov: 34, near: 0.5, far: 1200 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: night ? 0.95 : 0.82 }}
      >
        <color attach="background" args={[bg]} />
        <fog attach="fog" args={[bg, 160, 420]} />
        <Environment resolution={128} frames={1} environmentIntensity={night ? 0.12 : 0.55}>
          <Lightformer intensity={2.2} position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} color="#ffffff" />
          <Lightformer intensity={1.4} position={[-18, 4, 8]} rotation-y={Math.PI / 2} scale={[20, 6, 1]} color="#fff3e6" />
          <Lightformer intensity={1.1} position={[18, 4, -8]} rotation-y={-Math.PI / 2} scale={[20, 6, 1]} color="#e8f0ff" />
        </Environment>
        <hemisphereLight args={[night ? "#3a4570" : "#f4efe6", night ? "#1a1d2a" : "#8f8a80", night ? 0.25 : 0.35]} />
        <directionalLight
          position={[center[0] + 34, 60, center[2] + 30]}
          intensity={night ? 0.25 : 1.9}
          color={night ? "#9fb4ff" : "#fff1e0"}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-sh}
          shadow-camera-right={sh}
          shadow-camera-top={sh}
          shadow-camera-bottom={-sh}
          shadow-camera-far={300}
          shadow-bias={-0.0004}
          shadow-normalBias={0.04}
        >
          <object3D attach="target" position={center} />
        </directionalLight>
        <NightDriver night={night} />
        <Suspense fallback={null}>
          <Physics paused>
            {full ? (
              <>
                <Island />
                <Places />
              </>
            ) : (
              <Ground guides={guides} />
            )}
            <Street />
            {cam === "high" && <Car t={t} />}
          </Physics>
        </Suspense>
        <Rig cam={cam} t={t} />
        <DrawCalls />
      </Canvas>
      <div id="dc" style={{ position: "fixed", left: 12, top: 10, font: "600 13px system-ui", color: night ? "#fff" : C.ink, opacity: 0.7 }}>
        street lab · {cam} · t={t} {night ? "· night" : ""}
      </div>
    </div>
  );
}

function DrawCalls() {
  const gl = useThree((s) => s.gl);
  useFrame(() => {
    const el = document.getElementById("dc");
    if (el && el.dataset.base === undefined) el.dataset.base = el.textContent ?? "";
    if (el) el.textContent = `${el.dataset.base} · calls ${gl.info.render.calls} · tris ${gl.info.render.triangles}`;
  });
  return null;
}
