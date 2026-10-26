// Agents and LLM systems showcase objects: AppSage, Verta, Chat with SQL,
// Elder Knowledge AI and the Resume Parser.
"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { Label } from "../props/Label";
import { mat, unitBox } from "../props/shared";
import { Block, facet, prism, Bars, Bone, M, extruded, lathe, setGlow, setOpacity, useGlowMat, useLive, type BarSpec, type ObjProps } from "./common";

// ---------------------------------------------------------------- AppSage

function shieldShape() {
  const s = new THREE.Shape();
  const k = 0.34;
  const P = (x: number, y: number) => [x * k, y * k] as const;
  s.moveTo(...P(0, 0.5));
  s.quadraticCurveTo(...P(0.28, 0.4), ...P(0.5, 0.44));
  s.lineTo(...P(0.5, 0.05));
  s.quadraticCurveTo(...P(0.46, -0.36), ...P(0, -0.62));
  s.quadraticCurveTo(...P(-0.46, -0.36), ...P(-0.5, 0.05));
  s.lineTo(...P(-0.5, 0.44));
  s.quadraticCurveTo(...P(-0.28, 0.4), ...P(0, 0.5));
  return s;
}

const SHEET_LINES: BarSpec[] = [0, 1, 2, 3, 4, 5].map((i) => {
  const w = [0.26, 0.3, 0.22, 0.3, 0.18, 0.26][i];
  return [-0.15 + w / 2, 0.06 - i * 0.05, 0.009, w, 0.016, 0.004];
});

function Sheet({ front = false }: { front?: boolean }) {
  return (
    <group>
      <Block args={[0.4, 0.52, 0.014]} radius={0.006} smoothness={2} material={M.white()} castShadow receiveShadow />
      {front && (
        <>
          <mesh geometry={unitBox()} scale={[0.4, 0.07, 0.004]} position={[0, 0.225, 0.008]} material={M.red()} />
          <mesh geometry={prism()} rotation={[Math.PI / 2, 0, 0]} scale={[0.045, 0.004, 0.045]} position={[-0.11, 0.13, 0.009]} material={M.greyLight()} />
          <mesh geometry={unitBox()} scale={[0.17, 0.022, 0.004]} position={[0.04, 0.145, 0.009]} material={M.ink()} />
          <mesh geometry={unitBox()} scale={[0.12, 0.014, 0.004]} position={[0.015, 0.11, 0.009]} material={M.grey()} />
          <Bars items={SHEET_LINES} material={M.greyLight()} />
        </>
      )}
    </group>
  );
}

