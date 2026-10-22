// Static. Colliders: two posts at x = +-1.15, z = 0 (cylinder r=0.12, h=1.3, center y=0.65),
// board cuboid 3.2 x 1.6 x 0.24 centered at (0, 1.9, 0) (tilted back ~10 deg).
"use client";

import { RoundedBox, Text } from "@react-three/drei";
import { C } from "../../palette";
import { lowSphere, mat, unitCyl, type GroupProps } from "./shared";

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

/** Chunky roadside sign on two posts, with a big numbered badge. Faces +Z. */
export function Billboard({ title = "TITLE", subtitle = "", accent = C.red, index, ...props }: BillboardProps) {
  const accentMat = mat(accent, { r: 0.6 });
  return (
    <group {...props}>
      {/* posts with little feet */}
      {[-1.15, 1.15].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh geometry={unitCyl()} scale={[0.11, 1.3, 0.11]} position={[0, 0.65, 0]} material={mat(C.woodDark, { r: 0.85 })} castShadow receiveShadow />
          <mesh geometry={unitCyl()} scale={[0.2, 0.1, 0.2]} position={[0, 0.05, 0]} material={mat(C.ink, { r: 0.8 })} castShadow receiveShadow />
        </group>
      ))}
      <group position={[0, BY, 0]} rotation={[TILT, 0, 0]}>
        {/* accent frame and cream face */}
        <RoundedBox args={[W, BH, 0.22]} radius={0.1} smoothness={3} material={accentMat} castShadow receiveShadow />
        <RoundedBox args={[W - 0.24, BH - 0.24, 0.06]} radius={0.05} smoothness={2} position={[0, 0, 0.1]} material={mat(C.cream, { r: 0.7 })} receiveShadow />
        <Text
          position={[index !== undefined ? 0.32 : 0, subtitle ? 0.12 : 0, 0.135]}
          fontSize={0.42}
          fontWeight="bold"
          color={C.ink}
          anchorX="center"
          anchorY="middle"
          maxWidth={index !== undefined ? 2.1 : 2.7}
          textAlign="center"
          lineHeight={0.95}
          letterSpacing={-0.02}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            position={[index !== undefined ? 0.32 : 0, -0.5, 0.135]}
            fontSize={0.19}
            fontWeight="bold"
            color={accent}
            anchorX="center"
            anchorY="middle"
            maxWidth={index !== undefined ? 2.1 : 2.7}
            textAlign="center"
          >
            {subtitle}
          </Text>
        ) : null}
        {index !== undefined ? (
          <group position={[-1.12, 0.02, 0.16]}>
            <mesh geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.5, 0.14, 0.5]} material={accentMat} castShadow />
            <mesh geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.4, 0.15, 0.4]} position={[0, 0, 0.01]} material={mat(C.ink, { r: 0.7 })} />
            <Text position={[0, 0.02, 0.09]} fontSize={0.52} fontWeight="bold" color={C.white} anchorX="center" anchorY="middle">
              {String(index)}
            </Text>
          </group>
        ) : null}
        {/* marquee bulbs along the top edge */}
        {[-1.2, -0.6, 0, 0.6, 1.2].map((x) => (
          <mesh key={x} geometry={lowSphere()} scale={0.075} position={[x, BH / 2 + 0.06, 0.04]} material={mat(C.yellow, { glow: 0.6, r: 0.4 })} castShadow />
        ))}
      </group>
    </group>
  );
}
