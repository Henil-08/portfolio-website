"use client";

import { Canvas } from "@react-three/fiber";
import { Car, type RaceEvent } from "./Car";
import { Scenery } from "./Scenery";
import { Track } from "./Track";

const SKY = "#1c2331";

type Props = {
  enabled: boolean;
  reducedMotion: boolean;
  onEvent: (e: RaceEvent) => void;
};

/** The 3D world. Everything static is built once; only the car updates per frame. */
export function Scene({ enabled, reducedMotion, onEvent }: Props) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 58, near: 0.5, far: 900, position: [0, 6, -150] }}
    >
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 90, 560]} />
      <hemisphereLight args={["#c7d3e6", "#2c3a26", 1.25]} />
      <directionalLight position={[140, 200, 80]} intensity={2.1} color="#ffe6c7" />
      <directionalLight position={[-120, 80, -160]} intensity={0.35} color="#8fb3ff" />
      <Track />
      <Scenery />
      <Car enabled={enabled} reducedMotion={reducedMotion} onEvent={onEvent} />
    </Canvas>
  );
}
