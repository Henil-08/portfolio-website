"use client";

import { Opening } from "./bloom/Opening";
import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics, useRapier } from "@react-three/rapier";
import { addEffect, useFrame, useThree } from "@react-three/fiber";
import { ticker } from "./carState";
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from "@react-three/postprocessing";
import { Environment, Lightformer, SoftShadows } from "@react-three/drei";
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
import { getState, useWorld } from "./store";
import Overlay from "./Overlay";
import { PERF, PerfProbe } from "./perf";
import "./aoTransparency";
import { indoor } from "./indoor";
import { cullFrame, pauseCulling } from "./instanceCull";
import { COARSE, TIERS, governor, useQuality } from "./quality";

export default function World() {
  // Phones get the light version from the start (quality.ts: Low, no post, MSAA on the canvas).
  // Both are fixed for the canvas's life: the context's antialias can't change, and the soft
  // shadows patch every shader, so turning them off later would recompile the whole world.
  const [msaa] = useState(() => COARSE);
  const tier = useQuality((s) => s.tier);
  const T = TIERS[tier];

  useEffect(() => bindKeyboard(), []);
  const hallucinating = useWorld((s) => s.hallucinating);

  return (
    <Canvas
      // PCF: three dropped PCFSoftShadowMap (it warned and used PCF anyway), so ask for PCF outright
      shadows="percentage"
      dpr={[1, msaa ? Math.min(T.dpr, TIERS.low.dpr) : T.dpr]}
      camera={{ fov: 34, near: 0.5, far: 1200, position: [90, 60, 40] }}
      gl={{ antialias: msaa, powerPreference: "high-performance", toneMapping: THREE.NoToneMapping }}
      className={`!fixed inset-0 ${hallucinating ? "hallucinate" : ""}`}
    >
      <QualityGovernor />
      <fog attach="fog" args={["#e9e7e1", 160, 440]} />
      {!msaa && <SoftShadows size={22} samples={10} focus={0.6} />}
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
      {/* the start sequence: after the rig, so its camera wins until the chase camera takes over */}
      <Opening />
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
      {PERF && <PerfProbe />}
      {/* last: after the camera and the sun have moved this frame */}
      <InstanceCuller />
      {/* the post chain: all of it on High and Balanced; Low drops the ambient occlusion and keeps
          the anti-aliasing, glow and vignette, except on a canvas with its own MSAA (phones), where
          Low is the light version with no post at all, as before */}
      {(T.ao || !msaa) && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <>{T.ao && <N8AO halfRes aoRadius={1.6} intensity={1.6} distanceFalloff={0.7} color="#151515" />}</>
          {/* Only emissives pushed past 1.0 bloom (lamps, windows, garage headers, neon). */}
          <Bloom luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.55} mipmapBlur />
          <SMAA />
          <Vignette offset={0.3} darkness={0.28} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

// Auto quality (quality.ts): every frame's real duration while driving, never during the opening,
// the garage or a hidden tab. A software renderer goes straight to Low.
function QualityGovernor() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    governor.software(rendererName(gl.getContext()));
  }, [gl]);
  useFrame(() => {
    const now = performance.now();
    const last = lastFrame;
    lastFrame = now;
    const s = getState();
    if (!last || document.hidden || s.phase !== "world" || !s.revealed || s.garageOpen) return;
    governor.push(now - last, now);
  });
  return null;
}
let lastFrame = 0;
const vsync = { t: 0, dt: 0 };

function rendererName(c: WebGLRenderingContext | WebGL2RenderingContext) {
  try {
    const ext = c.getExtension("WEBGL_debug_renderer_info");
    return String(c.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : c.RENDERER));
  } catch {
    return "";
  }
}

// Island-wide instanced meshes drawn copy by copy only where a frustum can see them (instanceCull.ts).
function InstanceCuller() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const sun = useRef<THREE.DirectionalLight | null>(null);
  useFrame(() => {
    if (process.env.NODE_ENV !== "production" && (window as unknown as { __cullOff?: boolean }).__cullOff) return pauseCulling();
    if (!sun.current?.parent) sun.current = findSun(scene);
    cullFrame(camera, sun.current);
  });
  return null;
}
const findSun = (scene: THREE.Scene) => {
  let l: THREE.DirectionalLight | null = null;
  scene.traverse((o) => {
    if (!l && (o as THREE.DirectionalLight).isDirectionalLight && o.castShadow) l = o as THREE.DirectionalLight;
  });
  return l;
};

// One variable physics step per frame, before anything else reads the world,
// exactly like the original ticker: delta capped at 1/30 s and time scaled by 2.
function Stepper() {
  const { step } = useRapier();
  // The step follows the display's frame times (requestAnimationFrame's timestamp, vsync-aligned)
  // rather than when this callback happened to run: the same frames, without the main thread's
  // jitter of a millisecond or so, which showed as the car shivering against the camera.
  useEffect(
    () =>
      addEffect((t) => {
        vsync.dt = vsync.t ? (t - vsync.t) / 1000 : 0;
        vsync.t = t;
      }),
    [],
  );
  useFrame((_, clockDt) => {
    const dt = vsync.dt > 0 && vsync.dt < 0.25 ? vsync.dt : clockDt;
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
    // parked in a garage's drawing view nothing outside the bay is drawn, and nothing in it is
    // physical (the stand-in has no body): the world holds still until the back-out (indoor.ts)
    if (indoor.on) return;
    step(ticker.deltaScaled);
  }, -50);
  return null;
}
