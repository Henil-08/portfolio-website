"use client";

// The park's footbridge: a low wooden arch over the river (Bruno's park has a
// couple of small wooden bridges between its islands). Planks, posts and a rail,
// and colliders along the deck so the car can drive over it.
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { mat, unitBox } from "../models/props/shared";
import { heightAt } from "../terrain";
import { compose } from "../street/common";
import { Instances } from "../street/Instances";
import { FOOTBRIDGES } from "./layout";
import { BUSHES } from "./bushes";
import { Bush } from "../models/props";


const WOOD = "#a47c58";
const ARCH = 0.55;
const SEG = 6; // collider pieces along the deck

const B = (() => {
  const planks = { m: [] as THREE.Matrix4[] };
  const rails = { m: [] as THREE.Matrix4[] };
  const cols: { x: number; y: number; z: number; yaw: number; pitch: number; len: number; w: number }[] = [];
  for (const b of FOOTBRIDGES) {
    const yaw = Math.atan2(-b.dz, b.dx);
    const ex0 = b.x - (b.dx * b.len) / 2;
    const ez0 = b.z - (b.dz * b.len) / 2;
    const ex1 = b.x + (b.dx * b.len) / 2;
    const ez1 = b.z + (b.dz * b.len) / 2;
    const base = Math.max(heightAt(ex0, ez0), heightAt(ex1, ez1)) + 0.1;
    const yAt = (t: number) => base + ARCH * Math.sin(Math.PI * t);
    const pos = (t: number, side = 0) => [ex0 + (ex1 - ex0) * t - b.dz * side, ez0 + (ez1 - ez0) * t + b.dx * side] as const;
    const n = Math.round(b.len / 0.32);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const [x, z] = pos(t);
      const slope = Math.atan2(ARCH * Math.PI * Math.cos(Math.PI * t), b.len);
      planks.m.push(compose(x, yAt(t), z, yaw, 0.28, 0.1, b.width, 0, slope));
    }
    for (const side of [-1, 1]) {
      const off = side * (b.width / 2 - 0.08);
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        const [x, z] = pos(t, off);
        rails.m.push(compose(x, yAt(t) + 0.5, z, yaw, 0.13, 1.0, 0.13));
      }
      for (let k = 0; k < 6; k++) {
        const t0 = k / 6;
        const t1 = (k + 1) / 6;
        const [x0, z0] = pos(t0, off);
        const [x1, z1] = pos(t1, off);
        const len = Math.hypot(x1 - x0, z1 - z0, yAt(t1) - yAt(t0));
        const pitch = Math.atan2(yAt(t1) - yAt(t0), Math.hypot(x1 - x0, z1 - z0));
        rails.m.push(compose((x0 + x1) / 2, (yAt(t0) + yAt(t1)) / 2 + 0.98, (z0 + z1) / 2, yaw, len + 0.04, 0.1, 0.11, 0, pitch));
      }
    }
    for (let k = 0; k < SEG; k++) {
      const t0 = k / SEG;
      const t1 = (k + 1) / SEG;
      const [x0, z0] = pos(t0);
      const [x1, z1] = pos(t1);
      const run = Math.hypot(x1 - x0, z1 - z0);
      cols.push({
        x: (x0 + x1) / 2,
        y: (yAt(t0) + yAt(t1)) / 2 - 0.04,
        z: (z0 + z1) / 2,
        yaw,
        pitch: Math.atan2(yAt(t1) - yAt(t0), run),
        len: Math.hypot(run, yAt(t1) - yAt(t0)),
        w: b.width,
      });
    }
  }
  return { planks, rails, cols };
})();

export default function Park() {
  return (
    <>
      <Instances geometry={unitBox()} material={mat(WOOD, { r: 0.8 })} batch={B.planks} />
      <Instances geometry={unitBox()} material={mat("#7d5c40", { r: 0.8 })} batch={B.rails} />
      <RigidBody type="fixed" colliders={false} friction={0.8}>
        {B.cols.map((c, i) => (
          <CuboidCollider key={i} args={[c.len / 2 + 0.05, 0.06, c.w / 2]} position={[c.x, c.y, c.z]} rotation={[0, c.yaw, c.pitch]} />
        ))}
      </RigidBody>
      {BUSHES.map((b, i) => (
        <Bush key={`bush${i}`} seed={b.seed} position={[b.x, heightAt(b.x, b.z), b.z]} rotation={[0, b.rot, 0]} scale={b.s} />
      ))}
    </>
  );
}
