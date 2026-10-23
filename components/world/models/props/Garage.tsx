// Static. Footprint 9 x 7 (W x D), 4.5 m tall to the roof top, open front faces +Z.
// Colliders (cuboids, center + full size):
//   back wall:   (0, 2.25, -3.35)      9.0 x 4.5 x 0.3
//   left wall:   (-4.35, 2.25, 0)      0.3 x 4.5 x 7.0
//   right wall:  (4.35, 2.25, 0)       0.3 x 4.5 x 7.0
//   roof:        (0, 4.3, 0)           9.0 x 0.4 x 7.0 (out of the car's reach, optional)
// The floor inside (x in -4.2..4.2, z in -3.2..3.5) is flat at y=0.02, no collider needed.
// Clearance under the raised glass door: 2.4 m.
"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { dayNight } from "../../daynight";
import { C } from "../../palette";
import { Label } from "./Label";
import { mat, unitBox, type GroupProps } from "./shared";
import { Word3D } from "./Word3D";

const W = 9;
const D = 7;
const H = 4.5;
const T = 0.3;
const OPEN_H = 3.3; // opening height
const DOOR_BOTTOM = 2.4;
const ZF = D / 2;

/** Tool cabinet: charcoal drawers with red pulls. Origin at its bottom-back centre, faces +Z. */
function Cabinet({ w = 1.6, h = 1.0 }: { w?: number; h?: number }) {
  const ink = mat(C.charcoal, { r: 0.4, m: 0.2 });
  const red = mat(C.red, { r: 0.35 });
  const n = 4;
  return (
    <group>
      <RoundedBox args={[w, h, 0.6]} radius={0.02} smoothness={2} position={[0, h / 2, 0.3]} material={ink} castShadow receiveShadow />
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} geometry={unitBox()} scale={[w * 0.5, 0.025, 0.03]} position={[0, 0.16 + (i * (h - 0.25)) / (n - 1), 0.61]} material={red} />
      ))}
      <mesh geometry={unitBox()} scale={[w + 0.04, 0.04, 0.64]} position={[0, h + 0.02, 0.3]} material={mat(C.metal, { r: 0.3, m: 0.5 })} castShadow receiveShadow />
    </group>
  );
}

/** Fascia header: the garage's name in extruded letters, lit from a red LED bar behind. Glows brighter at night. */
function Header({ title }: { title: string }) {
  const face = useRef<THREE.MeshStandardMaterial>(null);
  const bar = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const n = dayNight.night;
    if (face.current) face.current.emissiveIntensity = 0.25 + n * 1.6;
    if (bar.current) bar.current.emissiveIntensity = 0.8 + n * 3;
  });
  const y = OPEN_H + (H - 0.25 - OPEN_H) / 2;
  return (
    <group position={[0.55, y, ZF - 0.05]}>
      {/* LED backlight bar, the letters stand proud of it */}
      <mesh geometry={unitBox()} scale={[6.4, 0.05, 0.02]} position={[0, -0.36, 0]}>
        <meshStandardMaterial ref={bar} color={C.red} emissive={C.red} emissiveIntensity={1} toneMapped={false} />
      </mesh>
      <Word3D text={title} height={0.5} depth={0.14} maxWidth={6.2} position={[0, -0.24, 0]}>
        <meshStandardMaterial ref={face} color={C.white} emissive={C.white} emissiveIntensity={0.3} roughness={0.35} toneMapped={false} />
      </Word3D>
    </group>
  );
}

