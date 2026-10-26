// Showcase objects for the smaller projects: YouTube blog crew, RAG doc Q&A, table tennis
// tracking, Helios timeout, simulated driving, PCM battery and maternity eCommerce.
"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { Label } from "../props/Label";
import { geo, mat, unitBox } from "../props/shared";
import { Block, facet, prism, Bars, Bone, M, extruded, setGlow, setOpacity, useGlowMat, useLive, type BarSpec, type ObjProps } from "./common";

const triGeo = () =>
  geo("proj-tri", () => {
    const g = new THREE.CylinderGeometry(1, 1, 1, 3);
    g.rotateX(Math.PI / 2);
    g.rotateZ(Math.PI / 2);
    return g;
  });

const PAGE: BarSpec[] = [0, 1, 2, 3].map((i) => [-0.01, -0.06 - i * 0.04, 0.008, [0.2, 0.18, 0.21, 0.14][i], 0.014, 0.003]);

// ---------------------------------------------------------------- YouTube video blog generator

/** A red video player handing off through three crew agents to a finished blog page. */
export function YoutubeBlog({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const crew = [useGlowMat(C.white, 1), useGlowMat(C.white, 1), useGlowMat(C.white, 1)];
  useFrame(() => {
    const { a, t } = live.current;
    crew.forEach((m, i) => setGlow(m, 0.3 + (Math.floor(t * 1.5) % 3 === i ? 2 + a * 1.5 : 0)));
  });
  return (
    <group {...props}>
      <Block args={[0.86, 0.04, 0.36]} radius={0.015} smoothness={2} position={[0, 0.02, 0]} material={M.cream()} castShadow receiveShadow />
      <group position={[-0.24, 0.04, 0]}>
        <mesh geometry={unitBox()} scale={[0.04, 0.12, 0.04]} position={[0, 0.06, -0.02]} material={M.alu()} castShadow />
        <group position={[0, 0.27, 0]} rotation={[-0.08, 0.25, 0]}>
          <Block args={[0.34, 0.24, 0.06]} radius={0.06} smoothness={4} material={M.red()} castShadow />
          <mesh geometry={triGeo()} scale={[0.06, 0.06, 0.02]} position={[0.01, 0, 0.035]} material={M.white()} />
        </group>
      </group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} geometry={facet()} scale={0.03} position={[-0.04 + i * 0.07, 0.3, 0.04]} material={crew[i]} />
      ))}
      <group position={[0.26, 0.04, 0]} rotation={[-0.12, -0.25, 0]}>
        <group position={[0, 0.2, 0]}>
          <Block args={[0.28, 0.38, 0.012]} radius={0.008} smoothness={2} material={M.white()} castShadow receiveShadow />
          <mesh geometry={unitBox()} scale={[0.2, 0.026, 0.004]} position={[-0.03, 0.15, 0.008]} material={M.ink()} />
          <mesh geometry={unitBox()} scale={[0.22, 0.1, 0.004]} position={[0, 0.06, 0.008]} material={mat(C.gravel, { r: 0.9 })} />
          <Bars items={PAGE} material={M.greyLight()} />
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- RAG document Q&A

