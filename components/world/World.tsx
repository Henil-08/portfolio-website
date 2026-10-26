"use client";

import { IntroLabel, RevealDriver, RevealPass } from "./Reveal";
import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics, useRapier } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { ticker } from "./carState";
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from "@react-three/postprocessing";
import { Environment, Lightformer, PerformanceMonitor, SoftShadows } from "@react-three/drei";
import * as THREE from "three";
import Island from "./Island";
import Vehicle from "./Vehicle";
import Places from "./Places";
import { CameraRig, Sky, Sun, ZoneWatcher } from "./Rig";
import InteractivePoints from "./ui3d/InteractivePoints";
import { DayNight, EnvLight, RainCycle, Spawns, Weather } from "./Effects";
import Autopilot from "./autopilot/Autopilot";
import Grass from "./Grass";
import StartGarden from "./StartGarden";
import Alive from "./alive";
import Street from "./street";
import { bindKeyboard } from "./input";
import { useWorld } from "./store";
import Overlay from "./Overlay";

export default function World() {
  // Phones get the light version from the start. This component only renders on the client.
  const [fancy, setFancy] = useState(() => !window.matchMedia("(pointer: coarse)").matches);

  useEffect(() => bindKeyboard(), []);
  const hallucinating = useWorld((s) => s.hallucinating);
  const revealed = useWorld((s) => s.revealed);

  return (
    <Canvas
      shadows
      dpr={[1, fancy ? 1.75 : 1.25]}
      camera={{ fov: 34, near: 0.5, far: 1200, position: [90, 60, 40] }}
      gl={{ antialias: !fancy, powerPreference: "high-performance", toneMapping: THREE.NoToneMapping }}
      className={`!fixed inset-0 ${hallucinating ? "hallucinate" : ""}`}
    >
      {/* never swap renderers mid-reveal: that remount is a visible hitch */}
      <PerformanceMonitor onDecline={() => revealed && setFancy(false)} />
      <fog attach="fog" args={["#e9e7e1", 160, 440]} />
      {fancy && <SoftShadows size={22} samples={10} focus={0.6} />}
      {/* Studio environment for reflections on the car paint and glass. No network HDRs. */}
      <Environment resolution={256} frames={1} environmentIntensity={0.2}>
        <Lightformer intensity={2.2} position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} color="#ffffff" />
        <Lightformer intensity={1.4} position={[-18, 4, 8]} rotation-y={Math.PI / 2} scale={[20, 6, 1]} color="#ffffff" />
        <Lightformer intensity={1.1} position={[18, 4, -8]} rotation-y={-Math.PI / 2} scale={[20, 6, 1]} color="#eef1f3" />
        <Lightformer intensity={0.8} position={[0, 3, -20]} scale={[30, 4, 1]} color="#f3f2ed" />
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
          <StartGarden />
          <Spawns />
        </Physics>
      </Suspense>
      <CameraRig />
      <RevealDriver />
      <IntroLabel />
      <ZoneWatcher />
      <InteractivePoints />
      <Weather />
      <DayNight />
      <RainCycle />
      <Grass />
      <Alive />
      <Autopilot />
      <EnvLight />
      <Overlay />
      {/* The light version still gets the opening reveal, then drops the composer. */}
      {!fancy && !revealed && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <RevealPass />
          <Bloom luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.55} mipmapBlur />
        </EffectComposer>
      )}
      {fancy && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO halfRes aoRadius={1.6} intensity={1.6} distanceFalloff={0.7} color="#151515" />
          {/* Only emissives pushed past 1.0 bloom (lamps, windows, garage headers, neon). */}
          <RevealPass />
          <Bloom luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.55} mipmapBlur />
          <SMAA />
          <Vignette offset={0.3} darkness={0.28} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

// One variable physics step per frame, before anything else reads the world,
// exactly like the original ticker: delta capped at 1/30 s and time scaled by 2.
function Stepper() {
  const { step } = useRapier();
  useFrame((_, dt) => {
    // Dev and headless checks: window.__realtime = true runs as many 60 fps steps as real
    // time has passed, so a slow headless browser simulates the car like a real one.
    const realtime = process.env.NODE_ENV !== "production" && (window as unknown as { __realtime?: boolean }).__realtime;
    if (realtime) {
      const n = Math.min(60, Math.max(1, Math.round(dt * 60)));
      ticker.delta = 1 / 60;
      ticker.deltaScaled = ticker.delta * ticker.scale;
      for (let i = 0; i < n; i++) step(ticker.deltaScaled);
      ticker.deltaScaled *= n; // per-frame readers (speed) see the whole frame
      return;
    }
    ticker.delta = Math.min(dt, 1 / 30);
    ticker.deltaScaled = ticker.delta * ticker.scale;
    step(ticker.deltaScaled);
  }, -50);
  return null;
}
