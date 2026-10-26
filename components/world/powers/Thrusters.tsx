"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { power } from "./state";

// SKYLINE's four thrusters under the Atlas, as in the mock: square-sided orange flames, tip down,
// flickering, their length following `power.thrust`. In the vehicle's model space (nose +z).
const glowMat = new THREE.MeshBasicMaterial({ color: "#ff4f00", transparent: true, depthWrite: false, toneMapped: false });
const flameGeo = new THREE.ConeGeometry(0.27, 1, 4, 1).rotateX(Math.PI).rotateY(Math.PI / 4).translate(0, -0.5, 0);
const padGeo = new THREE.BoxGeometry(0.34, 0.04, 0.34);
const AT: [number, number][] = [
  [-0.62, -1.35],
  [0.62, -1.35],
  [-0.62, 1.35],
  [0.62, 1.35],
];

export function Thrusters() {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => {
    const el = g.current;
    if (!el) return;
    el.visible = power.thrust > 0.01;
    if (!el.visible) return;
    const w = s.clock.elapsedTime;
    glowMat.opacity = 0.75 + 0.25 * Math.sin(w * 61) * Math.sin(w * 23);
    el.children.forEach((c, i) => {
      const fl = 0.85 + 0.3 * Math.abs(Math.sin(w * 37 + i * 1.7));
      c.children[0].scale.set(1, power.thrust * 1.6 * fl, 1);
    });
  });
  return (
    <group ref={g} visible={false}>
      {AT.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0.2, z]}>
          <mesh geometry={flameGeo} material={glowMat} />
          <mesh geometry={padGeo} material={glowMat} />
        </group>
      ))}
    </group>
  );
}
