"use client";

// The harbour bridge: where the west sweepers cross the harbour arm, the road runs
// on a stone deck with open water underneath. A thick deck edge under the road,
// low parapets with a sand coping (they stop the car too), solid abutments where
// it meets the banks and two slim piers in the channel.
import { useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { CANALS, QUAY_Y, SEA_Y, TRACK_WIDTH, canalDist, nearestT, shoreDist, trackCurve, trackPoint, trackTangent, type Canal } from "./layout";
import { C } from "./palette";
import { mat } from "./models/props/shared";
import { heightAt } from "./terrain";
import { compose } from "./street/common";
import { Instances } from "./street/Instances";
import { unitCyl } from "./models/props/shared";

const HALF = TRACK_WIDTH / 2 + 0.85; // deck half width (the kerbs fit inside)
const DEPTH = 0.55; // deck thickness under the road
const PARAPET_H = 0.5;
const PARAPET_T = 0.32;
const BANK = 3; // the deck runs this far onto land each side

type Span = { t0: number; t1: number };

/** Track stretches that pass over the harbour arm (plus a little bank either side). */
function spans(): Span[] {
  const out: Span[] = [];
  const L = trackCurve.getLength();
  const N = Math.round(L / 0.5);
  let open = -1;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = trackPoint(t);
    const over = i < N && CANALS.some((c) => canalDist(c, p.x, p.z) > -BANK);
    if (over && open < 0) open = i;
    if (!over && open >= 0) {
      out.push({ t0: open / N, t1: (i - 1) / N });
      open = -1;
    }
  }
  return out;
}

/** A box swept along the track between t0 and t1, across [a, b] from the centreline, from y0 to y1 above the road. */
function sweep(s: Span, a: number, b: number, y0: number, y1: number, steps = 24) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = s.t0 + ((s.t1 - s.t0) * k) / steps;
    const p = trackPoint(t);
    const tan = trackTangent(t);
    const nx = -tan.z;
    const nz = tan.x;
    const l = Math.hypot(nx, nz) || 1;
    for (const [o, y] of [
      [a, y1],
      [b, y1],
      [b, y0],
      [a, y0],
    ])
      pos.push(p.x + (nx / l) * o, p.y + y, p.z + (nz / l) * o);
    if (k < steps) {
      const v = k * 4;
      for (let f = 0; f < 4; f++) {
        const c0 = v + f;
        const c1 = v + ((f + 1) % 4);
        idx.push(c0, c1, c0 + 4, c1, c1 + 4, c0 + 4);
      }
    }
  }
  const last = steps * 4;
  idx.push(0, 2, 1, 0, 3, 2, last, last + 1, last + 2, last, last + 2, last + 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}

function build() {
  const deck: THREE.BufferGeometry[] = [];
  const walls: THREE.BufferGeometry[] = [];
  const caps: THREE.BufferGeometry[] = [];
  const cols: { x: number; y: number; z: number; yaw: number; len: number }[] = [];
  const piers: { x: number; z: number; y: number; yaw: number }[] = [];
  const abuts: { x: number; z: number; y: number; yaw: number; h: number }[] = [];
  for (const s of spans()) {
    deck.push(sweep(s, -HALF, HALF, -DEPTH, 0.01));
    for (const side of [-1, 1]) {
      const a = side * HALF;
      const b = side * (HALF - PARAPET_T);
      walls.push(sweep(s, Math.min(a, b), Math.max(a, b), 0, PARAPET_H));
      caps.push(sweep(s, Math.min(a, b) - 0.05, Math.max(a, b) + 0.05, PARAPET_H, PARAPET_H + 0.09));
      // colliders: short straight pieces along the curve
      const n = 8;
      for (let k = 0; k < n; k++) {
        const ta = s.t0 + ((s.t1 - s.t0) * k) / n;
        const tb = s.t0 + ((s.t1 - s.t0) * (k + 1)) / n;
        const pa = trackPoint(ta);
        const pb = trackPoint(tb);
        const tan = trackTangent((ta + tb) / 2);
        const nx = -tan.z;
        const nz = tan.x;
        const l = Math.hypot(nx, nz) || 1;
        const o = side * (HALF - PARAPET_T / 2);
        cols.push({
          x: (pa.x + pb.x) / 2 + (nx / l) * o,
          y: (pa.y + pb.y) / 2,
          z: (pa.z + pb.z) / 2 + (nz / l) * o,
          yaw: Math.atan2(-(pb.z - pa.z), pb.x - pa.x),
          len: Math.hypot(pb.x - pa.x, pb.z - pa.z),
        });
      }
    }
    // abutments at both ends, down to the ground
    for (const t of [s.t0, s.t1]) {
      const p = trackPoint(t);
      const tan = trackTangent(t);
      const ground = Math.min(heightAt(p.x, p.z), p.y - DEPTH);
      abuts.push({ x: p.x, z: p.z, y: ground - 0.4, yaw: Math.atan2(-tan.z, tan.x), h: p.y - DEPTH - ground + 0.45 });
    }
    // two piers in the channel, at the thirds of the water crossing
    for (const f of [1 / 3, 2 / 3]) {
      const t = s.t0 + (s.t1 - s.t0) * f;
      const p = trackPoint(t);
      if (heightAt(p.x, p.z) > SEA_Y) continue;
      const tan = trackTangent(t);
      piers.push({ x: p.x, z: p.z, y: p.y - DEPTH, yaw: Math.atan2(-tan.z, tan.x) });
    }
  }
  return { deck, walls, caps, cols, piers, abuts };
}

