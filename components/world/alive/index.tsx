// The living world: one wind field (alive/wind.ts) moving grass, foliage, flags,
// leaves, wind lines, dust and birds, plus wheel tracks, skid marks, confetti and
// fireflies. Most of it is adapted from Bruno Simon's folio-2025 (MIT,
// (c) 2025 Bruno Simon); each file names its source.
//
// Mount <Alive /> once inside the <Canvas>, outside <Physics> (it needs no
// physics; it reads carState). <Grass /> is mounted separately (World.tsx).
"use client";

import { useFrame } from "@react-three/fiber";
import { updateWind } from "./wind";
import { Tracks } from "./Tracks";
import { Leaves } from "./Leaves";
import { WindLines } from "./WindLines";
import { Dust } from "./Dust";
import { Skids } from "./Skids";
import { Confetti } from "./Confetti";
import { Birds } from "./Birds";
import { Fireflies } from "./Fireflies";
import type { Perch } from "./Birds";

export { burstConfetti, kickDust, scatterLeaves } from "./events";
export { wind, windAt, overrideWindWeather } from "./wind";
export { withWind } from "./sway";

function WindClock() {
  // Advance the wind before anything reads it this frame.
  useFrame(({ clock }, dt) => updateWind(clock.elapsedTime, dt), -40);
  return null;
}

export default function Alive({
  birds = true,
  fireflies = true,
  birdPerches,
}: {
  birds?: boolean;
  fireflies?: boolean;
  /** Override where flocks rest (labs). Default: garage roofs, the grandstand, beside trees. */
  birdPerches?: Perch[];
}) {
  return (
    <>
      <WindClock />
      <Tracks />
      <Skids />
      <Leaves />
      <WindLines />
      <Dust />
      <Confetti />
      {birds && <Birds perches={birdPerches} />}
      {fireflies && <Fireflies />}
    </>
  );
}
