// Static. "Side quest" chip lab. Footprint 7 x 6 (W x D), body 4 m tall, chip sculpture on the roof to ~5.2 m.
// Collider: cuboid 7 x 4 x 6 centered at (0, 2, 0). Entrance faces +Z (no interior).
"use client";

import { RoundedBox } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { Label } from "./Label";
import { mat, unitBox, unitCyl, type GroupProps } from "./shared";

const W = 7;
const D = 6;
const H = 4;
const ZF = D / 2;

/** Pins around a square chip package, instanced. */
function Pins({ size, n, len, thick, y }: { size: number; n: number; len: number; thick: number; y: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = n * 4;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    let k = 0;
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < n; i++) {
        const t = ((i + 0.5) / n - 0.5) * size * 0.84;
        const out = size / 2 + len / 2 - 0.01;
        o.rotation.set(0, (side * Math.PI) / 2, 0);
        const c = Math.cos(o.rotation.y);
        const s = Math.sin(o.rotation.y);
        o.position.set(t * c + out * s, y, -t * s + out * c);
        o.scale.set(thick * 1.4, thick * 0.6, len);
        o.updateMatrix();
        m.setMatrixAt(k++, o.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  }, [n, size, len, thick, y]);
  return <instancedMesh ref={ref} args={[unitBox(), mat(C.silver, { r: 0.25, m: 0.6 }), count]} castShadow receiveShadow />;
}

/** Fine circuit traces etched into the lid: thin glowing teal lines. */
function Traces({ s, y }: { s: number; y: number }) {
  const lines = useMemo(
    () =>
      [
        // x, z, w, d (in lid units -0.5..0.5)
        [0, -0.36, 0.72, 0.018],
        [0, 0.36, 0.72, 0.018],
        [-0.36, 0, 0.018, 0.72],
        [0.36, 0, 0.018, 0.72],
        [-0.18, -0.1, 0.018, 0.5],
        [0.18, 0.1, 0.018, 0.5],
        [-0.09, 0.15, 0.18, 0.018],
        [0.09, -0.15, 0.18, 0.018],
      ] as [number, number, number, number][],
    [],
  );
  const glow = mat(C.teal, { glow: 2.2, r: 0.4 });
  return (
    <>
      {lines.map(([x, z, w, d], i) => (
        <mesh key={i} geometry={unitBox()} scale={[w * s, 0.004 * s + 0.002, d * s]} position={[x * s, y, z * s]} material={glow} />
      ))}
    </>
  );
}

/** Refined microchip: charcoal package, silver pins, brushed lid with a glowing teal core. Origin at its bottom center. */
export function ChipModel({ size = 1, ...props }: GroupProps & { size?: number }) {
  const h = size * 0.12;
  const lid = size * 0.66;
  return (
    <group {...props}>
      <RoundedBox args={[size, h, size]} radius={Math.min(0.04 * size, h / 2 - 0.001)} smoothness={3} position={[0, h / 2, 0]} material={mat(C.charcoal, { r: 0.35, m: 0.1 })} castShadow receiveShadow />
      <Pins size={size} n={8} len={size * 0.1} thick={Math.max(0.02, size * 0.03)} y={h * 0.3} />
      {/* teal light seam between package and lid */}
      <mesh geometry={unitBox()} scale={[lid + size * 0.03, h * 0.08, lid + size * 0.03]} position={[0, h + h * 0.04, 0]} material={mat(C.teal, { glow: 2.0 })} />
      <RoundedBox args={[lid, h * 0.32, lid]} radius={Math.min(0.02 * size, h * 0.15)} smoothness={3} position={[0, h + h * 0.08 + h * 0.16, 0]} material={mat(C.greyLight, { r: 0.22, m: 0.55 })} castShadow receiveShadow />
      <Traces s={lid} y={h + h * 0.4 + 0.001} />
      {/* glowing core */}
      <mesh geometry={unitBox()} scale={[lid * 0.22, h * 0.02 + 0.002, lid * 0.22]} position={[0, h + h * 0.4 + 0.001, 0]} material={mat(C.teal, { glow: 2.6 })} />
      {/* pin-1 mark */}
      <mesh geometry={unitCyl()} scale={[size * 0.025, h * 0.05, size * 0.025]} position={[-size * 0.42, h, size * 0.42]} material={mat(C.white, { r: 0.4 })} />
    </group>
  );
}

