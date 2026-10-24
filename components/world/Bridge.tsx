"use client";

// The overpass where the circuit crosses itself: a deck slab under the upper
// road and parapet walls with colliders; no piers (owner): the deck spans clear. The road surface and its collider come from Island's ribbon.
import { useMemo } from "react";
import * as THREE from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { C } from "./palette";
import { BRIDGE_HALF, CROSSINGS, TRACK_WIDTH, trackCurve, trackPoint, trackTangent, type Crossing } from "./layout";
import { mat } from "./models/props/shared";

const DECK = 0.75; // slab depth under the road
const PARAPET_H = 0.95;
const PARAPET_T = 0.4;
const HALF_W = TRACK_WIDTH / 2 + 0.9;

/** A box-section ribbon following the upper road: offsets [a, b] across, from top y+top to y+bottom. */
function slab(c: Crossing, a: number, b: number, top: number, bottom: number) {
  const L = trackCurve.getLength();
  const span = (BRIDGE_HALF + 1) / L;
  const N = 48;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = c.upperT - span + (2 * span * i) / N;
    const p = trackPoint(t);
    const tan = trackTangent(t);
    const nx = -tan.z;
    const nz = tan.x;
    const l = Math.hypot(nx, nz) || 1;
    for (const [o, y] of [
      [a, top],
      [b, top],
      [b, bottom],
      [a, bottom],
    ] as const)
      pos.push(p.x + (nx / l) * o, p.y + y, p.z + (nz / l) * o);
    if (i < N) {
      const k = i * 4;
      for (let f = 0; f < 4; f++) {
        const f1 = (f + 1) % 4;
        idx.push(k + f, k + 4 + f, k + f1, k + f1, k + 4 + f, k + 4 + f1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function Span({ c }: { c: Crossing }) {
  const parts = useMemo(() => {
    // The deck sits between the parapets; the parapets hang a little lower as a lip (no shared faces).
    const deck = slab(c, -HALF_W + PARAPET_T - 0.02, HALF_W - PARAPET_T + 0.02, -0.02, -DECK);
    const walls = [-1, 1].map((s) => slab(c, s > 0 ? HALF_W - PARAPET_T : -HALF_W, s > 0 ? HALF_W : -HALF_W + PARAPET_T, PARAPET_H, -DECK - 0.12));
    const caps = [-1, 1].map((s) => slab(c, s * HALF_W - (s > 0 ? PARAPET_T + 0.06 : -0.06), s * HALF_W + (s > 0 ? 0.06 : PARAPET_T + 0.06), PARAPET_H + 0.12, PARAPET_H));
    // Parapet colliders: short straight pieces along the span.
    const L = trackCurve.getLength();
    const cols: { p: THREE.Vector3; yaw: number; len: number }[] = [];
    const STEP = 3;
    for (let s = -BRIDGE_HALF; s < BRIDGE_HALF; s += STEP) {
      const t0 = c.upperT + s / L;
      const t1 = c.upperT + (s + STEP) / L;
      for (const side of [-1, 1]) {
        const at = (t: number) => {
          const p = trackPoint(t);
          const tan = trackTangent(t);
          return p.add(new THREE.Vector3(-tan.z, 0, tan.x).normalize().multiplyScalar(side * (HALF_W - PARAPET_T / 2)));
        };
        const a = at(t0);
        const b = at(t1);
        cols.push({ p: a.clone().add(b).multiplyScalar(0.5), yaw: Math.atan2(-(b.z - a.z), b.x - a.x), len: a.distanceTo(b) });
      }
    }
    return { deck, walls, caps, cols };
  }, [c]);

  return (
    <group>
      <mesh geometry={parts.deck} castShadow material={mat(C.greyLight, { r: 0.8, side: THREE.DoubleSide })} />
      {parts.walls.map((g, i) => (
        <mesh key={i} geometry={g} castShadow material={mat(C.white, { r: 0.6, side: THREE.DoubleSide })} />
      ))}
      {parts.caps.map((g, i) => (
        <mesh key={i} geometry={g} castShadow material={mat(C.red, { r: 0.45, side: THREE.DoubleSide })} />
      ))}
      <RigidBody type="fixed" colliders={false}>
        {parts.cols.map((k, i) => (
          <CuboidCollider key={i} args={[k.len / 2 + 0.05, PARAPET_H / 2 + 0.2, PARAPET_T / 2]} position={[k.p.x, k.p.y + PARAPET_H / 2, k.p.z]} rotation={[0, k.yaw, 0]} />
        ))}
      </RigidBody>
    </group>
  );
}

export default function Bridge() {
  return (
    <>
      {CROSSINGS.map((c, i) => (
        <Span key={i} c={c} />
      ))}
    </>
  );
}
