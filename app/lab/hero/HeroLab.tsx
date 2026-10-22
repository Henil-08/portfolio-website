"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { C } from "@/components/world/palette";
import { CarPreview } from "@/components/world/models/Car";
import { Avatar, Driver } from "@/components/world/models/Avatar";

const CHASSIS_Y = 0.46;

// camera offsets from the target, per angle
const ANGLES: Record<string, [number, number, number]> = {
  front: [2.6, 1.3, 2.4], // front 3/4 (front-right)
  side: [0, 0.6, 3.6],
  top: [2.0, 3.4, 2.0],
  back: [-3.0, 1.2, 1.4],
  game: [-2.6, 3.0, 1.6], // high, behind-right, ~45 deg down
  face: [2.2, 0.3, 0.5], // straight at the driver / avatar face
};

export default function HeroLab({
  view,
  angle,
  wave,
  steer,
  brake,
}: {
  view: string;
  angle: string;
  wave: boolean;
  steer: number;
  brake: boolean;
}) {
  const isAvatar = view === "avatar";
  const target: [number, number, number] = isAvatar ? [0, 0.7, 0] : view === "driver" ? [0, 0.6, 0] : [0, 0.4, 0];
  const base = ANGLES[angle] ?? ANGLES.front;
  // avatar faces +Z, car faces +X: rotate offsets so "front" means the subject's front
  const off = isAvatar ? [-base[2] * 0.62, base[1] * 0.62, base[0] * 0.62] : base;
  const zoom = view === "driver" && angle === "face" ? 0.6 : 1;
  const cam: [number, number, number] = [target[0] + off[0] * zoom, target[1] + off[1] * zoom, target[2] + off[2] * zoom];

  return (
    <div style={{ position: "fixed", inset: 0, background: C.cream }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: cam, fov: 40 }}
        gl={{ toneMapping: THREE.NeutralToneMapping }}
        onCreated={({ camera }) => camera.lookAt(...target)}
      >
        <color attach="background" args={[C.cream]} />
        <hemisphereLight args={[C.white, C.sand, 1.4]} />
        <directionalLight
          position={[3, 6, 4]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color={C.wall} roughness={0.9} />
        </mesh>
        <ContactShadows position={[0, 0.002, 0]} opacity={0.35} scale={8} blur={2.4} far={2} />

        {isAvatar && <Avatar wave={wave} />}
        {view === "car" && <CarPreview position={[0, CHASSIS_Y, 0]} brakeLight={brake} steer={steer} />}
        {view === "driver" && (
          <CarPreview position={[0, CHASSIS_Y, 0]} brakeLight={brake} steer={steer}>
            <Driver position={[-0.15, 0.05, 0]} steer={steer} wave={wave} />
          </CarPreview>
        )}
        {view === "both" && (
          <>
            <CarPreview position={[0, CHASSIS_Y, 0]} brakeLight={brake} steer={steer}>
              <Driver position={[-0.15, 0.05, 0]} steer={steer} wave={wave} />
            </CarPreview>
            <Avatar position={[0.4, 0, 1.4]} wave={wave} />
          </>
        )}
        <OrbitControls target={target} makeDefault />
      </Canvas>
    </div>
  );
}
