"use client";

// Street circuit dressing: barriers, lamps, skyline, stands, boards, fences,
// marshal posts, flags and run-off. Mount inside <Physics>.
import Districts from "../districts";
import { Barriers } from "./Barriers";
import { Lamps } from "./Lamps";
import { Runoff } from "./Runoff";
import { Skyline } from "./Skyline";
import { Trackside } from "./Trackside";

export default function Street() {
  return (
    <group name="street">
      <Runoff />
      <Barriers />
      <Lamps />
      <Trackside />
      <Skyline />
      <Districts />
    </group>
  );
}
