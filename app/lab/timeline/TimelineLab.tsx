"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import Timeline from "@/components/world/Timeline";
import { carState } from "@/components/world/carState";
import { dayNight } from "@/components/world/daynight";
import { C } from "@/components/world/palette";
import { PLAZA, T0, T1, laneX, zOf } from "@/components/world/timeline/data";

// Career plaza preview on flat ground with a fake car. The car drives up and
// down the time axis on one lane unless ?t= pins it to a decimal year.
// window.__tl.t = 2024.5 (or null to resume the drive) from the console.

type Ctl = { t: number | null; lane: number };

function Lights({ night }: { night: boolean }) {
  useEffect(() => {
    dayNight.night = night ? 1 : 0;
    dayNight.sunElevation = night ? -0.6 : 0.8;
  }, [night]);
  const sh = 26;
  return (
    <>
      <color attach="background" args={[night ? "#151b33" : "#e6e4df"]} />
      <hemisphereLight args={[night ? "#4a4f8a" : "#ffffff", night ? "#141a30" : "#b9b2a5", night ? 0.35 : 1.1]} />
      <directionalLight
        position={[25, 40, 15]}
        intensity={night ? 0.3 : 2.4}
        color={night ? "#8fa6ff" : "#fff4e6"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-sh}
        shadow-camera-right={sh}
        shadow-camera-top={sh}
        shadow-camera-bottom={-sh}
        shadow-camera-far={120}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
    </>
  );
}

const OFFSET = new THREE.Vector3(10.5, 12.5, 14); // same as the world's follow camera
const local = new THREE.Vector3();

function FakeCar({ ctl, rot, follow }: { ctl: React.RefObject<Ctl>; rot: number; follow: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const time = useRef(0);
  const { camera } = useThree();
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    time.current += Math.min(dt, 1 / 30);
    const c = ctl.current;
    const span = (T1 - T0) + 1.2;
    // ping-pong across the plaza, a bit past both ends
    const ph = (time.current * 0.09) % 2;
    const tt = c.t ?? T0 - 0.6 + span * (ph < 1 ? ph : 2 - ph);
    const dir = c.t != null || ph < 1 ? 1 : -1;
    local.set(laneX(c.lane) + 0.0, 0.45, zOf(tt)).applyAxisAngle(THREE.Object3D.DEFAULT_UP, rot);
    carState.pos.copy(local);
    carState.forward.set(0, 0, -dir).applyAxisAngle(THREE.Object3D.DEFAULT_UP, rot);
    g.position.copy(local);
    g.rotation.y = Math.atan2(-carState.forward.z, carState.forward.x);
    if (follow) {
      camera.position.copy(local).add(OFFSET);
      camera.lookAt(local.x, local.y - 0.3, local.z);
    }
  });
  return (
    <group ref={ref}>
      <mesh castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[2.1, 0.4, 0.95]} />
        <meshStandardMaterial color={C.red} roughness={0.4} />
      </mesh>
      {[
        [0.75, 0.5],
        [0.75, -0.5],
        [-0.75, 0.5],
        [-0.75, -0.5],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, -0.15, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.26, 18]} />
          <meshStandardMaterial color={C.black} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export default function TimelineLab({ night, cam, t, lane, rot }: { night: boolean; cam: string; t: number | null; lane: number; rot: number }) {
  const ctl = useRef<Ctl>({ t, lane });
  useEffect(() => {
    ctl.current.t = t;
    ctl.current.lane = lane;
    (window as unknown as { __tl: Ctl }).__tl = ctl.current;
  }, [t, lane]);
  const r = (rot * Math.PI) / 180;
  const cz = (PLAZA.minZ + PLAZA.maxZ) / 2;
  const position: [number, number, number] = cam === "top" ? [0.1, 48, cz + 0.1] : [26, 30, 32];
  return (
    <div className="fixed inset-0">
      <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 34, near: 0.5, far: 600, position }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}>
        <fog attach="fog" args={[night ? "#151b33" : "#e6e4df", 70, 180]} />
        <Lights night={night} />
        {cam !== "follow" && <OrbitControls makeDefault target={[0, 0, cz]} />}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[160, 160]} />
          <meshStandardMaterial color={C.grass} roughness={0.92} />
        </mesh>
        <Timeline position={[0, 0, 0]} rotation={r} colliders={false} />
        <FakeCar ctl={ctl} rot={r} follow={cam === "follow"} />
      </Canvas>
    </div>
  );
}
