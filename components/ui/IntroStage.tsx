"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { CarPreview } from "@/components/world/models/Car";
import { Avatar } from "@/components/world/models/Avatar";

// The pre-race driver introduction: a dark studio, a spotlight on the car,
// then the camera sweeps round to Henil. `t0` is when the sequence started
// (performance.now() in ms), or null while waiting on the start button.
export default function IntroStage({ t0 }: { t0: number | null }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 30, position: [7, 1.2, 6], near: 0.1, far: 100 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
      className="!absolute inset-0"
    >
      <color attach="background" args={["#08080b"]} />
      <fog attach="fog" args={["#08080b", 10, 26]} />
      <Environment resolution={128} frames={1} environmentIntensity={0.5}>
        <Lightformer intensity={2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} />
        <Lightformer intensity={1.2} position={[-6, 2, 3]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} color="#ffe9e4" />
        <Lightformer intensity={1.6} position={[6, 1.5, -2]} rotation-y={-Math.PI / 2} scale={[8, 1, 1]} color="#ff3b30" />
      </Environment>
      <Director t0={t0} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[30, 64]} />
        <meshStandardMaterial color="#121216" roughness={0.35} metalness={0.2} />
      </mesh>
      <group position={[0, 0.3, 0]} rotation={[0, -0.35, 0]}>
        <CarPreview />
      </group>
      <group position={[-1.3, 0, 1.7]} rotation={[0, 0.55, 0]}>
        <Avatar wave />
      </group>
      <ContactShadows position={[0, 0.005, 0]} opacity={0.7} scale={10} blur={2.4} far={2} />
    </Canvas>
  );
}

const camA = new THREE.Vector3();
const camB = new THREE.Vector3();
const lookA = new THREE.Vector3();
const lookB = new THREE.Vector3();
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// Camera choreography and the spotlight "snap on".
function Director({ t0 }: { t0: number | null }) {
  const spot = useRef<THREE.SpotLight>(null);
  const rim = useRef<THREE.SpotLight>(null);
  useFrame(({ camera, clock }) => {
    const t = t0 === null ? -1 : (performance.now() - t0) / 1000;
    const idle = clock.elapsedTime;

    // Spotlight is off until the sequence starts, then snaps on with a flicker.
    const on = t < 0 ? 0 : t < 0.15 ? 0.4 : t < 0.25 ? 0.1 : 1;
    if (spot.current) spot.current.intensity = 60 * on;
    if (rim.current) rim.current.intensity = 25 * (t < 0 ? 0 : Math.min(1, t / 1.2));

    // Shots: low nose dolly, sweep to the driver, pull back wide.
    let a: number;
    if (t < 0) {
      camA.set(7, 1.1, 6);
      lookA.set(0, 0.4, 0);
      camera.position.copy(camA).applyAxisAngle(THREE.Object3D.DEFAULT_UP, Math.sin(idle * 0.2) * 0.05);
      camera.lookAt(lookA);
      return;
    } else if (t < 3) {
      a = ease(Math.min(1, t / 3));
      camA.set(4.2, 0.45, 2.2);
      camB.set(2.6, 0.7, 3.6);
      lookA.set(1.4, 0.35, 0);
      lookB.set(0, 0.45, 0);
    } else if (t < 6.5) {
      a = ease(Math.min(1, (t - 3) / 3.5));
      camA.set(2.6, 0.7, 3.6);
      camB.set(-0.2, 1.05, 4.6);
      lookA.set(0, 0.45, 0);
      lookB.set(-1.2, 0.85, 1.6);
    } else {
      a = ease(Math.min(1, (t - 6.5) / 4));
      camA.set(-0.2, 1.05, 4.6);
      camB.set(3.5, 3.2, 8.5);
      lookA.set(-1.2, 0.85, 1.6);
      lookB.set(-0.2, 0.4, 0.4);
    }
    camera.position.lerpVectors(camA, camB, a);
    camera.lookAt(lookA.lerp(lookB, a));
  });

  return (
    <>
      <ambientLight intensity={0.08} />
      <spotLight
        ref={spot}
        position={[0, 7, 1]}
        angle={0.5}
        penumbra={0.6}
        intensity={0}
        castShadow
        shadow-mapSize={[1024, 1024]}
        color="#fff6ee"
      />
      <spotLight ref={rim} position={[-5, 3, -4]} angle={0.6} penumbra={1} intensity={0} color="#ff3b30" />
    </>
  );
}
