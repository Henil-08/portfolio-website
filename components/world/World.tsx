"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { EffectComposer, N8AO, SMAA, Vignette } from "@react-three/postprocessing";
import { PerformanceMonitor } from "@react-three/drei";
import Island from "./Island";
import Vehicle from "./Vehicle";
import Places from "./Places";
import { CameraRig, Sky, Sun, ZoneWatcher } from "./Rig";
import { bindKeyboard } from "./input";

export default function World() {
  // Phones get the light version from the start. This component only renders on the client.
  const [fancy, setFancy] = useState(() => !window.matchMedia("(pointer: coarse)").matches);

  useEffect(() => bindKeyboard(), []);

  return (
    <Canvas
      shadows
      dpr={[1, fancy ? 1.75 : 1.25]}
      camera={{ fov: 38, near: 0.5, far: 1200, position: [90, 60, 40] }}
      gl={{ antialias: !fancy, powerPreference: "high-performance" }}
      className="!fixed inset-0"
    >
      <PerformanceMonitor onDecline={() => setFancy(false)} />
      <fog attach="fog" args={["#d9f1fb", 120, 320]} />
      <Sky />
      <Sun />
      <Suspense fallback={null}>
        <Physics gravity={[0, -22, 0]} timeStep={1 / 60}>
          <Island />
          <Places />
          <Vehicle />
        </Physics>
      </Suspense>
      <CameraRig />
      <ZoneWatcher />
      {fancy && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO halfRes aoRadius={2.2} intensity={2.2} distanceFalloff={0.8} color="#3b2a40" />
          <SMAA />
          <Vignette offset={0.32} darkness={0.35} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
