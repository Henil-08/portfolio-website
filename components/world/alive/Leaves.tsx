// Adapted from Bruno Simon's folio-2025 (MIT, (c) 2025 Bruno Simon), sources/Game/World/Leaves.js
//
// Fallen leaves and petals lying around the car. The wind drags them along in
// gusts, the car flings them up and aside as it drives through, explosions
// (confetti bursts) scatter them, and gravity and damping settle them again.
// Same maths and parameters as Bruno's compute shader, run on the CPU (WebGL has
// no compute): a few hundred leaves cost well under a millisecond, and positions
// are uploaded as one instanced attribute. One draw call.
// Changes: heights are measured from the terrain (Bruno's island is flat), so
// leaf tumbling and the upward lift use height above the ground; per-tick pushes
// are normalised to 60 fps; colours are muted to our palette (dry leaf + petal).
"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carState } from "../carState";
import { samplePerlin, seeded, remapClamp, hash } from "./noise";
import { updateWind, wind } from "./wind";
import { surfaceY } from "./ground";
import { aliveEvents } from "./events";

const COARSE = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
const COUNT = COARSE ? 256 : 768;
const SIZE = 56; // Bruno: the view's optimal area; we follow the car like the grass

const P = {
  scale: 0.25,
  rotationFrequency: 3,
  rotationElevationMultiplier: 1,
  pushSidewaysMultiplier: 20,
  pushMultiplier: 100,
  windFrequency: 0.005,
  windMultiplier: 0.5,
  upwardMultiplier: 1,
  defaultDamping: 1.5,
  gravity: 9.807,
};

function makeGeometry() {
  // Bruno's leaf: a unit plane pinched at one end, lying flat.
  const plane = new THREE.PlaneGeometry(1, 1);
  const a = plane.attributes.position.array as Float32Array;
  a[0] += 0.15;
  a[3] += 0.15;
  a[6] -= 0.15;
  a[9] -= 0.15;
  plane.rotateX(-Math.PI * 0.5);
  const g = new THREE.InstancedBufferGeometry();
  g.index = plane.index;
  g.setAttribute("position", plane.getAttribute("position"));
  const r = seeded(9);
  const pos = new Float32Array(COUNT * 4);
  const rot = new Float32Array(COUNT * 3); // base rotation, scale, colour mix
  const nrm = new Float32Array(COUNT * 3);
  const n = new THREE.Vector3();
  for (let i = 0; i < COUNT; i++) {
    rot[i * 3] = r() * Math.PI * 2;
    rot[i * 3 + 1] = r() * 0.5 + 0.5;
    rot[i * 3 + 2] = hash(i + 99, 0.37);
    n.set(0, 1, 0)
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), (r() - 0.5) * 2)
      .applyAxisAngle(new THREE.Vector3(0, 0, 1), (r() - 0.5) * 2);
    n.toArray(nrm, i * 3);
  }
  const posAttr = new THREE.InstancedBufferAttribute(pos, 4);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute("aLeafPos", posAttr);
  g.setAttribute("aLeafRot", new THREE.InstancedBufferAttribute(rot, 3));
  g.setAttribute("aLeafNormal", new THREE.InstancedBufferAttribute(nrm, 3));
  g.instanceCount = COUNT;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  return g;
}

