// Fine-tuning and generative AI showcase objects: Freemoji, IPL Fantasy Picker, GPT from Scratch.
"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { Label } from "../props/Label";
import { mat, unitBox } from "../props/shared";
import { Block, facet, prism, Bars, M, setGlow, useGlowMat, useLive, type BarSpec, type ObjProps } from "./common";

// ---------------------------------------------------------------- Freemoji

const R = 0.34;

/** A glossy gold emoji face, squash-and-stretch bobbing on a white ring, with a sparkle. */
export function Freemoji({ active, ...props }: ObjProps) {
  const live = useLive(active, 1.2);
  const body = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const spark = useRef<THREE.Group>(null);
  const sparkMat = useGlowMat(C.white, 1.4);
  useFrame(() => {
    const { a, t } = live.current;
    const s = Math.sin(t * 2.4);
    const up = s * 0.5 + 0.5;
    if (body.current) {
      // squash at the bottom of the bob, stretch on the way up
      const sq = 1 - (1 - up) * (0.06 + a * 0.04);
      body.current.scale.set(2 - sq, sq, 2 - sq);
      body.current.position.y = 0.03 + up * (0.04 + a * 0.04);
      body.current.rotation.y = Math.sin(t * 0.6) * 0.3;
    }
    if (eyes.current) eyes.current.scale.y = (t % 3.2) > 3.05 ? 0.15 : 1;
    if (spark.current) {
      spark.current.rotation.z = t * 1.2;
      spark.current.scale.setScalar(0.8 + 0.3 * Math.sin(t * 3) + a * 0.3);
    }
    setGlow(sparkMat, 1.2 + a * 1.6);
  });
  const face = mat(C.paper, { r: 0.6, flat: true });
  return (
    <group {...props}>
      <mesh position={[0, 0.022, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.white()} castShadow receiveShadow>
        <torusGeometry args={[0.13, 0.022, 4, 12]} />
      </mesh>
      <group ref={body}>
        <group position={[0, R + 0.01, 0]}>
          <mesh geometry={facet()} scale={R} material={face} castShadow receiveShadow />
          <group ref={eyes} position={[0, 0.08, 0]}>
            {[-1, 1].map((s) => (
              <group key={s}>
                <mesh geometry={facet()} scale={[0.038, 0.062, 0.03]} position={[s * 0.105, 0, 0.312]} material={M.ink()} />
                <mesh geometry={facet()} scale={0.012} position={[s * 0.105 + 0.01, 0.025, 0.338]} material={M.white()} />
              </group>
            ))}
          </group>
          <mesh position={[0, -0.02, 0.298]} rotation={[-0.3, 0, -Math.PI / 2 - Math.PI * 0.36]} material={M.ink()}>
            <torusGeometry args={[0.13, 0.019, 4, 12, Math.PI * 0.72]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={facet()} scale={[0.05, 0.028, 0.015]} position={[s * 0.19, -0.04, 0.268]} rotation={[0, s * 0.6, 0]} material={mat(C.concreteDark, { r: 0.8 })} />
          ))}
        </group>
      </group>
      <group ref={spark} position={[0.32, 0.72, 0.1]}>
        <mesh scale={[0.018, 0.075, 0.018]} material={sparkMat}>
          <octahedronGeometry />
        </mesh>
        <mesh scale={[0.075, 0.018, 0.018]} material={sparkMat}>
          <octahedronGeometry />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- IPL Fantasy Picker

const XI_LINES: BarSpec[] = [0, 1, 2, 3, 4].map((i) => [0.02, 0.03 - i * 0.034, 0.008, [0.12, 0.1, 0.13, 0.09, 0.11][i], 0.012, 0.003]);
const XI_DOTS: BarSpec[] = [0, 1, 2, 3, 4].map((i) => [-0.075, 0.03 - i * 0.034, 0.008, 0.016, 0.016, 0.003]);

/** A cricket bat leaning across a spinning red ball and a little XI team sheet. */
export function IplFantasy({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const ball = useRef<THREE.Group>(null);
  const star = useGlowMat(C.paper, 1.0);
  useFrame(() => {
    const { a, t } = live.current;
    if (ball.current) {
      ball.current.position.y = 0.3 + Math.sin(t * 1.8) * 0.03;
      ball.current.rotation.x = t * 1.5;
    }
    setGlow(star, 0.8 + a * 1.6 + 0.3 * Math.sin(t * 3));
  });
  const wood = mat(C.charcoal, { r: 0.6, flat: true });
  return (
    <group {...props}>
      <Block args={[0.74, 0.04, 0.44]} radius={0.015} smoothness={2} position={[0, 0.02, 0]} material={M.cream()} castShadow receiveShadow />
      {/* team sheet */}
      <group position={[0.17, 0.04, -0.1]} rotation={[-0.18, -0.25, 0]}>
        <mesh geometry={unitBox()} scale={[0.06, 0.04, 0.06]} position={[0, 0.02, -0.03]} material={M.alu()} castShadow />
        <group position={[0, 0.2, 0]}>
          <Block args={[0.24, 0.32, 0.012]} radius={0.01} smoothness={2} material={M.white()} castShadow receiveShadow />
          <Block args={[0.24, 0.09, 0.014]} radius={0.01} smoothness={2} position={[0, 0.115, 0.001]} material={M.red()} />
          <Label position={[0, 0.112, 0.01]} fontSize={0.07} color={C.white}>
            XI
          </Label>
          <Bars items={XI_LINES} material={M.greyLight()} />
          <Bars items={XI_DOTS} material={M.ink()} />
          <mesh geometry={unitBox()} scale={[0.016, 0.016, 0.004]} position={[-0.075, 0.03, 0.01]} material={star} />
        </group>
      </group>
      {/* bat, leaning on its toe */}
      <group position={[-0.2, 0.04, 0.02]} rotation={[0.08, 0.3, -0.5]}>
        <Block args={[0.12, 0.46, 0.045]} radius={0.018} smoothness={3} position={[0, 0.23, 0]} material={wood} castShadow receiveShadow />
        <Block args={[0.05, 0.3, 0.03]} radius={0.012} smoothness={2} position={[0, 0.2, -0.025]} material={wood} castShadow />
        <mesh geometry={unitBox()} scale={[0.122, 0.03, 0.047]} position={[0, 0.39, 0]} material={M.red()} />
        <mesh geometry={prism()} scale={[0.02, 0.2, 0.02]} position={[0, 0.56, 0]} material={M.red()} castShadow />
        <mesh geometry={prism()} scale={[0.024, 0.02, 0.024]} position={[0, 0.665, 0]} material={M.ink()} />
      </group>
      {/* ball */}
      <group ref={ball} position={[0.02, 0.3, 0.14]}>
        <mesh geometry={facet()} scale={0.07} material={mat(C.orange, { r: 0.55, flat: true })} castShadow />
        {[-0.012, 0.012].map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={M.white()}>
            <torusGeometry args={[0.0695, 0.004, 4, 12]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- GPT from Scratch

const BLOCKS = 4;
const HEADS = 4;

/** A stack of transformer blocks; each carries a row of glowing attention-head panels that ripple. */
export function GptFromScratch({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const heads = useRef<THREE.InstancedMesh>(null);
  const token = useRef<THREE.Group>(null);
  const headMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), []);
  const white = useMemo(() => new THREE.Color(C.white), []);
  const red = useMemo(() => new THREE.Color(C.red), []);
  const tmp = useMemo(() => new THREE.Color(), []);
  useLayoutEffect(() => {
    const m = heads.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let b = 0; b < BLOCKS; b++) {
      for (let h = 0; h < HEADS; h++) {
        o.position.set(-0.165 + h * 0.11, 0.06 + 0.065 + b * 0.15, 0.201);
        o.scale.set(0.085, 0.05, 0.006);
        o.updateMatrix();
        m.setMatrixAt(b * HEADS + h, o.matrix);
        m.setColorAt(b * HEADS + h, white);
      }
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    return () => headMat.dispose();
  }, [headMat, white]);
  useFrame(() => {
    const { a, t } = live.current;
    const m = heads.current;
    if (m) {
      for (let b = 0; b < BLOCKS; b++) {
        for (let h = 0; h < HEADS; h++) {
          const w = Math.max(0, Math.sin(t * 2.4 - b * 0.9 + h * 1.7));
          const k = 0.35 + w * (0.9 + a * 0.9);
          tmp.copy((b + h) % 4 === 1 ? red : white).multiplyScalar(k);
          m.setColorAt(b * HEADS + h, tmp);
        }
      }
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    if (token.current) {
      token.current.position.y = 0.76 + Math.sin(t * 1.6) * 0.025;
      token.current.rotation.y = t * 0.7;
    }
  });
  return (
    <group {...props}>
      {/* embedding base */}
      <Block args={[0.56, 0.06, 0.44]} radius={0.02} smoothness={2} position={[0, 0.03, 0]} material={M.ink()} castShadow receiveShadow />
      {Array.from({ length: BLOCKS }, (_, b) => (
        <Block
          key={b}
          args={[0.5, 0.12, 0.4]}
          radius={0.025}
          smoothness={3}
          position={[0, 0.06 + 0.07 + b * 0.15, 0]}
          material={b % 2 ? M.cream() : M.white()}
          castShadow
          receiveShadow
        />
      ))}
      {/* charcoal spacers between blocks (layer norms) */}
      <Bars items={[0, 1, 2].map((b) => [0, 0.06 + 0.14 + b * 0.15 + 0.005, 0, 0.42, 0.03, 0.32] as BarSpec)} material={M.charcoal()} />
      <instancedMesh ref={heads} args={[unitBox(), headMat, BLOCKS * HEADS]} />
      {/* residual stream: a red rod up the side */}
      <mesh geometry={prism()} scale={[0.014, 0.62, 0.014]} position={[-0.27, 0.37, 0.12]} material={M.glowRed(1.2)} />
      {/* next token */}
      <group ref={token} position={[0, 0.76, 0]}>
        <Block args={[0.11, 0.11, 0.11]} radius={0.02} smoothness={3} rotation={[0.6, 0, 0.6]} material={M.red()} castShadow />
      </group>
    </group>
  );
}
