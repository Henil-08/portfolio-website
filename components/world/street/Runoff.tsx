"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { FRAMES, HALF, N_FRAMES, RUNOFF, barrierOffset, rng } from "./common";

const PAVED = 1.8;

/** Variable-width flat ribbons on the outside of the tight corners. */
function build(inner: (i: number) => number, outer: (i: number) => number, y: number) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let prev = -1;
  for (let i = 0; i <= N_FRAMES; i++) {
    const j = i % N_FRAMES;
    const f = FRAMES[j];
    const on = RUNOFF[j] > 0.35;
    if (!on) {
      prev = -1;
      continue;
    }
    const s = -Math.sign(f.k) || 1;
    const a = inner(j);
    const b = Math.max(a + 0.01, outer(j));
    const pa = f.p.clone().addScaledVector(f.n, s * a);
    const pb = f.p.clone().addScaledVector(f.n, s * b);
    const k = pos.length / 3;
    pos.push(pa.x, y, pa.z, pb.x, y, pb.z);
    uv.push(pa.x / 6, pa.z / 6, pb.x / 6, pb.z / 6);
    if (prev >= 0) idx.push(prev, prev + 1, k, k, prev + 1, k + 1);
    prev = k;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  const n = new Float32Array(pos.length);
  for (let i = 1; i < n.length; i += 3) n[i] = 1;
  g.setAttribute("normal", new THREE.BufferAttribute(n, 3));
  g.setIndex(idx);
  return g;
}

const PAVED_GEO = build(
  () => HALF + 0.6,
  (i) => Math.min(HALF + 0.6 + PAVED, Math.abs(barrierOffset(i, (-Math.sign(FRAMES[i].k) || 1) as 1 | -1)) - 0.3),
  0.014
);
const GRAVEL_GEO = build(
  () => HALF + 0.6 + PAVED,
  (i) => Math.abs(barrierOffset(i, (-Math.sign(FRAMES[i].k) || 1) as 1 | -1)) - 0.3,
  0.012
);

function gravelTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ddd3c3";
  g.fillRect(0, 0, 128, 128);
  const r = rng(5);
  const tones = ["#c9bca8", "#efe7da", "#b9ab96", "#e6dccd"];
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = tones[Math.floor(r() * tones.length)];
    const s = 1 + r() * 2;
    g.fillRect(r() * 128, r() * 128, s, s);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const paved = new THREE.MeshStandardMaterial({ color: "#5d6066", roughness: 0.92 });

export function Runoff() {
  const gravel = useMemo(() => new THREE.MeshStandardMaterial({ map: gravelTexture(), roughness: 1 }), []);
  return (
    <>
      <mesh geometry={PAVED_GEO} material={paved} receiveShadow />
      <mesh geometry={GRAVEL_GEO} material={gravel} receiveShadow />
    </>
  );
}
