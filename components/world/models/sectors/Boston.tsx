// Sector 3 · 2023-25 · Boston, grad school + co-ops. Static.
// Footprint 26 x 18 (x -13..13, z -9..9). Everything sits in z -9..-0.5; the 9 m band
// z 0..9 along the +Z edge is left clear for the track.
// Colliders (cuboids, centre + full size):
//   row:               (-3.48, 3.2, -6.24)  8.1 x 6.3 x 5.53
//   stoops:            (-3.48, 0.4, -3.27)  8.1 x 0.8 x 1.2
//   state house:       (4.08, 3.5, -6.57)   6.5 x 7.0 x 3.8   (dome and spire to 13 m, out of reach)
//   portico + steps:   (4.08, 2.7, -3.22)   7.1 x 5.4 x 2.9
//   street lamps:      cylinder r 0.18 h 4.0 at (-12.3, -1.0), (-7.4, -1.0), (1.0, -1.0), (11.2, -1.0)
//   bare trees:        cylinder r 0.18 h 3 at (-3.2, -1.1), (12.3, -2.3)
//   bench:             (2.4, 0.5, -1.4)    1.8 x 1.0 x 0.7
"use client";

import * as THREE from "three";
import { CI } from "../../buildings/concrete";
import { geo, mat, unitBox, unitCyl, type GroupProps } from "../props/shared";
import { Built } from "../../kit/builtShared";
import { bostonParts } from "../../kit/builtSectors";
import { Inst, at, type T9 } from "./kit";

const SNOW = CI.paper;
/** The approved row and state house (32 x 15 m) scaled to sit between the back of the set and the pavement. */
export const HALL_S = 0.54;

// ---- street furniture ----
/** Faceted lumps (snow drifts, finials): no round toy spheres. */
const facetGeo = () => geo("bost-facet", () => new THREE.IcosahedronGeometry(1, 0));
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

/** Sector 3: Boston brownstone row with bay windows and stoops, a columned concrete college hall with a clock cupola, in Concrete & Ink, lamps, bench and snow. Faces +Z. */
export function BostonSector(props: GroupProps) {
  const iron = mat(CI.ink, { r: 0.45, m: 0.3 });
  const ink = mat(CI.ink, { r: 0.5, m: 0.1 });
  const snow = mat(SNOW, { r: 0.65 });
  const warm = mat("#ffe7bf", { glow: 1.8 });
  return (
    <group {...props}>
      {/* concrete base, sidewalk, kerb */}
      <mesh geometry={unitBox()} scale={[25.6, 0.06, 8.6]} position={[0, 0.03, -4.7]} material={mat(CI.concreteDark, { r: 0.95 })} receiveShadow />
      <mesh geometry={unitBox()} scale={[25.4, 0.04, 2.9]} position={[0, 0.07, -2.1]} material={mat("#cdc9bf", { r: 0.95 })} receiveShadow />
      <mesh geometry={unitBox()} scale={[25.6, 0.16, 0.26]} position={[0, 0.08, -0.62]} material={mat(CI.concreteDark, { r: 0.9 })} castShadow receiveShadow />

      {/* ===== the row and the state house: the approved model (kit/builtSectors.tsx, concept boston) ===== */}
      <group position={[0.57, 0.06, -5.49]} scale={HALL_S}>
        <Built parts={bostonParts()} />
      </group>

      {/* ===== street ===== */}
      <Inst geometry={unitCyl()} material={iron} items={LAMP_BASE} at={LAMP_AT} />
      <Inst geometry={unitCyl()} material={iron} items={LAMP_POLE} at={LAMP_AT} />
      <Inst geometry={unitBox()} material={warm} items={LAMP_GLASS} at={LAMP_AT} cast={false} />
      <Inst geometry={geo("bost-lampcap", () => new THREE.CylinderGeometry(0.05, 0.72, 1, 4))} material={iron} items={LAMP_CAP} at={LAMP_AT} />
      <Inst geometry={unitBox()} material={iron} items={LAMP_FIN} at={LAMP_AT} />
      <Inst geometry={facetGeo()} material={snow} items={LAMP_SNOW} at={LAMP_AT} cast={false} />
      <Inst geometry={unitCyl()} material={ink} items={TREE_PARTS} at={TREE_AT} />
      <Inst geometry={unitBox()} material={mat(CI.graphite, { r: 0.85 })} items={PIT} />
      <Inst geometry={facetGeo()} material={snow} items={SNOW_PATCH} />
      <group position={[2.4, 0.06, -1.4]}>
        <Inst geometry={unitBox()} material={mat(CI.concrete, { r: 0.9 })} items={BENCH_SLATS} />
        <Inst geometry={unitBox()} material={iron} items={BENCH_IRON} />
        <mesh geometry={unitBox()} scale={[1.3, 0.04, 0.3]} position={[0.1, 0.5, 0.0]} material={snow} />
      </group>
    </group>
  );
}
