// Pedestal: static, cylinder r=0.55 h=1.0 (top at y=1.0). Gadgets sit on top at y~1.05,
// origin at their own bottom center; they're visual only (no collider needed).
// Phone ~0.5 x 1.05 x 0.3   Laptop ~0.95 x 0.65 x 0.75   Headset ~0.7 x 0.45 x 0.6   Chip ~0.7 x 0.2 x 0.7
"use client";

import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { C } from "../../palette";
import { ChipModel } from "./Lab";
import { Label } from "./Label";
import { geo, mat, unitBox, unitCyl, type GroupProps } from "./shared";

function pedestalGeo() {
  return geo("pedestal", () => {
    // straight glossy column with crisp small fillets, set on a charcoal plinth
    const pts: [number, number][] = [
      [0, 0.1],
      [0.5, 0.1],
      [0.5, 0.95],
      [0.495, 0.985],
      [0.48, 1.0],
      [0, 1.0],
    ];
    return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 48);
  });
}

function plinthGeo() {
  return geo("pedestal-plinth", () => {
    const pts: [number, number][] = [
      [0, 0],
      [0.54, 0],
      [0.55, 0.01],
      [0.55, 0.09],
      [0.54, 0.1],
      [0, 0.1],
    ];
    return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 48);
  });
}

function ringGeo(r: number, h: number) {
  return geo(`pedestal-ring-${r}-${h}`, () => new THREE.CylinderGeometry(r, r, h, 48, 1, true));
}

/** Showcase pedestal, 1 m tall: glossy white column, charcoal plinth, thin accent line and a lit top. */
export function Pedestal({ accent = C.red, ...props }: GroupProps & { accent?: string }) {
  return (
    <group {...props}>
      <mesh geometry={plinthGeo()} material={mat(C.ink, { r: 0.4, m: 0.15 })} castShadow receiveShadow />
      <mesh geometry={pedestalGeo()} material={mat(C.white, { r: 0.22 })} castShadow receiveShadow />
      <mesh geometry={ringGeo(0.503, 0.03)} position={[0, 0.86, 0]} material={mat(accent, { r: 0.35 })} />
      {/* soft light disc on top */}
      <mesh geometry={unitCyl()} scale={[0.4, 0.006, 0.4]} position={[0, 1.003, 0]} material={mat(C.white, { glow: 0.35, r: 0.3 })} />
    </group>
  );
}

const screenOff = () => mat(C.black, { r: 0.12, m: 0.1 });
const alu = () => mat(C.metal, { r: 0.28, m: 0.55 });
const glowWhite = (k = 0.9) => mat(C.white, { glow: k, r: 0.4 });

/** Flagship phone on a slim aluminium stand, lock screen glowing. Faces +Z. */
export function Phone(props: GroupProps) {
  return (
    <group {...props}>
      <group position={[0, 0.56, 0]} rotation={[-0.1, 0, 0]}>
        {/* aluminium frame + black glass front */}
        <RoundedBox args={[0.5, 0.98, 0.06]} radius={0.028} smoothness={4} material={alu()} castShadow receiveShadow />
        <RoundedBox args={[0.484, 0.964, 0.01]} radius={0.024} smoothness={3} position={[0, 0, 0.027]} material={screenOff()} />
        {/* display: deep slate gradient, clock, widgets */}
        <mesh geometry={unitBox()} scale={[0.45, 0.93, 0.004]} position={[0, 0, 0.033]} material={mat("#1f2a33", { glow: 0.9, e: "#2a3946", r: 0.2 })} />
        <Label position={[0, 0.25, 0.037]} fontSize={0.15} color={C.white}>
          08:00
        </Label>
        <Label position={[0, 0.15, 0.037]} fontSize={0.032} color={C.greyLight} letterSpacing={0.1}>
          HG-08 · LIGHTS OUT
        </Label>
        <RoundedBox args={[0.38, 0.12, 0.006]} radius={0.02} smoothness={2} position={[0, -0.05, 0.037]} material={mat(C.white, { o: 0.9, glow: 0.25, r: 0.4 })} />
        <mesh geometry={unitBox()} scale={[0.04, 0.04, 0.004]} position={[-0.14, -0.05, 0.041]} material={mat(C.red, { glow: 1.2 })} />
        <mesh geometry={unitBox()} scale={[0.2, 0.016, 0.004]} position={[0.02, -0.035, 0.041]} material={mat(C.grey, { r: 0.4 })} />
        <mesh geometry={unitBox()} scale={[0.14, 0.016, 0.004]} position={[-0.01, -0.065, 0.041]} material={mat(C.greyLight, { r: 0.4 })} />
        <mesh geometry={unitBox()} scale={[0.14, 0.008, 0.004]} position={[0, -0.44, 0.037]} material={glowWhite(0.6)} />
        <mesh geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.02, 0.006, 0.02]} position={[0, 0.445, 0.036]} material={mat(C.black, { r: 0.2 })} />
        {/* camera island on the back */}
        <RoundedBox args={[0.2, 0.2, 0.02]} radius={0.04} smoothness={3} position={[-0.11, 0.34, -0.035]} material={alu()} castShadow />
        {[
          [-0.155, 0.385],
          [-0.065, 0.385],
          [-0.155, 0.295],
        ].map(([x, y]) => (
          <mesh key={`${x}${y}`} geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.032, 0.02, 0.032]} position={[x, y, -0.046]} material={screenOff()} />
        ))}
      </group>
      {/* stand: a slim aluminium arc */}
      <RoundedBox args={[0.3, 0.025, 0.3]} radius={0.01} smoothness={2} position={[0, 0.0125, -0.02]} material={alu()} castShadow receiveShadow />
      <RoundedBox args={[0.12, 0.5, 0.02]} radius={0.008} smoothness={2} position={[0, 0.25, -0.12]} rotation={[-0.25, 0, 0]} material={alu()} castShadow />
    </group>
  );
}

