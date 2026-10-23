// Sector 3 · 2023-25 · Boston, grad school + co-ops. Static.
// Footprint 26 x 18 (x -13..13, z -9..9). Everything sits in z -9..-0.5; the 9 m band
// z 0..9 along the +Z edge is left clear for the track.
// Colliders (cuboids, centre + full size):
//   brownstone row:    (-6.6, 4.9, -6.3)   12.6 x 9.8 x 5.4
//   bay windows:       (x, 4.6, -3.0) 2.4 x 9.1 x 1.2 for x = -11.35, -7.15, -2.95 (or fold into the row)
//   stoops:            (x, 0.7, -2.45) 1.6 x 1.4 x 2.3 for x = -9.5, -5.3, -1.1
//   college hall:      (6.8, 3.65, -6.3)   12.0 x 7.3 x 5.4   (cupola to 12.2 m, out of reach)
//   portico + steps:   (6.8, 3.3, -2.45)   6.4 x 6.6 x 2.3
//   street lamps:      cylinder r 0.18 h 4.0 at (-12.3, -1.0), (-7.4, -1.0), (1.0, -1.0), (11.2, -1.0)
//   bare trees:        cylinder r 0.18 h 3 at (-3.2, -1.1), (12.3, -2.3)
//   bench:             (2.4, 0.5, -1.4)    1.8 x 1.0 x 0.7
"use client";

import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { C } from "../../palette";
import { geo, mat, unitBox, unitCyl, unitSphere, type GroupProps } from "../props/shared";
import { Inst, at, brickMat, dome, mBox, mix, type T9 } from "./kit";

const ZF = -3.6; // street facade line
const HD = 5.4; // building depth
const BASE = 1.3; // garden level / parlour floor height
const FL = 2.6; // storey height
const HH = BASE + FL * 3; // 9.1 house eaves
const HW = 4.2; // house width
const HOUSES = [
  { x: -10.8, color: mix(C.red, C.woodDark, 0.5), brick: true, bow: false },
  { x: -6.6, color: mix(C.woodDark, C.wood, 0.25), brick: false, bow: true },
  { x: -2.4, color: mix(mix(C.red, C.wood, 0.5), C.greyDark, 0.12), brick: true, bow: false },
];
const BAY_DX = -0.75; // bay centre offset within the house
const DOOR_DX = 1.3;
const BAY_R = 1.2;
const SNOW = mix(C.white, C.blue, 0.06);

/** Half-cylinder bay (from -X round through +Z to +X), metre UVs for brick. */
function bayGeo(seg: number) {
  return geo(`bost-bay-${seg}`, () => {
    const h = HH - 0.1;
    const g = new THREE.CylinderGeometry(BAY_R, BAY_R, h, seg, 1, false, -Math.PI / 2, Math.PI);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * BAY_R, uv.getY(i) * h);
    g.translate(0, h / 2, 0);
    return g;
  });
}
const snowCapGeo = () => geo("bost-snowcap", () => new THREE.CylinderGeometry(BAY_R + 0.06, BAY_R + 0.06, 0.12, 20, 1, false, -Math.PI / 2, Math.PI));

