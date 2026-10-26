"use client";

// Parapets where the road runs on an embankment: wherever the land falls away
// about a metre just past the shoulder (the crossover ramps, the bridge
// approaches), a wall runs along the road edge and its outer face reaches down to
// the ground, so the low side shows more wall. It stops the car going over the
// edge into a pit it can't climb out of. All of it is the W04 concrete wall with a
// paper stripe on top (docs/BRAND.md); next to the crossover it takes the deck
// parapet's size, elsewhere the harbour bridge's. Spans that already have parapets
// (the crossover deck, the harbour and river bridges) are left alone.
import { useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { CANALS, TRACK_WIDTH, canalDist, nearestT, onBridge, trackCurve, trackPoint, trackTangent } from "./layout";
import { km } from "./street/ink";
import { heightAt } from "./terrain";

// [inner face, outer face, height above the road, cap height] per style
const DECK = { IN: TRACK_WIDTH / 2 + 0.5, OUT: TRACK_WIDTH / 2 + 0.9, TOP: 0.95, CAP: 0.12 }; // Bridge.tsx parapet
const STONE = { IN: TRACK_WIDTH / 2 + 0.75, OUT: TRACK_WIDTH / 2 + 1.07, TOP: 0.5, CAP: 0.09 }; // Harbour.tsx parapet
const OUT = STONE.OUT;
const DROP = 0.9; // land this far below the road just outside makes a wall
const STEP = 0.5; // metres between samples along the road

type Run = { side: number; t: number[]; deck: boolean };

function frame(t: number, side: number, o: number) {
  const p = trackPoint(t);
  const tan = trackTangent(t);
  const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
  return { p, x: p.x + n.x * o * side, z: p.z + n.z * o * side };
}

function runs(): Run[] {
  const L = trackCurve.getLength();
  const N = Math.round(L / STEP);
  const out: Run[] = [];
  for (const side of [-1, 1]) {
    const need = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const t = i / N;
      if (onBridge(t, 1)) continue;
      const p = trackPoint(t);
      if (CANALS.some((c) => canalDist(c, p.x, p.z) > -4)) continue;
      // the wall itself must stand on this road's own shoulder, not on another stretch
      const w = frame(t, side, OUT);
      if (nearestT(w.x, w.z).dist < OUT - 0.3) continue;
      let drop = 0;
      for (const o of [7.5, 8.5, 10]) {
        const f = frame(t, side, o);
        if (nearestT(f.x, f.z).dist < o - 0.5) continue; // that's another road
        drop = Math.max(drop, p.y - heightAt(f.x, f.z));
      }
      if (drop > DROP) need[i] = 1;
    }
    // close gaps under 3 m, then grow each run 1.5 m at both ends
    const gap = Math.round(3 / STEP);
    for (let i = 0; i < N; i++)
      if (need[i] && !need[(i + 1) % N]) {
        let j = 1;
        while (j <= gap && !need[(i + j) % N]) j++;
        if (j <= gap) for (let k = 1; k < j; k++) need[(i + k) % N] = 1;
      }
    const grow = Math.round(1.5 / STEP);
    const grown = need.slice();
    for (let i = 0; i < N; i++) if (need[i]) for (let k = -grow; k <= grow; k++) grown[(i + k + N) % N] = 1;
    // collect runs (a run may wrap past t = 0)
    let start = grown.indexOf(0);
    if (start < 0) start = 0;
    let cur: number[] = [];
    for (let k = 1; k <= N; k++) {
      const i = (start + k) % N;
      if (grown[i]) cur.push(i / N);
      else if (cur.length) {
        if (cur.length * STEP >= 4) out.push(run(side, cur));
        cur = [];
      }
    }
    if (cur.length * STEP >= 4) out.push(run(side, cur));
  }
  return out;
}

/** A run that touches the crossover deck carries on its parapet. */
function run(side: number, t: number[]): Run {
  return { side, t, deck: onBridge(t[0], 3) || onBridge(t[t.length - 1], 3) };
}

