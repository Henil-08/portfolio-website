// Static. ~10.6 x 5.2 x 5 m (W x H x D), seats face +Z.
// Collider: one cuboid 10.6 x 2.4 x 4.6 centered at (0, 1.2, -0.3) covers the tiers;
// roof posts at x = +-5.1, z = -2.45 (r=0.15) if you want them.
"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { Label } from "./Label";
import { geo, mat, rng, unitBox, type GroupProps } from "./shared";

const W = 10;
const ROWS = 4;
const STEP_H = 0.5;
const STEP_D = 0.95;
const PER_ROW = 16;
const Z0 = 1.6; // front edge of the first tier

// restrained crowd: mostly team kit (red / white / charcoal) with a few greys
const SHIRTS = [C.red, C.red, C.white, C.white, C.white, C.charcoal, C.charcoal, C.greyLight, C.grey, C.redDark];
const SKINS = [C.skin, C.skinShade, "#e3b48f", "#a8714f", "#7c5038"];

function bodyGeo() {
  return geo("fan-body", () => {
    const g = new THREE.CapsuleGeometry(0.15, 0.2, 6, 14);
    g.translate(0, 0.25, 0);
    return g;
  });
}
function headGeo() {
  return geo("fan-head", () => {
    const g = new THREE.SphereGeometry(0.12, 18, 12);
    g.translate(0, 0.62, 0);
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
        if (r() < 0.08) continue; // a few empty seats
        list.push({
          x: -W / 2 + 0.45 + (i + 0.5) * ((W - 0.9) / PER_ROW),
          y: (row + 1) * STEP_H,
          z: Z0 - row * STEP_D - STEP_D * 0.45,
          phase: r() * Math.PI * 2,
          s: 0.95 + r() * 0.1,
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
      const hop = cheer ? Math.max(0, Math.sin(t * 5 + f.phase)) * 0.08 : 0;
      o.position.set(f.x, f.y + hop, f.z);
      o.rotation.set(0, Math.sin(f.phase) * 0.15, 0);
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
      <instancedMesh ref={bodies} args={[bodyGeo(), mat(C.white, { r: 0.45 }), fans.length]} castShadow receiveShadow />
      <instancedMesh ref={heads} args={[headGeo(), mat(C.white, { r: 0.45 }), fans.length]} castShadow />
    </>
  );
}

/** Modern grandstand: white stepped tiers, grey/red seats, a tidy instanced crowd and a cantilever roof. */
export function Grandstand({ cheer = false, ...props }: GroupProps & { cheer?: boolean }) {
  const white = mat(C.white, { r: 0.3 });
  const red = mat(C.red, { r: 0.35 });
  const ink = mat(C.ink, { r: 0.45, m: 0.1 });
  const steel = mat(C.metal, { r: 0.3, m: 0.5 });
  const backZ = Z0 - ROWS * STEP_D;
  const roofY = ROWS * STEP_H + 2.7;
  return (
    <group {...props}>
      {/* tiers (each a full-height block so the side reads as steps) */}
      {Array.from({ length: ROWS }, (_, row) => (
        <group key={row}>
          <RoundedBox
            args={[W, (row + 1) * STEP_H, STEP_D + 0.02]}
            radius={0.03}
            smoothness={2}
            position={[0, ((row + 1) * STEP_H) / 2, Z0 - row * STEP_D - STEP_D / 2]}
            material={white}
            castShadow
            receiveShadow
          />
          {/* seat strip: charcoal, the top row in team red */}
          <RoundedBox
            args={[W - 0.3, 0.1, 0.36]}
            radius={0.03}
            smoothness={2}
            position={[0, (row + 1) * STEP_H + 0.04, Z0 - row * STEP_D - STEP_D * 0.62]}
            material={row === ROWS - 1 ? red : mat(C.greyDark, { r: 0.45 })}
            castShadow
            receiveShadow
          />
          {/* riser shadow line */}
          <mesh geometry={unitBox()} scale={[W - 0.02, 0.03, 0.01]} position={[0, (row + 1) * STEP_H - 0.06, Z0 - row * STEP_D + 0.012]} material={mat(C.greyLight, { r: 0.5 })} />
        </group>
      ))}
      <Crowd cheer={cheer} />
      {/* back wall: charcoal with a red band */}
      <RoundedBox args={[W + 0.4, roofY, 0.25]} radius={0.03} smoothness={2} position={[0, roofY / 2, backZ - 0.12]} material={ink} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[W + 0.42, 0.18, 0.26]} position={[0, roofY - 0.6, backZ - 0.12]} material={red} />
      {/* side fins */}
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.12, ROWS * STEP_H + 0.4, ROWS * STEP_D + 0.4]} radius={0.03} smoothness={2} position={[s * (W / 2 + 0.06), (ROWS * STEP_H + 0.4) / 2, Z0 - (ROWS * STEP_D) / 2 + 0.1]} material={white} castShadow receiveShadow />
      ))}
      {/* front balustrade: white broadcast banner with a red tab */}
      <mesh geometry={unitBox()} scale={[W, 0.5, 0.08]} position={[0, 0.25, Z0 + 0.1]} material={white} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[1.2, 0.5, 0.085]} position={[-W / 2 + 0.6, 0.25, Z0 + 0.1]} material={red} />
      <Label position={[-W / 2 + 0.6, 0.26, Z0 + 0.15]} fontSize={0.2} color={C.white} letterSpacing={0.08}>
        HG
      </Label>
      <Label position={[-W / 2 + 1.5, 0.29, Z0 + 0.15]} anchorX="left" fontSize={0.26} color={C.ink} letterSpacing={0.1}>
        GO HENIL GO
      </Label>
      <Label position={[W / 2 - 0.3, 0.27, Z0 + 0.15]} anchorX="right" fontSize={0.09} color={C.greyDark} letterSpacing={0.3}>
        MAIN GRANDSTAND · T1
      </Label>
      <mesh geometry={unitBox()} scale={[W, 0.03, 0.09]} position={[0, 0.03, Z0 + 0.1]} material={red} />
      {/* cantilever roof: thin white blade on slim steel posts at the back */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={unitBox()} scale={[0.14, roofY, 0.14]} position={[s * (W / 2 + 0.1), roofY / 2, backZ + 0.1]} material={steel} castShadow />
      ))}
      <group position={[0, roofY, backZ + 1.2]} rotation={[-0.1, 0, 0]}>
        <RoundedBox args={[W + 1, 0.14, 2.8]} radius={0.03} smoothness={2} material={white} castShadow receiveShadow />
        <mesh geometry={unitBox()} scale={[W + 1.02, 0.2, 0.06]} position={[0, -0.02, 1.4]} material={red} />
        <mesh geometry={unitBox()} scale={[W, 0.02, 0.1]} position={[0, -0.08, 0.9]} material={mat(C.white, { glow: 0.8 })} />
      </group>
    </group>
  );
}