// ---- windows: one parts list, placed at every window transform ----
const WIN_FRAME: T9[] = [[0, 0, 0, 0.8, 1.62, 0.06]];
const WIN_GLASS: T9[] = [[0, 0, 0.035, 0.64, 1.46, 0.02]];
const WIN_BAR: T9[] = [[0, 0.05, 0.05, 0.64, 0.05, 0.03]];
const WIN_STONE: T9[] = [
  [0, 0.88, 0.04, 0.96, 0.15, 0.12],
  [0, -0.86, 0.05, 0.9, 0.08, 0.16],
];
const HOUSE_WIN_AT: T9[] = HOUSES.flatMap(({ x, bow }) => {
  const out: T9[] = [];
  const rEff = bow ? BAY_R + 0.01 : BAY_R * Math.cos(Math.PI / 6) + 0.01;
  for (let f = 0; f < 3; f++) {
    const y = BASE + 1.4 + f * FL;
    for (const a of [-Math.PI / 3, 0, Math.PI / 3]) out.push([x + BAY_DX + Math.sin(a) * rEff, y, ZF + Math.cos(a) * rEff, 1, 1, 1, 0, a, 0]);
    if (f > 0) out.push([x + DOOR_DX, y, ZF + 0.01, 1, 1, 1, 0, 0, 0]);
  }
  return out;
});
// college: two rows each side of the portico, plus two behind the columns
const CX = 6.8;
const CW = 12;
const CH = 7.0;
const COL_WIN_AT: T9[] = [2.3, 4.95].flatMap((y) =>
  [-4.8, -3.6, 3.6, 4.8, -1.6, 1.6].map((dx) => [CX + dx, y, ZF + 0.01, 1, 1.15, 1, 0, 0, 0] as T9),
);

// ---- doors with transom and cream surround (local origin: door threshold centre on the facade) ----
const DOOR_PANEL: T9[] = [[0, 1.12, 0.03, 1.0, 2.2, 0.06]];
const DOOR_SURROUND: T9[] = [
  [-0.62, 1.4, 0.03, 0.18, 2.8, 0.1],
  [0.62, 1.4, 0.03, 0.18, 2.8, 0.1],
  [0, 2.88, 0.05, 1.5, 0.18, 0.16],
];
const DOOR_TRANSOM: T9[] = [[0, 2.48, 0.02, 1.0, 0.42, 0.04]];
const DOOR_AT: T9[] = HOUSES.map(({ x }) => [x + DOOR_DX, BASE, ZF, 1, 1, 1, 0, 0, 0]);

// ---- stoops (local origin: facade line, door centre, ground) ----
const STEPS = 6;
const RISE = BASE / STEPS;
const RUN = 0.3;
const STOOP_STEPS: T9[] = Array.from({ length: STEPS }, (_, k) => {
  const front = 0.5 + (STEPS - k) * RUN;
  return [0, (k + 0.5) * RISE, front / 2, 1.5, RISE, front] as T9;
});
const RAIL_LEN = Math.hypot(STEPS * RUN, BASE);
const RAIL_ANG = Math.atan2(BASE, STEPS * RUN);
const STOOP_RAILS: T9[] = [-0.7, 0.7].flatMap((sx) => [
  [sx, BASE / 2 + 0.85, 0.5 + (STEPS * RUN) / 2, 0.025, RAIL_LEN, 0.025, Math.PI / 2 + RAIL_ANG, 0, 0] as T9,
  [sx, 0.5, 0.5 + STEPS * RUN, 0.04, 1.0, 0.04] as T9,
  [sx, BASE + 0.45, 0.45, 0.03, 0.9, 0.03] as T9,
  ...[0.25, 0.5, 0.75].map((t) => [sx, BASE * (1 - t) + 0.42, 0.5 + STEPS * RUN * t, 0.015, 0.84, 0.015] as T9),
]);
const STOOP_AT: T9[] = HOUSES.map(({ x }) => [x + DOOR_DX, 0, ZF, 1, 1, 1, 0, 0, 0]);

// cornice brackets along the house tops
const BRACKETS: T9[] = HOUSES.flatMap(({ x }) => Array.from({ length: 7 }, (_, i) => [x - HW / 2 + 0.3 + (i * (HW - 0.6)) / 6, HH + 0.12, ZF + 0.22, 0.12, 0.26, 0.3] as T9));