/** A fanned stack of resume sheets with a red privacy shield and lock in front. */
export function AppSage({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const shield = useRef<THREE.Group>(null);
  const key = useGlowMat(C.white, 1.0);
  useFrame(() => {
    const { a, t } = live.current;
    if (shield.current) {
      shield.current.position.y = 0.24 + Math.sin(t * 1.5) * 0.02;
      shield.current.rotation.y = Math.sin(t * 0.7) * 0.25;
    }
    setGlow(key, 0.8 + a * 1.8 + 0.3 * Math.sin(t * 4));
  });
  const g = extruded("shield", shieldShape, 0.05, 0.022, 4);
  return (
    <group {...props}>
      <Block args={[0.66, 0.04, 0.46]} radius={0.015} smoothness={2} position={[0, 0.02, 0]} material={M.cream()} castShadow receiveShadow />
      <group position={[-0.1, 0.04, -0.1]}>
        <group position={[0.06, 0.26, -0.06]} rotation={[-0.16, 0, -0.12]}>
          <Sheet />
        </group>
        <group position={[-0.05, 0.26, -0.03]} rotation={[-0.16, 0, 0.08]}>
          <Sheet />
        </group>
        <group position={[0, 0.26, 0]} rotation={[-0.14, 0, -0.02]}>
          <Sheet front />
        </group>
      </group>
      <group ref={shield} position={[0.19, 0.24, 0.14]}>
        <mesh geometry={g} material={M.red()} castShadow />
        {/* lock */}
        <group position={[0, 0.0, 0.05]}>
          <Block args={[0.11, 0.085, 0.03]} radius={0.012} smoothness={2} position={[0, -0.02, 0]} material={M.white()} castShadow />
          <mesh position={[0, 0.022, 0]} material={M.white()} castShadow>
            <torusGeometry args={[0.032, 0.011, 4, 12, Math.PI]} />
          </mesh>
          <mesh geometry={prism()} rotation={[Math.PI / 2, 0, 0]} scale={[0.013, 0.004, 0.013]} position={[0, -0.012, 0.016]} material={key} />
          <mesh geometry={unitBox()} scale={[0.008, 0.022, 0.004]} position={[0, -0.03, 0.016]} material={key} />
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- Verta

const Y0 = 0.2; // basket floor
function sideShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.28, Y0);
  s.lineTo(0.18, Y0);
  s.lineTo(0.3, Y0 + 0.3);
  s.lineTo(-0.33, Y0 + 0.3);
  s.closePath();
  return s;
}

const SLOTS: BarSpec[] = [0.07, 0.14, 0.21].map((dy) => [-0.03 + dy * 0.12, Y0 + dy, 0, 0.38 + dy * 0.18, 0.018, 0.006]);

/** Sleek white shopping cart with a red chat bubble, typing dots bouncing. */
export function Verta({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const dots = useRef<(THREE.Mesh | null)[]>([]);
  const bubble = useRef<THREE.Group>(null);
  const dotMat = useGlowMat(C.white, 1.0);
  useFrame(() => {
    const { a, t } = live.current;
    dots.current.forEach((d, i) => {
      if (d) d.position.y = Math.max(0, Math.sin(t * 5 - i * 0.9)) * 0.025;
    });
    if (bubble.current) bubble.current.position.y = 0.82 + Math.sin(t * 1.4) * 0.018;
    setGlow(dotMat, 0.8 + a * 1.5);
  });
  const side = extruded("cart-side", sideShape, 0.02, 0.004, 2, false);
  const wheels: [number, number][] = [
    [-0.26, -0.14],
    [-0.26, 0.14],
    [0.2, -0.14],
    [0.2, 0.14],
  ];
  return (
    <group {...props}>
      <group position={[-0.04, 0, 0]} rotation={[0, -0.35, 0]}>
        {/* wheels + chassis */}
        {wheels.map(([x, z]) => (
          <mesh key={`${x}${z}`} geometry={prism()} rotation={[Math.PI / 2, 0, 0]} scale={[0.045, 0.035, 0.045]} position={[x, 0.045, z]} material={M.rubber()} castShadow />
        ))}
        <Block args={[0.52, 0.02, 0.3]} radius={0.008} smoothness={2} position={[-0.03, 0.1, 0]} material={M.alu()} castShadow />
        {[-0.14, 0.14].map((z) => (
          <group key={z}>
            <Bone a={[-0.26, 0.06, z]} b={[-0.29, Y0, z]} r={0.011} material={M.alu()} />
            <Bone a={[0.2, 0.06, z]} b={[0.17, Y0, z]} r={0.011} material={M.alu()} />
            <Bone a={[-0.33, Y0 + 0.29, z]} b={[-0.43, Y0 + 0.36, z]} r={0.012} material={M.alu()} />
          </group>
        ))}
        <Bone a={[-0.43, Y0 + 0.36, -0.2]} b={[-0.43, Y0 + 0.36, 0.2]} r={0.022} material={M.red()} />
        {/* basket */}
        <mesh geometry={unitBox()} scale={[0.46, 0.02, 0.34]} position={[-0.05, Y0 + 0.01, 0]} material={M.white()} castShadow receiveShadow />
        {[-0.18, 0.16].map((z) => (
          <mesh key={z} geometry={side} position={[0, 0, z]} material={M.white()} castShadow receiveShadow />
        ))}
        <group position={[0, 0, 0.183]}>
          <Bars items={SLOTS} material={M.greyLight()} />
        </group>
        <mesh geometry={unitBox()} scale={[0.02, 0.323, 0.34]} position={[0.24, Y0 + 0.15, 0]} rotation={[0, 0, -0.38]} material={M.white()} castShadow />
        <mesh geometry={unitBox()} scale={[0.02, 0.305, 0.34]} position={[-0.305, Y0 + 0.15, 0]} rotation={[0, 0, 0.165]} material={M.white()} castShadow />
        <mesh geometry={unitBox()} scale={[0.66, 0.016, 0.02]} position={[-0.015, Y0 + 0.3, 0.19]} material={M.red()} />
        {/* shopping peeking out */}
        <Block args={[0.14, 0.36, 0.1]} radius={0.015} smoothness={2} position={[-0.16, Y0 + 0.2, -0.02]} rotation={[0, 0, 0.12]} material={M.cream()} castShadow />
        <mesh geometry={prism()} scale={[0.045, 0.34, 0.045]} position={[0.04, Y0 + 0.19, 0.02]} material={M.ink()} castShadow />
        <mesh geometry={prism()} scale={[0.02, 0.03, 0.02]} position={[0.04, Y0 + 0.375, 0.02]} material={M.red()} />
      </group>
      {/* chat bubble */}
      <group ref={bubble} position={[0.2, 0.82, 0.04]}>
        <Block args={[0.36, 0.2, 0.08]} radius={0.05} smoothness={4} material={M.red()} castShadow />
        <mesh position={[-0.1, -0.11, 0]} rotation={[0, 0, Math.PI + 0.55]} material={M.red()} castShadow>
          <coneGeometry args={[0.04, 0.09, 20]} />
        </mesh>
        {[-0.08, 0, 0.08].map((x, i) => (
          <group key={x} position={[x, -0.012, 0.042]}>
            <mesh
              ref={(m) => {
                dots.current[i] = m;
              }}
              geometry={facet()}
              scale={0.022}
              material={dotMat}
            />
          </group>
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- Chat with SQL

function tierGeo() {
  const r = 0.24;
  const h = 0.15;
  const f = 0.018;
  return lathe(
    "db-tier",
    [
      [0, -h / 2],
      [r - f, -h / 2],
      [r - f * 0.3, -h / 2 + f * 0.3],
      [r, -h / 2 + f],
      [r, h / 2 - f],
      [r - f * 0.3, h / 2 - f * 0.3],
      [r - f, h / 2],
      [0, h / 2],
    ],
    56,
  );
}

/** A three-tier database cylinder with blinking status lights and a SELECT speech bubble. */
export function SqlChat({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const leds = [useGlowMat(C.red, 1.6), useGlowMat(C.paper, 1.6), useGlowMat(C.white, 1.2)];
  const bubble = useRef<THREE.Group>(null);
  const cursor = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const { a, t } = live.current;
    leds.forEach((m, i) => {
      setGlow(m, (Math.sin(t * (2.2 + i * 0.9) + i * 2) > 0.1 ? 1.6 : 0.3) * (1 + a));
    });
    if (bubble.current) bubble.current.position.y = 0.74 + Math.sin(t * 1.3) * 0.018;
    if (cursor.current) cursor.current.visible = Math.sin(t * 6) > 0;
  });
  return (
    <group {...props}>
      <group position={[-0.1, 0, 0]}>
        <mesh geometry={prism()} scale={[0.25, 0.02, 0.25]} position={[0, 0.01, 0]} material={M.ink()} castShadow receiveShadow />
        {[0, 1, 2].map((i) => {
          const y = 0.02 + 0.075 + i * 0.17;
          return (
            <group key={i} position={[0, y, 0]}>
              <mesh geometry={tierGeo()} material={M.white()} castShadow receiveShadow />
              {i < 2 && <mesh geometry={prism()} scale={[0.226, 0.02, 0.226]} position={[0, 0.085, 0]} material={M.red()} />}
              <mesh geometry={unitBox()} scale={[0.03, 0.03, 0.01]} position={[0.1, 0, 0.215]} rotation={[0, 0.43, 0]} material={leds[i]} />
              <mesh geometry={unitBox()} scale={[0.12, 0.012, 0.008]} position={[-0.06, 0, 0.233]} rotation={[0, -0.25, 0]} material={M.greyLight()} />
            </group>
          );
        })}
      </group>
      <group ref={bubble} position={[0.2, 0.74, 0.1]} rotation={[0, -0.2, 0]}>
        <Block args={[0.44, 0.2, 0.07]} radius={0.05} smoothness={4} material={M.ink()} castShadow />
        <mesh position={[-0.13, -0.11, 0]} rotation={[0, 0, Math.PI + 0.6]} material={M.ink()} castShadow>
          <coneGeometry args={[0.035, 0.08, 20]} />
        </mesh>
        <Label position={[-0.02, 0, 0.037]} fontSize={0.06} color={C.white} letterSpacing={0.04}>
          SELECT *
        </Label>
        <mesh ref={cursor} geometry={unitBox()} scale={[0.012, 0.06, 0.004]} position={[0.155, 0, 0.037]} material={M.glowRed(1.8)} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- Elder Knowledge AI

/** A vintage broadcast mic whose sound-wave rings travel into an open book. */
export function ElderKnowledge({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const ringMats = [useGlowMat(C.red, 1.4, 0.9), useGlowMat(C.red, 1.4, 0.9), useGlowMat(C.red, 1.4, 0.9)];
  const page = useGlowMat(C.white, 0.15);
  useFrame(() => {
    const { a, t } = live.current;
    rings.current.forEach((r, i) => {
      if (!r) return;
      const p = (t * 0.45 + i / 3) % 1;
      // grow out of the mic, then fold down into the book
      r.position.set(-0.13 + p * 0.33, 0.43 - p * p * 0.2, 0.02);
      const s = 0.05 + Math.sin(p * Math.PI) * 0.1;
      r.scale.set(s, s, s);
      setOpacity(ringMats[i], Math.sin(p * Math.PI) * 0.9);
      setGlow(ringMats[i], 1.2 + a * 1.6);
    });
    setGlow(page, 0.12 + a * 0.35 + 0.08 * Math.sin(t * 2));
  });
  return (
    <group {...props}>
      <Block args={[0.84, 0.04, 0.42]} radius={0.015} smoothness={2} position={[0, 0.02, 0]} material={M.cream()} castShadow receiveShadow />
      {/* microphone */}
      <group position={[-0.24, 0.04, 0]}>
        <mesh geometry={prism()} scale={[0.1, 0.025, 0.1]} position={[0, 0.0125, 0]} material={M.ink()} castShadow receiveShadow />
        <Bone a={[0, 0.02, 0]} b={[0, 0.3, 0]} r={0.014} material={M.chrome()} />
        <mesh position={[0, 0.39, 0]} rotation={[0, 0, Math.PI]} material={M.chrome()} castShadow>
          <torusGeometry args={[0.1, 0.012, 4, 12, Math.PI]} />
        </mesh>
        <group position={[0, 0.4, 0]} rotation={[0, 0, -0.25]}>
          <mesh material={M.chrome()} castShadow>
            <capsuleGeometry args={[0.085, 0.13, 8, 24]} />
          </mesh>
          {[-0.09, -0.045, 0.045, 0.09].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.ink()}>
              <torusGeometry args={[0.084, 0.006, 4, 12]} />
            </mesh>
          ))}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={M.red()}>
            <torusGeometry args={[0.086, 0.014, 4, 12]} />
          </mesh>
        </group>
      </group>
      {/* sound rings */}
      {ringMats.map((m, i) => (
        <mesh
          key={i}
          ref={(r) => {
            rings.current[i] = r;
          }}
          rotation={[0, Math.PI / 2, 0]}
          material={m}
        >
          <torusGeometry args={[1, 0.06, 4, 12]} />
        </mesh>
      ))}
      {/* open book on a small reading stand */}
      <group position={[0.24, 0.1, 0.04]} rotation={[0.55, -0.3, 0]}>
        <mesh geometry={unitBox()} scale={[0.1, 0.1, 0.06]} position={[0, -0.04, -0.04]} material={M.alu()} castShadow />
        <Block args={[0.38, 0.016, 0.27]} radius={0.006} smoothness={2} material={M.red()} castShadow receiveShadow />
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.088, 0.024, 0]} rotation={[0, 0, s * 0.1]}>
            <Block args={[0.17, 0.03, 0.25]} radius={0.008} smoothness={2} material={page} castShadow receiveShadow />
            <Bars
              items={[0, 1, 2, 3, 4].map((i) => [0, 0.016, -0.08 + i * 0.04, i === 4 ? 0.08 : 0.12, 0.003, 0.012] as BarSpec)}
              material={M.greyLight()}
            />
          </group>
        ))}
        <mesh geometry={unitBox()} scale={[0.018, 0.004, 0.16]} position={[0.02, 0.006, 0.16]} material={M.redDark()} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- Resume Parser

const PAGE_LINES: BarSpec[] = [0, 1, 2, 3, 4].map((i) => [-0.02, 0.05 - i * 0.045, 0.007, [0.17, 0.2, 0.14, 0.19, 0.12][i], 0.014, 0.003]);

/** A PDF page riding a conveyor through a glowing scanner gate, a match card waiting at the far end. */
export function ResumeParser({ active, ...props }: ObjProps) {
  return (
    <group {...props}>
      <group rotation={[0, -0.55, 0]} scale={0.92}>
        <ResumeParserBody active={active} />
      </group>
    </group>
  );
}

function ResumeParserBody({ active }: { active?: boolean }) {
  const live = useLive(active);
  const page = useRef<THREE.Group>(null);
  const card = useRef<THREE.Group>(null);
  const beam = useGlowMat(C.red, 2.0);
  const curtain = useGlowMat(C.red, 1.2, 0.22);
  useFrame(() => {
    const { a, t } = live.current;
    const p = (t * 0.22) % 1;
    if (page.current) {
      page.current.position.x = -0.4 + p * 0.62;
      const s = THREE.MathUtils.smoothstep(p, 0, 0.12) * (1 - THREE.MathUtils.smoothstep(p, 0.85, 1));
      page.current.scale.setScalar(Math.max(0.001, s));
    }
    const near = Math.abs(page.current ? page.current.position.x : 1) < 0.08 ? 1 : 0;
    setGlow(beam, 1.6 + a * 1.6 + near * 2);
    setOpacity(curtain, 0.16 + near * 0.2 + a * 0.08);
    if (card.current) card.current.scale.setScalar(1 + 0.08 * THREE.MathUtils.smoothstep(p, 0.82, 0.95) * (1 - THREE.MathUtils.smoothstep(p, 0.95, 1)));
  });
  return (
    <group>
      {/* conveyor */}
      <Block args={[1.0, 0.06, 0.36]} radius={0.02} smoothness={2} position={[0, 0.03, 0]} material={M.white()} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[0.92, 0.012, 0.26]} position={[0, 0.066, 0]} material={M.ink()} receiveShadow />
      {/* scanner gate */}
      {[-0.19, 0.19].map((z) => (
        <Block key={z} args={[0.07, 0.5, 0.06]} radius={0.02} smoothness={2} position={[0, 0.31, z]} material={M.charcoal()} castShadow />
      ))}
      <Block args={[0.11, 0.08, 0.48]} radius={0.025} smoothness={2} position={[0, 0.58, 0]} material={M.charcoal()} castShadow />
      <mesh geometry={unitBox()} scale={[0.02, 0.012, 0.36]} position={[0, 0.535, 0]} material={beam} />
      <mesh geometry={unitBox()} scale={[0.004, 0.46, 0.34]} position={[0, 0.3, 0]} material={curtain} />
      <Label position={[0, 0.58, 0.242]} fontSize={0.03} color={C.white} letterSpacing={0.1}>
        PARSE
      </Label>
      {/* the page */}
      <group ref={page} position={[-0.4, 0.075, 0]}>
        <group position={[0, 0.19, 0]} rotation={[-0.05, 0, 0]}>
          <Block args={[0.24, 0.32, 0.01]} radius={0.005} smoothness={2} material={M.white()} castShadow receiveShadow />
          <mesh geometry={unitBox()} scale={[0.085, 0.04, 0.004]} position={[0.065, 0.12, 0.007]} material={M.red()} />
          <Label position={[0.065, 0.12, 0.01]} fontSize={0.026} color={C.white}>
            PDF
          </Label>
          <mesh geometry={unitBox()} scale={[0.1, 0.02, 0.003]} position={[-0.05, 0.12, 0.007]} material={M.ink()} />
          <Bars items={PAGE_LINES} material={M.greyLight()} />
        </group>
      </group>
      {/* structured output card */}
      <group ref={card} position={[0.39, 0.075, 0]}>
        <group position={[0, 0.1, 0]} rotation={[-0.2, -0.2, 0]}>
          <Block args={[0.17, 0.17, 0.02]} radius={0.02} smoothness={2} material={M.ink()} castShadow />
          <mesh geometry={prism()} rotation={[Math.PI / 2, 0, 0]} scale={[0.03, 0.006, 0.03]} position={[-0.045, 0.04, 0.012]} material={M.glowTeal(1.6)} />
          <Bars
            items={[
              [0.025, 0.04, 0.012, 0.07, 0.016, 0.004],
              [0, 0.0, 0.012, 0.12, 0.012, 0.004],
              [-0.01, -0.03, 0.012, 0.1, 0.012, 0.004],
            ]}
            material={M.glowWhite(0.8)}
          />
          <mesh geometry={unitBox()} scale={[0.12, 0.014, 0.004]} position={[0, -0.06, 0.012]} material={mat(C.red, { glow: 1.4 })} />
        </group>
      </group>
    </group>
  );
}
