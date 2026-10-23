"use client";

import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { C } from "@/components/world/palette";
import { ProjectObject, ShowPlinth } from "@/components/world/models/projects";
import { projects, type Domain } from "@/content/projects";

const ACCENT: Record<Domain, string> = {
  hardware: C.teal,
  agents: C.red,
  genai: C.yellow,
  vision: C.blue,
  ml: C.green,
};

const COLS = 6;
const SX = 1.9;
const SZ = 2.5;

function Rig({ cam, single, rows }: { cam: string; single: boolean; rows: number }) {
  const camera = useThree((s) => s.camera);
  const ty = single ? 1.36 : 1.1;
  const tz = single ? 0 : -((rows - 1) * SZ) / 2;
  useLayoutEffect(() => {
    if (single) {
      if (cam === "high") camera.position.set(0.6, 3.3, 2.1);
      else if (cam === "side") camera.position.set(2.6, 1.9, 1.4);
      else camera.position.set(0.6, 1.8, 2.45);
    } else {
      if (cam === "high") camera.position.set(0, 4 + rows * 1.8, tz + 2 + rows * 1.9);
      else camera.position.set(0, 2.5 + rows * 1.3, tz + 4 + rows * 3.4);
    }
    camera.lookAt(0, ty, tz);
  }, [camera, cam, single, ty, tz, rows]);
  return <OrbitControls makeDefault target={[0, ty, tz]} />;
}

// Studio light rig: soft key, rim and fill panels baked into an env map (no network).
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.4} color="#fff6ea" position={[0, 6, 2]} rotation={[-Math.PI / 2.2, 0, 0]} scale={[10, 6, 1]} />
      <Lightformer form="rect" intensity={1.4} color="#ffffff" position={[-6, 2, 3]} rotation={[0, Math.PI / 2.5, 0]} scale={[4, 6, 1]} />
      <Lightformer form="rect" intensity={1.1} color="#eef2ff" position={[6, 2.5, -2]} rotation={[0, -Math.PI / 2.5, 0]} scale={[4, 6, 1]} />
      <Lightformer form="ring" intensity={0.8} color="#ffffff" position={[0, 3, -6]} scale={3} />
      <Lightformer form="rect" intensity={0.35} color="#d8d2c8" position={[0, -2, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[20, 20, 1]} />
    </Environment>
  );
}

export default function ProjectsLab({ view, cam, active }: { view: string; cam: string; active: boolean }) {
  const single = projects.find((p) => p.slug === view);
  const list = single ? [single] : projects;
  const rows = Math.ceil(list.length / COLS);
  const backdrop = "#dcd8d1";
  const sh = single ? 3 : 10;
  return (
    <div style={{ position: "fixed", inset: 0, background: backdrop }}>
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        camera={{ fov: 40, near: 0.1, far: 200 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      >
        <color attach="background" args={[backdrop]} />
        <fog attach="fog" args={[backdrop, 18, 60]} />
        <Studio />
        <hemisphereLight args={["#fff6ec", "#b8b2a8", 0.5]} />
        <directionalLight
          position={[sh * 0.8, sh * 2, sh * 1.1]}
          intensity={1.8}
          color="#fff0d8"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-camera-left={-sh * 1.5}
          shadow-camera-right={sh * 1.5}
          shadow-camera-top={sh * 1.5}
          shadow-camera-bottom={-sh * 1.5}
          shadow-camera-far={sh * 8}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[60, 64]} />
          <meshStandardMaterial color="#d6d2cb" roughness={0.92} />
        </mesh>
        {single && <ContactShadows position={[0, 0.003, 0]} opacity={0.35} scale={6} blur={2.5} far={3} />}
        {list.map((p, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const inRow = Math.min(COLS, list.length - row * COLS);
          const x = single ? 0 : (col - (inRow - 1) / 2) * SX;
          const z = single ? 0 : -row * SZ;
          return (
            <ShowPlinth key={p.slug} label={p.name} accent={ACCENT[p.domain]} position={[x, 0, z]}>
              <ProjectObject slug={p.slug} active={active} />
            </ShowPlinth>
          );
        })}
        <Rig cam={cam} single={!!single} rows={rows} />
      </Canvas>
      <div style={{ position: "fixed", left: 12, top: 10, font: "600 13px system-ui", color: C.ink, opacity: 0.6 }}>
        projects lab · {view} · {cam}
        {active ? " · active" : ""}
      </div>
    </div>
  );
}