// ---- college portico ----
const COLS: T9[] = [-2.4, -0.8, 0.8, 2.4].map((dx) => [CX + dx, 0.9 + 2.5, ZF + 1.6, 0.27, 5.0, 0.27]);
const COL_CAPS: T9[] = COLS.flatMap(([x, , z]) => [
  [x, 0.9 + 4.9, z, 0.7, 0.2, 0.7] as T9,
  [x, 0.9 + 0.1, z, 0.7, 0.2, 0.7] as T9,
]);
const PORTICO_STEPS: T9[] = [0, 1, 2].map((k) => [CX, 0.15 + k * 0.3, ZF + 1.15 - k * 0.3, 6.6 - k * 0.3, 0.3, 2.3 - k * 0.6]);
function pedimentGeo() {
  return geo("bost-pediment", () => {
    const s = new THREE.Shape();
    s.moveTo(-3.2, 0);
    s.lineTo(3.2, 0);
    s.lineTo(0, 1.35);
    s.lineTo(-3.2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 2.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 });
    g.translate(0, 0, -2.1);
    return g;
  });
}

// cupola lantern: tall arched openings on the 8 faces
const LANTERN_WIN: T9[] = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  return [Math.sin(a) * 0.8, 3.0, Math.cos(a) * 0.8, 0.36, 0.85, 0.04, 0, a, 0];
});

// ---- street furniture ----
const LAMP_AT: T9[] = [-12.3, -7.4, 1.0, 11.2].map((x) => at(x, -1.0));
const LAMP_BASE: T9[] = [[0, 0.2, 0, 0.15, 0.4, 0.15]];
const LAMP_POLE: T9[] = [[0, 1.9, 0, 0.055, 3.1, 0.055]];
const LAMP_GLASS: T9[] = [[0, 3.72, 0, 0.36, 0.55, 0.36]];
const LAMP_CAP: T9[] = [
  [0, 4.08, 0, 0.32, 0.2, 0.32, 0, Math.PI / 4, 0],
  [0, 3.43, 0, 0.26, 0.08, 0.26, 0, Math.PI / 4, 0],
];
const LAMP_FIN: T9[] = [[0, 4.24, 0, 0.05, 0.05, 0.05]];
const LAMP_SNOW: T9[] = [[0, 4.12, 0, 0.2, 0.06, 0.2]];
const TREE_AT: T9[] = [at(-3.2, -1.1, 0.4), at(12.3, -2.3, 1.9)];
const TREE_PARTS: T9[] = [
  [0, 1.4, 0, 0.12, 2.8, 0.12],
  [0.35, 2.9, 0, 0.06, 1.4, 0.06, 0, 0, -0.55],
  [-0.3, 3.0, 0.1, 0.055, 1.3, 0.055, 0.15, 0, 0.5],
  [0, 3.0, -0.35, 0.05, 1.2, 0.05, -0.55, 0, 0],
  [0.05, 3.2, 0.3, 0.045, 1.1, 0.045, 0.5, 0, -0.1],
  [0, 3.4, 0, 0.05, 1.3, 0.05],
  [0.65, 3.6, 0.1, 0.03, 0.7, 0.03, 0, 0, 0.35],
  [-0.55, 3.65, 0.1, 0.03, 0.7, 0.03, 0, 0, -0.3],
];
const PIT: T9[] = TREE_AT.map(([x, , z]) => [x, 0.1, z, 0.9, 0.04, 0.9]);
const SNOW_PATCH: T9[] = [
  [-12.0, 0.08, -2.6, 0.9, 0.08, 0.6],
  [-3.2, 0.12, -1.1, 0.42, 0.06, 0.42],
  [-4.1, 0.08, -2.7, 0.7, 0.07, 0.45],
  [0.0, 0.08, -2.9, 0.55, 0.07, 0.4],
  [12.3, 0.12, -2.3, 0.42, 0.06, 0.42],
  [11.5, 0.08, -3.0, 1.1, 0.08, 0.55],
  [1.9, 0.08, -2.2, 0.8, 0.07, 0.5],
  [-8.0, 0.08, -0.9, 0.6, 0.06, 0.3],
  [9.0, 0.08, -0.85, 0.9, 0.06, 0.28],
  [5.6, 0.08, -0.85, 0.5, 0.05, 0.22],
];
const BENCH_SLATS: T9[] = [
  [0, 0.46, 0.12, 1.7, 0.05, 0.12],
  [0, 0.46, -0.02, 1.7, 0.05, 0.12],
  [0, 0.46, -0.16, 1.7, 0.05, 0.12],
  [0, 0.68, -0.27, 1.7, 0.1, 0.04, -0.2, 0, 0],
  [0, 0.86, -0.3, 1.7, 0.1, 0.04, -0.2, 0, 0],
];
const BENCH_IRON: T9[] = [-0.75, 0.75].flatMap((x) => [
  [x, 0.22, 0.08, 0.05, 0.44, 0.05] as T9,
  [x, 0.42, -0.27, 0.05, 0.84, 0.05, -0.2, 0, 0] as T9,
  [x, 0.44, -0.04, 0.05, 0.05, 0.5] as T9,
]);

