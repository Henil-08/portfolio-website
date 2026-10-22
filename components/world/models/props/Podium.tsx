// Static. ~5.1 x 1.25 x 1.6 m. Faces +Z.
// Colliders (cuboids, center + full size):
//   P1 center: (0, 0.6, 0)        1.6 x 1.2 x 1.6
//   P2 left:   (-1.72, 0.425, 0)  1.6 x 0.85 x 1.6
//   P3 right:  (1.72, 0.3, 0)     1.6 x 0.6 x 1.6
"use client";

import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import { C } from "../../palette";
import { geo, mat, type GroupProps } from "./shared";

const STEPS = [
  { place: 2, x: -1.72, h: 0.85, color: C.blue, cup: C.metal },
  { place: 1, x: 0, h: 1.2, color: C.red, cup: C.yellow },
  { place: 3, x: 1.72, h: 0.6, color: C.teal, cup: C.wood },
];

function cupGeo() {
  return geo("trophy-cup", () => {
    const pts = [
      [0, 0],
      [0.2, 0],
      [0.2, 0.06],
      [0.12, 0.09],
      [0.06, 0.14],
      [0.05, 0.28],
      [0.1, 0.33],
      [0.22, 0.4],
      [0.27, 0.52],
      [0.28, 0.64],
      [0.25, 0.66],
      [0.22, 0.6],
      [0, 0.56],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 28);
  });
}

function handleGeo() {
  return geo("trophy-handle", () => new THREE.TorusGeometry(0.11, 0.035, 8, 16, Math.PI * 1.2));
}

/** Rounded trophy cup, ~0.7 m tall. */
export function Trophy({ color = C.yellow, ...props }: GroupProps & { color?: string }) {
  const m = mat(color, { r: 0.3, m: 0.3 });
  return (
    <group {...props}>
      <mesh geometry={cupGeo()} material={m} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={handleGeo()} material={m} position={[s * 0.26, 0.5, 0]} rotation={[0, s > 0 ? 0 : Math.PI, -0.6 * Math.PI]} castShadow />
      ))}
    </group>
  );
}

/** F1 podium with three numbered steps and a trophy on each. */
export function Podium(props: GroupProps) {
  return (
    <group {...props}>
      {/* base plate */}
      <RoundedBox args={[5.4, 0.12, 1.9]} radius={0.05} smoothness={2} position={[0, 0.06, 0]} material={mat(C.ink, { r: 0.8 })} receiveShadow castShadow />
      {STEPS.map((s) => (
        <group key={s.place} position={[s.x, 0, 0]}>
          <RoundedBox args={[1.6, s.h, 1.6]} radius={0.14} smoothness={3} position={[0, s.h / 2, 0]} material={mat(C.cream, { r: 0.7 })} castShadow receiveShadow />
          {/* colored top cushion */}
          <RoundedBox args={[1.62, 0.16, 1.62]} radius={0.07} smoothness={2} position={[0, s.h - 0.02, 0]} material={mat(s.color, { r: 0.6 })} castShadow receiveShadow />
          <Text position={[0, s.h / 2 - 0.05, 0.81]} fontSize={s.h * 0.62} fontWeight="bold" color={s.color} anchorX="center" anchorY="middle">
            {String(s.place)}
          </Text>
          <Trophy color={s.cup} position={[0, s.h + 0.06, 0]} scale={s.place === 1 ? 1.3 : 1} rotation={[0, -0.2, 0]} />
        </group>
      ))}
    </group>
  );
}
