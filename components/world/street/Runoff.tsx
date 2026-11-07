"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Solid, trimeshOf } from "../solid";
import { heightAt } from "../terrain";
import { C } from "../palette";
import { CANALS, canalDist, onBridge } from "../layout";
import { FRAMES, HALF, N_FRAMES, RUNOFF, barrierOffset } from "./common";

// W05: a gravel trap straight behind the kerb (Island.tsx `KERB_W` 1 m) out to the barrier.
const KERB = 1.0;
// across the trap, so it follows the ground between the kerb and the barrier (two edges alone bridged
// the dips, up to 0.27 m over the land at the S2 corner)
const COLS = 8;

/** Variable-width flat ribbons on the outside of the tight corners. */
function build(inner: (i: number) => number, outer: (i: number) => number, y: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  let prev = -1;
  let side = 0;
  for (let i = 0; i <= N_FRAMES; i++) {
    const j = i % N_FRAMES;
    const f = FRAMES[j];
    // none over water: the harbour and the river pass under bridges
    const on = RUNOFF[j] > 0.35 && !onBridge(f.u, 4) && CANALS.every((c) => canalDist(c, f.p.x, f.p.z) < -6);
    if (!on) {
      prev = -1;
      continue;
    }
    const s = -Math.sign(f.k) || 1;
    if (s !== side) prev = -1; // the corner changed hands: start a new strip, don't bridge the road
    side = s;
    const a = inner(j);
    const b = Math.max(a + 0.01, outer(j));
    const k = pos.length / 3;
    for (let c = 0; c <= COLS; c++) {
      const q = f.p.clone().addScaledVector(f.n, s * (a + ((b - a) * c) / COLS));
      pos.push(q.x, heightAt(q.x, q.z) + y, q.z);
    }
    if (prev >= 0) for (let c = 0; c < COLS; c++) idx.push(prev + c, prev + c + 1, k + c, k + c, prev + c + 1, k + c + 1);
    prev = k;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const n = new Float32Array(pos.length);
  for (let i = 1; i < n.length; i += 3) n[i] = 1;
  g.setAttribute("normal", new THREE.BufferAttribute(n, 3));
  g.setIndex(idx);
  return g;
}

const GRAVEL_GEO = build(
  () => HALF + KERB - 0.05,
  (i) => Math.abs(barrierOffset(i, (-Math.sign(FRAMES[i].k) || 1) as 1 | -1)) - 0.3,
  0.05
);

const gravel = new THREE.MeshStandardMaterial({ color: C.gravel, roughness: 1 }); // plain matte gravel, as the proposal

export function Runoff() {
  // solid as drawn: the tyres ride on the gravel, not the land 5 cm under it
  const solid = useMemo(() => trimeshOf(GRAVEL_GEO), []);
  return (
    <>
      <mesh geometry={GRAVEL_GEO} material={gravel} receiveShadow />
      <Solid args={solid} />
    </>
  );
}
