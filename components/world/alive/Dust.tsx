// Dust kicked up by the wheels on grass and gravel, plus `kickDust` puffs.
// The original car marks the ground through Tracks.js but has no dust, so this one is
// ours, written in the same spirit: a fixed pool, CPU motion, one instanced draw.
// The puffs ride the shared wind (alive/wind.ts) and dim at night.
"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carState } from "../carState";
import { dayNight } from "../daynight";
import { input } from "../input";
import { updateWind, windAt } from "./wind";
import { carSlip, offTrack, wheelContact, WHEEL_LOCAL } from "./ground";
import { aliveEvents } from "./events";
import { makePuffGeometry, makePuffMaterial } from "./puffMaterial";

const COARSE = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
const POOL = COARSE ? 90 : 180;
const COLOR = new THREE.Color("#cdc4b0"); // gravel, like the run-off

type P = { x: number; y: number; z: number; vx: number; vy: number; vz: number; age: number; life: number; size: number; grow: number; alpha: number };

function makeSystem() {
  const geometry = makePuffGeometry(POOL);
  const material = makePuffMaterial(false);
  const parts: P[] = [];
  return { geometry, material, parts, carry: [0, 0, 0, 0], surface: [false, false, false, false], surfaceAt: 0 };
}

const contact = new THREE.Vector3();
const gust = new THREE.Vector2();

function spawn(s: ReturnType<typeof makeSystem>, x: number, y: number, z: number, vx: number, vz: number, strength: number) {
  if (s.parts.length >= POOL) s.parts.shift();
  s.parts.push({
    x: x + (Math.random() - 0.5) * 0.3,
    y: y + 0.08,
    z: z + (Math.random() - 0.5) * 0.3,
    vx: vx + (Math.random() - 0.5) * 0.8,
    vy: 0.5 + Math.random() * 0.7,
    vz: vz + (Math.random() - 0.5) * 0.8,
    age: 0,
    life: 1.1 + Math.random() * 1.1,
    size: 0.35 + Math.random() * 0.2,
    grow: 0.8 + Math.random() * 0.6 * strength,
    alpha: 0.22 + 0.2 * Math.min(1, strength),
  });
}

/** Wheel dust and `kickDust` puffs. Mount once. */
export function Dust() {
  const mesh = useRef<THREE.Mesh>(null);
  const sys = useRef<ReturnType<typeof makeSystem> | null>(null);

  useEffect(() => {
    const s = makeSystem();
    sys.current = s;
    const m = mesh.current!;
    m.geometry = s.geometry;
    m.material = s.material;
    m.visible = true;
    const off = aliveEvents.on("dust", (e) => {
      for (let i = 0; i < Math.min(12, e.amount); i++) spawn(s, e.x, e.y, e.z, e.vx, e.vz, 1);
    });
    return () => {
      off();
      sys.current = null;
      s.geometry.dispose();
      s.material.dispose();
    };
  }, []);

  useFrame(({ clock }, dt) => {
    const s = sys.current;
    if (!s) return;
    updateWind(clock.elapsedTime, dt);
    const d = Math.min(dt, 1 / 30);

    // Emit from the wheels: grounded, off the asphalt, moving or spinning up.
    const slip = carSlip();
    const drive = Math.abs(slip.along);
    if (carState.grounded && (drive > 2 || slip.lateral > 1.5)) {
      // Surface checks are a little costly; refresh them ten times a second.
      s.surfaceAt -= d;
      if (s.surfaceAt <= 0) {
        s.surfaceAt = 0.1;
        for (let i = 0; i < 4; i++) {
          wheelContact(i, contact);
          s.surface[i] = offTrack(contact.x, contact.z);
        }
      }
      const handbrake = input.handbrake ? 1 : 0;
      for (let i = 0; i < 4; i++) {
        if (!s.surface[i]) continue;
        const rear = WHEEL_LOCAL[i].rear;
        const strength = Math.min(1.5, (drive - 2) / 12 + slip.lateral / 4 + handbrake * 0.3);
        const rate = Math.max(0, strength) * (rear ? 26 : 10); // puffs per second
        s.carry[i] += rate * d;
        if (s.carry[i] < 1) continue;
        wheelContact(i, contact);
        while (s.carry[i] >= 1) {
          s.carry[i] -= 1;
          spawn(s, contact.x, contact.y, contact.z, -carState.vel.x * 0.12, -carState.vel.z * 0.12, strength);
        }
      }
    } else {
      s.carry.fill(0);
    }

    // Move, grow, fade
    const parts = s.parts;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += d;
      if (p.age >= p.life) {
        parts.splice(i, 1);
        continue;
      }
      windAt(p.x, p.z, gust);
      p.vx += (gust.x * 6 - p.vx) * d * 1.2;
      p.vz += (gust.y * 6 - p.vz) * d * 1.2;
      p.vy += (0.15 - p.vy) * d * 1.5;
      p.x += p.vx * d;
      p.y += p.vy * d;
      p.z += p.vz * d;
    }

    const puff = s.geometry.getAttribute("aPuff") as THREE.InstancedBufferAttribute;
    const col = s.geometry.getAttribute("aPuffColor") as THREE.InstancedBufferAttribute;
    const pa = puff.array as Float32Array;
    const ca = col.array as Float32Array;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const t = p.age / p.life;
      pa[i * 4] = p.x;
      pa[i * 4 + 1] = p.y;
      pa[i * 4 + 2] = p.z;
      pa[i * 4 + 3] = p.size * (1 + t * p.grow * 2);
      ca[i * 4] = COLOR.r;
      ca[i * 4 + 1] = COLOR.g;
      ca[i * 4 + 2] = COLOR.b;
      ca[i * 4 + 3] = p.alpha * Math.min(1, t * 8) * Math.pow(1 - t, 1.5);
    }
    s.geometry.instanceCount = parts.length;
    puff.needsUpdate = true;
    col.needsUpdate = true;
    s.material.uniforms.uDim.value = THREE.MathUtils.lerp(1, 0.035, dayNight.night);
  });

  return <mesh ref={mesh} visible={false} frustumCulled={false} renderOrder={3} />;
}
