// Computer vision and robotics showcase objects: solar car, kidney scan, Pi-Car, gesture control.
"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C } from "../../palette";
import { geo, mat, unitBox } from "../props/shared";
import { Block, facet, prism, Bars, Bone, M, extruded, setGlow, setOpacity, useGlowMat, useLive, type BarSpec, type ObjProps } from "./common";

// ---------------------------------------------------------------- Self-driving solar vehicle

const CELLS: BarSpec[] = [
  ...[-0.24, -0.08, 0.08, 0.24].map((x) => [x, 0, 0, 0.004, 0.003, 0.36] as BarSpec),
  ...[-0.09, 0.09].map((z) => [0, 0, z, 0.7, 0.003, 0.004] as BarSpec),
];

/** A low solar race car on a turntable, a camera on a mast casting a glowing vision cone ahead. */
export function SelfDriving({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const table = useRef<THREE.Group>(null);
  const cone = useGlowMat(C.red, 1.0, 0.18);
  const lens = useGlowMat(C.red, 1.8);
  useFrame(() => {
    const { a, t } = live.current;
    if (table.current) table.current.rotation.y = -0.55 + Math.sin(t * 0.4) * 0.35;
    setOpacity(cone, 0.12 + 0.06 * Math.sin(t * 3) + a * 0.1);
    setGlow(lens, 1.6 + a * 1.8);
  });
  const panel = mat(C.glass, { r: 0.15, m: 0.4 });
  return (
    <group {...props}>
      <mesh geometry={prism()} scale={[0.46, 0.024, 0.46]} position={[0, 0.012, 0]} material={M.alu()} castShadow receiveShadow />
      <mesh geometry={prism()} scale={[0.4, 0.006, 0.4]} position={[0, 0.026, 0]} material={M.white()} receiveShadow />
      <group ref={table} position={[0, 0.029, 0]}>
        <group position={[-0.08, 0, 0]}>
          {/* wheels peeking under fairings */}
          {[
            [-0.27, -0.17],
            [-0.27, 0.17],
            [0.27, 0],
          ].map(([x, z]) => (
            <group key={`${x}${z}`}>
              <mesh geometry={prism()} rotation={[Math.PI / 2, 0, 0]} scale={[0.05, 0.03, 0.05]} position={[x, 0.05, z]} material={M.rubber()} castShadow />
              <Block args={[0.16, 0.06, 0.05]} radius={0.024} smoothness={3} position={[x, 0.085, z]} material={M.white()} castShadow />
            </group>
          ))}
          {/* flat aero body + solar deck */}
          <Block args={[0.84, 0.05, 0.44]} radius={0.022} smoothness={3} position={[0, 0.125, 0]} material={M.white()} castShadow receiveShadow />
          <mesh geometry={unitBox()} scale={[0.74, 0.012, 0.38]} position={[-0.02, 0.153, 0]} material={panel} receiveShadow />
          <group position={[-0.02, 0.16, 0]}>
            <Bars items={CELLS} material={M.alu()} />
          </group>
          {[-0.221, 0.221].map((z) => (
            <mesh key={z} geometry={unitBox()} scale={[0.6, 0.014, 0.004]} position={[0.05, 0.125, z]} material={M.red()} />
          ))}
          {/* driver canopy */}
          <mesh geometry={facet()} scale={[0.12, 0.06, 0.075]} position={[0.12, 0.165, 0]} material={mat(C.black, { r: 0.08, m: 0.3 })} castShadow />
          {/* camera mast */}
          <Bone a={[0.26, 0.15, 0]} b={[0.26, 0.31, 0]} r={0.012} material={M.alu()} />
          <Block args={[0.07, 0.05, 0.06]} radius={0.012} smoothness={2} position={[0.27, 0.33, 0]} material={M.charcoal()} castShadow />
          <mesh geometry={prism()} rotation={[0, 0, Math.PI / 2]} scale={[0.02, 0.02, 0.02]} position={[0.31, 0.33, 0]} material={lens} />
          <mesh position={[0.31 + 0.17, 0.3, 0]} rotation={[0, 0, Math.PI / 2 + 0.18]} material={cone}>
            <coneGeometry args={[0.12, 0.34, 32, 1, true]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- Kidney tumor classification

function kidneyShape() {
  const s = new THREE.Shape();
  const n = 64;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    let x = 0.62 * Math.cos(t);
    const y = Math.sin(t);
    // pinch the left side in to form the hilum
    const d = t - Math.PI;
    x += 0.42 * Math.exp(-(d * d) / 0.22);
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return s;
}

/** A translucent stylised kidney floating in front of a scan monitor, a red scan line sweeping it. */
export function Kidney({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const organ = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const beamMat = useGlowMat(C.red, 1.8, 0.75);
  const spot = useGlowMat(C.red, 1.6);
  const rings = useGlowMat(C.paper, 1.2);
  useFrame(() => {
    const { a, t } = live.current;
    if (organ.current) {
      organ.current.rotation.y = Math.sin(t * 0.6) * 0.5;
      organ.current.position.y = 0.44 + Math.sin(t * 1.3) * 0.015;
    }
    if (beam.current) beam.current.position.y = 0.44 + Math.sin(t * 1.4) * 0.2;
    setGlow(spot, 1.2 + a * 2 + Math.max(0, Math.sin(t * 3)) * 0.8);
    setGlow(rings, 1.0 + a * 1.2);
    setGlow(beamMat, 1.6 + a * 1.6);
  });
  const g = extruded("kidney", kidneyShape, 0.25, 0.28, 8);
  return (
    <group {...props}>
      {/* monitor */}
      <group position={[0, 0, -0.18]}>
        <mesh geometry={prism()} scale={[0.16, 0.02, 0.12]} position={[0, 0.01, 0]} material={M.alu()} castShadow receiveShadow />
        <mesh geometry={unitBox()} scale={[0.05, 0.22, 0.03]} position={[0, 0.12, -0.02]} material={M.alu()} castShadow />
        <Block args={[0.7, 0.5, 0.04]} radius={0.025} smoothness={3} position={[0, 0.47, 0]} material={M.charcoal()} castShadow receiveShadow />
        <mesh geometry={unitBox()} scale={[0.64, 0.44, 0.004]} position={[0, 0.47, 0.021]} material={M.screen()} />
        {[0.08, 0.14, 0.2].map((r) => (
          <mesh key={r} position={[0, 0.47, 0.024]} material={rings}>
            <ringGeometry args={[r, r + 0.004, 64]} />
          </mesh>
        ))}
        <Bars
          items={[
            [0, 0.47, 0.024, 0.5, 0.003, 0.002],
            [0, 0.47, 0.024, 0.003, 0.4, 0.002],
            [-0.25, 0.65, 0.024, 0.08, 0.016, 0.002],
            [0.24, 0.29, 0.024, 0.1, 0.016, 0.002],
          ]}
          material={M.glowWhite(0.7)}
        />
      </group>
      {/* kidney */}
      <group ref={organ} position={[0, 0.44, 0.08]}>
        <mesh geometry={g} scale={0.2} rotation={[0, 0, 0.25]} material={mat(C.concrete, { r: 0.4, o: 0.72, flat: true })} castShadow />
        <mesh geometry={facet()} scale={0.045} position={[0.04, 0.12, 0.0]} material={spot} />
        <Bone a={[-0.04, -0.02, 0]} b={[-0.12, -0.2, 0]} r={0.016} material={mat(C.concreteDark, { r: 0.6 })} />
      </group>
      <mesh ref={beam} geometry={unitBox()} scale={[0.36, 0.006, 0.24]} position={[0, 0.44, 0.08]} material={beamMat} />
    </group>
  );
}

// ---------------------------------------------------------------- Pi-Car

function dashGeo() {
  return geo("picar-dash", () => {
    const parts: THREE.BufferGeometry[] = [];
    const n = 12;
    for (let i = 0; i < n; i++) {
      const g = new THREE.RingGeometry(0.278, 0.292, 8, 1, (i / n) * Math.PI * 2, (Math.PI * 2) / n / 2);
      parts.push(g);
    }
    const m = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
    m.rotateX(-Math.PI / 2);
    return m;
  });
}
function laneGeo(r: number) {
  return geo(`picar-lane-${r}`, () => new THREE.RingGeometry(r, r + 0.014, 72).rotateX(-Math.PI / 2));
}

/** A tiny RC car with a Raspberry-Pi-green board, lapping a lane-lined track disc. */
export function PiCar({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const lap = useRef<THREE.Group>(null);
  const wheels = useRef<(THREE.Mesh | null)[]>([]);
  const led = useGlowMat(C.red, 1.6);
  useFrame(() => {
    const { a, t } = live.current;
    if (lap.current) lap.current.rotation.y = t * 0.5;
    wheels.current.forEach((w) => {
      if (w) w.rotation.y = -t * 6;
    });
    setGlow(led, (Math.sin(t * 6) > 0 ? 2 : 0.3) * (1 + a));
  });
  const pcb = mat(C.leafDark, { r: 0.7 }); // board green, muted to the leaf tone
  return (
    <group {...props}>
      <mesh geometry={prism()} scale={[0.5, 0.04, 0.5]} position={[0, 0.02, 0]} material={mat(C.asphalt, { r: 0.8 })} castShadow receiveShadow />
      <mesh geometry={laneGeo(0.43)} position={[0, 0.041, 0]} material={M.white()} receiveShadow />
      <mesh geometry={laneGeo(0.1)} position={[0, 0.041, 0]} material={M.white()} receiveShadow />
      <mesh geometry={dashGeo()} position={[0, 0.041, 0]} material={mat(C.paper, { r: 0.6 })} receiveShadow />
      <group ref={lap}>
        {/* car sits on the lane centre, nose along the direction of travel */}
        <group position={[0.275, 0.04, 0]} rotation={[0, Math.PI / 2 + 0.25, 0]} scale={1.55}>
          {[
            [-0.085, -0.08],
            [-0.085, 0.08],
            [0.085, -0.08],
            [0.085, 0.08],
          ].map(([x, z], i) => (
            <mesh
              key={i}
              ref={(m) => {
                wheels.current[i] = m;
              }}
              geometry={prism()}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[0.042, 0.04, 0.042]}
              position={[x, 0.042, z]}
              material={M.rubber()}
              castShadow
            />
          ))}
          <Block args={[0.26, 0.025, 0.12]} radius={0.008} smoothness={2} position={[0, 0.05, 0]} material={M.ink()} castShadow />
          <Block args={[0.17, 0.035, 0.09]} radius={0.01} smoothness={2} position={[-0.01, 0.08, 0]} material={M.red()} castShadow />
          <Block args={[0.19, 0.01, 0.12]} radius={0.003} smoothness={1} position={[-0.01, 0.104, 0]} material={pcb} castShadow receiveShadow />
          <mesh geometry={unitBox()} scale={[0.04, 0.008, 0.04]} position={[0, 0.113, 0]} material={M.ink()} />
          <Bars
            items={[
              [-0.085, 0.124, -0.03, 0.04, 0.03, 0.03],
              [-0.085, 0.124, 0.025, 0.04, 0.03, 0.035],
            ]}
            material={M.chrome()}
          />
          <mesh geometry={unitBox()} scale={[0.12, 0.012, 0.012]} position={[0, 0.115, -0.05]} material={mat(C.concreteDark, { r: 0.5, m: 0.4 })} />
          <mesh geometry={unitBox()} scale={[0.01, 0.01, 0.01]} position={[0.06, 0.114, 0.04]} material={led} />
          {/* camera on a short mast */}
          <Bone a={[0.1, 0.06, 0]} b={[0.11, 0.16, 0]} r={0.008} material={M.alu()} />
          <Block args={[0.035, 0.035, 0.04]} radius={0.008} smoothness={2} position={[0.115, 0.17, 0]} material={M.charcoal()} castShadow />
          <mesh geometry={prism()} rotation={[0, 0, Math.PI / 2]} scale={[0.01, 0.01, 0.01]} position={[0.135, 0.17, 0]} material={M.glowTeal(1.8)} />
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- Gesture volume control

type V3 = THREE.Vector3Tuple;
const FINGERS: { pts: V3[]; r: number }[] = [
  // middle, ring, pinky: relaxed and up
  { pts: [[0.03, 0.13, 0], [0.032, 0.25, 0.01], [0.034, 0.34, 0.03]], r: 0.027 },
  { pts: [[-0.03, 0.125, 0], [-0.032, 0.235, 0.012], [-0.034, 0.315, 0.035]], r: 0.026 },
  { pts: [[-0.085, 0.11, 0], [-0.092, 0.2, 0.015], [-0.096, 0.26, 0.04]], r: 0.022 },
  // index: curls forward and down to meet the thumb
  { pts: [[0.085, 0.13, 0], [0.105, 0.22, 0.07], [0.11, 0.18, 0.14]], r: 0.026 },
  // thumb: from the heel of the palm up to the index tip
  { pts: [[0.1, -0.07, 0.02], [0.165, 0.03, 0.08], [0.122, 0.15, 0.14]], r: 0.028 },
];
const PINCH: V3 = [0.116, 0.166, 0.145];

/** A white mannequin hand pinching the air above a volume slider that follows it. */
export function GestureControl({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const hand = useRef<THREE.Group>(null);
  const fill = useRef<THREE.Mesh>(null);
  const knob = useRef<THREE.Group>(null);
  const spark = useRef<THREE.Mesh>(null);
  const sparkMat = useGlowMat(C.red, 2.0);
  useFrame(() => {
    const { a, t } = live.current;
    const v = 0.5 + 0.38 * Math.sin(t * 0.8);
    const kx = -0.25 + v * 0.5;
    if (hand.current) {
      hand.current.position.x = kx * 0.6;
      hand.current.position.y = 0.42 + Math.sin(t * 1.6) * 0.015;
    }
    if (fill.current) {
      fill.current.scale.x = Math.max(0.001, v * 0.5);
      fill.current.position.x = -0.25 + (v * 0.5) / 2;
    }
    if (knob.current) knob.current.position.x = kx;
    if (spark.current) spark.current.scale.setScalar(0.03 + 0.01 * Math.sin(t * 5) + a * 0.01);
    setGlow(sparkMat, 1.8 + a * 2);
  });
  const skin = M.white();
  return (
    <group {...props}>
      <Block args={[0.74, 0.05, 0.36]} radius={0.018} smoothness={2} position={[0, 0.025, 0.04]} material={M.cream()} castShadow receiveShadow />
      {/* slider */}
      <group position={[0, 0.065, 0.12]}>
        <Block args={[0.54, 0.024, 0.05]} radius={0.012} smoothness={2} material={M.ink()} castShadow />
        <mesh ref={fill} geometry={unitBox()} scale={[0.25, 0.012, 0.028]} position={[-0.125, 0.009, 0]} material={M.glowRed(1.2)} />
        <group ref={knob}>
          <mesh geometry={prism()} scale={[0.038, 0.035, 0.038]} position={[0, 0.02, 0]} material={M.white()} castShadow />
          <mesh geometry={prism()} scale={[0.014, 0.004, 0.014]} position={[0, 0.039, 0]} material={M.glowRed(1.8)} />
        </group>
        {/* speaker + sound arcs */}
        <group position={[0.31, 0.01, 0]}>
          <mesh geometry={unitBox()} scale={[0.022, 0.03, 0.03]} material={M.ink()} />
          <mesh position={[0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={M.ink()}>
            <coneGeometry args={[0.028, 0.03, 16]} />
          </mesh>
        </group>
      </group>
      {/* hand */}
      <group ref={hand} position={[0, 0.42, -0.04]}>
        <group scale={1.45} rotation={[0, -0.55, 0]}>
          <Block args={[0.24, 0.26, 0.075]} radius={0.035} smoothness={4} material={skin} castShadow receiveShadow />
          {FINGERS.map((f, i) => (
            <group key={i}>
              <Bone a={f.pts[0]} b={f.pts[1]} r={f.r} material={skin} />
              <Bone a={f.pts[1]} b={f.pts[2]} r={f.r * 0.92} material={skin} />
            </group>
          ))}
          <mesh geometry={prism()} scale={[0.09, 0.08, 0.05]} position={[0, -0.16, 0]} material={skin} castShadow />
          <mesh geometry={prism()} scale={[0.095, 0.03, 0.055]} position={[0, -0.2, 0]} material={M.red()} castShadow />
          <mesh ref={spark} geometry={facet()} scale={0.022} position={PINCH} material={sparkMat} />
        </group>
      </group>
    </group>
  );
}
