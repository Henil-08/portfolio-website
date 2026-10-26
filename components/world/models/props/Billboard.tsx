// Static. Colliders: two posts at x = +-1.15, z = 0 (cylinder r=0.12, h=1.3, center y=0.65),
// board cuboid 3.2 x 1.6 x 0.24 centered at (0, 1.9, 0) (tilted back ~10 deg).
"use client";

import { RoundedBox } from "@react-three/drei";
import { C } from "../../palette";
import { Label } from "./Label";
import { mat, unitBox, type GroupProps } from "./shared";

type BillboardProps = GroupProps & {
  title?: string;
  subtitle?: string;
  accent?: string;
  index?: number | string;
};

const W = 3.2;
const BH = 1.6; // board height
const BY = 1.85; // board center height
const TILT = -0.18; // lean back so the high camera reads it
const FZ = 0.075; // front face z

/** Broadcast-style roadside sign: white panel, red tab with the index, Racero headline. Faces +Z. */
export function Billboard({ title = "TITLE", subtitle = "", accent = C.red, index, ...props }: BillboardProps) {
  const ink = mat(C.ink, { r: 0.45, m: 0.15 });
  const white = mat(C.white, { r: 0.32 });
  const red = mat(C.red, { r: 0.35 });
  const hasIdx = index !== undefined;
  const tabW = 0.62;
  // text block sits right of the tab when there is an index, else centred
  const tx = hasIdx ? -W / 2 + tabW + 0.22 : 0;
  const anchor = hasIdx ? "left" : "center";
  const maxW = hasIdx ? W - tabW - 0.42 : W - 0.5;
  const long = title.length > 7;
  return (
    <group {...props}>
      {/* slim charcoal steel posts on square base plates */}
      {[-1.15, 1.15].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh geometry={unitBox()} scale={[0.1, BY, 0.1]} position={[0, BY / 2, -0.06]} material={ink} castShadow receiveShadow />
          <mesh geometry={unitBox()} scale={[0.3, 0.04, 0.3]} position={[0, 0.02, -0.06]} material={ink} castShadow receiveShadow />
        </group>
      ))}
      <group position={[0, BY, 0]} rotation={[TILT, 0, 0]}>
        {/* charcoal cabinet with a white face */}
        <RoundedBox args={[W, BH, 0.14]} radius={0.03} smoothness={3} material={ink} castShadow receiveShadow />
        <mesh geometry={unitBox()} scale={[W - 0.08, BH - 0.08, 0.02]} position={[0, 0, FZ - 0.005]} material={white} receiveShadow />
        {/* red bar along the bottom, like a broadcast lower third */}
        <mesh geometry={unitBox()} scale={[W - 0.08, 0.14, 0.022]} position={[0, -BH / 2 + 0.11, FZ]} material={red} />
        {hasIdx ? (
          <>
            {/* red index tab on the left */}
            <mesh geometry={unitBox()} scale={[tabW, BH - 0.08, 0.024]} position={[-W / 2 + 0.04 + tabW / 2, 0, FZ + 0.002]} material={red} />
            <Label position={[-W / 2 + 0.04 + tabW / 2, 0.08, FZ + 0.016]} fontSize={0.4} color={C.white}>
              {String(index).padStart(2, "0").slice(-2)}
            </Label>
            <mesh geometry={unitBox()} scale={[0.3, 0.025, 0.01]} position={[-W / 2 + 0.04 + tabW / 2, -0.32, FZ + 0.016]} material={white} />
          </>
        ) : (
          <mesh geometry={unitBox()} scale={[0.5, 0.05, 0.01]} position={[0, 0.5, FZ + 0.006]} material={red} />
        )}
        <Label
          position={[tx, subtitle ? 0.12 : 0.04, FZ + 0.016]}
          fontSize={long ? 0.4 : 0.56}
          color={C.ink}
          anchorX={anchor}
          maxWidth={maxW}
          textAlign={hasIdx ? "left" : "center"}
          lineHeight={0.95}
          letterSpacing={0.01}
        >
          {title.toUpperCase()}
        </Label>
        {subtitle ? (
          <>
            {/* thin accent rule between headline and secondary line */}
            <mesh
              geometry={unitBox()}
              scale={[0.36, 0.03, 0.01]}
              position={[hasIdx ? tx + 0.18 : 0, -0.22, FZ + 0.006]}
              material={mat(accent, { r: 0.4 })}
            />
            <Label
              position={[tx, -0.4, FZ + 0.016]}
              fontSize={0.17}
              color={C.greyDark}
              anchorX={anchor}
              maxWidth={maxW}
              textAlign={hasIdx ? "left" : "center"}
              letterSpacing={0.08}
            >
              {subtitle.toUpperCase()}
            </Label>
          </>
        ) : null}
        {/* small brand mark in the red bar */}
        <Label position={[W / 2 - 0.32, -BH / 2 + 0.11, FZ + 0.016]} fontSize={0.09} color={C.white} letterSpacing={0.12}>
          HG-08
        </Label>
      </group>
    </group>
  );
}
