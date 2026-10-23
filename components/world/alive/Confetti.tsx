// Adapted from Bruno Simon's folio-2025 (MIT, (c) 2025 Bruno Simon), sources/Game/World/Confetti.js
// (triggered like sources/Game/Achievements.js and World/Areas/CircuitArea.js)
//
// A pool of four bursts of 500 paper bits. Each bit has a random start in the
// burst's timeline, an angle and a strength; it shoots out and up on an
// ease-out curve, arcs back down, and pops in and out of existence at the ends.
// All the motion is in the vertex shader from one progress value per burst.
// Changes: the four pooled meshes are one instanced mesh (one draw call) with
// per-burst uniforms; gsap's 5 s tween (default power1.out ease) is a per-frame
// timer; MeshStandardMaterial patched instead of Bruno's node material.
// Also listens to the store: "GOAL!" / "HOWZAT!" toasts and new achievements.
"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carState } from "../carState";
import { getState, subscribe } from "../store";
import { zoneById } from "../layout";
import { seeded } from "./noise";
import { aliveEvents, burstConfetti } from "./events";
import { heightAt } from "./ground";

const POOL = 4;
const COUNT = 500;
const DURATION = 5;
const COLORS = ["#ffbde7", "#eeff95", "#84ffb5"];

function makeGeometry() {
  const plane = new THREE.PlaneGeometry(0.1, 0.2);
  const g = new THREE.InstancedBufferGeometry();
  g.index = plane.index;
  g.setAttribute("position", plane.getAttribute("position"));
  g.setAttribute("normal", plane.getAttribute("normal"));
  const r = seeded(500);
  const conf = new Float32Array(POOL * COUNT * 4);
  const quat = new Float32Array(POOL * COUNT * 4);
  const q = new THREE.Quaternion();
  for (let p = 0; p < POOL; p++) {
    for (let i = 0; i < COUNT; i++) {
      const k = p * COUNT + i;
      conf[k * 4] = r(); // random progress
      conf[k * 4 + 1] = r() * Math.PI * 2; // angle
      conf[k * 4 + 2] = p; // pool index
      conf[k * 4 + 3] = i % 3; // colour index (instanceIndex % 3)
      // Quaternion().random()
      const u1 = r();
      const u2 = r() * Math.PI * 2;
      const u3 = r() * Math.PI * 2;
      q.set(Math.sqrt(1 - u1) * Math.sin(u2), Math.sqrt(1 - u1) * Math.cos(u2), Math.sqrt(u1) * Math.sin(u3), Math.sqrt(u1) * Math.cos(u3));
      q.toArray(quat, k * 4);
    }
  }
  g.setAttribute("aConf", new THREE.InstancedBufferAttribute(conf, 4));
  g.setAttribute("aQuat", new THREE.InstancedBufferAttribute(quat, 4));
  g.instanceCount = POOL * COUNT;
  return g;
}

function makeMaterial() {
  const u = {
    uProgress: { value: new Array(POOL).fill(1) as number[] },
    uOrigin: { value: Array.from({ length: POOL }, () => new THREE.Vector3()) },
    uRadius: { value: new Array(POOL).fill(4) as number[] },
    uElevation: { value: new Array(POOL).fill(6) as number[] },
    uAmplitude: { value: 0.7 },
    uColors: { value: COLORS.map((c) => new THREE.Color(c)) },
  };
  const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7 });
  m.userData.u = u;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        attribute vec4 aConf; attribute vec4 aQuat;
        uniform float uProgress[${POOL}]; uniform vec3 uOrigin[${POOL}]; uniform float uRadius[${POOL}]; uniform float uElevation[${POOL}];
        uniform float uAmplitude; uniform vec3 uColors[3];
        varying vec3 vConfColor;
        vec3 qrot(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }`
      )
      .replace("#include <beginnormal_vertex>", "vec3 objectNormal = qrot(aQuat, normal);")
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        int pool = int(aConf.z + 0.5);
        float rest = 1.0 - uAmplitude;
        float progressStart = rest * aConf.x;
        float progressEnd = progressStart + uAmplitude;
        float progress = clamp((uProgress[pool] - progressStart) / (progressEnd - progressStart), 0.0, 1.0);
        progress = 1.0 - pow(1.0 - progress, 3.0);
        float scale = min(1.0, (1.0 - abs(progress - 0.5) * 2.0) * 20.0);
        vec3 transformed = qrot(aQuat, position) * scale;
        float strength = fract(aConf.x * 99.0);
        float x = sin(aConf.y) * progress * strength * uRadius[pool];
        float z = cos(aConf.y) * progress * strength * uRadius[pool];
        float y = (1.0 - pow(1.0 - progress * 2.0, 2.0)) * strength * uElevation[pool];
        transformed += vec3(x, y, z) + uOrigin[pool];
        vConfColor = uColors[int(aConf.w + 0.5)];`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vConfColor;")
      .replace("vec4 diffuseColor = vec4( diffuse, opacity );", "vec4 diffuseColor = vec4( vConfColor, opacity );");
  };
  m.customProgramCacheKey = () => "alive-confetti";
  return m;
}

