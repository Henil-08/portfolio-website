"use client";

// Night-race floodlights (W07): an ink mast on a concrete foot, set back past the run-off,
// and an ink head tilted at the road carrying eight lamps. No real lights: the lamps glow
// above 1 at night so they bloom, and the tarmac itself is lit evenly at night (Island.tsx
// `roadLight`).
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { heightAt } from "../terrain";
import { dayNight } from "../daynight";
import { geo, unitBox } from "../models/props/shared";
import { compose } from "./common";
import { Instances } from "./Instances";
import { FLOODS } from "./layoutStreet";
import { km } from "./ink";

const MAST_H = 11;
const TILT = 0.35; // head aimed down at the road
const HEAD_W = 2.6;
const HEAD_H = 1.4;
const COLS = 4;
const ROWS = 2;

const mastGeo = () =>
  geo("flood-mast", () => {
    const g = new THREE.CylinderGeometry(0.1, 0.18, MAST_H, 12);
    g.translate(0, MAST_H / 2, 0);
    return g;
  });

/** Warm lens: dim by day, bright at night. Owned by the street so it's safe to animate. */
export const lensMat = new THREE.MeshStandardMaterial({
  color: "#fff4e2",
  emissive: new THREE.Color("#ffc985"),
  emissiveIntensity: 0.1,
  roughness: 0.3,
  toneMapped: false,
});

/** Floodlight lamp faces: paper by day, warm white well above 1 at night. */
const lampMat = new THREE.MeshStandardMaterial({
  color: "#d9d6ce",
  emissive: new THREE.Color("#fff3dc"),
  emissiveIntensity: 0.15,
  roughness: 0.4,
  toneMapped: false,
});

const B = (() => {
  const foot = { m: [] as THREE.Matrix4[] };
  const mast = { m: [] as THREE.Matrix4[] };
  const head = { m: [] as THREE.Matrix4[] };
  const lamp = { m: [] as THREE.Matrix4[] };
  for (const f of FLOODS) {
    const root = compose(f.x, heightAt(f.x, f.z), f.z, f.yaw);
    const at = (parent: THREE.Matrix4, list: THREE.Matrix4[], x: number, y: number, z: number, sx: number, sy: number, sz: number) =>
      list.push(parent.clone().multiply(compose(x, y, z, 0, sx, sy, sz)));
    at(root, foot.m, 0, 0.15, 0, 1.2, 0.3, 1.2);
    mast.m.push(root.clone());
    // the head, tilted down toward the road (local +Z), lamps on its face
    const h = root.clone().multiply(compose(0, MAST_H + 0.2, 0.3, 0, 1, 1, 1, TILT));
    at(h, head.m, 0, 0, 0, HEAD_W, HEAD_H, 0.3);
    const cw = 0.63;
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++) at(h, lamp.m, -0.95 + c * cw, r ? -0.3 : 0.3, 0.16, 0.5, 0.45, 0.04);
  }
  return { foot, mast, head, lamp };
})();

export function Floodlights() {
  useFrame(() => {
    const n = dayNight.night;
    lensMat.emissiveIntensity = 0.08 + n * 4.2;
    lampMat.emissiveIntensity = 0.15 + n * 6;
  });
  return (
    <>
      <Instances geometry={unitBox()} material={km.concrete()} batch={B.foot} />
      <Instances geometry={mastGeo()} material={km.ink()} batch={B.mast} />
      <Instances geometry={unitBox()} material={km.ink()} batch={B.head} />
      <Instances geometry={unitBox()} material={lampMat} batch={B.lamp} shadow={false} />
      <RigidBody type="fixed" colliders={false}>
        {FLOODS.map((f, i) => (
          <CylinderCollider key={i} args={[1.5, 0.6]} position={[f.x, heightAt(f.x, f.z) + 1.5, f.z]} />
        ))}
      </RigidBody>
    </>
  );
}
