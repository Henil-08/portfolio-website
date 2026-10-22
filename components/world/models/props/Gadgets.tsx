// Pedestal: static, cylinder r=0.55 h=1.0 (top at y=1.0). Gadgets sit on top at y~1.05,
// origin at their own bottom center; they're visual only (no collider needed).
// Phone ~0.62 x 1.05 x 0.3   Laptop ~0.95 x 0.65 x 0.75   Headset ~0.8 x 0.45 x 0.6   Chip ~0.7 x 0.2 x 0.7
"use client";

import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { C } from "../../palette";
import { ChipModel } from "./Lab";
import { geo, lowSphere, mat, unitBox, unitCyl, type GroupProps } from "./shared";

function pedestalGeo() {
  return geo("pedestal", () => {
    const pts = [
      [0, 0],
      [0.6, 0],
      [0.62, 0.04],
      [0.6, 0.12],
      [0.46, 0.2],
      [0.42, 0.3],
      [0.42, 0.82],
      [0.5, 0.88],
      [0.56, 0.93],
      [0.56, 0.98],
      [0.52, 1.0],
      [0, 1.0],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 32);
  });
}

function ringGeo() {
  return geo("pedestal-ring", () => {
    const g = new THREE.TorusGeometry(0.43, 0.04, 8, 32);
    g.rotateX(Math.PI / 2);
    return g;
  });
}

/** Round showcase pedestal, 1 m tall with a red trim ring. */
export function Pedestal({ accent = C.red, ...props }: GroupProps & { accent?: string }) {
  return (
    <group {...props}>
      <mesh geometry={pedestalGeo()} material={mat(C.cream, { r: 0.6 })} castShadow receiveShadow />
      <mesh geometry={ringGeo()} position={[0, 0.78, 0]} material={mat(accent, { r: 0.6 })} castShadow />
      <mesh geometry={unitCyl()} scale={[0.5, 0.02, 0.5]} position={[0, 1.0, 0]} material={mat(accent, { r: 0.6 })} receiveShadow />
    </group>
  );
}

const APP_COLORS = [C.red, C.yellow, C.teal, C.purple, C.blue, C.orange, C.pink, C.white, C.grass];

/** Oversized phone standing on a little kickstand, glowing screen with app tiles. Faces +Z. */
export function Phone(props: GroupProps) {
  return (
    <group {...props}>
      <group position={[0, 0.54, 0]} rotation={[-0.12, 0, 0]}>
        <RoundedBox args={[0.6, 1.0, 0.09]} radius={0.04} smoothness={4} material={mat(C.ink, { r: 0.4, m: 0.2 })} castShadow receiveShadow />
        <RoundedBox args={[0.52, 0.9, 0.02]} radius={0.008} smoothness={2} position={[0, 0, 0.044]} material={mat(C.blue, { glow: 0.55, e: C.purple, r: 0.3 })} />
        {/* app grid */}
        {APP_COLORS.map((c, i) => (
          <RoundedBox
            key={i}
            args={[0.11, 0.11, 0.02]}
            radius={0.008}
            smoothness={2}
            position={[-0.15 + (i % 3) * 0.15, 0.22 - Math.floor(i / 3) * 0.16, 0.055]}
            material={mat(c, { glow: 0.5, r: 0.4 })}
          />
        ))}
        {/* camera bumps on the back */}
        <mesh geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.06, 0.04, 0.06]} position={[-0.17, 0.38, -0.055]} material={mat(C.jacketBlack, { r: 0.3 })} />
        <mesh geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.06, 0.04, 0.06]} position={[-0.17, 0.24, -0.055]} material={mat(C.jacketBlack, { r: 0.3 })} />
      </group>
      {/* stand */}
      <RoundedBox args={[0.32, 0.06, 0.34]} radius={0.025} smoothness={2} position={[0, 0.03, -0.02]} material={mat(C.metal, { r: 0.4, m: 0.3 })} castShadow receiveShadow />
    </group>
  );
}

