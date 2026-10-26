"use client";

import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useLayoutEffect, type ReactNode } from "react";
import * as THREE from "three";
import { C } from "@/components/world/palette";
import * as P from "@/components/world/models/props";

type Entry = { name: string; r: number; el: ReactNode; cy?: number };

// r = rough framing radius in meters
const ENTRIES: Entry[] = [
  { name: "cone", r: 0.5, el: <P.Cone /> },
  {
    name: "tyre",
    r: 1.3,
    el: (
      <>
        <P.Tyre compound="soft" position={[-1.1, 0, 0]} />
        <P.Tyre compound="medium" position={[0, 0, 0]} />
        <P.Tyre compound="hard" position={[1.1, 0, 0]} />
        <P.TyreStack n={3} compound={["inter", "soft", "medium"]} position={[0, 0, -1.1]} />
      </>
    ),
  },
  { name: "football", r: 0.5, el: <P.Football /> },
  {
    name: "stumps",
    r: 0.8,
    el: (
      <>
        <P.Wicket />
        <P.Stump position={[0.6, 0, 0.2]} />
        <P.Bail position={[-0.5, 0.03, 0.3]} />
      </>
    ),
  },
  { name: "pitch", r: 11, el: <P.CricketPitch><P.Wicket position={[0, 0, P.PITCH_STUMPS_Z]} /></P.CricketPitch> },
  {
    name: "trees",
    r: 6,
    cy: 2.2,
    el: (
      <>
        <P.Tree variant="round" seed={1} position={[-6, 0, 0]} />
        <P.Tree variant="round" seed={2} position={[-1, 0, -1]} scale={0.8} />
        <P.Tree variant="cypress" seed={3} position={[2.5, 0, 0]} />
        <P.Tree variant="cypress" seed={4} position={[5, 0, 0]} scale={0.85} />
        <P.Bush position={[-1.5, 0, 2]} />
        <P.Bush seed={4} position={[-3.2, 0, 2.6]} scale={0.8} />
        <P.Rock position={[1.5, 0, 2]} />
        <P.Rock seed={2} position={[2.6, 0, 2.4]} scale={0.6} />
      </>
    ),
  },
  { name: "goal", r: 2.6, el: <><P.Goal /><P.Football position={[0.6, 0, 1.6]} /></> },
  {
    name: "billboard",
    r: 2.2,
    el: (
      <>
        <P.Billboard title="2021" subtitle="The solar car" accent={C.red} index={1} position={[-1.8, 0, 0]} />
        <P.Billboard title="SIDE QUEST" subtitle="AI for chips" accent={C.teal} position={[1.8, 0, 0]} scale={0.75} />
      </>
    ),
  },
  { name: "garage", r: 6.5, el: <P.Garage /> },
  { name: "lab", r: 5, el: <P.Lab /> },
  { name: "podium", r: 3, el: <P.Podium /> },
  { name: "flag", r: 2.4, cy: 2, el: <><P.Flag color={C.red} position={[-0.8, 0, 0]} /><P.Flag color={C.teal} position={[0.8, 0, 0]} speed={1.3} /></> },
  { name: "gantry", r: 5.5, el: <P.Gantry lights={3} /> },
  { name: "grandstand", r: 6, el: <P.Grandstand cheer /> },
  { name: "pitwall", r: 3.2, el: <P.PitWall /> },
  {
    name: "gadgets",
    r: 2.6,
    el: (
      <>
        {[P.Phone, P.Laptop, P.Headset, P.Chip].map((G, i) => (
          <group key={i} position={[-2.4 + i * 1.6, 0, 0]}>
            <P.Pedestal />
            <G position={[0, 1.02, 0]} />
          </group>
        ))}
      </>
    ),
  },
  {
    name: "letters",
    r: 3.6,
    el: (
      <>
        {(["H", "E", "N", "I", "L"] as const).map((ch, i) => (
          <P.Letter key={ch} char={ch} color={i === 0 ? C.red : C.white} position={[-3.6 + i * 1.8, 0, 0]} />
        ))}
      </>
    ),
  },
];

const BIG: string[] = ["pitch", "garage", "lab", "grandstand", "gantry", "pitwall", "podium", "goal", "trees", "billboard"];

