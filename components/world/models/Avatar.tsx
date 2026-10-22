"use client";

// Chibi Henil. Avatar: standing, origin at feet, faces +Z, ~1.3 m tall.
// Driver: seated, origin at hip, faces +X (drop it into CarBody at (-0.15, 0.05, 0)).

import { useMemo, useRef } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { C } from "../palette";

type GroupProps = ThreeElements["group"];
const PI = Math.PI;

function mat(color: string, roughness = 0.7, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function useAvatarKit() {
  return useMemo(() => {
    const m = {
      skin: mat(C.skin, 0.65),
      skinShade: mat(C.skinShade, 0.7),
      hair: mat(C.hair, 0.38, 0.15),
      ink: mat(C.ink, 0.6),
      white: mat(C.white, 0.5),
      vest: mat(C.jacketBlack, 0.6, 0.1),
      jacket: mat(C.jacketWhite, 0.75),
      hoodie: mat(C.hoodie, 0.85),
      jeans: mat(C.jeans, 0.85),
      mouth: mat(C.redDark, 0.6),
      red: mat(C.red, 0.6),
      blush: new THREE.MeshStandardMaterial({ color: C.pink, roughness: 0.9, transparent: true, opacity: 0.55 }),
    };
    m.hair.side = THREE.DoubleSide;
    m.mouth.side = THREE.DoubleSide;
    const g = {
      sphere: new THREE.SphereGeometry(1, 28, 20),
      lowSphere: new THREE.SphereGeometry(1, 14, 10),
      hairCap: new THREE.SphereGeometry(1, 32, 16, 0, PI * 2, 0, PI * 0.56),
      halfDown: new THREE.SphereGeometry(1, 20, 10, 0, PI * 2, PI / 2, PI / 2),
      capsule: new THREE.CapsuleGeometry(1, 1, 6, 16),
      ring: new THREE.TorusGeometry(1, 0.11, 10, 32),
      puff: new THREE.TorusGeometry(1, 0.1, 10, 32),
      band: new THREE.TorusGeometry(1, 0.075, 8, 28, PI),
    };
    return { m, g };
  }, []);
}
type Kit = ReturnType<typeof useAvatarKit>;

const MIC_FROM = new THREE.Vector3(0.28, -0.05, 0.02);
const MIC_TO = new THREE.Vector3(0.09, -0.12, 0.25);

/* ------------------------------------------------------------------ */
/* Head (center origin, faces +Z, radius ~0.27)                        */
/* ------------------------------------------------------------------ */

function Head({ kit, headset = false }: { kit: Kit; headset?: boolean }) {
  const { m, g } = kit;
  return (
    <group>
      {/* skull */}
      <mesh geometry={g.sphere} material={m.skin} scale={[0.27, 0.255, 0.255]} castShadow receiveShadow />
      {/* ears */}
      {[1, -1].map((s) => (
        <mesh key={s} geometry={g.lowSphere} material={m.skin} position={[s * 0.262, -0.02, 0]} scale={[0.03, 0.055, 0.045]} castShadow />
      ))}

      {/* hair: cap tilted back so the forehead shows, plus a swept-up quiff */}
      <mesh geometry={g.hairCap} material={m.hair} position={[0, 0.02, -0.015]} rotation={[-0.62, 0, 0]} scale={[0.287, 0.28, 0.276]} castShadow />
      {/* volume on top */}
      <mesh geometry={g.sphere} material={m.hair} position={[0.01, 0.19, 0.0]} rotation={[0.2, 0, -0.1]} scale={[0.235, 0.13, 0.22]} castShadow />
      {/* front quiff swept up and over to his left */}
      <mesh geometry={g.sphere} material={m.hair} position={[-0.05, 0.23, 0.15]} rotation={[0.75, 0, -0.35]} scale={[0.15, 0.075, 0.1]} castShadow />
      <mesh geometry={g.sphere} material={m.hair} position={[0.07, 0.27, 0.12]} rotation={[0.6, 0, -0.55]} scale={[0.16, 0.08, 0.11]} castShadow />
      <mesh geometry={g.sphere} material={m.hair} position={[0.17, 0.24, 0.07]} rotation={[0.3, 0, -0.95]} scale={[0.11, 0.065, 0.1]} castShadow />

      {/* eyes with highlights */}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh geometry={g.lowSphere} material={m.ink} position={[s * 0.092, -0.01, 0.236]} scale={[0.036, 0.05, 0.022]} />
          <mesh geometry={g.lowSphere} material={m.white} position={[s * 0.092 + 0.012, 0.01, 0.255]} scale={0.012} />
          {/* brow */}
          <mesh geometry={g.capsule} material={m.hair} position={[s * 0.1, 0.075, 0.232]} rotation={[0, 0, PI / 2 + s * 0.12]} scale={[0.013, 0.025, 0.013]} />
          {/* blush */}
          <mesh geometry={g.lowSphere} material={m.blush} position={[s * 0.16, -0.075, 0.2]} rotation={[0, s * 0.6, 0]} scale={[0.04, 0.024, 0.015]} />
        </group>
      ))}

      {/* nose */}
      <mesh geometry={g.lowSphere} material={m.skinShade} position={[0, -0.045, 0.255]} scale={[0.024, 0.018, 0.018]} />
      {/* big smile */}
      <mesh geometry={g.halfDown} material={m.mouth} position={[0, -0.095, 0.228]} rotation={[0.3, 0, 0]} scale={[0.072, 0.05, 0.03]} />

      {headset && (
        <group>
          {/* band over the hair */}
          <mesh geometry={g.band} material={m.ink} position={[0, -0.02, -0.04]} rotation={[-0.15, 0, 0]} scale={[0.3, 0.33, 0.3]} castShadow />
          {[1, -1].map((s) => (
            <mesh key={s} geometry={g.capsule} material={m.red} position={[s * 0.285, -0.02, -0.01]} rotation={[0, 0, PI / 2]} scale={[0.07, 0.01, 0.07]} castShadow />
          ))}
          {/* mic boom from the left cup to the mouth */}
          <Limb kit={kit} from={MIC_FROM} to={MIC_TO} radius={0.016} material={m.ink} />
          <mesh geometry={g.lowSphere} material={m.red} position={MIC_TO} scale={0.032} />
        </group>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Torso (origin at hip, faces +Z)                                     */
/* ------------------------------------------------------------------ */

function Torso({ kit }: { kit: Kit }) {
  const { m, g } = kit;
  return (
    <group>
      {/* white jacket core */}
      <mesh geometry={g.capsule} material={m.jacket} position={[0, 0.2, 0]} scale={[0.165, 0.11, 0.135]} castShadow />
      {/* black puffer vest + quilting */}
      <mesh geometry={g.capsule} material={m.vest} position={[0, 0.2, 0]} scale={[0.18, 0.1, 0.15]} castShadow receiveShadow />
      {[0.13, 0.2, 0.27].map((y) => (
        <mesh key={y} geometry={g.puff} material={m.vest} position={[0, y, 0]} rotation={[PI / 2, 0, 0]} scale={[0.172, 0.143, 0.2]} castShadow />
      ))}
      {/* beige hoodie collar + hood */}
      <mesh geometry={g.ring} material={m.hoodie} position={[0, 0.39, 0]} rotation={[PI / 2, 0, 0]} scale={[0.115, 0.105, 0.42]} castShadow />
      <mesh geometry={g.sphere} material={m.hoodie} position={[0, 0.37, -0.12]} scale={[0.14, 0.08, 0.07]} castShadow />
    </group>
  );
}

const SHOULDER_Y = 0.33;

function Arm({ kit, side }: { kit: Kit; side: 1 | -1 }) {
  // hangs straight down from its pivot
  const { m, g } = kit;
  return (
    <group>
      <mesh geometry={g.capsule} material={m.jacket} position={[0, -0.11, 0]} scale={[0.055, 0.1, 0.055]} castShadow />
      <mesh geometry={g.sphere} material={m.skin} position={[side * 0.005, -0.25, 0]} scale={[0.062, 0.066, 0.058]} castShadow />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar (standing)                                                   */
/* ------------------------------------------------------------------ */

export type AvatarProps = GroupProps & { wave?: boolean; look?: [number, number, number] };

const _v = new THREE.Vector3();

export function Avatar({ wave = false, look, ...props }: AvatarProps) {
  const kit = useAvatarKit();
  const { m, g } = kit;
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const rArm = useRef<THREE.Group>(null);
  const lArm = useRef<THREE.Group>(null);
  const waveAmt = useRef(0);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const b = Math.sin(t * 2.2);
    if (body.current) {
      body.current.position.y = 0.3 + b * 0.008;
      body.current.scale.set(1 - b * 0.008, 1 + b * 0.012, 1 - b * 0.008);
    }
    waveAmt.current = THREE.MathUtils.damp(waveAmt.current, wave ? 1 : 0, 6, dt);
    const w = waveAmt.current;
    if (rArm.current) {
      rArm.current.rotation.z = THREE.MathUtils.lerp(-0.12, -2.35 + Math.sin(t * 9) * 0.35, w);
      rArm.current.rotation.x = Math.sin(t * 2.2 + 1) * 0.03 * (1 - w);
    }
    if (lArm.current) lArm.current.rotation.z = 0.12 + Math.sin(t * 2.2) * 0.02;
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
      head.current.rotation.z = w * Math.sin(t * 4.5) * 0.06;
    }
  });

  return (
    <group {...props}>
      {/* legs + sneakers */}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh geometry={g.capsule} material={m.jeans} position={[s * 0.085, 0.19, 0]} scale={[0.068, 0.08, 0.068]} castShadow />
          <RoundedBox args={[0.13, 0.09, 0.21]} radius={0.04} smoothness={3} position={[s * 0.088, 0.045, 0.025]} material={m.white} castShadow receiveShadow />
          <RoundedBox args={[0.135, 0.03, 0.215]} radius={0.012} smoothness={2} position={[s * 0.088, 0.012, 0.025]} material={m.ink} />
        </group>
      ))}
      <group ref={body} position={[0, 0.3, 0]}>
        <RoundedBox args={[0.3, 0.1, 0.22]} radius={0.05} smoothness={3} position={[0, 0.02, 0]} material={m.jeans} castShadow />
        <Torso kit={kit} />
        <group ref={rArm} position={[-0.185, SHOULDER_Y, 0]}>
          <Arm kit={kit} side={-1} />
        </group>
        <group ref={lArm} position={[0.185, SHOULDER_Y, 0]}>
          <Arm kit={kit} side={1} />
        </group>
        <group ref={head} position={[0, 0.66, 0]}>
          <Head kit={kit} />
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Driver (seated, origin at hip, faces +X)                            */
/* ------------------------------------------------------------------ */

