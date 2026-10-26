"use client";

// Henil as a driver figure in Concrete & Ink: a faceted, low-poly figure in an ink race
// suit with paper panels, a paper helmet with a dark glass visor and the one orange
// stripe over the top, HG-08 on the chest in Plex Mono. Hard edges, matte, no toy face.
// Avatar: standing, origin at feet, faces +Z, ~1.75 m tall.

import { useMemo, useRef } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { C } from "../palette";
import { Label } from "./props/Label";

type GroupProps = ThreeElements["group"];

const std = (color: string, roughness = 0.7, metalness = 0.1) => new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });

let KIT: ReturnType<typeof makeKit> | null = null;
function makeKit() {
  const m = {
    suit: std(C.ink, 0.75, 0.1),
    panel: std(C.paper, 0.7),
    graphite: std(C.charcoal, 0.6, 0.3),
    helmet: std(C.paper, 0.5, 0.1),
    visor: std(C.glass, 0.15, 0.5),
    orange: std(C.orange, 0.55),
    boot: std(C.black, 0.8),
  };
  // six-sided limbs, eight-sided torso, faceted helmet
  const limb = new THREE.CylinderGeometry(1, 0.85, 1, 6).translate(0, -0.5, 0);
  const torso = new THREE.CylinderGeometry(0.19, 0.15, 0.56, 8).translate(0, 0.28, 0).scale(1, 1, 0.7);
  const helmet = new THREE.IcosahedronGeometry(0.15, 1).scale(1, 1.05, 1.1);
  const g = { limb, torso, helmet, box: new THREE.BoxGeometry(1, 1, 1) };
  return { m, g };
}
type Kit = ReturnType<typeof makeKit>;
function useKit() {
  return useMemo(() => (KIT ??= makeKit()), []);
}

function Head({ kit }: { kit: Kit }) {
  const { m, g } = kit;
  return (
    <group>
      <mesh geometry={g.helmet} material={m.helmet} castShadow receiveShadow />
      {/* visor: a slanted slab of dark glass across the front */}
      <mesh geometry={g.box} material={m.visor} position={[0, 0.0, 0.135]} rotation={[-0.15, 0, 0]} scale={[0.23, 0.075, 0.06]} />
      {/* the one orange stripe, front to back over the top */}
      <mesh geometry={g.box} material={m.orange} position={[0, 0.115, -0.005]} rotation={[0.08, 0, 0]} scale={[0.035, 0.07, 0.3]} />
      {/* chin bar */}
      <mesh geometry={g.box} material={m.graphite} position={[0, -0.095, 0.1]} scale={[0.17, 0.05, 0.08]} />
    </group>
  );
}

function Torso({ kit }: { kit: Kit }) {
  const { m, g } = kit;
  return (
    <group>
      <mesh geometry={g.torso} material={m.suit} castShadow receiveShadow />
      {/* paper side panels and collar */}
      {[1, -1].map((s) => (
        <mesh key={s} geometry={g.box} material={m.panel} position={[s * 0.168, 0.26, 0]} rotation={[0, 0, s * 0.07]} scale={[0.02, 0.4, 0.17]} />
      ))}
      <mesh geometry={g.box} material={m.graphite} position={[0, 0.575, 0]} scale={[0.17, 0.05, 0.13]} />
      {/* belt */}
      <mesh geometry={g.box} material={m.graphite} position={[0, 0.04, 0]} scale={[0.32, 0.05, 0.22]} />
      {/* chest code */}
      <Label mono position={[0.07, 0.42, 0.122]} fontSize={0.035} color={C.paper} letterSpacing={0.04}>
        HG-08
      </Label>
    </group>
  );
}

const SHOULDER_Y = 0.52;
const HIP_Y = 0.86;

function Arm({ kit }: { kit: Kit }) {
  // hangs from its pivot
  const { m, g } = kit;
  return (
    <group>
      <mesh geometry={g.limb} material={m.suit} scale={[0.055, 0.3, 0.055]} castShadow />
      <mesh geometry={g.limb} material={m.suit} position={[0, -0.3, 0]} scale={[0.048, 0.26, 0.048]} castShadow />
      {/* paper cuff, graphite glove */}
      <mesh geometry={g.box} material={m.panel} position={[0, -0.55, 0]} scale={[0.085, 0.03, 0.085]} />
      <mesh geometry={g.box} material={m.graphite} position={[0, -0.61, 0]} scale={[0.07, 0.09, 0.05]} castShadow />
    </group>
  );
}

export type AvatarProps = GroupProps & { wave?: boolean; look?: [number, number, number] };

const _v = new THREE.Vector3();

export function Avatar({ wave = false, look, ...props }: AvatarProps) {
  const kit = useKit();
  const { m, g } = kit;
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const rArm = useRef<THREE.Group>(null);
  const lArm = useRef<THREE.Group>(null);
  const waveAmt = useRef(0);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const b = Math.sin(t * 2.2);
    if (body.current) body.current.position.y = HIP_Y + b * 0.006;
    waveAmt.current = THREE.MathUtils.damp(waveAmt.current, wave ? 1 : 0, 6, dt);
    const w = waveAmt.current;
    if (rArm.current) {
      rArm.current.rotation.z = THREE.MathUtils.lerp(-0.08, -2.6 + Math.sin(t * 7) * 0.25, w);
      rArm.current.rotation.x = Math.sin(t * 2.2 + 1) * 0.03 * (1 - w);
    }
    if (lArm.current) lArm.current.rotation.z = 0.08 + Math.sin(t * 2.2) * 0.02;
    if (head.current) {
      let yaw = Math.sin(t * 0.7) * 0.05;
      let pitch = 0;
      if (look && head.current.parent) {
        _v.set(look[0], look[1], look[2]);
        head.current.parent.worldToLocal(_v);
        _v.sub(head.current.position);
        yaw = THREE.MathUtils.clamp(Math.atan2(_v.x, _v.z), -0.6, 0.6);
        pitch = THREE.MathUtils.clamp(-Math.atan2(_v.y, Math.hypot(_v.x, _v.z)), -0.3, 0.3);
      }
      head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, yaw, 5, dt);
      head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, pitch, 5, dt);
      head.current.rotation.z = w * Math.sin(t * 4.5) * 0.04;
    }
  });

  return (
    <group {...props}>
      {/* legs + boots */}
      {[1, -1].map((s) => (
        <group key={s} position={[s * 0.085, HIP_Y, 0]}>
          <mesh geometry={g.limb} material={m.suit} scale={[0.075, 0.42, 0.075]} castShadow receiveShadow />
          <mesh geometry={g.limb} material={m.suit} position={[0, -0.42, 0]} scale={[0.062, 0.36, 0.062]} castShadow />
          <mesh geometry={g.box} material={m.boot} position={[0, -HIP_Y + 0.045, 0.03]} scale={[0.1, 0.09, 0.24]} castShadow receiveShadow />
        </group>
      ))}
      <group ref={body} position={[0, HIP_Y, 0]}>
        <Torso kit={kit} />
        <group ref={rArm} position={[-0.21, SHOULDER_Y, 0]}>
          <Arm kit={kit} />
        </group>
        <group ref={lArm} position={[0.21, SHOULDER_Y, 0]}>
          <Arm kit={kit} />
        </group>
        <group ref={head} position={[0, 0.74, 0]}>
          <Head kit={kit} />
        </group>
      </group>
    </group>
  );
}
