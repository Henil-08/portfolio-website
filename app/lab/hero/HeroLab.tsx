"use client";

import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CarPreview, GROUND_Y } from "@/components/world/models/Car";
import { Avatar, Driver, DRIVER_SEAT } from "@/components/world/models/Avatar";

const CHASSIS_Y = -GROUND_Y;

// camera offsets from the target, per angle (car space: forward +X, right +Z)
const ANGLES: Record<string, [number, number, number]> = {
  front: [3.0, 1.3, 2.7], // front 3/4 (front-right)
  side: [0, 0.55, 4.6],
  top: [2.2, 4.4, 2.2],
  back: [-3.6, 1.3, 1.6],
  game: [-3.2, 3.4, 2.1], // high, behind-right, ~45 deg down
  face: [2.4, 0.35, 0.6],
};

const PI_2 = Math.PI / 2;

const BACKDROP = "radial-gradient(120% 90% at 50% 30%, #f6b2ae 0%, #f4a3a0 30%, #f26b6b 100%)";

function Studio({ shadows = true }: { shadows?: boolean }) {
  return (
    <>
      <Environment resolution={256} frames={1}>
        {/* overhead softbox */}
        <Lightformer form="rect" intensity={3} position={[0, 6, 0]} rotation={[PI_2, 0, 0]} scale={[8, 5, 1]} />
        {/* long strips for clean reflections along the body */}
        <Lightformer form="rect" intensity={2.2} position={[0, 2.5, 6]} rotation={[0, 0, 0]} scale={[12, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[0, 2.5, -6]} rotation={[0, Math.PI, 0]} scale={[12, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-7, 2, 0]} rotation={[0, Math.PI / 2, 0]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[7, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 2, 1]} />
        {/* coral bounce from the seamless */}
        <Lightformer form="rect" color="#f4a3a0" intensity={0.9} position={[0, -2, 0]} rotation={[-PI_2, 0, 0]} scale={[30, 30, 1]} />
        <Lightformer form="ring" color="#f26b6b" intensity={0.7} position={[4, 0.5, 5]} scale={3} />
      </Environment>
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[3.5, 7, 4.5]}
        intensity={2.0}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-radius={6}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />
      {shadows && (
        <>
          <mesh rotation={[-PI_2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
            <planeGeometry args={[30, 30]} />
            <shadowMaterial opacity={0.16} color="#7a1c1c" />
          </mesh>
          <ContactShadows position={[0, 0.003, 0]} opacity={0.55} color="#6b1717" scale={7} blur={2.6} far={1.6} resolution={1024} />
        </>
      )}
    </>
  );
}
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
  const portrait = view === "portrait";
  // transparent page for the portrait capture
  useEffect(() => {
    if (!portrait) return;
    const els = [document.documentElement, document.body];
    const prev = els.map((e) => e.style.background);
    els.forEach((e) => (e.style.background = "transparent"));
    return () => els.forEach((e, i) => (e.style.background = prev[i]));
  }, [portrait]);
  const isAvatar = view === "avatar" || portrait;
  const target: [number, number, number] = portrait
    ? [0, 0.78, 0]
    : isAvatar
      ? [0, 0.68, 0]
      : view === "driver"
        ? [0, 0.55, 0]
        : [0, 0.35, 0];
  const base = ANGLES[angle] ?? ANGLES.front;
  // avatar faces +Z, car faces +X: rotate offsets so "front" means the subject's front
  const off = isAvatar ? [-base[2] * 0.62, base[1] * 0.62, base[0] * 0.62] : base;
  const zoom = view === "driver" ? (angle === "face" ? 0.45 : 0.6) : 1;
  const cam: [number, number, number] = portrait
    ? [1.05, 1.02, 2.05]
    : [target[0] + off[0] * zoom, target[1] + off[1] * zoom, target[2] + off[2] * zoom];

  return (
    <div style={{ position: "fixed", inset: 0, background: portrait ? "transparent" : BACKDROP }}>
      <Canvas
        shadows={portrait ? false : "soft"}
        dpr={[1, 2]}
        camera={{ position: cam, fov: portrait ? 30 : 35 }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.0 }}
        onCreated={({ camera, gl }) => {
          gl.setClearColor(0x000000, 0);
          camera.lookAt(...target);
        }}
      >
        <Studio shadows={!portrait} />

        {isAvatar && <Avatar wave={wave} />}
        {view === "car" && <CarPreview position={[0, CHASSIS_Y, 0]} brakeLight={brake} steer={steer} />}
        {view === "driver" && (
          <CarPreview position={[0, CHASSIS_Y, 0]} brakeLight={brake} steer={steer}>
            <Driver position={DRIVER_SEAT} steer={steer} wave={wave} />
          </CarPreview>
        )}
        {view === "both" && (
          <>
            <CarPreview position={[0, CHASSIS_Y, 0]} brakeLight={brake} steer={steer}>
              <Driver position={DRIVER_SEAT} steer={steer} wave={wave} />
            </CarPreview>
            <Avatar position={[0.6, 0, 1.3]} rotation={[0, 0.5, 0]} wave={wave} />
          </>
        )}
        <OrbitControls target={target} makeDefault />
      </Canvas>
    </div>
  );
}