export default function Harbour() {
  const parts = useMemo(() => build(), []);
  const stone = mat(C.rock, { r: 0.9 });
  const coping = mat(C.sand, { r: 0.85 });
  const bottom = SEA_Y - 1.6;
  return (
    <>
      {parts.deck.map((g, i) => (
        <mesh key={`d${i}`} geometry={g} material={stone} castShadow receiveShadow />
      ))}
      {parts.walls.map((g, i) => (
        <mesh key={`w${i}`} geometry={g} material={stone} castShadow receiveShadow />
      ))}
      {parts.caps.map((g, i) => (
        <mesh key={`c${i}`} geometry={g} material={coping} castShadow receiveShadow />
      ))}
      {parts.abuts.map((a, i) => (
        <mesh key={`a${i}`} position={[a.x, a.y + a.h / 2, a.z]} rotation={[0, a.yaw, 0]} material={stone} castShadow receiveShadow>
          <boxGeometry args={[1.4, a.h, HALF * 2 + 0.3]} />
        </mesh>
      ))}
      {parts.piers.map((p, i) => (
        <mesh key={`p${i}`} position={[p.x, (p.y + bottom) / 2, p.z]} rotation={[0, p.yaw, 0]} material={stone} castShadow receiveShadow>
          <boxGeometry args={[0.9, p.y - bottom, HALF * 2 - 1.2]} />
        </mesh>
      ))}
      <Quays />
      <RigidBody type="fixed" colliders={false}>
        {parts.cols.map((k, i) => (
          <CuboidCollider key={i} args={[k.len / 2 + 0.05, PARAPET_H / 2 + 0.2, PARAPET_T / 2]} position={[k.x, k.y + PARAPET_H / 2, k.z]} rotation={[0, k.yaw, 0]} />
        ))}
      </RigidBody>
    </>
  );
}

// ------------------------------------------------------------ quays

/** Runs of points along a canal's quay edge: [x, z, rx, rz] (r points from the water to the land). */
function quayRuns(c: Canal) {
  const runs: [number, number, number, number][][] = [];
  if (c.quay === undefined) return runs;
  let cur: [number, number, number, number][] = [];
  for (let i = 0; i < c.pts.length - 1; i++) {
    const [ax, az] = c.pts[i];
    const [bx, bz] = c.pts[i + 1];
    const l = Math.hypot(bx - ax, bz - az);
    // toward the quay: canalSide is the sign of d x r, so r = (-dz, dx) * quay / |d|
    const rx = (-(bz - az) / l) * c.quay;
    const rz = ((bx - ax) / l) * c.quay;
    const n = Math.ceil(l / 0.6);
    for (let k = i ? 1 : 0; k <= n; k++) {
      const f = k / n;
      const w = c.w[i] + (c.w[i + 1] - c.w[i]) * f;
      const x = ax + (bx - ax) * f + rx * (w / 2);
      const z = az + (bz - az) * f + rz * (w / 2);
      const ok = shoreDist(x, z) > 1.5 && nearestT(x, z).dist > HALF + 1.2;
      if (ok) cur.push([x, z, rx, rz]);
      else if (cur.length) {
        runs.push(cur);
        cur = [];
      }
    }
  }
  if (cur.length) runs.push(cur);
  return runs.filter((r) => r.length > 3);
}

/** A box swept along a quay run, across [a, b] from the edge (+ toward land), from y0 to y1. */
function quaySweep(run: [number, number, number, number][], a: number, b: number, y0: number, y1: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  run.forEach(([x, z, rx, rz], k) => {
    for (const [o, y] of [
      [a, y1],
      [b, y1],
      [b, y0],
      [a, y0],
    ])
      pos.push(x + rx * o, y, z + rz * o);
    if (k < run.length - 1) {
      const v = k * 4;
      for (let f = 0; f < 4; f++) {
        const c0 = v + f;
        const c1 = v + ((f + 1) % 4);
        idx.push(c0, c0 + 4, c1, c1, c0 + 4, c1 + 4);
      }
    }
  });
  const last = (run.length - 1) * 4;
  idx.push(0, 1, 2, 0, 2, 3, last, last + 2, last + 1, last, last + 3, last + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}

const QUAYS = (() => {
  const walls: THREE.BufferGeometry[] = [];
  const copes: THREE.BufferGeometry[] = [];
  const bollards = { m: [] as THREE.Matrix4[] };
  for (const c of CANALS)
    for (const run of quayRuns(c)) {
      walls.push(quaySweep(run, 0, 1.4, SEA_Y - 1.6, QUAY_Y + 0.02));
      copes.push(quaySweep(run, -0.08, 2.5, QUAY_Y + 0.02, QUAY_Y + 0.13));
      for (let k = 4; k < run.length - 2; k += 9) {
        const [x, z, rx, rz] = run[k];
        bollards.m.push(compose(x + rx * 0.45, QUAY_Y + 0.13 + 0.17, z + rz * 0.45, 0, 0.12, 0.34, 0.12));
      }
    }
  return { walls, copes, bollards };
})();

/** Stone quay walls with a sand coping and iron bollards along the harbour's town side. */
export function Quays() {
  const stone = mat(C.rock, { r: 0.9 });
  const coping = mat(C.sand, { r: 0.85 });
  return (
    <>
      {QUAYS.walls.map((g, i) => (
        <mesh key={`qw${i}`} geometry={g} material={stone} receiveShadow />
      ))}
      {QUAYS.copes.map((g, i) => (
        <mesh key={`qc${i}`} geometry={g} material={coping} castShadow receiveShadow />
      ))}
      <Instances geometry={unitCyl()} material={mat(C.charcoal, { r: 0.45, m: 0.4 })} batch={QUAYS.bollards} />
    </>
  );
}
