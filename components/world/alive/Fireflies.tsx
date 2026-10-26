// Adapted from folio-2025 (MIT, see public/vendor/LICENSE.md), sources/Game/World/PoleLights.js (setFireflies)
//
// Five fireflies per anchor, a metre up, drifting on three slow sines with a
// hashed time offset each; they fade in over the evening (the original tweens their
// scale over 5 s when night starts). Anchors ring the cricket and football fields,
// the garden pond and beds, and the two lakes, instead of the original pole lights. Glow sprites are additive, one draw call.
"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { dayNight } from "../daynight";
import { LAKES, zoneById } from "../layout";
import { BEDS, POND } from "../garden/layout";
import { heightAt } from "./ground";
import { hash, seeded } from "./noise";
import { makePuffGeometry, makePuffMaterial } from "./puffMaterial";

const PER_ANCHOR = 5;
const COLOR = new THREE.Color("#fff3dc").multiplyScalar(2.2); // the world's lamp white

function anchors() {
  const out: THREE.Vector3[] = [];
  const r = seeded(5);
  for (const id of ["cricket", "football"] as const) {
    const z = zoneById[id];
    if (!z) continue;
    const [hx, hz] = [z.size[0] / 2 + 2.5, z.size[1] / 2 + 2.5];
    for (let i = 0; i < 9; i++) {
      // around the edge of the field
      const a = (i / 9) * Math.PI * 2 + r();
      const x = z.pos[0] + Math.cos(a) * hx * (0.9 + r() * 0.3);
      const zz = z.pos[1] + Math.sin(a) * hz * (0.9 + r() * 0.3);
      out.push(new THREE.Vector3(x, heightAt(x, zz), zz));
    }
  }
  // the garden: round the pond and over the flower beds
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r();
    const x = POND.x + Math.cos(a) * (POND.r + 1.5);
    const zz = POND.z + Math.sin(a) * (POND.r + 1.5);
    out.push(new THREE.Vector3(x, heightAt(x, zz), zz));
  }
  for (const b of BEDS) out.push(new THREE.Vector3(b.x, heightAt(b.x, b.z), b.z));
  // the lakes' shores
  for (const l of LAKES)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + r();
      const x = l.x + Math.cos(a) * (l.rx + 1.5);
      const zz = l.z + Math.sin(a) * (l.rz + 1.5);
      out.push(new THREE.Vector3(x, Math.max(heightAt(x, zz), 0), zz));
    }
  return out;
}

function makeSystem() {
  const list = anchors();
  const count = list.length * PER_ANCHOR;
  const r = seeded(6);
  const base = new Float32Array(count * 3);
  list.forEach((p, i) => {
    for (let j = 0; j < PER_ANCHOR; j++) {
      const k = i * PER_ANCHOR + j;
      const angle = r() * Math.PI * 2;
      base[k * 3] = p.x + Math.cos(angle);
      base[k * 3 + 1] = p.y + 1;
      base[k * 3 + 2] = p.z + Math.sin(angle);
    }
  });
  return { count, base, geometry: makePuffGeometry(count), material: makePuffMaterial(true), scale: 0, time: 0 };
}

/** Night-time fireflies round the fields, the garden and the lakes. Mount once. */
export function Fireflies() {
  const mesh = useRef<THREE.Mesh>(null);
  const sys = useRef<ReturnType<typeof makeSystem> | null>(null);

  useEffect(() => {
    const s = makeSystem();
    sys.current = s;
    const m = mesh.current!;
    m.geometry = s.geometry;
    m.material = s.material;
    m.visible = true;
    return () => {
      sys.current = null;
      s.geometry.dispose();
      s.material.dispose();
    };
  }, []);

  useFrame((_, dt) => {
    const s = sys.current;
    const m = mesh.current;
    if (!s || !m) return;
    const d = Math.min(dt, 1 / 30);
    s.time += d * 2; // The original elapsedScaled
    const want = dayNight.night > 0.6 ? 1 : 0;
    s.scale += Math.sign(want - s.scale) * Math.min(Math.abs(want - s.scale), d / 5);
    m.visible = s.scale > 0.001;
    if (!m.visible) return;
    const puff = s.geometry.getAttribute("aPuff") as THREE.InstancedBufferAttribute;
    const col = s.geometry.getAttribute("aPuffColor") as THREE.InstancedBufferAttribute;
    const pa = puff.array as Float32Array;
    const ca = col.array as Float32Array;
    for (let i = 0; i < s.count; i++) {
      const t = s.time + hash(i, 0.5) * 999;
      pa[i * 4] = s.base[i * 3] + Math.sin(t * 0.4) * 0.5;
      pa[i * 4 + 1] = s.base[i * 3 + 1] + Math.sin(t) * 0.2;
      pa[i * 4 + 2] = s.base[i * 3 + 2] + Math.sin(t * 0.3) * 0.5;
      pa[i * 4 + 3] = 0.22 * s.scale;
      const blink = 0.6 + 0.4 * Math.sin(t * 2.3);
      ca[i * 4] = COLOR.r;
      ca[i * 4 + 1] = COLOR.g;
      ca[i * 4 + 2] = COLOR.b;
      ca[i * 4 + 3] = blink * s.scale;
    }
    s.geometry.instanceCount = s.count;
    puff.needsUpdate = true;
    col.needsUpdate = true;
  });

  return <mesh ref={mesh} visible={false} frustumCulled={false} renderOrder={3} />;
}
