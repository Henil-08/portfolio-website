"use client";

// Chubby toy F1 car. CarBody origin is the CHASSIS CENTER (not the ground),
// matching the 2.2 x 0.5 x 1.1 m physics box. Forward is +X, right is +Z.
// Ground sits at y = -0.46 (wheel center -0.12, radius 0.34).

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import { C } from "../palette";

type GroupProps = ThreeElements["group"];

const PI = Math.PI;

function paint(color: string, roughness = 0.6, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function useCarMaterials() {
  return useMemo(
    () => ({
      red: paint(C.red, 0.6),
      redDark: paint(C.redDark, 0.65),
      cream: paint(C.cream, 0.6),
      white: paint(C.white, 0.6),
      ink: paint(C.ink, 0.75),
      metal: paint(C.metal, 0.35, 0.6),
    }),
    [],
  );
}

/* ------------------------------------------------------------------ */
/* Wheel                                                               */
/* ------------------------------------------------------------------ */

// Rounded-rectangle tyre profile, revolved around the axle.
function makeTyreGeometry(rOut = 0.34, rIn = 0.19, halfW = 0.15, corner = 0.1) {
  const pts: THREE.Vector2[] = [];
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 8) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
  };
  const ci = 0.03;
  // inner bottom -> outer bottom -> outer top -> inner top
  arc(rIn + ci, -halfW + ci, ci, PI, PI * 1.5, 3);
  arc(rOut - corner, -halfW + corner, corner, -PI / 2, 0, 10);
  arc(rOut - corner, halfW - corner, corner, 0, PI / 2, 10);
  arc(rIn + ci, halfW - ci, ci, PI / 2, PI, 3);
  const g = new THREE.LatheGeometry(pts, 40);
  g.rotateX(PI / 2); // lathe axis Y -> wheel axis Z
  return g;
}

export type CarWheelProps = GroupProps;

