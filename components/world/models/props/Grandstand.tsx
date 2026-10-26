// Static. ~10.6 x 5.2 x 5 m (W x H x D), seats face +Z. W06 in the approved world
// ("Concrete & Ink", docs/BRAND.md): concrete tiers, graphite seats with one paper row,
// an ink frame and cantilever roof with a paper fascia, a darker concrete back wall.
// Collider: one cuboid 10.6 x 2.4 x 4.6 centered at (0, 1.2, -0.3) covers the tiers;
// roof posts at x = +-5.1, z = -2.45 (r=0.15) if you want them.
"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { boardTexture, loadBoardFonts } from "../../street/boardArt";
import { K, km } from "../../street/ink";
import { geo, mat, rng, unitBox, type GroupProps } from "./shared";

const W = 10;
const ROWS = 4;
const STEP_H = 0.5;
const STEP_D = 0.95;
const PER_ROW = 16;
const Z0 = 1.6; // front edge of the first tier

// a restrained crowd: paper, ink and greys (the marshals wear the orange)
const SHIRTS = [K.paper, K.paper, K.paper, K.ink, K.ink, K.graphite, K.concrete, K.concreteDark, "#4d5a61"];
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

const BOARD_W = 10;
const BOARD_H = 0.5;

/** The printed front board (mark and text, see street/boardArt), drawn once the fonts are in. */
function FrontBoard() {
  const [m, setM] = useState<THREE.MeshStandardMaterial | null>(null);
  useEffect(() => {
    let dead = false;
    let made: THREE.MeshStandardMaterial | null = null;
    void loadBoardFonts().then((fonts) => {
      if (dead) return;
      made = new THREE.MeshStandardMaterial({ map: boardTexture([{ text: "GO HENIL GO" }], BOARD_W, BOARD_H, fonts), roughness: 0.55 });
      setM(made);
    });
    return () => {
      dead = true;
      made?.map?.dispose();
      made?.dispose();
    };
  }, []);
  if (!m) return null;
  return (
    <mesh position={[0, 0.25, Z0 + 0.15]} scale={[BOARD_W, BOARD_H, 1]} material={m}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

const Part = ({ s, p, m, r = 0, shadow = true }: { s: [number, number, number]; p: [number, number, number]; m: THREE.Material; r?: number; shadow?: boolean }) => (
  <mesh geometry={unitBox()} scale={s} position={p} rotation={[r, 0, 0]} material={m} castShadow={shadow} receiveShadow />
);

/** The main grandstand (W06) with a crowd that can cheer. */
export function Grandstand({ cheer = false, ...props }: GroupProps & { cheer?: boolean }) {
  const concrete = km.concrete();
  const ink = km.ink();
  const backZ = Z0 - ROWS * STEP_D;
  const roofY = ROWS * STEP_H + 2.7;
  const tilt = -0.12;
  return (
    <group {...props}>
      {/* tiers (each a full-height block so the side reads as steps), a seat row on each */}
      {Array.from({ length: ROWS }, (_, row) => (
        <group key={row}>
          <Part s={[W, (row + 1) * STEP_H, STEP_D + 0.02]} p={[0, ((row + 1) * STEP_H) / 2, Z0 - row * STEP_D - STEP_D / 2]} m={concrete} />
          <Part s={[W - 0.6, 0.32, 0.4]} p={[0, (row + 1) * STEP_H + 0.16, Z0 - row * STEP_D - STEP_D * 0.62]} m={row === 2 ? km.paper() : km.graphite()} />
        </group>
      ))}
      <Crowd cheer={cheer} />
      {/* back wall in darker concrete, side walls and the front wall in concrete */}
      <Part s={[W + 0.4, roofY, 0.25]} p={[0, roofY / 2, backZ - 0.12]} m={km.concreteDark()} />
      {[-1, 1].map((s) => (
        <Part key={s} s={[0.12, ROWS * STEP_H + 0.4, ROWS * STEP_D + 0.4]} p={[s * (W / 2 + 0.06), (ROWS * STEP_H + 0.4) / 2, Z0 - (ROWS * STEP_D) / 2 + 0.1]} m={concrete} />
      ))}
      <Part s={[W, 0.5, 0.08]} p={[0, 0.25, Z0 + 0.1]} m={concrete} />
      <FrontBoard />
      {/* the ink frame: posts at the back, a beam over each, the roof slab and a paper fascia */}
      {[-W / 2 + 0.3, 0, W / 2 - 0.3].map((x) => (
        <group key={x}>
          <Part s={[0.25, roofY, 0.25]} p={[x, roofY / 2, backZ - 0.2]} m={ink} />
          <Part s={[0.2, 0.25, 3.2]} p={[x, roofY - 0.12, backZ + 1.3]} r={tilt} m={ink} />
        </group>
      ))}
      <Part s={[W + 0.6, 0.18, 3.4]} p={[0, roofY + 0.05, backZ + 1.3]} r={tilt} m={ink} />
      <Part s={[W + 0.6, 0.5, 0.1]} p={[0, roofY + 0.06, backZ + 3.0]} r={tilt} m={km.paper()} />
      <Part s={[W, 0.02, 0.1]} p={[0, roofY - 0.1, backZ + 2.4]} m={mat(C.white, { glow: 0.8 })} shadow={false} />
    </group>
  );
}
