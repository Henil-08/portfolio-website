// Static. Mouth 4 m wide x 1.8 m tall, 1.5 m deep, opening faces +Z.
// Colliders (post radius 0.08):
//   front posts: (+-2.0, 0.9, 0.75) capsules h=1.8      crossbar: (0, 1.8, 0.75) along X, length 4
//   back posts:  (+-2.0, 0.6, -0.75) capsules h=1.2      back ground bar: (0, 0.05, -0.75) along X
//   net: back wall cuboid 4 x 1.2 x 0.05 at (0, 0.6, -0.75); side walls 0.05 x 1.5 x 1.5 at (+-2, 0.75, 0)
"use client";

import { C } from "../../palette";
import { KitModel } from "../../kit/KitModel";
import { goalModel } from "../../kit/park";
import { mat, unitBox, type GroupProps } from "./shared";

const W = 4;
const H = 1.8;
const D = 1.5;
const ZF = D / 2;
/** The kit goal (the approved concept) at this pitch's size: mouth at ZF, sloping net back to -D/2. */
const DIMS = { w: W, h: H, d: D, dTop: 0.5, post: 0.13 };

/** Football goal: the kit goal (paper front frame with an orange band, ink back frame, ink cord net). Opening faces +Z. */
export function Goal(props: GroupProps) {
  return (
    <group {...props}>
      <KitModel model={goalModel(DIMS)} position={[0, 0, ZF]} />
      {/* paper goal line on the grass */}
      <mesh geometry={unitBox()} scale={[W + 0.4, 0.02, 0.1]} position={[0, 0.01, ZF]} material={mat(C.paper, { r: 0.8 })} receiveShadow />
    </group>
  );
}
