"use client";

// Night-race floodlight towers (Qatar-style): a tall mast set back past the run-off,
// a tilted bank of lamps aimed at the road. No real lights: the banks glow above 1 so
// they bloom, and the tarmac itself is lit evenly at night (Island.tsx `roadLight`).
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { heightAt } from "../terrain";
import { C } from "../palette";
import { dayNight } from "../daynight";
import { geo, mat, unitBox } from "../models/props/shared";
import { compose } from "./common";
import { Instances } from "./Instances";
import { FLOODS } from "./layoutStreet";

const MAST_H = 8;
const TILT = 0.5; // bank aimed down at the road
const BANK_W = 3.2;
const BANK_H = 1.7;
const COLS = 4;
const ROWS = 2;

const mastGeo = () =>
  geo("flood-mast", () => {
    const g = new THREE.CylinderGeometry(0.14, 0.3, MAST_H, 4);
    g.rotateY(Math.PI / 4);
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

/** Floodlight lamp faces: cool white, well above 1 at night. */
const bankMat = new THREE.MeshStandardMaterial({
  color: "#fffaf0",
  emissive: new THREE.Color("#fff3dc"),
  emissiveIntensity: 0.1,
  roughness: 0.25,
  toneMapped: false,
});

const B = (() => {
  const foot = { m: [] as THREE.Matrix4[] };
  const mast = { m: [] as THREE.Matrix4[] };
  const frame = { m: [] as THREE.Matrix4[] };
  const lamp = { m: [] as THREE.Matrix4[] };
  for (const f of FLOODS) {
    const root = compose(f.x, heightAt(f.x, f.z), f.z, f.yaw);
    const at = (parent: THREE.Matrix4, list: THREE.Matrix4[], x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0) =>
      list.push(parent.clone().multiply(compose(x, y, z, 0, sx, sy, sz, rx)));
    at(root, foot.m, 0, 0.3, 0, 1.1, 0.6, 1.1);
    mast.m.push(root.clone());
    // a short yoke on the mast, then the bank tilted down toward the road
    at(root, frame.m, 0, MAST_H - 0.1, 0.25, 0.3, 0.3, 0.5);
    const bank = root.clone().multiply(compose(0, MAST_H + 0.35, 0.55, 0, 1, 1, 1, TILT));
    at(bank, frame.m, 0, 0, 0, BANK_W, BANK_H, 0.22);
    at(bank, frame.m, 0, BANK_H / 2 + 0.06, 0.1, BANK_W + 0.1, 0.1, 0.42); // hood
    const cw = BANK_W / COLS;
    const rh = BANK_H / ROWS;
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++)
        at(bank, lamp.m, -BANK_W / 2 + cw * (c + 0.5), -BANK_H / 2 + rh * (r + 0.5), 0.13, cw - 0.14, rh - 0.14, 0.06);
  }
  return { foot, mast, frame, lamp };
})();

export function Floodlights() {
  useFrame(() => {
    const n = dayNight.night;
    lensMat.emissiveIntensity = 0.08 + n * 4.2;
    bankMat.emissiveIntensity = 0.1 + n * 6;
  });
  return (
    <>
      <Instances geometry={unitBox()} material={mat(C.charcoal, { r: 0.6 })} batch={B.foot} />
      <Instances geometry={mastGeo()} material={mat(C.white, { r: 0.4, m: 0.2 })} batch={B.mast} />
      <Instances geometry={unitBox()} material={mat(C.ink, { r: 0.4, m: 0.3 })} batch={B.frame} />
      <Instances geometry={unitBox()} material={bankMat} batch={B.lamp} shadow={false} />
      <RigidBody type="fixed" colliders={false}>
        {FLOODS.map((f, i) => (
          <CylinderCollider key={i} args={[1.5, 0.45]} position={[f.x, heightAt(f.x, f.z) + 1.5, f.z]} />
        ))}
      </RigidBody>
    </>
  );
}
