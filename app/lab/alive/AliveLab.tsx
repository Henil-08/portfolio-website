"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import Alive, { burstConfetti, overrideWindWeather } from "@/components/world/alive";
import Grass from "@/components/world/Grass";
import { Bush, Flag, Tree } from "@/components/world/models/props";
import { carState } from "@/components/world/carState";
import { dayNight } from "@/components/world/daynight";
import { heightAt } from "@/components/world/terrain";
import { C } from "@/components/world/palette";
import { tracksTarget } from "@/components/world/alive/Tracks";

// Living-world preview: grass, trees and a flag in the wind, a fake car driving
// circles (dust, skids, grass pushed aside, leaves flung), wind lines, birds,
// and a confetti burst every few seconds. /lab/alive?night=1&wind=0..1&cam=near|far

const CX = 0;
const CZ = 6;
const R = 7;

function Ground() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(90, 90, 90, 90);
    g.rotateX(-Math.PI / 2);
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + CX;
      const z = p.getZ(i) + CZ;
      p.setXYZ(i, x, heightAt(x, z), z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={C.grass} roughness={0.92} />
    </mesh>
  );
}

const up = new THREE.Vector3(0, 1, 0);

function FakeCar() {
  const ref = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const time = useRef(0);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const d = Math.min(dt, 1 / 30);
    time.current += d;
    const speed = 9;
    angle.current += (speed / R) * d;
    const a = angle.current;
    const x = CX + Math.cos(a) * R;
    const z = CZ + Math.sin(a) * R;
    const y = heightAt(x, z) + 0.45;
    // tangent of the circle, and a drift angle that comes and goes (skids)
    const tx = -Math.sin(a);
    const tz = Math.cos(a);
    const drift = Math.sin(time.current * 0.7) > 0.2 ? 0.55 : 0.08;
    carState.vel.set(tx * speed, 0, tz * speed);
    carState.forward.set(tx, 0, tz).applyAxisAngle(up, -drift).normalize();
    carState.pos.set(x, y, z);
    carState.speed = speed;
    carState.grounded = true;
    g.position.set(x, y, z);
    g.rotation.y = Math.atan2(-carState.forward.z, carState.forward.x);
  }, -60);
  return (
    <group ref={ref}>
      <mesh castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[2.2, 0.35, 0.8]} />
        <meshStandardMaterial color={C.red} roughness={0.4} />
      </mesh>
      {[
        [0.86, 0.5],
        [0.86, -0.5],
        [-0.94, 0.5],
        [-0.94, -0.5],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, -0.15, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.28, 18]} />
          <meshStandardMaterial color={C.black} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** ?debug=1: the wheel-track render target on a plane above the scene. */
function TracksDebug() {
  const tex = useMemo(() => tracksTarget().texture, []);
  return (
    <mesh position={[CX - 14, heightAt(CX, CZ) + 6, CZ - 14]} rotation={[-0.6, 0.6, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  );
}

function AutoConfetti() {
  const t = useRef(1.5);
  useFrame((_, dt) => {
    t.current -= dt;
    if (t.current <= 0) {
      t.current = 4;
      burstConfetti(CX, heightAt(CX, CZ) + 0.3, CZ);
    }
  });
  return null;
}

function Lights({ night }: { night: boolean }) {
  useEffect(() => {
    dayNight.night = night ? 1 : 0;
    dayNight.sunElevation = night ? -0.6 : 0.8;
  }, [night]);
  const sh = 30;
  return (
    <>
      <color attach="background" args={[night ? "#151b33" : "#e6e4df"]} />
      <hemisphereLight args={[night ? "#3a4670" : "#ffffff", night ? "#141a30" : "#b9b2a5", night ? 0.25 : 1.1]} />
      <directionalLight
        position={[CX + 25, 40, CZ + 15]}
        intensity={night ? 0.25 : 2.4}
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
        target-position={[CX, 0, CZ]}
      />
    </>
  );
}

function Props() {
  const at = (x: number, z: number): [number, number, number] => [CX + x, heightAt(CX + x, CZ + z), CZ + z];
  return (
    <>
      <Tree variant="round" seed={3} position={at(-9, -7)} />
      <Tree variant="pine" seed={5} position={at(-12, -2)} />
      <Tree variant="round" seed={8} position={at(10, -9)} scale={1.2} />
      <Tree variant="palm" position={at(-3, -12)} />
      <Bush seed={2} position={at(-6, 9)} />
      <Bush seed={4} position={at(8, 8)} />
      <Flag position={at(3, -4)} color={C.red} />
    </>
  );
}

const PERCHES = [
  [-7, -9, 1.2],
  [12, -6, 1.4],
  [-14, 4, 1.4],
  [9, 12, 1.2],
].map(([x, z, spread]) => ({ x: CX + x, y: heightAt(CX + x, CZ + z), z: CZ + z, spread }));

export default function AliveLab({ night, wind, cam, debug = false }: { night: boolean; wind: number; cam: string; debug?: boolean }) {
  useEffect(() => {
    overrideWindWeather(wind);
    return () => overrideWindWeather(null);
  }, [wind]);
  const ty = useMemo(() => heightAt(CX, CZ), []);
  const position: [number, number, number] = cam === "far" ? [CX + 30, ty + 26, CZ + 34] : [CX + 13, ty + 10, CZ + 15];
  return (
    <div className="fixed inset-0">
      <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 34, near: 0.5, far: 600, position }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}>
        <fog attach="fog" args={[night ? "#151b33" : "#e6e4df", 60, 160]} />
        <Lights night={night} />
        <OrbitControls makeDefault target={[CX, ty, CZ]} />
        <Ground />
        <Props />
        <FakeCar />
        <Grass mask={false} />
        <Alive birdPerches={PERCHES} />
        <AutoConfetti />
        {debug && <TracksDebug />}
      </Canvas>
    </div>
  );
}
