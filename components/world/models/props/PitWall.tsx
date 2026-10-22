// Static. ~5.8 x 3.3 x 2.6 m (incl. the mailbox at +X). Screens face +Z (the track).
// Colliders (cuboids, center + full size):
//   desk:    (0, 0.55, 0)          5.0 x 1.1 x 1.0
//   mailbox: (2.95, 0.6, 0.2)      0.5 x 1.2 x 0.6  (contact zone: a sensor ~2 m around it)
//   canopy posts at (+-2.3, 1.6, -0.9), r=0.09
"use client";

import { RoundedBox, Text } from "@react-three/drei";
import { C } from "../../palette";
import { mat, unitBox, unitCyl, type GroupProps } from "./shared";

const BAR_COLORS = [C.purple, C.teal, C.yellow, C.red];

function Screen({ seed }: { seed: number }) {
  // simple timing bars: label stub + bar of varying length
  const rows = [0.8, 0.55, 0.68, 0.38].map((v, i) => ((v + seed * 0.17 * (i + 1)) % 0.6) + 0.3);
  return (
    <group>
      <RoundedBox args={[1.05, 0.68, 0.08]} radius={0.04} smoothness={2} material={mat(C.ink, { r: 0.5 })} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[0.92, 0.56, 0.01]} position={[0, 0, 0.042]} material={mat(C.jacketBlack, { glow: 0.3, e: C.blue })} />
      {rows.map((w, i) => (
        <group key={i} position={[0, 0.19 - i * 0.13, 0.05]}>
          <mesh geometry={unitBox()} scale={[0.1, 0.07, 0.01]} position={[-0.38, 0, 0]} material={mat(C.white, { glow: 0.8 })} />
          <mesh geometry={unitBox()} scale={[w * 0.68, 0.07, 0.01]} position={[-0.3 + (w * 0.68) / 2, 0, 0]} material={mat(BAR_COLORS[(i + seed) % 4], { glow: 1.1 })} />
        </group>
      ))}
    </group>
  );
}

/** Pit wall booth with timing screens, canopy and a little mailbox (contact) at +X. */
export function PitWall(props: GroupProps) {
  const red = mat(C.red, { r: 0.6 });
  const white = mat(C.white, { r: 0.65 });
  const ink = mat(C.ink, { r: 0.6 });
  const metal = mat(C.metal, { r: 0.4, m: 0.3 });
  return (
    <group {...props}>
      {/* desk */}
      <RoundedBox args={[5, 1.0, 1.0]} radius={0.14} smoothness={3} position={[0, 0.5, 0]} material={white} castShadow receiveShadow />
      <RoundedBox args={[5.1, 0.12, 1.15]} radius={0.05} smoothness={2} position={[0, 1.05, 0]} material={ink} castShadow receiveShadow />
      <RoundedBox args={[4.8, 0.2, 0.06]} radius={0.04} smoothness={2} position={[0, 0.5, 0.5]} material={red} castShadow />
      {/* screens on a rail, tilted up toward the camera */}
      <mesh geometry={unitBox()} scale={[4.6, 0.08, 0.08]} position={[0, 1.2, -0.15]} material={metal} castShadow />
      {[-1.65, -0.55, 0.55, 1.65].map((x, i) => (
        <group key={x} position={[x, 1.6, -0.15]} rotation={[-0.25, 0, 0]}>
          <Screen seed={i} />
        </group>
      ))}
      {/* stools behind */}
      {[-1.3, 0, 1.3].map((x) => (
        <group key={x} position={[x, 0, -0.95]}>
          <mesh geometry={unitCyl()} scale={[0.05, 0.75, 0.05]} position={[0, 0.375, 0]} material={metal} castShadow />
          <mesh geometry={unitCyl()} scale={[0.22, 0.1, 0.22]} position={[0, 0.8, 0]} material={mat(C.blue, { r: 0.6 })} castShadow receiveShadow />
        </group>
      ))}
      {/* canopy */}
      {[-2.3, 2.3].map((x) => (
        <mesh key={x} geometry={unitCyl()} scale={[0.09, 3.1, 0.09]} position={[x, 1.55, -0.9]} material={metal} castShadow />
      ))}
      <group position={[0, 3.1, -0.1]} rotation={[0.12, 0, 0]}>
        <RoundedBox args={[5.4, 0.16, 2.4]} radius={0.07} smoothness={2} material={white} castShadow receiveShadow />
        <RoundedBox args={[5.5, 0.45, 0.18]} radius={0.08} smoothness={2} position={[0, -0.05, 1.2]} material={red} castShadow />
        <Text position={[0, -0.05, 1.3]} fontSize={0.32} fontWeight="bold" color={C.white} anchorX="center" anchorY="middle" letterSpacing={0.12}>
          PIT WALL
        </Text>
      </group>
      {/* mailbox */}
      <group position={[2.95, 0, 0.2]}>
        <mesh geometry={unitCyl()} scale={[0.07, 0.8, 0.07]} position={[0, 0.4, 0]} material={mat(C.woodDark, { r: 0.85 })} castShadow />
        <RoundedBox args={[0.42, 0.34, 0.6]} radius={0.06} smoothness={2} position={[0, 0.92, 0]} material={mat(C.blue, { r: 0.55 })} castShadow receiveShadow />
        <mesh geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.21, 0.6, 0.21]} position={[0, 1.08, 0]} material={mat(C.blue, { r: 0.55 })} castShadow />
        <mesh geometry={unitBox()} scale={[0.3, 0.2, 0.02]} position={[0, 0.98, 0.31]} material={white} />
        <mesh geometry={unitBox()} scale={[0.16, 0.03, 0.03]} position={[0, 1.02, 0.325]} material={ink} />
        {/* the little flag is up: you've got mail */}
        <mesh geometry={unitBox()} scale={[0.03, 0.42, 0.04]} position={[0.24, 1.15, 0.05]} material={metal} castShadow />
        <mesh geometry={unitBox()} scale={[0.03, 0.14, 0.2]} position={[0.24, 1.3, 0.14]} material={mat(C.red, { r: 0.6 })} castShadow />
      </group>
    </group>
  );
}
