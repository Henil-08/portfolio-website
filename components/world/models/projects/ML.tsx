// ML and data showcase objects: Frisbee ratings, Rent the Runway recommender, API anomaly detection.
"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { Label } from "../props/Label";
import { mat, unitBox } from "../props/shared";
import { Block, facet, prism, Bars, Bone, M, extruded, lathe, setGlow, setOpacity, useGlowMat, useLive, type BarSpec, type ObjProps } from "./common";

const DS = THREE.DoubleSide;

// ---------------------------------------------------------------- Ultimate Frisbee ratings

const DISC: [number, number][] = [
  [0, 0.052],
  [0.18, 0.049],
  [0.28, 0.038],
  [0.33, 0.022],
  [0.345, 0.0],
  [0.34, -0.022],
  [0.325, -0.028],
  [0.318, -0.004],
  [0.25, 0.012],
  [0, 0.022],
];

const CHART = [0.08, 0.13, 0.1, 0.19, 0.27];

/** A red flying disc tilted mid-flight with a fading trail, above a little ratings bar chart. */
export function Frisbee({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const disc = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const trail = useGlowMat(C.white, 0.9, 0.7);
  useFrame(() => {
    const { a, t } = live.current;
    if (spin.current) spin.current.rotation.y = t * (2.5 + a * 3);
    if (disc.current) {
      disc.current.position.y = 0.64 + Math.sin(t * 1.2) * 0.035;
      disc.current.position.x = 0.06 + Math.sin(t * 0.6) * 0.03;
    }
    setGlow(trail, 0.7 + a * 1.2);
  });
  return (
    <group {...props}>
      <Block args={[0.62, 0.04, 0.3]} radius={0.015} smoothness={2} position={[0, 0.02, 0.04]} material={M.white()} castShadow receiveShadow />
      {CHART.map((h, i) => (
        <Block
          key={i}
          args={[0.075, h, 0.075]}
          radius={0.012}
          smoothness={2}
          position={[-0.2 + i * 0.1, 0.04 + h / 2, 0.04]}
          material={i === CHART.length - 1 ? M.red() : i % 2 ? M.charcoal() : M.greyLight()}
          castShadow
          receiveShadow
        />
      ))}
      <Label position={[0, 0.02, 0.192]} fontSize={0.028} color={C.charcoal} letterSpacing={0.1}>
        +/- RATING
      </Label>
      {/* flight trail, dots trailing down to the left */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} geometry={facet()} scale={0.016 - i * 0.003} position={[-0.24 - i * 0.08, 0.56 - i * 0.05 - i * i * 0.01, 0]} material={trail} />
      ))}
      <group ref={disc} position={[0.06, 0.64, 0]}>
        <group rotation={[0.42, 0, -0.28]}>
          <group ref={spin}>
            <mesh geometry={lathe("frisbee", DISC)} material={mat(C.orange, { r: 0.55, side: DS, flat: true })} castShadow />
            <mesh position={[0, 0.0525, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.white()}>
              <ringGeometry args={[0.2, 0.225, 48]} />
            </mesh>
            <mesh position={[0.09, 0.0526, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.05, 0.02, 1]} material={M.white()}>
              <circleGeometry args={[1, 20]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- Rent the Runway recommender

const TORSO: [number, number][] = [
  [0, 0],
  [0.15, 0],
  [0.19, 0.06],
  [0.2, 0.12],
  [0.165, 0.24],
  [0.145, 0.3],
  [0.172, 0.4],
  [0.19, 0.46],
  [0.18, 0.52],
  [0.15, 0.565],
  [0.08, 0.6],
  [0.05, 0.62],
  [0.048, 0.66],
  [0, 0.67],
];
const DRESS: [number, number][] = [
  [0.29, -0.16],
  [0.26, -0.04],
  [0.215, 0.1],
  [0.175, 0.24],
  [0.153, 0.3],
  [0.18, 0.4],
  [0.197, 0.465],
];

/** A dress form in a red dress on a chrome pole, a swinging clothes tag at the hip. */
export function Runway({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const form = useRef<THREE.Group>(null);
  const tag = useRef<THREE.Group>(null);
  const star = useGlowMat(C.red, 1.2);
  useFrame(() => {
    const { a, t } = live.current;
    if (form.current) form.current.rotation.y = Math.sin(t * 0.5) * 0.35;
    if (tag.current) tag.current.rotation.z = Math.sin(t * 2.1) * (0.12 + a * 0.12);
    setGlow(star, 1.0 + a * 1.6);
  });
  return (
    <group {...props}>
      <mesh geometry={prism()} scale={[0.2, 0.03, 0.2]} position={[0, 0.015, 0]} material={M.ink()} castShadow receiveShadow />
      <mesh geometry={prism()} scale={[0.016, 0.4, 0.016]} position={[0, 0.22, 0]} material={M.chrome()} castShadow />
      <group ref={form} position={[0, 0.4, 0]}>
        <group scale={[1.12, 1, 0.74]}>
          <mesh geometry={lathe("torso", TORSO)} material={mat(C.concrete, { r: 0.85, flat: true })} castShadow receiveShadow />
          <mesh geometry={lathe("dress", DRESS)} material={mat(C.ink, { r: 0.6, side: DS, flat: true })} castShadow receiveShadow />
          <mesh geometry={prism()} scale={[0.2, 0.012, 0.2]} position={[0, 0.462, 0]} material={M.redDark()} />
        </group>
        <mesh geometry={facet()} scale={[0.06, 0.035, 0.06]} position={[0, 0.68, 0]} material={mat(C.charcoal, { r: 0.6, flat: true })} castShadow />
        {/* tag on a string from the waist */}
        <group position={[0.17, 0.27, 0.06]}>
          <group ref={tag}>
            <Bone a={[0, 0, 0]} b={[0.02, -0.1, 0.03]} r={0.003} material={M.ink()} cast={false} />
            <group position={[0.025, -0.17, 0.035]} rotation={[0, -0.3, 0.1]}>
              <Block args={[0.09, 0.14, 0.008]} radius={0.012} smoothness={2} material={M.white()} castShadow />
              <mesh geometry={unitBox()} scale={[0.09, 0.03, 0.004]} position={[0, 0.045, 0.005]} material={M.ink()} />
              <mesh geometry={prism()} rotation={[Math.PI / 2, 0, 0]} scale={[0.008, 0.01, 0.008]} position={[0, 0.055, 0.005]} material={M.white()} />
              <mesh geometry={unitBox()} scale={[0.05, 0.05, 0.004]} position={[0, -0.01, 0.005]} rotation={[0, 0, Math.PI / 4]} material={star} />
              <mesh geometry={unitBox()} scale={[0.06, 0.008, 0.004]} position={[0, -0.05, 0.005]} material={M.greyLight()} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- API traffic anomaly detection

const SERIES: [number, number][] = [-0.4, -0.32, -0.24, -0.16, -0.08, 0, 0.08, 0.16, 0.24, 0.32, 0.4].map((x, i) => [
  x,
  [0.16, 0.2, 0.17, 0.22, 0.19, 0.21, 0.18, 0.56, 0.2, 0.17, 0.2][i],
]);
const SPIKE = 7;

function areaShape() {
  const s = new THREE.Shape();
  s.moveTo(SERIES[0][0], 0);
  SERIES.forEach(([x, y]) => s.lineTo(x, y));
  s.lineTo(SERIES[SERIES.length - 1][0], 0);
  s.closePath();
  return s;
}

const GRID: BarSpec[] = [0.15, 0.3, 0.45, 0.6].map((y) => [0, y, 0, 0.84, 0.004, 0.004]);

/** A line-chart sculpture of API latency with one red spike, flagged and pulsing. */
export function ApiAnomaly({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const flag = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const pulseMat = useGlowMat(C.red, 1.8, 0.8);
  const dot = useGlowMat(C.red, 1.8);
  useFrame(() => {
    const { a, t } = live.current;
    if (flag.current) flag.current.rotation.y = Math.sin(t * 3) * 0.25;
    const p = (t * 0.7) % 1;
    if (pulse.current) pulse.current.scale.setScalar(0.03 + p * 0.09);
    setOpacity(pulseMat, (1 - p) * 0.8);
    setGlow(dot, 1.6 + a * 2 + Math.sin(t * 6) * 0.4);
    setGlow(pulseMat, 1.6 + a * 1.6);
  });
  const area = extruded("api-area", areaShape, 0.05, 0.006, 2, false);
  const [sx, sy] = SERIES[SPIKE];
  return (
    <group {...props}>
      <Block args={[0.94, 0.05, 0.3]} radius={0.018} smoothness={2} position={[0, 0.025, 0]} material={M.ink()} castShadow receiveShadow />
      {/* back panel with faint grid */}
      <Block args={[0.9, 0.66, 0.02]} radius={0.01} smoothness={2} position={[0, 0.05 + 0.33, -0.1]} material={M.white()} castShadow receiveShadow />
      <group position={[0, 0.05, -0.088]}>
        <Bars items={GRID} material={M.greyLight()} />
      </group>
      {/* area + line */}
      <group position={[0, 0.05, -0.04]}>
        <mesh geometry={area} material={mat(C.gravel, { r: 0.9, flat: true })} castShadow receiveShadow />
        {SERIES.slice(1).map(([x, y], i) => {
          const [px, py] = SERIES[i];
          const hot = i === SPIKE - 1 || i === SPIKE;
          return <Bone key={i} a={[px, py, 0.055]} b={[x, y, 0.055]} r={0.012} material={hot ? M.red() : M.charcoal()} />;
        })}
        <mesh geometry={facet()} scale={0.026} position={[sx, sy, 0.055]} material={dot} />
        <mesh ref={pulse} position={[sx, sy, 0.056]} material={pulseMat}>
          <torusGeometry args={[1, 0.08, 4, 12]} />
        </mesh>
        {/* flag on the spike */}
        <mesh geometry={prism()} scale={[0.006, 0.12, 0.006]} position={[sx, sy + 0.08, 0.055]} material={M.ink()} castShadow />
        <group ref={flag} position={[sx, sy + 0.12, 0.055]}>
          <mesh geometry={unitBox()} scale={[0.07, 0.045, 0.004]} position={[0.036, 0, 0]} material={M.red()} castShadow />
        </group>
      </group>
    </group>
  );
}