function advance(t: number[], progress: number[], dt: number) {
  for (let i = 0; i < POOL; i++) {
    if (t[i] >= DURATION) {
      progress[i] = 1;
      continue;
    }
    t[i] = Math.min(DURATION, t[i] + Math.min(dt, 1 / 30));
    const p = t[i] / DURATION;
    progress[i] = 1 - (1 - p) * (1 - p); // gsap power1.out
  }
}

/** Confetti bursts. Listens to `burstConfetti` and to goals, wickets and achievements. Mount once. */
export function Confetti() {
  const mesh = useRef<THREE.Mesh<THREE.InstancedBufferGeometry, THREE.MeshStandardMaterial>>(null);
  const timers = useRef<number[]>(new Array(POOL).fill(DURATION));

  useEffect(() => {
    const geometry = makeGeometry();
    const material = makeMaterial();
    const m = mesh.current!;
    m.geometry = geometry;
    m.material = material;
    m.visible = true;
    const u = material.userData.u;
    const offBurst = aliveEvents.on("confetti", (e) => {
      const t = timers.current;
      const i = t.findIndex((v) => v >= DURATION);
      if (i < 0) return;
      t[i] = 0;
      u.uOrigin.value[i].set(e.x, e.y, e.z);
      u.uRadius.value[i] = e.radius;
      u.uElevation.value[i] = e.elevation;
    });

    // Store: goals, wickets and achievements
    let lastToast = getState().toast?.id ?? 0;
    let lastAch = getState().achievements.length;
    let lastAt = -Infinity;
    const pop3 = () => {
      // Bruno: player position plus two offset bursts
      const { x, y, z } = carState.pos;
      burstConfetti(x, y - 0.3, z);
      burstConfetti(x + 1, y - 1.3, z + 1.5);
      burstConfetti(x + 1, y - 1.3, z - 1.5);
    };
    const offStore = subscribe(() => {
      const s = getState();
      const now = performance.now();
      if (s.toast && s.toast.id !== lastToast) {
        lastToast = s.toast.id;
        if (s.toast.text === "GOAL!") {
          lastAt = now;
          // In the goal mouth and over the car
          const f = zoneById.football;
          if (f) burstConfetti(f.pos[0], heightAt(f.pos[0], f.pos[1] - 6) + 0.5, f.pos[1] - 6, 4, 6);
          burstConfetti(carState.pos.x, carState.pos.y - 0.3, carState.pos.z);
        } else if (s.toast.text === "HOWZAT!") {
          lastAt = now;
          pop3();
        }
      }
      if (s.achievements.length > lastAch) {
        lastAch = s.achievements.length;
        // Goal/wicket achievements land with their own burst a moment earlier.
        if (now - lastAt > 1200) pop3();
      } else lastAch = s.achievements.length;
    });
    return () => {
      offBurst();
      offStore();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  useFrame((_, dt) => {
    const m = mesh.current;
    const u = m?.material.userData.u;
    if (!u) return;
    advance(timers.current, u.uProgress.value, dt);
  });

  return <mesh ref={mesh} visible={false} frustumCulled={false} />;
}
