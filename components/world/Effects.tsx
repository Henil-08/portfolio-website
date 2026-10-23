"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BallCollider, CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { carState } from "./carState";
import { getState, useWorld } from "./store";
import { BALL_R, Cone, Football, TYRE_H, TYRE_R, Tyre } from "./models/props";

// Lighting presets for the agent's set_scene tool. Everything eases between them.
export const SCENES = {
  day: { sun: 1.9, sunColor: "#fff1e0", hemi: 0.35, exposure: 0.82, top: "#b9c9d3", mid: "#e6e4df", bottom: "#d8d2c8", fog: "#e6e4df" },
  golden: { sun: 1.6, sunColor: "#ffb36b", hemi: 0.3, exposure: 0.85, top: "#e9a37a", mid: "#f3d3b2", bottom: "#e7c4a0", fog: "#efcfae" },
  night: { sun: 0.25, sunColor: "#9fb4ff", hemi: 0.12, exposure: 0.95, top: "#0b1022", mid: "#1b2340", bottom: "#141a30", fog: "#151b33" },
} as const;

const WEATHER_N = 2200;

function makeWeatherGeometry() {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(WEATHER_N * 3);
  for (let i = 0; i < WEATHER_N; i++) {
    p[i * 3] = (Math.random() - 0.5) * 60;
    p[i * 3 + 1] = Math.random() * 30;
    p[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  return g;
}

function makeConfetti(at: [number, number]) {
  return Array.from({ length: CONFETTI }).map(() => ({
    p: new THREE.Vector3(at[0], 1, at[1]),
    v: new THREE.Vector3((Math.random() - 0.5) * 9, 8 + Math.random() * 8, (Math.random() - 0.5) * 9),
    r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
    s: Math.random() * 6,
  }));
}

// Rain or snow in a box that follows the car.
export function Weather() {
  const weather = useWorld((s) => s.scene.weather);
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => makeWeatherGeometry(), []);

  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts || weather === "clear") return;
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const fall = weather === "rain" ? 26 : 3;
    for (let i = 0; i < WEATHER_N; i++) {
      let y = pos.getY(i) - fall * dt;
      if (y < 0) y += 30;
      pos.setY(i, y);
      if (weather === "snow") pos.setX(i, pos.getX(i) + Math.sin(y + i) * dt * 0.6);
    }
    pos.needsUpdate = true;
    pts.position.set(carState.pos.x, 0, carState.pos.z);
  });

  if (weather === "clear") return null;
  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        color={weather === "rain" ? "#b8c8d8" : "#ffffff"}
        size={weather === "rain" ? 0.08 : 0.18}
        transparent
        opacity={weather === "rain" ? 0.6 : 0.9}
        depthWrite={false}
      />
    </points>
  );
}

// Exposure follows the time of day.
export function Exposure() {
  useFrame(({ gl }, dt) => {
    const want = SCENES[getState().scene.time].exposure;
    gl.toneMappingExposure += (want - gl.toneMappingExposure) * Math.min(1, dt * 2);
  });
  return null;
}

// Things the agent drops into the world. They fall from the sky as real physics objects.
export function Spawns() {
  const spawns = useWorld((s) => s.spawns);
  return (
    <>
      {spawns.map((s) =>
        s.thing === "confetti" ? (
          <Confetti key={s.id} at={s.at} />
        ) : (
          Array.from({ length: s.count }).map((_, i) => {
            const a = (i / s.count) * Math.PI * 2;
            const r = 1.5 + (i % 3);
            const pos: [number, number, number] = [s.at[0] + Math.cos(a) * r, 6 + i * 0.6, s.at[1] + Math.sin(a) * r];
            if (s.thing === "footballs")
              return (
                <RigidBody key={`${s.id}-${i}`} colliders={false} position={pos} mass={0.35} restitution={0.7}>
                  <BallCollider args={[BALL_R]} />
                  <group position={[0, -BALL_R, 0]}>
                    <Football />
                  </group>
                </RigidBody>
              );
            if (s.thing === "tyres")
              return (
                <RigidBody key={`${s.id}-${i}`} colliders={false} position={pos} mass={0.6}>
                  <CylinderCollider args={[TYRE_H / 2, TYRE_R]} />
                  <group position={[0, -TYRE_H / 2, 0]}>
                    <Tyre compound={(["soft", "medium", "hard", "inter"] as const)[i % 4]} />
                  </group>
                </RigidBody>
              );
            return (
              <RigidBody key={`${s.id}-${i}`} colliders={false} position={pos} mass={0.25}>
                <CuboidCollider args={[0.2, 0.27, 0.2]} />
                <group position={[0, -0.27, 0]}>
                  <Cone />
                </group>
              </RigidBody>
            );
          })
        )
      )}
    </>
  );
}

const CONFETTI = 260;
function Confetti({ at }: { at: [number, number] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const state = useMemo(() => makeConfetti(at), [at]);
  const colors = useMemo(() => ["#d42a2f", "#f8f7f4", "#c9a047", "#2f3238"].map((c) => new THREE.Color(c)), []);
  const m = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < CONFETTI; i++) mesh.setColorAt(i, colors[i % colors.length]);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [colors]);

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    state.forEach((c, i) => {
      c.v.y -= 9 * dt;
      c.v.multiplyScalar(1 - dt * 0.8);
      c.p.addScaledVector(c.v, dt);
      if (c.p.y < 0.02) {
        c.p.y = 0.02;
        c.v.set(0, 0, 0);
      }
      c.r.x += dt * c.s;
      c.r.y += dt * c.s * 0.7;
      m.position.copy(c.p);
      m.rotation.copy(c.r);
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, CONFETTI]} castShadow>
      <planeGeometry args={[0.18, 0.1]} />
      <meshStandardMaterial side={THREE.DoubleSide} roughness={0.5} />
    </instancedMesh>
  );
}
