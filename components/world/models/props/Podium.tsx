// Static. ~5.1 x 1.25 x 1.6 m. Faces +Z.
// Colliders (cuboids, center + full size):
//   P1 center: (0, 0.6, 0)        1.6 x 1.2 x 1.6
//   P2 left:   (-1.72, 0.425, 0)  1.6 x 0.85 x 1.6
//   P3 right:  (1.72, 0.3, 0)     1.6 x 0.6 x 1.6
"use client";

import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { C } from "../../palette";
import { Label } from "./Label";
import { geo, mat, unitBox, type GroupProps } from "./shared";

const STEPS = [
  { place: 2, x: -1.72, h: 0.85, cup: C.silver },
  { place: 1, x: 0, h: 1.2, cup: C.gold },
  { place: 3, x: 1.72, h: 0.6, cup: C.bronze },
];

function cupGeo() {
  return geo("trophy-cup-v2", () => {
    // slender modern trophy: square-ish foot, thin stem, tall tulip bowl
    const pts = [
      [0, 0],
      [0.15, 0],
      [0.15, 0.05],
      [0.1, 0.07],
      [0.035, 0.1],
      [0.03, 0.26],
      [0.05, 0.3],
      [0.14, 0.36],
      [0.2, 0.46],
      [0.22, 0.58],
      [0.215, 0.64],
      [0.2, 0.645],
      [0.19, 0.6],
      [0, 0.55],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 40);
  });
}

function handleGeo() {
  return geo("trophy-handle-v2", () => new THREE.TorusGeometry(0.09, 0.016, 10, 24, Math.PI));
}

/** Modern trophy, ~0.65 m tall, polished metal on a charcoal block. */
export function Trophy({ color = C.gold, ...props }: GroupProps & { color?: string }) {
  const m = mat(color, { r: 0.18, m: 0.65 });
  return (
    <group {...props}>
      <RoundedBox args={[0.32, 0.08, 0.32]} radius={0.015} smoothness={2} position={[0, 0.04, 0]} material={mat(C.ink, { r: 0.35, m: 0.1 })} castShadow receiveShadow />
      <group position={[0, 0.08, 0]}>
        <mesh geometry={cupGeo()} material={m} castShadow receiveShadow />
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={handleGeo()} material={m} position={[s * 0.2, 0.47, 0]} rotation={[0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2]} castShadow />
        ))}
      </group>
    </group>
  );
}

/** F1 podium: glossy white numbered blocks with a red top edge, gold/silver/bronze trophies. */
export function Podium(props: GroupProps) {
  const white = mat(C.white, { r: 0.25 });
  const red = mat(C.red, { r: 0.35 });
  return (
    <group {...props}>
      {/* charcoal base plate */}
      <RoundedBox args={[5.4, 0.08, 1.9]} radius={0.02} smoothness={2} position={[0, 0.04, 0]} material={mat(C.ink, { r: 0.45, m: 0.1 })} receiveShadow castShadow />
      {STEPS.map((s) => (
        <group key={s.place} position={[s.x, 0, 0]}>
          <RoundedBox args={[1.6, s.h, 1.6]} radius={0.04} smoothness={3} position={[0, s.h / 2, 0]} material={white} castShadow receiveShadow />
          {/* red top edge band */}
          <mesh geometry={unitBox()} scale={[1.61, 0.06, 1.61]} position={[0, s.h - 0.1, 0]} material={red} />
          <Label position={[0, s.h / 2 - 0.04, 0.802]} fontSize={Math.min(0.62, s.h * 0.62)} color={C.ink}>
            {String(s.place)}
          </Label>
          <Trophy color={s.cup} position={[0, s.h, 0]} scale={s.place === 1 ? 1.25 : 1} rotation={[0, -0.2, 0]} />
        </group>
      ))}
    </group>
  );
}