/** A fanned stack of PDFs under a slowly circling magnifier, a question bubble above. */
export function RagDocQa({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const lens = useRef<THREE.Group>(null);
  const glass = useGlowMat(C.white, 0.3, 0.35);
  useFrame(() => {
    const { a, t } = live.current;
    if (lens.current) lens.current.position.set(Math.sin(t * 0.8) * 0.08, 0.36 + Math.sin(t * 1.6) * 0.02, 0.06 + Math.cos(t * 0.8) * 0.04);
    setGlow(glass, 0.3 + a * 0.8);
  });
  return (
    <group {...props}>
      <Block args={[0.64, 0.04, 0.46]} radius={0.015} smoothness={2} position={[0, 0.02, 0]} material={M.cream()} castShadow receiveShadow />
      {[0, 1, 2].map((i) => (
        <group key={i} position={[-0.04 + i * 0.03, 0.06 + i * 0.022, -0.02 + i * 0.02]} rotation={[-Math.PI / 2 + 0.5, 0, 0.25 - i * 0.2]}>
          <Block args={[0.28, 0.36, 0.012]} radius={0.006} smoothness={2} material={M.white()} castShadow receiveShadow />
          <mesh geometry={unitBox()} scale={[0.08, 0.04, 0.004]} position={[0.08, 0.14, 0.008]} material={M.red()} />
          {i === 2 && <Bars items={PAGE} material={M.greyLight()} />}
        </group>
      ))}
      <group ref={lens} position={[0, 0.36, 0.06]}>
        <group rotation={[0.25, -0.3, 0.3]}>
          <mesh material={M.chrome()} castShadow>
            <torusGeometry args={[0.1, 0.016, 4, 12]} />
          </mesh>
          <mesh geometry={prism()} rotation={[Math.PI / 2, 0, 0]} scale={[0.095, 0.008, 0.095]} material={glass} />
          <Bone a={[0.07, -0.07, 0]} b={[0.17, -0.17, 0]} r={0.02} material={M.ink()} />
        </group>
      </group>
      <group position={[0.22, 0.62, 0]}>
        <Block args={[0.14, 0.12, 0.05]} radius={0.04} smoothness={3} material={M.ink()} castShadow />
        <mesh position={[-0.04, -0.07, 0]} rotation={[0, 0, Math.PI + 0.6]} material={M.ink()}>
          <coneGeometry args={[0.025, 0.05, 16]} />
        </mesh>
        <Label position={[0, 0, 0.027]} fontSize={0.07} color={C.white}>
          ?
        </Label>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- Table tennis ball tracking

/** A slice of table with a net, a red paddle, and a ball bouncing toward its predicted landing ring. */
export function TableTennis({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const ball = useRef<THREE.Mesh>(null);
  const ring = useGlowMat(C.red, 1.6);
  useFrame(() => {
    const { a, t } = live.current;
    const p = (t * 0.5) % 1;
    if (ball.current) {
      const x = -0.28 + p * 0.5;
      const y = 0.17 + Math.abs(Math.sin(p * Math.PI * 1.5)) * 0.3 * (1 - p * 0.4);
      ball.current.position.set(x, y, 0.06);
    }
    setGlow(ring, 1.2 + a * 1.6 + Math.sin(t * 5) * 0.4);
  });
  const top = mat(C.charcoal, { r: 0.6 });
  return (
    <group {...props}>
      <Block args={[0.74, 0.1, 0.46]} radius={0.02} smoothness={2} position={[0, 0.05, 0]} material={M.ink()} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[0.72, 0.025, 0.44]} position={[0, 0.112, 0]} material={top} receiveShadow />
      <Bars
        items={[
          [0, 0.126, 0.21, 0.72, 0.003, 0.012],
          [0, 0.126, -0.21, 0.72, 0.003, 0.012],
          [0, 0.126, 0, 0.72, 0.003, 0.006],
        ]}
        material={M.white()}
      />
      {/* net */}
      <mesh geometry={unitBox()} scale={[0.008, 0.07, 0.46]} position={[0, 0.16, 0]} material={mat(C.paper, { r: 0.6, o: 0.85 })} />
      <mesh geometry={unitBox()} scale={[0.012, 0.01, 0.47]} position={[0, 0.196, 0]} material={M.white()} />
      {/* predicted landing */}
      <mesh position={[0.2, 0.127, 0.06]} rotation={[-Math.PI / 2, 0, 0]} material={ring}>
        <ringGeometry args={[0.035, 0.045, 32]} />
      </mesh>
      <mesh ref={ball} geometry={facet()} scale={0.03} position={[-0.2, 0.3, 0.06]} material={mat(C.orange, { r: 0.55, flat: true })} castShadow />
      {/* paddle */}
      <group position={[-0.3, 0.13, -0.12]} rotation={[0, 0.5, 0.5]}>
        <mesh geometry={prism()} rotation={[Math.PI / 2, 0, 0]} scale={[0.1, 0.02, 0.11]} position={[0, 0.2, 0]} material={M.red()} castShadow />
        <mesh geometry={prism()} rotation={[Math.PI / 2, 0, 0]} scale={[0.1, 0.004, 0.11]} position={[0, 0.2, -0.012]} material={M.ink()} />
        <Block args={[0.035, 0.11, 0.025]} radius={0.01} smoothness={2} position={[0, 0.05, 0]} material={mat(C.ink, { r: 0.6 })} castShadow />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- Helios adaptive timeout

/** A chrome stopwatch on a cradle, red hand sweeping a glowing rest arc. */
export function HeliosTimeout({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const hand = useRef<THREE.Group>(null);
  const arc = useGlowMat(C.red, 1.4);
  useFrame(() => {
    const { a, t } = live.current;
    if (hand.current) hand.current.rotation.z = -t * 1.2;
    setGlow(arc, 1.2 + a * 1.6);
  });
  return (
    <group {...props}>
      <Block args={[0.4, 0.06, 0.26]} radius={0.02} smoothness={2} position={[0, 0.03, 0]} material={M.ink()} castShadow receiveShadow />
      <group position={[0, 0.34, 0]} rotation={[-0.15, 0, 0]}>
        <mesh geometry={prism()} rotation={[Math.PI / 2, 0, 0]} scale={[0.27, 0.08, 0.27]} material={M.chrome()} castShadow />
        <mesh geometry={prism()} rotation={[Math.PI / 2, 0, 0]} scale={[0.24, 0.01, 0.24]} position={[0, 0, 0.04]} material={M.white()} />
        <mesh position={[0, 0, 0.047]} rotation={[0, 0, Math.PI / 2 - 1.9]} material={arc}>
          <torusGeometry args={[0.2, 0.012, 4, 12, 1.9]} />
        </mesh>
        <Bars
          items={[
            [0, 0.2, 0.046, 0.012, 0.035, 0.004],
            [0, -0.2, 0.046, 0.012, 0.035, 0.004],
            [0.2, 0, 0.046, 0.035, 0.012, 0.004],
            [-0.2, 0, 0.046, 0.035, 0.012, 0.004],
          ]}
          material={M.ink()}
        />
        <Label position={[0, -0.09, 0.047]} fontSize={0.04} color={C.charcoal} letterSpacing={0.1}>
          REST
        </Label>
        <group ref={hand} position={[0, 0, 0.05]}>
          <mesh geometry={unitBox()} scale={[0.012, 0.18, 0.006]} position={[0, 0.07, 0]} material={M.red()} />
        </group>
        <mesh geometry={prism()} rotation={[Math.PI / 2, 0, 0]} scale={[0.02, 0.012, 0.02]} position={[0, 0, 0.055]} material={M.ink()} />
        {/* crown + side pusher */}
        <mesh geometry={prism()} scale={[0.035, 0.05, 0.035]} position={[0, 0.29, 0]} material={M.chrome()} castShadow />
        <mesh geometry={prism()} scale={[0.05, 0.03, 0.05]} position={[0, 0.33, 0]} material={M.red()} castShadow />
        <mesh geometry={prism()} rotation={[0, 0, -0.8]} scale={[0.022, 0.05, 0.022]} position={[0.2, 0.2, 0]} material={M.chrome()} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- Deep learning driving in simulation

function roadShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.24, -0.17);
  s.lineTo(0.24, -0.17);
  s.lineTo(0.04, 0.12);
  s.lineTo(-0.04, 0.12);
  s.closePath();
  return s;
}

/** A sim monitor with a perspective road, a steering wheel in front correcting left and right. */
export function SimDriving({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const wheel = useRef<THREE.Group>(null);
  const dashes = useRef<THREE.Group>(null);
  useFrame(() => {
    const { t } = live.current;
    if (wheel.current) wheel.current.rotation.z = Math.sin(t * 1.1) * 0.5;
    if (dashes.current) dashes.current.position.y = -((t * 0.12) % 0.1);
  });
  const road = extruded("sim-road", roadShape, 0.002, 0, 1);
  return (
    <group {...props}>
      <group position={[0, 0, -0.16]}>
        <mesh geometry={unitBox()} scale={[0.05, 0.2, 0.03]} position={[0, 0.1, -0.02]} material={M.alu()} castShadow />
        <mesh geometry={prism()} scale={[0.14, 0.02, 0.1]} position={[0, 0.01, -0.02]} material={M.alu()} receiveShadow />
        <Block args={[0.66, 0.42, 0.04]} radius={0.025} smoothness={3} position={[0, 0.42, 0]} material={M.charcoal()} castShadow />
        <mesh geometry={unitBox()} scale={[0.6, 0.36, 0.004]} position={[0, 0.42, 0.021]} material={mat(C.glass, { glow: 0.9, e: C.glass, r: 0.2 })} />
        <mesh geometry={unitBox()} scale={[0.6, 0.1, 0.004]} position={[0, 0.55, 0.022]} material={mat(C.charcoal, { glow: 0.9, r: 0.2 })} />
        <mesh geometry={road} position={[0, 0.405, 0.025]} material={mat(C.ink, { glow: 0.6, r: 0.4 })} />
        <group position={[0, 0.405, 0.028]}>
          <group ref={dashes}>
            <Bars items={[0.08, -0.02, -0.12].map((y) => [0, y, 0, 0.012 - y * 0.03, 0.04, 0.002] as BarSpec)} material={M.glowWhite(1.0)} />
          </group>
        </group>
      </group>
      {/* steering wheel on a column */}
      <Bone a={[0, 0.0, 0.24]} b={[0, 0.14, 0.2]} r={0.022} material={M.ink()} />
      <mesh geometry={prism()} scale={[0.1, 0.02, 0.08]} position={[0, 0.01, 0.24]} material={M.ink()} castShadow receiveShadow />
      <group position={[0, 0.19, 0.2]} rotation={[-0.75, 0, 0]} scale={0.8}>
        <group ref={wheel}>
          <mesh material={M.ink()} castShadow>
            <torusGeometry args={[0.15, 0.022, 4, 12]} />
          </mesh>
          <mesh geometry={prism()} rotation={[Math.PI / 2, 0, 0]} scale={[0.045, 0.03, 0.045]} material={M.red()} castShadow />
          {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((th) => (
            <Bone key={th} a={[0, 0, 0]} b={[Math.sin(th + Math.PI) * 0.14, Math.cos(th + Math.PI) * 0.14, 0]} r={0.012} material={M.alu()} />
          ))}
          <mesh geometry={unitBox()} scale={[0.02, 0.03, 0.02]} position={[0, 0.15, 0.01]} material={M.red()} />
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- PCM battery thermal management

/** Six battery cells set in a translucent cooling block, a thermometer beside it holding steady. */
export function PcmBattery({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const fill = useRef<THREE.Mesh>(null);
  const pcm = useGlowMat(C.concrete, 0.5, 0.45);
  useFrame(() => {
    const { a, t } = live.current;
    const lvl = 0.17 + Math.sin(t * 0.9) * 0.04;
    if (fill.current) {
      fill.current.scale.y = lvl;
      fill.current.position.y = 0.09 + lvl / 2;
    }
    setGlow(pcm, 0.4 + a * 0.8);
    setOpacity(pcm, 0.4 + a * 0.15);
  });
  const cells: [number, number][] = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) cells.push([-0.17 + i * 0.12, -0.06 + j * 0.12]);
  return (
    <group {...props}>
      <Block args={[0.8, 0.04, 0.4]} radius={0.015} smoothness={2} position={[0, 0.02, 0]} material={M.cream()} castShadow receiveShadow />
      <group position={[-0.06, 0.04, 0]}>
        <Block args={[0.42, 0.05, 0.3]} radius={0.015} smoothness={2} position={[0, 0.025, 0]} material={M.ink()} castShadow receiveShadow />
        {cells.map(([x, z]) => (
          <group key={`${x}${z}`} position={[x, 0.05, z]}>
            <mesh geometry={prism()} scale={[0.045, 0.3, 0.045]} position={[0, 0.15, 0]} material={M.white()} castShadow />
            <mesh geometry={prism()} scale={[0.03, 0.02, 0.03]} position={[0, 0.31, 0]} material={M.chrome()} />
          </group>
        ))}
        <Block args={[0.4, 0.22, 0.28]} radius={0.02} smoothness={2} position={[0, 0.16, 0]} material={pcm} />
        <mesh geometry={unitBox()} scale={[0.34, 0.012, 0.03]} position={[0, 0.37, 0]} material={M.alu()} />
      </group>
      {/* thermometer */}
      <group position={[0.3, 0.04, 0.04]}>
        <mesh geometry={facet()} scale={0.045} position={[0, 0.05, 0]} material={M.glowRed(1.2)} />
        <mesh geometry={prism()} scale={[0.026, 0.38, 0.026]} position={[0, 0.27, 0]} material={mat(C.glass, { r: 0.1, o: 0.5 })} />
        <mesh ref={fill} geometry={prism()} scale={[0.014, 0.17, 0.014]} position={[0, 0.175, 0]} material={M.glowRed(1.2)} />
        <Bars items={[0.18, 0.26, 0.34, 0.42].map((y) => [0.035, y, 0, 0.02, 0.006, 0.006] as BarSpec)} material={M.ink()} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- Maternity eCommerce pricing

/** A paper shopping bag with an orange price tag and a paper number-one badge spinning above. */
export function MaternityEcommerce({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const badge = useRef<THREE.Group>(null);
  const tag = useRef<THREE.Group>(null);
  const gold = useGlowMat(C.paper, 0.4);
  useFrame(() => {
    const { a, t } = live.current;
    if (badge.current) {
      badge.current.rotation.y = t * 0.9;
      badge.current.position.y = 0.72 + Math.sin(t * 1.5) * 0.02;
    }
    if (tag.current) tag.current.rotation.z = Math.sin(t * 1.8) * 0.15;
    setGlow(gold, 0.3 + a * 0.9);
  });
  return (
    <group {...props}>
      <group position={[-0.04, 0, 0]} rotation={[0, 0.3, 0]}>
        <Block args={[0.42, 0.44, 0.2]} radius={0.015} smoothness={2} position={[0, 0.22, 0]} material={M.white()} castShadow receiveShadow />
        <mesh geometry={unitBox()} scale={[0.42, 0.03, 0.202]} position={[0, 0.4, 0]} material={M.red()} />
        {[-0.05, 0.05].map((z) => (
          <mesh key={z} position={[0, 0.44, z]} material={M.red()} castShadow>
            <torusGeometry args={[0.08, 0.012, 4, 12, Math.PI]} />
          </mesh>
        ))}
        <Label position={[0, 0.2, 0.101]} fontSize={0.05} color={C.charcoal} letterSpacing={0.12}>
          SHOP
        </Label>
        {/* tag hanging from the handle */}
        <group position={[0.06, 0.5, 0.06]}>
          <group ref={tag}>
            <Bone a={[0, 0, 0]} b={[0.1, -0.12, 0.05]} r={0.003} material={M.ink()} cast={false} />
            <group position={[0.14, -0.18, 0.07]} rotation={[0, -0.3, -0.3]}>
              <Block args={[0.12, 0.08, 0.01]} radius={0.012} smoothness={2} material={M.red()} castShadow />
              <Label position={[0.006, 0, 0.007]} fontSize={0.045} color={C.white}>
                $
              </Label>
            </group>
          </group>
        </group>
      </group>
      <group ref={badge} position={[-0.04, 0.72, 0]}>
        <mesh geometry={prism()} rotation={[Math.PI / 2, 0, 0]} scale={[0.09, 0.02, 0.09]} material={gold} castShadow />
        <Label position={[0, 0, 0.012]} fontSize={0.07} color={C.white}>
          #1
        </Label>
        <Label position={[0, 0, -0.012]} rotation={[0, Math.PI, 0]} fontSize={0.07} color={C.white}>
          #1
        </Label>
      </group>
    </group>
  );
}