/** Open aluminium laptop, screen glowing with tidy code lines. Faces +Z. */
export function Laptop(props: GroupProps) {
  const lines: [number, number, string][] = [
    [0.0, 0.3, C.red],
    [0.06, 0.42, C.greyLight],
    [0.06, 0.26, C.teal],
    [0.12, 0.34, C.greyLight],
    [0.0, 0.18, C.red],
    [0.06, 0.4, C.greyLight],
    [0.06, 0.22, C.grey],
  ];
  return (
    <group {...props}>
      {/* base */}
      <RoundedBox args={[0.95, 0.04, 0.66]} radius={0.018} smoothness={3} position={[0, 0.02, 0.1]} material={alu()} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[0.82, 0.004, 0.3]} position={[0, 0.041, 0.02]} material={mat(C.black, { r: 0.6 })} receiveShadow />
      <RoundedBox args={[0.32, 0.004, 0.18]} radius={0.002} smoothness={1} position={[0, 0.041, 0.3]} material={mat(C.greyLight, { r: 0.25, m: 0.4 })} receiveShadow />
      {/* lid, hinged at the back edge */}
      <group position={[0, 0.04, -0.22]} rotation={[-0.28, 0, 0]}>
        <RoundedBox args={[0.95, 0.62, 0.022]} radius={0.01} smoothness={3} position={[0, 0.31, 0]} material={alu()} castShadow receiveShadow />
        <mesh geometry={unitBox()} scale={[0.93, 0.6, 0.004]} position={[0, 0.31, 0.012]} material={screenOff()} />
        <mesh geometry={unitBox()} scale={[0.86, 0.52, 0.004]} position={[0, 0.315, 0.0145]} material={mat("#1b2128", { glow: 0.9, e: "#202831", r: 0.2 })} />
        {/* editor gutter + lines */}
        <mesh geometry={unitBox()} scale={[0.12, 0.52, 0.004]} position={[-0.37, 0.315, 0.016]} material={mat("#232b34", { glow: 0.9, e: "#28313b" })} />
        {lines.map(([indent, w, c], i) => (
          <mesh key={i} geometry={unitBox()} scale={[w, 0.022, 0.004]} position={[-0.27 + indent + w / 2, 0.5 - i * 0.055, 0.018]} material={mat(c, { glow: 0.9, r: 0.4 })} />
        ))}
        {/* logo on the back */}
        <Label position={[0, 0.33, -0.012]} rotation={[0, Math.PI, 0]} fontSize={0.09} color={C.greyLight}>
          HG
        </Label>
      </group>
    </group>
  );
}

function strapGeo() {
  return geo("vr-strap", () => {
    const g = new THREE.TorusGeometry(0.28, 0.035, 10, 32, Math.PI);
    g.rotateY(Math.PI / 2);
    g.rotateZ(Math.PI / 2);
    g.scale(1.2, 1, 1);
    return g;
  });
}

/** Mixed-reality headset: curved black glass visor, aluminium frame, knit strap. Faces +Z. */
export function Headset(props: GroupProps) {
  return (
    <group {...props}>
      <group position={[0, 0.27, 0.06]} rotation={[-0.06, 0, 0]}>
        {/* frame */}
        <RoundedBox args={[0.7, 0.34, 0.2]} radius={0.12} smoothness={6} material={alu()} castShadow receiveShadow />
        {/* glass visor */}
        <RoundedBox args={[0.68, 0.32, 0.1]} radius={0.1} smoothness={6} position={[0, 0, 0.075]} material={mat(C.black, { r: 0.08, m: 0.3 })} castShadow />
        {/* subtle display glow behind the glass */}
        <RoundedBox args={[0.42, 0.12, 0.01]} radius={0.04} smoothness={2} position={[0, 0.01, 0.126]} material={mat("#1d2c33", { glow: 1.0, e: "#24444a", o: 0.85 })} />
        {/* crown + button */}
        <mesh geometry={unitCyl()} scale={[0.03, 0.035, 0.03]} position={[0.24, 0.18, -0.02]} material={alu()} />
        {/* face cushion */}
        <RoundedBox args={[0.6, 0.26, 0.08]} radius={0.04} smoothness={3} position={[0, -0.01, -0.13]} material={mat(C.greyDark, { r: 0.9 })} castShadow />
      </group>
      <mesh geometry={strapGeo()} position={[0, 0.27, -0.12]} material={mat(C.greyDark, { r: 0.9 })} castShadow />
      {/* stand */}
      <mesh geometry={unitCyl()} scale={[0.16, 0.02, 0.16]} position={[0, 0.01, 0]} material={alu()} castShadow receiveShadow />
      <mesh geometry={unitCyl()} scale={[0.022, 0.12, 0.022]} position={[0, 0.08, 0.02]} material={alu()} castShadow />
    </group>
  );
}

/** Small microchip, tilted on a stand so its glowing die faces the viewer. */
export function Chip(props: GroupProps) {
  return (
    <group {...props}>
      <mesh geometry={unitCyl()} scale={[0.16, 0.02, 0.16]} position={[0, 0.01, 0]} material={alu()} castShadow receiveShadow />
      <mesh geometry={unitCyl()} scale={[0.025, 0.26, 0.025]} position={[0, 0.13, 0]} material={alu()} castShadow />
      <ChipModel size={0.62} position={[0, 0.3, 0.02]} rotation={[0.75, 0, 0]} />
    </group>
  );
}