/** Open laptop, screen glowing with chunky code lines. Faces +Z. */
export function Laptop(props: GroupProps) {
  const lines: [number, number, string][] = [
    [0.0, 0.4, C.purple],
    [0.08, 0.5, C.yellow],
    [0.08, 0.32, C.teal],
    [0.0, 0.22, C.pink],
    [0.08, 0.44, C.teal],
    [0.16, 0.28, C.orange],
  ];
  return (
    <group {...props}>
      {/* base */}
      <RoundedBox args={[0.95, 0.06, 0.66]} radius={0.025} smoothness={3} position={[0, 0.03, 0.1]} material={mat(C.metal, { r: 0.35, m: 0.3 })} castShadow receiveShadow />
      <RoundedBox args={[0.82, 0.02, 0.34]} radius={0.008} smoothness={2} position={[0, 0.062, 0.04]} material={mat(C.ink, { r: 0.6 })} receiveShadow />
      <RoundedBox args={[0.3, 0.012, 0.15]} radius={0.005} smoothness={2} position={[0, 0.062, 0.31]} material={mat(C.rock, { r: 0.4 })} receiveShadow />
      {/* lid, hinged at the back edge */}
      <group position={[0, 0.06, -0.21]} rotation={[-0.3, 0, 0]}>
        <RoundedBox args={[0.95, 0.62, 0.04]} radius={0.018} smoothness={3} position={[0, 0.31, 0]} material={mat(C.metal, { r: 0.35, m: 0.3 })} castShadow receiveShadow />
        <mesh geometry={unitBox()} scale={[0.84, 0.5, 0.01]} position={[0, 0.32, 0.021]} material={mat(C.ink, { glow: 0.25, e: C.blue, r: 0.3 })} />
        {lines.map(([indent, w, c], i) => (
          <mesh key={i} geometry={unitBox()} scale={[w, 0.035, 0.01]} position={[-0.36 + indent + w / 2, 0.5 - i * 0.07, 0.028]} material={mat(c, { glow: 1.0, r: 0.4 })} />
        ))}
        {/* sticker on the back */}
        <mesh geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.09, 0.01, 0.09]} position={[0.2, 0.36, -0.022]} material={mat(C.red, { r: 0.6 })} />
      </group>
    </group>
  );
}

function strapGeo() {
  return geo("vr-strap", () => {
    const g = new THREE.TorusGeometry(0.3, 0.05, 8, 24, Math.PI);
    g.rotateY(Math.PI / 2);
    g.rotateZ(Math.PI / 2);
    g.scale(1.25, 1, 1);
    return g;
  });
}

/** Chunky VR headset with a glossy visor and head strap. Faces +Z. */
export function Headset(props: GroupProps) {
  return (
    <group {...props}>
      <group position={[0, 0.25, 0.08]} rotation={[-0.08, 0, 0]}>
        <RoundedBox args={[0.78, 0.4, 0.34]} radius={0.15} smoothness={4} material={mat(C.white, { r: 0.45 })} castShadow receiveShadow />
        <RoundedBox args={[0.7, 0.32, 0.06]} radius={0.12} smoothness={4} position={[0, 0, 0.16]} material={mat(C.ink, { r: 0.15, m: 0.2 })} castShadow />
        {/* visor glint + side buttons */}
        <mesh geometry={unitBox()} scale={[0.22, 0.04, 0.01]} position={[-0.14, 0.08, 0.195]} rotation={[0, 0, 0.25]} material={mat(C.teal, { glow: 0.9 })} />
        <mesh geometry={lowSphere()} scale={0.045} position={[0.39, 0.05, 0.04]} material={mat(C.purple, { r: 0.5 })} />
        {/* face cushion */}
        <RoundedBox args={[0.66, 0.3, 0.1]} radius={0.05} smoothness={2} position={[0, -0.01, -0.19]} material={mat(C.jacketBlack, { r: 0.9 })} castShadow />
      </group>
      <mesh geometry={strapGeo()} position={[0, 0.25, -0.12]} material={mat(C.purple, { r: 0.7 })} castShadow />
      {/* tiny stand */}
      <mesh geometry={unitCyl()} scale={[0.18, 0.05, 0.18]} position={[0, 0.025, 0]} material={mat(C.metal, { r: 0.4, m: 0.3 })} castShadow receiveShadow />
      <mesh geometry={unitCyl()} scale={[0.05, 0.1, 0.05]} position={[0, 0.08, 0.05]} material={mat(C.metal, { r: 0.4, m: 0.3 })} castShadow />
    </group>
  );
}

/** Small microchip, tilted on a stand so its glowing die faces the viewer. */
export function Chip(props: GroupProps) {
  return (
    <group {...props}>
      <mesh geometry={unitCyl()} scale={[0.05, 0.25, 0.05]} position={[0, 0.125, 0]} material={mat(C.metal, { r: 0.4, m: 0.3 })} castShadow />
      <ChipModel size={0.62} position={[0, 0.3, 0.02]} rotation={[0.75, 0, 0]} />
    </group>
  );
}
