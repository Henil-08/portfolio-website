// Adapted from folio-2025 (MIT, see public/vendor/LICENSE.md),
// sources/Game/World/WindLines.js, sources/Game/Geometries/WindLineGeometry.js,
// sources/Game/Geometries/LineGeometry.js
//
// Faint white streaks that drift across the ground with the wind: a pool of four
// wavy 10 m lines; one shows every 0.3-2 s near the car, a bulge of thickness runs
// along it while it slides 1 m downwind, then it hides. The stronger the wind
// the faster they run (8 s in a calm, 2 s in a gale).
// Changes: the four lines are instances of one mesh (one draw call), gsap
// tweens became a per-frame timeline, the side of each vertex is an attribute
// (WebGL has no vertexIndex here), lines sit 2 m above the terrain, and they
// fade out at night.
"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carState } from "../carState";
import { dayNight } from "../daynight";
import { remapClamp } from "./noise";
import { updateWind, wind } from "./wind";
import { heightAt } from "./ground";

const POOL = 4;
const INTERVAL = { min: 300, max: 2000 };
const TRANSLATION = 1;
const THICKNESS = 0.1;
const AREA_RADIUS = 26; // Original: the view's optimal area radius
const OPACITY = 0.55;

function windLinePoints(length = 10, handlesCount = 4, amplitude = 1, divisions = 30) {
  const halfExtent = length / 2;
  const handleSpan = length / (handlesCount - 1);
  const handles: THREE.Vector3[] = [];
  for (let i = 0; i < handlesCount; i++) handles.push(new THREE.Vector3(0, (i % 2) - 0.5 * amplitude, -halfExtent + i * handleSpan));
  return new THREE.CatmullRomCurve3(handles).getPoints(divisions);
}

function makeGeometry() {
  const points = windLinePoints();
  const count = points.length;
  const positions = new Float32Array(count * 6);
  const ratios = new Float32Array(count * 2);
  const sides = new Float32Array(count * 2);
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    const p = points[i];
    positions.set([p.x, p.y, p.z, p.x, p.y, p.z], i * 6);
    ratios[i * 2] = ratios[i * 2 + 1] = i / (count - 1);
    sides[i * 2] = 0.5;
    sides[i * 2 + 1] = -0.5;
    if (i < count - 1) {
      const i2 = i * 2;
      indices.push(i2 + 2, i2, i2 + 1, i2 + 1, i2 + 3, i2 + 2);
    }
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setAttribute("ratio", new THREE.BufferAttribute(ratios, 1));
  g.setAttribute("side", new THREE.BufferAttribute(sides, 1));
  g.setIndex(indices);
  const line = new THREE.InstancedBufferAttribute(new Float32Array(POOL * 4), 4); // x, y, z, angle
  const progress = new THREE.InstancedBufferAttribute(new Float32Array(POOL).fill(-1), 1);
  line.setUsage(THREE.DynamicDrawUsage);
  progress.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute("aLine", line);
  g.setAttribute("aProgress", progress);
  g.instanceCount = POOL;
  return g;
}

function makeMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uThickness: { value: THICKNESS }, uOpacity: { value: OPACITY } },
    vertexShader: /* glsl */ `
      attribute float ratio; attribute float side; attribute vec4 aLine; attribute float aProgress;
      uniform float uThickness;
      void main() {
        if (aProgress < 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
        float c = cos(aLine.w), s = sin(aLine.w);
        // rotation.y = angle: local +Z runs along the wind
        vec3 p = vec3(c * position.x + s * position.z, position.y, -s * position.x + c * position.z) + aLine.xyz;
        vec3 tangent = normalize(vec3(0.0, 1.0, -1.0));
        float baseThickness = smoothstep(0.0, 1.0, 1.0 - abs(ratio - 0.5) * 2.0);
        float remapedProgress = aProgress * 3.0 - 1.0;
        float progressThickness = smoothstep(0.0, 1.0, 1.0 - abs(ratio - remapedProgress));
        p += tangent * side * uThickness * baseThickness * progressThickness;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      void main() {
        gl_FragColor = vec4(vec3(1.0), uOpacity);
        #include <colorspace_fragment>
      }`,
  });
}

type Line = { available: boolean; t: number; duration: number; x: number; z: number; y: number };

/** Faint wind streaks near the car. Mount once. */
export function WindLines() {
  const mesh = useRef<THREE.Mesh>(null);
  const state = useRef<{ lines: Line[]; next: number; geometry: THREE.InstancedBufferGeometry; material: THREE.ShaderMaterial } | null>(null);

  useEffect(() => {
    const geometry = makeGeometry();
    const material = makeMaterial();
    const lines = Array.from({ length: POOL }, () => ({ available: true, t: 0, duration: 4, x: 0, z: 0, y: 0 }));
    state.current = { lines, next: 0.5, geometry, material };
    const m = mesh.current!;
    m.geometry = geometry;
    m.material = material;
    m.visible = true;
    return () => {
      state.current = null;
      geometry.dispose();
      material.dispose();
    };
  }, []);

  useFrame(({ clock }, dt) => {
    const s = state.current;
    if (!s) return;
    updateWind(clock.elapsedTime, dt);
    s.material.uniforms.uOpacity.value = OPACITY * (1 - dayNight.night);

    // Display interval
    s.next -= dt;
    if (s.next <= 0) {
      s.next = (INTERVAL.min + Math.random() * (INTERVAL.max - INTERVAL.min)) / 1000;
      const line = s.lines.find((l) => l.available);
      if (line && dayNight.night < 0.95) {
        line.available = false;
        line.t = 0;
        line.duration = remapClamp(wind.weather, 0, 1, 8, 2);
        line.x = carState.pos.x + (Math.random() - 0.5) * AREA_RADIUS;
        line.z = carState.pos.z + (Math.random() - 0.5) * AREA_RADIUS;
        // 2 m over the highest ground under the line
        const dx = Math.sin(wind.angle) * 5;
        const dz = Math.cos(wind.angle) * 5;
        line.y = Math.max(heightAt(line.x, line.z), heightAt(line.x + dx, line.z + dz), heightAt(line.x - dx, line.z - dz)) + 2;
      }
    }

    const lineAttr = s.geometry.getAttribute("aLine") as THREE.InstancedBufferAttribute;
    const progAttr = s.geometry.getAttribute("aProgress") as THREE.InstancedBufferAttribute;
    const la = lineAttr.array as Float32Array;
    const pa = progAttr.array as Float32Array;
    s.lines.forEach((l, i) => {
      if (l.available) {
        pa[i] = -1;
        return;
      }
      l.t += dt;
      const p = Math.min(1, l.t / l.duration);
      // gsap's default ease (power1.out) on both tweens
      const e = 1 - (1 - p) * (1 - p);
      la[i * 4] = l.x + Math.sin(wind.angle) * TRANSLATION * e;
      la[i * 4 + 1] = l.y;
      la[i * 4 + 2] = l.z + Math.cos(wind.angle) * TRANSLATION * e;
      la[i * 4 + 3] = wind.angle;
      pa[i] = e;
      if (p >= 1) l.available = true;
    });
    lineAttr.needsUpdate = true;
    progAttr.needsUpdate = true;
  });

  return <mesh ref={mesh} visible={false} frustumCulled={false} renderOrder={1} />;
}
