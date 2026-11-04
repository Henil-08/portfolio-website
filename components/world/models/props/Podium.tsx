// Static. ~5.2 x 1.2 x 1.6 m. Faces +Z.
// Colliders (cuboids, center + full size):
//   P1 center: (0, 0.6, 0)        1.72 x 1.2 x 1.6
//   P2 left:   (-1.72, 0.425, 0)  1.72 x 0.85 x 1.6
//   P3 right:  (1.72, 0.3, 0)     1.72 x 0.6 x 1.6
"use client";

import { KitModel } from "../../kit/KitModel";
import { KitPodium, trophyModel, type PodiumDims } from "../../kit/park";
import type { GroupProps } from "./shared";

/** This podium's steps: the kit podium (the approved concept) at the world's size. */
const DIMS: PodiumDims = {
  w: 1.72,
  d: 1.6,
  steps: [
    { n: "2", x: -1.72, h: 0.85 },
    { n: "1", x: 0, h: 1.2 },
    { n: "3", x: 1.72, h: 0.6 },
  ],
};

/** Trophy: the kit trophy (faceted paper cup, angular handles, ink plinth with an orange band), ~0.85 m at scale 1. */
export function Trophy(props: GroupProps) {
  return <KitModel model={trophyModel()} {...props} />;
}

/** F1 podium: the kit podium (stepped chamfered concrete, ink tops with their numbers, an orange stripe on first) with a kit trophy on each step. */
export function Podium(props: GroupProps) {
  return (
    <group {...props}>
      <KitPodium dims={DIMS} />
      {DIMS.steps.map((s) => (
        <Trophy key={s.n} position={[s.x + 0.35, s.h + 0.016, -0.2]} scale={s.n === "1" ? 0.95 : 0.75} rotation={[0, -0.2, 0]} />
      ))}
    </group>
  );
}
