"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carState } from "../carState";
import { power } from "./state";

// The light trail of OVERTAKE and SPLIT, as in the approved mock (app/docs/brand/world/powers.tsx):
// thin flat strips through where the vehicle was over the last `lag` seconds, fading out behind
// it, their strength following `power.trail`. Strips are [x right, y up, width] in the proposal's
// metres off the vehicle's ground point, drawn at the game's vehicle scale.

const ORANGE = new THREE.Color("#ff4f00");
const INK = new THREE.Color("#151515");
type Line = [number, number, number, THREE.Color];
const TRAILS: Record<string, { lag: number; lines: Line[] }> = {
  V01: {
    lag: 0.6,
    lines: [
      [0, 0.86, 0.18, ORANGE],
      [-0.5, 0.96, 0.05, ORANGE],
      [0.5, 0.96, 0.05, ORANGE],
      [-0.78, 0.14, 0.36, INK],
      [0.78, 0.14, 0.36, INK],
    ],
  },
  V04: { lag: 0.35, lines: [[0, 0.72, 0.08, ORANGE]] },
};

const SEG = 28;
/** frames of history kept (more than the longest lag at any frame rate we draw at) */
const HIST = 90;

function ribbonGeo() {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((SEG + 1) * 2 * 3), 3));
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array((SEG + 1) * 2 * 4), 4));
  const idx: number[] = [];
  for (let i = 0; i < SEG; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  g.setIndex(idx);
  return g;
}

const up = new THREE.Vector3(0, 1, 0);
const right = new THREE.Vector3();
const at = new THREE.Vector3();
const side = new THREE.Vector3();

/**
 * `scale` is the game's vehicle scale (Vehicle.tsx VEHICLE_SCALE), `ride` how high the chassis
 * centre (carState.pos) sits over the ground at rest.
 */
export function PowerTrail({ code, scale, ride }: { code: string; scale: number; ride: number }) {
  const spec = TRAILS[code];
  const group = useRef<THREE.Group>(null);
  const ribs = useMemo(() => (spec?.lines ?? []).map(ribbonGeo), [spec]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), []);
  // history: ground point and right vector of the vehicle, with the time, newest at `head`
  const hist = useRef({ t: new Float32Array(HIST), p: new Float32Array(HIST * 6), head: 0, n: 0 });

  useFrame(() => {
    const g = group.current;
    if (!g || !spec) return;
    // the game clock (physics time in real seconds), so the trail's length follows the world
    const now = power.clock;
    const H = hist.current;
    if (H.n && now - H.t[H.head] < 1e-4) return; // the world hasn't moved since the last frame
    H.head = (H.head + 1) % HIST;
    H.n = Math.min(HIST, H.n + 1);
    right.crossVectors(carState.forward, up).setY(0).normalize();
    H.t[H.head] = now;
    H.p.set([carState.pos.x, carState.pos.y - ride, carState.pos.z, right.x, right.y, right.z], H.head * 6);
    const k = power.trail;
    g.visible = k > 0.001;
    if (!g.visible) return;
    // the sample at time `t` ago, interpolated between frames
    const sample = (ago: number) => {
      const want = now - ago;
      let j = H.head;
      for (let c = 1; c < H.n; c++) {
        const prev = (j - 1 + HIST) % HIST;
        if (H.t[prev] <= want) {
          const span = H.t[j] - H.t[prev];
          const u = span > 1e-6 ? (want - H.t[prev]) / span : 0;
          const a = prev * 6;
          const b = j * 6;
          at.set(H.p[a] + (H.p[b] - H.p[a]) * u, H.p[a + 1] + (H.p[b + 1] - H.p[a + 1]) * u, H.p[a + 2] + (H.p[b + 2] - H.p[a + 2]) * u);
          side.set(H.p[b + 3], 0, H.p[b + 5]);
          return;
        }
        j = prev;
      }
      at.set(H.p[j * 6], H.p[j * 6 + 1], H.p[j * 6 + 2]);
      side.set(H.p[j * 6 + 3], 0, H.p[j * 6 + 5]);
    };
    spec.lines.forEach(([lx, ly, lw, c], li) => {
      const geo = ribs[li];
      const pos = geo.attributes.position.array as Float32Array;
      const col = geo.attributes.color.array as Float32Array;
      for (let i = 0; i <= SEG; i++) {
        sample((spec.lag * i) / SEG);
        for (let sd = 0; sd < 2; sd++) {
          const off = (lx + (sd ? 0.5 : -0.5) * lw) * scale;
          const v = (i * 2 + sd) * 3;
          pos[v] = at.x + side.x * off;
          pos[v + 1] = at.y + ly * scale;
          pos[v + 2] = at.z + side.z * off;
          const a = (i * 2 + sd) * 4;
          col[a] = c.r;
          col[a + 1] = c.g;
          col[a + 2] = c.b;
          col[a + 3] = Math.pow(1 - i / SEG, 1.4) * k;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      geo.computeBoundingSphere();
    });
  });

  if (!spec) return null;
  return (
    <group ref={group} visible={false}>
      {ribs.map((g, i) => (
        <mesh key={i} geometry={g} material={mat} frustumCulled={false} renderOrder={6} />
      ))}
    </group>
  );
}
