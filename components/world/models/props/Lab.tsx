// Static. "Side quest" chip lab. Footprint 7 x 6 (W x D), body 4 m tall, chip on the roof to ~5.1 m.
// Collider: cuboid 7 x 4 x 6 centered at (0, 2, 0). Door faces +Z (no interior).
"use client";

import { RoundedBox, Text } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { lowSphere, mat, unitBox, unitCyl, type GroupProps } from "./shared";

const W = 7;
const D = 6;
const H = 4;
const ZF = D / 2;

/** Gold pins around a square chip package, instanced. */
function Pins({ size, n, len, thick, y }: { size: number; n: number; len: number; thick: number; y: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = n * 4;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    let k = 0;
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < n; i++) {
        const t = ((i + 0.5) / n - 0.5) * size * 0.82;
        const out = size / 2 + len / 2 - 0.02;
        o.rotation.set(0, (side * Math.PI) / 2, 0);
        const c = Math.cos(o.rotation.y);
        const s = Math.sin(o.rotation.y);
        // local (t, out) rotated around Y
        o.position.set(t * c + out * s, y, -t * s + out * c);
        o.scale.set(thick * 1.6, thick, len);
        o.updateMatrix();
        m.setMatrixAt(k++, o.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  }, [n, size, len, thick, y]);
  return <instancedMesh ref={ref} args={[unitBox(), mat(C.yellow, { r: 0.35, m: 0.3 }), count]} castShadow receiveShadow />;
}

/** Circuit traces on the die: a handful of glowing teal lines. */
function Traces({ s, y }: { s: number; y: number }) {
  const lines = useMemo(
    () =>
      [
        // x, z, w, d (in die units -0.5..0.5)
        [0, -0.3, 0.7, 0.05],
        [0, 0.3, 0.7, 0.05],
        [-0.3, 0, 0.05, 0.65],
        [0.3, 0, 0.05, 0.65],
        [0, 0, 0.32, 0.05],
        [0, -0.12, 0.05, 0.22],
        [-0.15, 0.15, 0.05, 0.3],
        [0.15, 0.14, 0.2, 0.05],
      ] as [number, number, number, number][],
    [],
  );
  const glow = mat(C.teal, { glow: 1.6, r: 0.4 });
  return (
    <>
      {lines.map(([x, z, w, d], i) => (
        <mesh key={i} geometry={unitBox()} scale={[w * s, 0.03, d * s]} position={[x * s, y, z * s]} material={glow} />
      ))}
      {/* via dots at the trace corners */}
      {[
        [-0.3, -0.3],
        [0.3, -0.3],
        [-0.3, 0.3],
        [0.3, 0.3],
      ].map(([x, z], i) => (
        <mesh key={`v${i}`} geometry={unitCyl()} scale={[0.07 * s, 0.04, 0.07 * s]} position={[x * s, y + 0.005, z * s]} material={glow} />
      ))}
    </>
  );
}

/** Chunky microchip: dark package, gold pins, glowing die. Origin at its bottom center. */
export function ChipModel({ size = 1, ...props }: GroupProps & { size?: number }) {
  const h = size * 0.16;
  return (
    <group {...props}>
      <RoundedBox args={[size, h, size]} radius={Math.min(0.08 * size, h / 2 - 0.001)} smoothness={3} position={[0, h / 2, 0]} material={mat(C.ink, { r: 0.55 })} castShadow receiveShadow />
      <Pins size={size} n={6} len={size * 0.14} thick={Math.max(0.03, size * 0.035)} y={h * 0.35} />
      <RoundedBox args={[size * 0.58, h * 0.3, size * 0.58]} radius={Math.min(0.03 * size, h * 0.14)} smoothness={2} position={[0, h, 0]} material={mat(C.purple, { r: 0.5, m: 0.2 })} castShadow receiveShadow />
      <Traces s={size * 0.58} y={h + h * 0.16} />
      {/* pin 1 dot */}
      <mesh geometry={unitCyl()} scale={[size * 0.045, h * 0.1, size * 0.045]} position={[-size * 0.38, h, size * 0.38]} material={mat(C.cream, { r: 0.6 })} />
    </group>
  );
}

