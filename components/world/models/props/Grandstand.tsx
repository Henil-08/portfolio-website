// Static. ~10.6 x 5.2 x 5 m (W x H x D), seats face +Z.
// Collider: one cuboid 10.6 x 2.4 x 4.6 centered at (0, 1.2, -0.3) covers the tiers;
// roof posts at x = +-5.1, z = -2.45 (r=0.15) if you want them.
"use client";

import { RoundedBox, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { geo, mat, rng, unitBox, unitCyl, type GroupProps } from "./shared";

const W = 10;
const ROWS = 4;
const STEP_H = 0.5;
const STEP_D = 0.95;
const PER_ROW = 16;
const Z0 = 1.6; // front edge of the first tier

const SHIRTS = [C.red, C.yellow, C.blue, C.teal, C.purple, C.orange, C.pink, C.white, C.jacketBlack, C.redDark];
const SKINS = [C.skin, C.skinShade, C.hoodie, "#f1c9a5", "#8d5a3b"];

function bodyGeo() {
  return geo("fan-body", () => {
    const g = new THREE.CapsuleGeometry(0.17, 0.2, 4, 10);
    g.translate(0, 0.27, 0);
    return g;
  });
}
function headGeo() {
  return geo("fan-head", () => {
    const g = new THREE.SphereGeometry(0.15, 14, 10);
    g.translate(0, 0.66, 0);
    return g;
  });
}

type Fan = { x: number; y: number; z: number; phase: number; s: number };

function Crowd({ cheer }: { cheer: boolean }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const fans = useMemo(() => {
    const r = rng(7);
    const list: Fan[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let i = 0; i < PER_ROW; i++) {
        if (r() < 0.06) continue; // a few empty seats
        list.push({
          x: -W / 2 + 0.45 + (i + 0.5) * ((W - 0.9) / PER_ROW) + (r() - 0.5) * 0.12,
          y: (row + 1) * STEP_H,
          z: Z0 - row * STEP_D - STEP_D * 0.45,
          phase: r() * Math.PI * 2,
          s: 0.9 + r() * 0.22,
        });
      }
    }
    return list;
  }, []);
  useLayoutEffect(() => {
    const r = rng(3);
    const c = new THREE.Color();
    fans.forEach((_, i) => {
      bodies.current?.setColorAt(i, c.set(SHIRTS[Math.floor(r() * SHIRTS.length)]));
      heads.current?.setColorAt(i, c.set(SKINS[Math.floor(r() * SKINS.length)]));
    });
    if (bodies.current?.instanceColor) bodies.current.instanceColor.needsUpdate = true;
    if (heads.current?.instanceColor) heads.current.instanceColor.needsUpdate = true;
  }, [fans]);
  const o = useMemo(() => new THREE.Object3D(), []);
  const place = (t: number) => {
    fans.forEach((f, i) => {
      const hop = cheer ? Math.max(0, Math.sin(t * 7 + f.phase)) * 0.22 : 0;
      o.position.set(f.x, f.y + hop, f.z);
      o.rotation.set(0, Math.sin(f.phase) * 0.3, cheer ? Math.sin(t * 5 + f.phase) * 0.12 : 0);
      o.scale.setScalar(f.s);
      o.updateMatrix();
      bodies.current?.setMatrixAt(i, o.matrix);
      heads.current?.setMatrixAt(i, o.matrix);
    });
    if (bodies.current) bodies.current.instanceMatrix.needsUpdate = true;
    if (heads.current) heads.current.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => place(0));
  useFrame(({ clock }) => {
    if (cheer) place(clock.elapsedTime);
  });
  return (
    <>
      <instancedMesh ref={bodies} args={[bodyGeo(), mat(C.white, { r: 0.75 }), fans.length]} castShadow receiveShadow />
      <instancedMesh ref={heads} args={[headGeo(), mat(C.white, { r: 0.7 }), fans.length]} castShadow />
    </>
  );
}

/** Small grandstand: tiered seats, an instanced cute crowd (~50 fans) and a canopy roof. */
export function Grandstand({ cheer = false, ...props }: GroupProps & { cheer?: boolean }) {
  const tierCols = [C.blue, C.teal, C.blue, C.teal];
  const backZ = Z0 - ROWS * STEP_D;
  const roofY = ROWS * STEP_H + 2.7;
  return (
    <group {...props}>
      {/* tiers (each a full-height block so the side reads as steps) */}
      {Array.from({ length: ROWS }, (_, row) => (
        <group key={row}>
          <RoundedBox
            args={[W, (row + 1) * STEP_H, STEP_D + 0.02]}
            radius={0.06}
            smoothness={2}
            position={[0, ((row + 1) * STEP_H) / 2, Z0 - row * STEP_D - STEP_D / 2]}
            material={mat(C.wall, { r: 0.8 })}
            castShadow
            receiveShadow
          />
          {/* colored seat strip */}
          <RoundedBox
            args={[W - 0.3, 0.12, 0.4]}
            radius={0.05}
            smoothness={2}
            position={[0, (row + 1) * STEP_H + 0.04, Z0 - row * STEP_D - STEP_D * 0.62]}
            material={mat(tierCols[row], { r: 0.6 })}
            castShadow
            receiveShadow
          />
        </group>
      ))}
      <Crowd cheer={cheer} />
      {/* back wall */}
      <RoundedBox args={[W + 0.4, roofY, 0.25]} radius={0.08} smoothness={2} position={[0, roofY / 2, backZ - 0.12]} material={mat(C.red, { r: 0.65 })} castShadow receiveShadow />
      {/* front rail */}
      <RoundedBox args={[W, 0.5, 0.14]} radius={0.06} smoothness={2} position={[0, 0.25, Z0 + 0.12]} material={mat(C.ink, { r: 0.6 })} castShadow receiveShadow />
      <Text position={[0, 0.27, Z0 + 0.2]} fontSize={0.3} fontWeight="bold" color={C.yellow} anchorX="center" anchorY="middle" letterSpacing={0.15}>
        GO HENIL GO
      </Text>
      {/* roof: posts + sloped canopy with stripes */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={unitCyl()} scale={[0.15, roofY, 0.15]} position={[s * (W / 2 + 0.1), roofY / 2, backZ + 0.1]} material={mat(C.metal, { r: 0.4, m: 0.3 })} castShadow />
      ))}
      <group position={[0, roofY, backZ + 1.2]} rotation={[-0.14, 0, 0]}>
        {Array.from({ length: 8 }, (_, i) => (
          <RoundedBox
            key={i}
            args={[(W + 1) / 8 + 0.005, 0.18, 2.8]}
            radius={0.07}
            smoothness={2}
            position={[-(W + 1) / 2 + ((W + 1) / 8) * (i + 0.5), 0, 0]}
            material={mat(i % 2 ? C.white : C.red, { r: 0.65 })}
            castShadow
            receiveShadow
          />
        ))}
        <mesh geometry={unitBox()} scale={[W + 1.1, 0.3, 0.12]} position={[0, -0.05, 1.42]} material={mat(C.yellow, { r: 0.6 })} castShadow />
      </group>
    </group>
  );
}
