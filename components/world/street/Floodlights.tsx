"use client";

// Night-race floodlights: the approved model (../kit/builtTrackside.tsx, concept
// floodlight: a tall ink mast with a ladder and platform under a wide paper-framed head of
// 24 lamps), set back past the run-off where layoutStreet.ts `FLOODS` puts them, head
// tilted at the road (local +z). One instanced draw per material. No real lights: the
// lamps glow above 1 at night so they bloom, and the tarmac itself is lit evenly at night
// (Island.tsx `roadLight`).
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { heightAt } from "../terrain";
import { dayNight } from "../daynight";
import { bm, type MatKey } from "../kit/builtShared";
import { BuiltInstances, placeMatrix } from "../kit/builtInstances";
import { floodlightParts } from "../kit/builtTrackside";
import { FLOODS } from "./layoutStreet";
import { WORLD_SCALE } from "../scale";

/** The concept's 26 m tower (a real 20-30 m floodlight) at the world's scale (../scale.ts): about 18.7 m to the top of the head. */
export const FLOOD_SCALE = WORLD_SCALE;

/** Warm lens for the trackside's other lamps: dim by day, bright at night. Owned by the street so it's safe to animate. */
export const lensMat = new THREE.MeshStandardMaterial({
  color: "#fff4e2",
  emissive: new THREE.Color("#ffc985"),
  emissiveIntensity: 0.1,
  roughness: 0.3,
  toneMapped: false,
});

/** Floodlight lamp faces: paper by day, warm white well above 1 at night. */
const lampMat = new THREE.MeshStandardMaterial({
  color: "#f4f1e8",
  emissive: new THREE.Color("#fff3dc"),
  emissiveIntensity: 0.25,
  roughness: 0.3,
  toneMapped: false,
});
const material = (k: MatKey) => (k === "lens" ? lampMat : bm(k));

const MATRICES = FLOODS.map((f) => placeMatrix(f.x, heightAt(f.x, f.z), f.z, f.yaw, FLOOD_SCALE));

export function Floodlights() {
  useFrame(() => {
    const n = dayNight.night;
    lensMat.emissiveIntensity = 0.08 + n * 4.2;
    lampMat.emissiveIntensity = 0.25 + n * 6;
  });
  return (
    <>
      <BuiltInstances parts={floodlightParts()} matrices={MATRICES} material={material} />
      <RigidBody type="fixed" colliders={false}>
        {FLOODS.map((f, i) => (
          <CylinderCollider key={i} args={[1.5, 1.25 * FLOOD_SCALE]} position={[f.x, heightAt(f.x, f.z) + 1.5, f.z]} />
        ))}
      </RigidBody>
    </>
  );
}