/** The wall body (inner face down to the road, outer face down to the ground) and its cap. */
function build() {
  const parts = { deck: { walls: [] as THREE.BufferGeometry[], caps: [] as THREE.BufferGeometry[] }, stone: { walls: [] as THREE.BufferGeometry[], caps: [] as THREE.BufferGeometry[] } };
  const cols: { x: number; y: number; z: number; yaw: number; len: number; t: number; h: number }[] = [];
  for (const r of runs()) {
    const { IN, OUT, TOP, CAP } = r.deck ? DECK : STONE;
    const into = r.deck ? parts.deck : parts.stone;
    const wall: [number, number, number][][] = [];
    const cope: [number, number, number][][] = [];
    for (const t of r.t) {
      const fi = frame(t, r.side, IN);
      const fo = frame(t, r.side, OUT);
      const ci = frame(t, r.side, IN - 0.06);
      const co = frame(t, r.side, OUT + 0.06);
      const y = fi.p.y + TOP;
      const ground = Math.min(heightAt(fo.x, fo.z), fi.p.y) - 0.3;
      wall.push([
        [fi.x, y, fi.z],
        [fo.x, y, fo.z],
        [fo.x, ground, fo.z],
        [fi.x, fi.p.y - 0.15, fi.z],
      ]);
      cope.push([
        [ci.x, y + CAP, ci.z],
        [co.x, y + CAP, co.z],
        [co.x, y - 0.02, co.z],
        [ci.x, y - 0.02, ci.z],
      ]);
    }
    into.walls.push(loft(wall, r.side));
    into.caps.push(loft(cope, r.side));
    // colliders: straight pieces about 2 m long
    const per = Math.max(2, Math.round(2 / STEP));
    for (let k = 0; k + 1 < r.t.length; k += per) {
      const e = Math.min(r.t.length - 1, k + per);
      const pa = frame(r.t[k], r.side, (IN + OUT) / 2);
      const pb = frame(r.t[e], r.side, (IN + OUT) / 2);
      cols.push({
        x: (pa.x + pb.x) / 2,
        y: (pa.p.y + pb.p.y) / 2,
        z: (pa.z + pb.z) / 2,
        yaw: Math.atan2(-(pb.z - pa.z), pb.x - pa.x),
        len: Math.hypot(pb.x - pa.x, pb.z - pa.z),
        t: OUT - IN,
        h: TOP,
      });
    }
  }
  return { ...parts, cols };
}

/** A closed tube through rings of four corners, capped at both ends, flat-shaded. */
function loft(rings: [number, number, number][][], side: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  rings.forEach((ring, k) => {
    for (const v of ring) pos.push(...v);
    if (k < rings.length - 1) {
      const v = k * 4;
      for (let f = 0; f < 4; f++) {
        const c0 = v + f;
        const c1 = v + ((f + 1) % 4);
        idx.push(c0, c1, c0 + 4, c1, c1 + 4, c0 + 4);
      }
    }
  });
  const last = (rings.length - 1) * 4;
  idx.push(0, 2, 1, 0, 3, 2, last, last + 1, last + 2, last, last + 2, last + 3);
  // the rings run along the track; on the other side the winding flips
  if (side < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}

export default function Embankments() {
  const parts = useMemo(() => build(), []);
  const sets = [
    [parts.stone, km.concrete(), km.paper()],
    [parts.deck, km.concrete(), km.paper()],
  ] as const;
  return (
    <>
      {sets.map(([set, wall, cap], s) => (
        <group key={s}>
          {set.walls.map((g, i) => (
            <mesh key={`w${i}`} geometry={g} material={wall} castShadow receiveShadow />
          ))}
          {set.caps.map((g, i) => (
            <mesh key={`c${i}`} geometry={g} material={cap} castShadow receiveShadow />
          ))}
        </group>
      ))}
      <RigidBody type="fixed" colliders={false}>
        {parts.cols.map((k, i) => (
          <CuboidCollider key={i} args={[k.len / 2 + 0.05, k.h / 2 + 0.2, k.t / 2]} position={[k.x, k.y + k.h / 2, k.z]} rotation={[0, k.yaw, 0]} />
        ))}
      </RigidBody>
    </>
  );
}