/** Modern F1 team garage: white box, glass front partly raised, red stripe, team sign; the fascia carries the garage's own title. */
export function Garage({ title, ...props }: GroupProps & { title?: string }) {
  const white = mat(C.white, { r: 0.3 });
  const red = mat(C.red, { r: 0.35 });
  const ink = mat(C.ink, { r: 0.45, m: 0.1 });
  const steel = mat(C.metal, { r: 0.3, m: 0.5 });
  const glass = mat("#9fb3bb", { r: 0.06, m: 0.3, o: 0.38 });
  const lightStrip = mat(C.white, { glow: 1.4 });
  const doorH = OPEN_H - DOOR_BOTTOM;
  const panes = 6;
  const pw = (W - 1.2) / panes;
  return (
    <group {...props}>
      {/* floor: pale grey epoxy, white pit box lines */}
      <mesh geometry={unitBox()} scale={[W - 0.2, 0.04, D]} position={[0, 0.0, 0]} material={mat(C.greyLight, { r: 0.35 })} receiveShadow />
      {[
        [0, 1.7, 3.6, 0.08],
        [0, -1.7, 3.6, 0.08],
        [-1.8, 0, 0.08, 3.48],
        [1.8, 0, 0.08, 3.48],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} geometry={unitBox()} scale={[w, 0.045, d]} position={[x, 0.0, z]} material={mat(C.white, { r: 0.5 })} receiveShadow />
      ))}
      <mesh geometry={unitBox()} scale={[1.2, 0.045, 0.18]} position={[0, 0.0, 2.6]} material={red} receiveShadow />

      {/* back wall: charcoal inside face with a red stripe and tool cabinets */}
      <RoundedBox args={[W, H - 0.25, T]} radius={0.04} smoothness={2} position={[0, (H - 0.25) / 2, -D / 2 + T / 2]} material={white} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[W - 2 * T, H - 0.6, 0.02]} position={[0, (H - 0.6) / 2 + 0.02, -D / 2 + T + 0.01]} material={ink} receiveShadow />
      <mesh geometry={unitBox()} scale={[W - 2 * T, 0.12, 0.03]} position={[0, 1.55, -D / 2 + T + 0.025]} material={red} />
      <Label position={[0, 2.45, -D / 2 + T + 0.03]} fontSize={0.5} color={C.white} letterSpacing={0.06}>
        HG RACING
      </Label>
      <Label position={[0, 2.05, -D / 2 + T + 0.03]} fontSize={0.12} color={C.grey} letterSpacing={0.3}>
        PROJECTS · BUILT TO RACE
      </Label>
      {[-2.8, -1.1, 1.1, 2.8].map((x) => (
        <group key={x} position={[x, 0.02, -D / 2 + T + 0.02]}>
          <Cabinet />
        </group>
      ))}

      {/* side walls: white, with a red racing stripe outside */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <RoundedBox args={[T, H - 0.25, D]} radius={0.04} smoothness={2} position={[s * (W / 2 - T / 2), (H - 0.25) / 2, 0]} material={white} castShadow receiveShadow />
          <mesh geometry={unitBox()} scale={[0.02, 0.22, D - 0.4]} position={[s * (W / 2 + 0.01), 1.2, 0]} material={red} />
          <mesh geometry={unitBox()} scale={[0.02, 0.05, D - 0.4]} position={[s * (W / 2 + 0.01), 0.98, 0]} material={ink} />
          {/* slim front columns */}
          <mesh geometry={unitBox()} scale={[0.36, H - 0.25, 0.36]} position={[s * (W / 2 - 0.18), (H - 0.25) / 2, ZF - 0.18]} material={white} castShadow receiveShadow />
          <mesh geometry={unitBox()} scale={[0.06, H - 0.6, 0.02]} position={[s * (W / 2 - 0.18), (H - 0.6) / 2 + 0.1, ZF + 0.005]} material={red} />
        </group>
      ))}

      {/* roof slab, thin, with a charcoal shadow gap */}
      <mesh geometry={unitBox()} scale={[W - 0.1, 0.06, D - 0.1]} position={[0, H - 0.28, 0]} material={ink} />
      <RoundedBox args={[W + 0.2, 0.25, D + 0.4]} radius={0.04} smoothness={2} position={[0, H - 0.125, 0.1]} material={white} castShadow receiveShadow />

      {/* front fascia: charcoal glass band carrying the sign */}
      <mesh geometry={unitBox()} scale={[W - 0.72, H - 0.25 - OPEN_H, 0.3]} position={[0, OPEN_H + (H - 0.25 - OPEN_H) / 2, ZF - 0.2]} material={ink} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[1.1, H - 0.25 - OPEN_H - 0.2, 0.02]} position={[-W / 2 + 1.05, OPEN_H + (H - 0.25 - OPEN_H) / 2, ZF - 0.04]} material={red} />
      <Label position={[-W / 2 + 1.05, OPEN_H + (H - 0.25 - OPEN_H) / 2 + 0.02, ZF - 0.025]} fontSize={0.5} color={C.white}>
        08
      </Label>
      {title ? (
        <Header title={title} />
      ) : (
        <Label position={[-W / 2 + 1.8, OPEN_H + 0.53, ZF - 0.04]} anchorX="left" fontSize={0.56} color={C.white} letterSpacing={0.04}>
          HG RACING
        </Label>
      )}

      {/* glass sectional door, raised to 2.4 m: framed panes with thin steel mullions */}
      <group position={[0, 0, ZF - 0.45]}>
        <mesh geometry={unitBox()} scale={[W - 1.2, doorH, 0.04]} position={[0, DOOR_BOTTOM + doorH / 2, 0]} material={glass} />
        {Array.from({ length: panes + 1 }, (_, i) => (
          <mesh key={i} geometry={unitBox()} scale={[0.04, doorH, 0.07]} position={[-(W - 1.2) / 2 + i * pw, DOOR_BOTTOM + doorH / 2, 0]} material={steel} castShadow />
        ))}
        <mesh geometry={unitBox()} scale={[W - 1.16, 0.06, 0.08]} position={[0, DOOR_BOTTOM + 0.03, 0]} material={steel} castShadow />
        <mesh geometry={unitBox()} scale={[W - 1.16, 0.03, 0.07]} position={[0, DOOR_BOTTOM + doorH * 0.5, 0]} material={steel} />
        {/* guide rails */}
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={unitBox()} scale={[0.06, OPEN_H, 0.1]} position={[s * ((W - 1.2) / 2 + 0.04), OPEN_H / 2, 0]} material={steel} castShadow />
        ))}
      </group>

      {/* ceiling light strips */}
      {[-2.4, 0, 2.4].map((x) => (
        <mesh key={x} geometry={unitBox()} scale={[0.12, 0.04, D - 1.6]} position={[x, H - 0.33, -0.2]} material={lightStrip} />
      ))}

      {/* roof graphics for the high camera: red stripe pair and team name */}
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} geometry={unitBox()} scale={[0.28, 0.01, D + 0.38]} position={[x - 2.6, H + 0.005, 0.1]} material={red} />
      ))}
      <Label position={[0.9, H + 0.012, 0.3]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.0} color={C.ink} letterSpacing={0.04}>
        HG RACING
      </Label>
      <Label position={[0.9, H + 0.012, 1.25]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} color={C.grey} letterSpacing={0.35}>
        GARAGE 08
      </Label>
      {/* rooftop plant */}
      {[-1.6, 3.4].map((x) => (
        <RoundedBox key={x} args={[1.2, 0.45, 0.9]} radius={0.04} smoothness={2} position={[x, H + 0.22, -2.4]} material={mat(C.greyLight, { r: 0.4, m: 0.2 })} castShadow receiveShadow />
      ))}
    </group>
  );
}
