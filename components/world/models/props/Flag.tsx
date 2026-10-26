// Static pole (collider: cylinder r=0.08 h=3.6 at the origin). Flag cloth is visual only.
"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { mat, unitBox, type GroupProps } from "./shared";
import { updateWind, wind, windAt } from "../../alive/wind";

const POLE = 3.6;
const FW = 1.3;
const FH = 0.85;

const gust = new THREE.Vector2();
const worldPos = new THREE.Vector3();
const worldQuat = new THREE.Quaternion();
const fwd = new THREE.Vector3();

/** Square ink pole on a concrete foot with a waving flag (orange by default). The cloth flies downwind in the shared wind (alive/wind.ts). */
export function Flag({ color = C.orange, speed = 1, ...props }: GroupProps & { color?: string; speed?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const pivot = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(FW, FH, 8, 3); // coarse, so the cloth folds in facets
    g.translate(FW / 2, 0, 0);
    return g;
  }, []);
  const base = useMemo(() => Float32Array.from(geometry.getAttribute("position").array), [geometry]);
  useFrame(({ clock }, dt) => {
    const mesh = ref.current;
    const piv = pivot.current;
    if (!mesh || !piv) return;
    updateWind(clock.elapsedTime, dt);
    // Local wind: the slow strength plus the travelling gust at the pole.
    piv.getWorldPosition(worldPos);
    windAt(worldPos.x, worldPos.z, gust);
    const g = THREE.MathUtils.clamp(wind.strength * 0.7 + gust.length() * 1.2, 0, 1);
    // Turn the cloth downwind (around the pole), easing like a real flag.
    piv.parent!.getWorldQuaternion(worldQuat);
    fwd.set(1, 0, 0).applyQuaternion(worldQuat);
    const parentYaw = Math.atan2(-fwd.z, fwd.x);
    const want = Math.atan2(-wind.direction.y, wind.direction.x) - parentYaw;
    let d = want - piv.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    piv.rotation.y += d * Math.min(1, dt * 1.5);
    phase.current += Math.min(dt, 1 / 30) * (1.4 + 3.4 * g) * speed;
    const t = phase.current * 3.2;
    const amp = 0.05 + 0.15 * g;
    const droop = 0.05 + 0.22 * (1 - g);
    const p = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const k = x / FW; // 0 at the pole, 1 at the free end
      p.setZ(i, Math.sin(x * 3.2 - t + y * 0.8) * amp * k);
      p.setY(i, y - k * k * droop + Math.sin(x * 2.1 - t * 0.7) * 0.03 * k);
    }
    p.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  });
  return (
    <group {...props}>
      <mesh geometry={unitBox()} scale={[0.36, 0.05, 0.36]} position={[0, 0.025, 0]} material={mat(C.concreteDark, { r: 0.95 })} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[0.07, POLE, 0.07]} position={[0, POLE / 2, 0]} material={mat(C.ink, { r: 0.6, m: 0.2 })} castShadow />
      {/* two clips on the halyard */}
      {[POLE - 0.12, POLE - 0.1 - FH].map((y) => (
        <mesh key={y} geometry={unitBox()} scale={[0.09, 0.03, 0.09]} position={[0, y, 0]} material={mat(C.charcoal, { r: 0.5 })} />
      ))}
      <group ref={pivot}>
        <mesh ref={ref} geometry={geometry} position={[0.04, POLE - FH / 2 - 0.1, 0]} material={mat(color, { r: 0.7, flat: true, side: THREE.DoubleSide })} castShadow />
      </group>
    </group>
  );
}
