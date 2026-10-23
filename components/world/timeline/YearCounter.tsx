// Seven-segment year counter lying on the plaza floor.
// Adapted from Bruno Simon's folio-2025 (MIT, (c) 2025 Bruno Simon),
// sources/Game/World/Areas/CareerArea.js (setYears): same segment table, the
// counter slides along the time axis with the car and unlit bars sink into
// the slab. Bruno does the sinking in a TSL position node; here it is one
// instanced mesh whose matrices are eased every frame.
"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { dayNight } from "../daynight";
import { COUNTER_X, T0, T1, Z_START, tOf, zOf } from "./data";

//      --- 0 ---
//    |           |
//    5           1
//    |           |
//      --- 6 ---
//    |           |
//    4           2
//    |           |
//      --- 3 ---
const DIGITS = [
  [1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 0, 0, 0, 0],
  [1, 1, 0, 1, 1, 0, 1],
  [1, 1, 1, 1, 0, 0, 1],
  [0, 1, 1, 0, 0, 1, 1],
  [1, 0, 1, 1, 0, 1, 1],
  [1, 0, 1, 1, 1, 1, 1],
  [1, 1, 1, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 0, 1, 1],
];

const W = 0.8; // digit width (along the reading direction)
const H = 1.4; // digit height
const T = 0.15; // bar thickness
const GAP = 0.28; // between digits
const N = 4;
const SLAB_TOP = 0.08;
const UP = 0.11; // bar centre when lit
const DOWN = 0.02; // bar centre when sunk (inside the slab)

// Bar centres and lengths in digit space: u along reading, v up the digit.
const BARS: { u: number; v: number; horizontal: boolean }[] = [
  { u: 0, v: H / 2, horizontal: true },
  { u: W / 2, v: H / 4, horizontal: false },
  { u: W / 2, v: -H / 4, horizontal: false },
  { u: 0, v: -H / 2, horizontal: true },
  { u: -W / 2, v: -H / 4, horizontal: false },
  { u: -W / 2, v: H / 4, horizontal: false },
  { u: 0, v: 0, horizontal: true },
];

const TOTAL = N * W + (N - 1) * GAP;
const SLAB = { x: H + 0.7, z: TOTAL + 0.8 };

/** Car position in the plaza's local frame, written once per frame by <Timeline>. */
export type Probe = { x: number; z: number; inside: boolean; slots: number[] };

const m4 = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const quat = new THREE.Quaternion();
const glow = new THREE.Color();

/**
 * Text reads along local +z with the top of the digits towards local +x. In
 * the world (plaza yaw pi/2) that is reading along +X with the tops towards -Z:
 * upright for the chase camera, which sits at +X/+Z of the car looking -X/-Z.
 */
export function YearCounter({ probe }: { probe: RefObject<Probe> }) {
  const group = useRef<THREE.Group>(null);
  const bars = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const lift = useRef(new Float32Array(N * 7));
  const zNow = useRef(Z_START);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  useFrame((_, dt) => {
    const g = group.current;
    const b = bars.current;
    const m = mat.current;
    if (!g || !b || !m) return;
    const d = Math.min(dt, 1 / 30);
    const p = probe.current;

    // Slide with the car between the first and the last year.
    const zMin = zOf(T1);
    const zMax = Z_START;
    const zc = p.inside ? THREE.MathUtils.clamp(p.z, zMin, zMax) : zMax;
    zNow.current += (zc - zNow.current) * Math.min(1, d * 10);
    g.position.z = zNow.current;

    const year = THREE.MathUtils.clamp(Math.floor(tOf(zc)), T0, T1 - 1);
    const s = String(year);

    const l = lift.current;
    for (let k = 0; k < N; k++) {
      const digit = DIGITS[Number(s[k])] ?? DIGITS[8];
      // first digit at the -z end, reading towards +z
      const uk = -TOTAL / 2 + W / 2 + k * (W + GAP);
      for (let i = 0; i < 7; i++) {
        const j = k * 7 + i;
        l[j] += (digit[i] - l[j]) * Math.min(1, d * 14);
        const bar = BARS[i];
        const len = (bar.horizontal ? W : H / 2) - T * 0.35;
        pos.set(bar.v, DOWN + (UP - DOWN) * l[j], uk + bar.u);
        // horizontal bars run along z (reading), vertical ones along x
        if (bar.horizontal) scl.set(T, 0.06, len);
        else scl.set(len, 0.06, T);
        m4.compose(pos, quat, scl);
        b.setMatrixAt(j, m4);
      }
    }
    b.instanceMatrix.needsUpdate = true;

    const k = dayNight.night;
    m.color.copy(glow.set("#f6f2ff")).multiplyScalar(0.92 + 0.5 * k);
  });

  return (
    <group ref={group} position={[COUNTER_X, 0, Z_START]}>
      <mesh position={[0, SLAB_TOP / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[SLAB.x, SLAB_TOP, SLAB.z]} />
        <meshStandardMaterial color="#2c2622" roughness={0.8} />
      </mesh>
      <instancedMesh ref={bars} args={[geometry, undefined, N * 7]} frustumCulled={false}>
        <meshBasicMaterial ref={mat} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