function makeMaterial() {
  const u = {
    uScale: { value: P.scale },
    uRotationFrequency: { value: P.rotationFrequency },
    uRotationElevationMultiplier: { value: P.rotationElevationMultiplier },
    uColorA: { value: new THREE.Color("#9a6b47") }, // dry leaf (Bruno: #95513a)
    uColorB: { value: new THREE.Color("#d9a69c") }, // petal (Bruno: #f56a3a)
  };
  const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        attribute vec4 aLeafPos; attribute vec3 aLeafRot; attribute vec3 aLeafNormal;
        uniform float uScale; uniform float uRotationFrequency; uniform float uRotationElevationMultiplier;
        varying float vLeafMix;
        vec2 rot2(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }`
      )
      .replace("#include <beginnormal_vertex>", "vec3 objectNormal = aLeafNormal;")
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        vec3 transformed = position * aLeafRot.y * uScale;
        // aLeafPos.w = height above the ground (tumbling grows with it)
        float rotationMultiplier = max(aLeafPos.w * uRotationElevationMultiplier, 0.0);
        float rotationZ = sin(aLeafPos.x * uRotationFrequency) * rotationMultiplier;
        float rotationX = sin(aLeafPos.z * uRotationFrequency) * rotationMultiplier;
        transformed.xy = rot2(transformed.xy, rotationZ);
        transformed.yz = rot2(transformed.yz, rotationX);
        transformed.xz = rot2(transformed.xz, aLeafRot.x);
        transformed += aLeafPos.xyz;
        vLeafMix = aLeafRot.z;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uColorA; uniform vec3 uColorB; varying float vLeafMix;")
      .replace("vec4 diffuseColor = vec4( diffuse, opacity );", "vec4 diffuseColor = vec4( mix(uColorA, uColorB, vLeafMix), opacity );");
  };
  m.customProgramCacheKey = () => "alive-leaves";
  return m;
}

function makeSystem() {
  const geometry = makeGeometry();
  const material = makeMaterial();
  const r = seeded(11);
  const position = new Float32Array(COUNT * 3);
  const velocity = new Float32Array(COUNT * 3);
  const weight = new Float32Array(COUNT);
  const floor = new Float32Array(COUNT); // cached ground height
  const floorAt = new Float32Array(COUNT * 2).fill(1e9); // where it was sampled
  for (let i = 0; i < COUNT; i++) weight[i] = r() * 0.1 + 0.1;
  return { geometry, material, position, velocity, weight, floor, floorAt, initialised: false, explosion: new THREE.Vector4(), lastCar: new THREE.Vector3(), hasLastCar: false };
}

type Sys = ReturnType<typeof makeSystem>;

function init(s: Sys, fx: number, fz: number) {
  for (let i = 0; i < COUNT; i++) {
    let x = (hash(i, 0.11) - 0.5) * SIZE + fx;
    const z = (hash(i + 1, 0.11) - 0.5) * SIZE + fz;
    x += samplePerlin(x * 0.02, z * 0.02) * 15;
    s.position[i * 3] = x;
    s.position[i * 3 + 2] = z;
    s.position[i * 3 + 1] = surfaceY(x, z) + 0.02;
  }
  s.initialised = true;
}

/** Fallen leaves and petals that blow around and scatter. Mount once. */
export function Leaves() {
  const mesh = useRef<THREE.Mesh>(null);
  const sys = useRef<Sys | null>(null);

  useEffect(() => {
    const s = makeSystem();
    sys.current = s;
    const m = mesh.current!;
    m.geometry = s.geometry;
    m.material = s.material;
    m.visible = true;
    const off = aliveEvents.on("explode", (e) => s.explosion.set(e.x, e.z, e.radius, 20));
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
    const fx = carState.pos.x;
    const fz = carState.pos.z;
    if (!s.initialised) init(s, fx, fz);
    const d = Math.min(dt, 1 / 30) * 2; // deltaScaled
    const tick = Math.min(dt, 1 / 30) * 60; // Bruno's per-tick pushes, at 60 fps

    // Vehicle velocity per tick (Bruno: position delta per tick)
    let vvx = 0;
    let vvy = 0;
    let vvz = 0;
    if (s.hasLastCar) {
      vvx = carState.pos.x - s.lastCar.x;
      vvy = carState.pos.y - s.lastCar.y;
      vvz = carState.pos.z - s.lastCar.z;
      const l = Math.hypot(vvx, vvy, vvz);
      if (l > 1) vvx = vvy = vvz = 0; // teleport / respawn
    }
    s.lastCar.copy(carState.pos);
    s.hasLastCar = true;
    const speedMultiplier = Math.hypot(vvx, vvy, vvz);
    const vehicleOn = carState.grounded ? 1 : 0.4;

    const half = SIZE / 2;
    const dir = wind.direction;
    const ex = s.explosion;
    const { position: p, velocity: v, weight, floor, floorAt } = s;
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      let x = p[i3];
      let y = p[i3 + 1];
      let z = p[i3 + 2];
      let vx = v[i3];
      let vy = v[i3 + 1];
      let vz = v[i3 + 2];
      const w = weight[i];

      // Ground under the leaf (cached until it moves half a metre)
      if (Math.abs(x - floorAt[i * 2]) + Math.abs(z - floorAt[i * 2 + 1]) > 0.5) {
        floor[i] = surfaceY(x, z);
        floorAt[i * 2] = x;
        floorAt[i * 2 + 1] = z;
      }
      const ground = floor[i];

      // Push from vehicle
      const dx = x - carState.pos.x;
      const dy = y - (carState.pos.y - 0.2);
      const dz = z - carState.pos.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < 2 && speedMultiplier > 0) {
        const hl = Math.hypot(dx, dz) || 1;
        const vehicleMultiplier = remapClamp(dist, 0.5, 2, 1, 0) * vehicleOn;
        const k = speedMultiplier * vehicleMultiplier * tick;
        vx += (vvx * P.pushMultiplier + (dx / hl) * P.pushSidewaysMultiplier) * k;
        vz += (vvz * P.pushMultiplier + (dz / hl) * P.pushSidewaysMultiplier) * k;
      }

      // Wind
      const noise = samplePerlin(x * P.windFrequency + dir.x * wind.localTime, z * P.windFrequency + dir.y * wind.localTime);
      const windStrength = Math.max(0, (wind.strength - noise) * w * P.windMultiplier) * tick;
      vx += dir.x * windStrength;
      vz += dir.y * windStrength;

      // Explosion
      if (ex.w > 0) {
        const ddx = x - ex.x;
        const ddz = z - ex.y;
        const de = Math.hypot(ddx, ddz);
        const em = remapClamp(de, ex.z * 0.5, ex.z, 0.2, 0);
        vx += ddx * em * ex.w;
        vz += ddz * em * ex.w;
      }

      // Upward fly
      const above = y - ground;
      const upwardDim = remapClamp(above, 0, 6, 1, 0);
      vy = Math.min(Math.hypot(vx, vz), 2) * P.upwardMultiplier * upwardDim;

      // Damping (high in the air, default on the ground; no water here)
      const damping = Math.max(P.defaultDamping, above > 0.05 ? P.defaultDamping : 0) * d;
      vx *= 1 - damping;
      vy *= 1 - damping;
      vz *= 1 - damping;

      // Gravity
      vy -= P.gravity * w;

      // Apply velocity
      x += vx * d;
      y += vy * d;
      z += vz * d;

      // Clamp to floor
      y = Math.max(y, ground + 0.02);

      // Loop around the focus
      x = ((((x + half - fx) % SIZE) + SIZE) % SIZE) - half + fx;
      z = ((((z + half - fz) % SIZE) + SIZE) % SIZE) - half + fz;
      if (Math.abs(x - p[i3]) > half || Math.abs(z - p[i3 + 2]) > half) {
        // wrapped: re-seat on the ground at the far side
        y = surfaceY(x, z) + 0.02;
        floorAt[i * 2] = 1e9;
      }

      p[i3] = x;
      p[i3 + 1] = y;
      p[i3 + 2] = z;
      v[i3] = vx;
      v[i3 + 1] = vy;
      v[i3 + 2] = vz;
    }
    ex.w = 0; // reset potential explosion

    const attr = s.geometry.getAttribute("aLeafPos") as THREE.InstancedBufferAttribute;
    const out = attr.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      out[i * 4] = p[i * 3];
      out[i * 4 + 1] = p[i * 3 + 1];
      out[i * 4 + 2] = p[i * 3 + 2];
      out[i * 4 + 3] = p[i * 3 + 1] - floor[i];
    }
    attr.needsUpdate = true;
  });

  return <mesh ref={mesh} visible={false} frustumCulled={false} receiveShadow renderOrder={2} />;
}
