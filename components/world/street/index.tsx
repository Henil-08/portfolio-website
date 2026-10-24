"use client";

// Street circuit dressing: barriers, floodlights, skyline, stands, boards, fences,
// marshal posts, flags and run-off. Mount inside <Physics>.
import Districts from "../districts";
import { Barriers } from "./Barriers";
import { Floodlights } from "./Floodlights";
import { Runoff } from "./Runoff";
import { Skyline } from "./Skyline";
import { Trackside } from "./Trackside";

export default function Street() {
  return (
    <group name="street">
      <Runoff />
      <Barriers />
      <Floodlights />
      <Trackside />
      <Skyline />
      <Districts />
    </group>
  );
}