/** Side quest lab: AI for chip design. Giant cute chip on the roof. Faces +Z. */
export function Lab(props: GroupProps) {
  const wall = mat(C.wall, { r: 0.8 });
  const purple = mat(C.purple, { r: 0.65 });
  const teal = mat(C.teal, { r: 0.6 });
  const windowGlow = mat(C.glass, { glow: 0.35, e: C.teal, r: 0.2 });
  return (
    <group {...props}>
      {/* plinth + body */}
      <RoundedBox args={[W + 0.3, 0.4, D + 0.3]} radius={0.12} smoothness={2} position={[0, 0.2, 0]} material={purple} castShadow receiveShadow />
      <RoundedBox args={[W, H - 0.4, D]} radius={0.35} smoothness={4} position={[0, 0.4 + (H - 0.4) / 2, 0]} material={wall} castShadow receiveShadow />
      {/* roof cap */}
      <RoundedBox args={[W + 0.2, 0.3, D + 0.2]} radius={0.12} smoothness={2} position={[0, H - 0.1, 0]} material={teal} castShadow receiveShadow />

      {/* front: rounded door with porthole, sign above */}
      <group position={[0, 0, ZF]}>
        <RoundedBox args={[1.5, 2.3, 0.2]} radius={0.12} smoothness={3} position={[-1.6, 0.4 + 1.15, 0.02]} material={purple} castShadow receiveShadow />
        <mesh geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.36, 0.06, 0.36]} position={[-1.6, 2.15, 0.14]} material={windowGlow} />
        <mesh geometry={unitCyl()} scale={[0.07, 0.07, 0.07]} rotation={[Math.PI / 2, 0, 0]} position={[-1.05, 1.5, 0.15]} material={mat(C.yellow, { r: 0.4, m: 0.4 })} />
        {/* big round windows */}
        {[0.6, 2.2].map((x) => (
          <group key={x} position={[x, 2.0, 0]}>
            <mesh geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.62, 0.14, 0.62]} position={[0, 0, 0.03]} material={teal} castShadow />
            <mesh geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.48, 0.15, 0.48]} position={[0, 0, 0.05]} material={windowGlow} />
          </group>
        ))}
        {/* sign */}
        <RoundedBox args={[4.6, 0.75, 0.22]} radius={0.12} smoothness={3} position={[0.2, 3.3, 0.1]} material={mat(C.ink, { r: 0.6 })} castShadow />
        <Text position={[0.2, 3.31, 0.23]} fontSize={0.5} fontWeight="bold" letterSpacing={0.05} color={C.teal} anchorX="center" anchorY="middle">
          SIDE QUEST
        </Text>
        {/* step */}
        <RoundedBox args={[1.9, 0.2, 0.7]} radius={0.06} smoothness={2} position={[-1.6, 0.1, 0.3]} material={purple} castShadow receiveShadow />
      </group>

      {/* side stripes */}
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.08, 0.3, D - 0.8]} radius={0.03} smoothness={2} position={[s * (W / 2 + 0.01), 1.1, 0]} material={teal} castShadow />
      ))}

      {/* roof: chip on short stilts so it floats a little */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} geometry={unitCyl()} scale={[0.12, 0.35, 0.12]} position={[sx * 1.6, H + 0.2, sz * 1.6]} material={mat(C.metal, { r: 0.4, m: 0.3 })} castShadow />
        )),
      )}
      <ChipModel size={4.2} position={[0, H + 0.35, 0]} />
      {/* little antenna with a glowing tip */}
      <mesh geometry={unitCyl()} scale={[0.04, 0.9, 0.04]} position={[2.9, H + 0.45, -2.3]} material={mat(C.metal, { r: 0.4, m: 0.3 })} castShadow />
      <mesh geometry={lowSphere()} scale={0.14} position={[2.9, H + 0.95, -2.3]} material={mat(C.purple, { glow: 1.2 })} />
    </group>
  );
}
