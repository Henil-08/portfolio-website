// Static. ~5.8 x 3.3 x 2.6 m (incl. the mailbox at +X). Screens face +Z (the track).
// Colliders (cuboids, center + full size):
//   desk:    (0, 0.55, 0)          5.0 x 1.1 x 1.0
//   mailbox: (2.95, 0.6, 0.2)      0.5 x 1.2 x 0.6  (contact zone: a sensor ~2 m around it)
//   canopy posts at (+-2.3, 1.6, -0.9), r=0.09
"use client";

import { RoundedBox } from "@react-three/drei";
import { C } from "../../palette";
import { Label } from "./Label";
import { mat, unitBox, unitCyl, type GroupProps } from "./shared";

const BAR_COLORS = [C.white, C.greyLight, C.red, C.teal];

function Screen({ seed }: { seed: number }) {
  // timing tower: position tab + name stub + gap bar
  const rows = [0.8, 0.55, 0.68, 0.38, 0.5].map((v, i) => ((v + seed * 0.17 * (i + 1)) % 0.55) + 0.25);
  return (
    <group>
      <RoundedBox args={[1.05, 0.66, 0.05]} radius={0.015} smoothness={2} material={mat(C.black, { r: 0.3, m: 0.2 })} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[0.99, 0.6, 0.004]} position={[0, 0, 0.026]} material={mat("#1a2027", { glow: 0.9, e: "#1d252e" })} />
      {/* header bar */}
      <mesh geometry={unitBox()} scale={[0.99, 0.07, 0.004]} position={[0, 0.265, 0.029]} material={mat(C.red, { glow: 1.0 })} />
      {rows.map((w, i) => (
        <group key={i} position={[0, 0.16 - i * 0.1, 0.03]}>
          <mesh geometry={unitBox()} scale={[0.06, 0.06, 0.004]} position={[-0.43, 0, 0]} material={mat(C.white, { glow: 0.9 })} />
          <mesh geometry={unitBox()} scale={[0.18, 0.035, 0.004]} position={[-0.27, 0, 0]} material={mat(C.grey, { glow: 0.7 })} />
          <mesh geometry={unitBox()} scale={[w * 0.6, 0.035, 0.004]} position={[-0.14 + (w * 0.6) / 2, 0, 0]} material={mat(BAR_COLORS[(i + seed) % 4], { glow: 0.9 })} />
        </group>
      ))}
    </group>
  );
}

/** Modern pit wall stand: charcoal console, four timing screens on a steel rail, white canopy, mailbox at +X. */
export function PitWall(props: GroupProps) {
  const red = mat(C.red, { r: 0.35 });
  const white = mat(C.white, { r: 0.3 });
  const ink = mat(C.ink, { r: 0.45, m: 0.1 });
  const steel = mat(C.metal, { r: 0.3, m: 0.5 });
  return (
    <group {...props}>
      {/* console */}
      <RoundedBox args={[5, 1.0, 1.0]} radius={0.04} smoothness={3} position={[0, 0.5, 0]} material={ink} castShadow receiveShadow />
      <RoundedBox args={[5.1, 0.08, 1.12]} radius={0.02} smoothness={2} position={[0, 1.04, 0]} material={white} castShadow receiveShadow />
      {/* white front panel with red pinstripe and team text */}
      <mesh geometry={unitBox()} scale={[4.8, 0.62, 0.02]} position={[0, 0.55, 0.505]} material={white} />
      <mesh geometry={unitBox()} scale={[4.8, 0.06, 0.022]} position={[0, 0.3, 0.507]} material={red} />
      <Label position={[-2.25, 0.64, 0.52]} anchorX="left" fontSize={0.24} color={C.ink} letterSpacing={0.05}>
        PIT WALL
      </Label>
      <Label position={[2.25, 0.62, 0.52]} anchorX="right" fontSize={0.09} color={C.greyDark} letterSpacing={0.22}>
        HG RACING · STRATEGY & TIMING
      </Label>
      {/* screens on a steel rail, tilted toward the camera */}
      <mesh geometry={unitBox()} scale={[4.6, 0.05, 0.05]} position={[0, 1.22, -0.18]} material={steel} castShadow />
      {[-1.65, -0.55, 0.55, 1.65].map((x, i) => (
        <group key={x}>
          <mesh geometry={unitBox()} scale={[0.04, 0.32, 0.04]} position={[x, 1.24, -0.18]} material={steel} />
          <group position={[x, 1.62, -0.15]} rotation={[-0.22, 0, 0]}>
            <Screen seed={i} />
          </group>
        </group>
      ))}
      {/* stools behind */}
      {[-1.3, 0, 1.3].map((x) => (
        <group key={x} position={[x, 0, -0.95]}>
          <mesh geometry={unitCyl()} scale={[0.18, 0.02, 0.18]} position={[0, 0.01, 0]} material={steel} castShadow receiveShadow />
          <mesh geometry={unitCyl()} scale={[0.03, 0.75, 0.03]} position={[0, 0.39, 0]} material={steel} castShadow />
          <mesh geometry={unitCyl()} scale={[0.2, 0.06, 0.2]} position={[0, 0.79, 0]} material={ink} castShadow receiveShadow />
        </group>
      ))}
      {/* canopy: slim steel posts + thin white roof with a red fascia */}
      {[-2.3, 2.3].map((x) => (
        <mesh key={x} geometry={unitBox()} scale={[0.1, 3.1, 0.1]} position={[x, 1.55, -0.9]} material={steel} castShadow />
      ))}
      <group position={[0, 3.1, -0.1]} rotation={[0.08, 0, 0]}>
        <RoundedBox args={[5.4, 0.1, 2.4]} radius={0.03} smoothness={2} material={white} castShadow receiveShadow />
        <mesh geometry={unitBox()} scale={[5.2, 0.02, 2.2]} position={[0, -0.06, 0]} material={mat(C.white, { glow: 0.5 })} />
        <RoundedBox args={[5.42, 0.34, 0.08]} radius={0.02} smoothness={2} position={[0, -0.08, 1.2]} material={red} castShadow />
        <Label position={[0, -0.07, 1.245]} fontSize={0.2} color={C.white} letterSpacing={0.25}>
          HG RACING
        </Label>
      </group>
      {/* mailbox: charcoal post box, steel post, red flag up */}
      <group position={[2.95, 0, 0.2]}>
        <mesh geometry={unitBox()} scale={[0.07, 0.8, 0.07]} position={[0, 0.4, 0]} material={steel} castShadow />
        <RoundedBox args={[0.42, 0.42, 0.6]} radius={0.05} smoothness={3} position={[0, 0.98, 0]} material={ink} castShadow receiveShadow />
        <mesh geometry={unitBox()} scale={[0.26, 0.025, 0.01]} position={[0, 1.04, 0.302]} material={steel} />
        <Label position={[0, 0.9, 0.305]} fontSize={0.06} color={C.white} letterSpacing={0.2}>
          MAIL
        </Label>
        <mesh geometry={unitBox()} scale={[0.025, 0.42, 0.03]} position={[0.225, 1.15, 0.05]} material={steel} castShadow />
        <mesh geometry={unitBox()} scale={[0.02, 0.12, 0.2]} position={[0.225, 1.3, 0.14]} material={red} castShadow />
      </group>
    </group>
  );
}
