// Small flocks resting on roofs and under trees. When the car comes within
// ~15 m they burst up and away, wheel around overhead for a while, then glide
// down to a quiet perch far from the car. The original world has bird song but no
// birds, so this one is ours, built the same way as the original's other small life: CPU
// motion, one instanced mesh, wings flapped in the vertex shader.
"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carState } from "../carState";
import { GARAGES, GRANDSTAND, PIT } from "../layout";
import { TREES } from "../street/common";
import { heightAt } from "./ground";
import { seeded } from "./noise";
import { updateWind, windAt } from "./wind";

const FLOCKS = 5;
const PER_FLOCK = 6;
const COUNT = FLOCKS * PER_FLOCK;
const SCARE = 15;
const QUIET = 26;

export type Perch = { x: number; y: number; z: number; spread: number };

function perches(): Perch[] {
  const out: Perch[] = [];
  for (const g of GARAGES) out.push({ x: g.x, y: heightAt(g.x, PIT.garageZ) + 4.5, z: PIT.garageZ - 0.5, spread: 2.6 });
  out.push({ x: GRANDSTAND.pos[0], y: heightAt(GRANDSTAND.pos[0], GRANDSTAND.pos[1]) + 5.2, z: GRANDSTAND.pos[1] - 0.5, spread: 3.5 });
  // On the grass beside the trees
  const r = seeded(77);
  for (const [x, z, rad] of TREES) {
    if (rad < 2 || r() > 0.35) continue;
    const a = r() * Math.PI * 2;
    const px = x + Math.cos(a) * 2.6;
    const pz = z + Math.sin(a) * 2.6;
    out.push({ x: px, y: heightAt(px, pz), z: pz, spread: 1.4 });
  }
  return out;
}

function makeGeometry() {
  // A tiny dart: body diamond + two wings. aWing: 0 body, else wing side * tip weight.
  const L = 0.13; // half body length
  const W = 0.045;
  const S = 0.2; // wing span per side
  const p: number[] = [];
  const w: number[] = [];
  const tri = (a: number[], b: number[], c: number[], wa: number, wb: number, wc: number) => {
    p.push(...a, ...b, ...c);
    w.push(wa, wb, wc);
  };
  const nose = [0, 0.01, L];
  const tail = [0, 0.015, -L * 1.1];
  const left = [-W, 0, 0];
  const right = [W, 0, 0];
  const top = [0, W * 0.9, 0];
  const bottom = [0, -W * 0.8, 0];
  for (const side of [left, right]) {
    tri(nose, side, top, 0, 0, 0);
    tri(nose, bottom, side, 0, 0, 0);
    tri(tail, top, side, 0, 0, 0);
    tri(tail, side, bottom, 0, 0, 0);
  }
  // tail fan
  tri(tail, [-0.04, 0.015, -L * 1.6], [0.04, 0.015, -L * 1.6], 0, 0, 0);
  // wings
  tri([-W * 0.8, W * 0.3, 0.05], [-S, W * 0.3, -0.03], [-W * 0.8, W * 0.3, -0.06], -0.2, -1, -0.2);
  tri([W * 0.8, W * 0.3, 0.05], [W * 0.8, W * 0.3, -0.06], [S, W * 0.3, -0.03], 0.2, 0.2, 1);
  const base = new THREE.BufferGeometry();
  base.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  base.computeVertexNormals();
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("position", base.getAttribute("position"));
  g.setAttribute("normal", base.getAttribute("normal"));
  g.setAttribute("aWing", new THREE.Float32BufferAttribute(w, 1));
  const bird = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 4), 4);
  const flap = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 4), 4);
  bird.setUsage(THREE.DynamicDrawUsage);
  flap.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute("aBird", bird); // x, y, z, yaw
  g.setAttribute("aFlap", flap); // phase, amplitude, pitch, bank
  g.instanceCount = COUNT;
  return g;
}

function makeMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: "#2b2c2e", roughness: 0.8, flatShading: true, side: THREE.DoubleSide });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        attribute float aWing; attribute vec4 aBird; attribute vec4 aFlap;
        vec3 birdPose(vec3 v) {
            float k = abs(aWing);
          // flap: wings rotate about the body axis, tips more
          float a = sin(aFlap.x) * aFlap.y * k;
          if (k > 0.0) { v.y += sin(a) * abs(v.x); v.x *= cos(a); }
          // pitch (about x) then bank (about z) then yaw (about y)
          float cp = cos(aFlap.z), sp = sin(aFlap.z);
          v.yz = vec2(cp * v.y - sp * v.z, sp * v.y + cp * v.z);
          float cb = cos(aFlap.w), sb = sin(aFlap.w);
          v.xy = vec2(cb * v.x - sb * v.y, sb * v.x + cb * v.y);
          float cy = cos(aBird.w), sy = sin(aBird.w);
          v.xz = vec2(cy * v.x + sy * v.z, -sy * v.x + cy * v.z);
          return v;
        }`
      )
      .replace(
        "#include <beginnormal_vertex>",
        /* glsl */ `vec3 objectNormal = normal;
        { float cy = cos(aBird.w), sy = sin(aBird.w); objectNormal.xz = vec2(cy * normal.x + sy * normal.z, -sy * normal.x + cy * normal.z); }`
      )
      .replace("#include <begin_vertex>", "vec3 transformed = birdPose(position) + aBird.xyz;");
  };
  m.customProgramCacheKey = () => "alive-birds";
  return m;
}

type Bird = {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  yaw: number; phase: number; amp: number; pitch: number; bank: number;
  ox: number; oz: number; // offset at the perch
  hop: number; // time to next peck/hop
  delay: number;
};
type Flock = { mode: "rest" | "fly" | "land"; perch: number; t: number; flyTime: number; cx: number; cz: number; alt: number; orbit: number; dir: number; birds: Bird[] };

function makeSystem(custom?: Perch[]) {
  const list = custom?.length ? custom : perches();
  const r = seeded(31);
  const used = new Set<number>();
  const flocks: Flock[] = [];
  for (let f = 0; f < FLOCKS; f++) {
    let pi = Math.floor(r() * list.length);
    for (let k = 0; k < 20 && used.has(pi); k++) pi = Math.floor(r() * list.length);
    used.add(pi);
    const p = list[pi];
    const birds: Bird[] = [];
    for (let b = 0; b < PER_FLOCK; b++) {
      const ox = (r() - 0.5) * 2 * p.spread;
      const oz = (r() - 0.5) * 1.2 * Math.min(p.spread, 1.4);
      birds.push({ x: p.x + ox, y: p.y, z: p.z + oz, vx: 0, vy: 0, vz: 0, yaw: r() * Math.PI * 2, phase: r() * 10, amp: 0, pitch: 0, bank: 0, ox, oz, hop: r() * 3, delay: 0 });
    }
    flocks.push({ mode: "rest", perch: pi, t: 0, flyTime: 10, cx: p.x, cz: p.z, alt: p.y + 12, orbit: 8, dir: r() > 0.5 ? 1 : -1, birds });
  }
  return { list, flocks, geometry: makeGeometry(), material: makeMaterial() };
}

const gust = new THREE.Vector2();

function step(s: ReturnType<typeof makeSystem>, dt: number, clock: { elapsedTime: number }) {
    const d = Math.min(dt, 1 / 30);
  const car = carState.pos;
  const bird = s.geometry.getAttribute("aBird") as THREE.InstancedBufferAttribute;
  const flap = s.geometry.getAttribute("aFlap") as THREE.InstancedBufferAttribute;
  let n = 0;
  for (const f of s.flocks) {
    const perch = s.list[f.perch];
    const carDist = Math.hypot(car.x - perch.x, car.z - perch.z);
    f.t += d;
    if (f.mode === "rest" && carDist < SCARE && Math.abs(car.y - perch.y) < 8) {
      f.mode = "fly";
      f.t = 0;
      f.flyTime = 8 + Math.random() * 7;
      // circle somewhere away from the car
      const ax = perch.x - car.x;
      const az = perch.z - car.z;
      const al = Math.hypot(ax, az) || 1;
      f.cx = perch.x + (ax / al) * 10;
      f.cz = perch.z + (az / al) * 10;
      f.alt = Math.max(perch.y, heightAt(f.cx, f.cz)) + 10 + Math.random() * 6;
      f.orbit = 6 + Math.random() * 5;
      for (const b of f.birds) {
        b.delay = Math.random() * 0.35;
        const bx = b.x - car.x;
        const bz = b.z - car.z;
        const bl = Math.hypot(bx, bz) || 1;
        b.vx = (bx / bl) * 3 + (Math.random() - 0.5) * 2;
        b.vz = (bz / bl) * 3 + (Math.random() - 0.5) * 2;
        b.vy = 3.5 + Math.random() * 1.5;
      }
    } else if (f.mode === "fly" && f.t > f.flyTime) {
      // pick a quiet perch, away from the car
      const options = s.list.map((p, i) => ({ i, d: Math.hypot(p.x - car.x, p.z - car.z) })).filter((o) => o.d > QUIET && !s.flocks.some((o2) => o2 !== f && o2.perch === o.i));
      if (options.length) {
        f.perch = options[Math.floor(Math.random() * options.length)].i;
        f.mode = "land";
        f.t = 0;
      } else {
        // nowhere quiet: settle on the free perch farthest from the car, if it's out of scare range
        const free = s.list
          .map((p, i) => ({ i, d: Math.hypot(p.x - car.x, p.z - car.z) }))
          .filter((o) => o.d > SCARE + 2 && !s.flocks.some((o2) => o2 !== f && o2.perch === o.i))
          .sort((a, b) => b.d - a.d);
        if (free.length) {
          f.perch = free[0].i;
          f.mode = "land";
          f.t = 0;
        } else f.t = f.flyTime - 3;
      }
    } else if (f.mode === "land") {
      if (carDist < SCARE) {
        f.mode = "fly";
        f.t = 0;
        f.flyTime = 5;
        f.cx = perch.x;
        f.cz = perch.z;
      }
    }

    const p2 = s.list[f.perch];
    let landed = 0;
    f.birds.forEach((b, bi) => {
      if (f.mode === "rest") {
        // peck and hop now and then
        b.hop -= d;
        if (b.hop < 0) {
          b.hop = 1 + Math.random() * 4;
          b.yaw += (Math.random() - 0.5) * 1.5;
          b.vy = Math.random() < 0.3 ? 1.2 : 0;
        }
        b.vy -= 9.8 * d;
        b.y += b.vy * d;
        if (b.y <= p2.y) {
          b.y = p2.y;
          b.vy = 0;
        }
        b.x += (p2.x + b.ox - b.x) * Math.min(1, d * 3);
        b.z += (p2.z + b.oz - b.z) * Math.min(1, d * 3);
        b.amp += ((b.y > p2.y + 0.01 ? 0.6 : 0.05) - b.amp) * Math.min(1, d * 8);
        b.phase += d * (b.y > p2.y + 0.01 ? 30 : 2);
        b.pitch = Math.sin(clock.elapsedTime * 3 + bi) > 0.92 ? 0.6 : 0; // peck
        b.bank = 0;
      } else {
        if (b.delay > 0) {
          b.delay -= d;
          return;
        }
        // target: around the orbit while flying, the perch while landing
        let tx: number;
        let ty: number;
        let tz: number;
        if (f.mode === "fly") {
          const a = clock.elapsedTime * 0.5 * f.dir + (bi / PER_FLOCK) * 0.9;
          tx = f.cx + Math.cos(a) * f.orbit + Math.sin(bi * 2.3) * 1.2;
          tz = f.cz + Math.sin(a) * f.orbit + Math.cos(bi * 1.7) * 1.2;
          ty = f.alt + Math.sin(bi * 1.3 + clock.elapsedTime) * 0.8;
        } else {
          tx = p2.x + b.ox;
          tz = p2.z + b.oz;
          ty = p2.y;
        }
        const dx = tx - b.x;
        const dy = ty - b.y;
        const dz = tz - b.z;
        const dist = Math.hypot(dx, dy, dz);
        const speed = f.mode === "land" ? Math.min(7, 0.8 + dist * 0.6) : 7.5;
        const k = Math.min(1, d * (f.mode === "land" && dist < 3 ? 4 : 1.6));
        b.vx += ((dx / (dist || 1)) * speed - b.vx) * k;
        b.vy += ((dy / (dist || 1)) * speed - b.vy) * k;
        b.vz += ((dz / (dist || 1)) * speed - b.vz) * k;
        windAt(b.x, b.z, gust);
        b.x += (b.vx + gust.x * 2) * d;
        b.y += b.vy * d;
        b.z += (b.vz + gust.y * 2) * d;
        const hv = Math.hypot(b.vx, b.vz);
        if (hv > 0.3) {
          const want = Math.atan2(b.vx, b.vz);
          let dyaw = want - b.yaw;
          dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
          b.yaw += dyaw * Math.min(1, d * 6);
          b.bank = THREE.MathUtils.clamp(-dyaw * 1.2, -0.7, 0.7);
        }
        b.pitch = THREE.MathUtils.clamp(-Math.atan2(b.vy, hv + 0.01) * 0.6, -0.6, 0.6);
        // flap hard climbing, glide when descending or cruising
        const climbing = b.vy > 0.5 || f.t < 1.5;
        b.amp += ((climbing ? 1.0 : Math.sin(clock.elapsedTime * 0.7 + bi) > 0.2 ? 0.15 : 0.7) - b.amp) * Math.min(1, d * 5);
        b.phase += d * (climbing ? 34 : 22);
        if (f.mode === "land" && dist < 0.25) landed++;
      }
    });
    if (f.mode === "land" && landed === PER_FLOCK) {
      f.mode = "rest";
      for (const b of f.birds) {
        b.vx = b.vz = b.vy = 0;
        b.bank = b.pitch = 0;
      }
    }
    for (const b of f.birds) {
      bird.setXYZW(n, b.x, b.y + 0.05, b.z, b.yaw);
      flap.setXYZW(n, b.phase, b.amp, b.pitch, b.bank);
      n++;
    }
  }
  bird.needsUpdate = true;
  flap.needsUpdate = true;
}


/** A few flocks that lift off as the car approaches. Mount once. */
export function Birds({ perches: custom }: { perches?: Perch[] }) {
  const mesh = useRef<THREE.Mesh>(null);
  const sys = useRef<ReturnType<typeof makeSystem> | null>(null);

  useEffect(() => {
    const s = makeSystem(custom);
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
  }, [custom]);

  useFrame(({ clock }, dt) => {
    const s = sys.current;
    if (!s) return;
    updateWind(clock.elapsedTime, dt);
    step(s, dt, clock);
  });

  return <mesh ref={mesh} visible={false} frustumCulled={false} />;
}
