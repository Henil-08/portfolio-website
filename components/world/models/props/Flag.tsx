// Static pole (collider: cylinder r=0.08 h=3.6 at the origin). Flag cloth is visual only.
"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { lowSphere, mat, unitCyl, type GroupProps } from "./shared";

const POLE = 3.6;
const FW = 1.3;
const FH = 0.85;

/** Pole with a waving flag. Flag flies toward +X. */
export function Flag({ color = C.red, speed = 1, ...props }: GroupProps & { color?: string; speed?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(FW, FH, 14, 6);
    g.translate(FW / 2, 0, 0);
    return g;
  }, []);
  const base = useMemo(() => Float32Array.from(geometry.getAttribute("position").array), [geometry]);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const p = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    const t = clock.elapsedTime * 3.2 * speed;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const k = x / FW; // 0 at the pole, 1 at the free end
      p.setZ(i, Math.sin(x * 3.2 - t + y * 0.8) * 0.16 * k);
      p.setY(i, y - k * k * 0.08 + Math.sin(x * 2.1 - t * 0.7) * 0.03 * k);
    }
    p.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  });
  return (
    <group {...props}>
      <mesh geometry={unitCyl()} scale={[0.2, 0.12, 0.2]} position={[0, 0.06, 0]} material={mat(C.ink, { r: 0.8 })} castShadow receiveShadow />
      <mesh geometry={unitCyl()} scale={[0.055, POLE, 0.055]} position={[0, POLE / 2, 0]} material={mat(C.metal, { r: 0.35, m: 0.4 })} castShadow />
      <mesh geometry={lowSphere()} scale={0.11} position={[0, POLE + 0.06, 0]} material={mat(C.yellow, { r: 0.35, m: 0.5 })} castShadow />
      <mesh ref={ref} geometry={geometry} position={[0.05, POLE - FH / 2 - 0.1, 0]} material={mat(color, { r: 0.8, side: THREE.DoubleSide })} castShadow />
    </group>
  );
}
