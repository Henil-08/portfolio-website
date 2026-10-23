"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics, useRapier } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { ticker } from "./carState";
import { EffectComposer, N8AO, SMAA, Vignette } from "@react-three/postprocessing";
import { Environment, Lightformer, PerformanceMonitor, SoftShadows } from "@react-three/drei";
import * as THREE from "three";
import Island from "./Island";
import Vehicle from "./Vehicle";
import Places from "./Places";
import { CameraRig, Sky, Sun, ZoneWatcher } from "./Rig";
import { InteractionPoint } from "./Race";
import { DayNight, Exposure, Spawns, Weather } from "./Effects";
import Autopilot from "./autopilot/Autopilot";
import Grass from "./Grass";
import Alive from "./alive";
import Street from "./street";
import { bindKeyboard } from "./input";
import { useWorld } from "./store";

export default function World() {
  // Phones get the light version from the start. This component only renders on the client.
  const [fancy, setFancy] = useState(() => !window.matchMedia("(pointer: coarse)").matches);

  useEffect(() => bindKeyboard(), []);
  const hallucinating = useWorld((s) => s.hallucinating);

  return (
    <Canvas
      shadows
      dpr={[1, fancy ? 1.75 : 1.25]}
      camera={{ fov: 34, near: 0.5, far: 1200, position: [90, 60, 40] }}
      gl={{ antialias: !fancy, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.82 }}
      className={`!fixed inset-0 ${hallucinating ? "hallucinate" : ""}`}
    >
      <PerformanceMonitor onDecline={() => setFancy(false)} />
      <fog attach="fog" args={["#e6e4df", 110, 300]} />
      {fancy && <SoftShadows size={22} samples={10} focus={0.6} />}
      {/* Studio environment for reflections on the car paint and glass. No network HDRs. */}
      <Environment resolution={256} frames={1} environmentIntensity={0.55}>
        <Lightformer intensity={2.2} position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} color="#ffffff" />
        <Lightformer intensity={1.4} position={[-18, 4, 8]} rotation-y={Math.PI / 2} scale={[20, 6, 1]} color="#fff3e6" />
        <Lightformer intensity={1.1} position={[18, 4, -8]} rotation-y={-Math.PI / 2} scale={[20, 6, 1]} color="#e8f0ff" />
        <Lightformer intensity={0.8} position={[0, 3, -20]} scale={[30, 4, 1]} color="#ffd9d2" />
      </Environment>
      <Sky />
      <Sun />
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]} timeStep="vary" paused interpolate={false}>
          <Stepper />
          <Island />
          <Places />
          <Street />
          <Vehicle />
          <Spawns />
        </Physics>
      </Suspense>
      <CameraRig />
      <ZoneWatcher />
      <InteractionPoint />
      <Weather />
      <DayNight />
      <Grass />
      <Alive />
      <Autopilot />
      <Exposure />
      {fancy && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO halfRes aoRadius={1.6} intensity={1.6} distanceFalloff={0.7} color="#2a2420" />
          <SMAA />
          <Vignette offset={0.3} darkness={0.28} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

// One variable physics step per frame, before anything else reads the world,
// exactly like Bruno's ticker: delta capped at 1/30 s and time scaled by 2.
function Stepper() {
  const { step } = useRapier();
  useFrame((_, dt) => {
    ticker.delta = Math.min(dt, 1 / 30);
    ticker.deltaScaled = ticker.delta * ticker.scale;
    step(ticker.deltaScaled);
  }, -50);
  return null;
}
