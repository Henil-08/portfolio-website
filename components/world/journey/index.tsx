// The career journey in the world: the current terrace (../Timeline.tsx) or, with ?journey=a|b|c,
// one of the three redesigns up for review (/docs/brand/journey). See ./choice.ts.
"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type * as THREE from "three";
import Timeline from "../Timeline";
import { TIMELINE } from "../layout";
import { heightAt } from "../terrain";
import { JOURNEY } from "./choice";

const JourneyA = dynamic(() => import("./JourneyA"), { ssr: false });
const JourneyB = dynamic(() => import("./JourneyB"), { ssr: false });
const JourneyC = dynamic(() => import("./JourneyC"), { ssr: false });

export default function Journey() {
  const root = useRef<THREE.Group>(null);
  // dev and headless checks: window.__journey is the drawn journey's root (its cost: hide it and compare)
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __journey: THREE.Group | null }).__journey = root.current;
  }, []);
  return (
    <group ref={root} name="journey">
      {JOURNEY === "current" && <Timeline position={[TIMELINE.pos[0], heightAt(TIMELINE.pos[0], TIMELINE.pos[1]), TIMELINE.pos[1]]} rotation={TIMELINE.rot} />}
      {JOURNEY === "a" && <JourneyA />}
      {JOURNEY === "b" && <JourneyB />}
      {JOURNEY === "c" && <JourneyC />}
    </group>
  );
}
