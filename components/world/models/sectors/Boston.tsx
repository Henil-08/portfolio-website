// Sector 3 · 2023-25 · Boston, grad school + co-ops. Static.
// Footprint 26 x 18 (x -13..13, z -9..9). Everything sits in z -11..-0.5; the 9 m band
// z 0..9 along the +Z edge is left clear for the track. Everything stands at the world's scale
// (../../scale.ts): the row's real 3.1 m storeys, real 4.3 m lamps.
// Colliders: BOSTON_BOXES (the row, its stoops, the state house, its portico and steps).
"use client";

import * as THREE from "three";
import { CI } from "../../buildings/concrete";
import { geo, mat, unitBox, unitCyl, type GroupProps } from "../props/shared";
import { Built } from "../../kit/builtShared";
import { bostonParts } from "../../kit/builtSectors";
import { Inst, type T9 } from "./kit";
import { WORLD_SCALE } from "../../scale";

const SNOW = CI.paper;
/** The approved row and state house (31 x 13.6 m, its storeys a real 3.1 m) at the world's scale. */
export const HALL_S = WORLD_SCALE;
/** Where the model's origin stands: its portico steps reach z = -1.8, the back of the row z = -10.8. */
const HALL_AT: [number, number, number] = [0.57, 0.06, -6.4];

type Box = [[number, number, number], [number, number, number]];
/** The model's solids in its own metres (centre, size): the row, its stoops, the state house, its portico and steps. */
const HALL_SOLIDS: Box[] = [
  [[-8.76, 5.81, -1.39], [17.5, 11.67, 10.24]],
  [[-8.76, 0.63, 4.11], [17.5, 1.48, 2.22]],
  [[6.5, 6.37, -2.0], [12.04, 12.96, 7.04]],
  [[6.5, 4.89, 4.2], [13.15, 10.0, 5.37]],
];
/** The set's colliders in its own space (centre, full size), from the model's solids where it stands. */
export const BOSTON_BOXES: Box[] = HALL_SOLIDS.map(([c, sz]) => [c.map((v, i) => HALL_AT[i] + v * HALL_S) as Box[0], sz.map((v) => v * HALL_S) as Box[1]]);

// ---- street furniture ----
/** Faceted lumps (snow drifts, finials): no round toy spheres. */
const facetGeo = () => geo("bost-facet", () => new THREE.IcosahedronGeometry(1, 0));
/** Gas lamps along the kerb: a real 4.3 m lamp at the world's scale. */
const LAMP_AT: T9[] = [-12.3, -7.4, 1.0, 11.2].map((x) => [x, 0, -1.0, WORLD_SCALE, WORLD_SCALE, WORLD_SCALE, 0, 0, 0]);
const LAMP_BASE: T9[] = [[0, 0.2, 0, 0.15, 0.4, 0.15]];
const LAMP_POLE: T9[] = [[0, 1.9, 0, 0.055, 3.1, 0.055]];
const LAMP_GLASS: T9[] = [[0, 3.72, 0, 0.36, 0.55, 0.36]];
const LAMP_CAP: T9[] = [
  [0, 4.08, 0, 0.32, 0.2, 0.32, 0, Math.PI / 4, 0],
  [0, 3.43, 0, 0.26, 0.08, 0.26, 0, Math.PI / 4, 0],
];
const LAMP_FIN: T9[] = [[0, 4.24, 0, 0.05, 0.05, 0.05]];
const LAMP_SNOW: T9[] = [[0, 4.12, 0, 0.2, 0.06, 0.2]];
const TREE_AT: T9[] = [
  [-3.2, 0, -1.1, 1, 1, 1, 0, 0.4, 0],
  [12.3, 0, -2.3, 1, 1, 1, 0, 1.9, 0],
];
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
  [1.9, 0.08, -1.35, 0.8, 0.07, 0.4],
  [-8.0, 0.08, -0.9, 0.6, 0.06, 0.3],
  [9.0, 0.08, -0.85, 0.9, 0.06, 0.28],
  [5.6, 0.08, -0.85, 0.5, 0.05, 0.22],
];
/** Sector 3: Boston brownstone row with bay windows and stoops, a columned concrete college hall with a clock cupola, in Concrete & Ink, lamps and snow. Faces +Z. */
export function BostonSector(props: GroupProps) {
  const iron = mat(CI.ink, { r: 0.45, m: 0.3 });
  const ink = mat(CI.ink, { r: 0.5, m: 0.1 });
  const snow = mat(SNOW, { r: 0.65 });
  const warm = mat("#ffe7bf", { glow: 1.8 });
  return (
    <group {...props}>
      {/* concrete base (under the whole row), sidewalk, kerb */}
      <mesh geometry={unitBox()} scale={[25.6, 0.06, 10.7]} position={[0, 0.03, -5.75]} material={mat(CI.concreteDark, { r: 0.95 })} receiveShadow />
      <mesh geometry={unitBox()} scale={[25.4, 0.04, 2.9]} position={[0, 0.07, -2.1]} material={mat("#cdc9bf", { r: 0.95 })} receiveShadow />
      <mesh geometry={unitBox()} scale={[25.6, 0.16, 0.26]} position={[0, 0.08, -0.62]} material={mat(CI.concreteDark, { r: 0.9 })} castShadow receiveShadow />

      {/* ===== the row and the state house: the approved model (kit/builtSectors.tsx, concept boston) ===== */}
      <group position={HALL_AT} scale={HALL_S}>
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
    </group>
  );
}
