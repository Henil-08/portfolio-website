"use client";

import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { C } from "@/components/world/palette";
import { AhmedabadSector, BostonSector, HyperlabSector, WatersSector } from "@/components/world/models/sectors";

const SETS = [
  { id: "ahmedabad", El: AhmedabadSector },
  { id: "hyperlab", El: HyperlabSector },
  { id: "boston", El: BostonSector },
  { id: "waters", El: WatersSector },
] as const;

const GAP = 30; // spacing between sets in the "all" view

function Rig({ cam, wide }: { cam: string; wide: boolean }) {
  const camera = useThree((s) => s.camera);
  // high: ~45 deg down, ~25 m away (the game's chase-high view); front: low, near eye level
  const target: [number, number, number] = [0, 1.5, -3.5];
  useLayoutEffect(() => {
    const d = wide ? 78 : cam === "front" ? 27 : 25;
    const pitch = cam === "front" ? 0.22 : cam === "top" ? 1.45 : Math.PI / 4;
    const yaw = cam === "side" ? 0.8 : wide ? 0 : 0.22;
    camera.position.set(target[0] + Math.sin(yaw) * Math.cos(pitch) * d, target[1] + Math.sin(pitch) * d, target[2] + Math.cos(yaw) * Math.cos(pitch) * d);
    camera.lookAt(...target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, cam, wide]);
  return <OrbitControls makeDefault target={target} />;
}

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

export default function SectorsLab({ view, cam, track }: { view: string; cam: string; track: boolean }) {
  const one = SETS.find((s) => s.id === view);
  const list = one ? [one] : SETS;
  const wide = !one;
  const span = wide ? GAP * list.length : 30;
  const sh = wide ? 70 : 20;
  const backdrop = "#dcd8d1";
  return (
    <div style={{ position: "fixed", inset: 0, background: backdrop }}>
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        camera={{ fov: 46, near: 0.1, far: 900 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      >
        <color attach="background" args={[backdrop]} />
        <fog attach="fog" args={[backdrop, span * 2.5, span * 6]} />
        <Studio />
        <hemisphereLight args={["#fff6ec", "#b8b2a8", 0.5]} />
        <directionalLight
          position={[sh * 0.6, sh * 1.4, sh * 0.8]}
          intensity={1.8}
          color="#fff0d8"
          castShadow
          shadow-mapSize={[4096, 4096]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.03}
          shadow-camera-left={-sh}
          shadow-camera-right={sh}
          shadow-camera-top={sh}
          shadow-camera-bottom={-sh}
          shadow-camera-far={sh * 5}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <circleGeometry args={[span * 3 + 40, 64]} />
          <meshStandardMaterial color={C.grass} roughness={0.92} />
        </mesh>
        {list.map(({ id, El }, i) => {
          const x = (i - (list.length - 1) / 2) * GAP;
          return (
            <group key={id} position={[x, 0, 0]}>
              {/* footprint outline (26 x 18) and the 9 m track band along +Z */}
              {track && (
                <>
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 4.5]} receiveShadow>
                    <planeGeometry args={[26, 7.4]} />
                    <meshStandardMaterial color={C.asphalt} roughness={0.85} />
                  </mesh>
                  {[0.8, 8.2].map((z) => (
                    <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, z]}>
                      <planeGeometry args={[26, 0.25]} />
                      <meshStandardMaterial color={C.asphaltLine} roughness={0.7} />
                    </mesh>
                  ))}
                </>
              )}
              <El />
            </group>
          );
        })}
        <Rig cam={cam} wide={wide} />
      </Canvas>
      <div style={{ position: "fixed", left: 12, top: 10, font: "600 13px system-ui", color: C.ink, opacity: 0.6 }}>
        sectors lab · {view} · {cam}
      </div>
    </div>
  );
}