/** Sector 3: Boston brownstone row with bay windows and stoops, a columned red-brick college hall with a clock cupola, lamps, bench and snow. Faces +Z. */
export function BostonSector(props: GroupProps) {
  const cream = mat(C.cream, { r: 0.5 });
  const white = mat(C.white, { r: 0.35 });
  const iron = mat(C.black, { r: 0.4, m: 0.4 });
  const ink = mat(C.ink, { r: 0.3, m: 0.1 });
  const glass = mat("#26333a", { r: 0.08, m: 0.4 });
  const snow = mat(SNOW, { r: 0.65 });
  const stoopStone = mat(mix(C.woodDark, C.wood, 0.3), { r: 0.7 });
  const warm = mat("#ffe7bf", { glow: 1.8 });
  const collegeBrick = brickMat(mix(C.red, C.woodDark, 0.42), 0.8);
  return (
    <group {...props}>
      {/* granite base, red-brick sidewalk, kerb */}
      <RoundedBox args={[25.6, 0.06, 8.6]} radius={0.025} smoothness={2} position={[0, 0.03, -4.7]} material={mat(C.greyLight, { r: 0.85 })} receiveShadow />
      <mesh geometry={mBox(25.4, 0.04, 2.9)} position={[0, 0.07, -2.1]} material={brickMat(mix(C.red, C.sand, 0.5), 0.9)} receiveShadow />
      <mesh geometry={unitBox()} scale={[25.6, 0.16, 0.26]} position={[0, 0.08, -0.62]} material={mat(C.grey, { r: 0.7 })} castShadow receiveShadow />

      {/* ===== brownstone row ===== */}
      {HOUSES.map(({ x, color, brick, bow }) => {
        const wall = brick ? brickMat(color, 0.8) : mat(color, { r: 0.75 });
        return (
          <group key={x}>
            <mesh geometry={mBox(HW, HH, HD)} position={[x, HH / 2, ZF - HD / 2]} material={wall} castShadow receiveShadow />
            <mesh geometry={bayGeo(bow ? 20 : 3)} position={[x + BAY_DX, 0.06, ZF]} material={wall} castShadow receiveShadow />
            {/* brownstone base course and string course */}
            <mesh geometry={unitBox()} scale={[HW, BASE, 0.08]} position={[x, BASE / 2, ZF + 0.04]} material={stoopStone} receiveShadow />
            <mesh geometry={unitBox()} scale={[1.5, 0.7, 0.04]} position={[x + DOOR_DX - 0.05, 0.6, ZF + 0.1]} material={glass} />
            {/* cornice, frieze, parapet, roof snow */}
            <mesh geometry={unitBox()} scale={[HW + 0.04, 0.5, 0.2]} position={[x, HH + 0.05, ZF + 0.05]} material={brick ? cream : mat(C.woodDark, { r: 0.55 })} castShadow />
            <mesh geometry={unitBox()} scale={[HW + 0.1, 0.16, 0.6]} position={[x, HH + 0.36, ZF + 0.12]} material={brick ? cream : mat(C.woodDark, { r: 0.55 })} castShadow receiveShadow />
            <RoundedBox args={[HW - 0.08, 0.16, HD - 0.1]} radius={0.06} smoothness={3} position={[x, HH + 0.1, ZF - HD / 2 - 0.05]} material={snow} castShadow receiveShadow />
            <mesh geometry={unitBox()} scale={[HW - 0.04, 0.14, 0.42]} position={[x, HH + 0.5, ZF + 0.12]} material={snow} castShadow />
            <mesh geometry={snowCapGeo()} position={[x + BAY_DX, HH + 0.02, ZF]} material={snow} castShadow />
            {/* chimney */}
            <mesh geometry={mBox(0.6, 1.0, 0.9)} position={[x + 1.4, HH + 0.6, ZF - HD + 0.8]} material={wall} castShadow />
            <mesh geometry={unitBox()} scale={[0.7, 0.1, 1.0]} position={[x + 1.4, HH + 1.13, ZF - HD + 0.8]} material={snow} />
          </group>
        );
      })}
      <Inst geometry={unitBox()} material={cream} items={BRACKETS} />
      <Inst geometry={unitBox()} material={cream} items={WIN_FRAME} at={HOUSE_WIN_AT} />
      <Inst geometry={unitBox()} material={glass} items={WIN_GLASS} at={HOUSE_WIN_AT} cast={false} />
      <Inst geometry={unitBox()} material={cream} items={WIN_BAR} at={HOUSE_WIN_AT} cast={false} />
      <Inst geometry={unitBox()} material={mat(mix(C.cream, C.sand, 0.5), { r: 0.6 })} items={WIN_STONE} at={HOUSE_WIN_AT} />
      <Inst geometry={unitBox()} material={ink} items={DOOR_PANEL} at={DOOR_AT} />
      <Inst geometry={unitBox()} material={cream} items={DOOR_SURROUND} at={DOOR_AT} />
      <Inst geometry={unitBox()} material={glass} items={DOOR_TRANSOM} at={DOOR_AT} cast={false} />
      <Inst geometry={unitBox()} material={stoopStone} items={STOOP_STEPS} at={STOOP_AT} />
      <Inst geometry={unitCyl()} material={iron} items={STOOP_RAILS} at={STOOP_AT} />

      {/* ===== college hall ===== */}
      <mesh geometry={mBox(CW, CH, HD)} position={[CX, CH / 2, ZF - HD / 2]} material={collegeBrick} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[CW + 0.1, 0.7, HD + 0.1]} position={[CX, 0.35, ZF - HD / 2]} material={mat(C.greyLight, { r: 0.7 })} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[CW + 0.3, 0.45, HD + 0.3]} position={[CX, CH + 0.1, ZF - HD / 2]} material={white} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[CW + 0.1, 0.12, 0.1]} position={[CX, 3.62, ZF + 0.03]} material={white} />
      <RoundedBox args={[CW, 0.14, HD]} radius={0.06} smoothness={3} position={[CX, CH + 0.38, ZF - HD / 2]} material={snow} receiveShadow />
      <Inst geometry={unitBox()} material={white} items={WIN_FRAME} at={COL_WIN_AT} />
      <Inst geometry={unitBox()} material={glass} items={WIN_GLASS} at={COL_WIN_AT} cast={false} />
      <Inst geometry={unitBox()} material={white} items={WIN_BAR} at={COL_WIN_AT} cast={false} />
      <Inst geometry={unitBox()} material={white} items={WIN_STONE} at={COL_WIN_AT} />
      {/* portico */}
      <Inst geometry={unitBox()} material={mat(C.greyLight, { r: 0.6 })} items={PORTICO_STEPS} />
      <Inst geometry={unitCyl()} material={white} items={COLS} />
      <Inst geometry={unitBox()} material={white} items={COL_CAPS} />
      <mesh geometry={unitBox()} scale={[6.4, 0.65, 2.1]} position={[CX, 6.22, ZF + 1.0]} material={white} castShadow receiveShadow />
      <mesh geometry={pedimentGeo()} position={[CX, 6.54, ZF + 2.05]} material={white} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[1.6, 2.5, 0.08]} position={[CX, 2.15, ZF + 0.04]} material={ink} />
      <mesh geometry={geo("bost-fan", () => new THREE.CircleGeometry(0.8, 24, 0, Math.PI))} position={[CX, 3.42, ZF + 0.05]} material={glass} />
      {/* clock cupola */}
      <group position={[CX, CH + 0.3, ZF - 2.4]}>
        <mesh geometry={unitBox()} scale={[2.4, 2.2, 2.4]} position={[0, 1.1, 0]} material={white} castShadow receiveShadow />
        <mesh geometry={unitBox()} scale={[2.6, 0.18, 2.6]} position={[0, 2.25, 0]} material={white} castShadow />
        <mesh geometry={unitCyl()} scale={[0.72, 0.05, 0.72]} position={[0, 1.15, 1.22]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.cream, { r: 0.3 })} />
        <mesh geometry={geo("bost-clockring", () => new THREE.TorusGeometry(0.72, 0.05, 8, 40))} position={[0, 1.15, 1.25]} material={ink} />
        <mesh geometry={unitBox()} scale={[0.05, 0.45, 0.02]} position={[0, 1.15 + 0.2, 1.27]} material={ink} />
        <mesh geometry={unitBox()} scale={[0.05, 0.32, 0.02]} position={[0.13, 1.15 - 0.08, 1.27]} rotation={[0, 0, 2.2]} material={ink} />
        <mesh geometry={geo("bost-lantern", () => new THREE.CylinderGeometry(0.85, 0.85, 1.3, 8))} position={[0, 3.0, 0]} material={white} castShadow />
        <Inst geometry={unitBox()} material={glass} items={LANTERN_WIN} cast={false} />
        <mesh geometry={unitCyl()} scale={[0.98, 0.14, 0.98]} position={[0, 3.7, 0]} material={white} castShadow />
        <mesh geometry={dome()} scale={[0.82, 0.9, 0.82]} position={[0, 3.76, 0]} material={mat(C.green, { r: 0.45, m: 0.2 })} castShadow />
        <mesh geometry={unitCyl()} scale={[0.04, 0.9, 0.04]} position={[0, 4.95, 0]} material={mat(C.gold, { r: 0.3, m: 0.6 })} />
        <mesh geometry={unitSphere()} scale={0.1} position={[0, 4.75, 0]} material={mat(C.gold, { r: 0.3, m: 0.6 })} />
      </group>

      {/* ===== street ===== */}
      <Inst geometry={unitCyl()} material={iron} items={LAMP_BASE} at={LAMP_AT} />
      <Inst geometry={unitCyl()} material={iron} items={LAMP_POLE} at={LAMP_AT} />
      <Inst geometry={unitBox()} material={warm} items={LAMP_GLASS} at={LAMP_AT} cast={false} />
      <Inst geometry={geo("bost-lampcap", () => new THREE.CylinderGeometry(0.05, 0.72, 1, 4))} material={iron} items={LAMP_CAP} at={LAMP_AT} />
      <Inst geometry={unitSphere()} material={iron} items={LAMP_FIN} at={LAMP_AT} />
      <Inst geometry={unitSphere()} material={snow} items={LAMP_SNOW} at={LAMP_AT} cast={false} />
      <Inst geometry={unitCyl()} material={mat(C.woodDark, { r: 0.7 })} items={TREE_PARTS} at={TREE_AT} />
      <Inst geometry={unitBox()} material={mat(C.greyDark, { r: 0.8 })} items={PIT} />
      <Inst geometry={unitSphere()} material={snow} items={SNOW_PATCH} />
      <group position={[2.4, 0.06, -1.4]}>
        <Inst geometry={unitBox()} material={mat(C.wood, { r: 0.6 })} items={BENCH_SLATS} />
        <Inst geometry={unitBox()} material={iron} items={BENCH_IRON} />
        <mesh geometry={unitBox()} scale={[1.3, 0.04, 0.3]} position={[0.1, 0.5, 0.0]} material={snow} />
      </group>
    </group>
  );
}