/** Side quest lab: sleek white pavilion with a charcoal glass ribbon and a glowing chip sculpture on the roof. Faces +Z. */
export function Lab(props: GroupProps) {
  const white = mat(C.white, { r: 0.3 });
  const ink = mat(C.ink, { r: 0.45, m: 0.1 });
  const glass = mat("#1e2a30", { r: 0.08, m: 0.4 });
  const tealGlow = mat(C.teal, { glow: 1.8 });
  const steel = mat(C.metal, { r: 0.3, m: 0.5 });
  return (
    <group {...props}>
      {/* charcoal plinth, recessed */}
      <RoundedBox args={[W - 0.2, 0.3, D - 0.2]} radius={0.04} smoothness={2} position={[0, 0.15, 0]} material={ink} castShadow receiveShadow />
      {/* white volume */}
      <RoundedBox args={[W, H - 0.55, D]} radius={0.12} smoothness={4} position={[0, 0.3 + (H - 0.55) / 2, 0]} material={white} castShadow receiveShadow />
      {/* thin cantilevered roof slab */}
      <RoundedBox args={[W + 0.5, 0.25, D + 0.5]} radius={0.05} smoothness={3} position={[0, H - 0.125, 0]} material={white} castShadow receiveShadow />
      {/* teal LED line under the roof edge */}
      <mesh geometry={unitBox()} scale={[W + 0.02, 0.05, D + 0.02]} position={[0, H - 0.28, 0]} material={tealGlow} />

      {/* glass ribbon wrapping front and sides */}
      <mesh geometry={unitBox()} scale={[W + 0.02, 1.1, D - 1.2]} position={[0, 2.35, -0.3]} material={glass} castShadow />
      <group position={[0, 0, ZF]}>
        {/* front glazing band with fine mullions */}
        <mesh geometry={unitBox()} scale={[W - 2.8, 1.1, 0.04]} position={[1.0, 2.35, 0.01]} material={glass} />
        {[-0.5, 0.5, 1.5, 2.5].map((x) => (
          <mesh key={x} geometry={unitBox()} scale={[0.04, 1.1, 0.06]} position={[x, 2.35, 0.02]} material={steel} />
        ))}
        {/* recessed full-height entrance with a glowing portal frame */}
        <mesh geometry={unitBox()} scale={[1.7, 2.75, 0.1]} position={[-2.35, 0.3 + 1.375, -0.02]} material={ink} />
        <mesh geometry={unitBox()} scale={[1.3, 2.4, 0.04]} position={[-2.35, 0.3 + 1.2, 0.04]} material={glass} />
        <mesh geometry={unitBox()} scale={[0.03, 2.4, 0.06]} position={[-2.35, 0.3 + 1.2, 0.05]} material={steel} />
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={unitBox()} scale={[0.05, 2.75, 0.06]} position={[-2.35 + s * 0.85, 0.3 + 1.375, 0.04]} material={tealGlow} />
        ))}
        <mesh geometry={unitBox()} scale={[1.75, 0.05, 0.06]} position={[-2.35, 0.3 + 2.75, 0.04]} material={tealGlow} />
        {/* step */}
        <mesh geometry={unitBox()} scale={[1.9, 0.12, 0.6]} position={[-2.35, 0.06, 0.3]} material={mat(C.greyLight, { r: 0.6 })} castShadow receiveShadow />

        {/* sign: charcoal fascia panel, white Racero headline, teal subline */}
        <RoundedBox args={[3.9, 0.78, 0.08]} radius={0.03} smoothness={2} position={[1.0, 3.25, 0.04]} material={ink} castShadow />
        <Label position={[1.0 - 1.75, 3.33, 0.085]} anchorX="left" fontSize={0.42} color={C.white} letterSpacing={0.03}>
          SIDE QUEST
        </Label>
        <Label position={[1.0 - 1.75, 3.02, 0.085]} anchorX="left" fontSize={0.11} color={C.teal} letterSpacing={0.16}>
          AI FOR CHIP DESIGN · LAB 02
        </Label>
        <mesh geometry={unitBox()} scale={[0.06, 0.6, 0.01]} position={[1.0 + 1.8, 3.25, 0.085]} material={tealGlow} />
        {/* small red brand tick bottom left */}
        <mesh geometry={unitBox()} scale={[0.5, 0.06, 0.02]} position={[1.0, 0.9, 0.0]} material={mat(C.red, { r: 0.35 })} />
        <Label position={[1.0, 0.72, 0.012]} fontSize={0.1} color={C.greyDark} letterSpacing={0.2}>
          HG-08
        </Label>
      </group>

      {/* roof: rooftop deck + chip sculpture floating on a slim column with teal glow underneath */}
      <mesh geometry={unitBox()} scale={[3.6, 0.04, 3.6]} position={[0, H + 0.02, 0]} material={ink} receiveShadow />
      {/* fine teal light frame around the deck */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={unitBox()} scale={[3.6, 0.03, 0.04]} position={[0, H + 0.05, s * 1.8]} material={tealGlow} />
          <mesh geometry={unitBox()} scale={[0.04, 0.03, 3.6]} position={[s * 1.8, H + 0.05, 0]} material={tealGlow} />
        </group>
      ))}
      <mesh geometry={unitCyl()} scale={[0.6, 0.02, 0.6]} position={[0, H + 0.05, 0]} material={mat(C.teal, { glow: 1.2 })} />
      <mesh geometry={unitCyl()} scale={[0.22, 0.55, 0.22]} position={[0, H + 0.3, 0]} material={steel} castShadow />
      <ChipModel size={3.2} position={[0, H + 0.58, 0]} rotation={[0, Math.PI / 4, 0]} />
      {/* antenna mast */}
      <mesh geometry={unitCyl()} scale={[0.025, 1.0, 0.025]} position={[3.0, H + 0.5, -2.5]} material={steel} castShadow />
      <mesh geometry={unitCyl()} scale={[0.05, 0.05, 0.05]} position={[3.0, H + 1.02, -2.5]} material={tealGlow} />
    </group>
  );
}
