// Static. Footprint 9 x 7 (W x D), 4.5 m tall to the roof top, open front faces +Z.
// Colliders (cuboids, center + full size):
//   back wall:   (0, 2.25, -3.35)      9.0 x 4.5 x 0.3
//   left wall:   (-4.35, 2.25, 0)      0.3 x 4.5 x 7.0
//   right wall:  (4.35, 2.25, 0)       0.3 x 4.5 x 7.0
//   roof:        (0, 4.3, 0)           9.0 x 0.4 x 7.0 (out of the car's reach, optional)
// The floor inside (x in -4.2..4.2, z in -3.2..3.5) is flat at y=0.02, no collider needed.
// Clearance under the half-open door: 2.4 m.
"use client";

import { RoundedBox, Text } from "@react-three/drei";
import { C } from "../../palette";
import { mat, unitBox, unitCyl, type GroupProps } from "./shared";

const W = 9;
const D = 7;
const H = 4.5;
const T = 0.3;
const OPEN_H = 3.4; // opening height
const DOOR_BOTTOM = 2.4;
const ZF = D / 2;

/** Pegboard with a few chunky tools. Faces +X when rotated by the caller. */
function ToolBoard() {
  const ink = mat(C.ink, { r: 0.6, m: 0.2 });
  const red = mat(C.red, { r: 0.6 });
  return (
    <group>
      <RoundedBox args={[0.08, 1.2, 2.2]} radius={0.03} smoothness={2} material={mat(C.wood, { r: 0.85 })} castShadow receiveShadow />
      {/* wrenches */}
      {[-0.7, -0.4, -0.1].map((z, i) => (
        <group key={z} position={[0.08, 0.05 - i * 0.08, z]}>
          <mesh geometry={unitBox()} scale={[0.05, 0.7 - i * 0.12, 0.08]} material={mat(C.metal, { r: 0.3, m: 0.5 })} castShadow />
          <mesh geometry={unitCyl()} rotation={[0, 0, Math.PI / 2]} scale={[0.09, 0.05, 0.09]} position={[0, (0.7 - i * 0.12) / 2, 0]} material={mat(C.metal, { r: 0.3, m: 0.5 })} castShadow />
        </group>
      ))}
      {/* hammer + screwdriver */}
      <mesh geometry={unitBox()} scale={[0.06, 0.6, 0.08]} position={[0.08, -0.05, 0.35]} material={red} castShadow />
      <mesh geometry={unitBox()} scale={[0.1, 0.14, 0.34]} position={[0.08, 0.3, 0.35]} material={ink} castShadow />
      <mesh geometry={unitCyl()} scale={[0.06, 0.32, 0.06]} position={[0.08, 0.1, 0.75]} material={mat(C.yellow, { r: 0.6 })} castShadow />
      <mesh geometry={unitCyl()} scale={[0.025, 0.3, 0.025]} position={[0.08, -0.2, 0.75]} material={mat(C.metal, { r: 0.3, m: 0.5 })} castShadow />
    </group>
  );
}