/** One wheel. Origin at wheel center, rolling axis = local Z. */
export function CarWheel(props: CarWheelProps) {
  const m = useCarMaterials();
  const geo = useMemo(() => {
    const rim = new THREE.CylinderGeometry(0.2, 0.2, 0.22, 28).rotateX(PI / 2);
    const hub = new THREE.CylinderGeometry(0.11, 0.11, 0.25, 6).rotateX(PI / 2);
    const nut = new THREE.CylinderGeometry(0.045, 0.045, 0.28, 12).rotateX(PI / 2);
    const stripe = new THREE.TorusGeometry(0.262, 0.016, 8, 40);
    return { tyre: makeTyreGeometry(), rim, hub, nut, stripe };
  }, []);
  const tyre = useMemo(() => paint(C.ink, 0.9, 0), []);
  return (
    <group {...props}>
      <mesh geometry={geo.tyre} material={tyre} castShadow receiveShadow />
      <mesh geometry={geo.rim} material={m.white} castShadow />
      <mesh geometry={geo.hub} material={m.red} castShadow />
      <mesh geometry={geo.nut} material={m.ink} />
      <mesh geometry={geo.stripe} material={m.red} position={[0, 0, 0.143]} />
      <mesh geometry={geo.stripe} material={m.red} position={[0, 0, -0.143]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Body                                                                */
/* ------------------------------------------------------------------ */

export type CarBodyProps = GroupProps & { brakeLight?: boolean };

/** Flat text lying on a top surface, readable from behind the car. */
function TopText({
  children,
  position,
  size,
  color,
  tilt = 0,
}: {
  children: string;
  position: [number, number, number];
  size: number;
  color: string;
  tilt?: number;
}) {
  return (
    <group position={position} rotation={[0, 0, tilt]}>
      <group rotation={[0, -PI / 2, 0]}>
        <Text rotation={[-PI / 2, 0, 0]} fontSize={size} color={color} anchorX="center" anchorY="middle">
          {children}
        </Text>
      </group>
    </group>
  );
}

export function CarBody({ brakeLight = false, children, ...props }: CarBodyProps) {
  const m = useCarMaterials();
  const geo = useMemo(() => {
    const nose = new THREE.CapsuleGeometry(0.17, 0.62, 8, 20);
    const tip = new THREE.SphereGeometry(0.17, 20, 14);
    const cover = new THREE.CapsuleGeometry(0.2, 0.5, 8, 20);
    const rim = new THREE.TorusGeometry(0.21, 0.055, 10, 32);
    const pit = new THREE.CylinderGeometry(0.21, 0.21, 0.04, 28);
    const halo = new THREE.TorusGeometry(0.25, 0.04, 10, 28, PI);
    const rod = new THREE.CylinderGeometry(0.034, 0.034, 1, 10);
    const arm = new THREE.CylinderGeometry(0.026, 0.026, 1.18, 8).rotateX(PI / 2);
    const disc = new THREE.CylinderGeometry(0.115, 0.115, 0.02, 24);
    const exhaust = new THREE.CylinderGeometry(0.05, 0.06, 0.16, 14).rotateZ(PI / 2);
    return { nose, tip, cover, rim, pit, halo, rod, arm, disc, exhaust };
  }, []);

  return (
    <group {...props}>
      {/* floor plank */}
      <RoundedBox args={[1.75, 0.06, 0.96]} radius={0.03} smoothness={3} position={[-0.12, -0.25, 0]} material={m.ink} castShadow receiveShadow />

      {/* monocoque tub */}
      <RoundedBox args={[1.25, 0.32, 0.54]} radius={0.15} smoothness={4} position={[-0.05, -0.07, 0]} material={m.red} castShadow receiveShadow />

      {/* chubby nose, dipping toward the front wing */}
      <group position={[0.72, -0.07, 0]} rotation={[0, 0, -0.1]}>
        <mesh geometry={geo.nose} material={m.red} rotation={[0, 0, -PI / 2]} scale={[0.72, 1, 1.15]} castShadow receiveShadow />
        <mesh geometry={geo.tip} material={m.white} position={[0.43, -0.005, 0]} scale={[0.44, 0.58, 0.94]} castShadow />
        {/* number roundel on top */}
        <mesh geometry={geo.disc} material={m.cream} position={[0.02, 0.118, 0]} scale={[1, 1, 1]} castShadow />
        <TopText position={[0.02, 0.13, 0]} size={0.14} color={C.ink}>
          08
        </TopText>
      </group>

      {/* sidepods + intakes */}
      {[1, -1].map((s) => (
        <group key={s}>
          <RoundedBox args={[0.92, 0.28, 0.3]} radius={0.13} smoothness={4} position={[-0.16, -0.1, s * 0.33]} material={m.red} castShadow receiveShadow />
          <RoundedBox args={[0.1, 0.17, 0.2]} radius={0.05} smoothness={3} position={[0.29, -0.09, s * 0.35]} material={m.ink} />
          {/* cream racing stripe along the pod */}
          <RoundedBox args={[0.7, 0.03, 0.1]} radius={0.015} smoothness={2} position={[-0.2, 0.04, s * 0.34]} material={m.cream} />
          {/* mirror */}
          <RoundedBox args={[0.07, 0.07, 0.12]} radius={0.03} smoothness={3} position={[0.18, 0.16, s * 0.36]} material={m.red} castShadow />
          <RoundedBox args={[0.04, 0.1, 0.04]} radius={0.015} smoothness={2} position={[0.18, 0.09, s * 0.33]} material={m.ink} />
          {/* front wing endplate */}
          <RoundedBox args={[0.3, 0.17, 0.05]} radius={0.022} smoothness={3} position={[1.3, -0.33, s * 0.7]} material={m.red} castShadow />
          {/* front wing pylon */}
          <RoundedBox args={[0.1, 0.12, 0.04]} radius={0.015} smoothness={2} position={[1.18, -0.3, s * 0.08]} material={m.ink} />
          {/* rear wing endplate */}
          <RoundedBox args={[0.46, 0.34, 0.05]} radius={0.024} smoothness={3} position={[-1.06, 0.44, s * 0.48]} material={m.red} castShadow />
          {/* rear wing pylon */}
          <RoundedBox args={[0.14, 0.34, 0.04]} radius={0.015} smoothness={2} position={[-1.0, 0.22, s * 0.09]} material={m.ink} castShadow />
          {/* halo legs */}
          <mesh geometry={geo.rod} material={m.ink} position={[-0.2, 0.24, s * 0.24]} scale={[1, 0.18, 1]} castShadow />
        </group>
      ))}

      {/* cockpit rim + dark opening */}
      <mesh geometry={geo.rim} material={m.red} position={[-0.12, 0.11, 0]} rotation={[PI / 2, 0, 0]} scale={[1.45, 1.05, 1]} castShadow receiveShadow />
      <mesh geometry={geo.pit} material={m.ink} position={[-0.12, 0.095, 0]} scale={[1.45, 1, 1.05]} receiveShadow />

      {/* halo: arc around the cockpit + center pillar */}
      <group position={[-0.2, 0.33, 0]} rotation={[0, 0, 0.22]}>
        <group rotation={[0, -PI / 2, 0]}>
          <mesh geometry={geo.halo} material={m.ink} rotation={[-PI / 2, 0, 0]} scale={[0.96, 0.96, 1]} castShadow />
        </group>
      </group>
      <mesh geometry={geo.rod} material={m.ink} position={[0.12, 0.26, 0]} rotation={[0, 0, 0.6]} scale={[1, 0.27, 1]} castShadow />

      {/* engine cover + roll hoop air intake + shark fin */}
      <mesh geometry={geo.cover} material={m.red} position={[-0.62, 0.02, 0]} rotation={[0, 0, PI / 2 + 0.12]} scale={[1.05, 1, 1.05]} castShadow receiveShadow />
      <RoundedBox args={[0.26, 0.28, 0.24]} radius={0.1} smoothness={4} position={[-0.5, 0.3, 0]} material={m.red} castShadow />
      <RoundedBox args={[0.06, 0.13, 0.15]} radius={0.03} smoothness={3} position={[-0.37, 0.33, 0]} material={m.ink} />
      <RoundedBox args={[0.5, 0.17, 0.05]} radius={0.024} smoothness={3} position={[-0.8, 0.3, 0]} rotation={[0, 0, -0.18]} material={m.cream} castShadow />
      {[1, -1].map((s) => (
        <Text
          key={s}
          position={[-0.8, 0.3, s * 0.028]}
          rotation={[0, s > 0 ? 0 : PI, -0.18 * s]}
          fontSize={0.13}
          color={C.red}
          anchorX="center"
          anchorY="middle"
        >
          08
        </Text>
      ))}

      {/* front wing */}
      <RoundedBox args={[0.3, 0.05, 1.36]} radius={0.022} smoothness={3} position={[1.3, -0.38, 0]} material={m.red} castShadow receiveShadow />
      <RoundedBox args={[0.15, 0.045, 1.3]} radius={0.02} smoothness={3} position={[1.24, -0.32, 0]} rotation={[0, 0, 0.35]} material={m.cream} castShadow />

      {/* rear wing */}
      <RoundedBox args={[0.34, 0.07, 1.0]} radius={0.03} smoothness={3} position={[-1.06, 0.4, 0]} material={m.red} castShadow receiveShadow />
      <RoundedBox args={[0.2, 0.06, 0.92]} radius={0.025} smoothness={3} position={[-0.98, 0.52, 0]} rotation={[0, 0, 0.32]} material={m.cream} castShadow />
      <TopText position={[-1.08, 0.437, 0]} size={0.15} color={C.cream}>
        HG
      </TopText>

      {/* crash structure, brake light, exhaust */}
      <RoundedBox args={[0.24, 0.15, 0.22]} radius={0.06} smoothness={3} position={[-1.02, -0.1, 0]} material={m.ink} castShadow />
      <RoundedBox args={[0.05, 0.09, 0.17]} radius={0.02} smoothness={2} position={[-1.15, -0.1, 0]}>
        <meshStandardMaterial
          color={brakeLight ? C.red : C.redDark}
          emissive={C.red}
          emissiveIntensity={brakeLight ? 1.6 : 0.1}
          toneMapped={!brakeLight}
          roughness={0.4}
        />
      </RoundedBox>
      <mesh geometry={geo.exhaust} material={m.metal} position={[-1.0, 0.08, 0]} castShadow />

      {/* suspension arms */}
      <mesh geometry={geo.arm} material={m.ink} position={[0.78, -0.1, 0]} castShadow />
      <mesh geometry={geo.arm} material={m.ink} position={[-0.72, -0.08, 0]} castShadow />

      {children}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Preview                                                             */
/* ------------------------------------------------------------------ */

export const WHEEL_POSITIONS: [number, number, number][] = [
  [0.78, -0.12, 0.66],
  [0.78, -0.12, -0.66],
  [-0.72, -0.12, 0.66],
  [-0.72, -0.12, -0.66],
];

/** Body + 4 wheels, origin at chassis center (lift by 0.46 to sit on ground). */
export function CarPreview({ brakeLight, children, steer = 0, ...props }: CarBodyProps & { steer?: number }) {
  return (
    <group {...props}>
      <CarBody brakeLight={brakeLight}>{children}</CarBody>
      {WHEEL_POSITIONS.map((p, i) => (
        <CarWheel
          key={i}
          position={p}
          rotation={[0, i < 2 ? steer * 0.4 : 0, 0]}
          scale={i < 2 ? 1 : [1, 1, 1.15]}
        />
      ))}
    </group>
  );
}
