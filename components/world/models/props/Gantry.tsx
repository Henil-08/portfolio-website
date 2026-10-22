// Static. Start/finish arch, 8 m clear span between the pillars, ~5.6 m tall. Faces +Z
// (the road runs along Z, through the arch).
// Colliders: pillars at x = +-4.35, cuboid 0.7 x 5.6 x 0.9 centered at (+-4.35, 2.8, 0).
// The beam is at y = 4.6..5.6 (overhead, no collider needed).
"use client";

import { RoundedBox, Text } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { mat, unitCyl, type GroupProps } from "./shared";

const SPAN = 8;
const PX = SPAN / 2 + 0.35;
const BEAM_Y = 5.1;

function useChequer(cols: number, rows: number) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = cols * 16;
    c.height = rows * 16;
    const g = c.getContext("2d")!;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        g.fillStyle = (x + y) % 2 ? C.ink : C.white;
        g.fillRect(x * 16, y * 16, 16, 16);
      }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
  }, [cols, rows]);
}

/** Start/finish gantry with 5 start lights (`lights` = how many are lit) and a chequered banner. */
export function Gantry({ lights = 0, ...props }: GroupProps & { lights?: number }) {
  const chequer = useChequer(28, 3);
  const red = mat(C.red, { r: 0.6 });
  const ink = mat(C.ink, { r: 0.6 });
  const lit = mat(C.ink, { e: C.redDark, glow: 1.6, r: 0.3 }); // dark base so only the emissive red shows
  const off = mat(C.jacketBlack, { r: 0.25, m: 0.2 });
  return (
    <group {...props}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * PX, 0, 0]}>
          <RoundedBox args={[1.0, 0.3, 1.2]} radius={0.1} smoothness={2} position={[0, 0.15, 0]} material={ink} castShadow receiveShadow />
          <RoundedBox args={[0.7, BEAM_Y + 0.5, 0.9]} radius={0.2} smoothness={3} position={[0, (BEAM_Y + 0.5) / 2, 0]} material={red} castShadow receiveShadow />
          {/* white racing stripe on the pillar faces */}
          <RoundedBox args={[0.18, BEAM_Y - 0.6, 0.94]} radius={0.06} smoothness={2} position={[0, BEAM_Y / 2, 0]} material={mat(C.white, { r: 0.6 })} castShadow />
        </group>
      ))}
      {/* main beam */}
      <RoundedBox args={[SPAN + 1.8, 1.0, 1.0]} radius={0.25} smoothness={3} position={[0, BEAM_Y, 0]} material={red} castShadow receiveShadow />
      {/* chequered banner on the front face */}
      <mesh position={[0, BEAM_Y - 0.0, 0.51]} material={chequer}>
        <planeGeometry args={[SPAN - 0.6, 0.62]} />
      </mesh>
      <mesh position={[0, BEAM_Y - 0.0, -0.51]} rotation={[0, Math.PI, 0]} material={chequer}>
        <planeGeometry args={[SPAN - 0.6, 0.62]} />
      </mesh>
      {/* start light box hanging under the beam */}
      <group position={[0, BEAM_Y - 0.95, 0.15]}>
        <mesh geometry={unitCyl()} scale={[0.06, 0.5, 0.06]} position={[-1.4, 0.45, -0.1]} material={ink} />
        <mesh geometry={unitCyl()} scale={[0.06, 0.5, 0.06]} position={[1.4, 0.45, -0.1]} material={ink} />
        <RoundedBox args={[3.9, 0.85, 0.5]} radius={0.18} smoothness={3} material={ink} castShadow receiveShadow />
        {Array.from({ length: 5 }, (_, i) => {
          const on = i < lights;
          return (
            <group key={i} position={[(i - 2) * 0.72, 0, 0.24]}>
              <mesh geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.27, 0.08, 0.27]} material={mat(C.metal, { r: 0.5, m: 0.2 })} />
              <mesh geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.2, 0.1, 0.2]} position={[0, 0, 0.02]} material={on ? lit : off} />
            </group>
          );
        })}
        {/* always mounted so toggling lights never recompiles shaders */}
        <pointLight color={C.red} intensity={Math.max(0, Math.min(5, lights)) * 1.5} distance={6} position={[0, -0.6, 1]} />
      </group>
      <Text position={[0, BEAM_Y + 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} fontWeight="bold" color={C.white} anchorX="center" anchorY="middle">
        START · FINISH
      </Text>
    </group>
  );
}