/** Cute F1 team garage with a half-open roll-up door, striped awning and big sign. */
export function Garage(props: GroupProps) {
  const wall = mat(C.wall, { r: 0.8 });
  const red = mat(C.red, { r: 0.65 });
  const white = mat(C.white, { r: 0.7 });
  const ink = mat(C.ink, { r: 0.7 });
  const stripes = 9;
  const sw = (W - 1.0) / stripes;
  return (
    <group {...props}>
      {/* floor: epoxy grey with a painted pit box */}
      <mesh geometry={unitBox()} scale={[W - 0.2, 0.04, D]} position={[0, 0.0, 0]} material={mat(C.metal, { r: 0.55 })} receiveShadow />
      <mesh geometry={unitBox()} scale={[3.2, 0.045, 0.12]} position={[0, 0.0, 1.6]} material={mat(C.yellow, { r: 0.6 })} receiveShadow />
      <mesh geometry={unitBox()} scale={[3.2, 0.045, 0.12]} position={[0, 0.0, -1.6]} material={mat(C.yellow, { r: 0.6 })} receiveShadow />
      {[-1.6, 1.6].map((x) => (
        <mesh key={x} geometry={unitBox()} scale={[0.12, 0.045, 3.3]} position={[x, 0.0, 0]} material={mat(C.yellow, { r: 0.6 })} receiveShadow />
      ))}

      {/* walls */}
      <RoundedBox args={[W, H, T]} radius={0.1} smoothness={2} position={[0, H / 2, -D / 2 + T / 2]} material={wall} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <group key={s}>
          <RoundedBox args={[T, H, D]} radius={0.1} smoothness={2} position={[s * (W / 2 - T / 2), H / 2, 0]} material={wall} castShadow receiveShadow />
          {/* red base stripe outside */}
          <RoundedBox args={[0.06, 0.5, D - 0.2]} radius={0.02} smoothness={2} position={[s * (W / 2 + 0.02), 0.45, 0]} material={red} castShadow />
          {/* chunky front pillars */}
          <RoundedBox args={[0.7, H - 0.3, 0.6]} radius={0.16} smoothness={3} position={[s * (W / 2 - 0.3), (H - 0.3) / 2, ZF - 0.2]} material={red} castShadow receiveShadow />
          {/* tool board on the inner wall */}
          <group position={[s * (W / 2 - T - 0.04), 1.7, -0.4]} rotation={[0, s > 0 ? Math.PI : 0, 0]}>
            <ToolBoard />
          </group>
        </group>
      ))}
      {/* roof slab with a soft overhang */}
      <RoundedBox args={[W + 0.3, 0.4, D + 0.3]} radius={0.15} smoothness={3} position={[0, H - 0.2, 0]} material={mat(C.cream, { r: 0.8 })} castShadow receiveShadow />
      <RoundedBox args={[W + 0.34, 0.14, D + 0.34]} radius={0.06} smoothness={2} position={[0, H - 0.35, 0]} material={red} castShadow />

      {/* front header above the opening carrying the sign */}
      <RoundedBox args={[W - 1.2, H - OPEN_H, 0.4]} radius={0.12} smoothness={2} position={[0, OPEN_H + (H - OPEN_H) / 2 - 0.1, ZF - 0.2]} material={ink} castShadow receiveShadow />
      <Text position={[0, OPEN_H + 0.45, ZF + 0.02]} fontSize={0.78} fontWeight="bold" letterSpacing={0.06} color={C.white} anchorX="center" anchorY="middle">
        GARAGE
      </Text>
      <Text position={[3.25, OPEN_H + 0.45, ZF + 0.02]} fontSize={0.42} fontWeight="bold" color={C.yellow} anchorX="center" anchorY="middle">
        08
      </Text>
      <Text position={[-3.25, OPEN_H + 0.45, ZF + 0.02]} fontSize={0.42} fontWeight="bold" color={C.yellow} anchorX="center" anchorY="middle">
        HG
      </Text>

      {/* roll-up door, half open: a ribbed panel hanging from the header */}
      <group position={[0, 0, ZF - 0.5]}>
        <RoundedBox args={[W - 1.4, OPEN_H - DOOR_BOTTOM, 0.12]} radius={0.04} smoothness={2} position={[0, (OPEN_H + DOOR_BOTTOM) / 2, 0]} material={mat(C.metal, { r: 0.5, m: 0.15 })} castShadow receiveShadow />
        {[0.2, 0.45, 0.7].map((f) => (
          <mesh key={f} geometry={unitBox()} scale={[W - 1.45, 0.05, 0.16]} position={[0, DOOR_BOTTOM + (OPEN_H - DOOR_BOTTOM) * f, 0]} material={mat(C.rock, { r: 0.6 })} castShadow />
        ))}
        <RoundedBox args={[W - 1.3, 0.14, 0.2]} radius={0.05} smoothness={2} position={[0, DOOR_BOTTOM, 0]} material={ink} castShadow />
        <mesh geometry={unitBox()} scale={[0.6, 0.08, 0.12]} position={[0, DOOR_BOTTOM - 0.06, 0.08]} material={mat(C.yellow, { r: 0.5 })} castShadow />
      </group>

      {/* striped awning under the sign, sloping out over the entrance */}
      <group position={[0, OPEN_H - 0.05, ZF + 0.05]} rotation={[0.38, 0, 0]}>
        {Array.from({ length: stripes }, (_, i) => (
          <group key={i} position={[-(W - 1.0) / 2 + sw * (i + 0.5), 0, 0]}>
            <RoundedBox args={[sw + 0.005, 0.1, 1.2]} radius={0.04} smoothness={2} position={[0, 0, 0.6]} material={i % 2 ? white : red} castShadow receiveShadow />
            {/* valance flap with a rounded bottom */}
            <RoundedBox args={[sw + 0.005, 0.36, 0.08]} radius={0.04} smoothness={2} position={[0, -0.12, 1.2]} rotation={[-0.38, 0, 0]} material={i % 2 ? white : red} castShadow />
          </group>
        ))}
      </group>

      {/* roof details for the high camera: big team roundel + vents */}
      <mesh geometry={unitCyl()} scale={[1.7, 0.06, 1.7]} position={[0.6, H + 0.01, 0.2]} material={red} receiveShadow />
      <Text position={[0.6, H + 0.05, 0.2]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.5} fontWeight="bold" color={C.white} anchorX="center" anchorY="middle">
        08
      </Text>
      {[-3, -2].map((x) => (
        <RoundedBox key={x} args={[0.8, 0.45, 0.8]} radius={0.1} smoothness={2} position={[x, H + 0.2, -2.2]} material={mat(C.metal, { r: 0.5, m: 0.2 })} castShadow receiveShadow />
      ))}
      <RoundedBox args={[W - 0.6, 0.18, 0.5]} radius={0.08} smoothness={2} position={[0, H + 0.08, -D / 2 + 0.25]} material={red} castShadow receiveShadow />

      {/* inside: workbench, tyre trolley, ceiling lights */}
      <RoundedBox args={[3, 0.9, 0.8]} radius={0.06} smoothness={2} position={[-2.2, 0.45, -2.75]} material={red} castShadow receiveShadow />
      <RoundedBox args={[3.1, 0.1, 0.9]} radius={0.04} smoothness={2} position={[-2.2, 0.95, -2.75]} material={mat(C.wood, { r: 0.8 })} castShadow receiveShadow />
      <RoundedBox args={[1.2, 1.4, 0.7]} radius={0.06} smoothness={2} position={[2.6, 0.7, -2.8]} material={mat(C.blue, { r: 0.6 })} castShadow receiveShadow />
      {[0.35, 0.75, 1.15].map((y) => (
        <mesh key={y} geometry={unitBox()} scale={[1.0, 0.04, 0.05]} position={[2.6, y, -2.44]} material={ink} castShadow />
      ))}
      {[-2.5, 0, 2.5].map((x) => (
        <mesh key={x} geometry={unitBox()} scale={[1.6, 0.08, 0.3]} position={[x, H - 0.45, 0]} material={mat(C.cream, { glow: 0.9 })} />
      ))}
    </group>
  );
}