export type DriverProps = GroupProps & { steer?: number; wave?: boolean };

const WHEEL_POS = new THREE.Vector3(0, 0.2, 0.3);
const WHEEL_R = 0.085;

/** Capsule spanning two points (for arms that reach the wheel). */
function Limb({
  kit,
  from,
  to,
  radius,
  material,
}: {
  kit: Kit;
  from: THREE.Vector3;
  to: THREE.Vector3;
  radius: number;
  material?: THREE.Material;
}) {
  const { pos, quat, len } = useMemo(() => {
    const dir = to.clone().sub(from);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { pos: from.clone().add(to).multiplyScalar(0.5), quat, len };
  }, [from, to]);
  return (
    <mesh
      geometry={kit.g.capsule}
      material={material ?? kit.m.jacket}
      position={pos}
      quaternion={quat}
      scale={[radius, Math.max(0.001, len / 2 - radius), radius]}
      castShadow
    />
  );
}

export function Driver({ steer = 0, wave = false, ...props }: DriverProps) {
  const kit = useAvatarKit();
  const { m, g } = kit;
  const wheel = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const waveArm = useRef<THREE.Group>(null);
  const waveAmt = useRef(0);
  const steerS = useRef(0);

  const pts = useMemo(() => {
    const shoulderL = new THREE.Vector3(0.17, SHOULDER_Y, 0.02);
    const shoulderR = new THREE.Vector3(-0.17, SHOULDER_Y, 0.02);
    const handL = new THREE.Vector3(WHEEL_R + 0.03, 0, 0).add(WHEEL_POS);
    const handR = new THREE.Vector3(-WHEEL_R - 0.03, 0, 0).add(WHEEL_POS);
    return { shoulderL, shoulderR, handL, handR };
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    steerS.current = THREE.MathUtils.damp(steerS.current, THREE.MathUtils.clamp(steer, -1, 1), 10, dt);
    const s = steerS.current;
    waveAmt.current = THREE.MathUtils.damp(waveAmt.current, wave ? 1 : 0, 6, dt);
    const w = waveAmt.current;
    // steering wheel turns about its column; whole arm rig rolls with it a bit
    if (rig.current) rig.current.rotation.z = -s * 0.45;
    if (wheel.current) wheel.current.rotation.z = -s * 0.5;
    if (torso.current) torso.current.rotation.z = -s * 0.06;
    if (head.current) {
      head.current.rotation.z = -s * 0.12;
      head.current.rotation.y = s * 0.3 + Math.sin(t * 0.9) * 0.03 - w * 0.3;
      head.current.position.y = 0.62 + Math.sin(t * 2.6) * 0.004;
    }
    if (waveArm.current) {
      waveArm.current.visible = w > 0.02;
      waveArm.current.scale.set(Math.max(0.001, w), Math.max(0.001, w * 1.3), Math.max(0.001, w));
      waveArm.current.rotation.z = -2.25 + Math.sin(t * 9) * 0.4;
    }
  });

  return (
    // build facing +Z, then turn so +Z -> +X
    <group {...props}>
      <group rotation={[0, PI / 2, 0]}>
        {/* thighs tucked into the tub */}
        {[1, -1].map((s) => (
          <mesh key={s} geometry={g.capsule} material={m.jeans} position={[s * 0.08, 0.0, 0.18]} rotation={[PI / 2, 0, 0]} scale={[0.065, 0.12, 0.065]} />
        ))}
        <group ref={torso}>
          <group position={[0, -0.06, 0]}>
            <Torso kit={kit} />
          </group>
          <group ref={head} position={[0, 0.62, 0]}>
            <Head kit={kit} headset />
          </group>
        </group>

        {/* arms + steering wheel rig: rolls with the wheel so the hands stay on it */}
        <group ref={rig} position={WHEEL_POS}>
          <group position={[-WHEEL_POS.x, -WHEEL_POS.y, -WHEEL_POS.z]}>
            <Limb kit={kit} from={pts.shoulderL} to={pts.handL} radius={0.05} />
            <mesh geometry={g.sphere} material={m.skin} position={pts.handL} scale={0.058} castShadow />
            {!wave && <Limb kit={kit} from={pts.shoulderR} to={pts.handR} radius={0.05} />}
            {!wave && <mesh geometry={g.sphere} material={m.skin} position={pts.handR} scale={0.058} castShadow />}
          </group>
          <group ref={wheel} rotation={[-0.35, 0, 0]}>
            <RoundedBox args={[0.26, 0.11, 0.045]} radius={0.022} smoothness={2} material={m.ink} castShadow />
            <RoundedBox args={[0.08, 0.05, 0.05]} radius={0.015} smoothness={2} position={[0, 0.012, 0.012]} material={m.red} />
          </group>
        </group>

        {/* waving arm (car's right side, toward the game camera) */}
        <group ref={waveArm} position={[-0.19, SHOULDER_Y, 0.02]} visible={false}>
          <Arm kit={kit} side={-1} />
        </group>
      </group>
    </group>
  );
}