function layout(list: Entry[]) {
  // simple shelf packing along X, wrapping rows toward -Z
  const out: { e: Entry; x: number; z: number }[] = [];
  let x = 0;
  let z = 0;
  let rowR = 0;
  const maxW = 46;
  for (const e of list) {
    const w = e.r * 2 + 1;
    if (x + w > maxW) {
      z -= rowR * 2 + 2;
      x = 0;
      rowR = 0;
    }
    out.push({ e, x: x + w / 2, z: z - e.r });
    x += w;
    rowR = Math.max(rowR, e.r);
  }
  const minX = 0;
  const maxX = Math.max(...out.map((o) => o.x + o.e.r));
  const minZ = Math.min(...out.map((o) => o.z - o.e.r));
  const cx = (minX + maxX) / 2;
  const cz = minZ / 2;
  return { items: out.map((o) => ({ ...o, x: o.x - cx, z: o.z - cz })), R: Math.max(maxX - minX, -minZ) / 2 };
}

function Rig({ r, cam, cy, single }: { r: number; cam: string; cy: number; single: boolean }) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    const d = single ? r * 2.6 + 1.2 : r * 1.5 + 4;
    const pitch = cam === "high" ? 0.8 : cam === "top" ? 1.45 : 0.42;
    const yaw = cam === "side" ? 0.9 : 0.35;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * d, cy + Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d);
    camera.lookAt(0, cy, 0);
  }, [camera, r, cam, cy, single]);
  return <OrbitControls makeDefault target={[0, cy, 0]} />;
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

export default function PropsLab({
  view,
  cam,
  bg = "studio",
  env = true,
  tm = "aces",
}: {
  view: string;
  cam: string;
  bg?: string;
  env?: boolean;
  tm?: string;
}) {
  const single = ENTRIES.find((e) => e.name === view);
  const list = single
    ? [single]
    : view === "big"
      ? ENTRIES.filter((e) => BIG.includes(e.name))
      : view === "small"
        ? ENTRIES.filter((e) => !BIG.includes(e.name))
        : ENTRIES;
  const { items, R } = single ? { items: [{ e: single, x: 0, z: 0 }], R: single.r } : layout(list);
  const cy = single ? (single.cy ?? single.r * 0.45) : 0;
  const sh = Math.max(12, R * 1.3);
  // ACES matches the game (R3F default); ?tm=agx for a softer studio look
  const backdrop = "#dcd8d1";
  const floor = bg === "grass" ? C.grass : "#d6d2cb";
  return (
    <div style={{ position: "fixed", inset: 0, background: backdrop }}>
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        camera={{ fov: 40, near: 0.1, far: 800 }}
        gl={{ toneMapping: tm === "agx" ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      >
        <color attach="background" args={[backdrop]} />
        <fog attach="fog" args={[backdrop, R * 6 + 20, R * 12 + 60]} />
        {env && <Studio />}
        <hemisphereLight args={["#fff6ec", "#b8b2a8", env ? 0.5 : 1.2]} />
        <directionalLight
          position={[sh * 0.6, sh * 1.4, sh * 0.8]}
          intensity={env ? 1.8 : 2.4}
          color="#fff0d8"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-camera-left={-sh}
          shadow-camera-right={sh}
          shadow-camera-top={sh}
          shadow-camera-bottom={-sh}
          shadow-camera-far={sh * 5}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[R * 3 + 20, 64]} />
          <meshStandardMaterial color={floor} roughness={0.92} />
        </mesh>
        {single && <ContactShadows position={[0, 0.003, 0]} opacity={0.35} scale={R * 5 + 4} blur={2.5} far={R + 2} />}
        {items.map(({ e, x, z }) => (
          <group key={e.name} position={[x, 0, z]}>
            {e.el}
          </group>
        ))}
        <Rig r={R} cam={cam} cy={cy} single={!!single} />
      </Canvas>
      <div style={{ position: "fixed", left: 12, top: 10, font: "600 13px system-ui", color: C.ink, opacity: 0.6 }}>
        props lab · {view} · {cam} · {bg}{env ? "" : " · no env"}
      </div>
    </div>
  );
}
