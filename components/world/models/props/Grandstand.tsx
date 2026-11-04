// Static. The main grandstand: the approved model (kit/builtTrackside.tsx, concept
// grandstand) at the game's size (STAND_GAME at STAND_SCALE: ~10 x 5.6 x 5 m), seats facing
// +Z, with a crowd that can cheer and the printed front board.
// Collider: one cuboid 10.2 x 2.4 x 4.9 centered at (0, 1.2, -0.42) covers the tiers.
"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { boardTexture, loadBoardFonts } from "../../street/boardArt";
import { K } from "../../street/ink";
import { Built } from "../../kit/builtShared";
import { STAND_GAME, STAND_SCALE, STAND_Z, grandstandFrame, grandstandParts, standSeats } from "../../kit/builtTrackside";
import { geo, mat, rng, type GroupProps } from "./shared";

const SEATS = standSeats(STAND_GAME);
const FRONT = grandstandFrame(STAND_GAME).front * STAND_SCALE + STAND_Z;

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
    for (const [x, y, z] of SEATS) {
      if (r() < 0.08) continue; // a few empty seats
      list.push({ x: x * STAND_SCALE, y: y * STAND_SCALE, z: z * STAND_SCALE + STAND_Z, phase: r() * Math.PI * 2, s: 0.95 + r() * 0.1 });
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

const BOARD_W = 9.4;
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
    <mesh position={[-0.6, 0.34, FRONT + 0.02]} scale={[BOARD_W, BOARD_H, 1]} material={m}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

/** The main grandstand with a crowd that can cheer. */
export function Grandstand({ cheer = false, ...props }: GroupProps & { cheer?: boolean }) {
  return (
    <group {...props}>
      <group position={[0, 0, STAND_Z]} scale={STAND_SCALE}>
        <Built parts={grandstandParts(STAND_GAME)} />
      </group>
      <Crowd cheer={cheer} />
      <FrontBoard />
    </group>
  );
}
