"use client";

// The pit wall between the pit lane and the main straight: a low white concrete wall
// with a red cap stripe and a catch fence on top, red crash cushions at both ends.
// The line is layout.ts `PIT_WALL` (halfway between the lane and the straight).
import { useMemo } from "react";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { C } from "./palette";
import { PIT, PIT_WALL } from "./layout";
import { heightAt } from "./terrain";
import { mat, unitBox, unitCyl } from "./models/props/shared";
import { compose } from "./street/common";
import { Instances } from "./street/Instances";
import { makeFenceMat } from "./street/Trackside";

const WALL_H = 1.0;
const WALL_W = 0.5;
const FENCE_TOP = 2.6;
const CHUNK = 6; // points per collider

// one level for the whole wall (the pit straight is flat; sampling each point made it step)
const Y = heightAt((PIT.from + PIT.to) / 2, PIT.z);
const pts = PIT_WALL.map(([x, z]) => new THREE.Vector3(x, Y, z));
const yawAt = (i: number) => {
  const a = pts[Math.max(0, i - 1)];
  const b = pts[Math.min(pts.length - 1, i + 1)];
  return Math.atan2(-(b.z - a.z), b.x - a.x);
};

const B = (() => {
  const wall = { m: [] as THREE.Matrix4[] };
  const cap = { m: [] as THREE.Matrix4[] };
  const posts = { m: [] as THREE.Matrix4[] };
  const rails = { m: [] as THREE.Matrix4[] };
  const cushions = { m: [] as THREE.Matrix4[] };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = a.distanceTo(b);
    const yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const y = (a.y + b.y) / 2;
    wall.m.push(compose(mx, y + WALL_H / 2, mz, yaw, len + 0.02, WALL_H, WALL_W));
    cap.m.push(compose(mx, y + WALL_H - 0.09, mz, yaw, len + 0.02, 0.1, WALL_W + 0.03));
    rails.m.push(compose(mx, y + FENCE_TOP, mz, yaw, len + 0.02, 0.06, 0.06));
  }
  for (let i = 0; i < pts.length; i += 3) {
    const p = pts[i];
    posts.m.push(compose(p.x, p.y + (WALL_H + FENCE_TOP) / 2, p.z, 0, 0.06, FENCE_TOP - WALL_H, 0.06));
  }
  for (const p of [pts[0], pts[pts.length - 1]]) {
    // stacked cushion, red and white bands
    for (let k = 0; k < 3; k++) cushions.m.push(compose(p.x, p.y + 0.17 + k * 0.33, p.z, 0, 0.5, 0.3, 0.5));
  }
  const red = { m: cushions.m.filter((_, i) => i % 3 !== 1) };
  const white = { m: cushions.m.filter((_, i) => i % 3 === 1) };
  return { wall, cap, posts, rails, red, white };
})();

function fenceGeometry() {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let acc = 0;
  pts.forEach((p, i) => {
    if (i > 0) acc += p.distanceTo(pts[i - 1]);
    pos.push(p.x, p.y + WALL_H, p.z, p.x, p.y + FENCE_TOP, p.z);
    uv.push(acc / 0.9, 0, acc / 0.9, (FENCE_TOP - WALL_H) / 0.9);
    if (i > 0) {
      const k = (i - 1) * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const COLLIDERS = (() => {
  const out: { x: number; y: number; z: number; yaw: number; half: number }[] = [];
  for (let i = 0; i < pts.length - 1; i += CHUNK) {
    const a = pts[i];
    const b = pts[Math.min(pts.length - 1, i + CHUNK)];
    out.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, yaw: yawAt(i + CHUNK / 2), half: a.distanceTo(b) / 2 + 0.05 });
  }
  return out;
})();

export default function PitWallRun() {
  const fence = useMemo(() => ({ g: fenceGeometry(), m: makeFenceMat() }), []);
  if (pts.length < 2) return null;
  const ends = [pts[0], pts[pts.length - 1]];
  return (
    <group name="pit-wall">
      <Instances geometry={unitBox()} material={mat(C.greyLight, { r: 0.7 })} batch={B.wall} />
      <Instances geometry={unitBox()} material={mat(C.red, { r: 0.45 })} batch={B.cap} />
      <Instances geometry={unitCyl()} material={mat(C.charcoal, { r: 0.4, m: 0.4 })} batch={B.posts} />
      <Instances geometry={unitBox()} material={mat(C.charcoal, { r: 0.4, m: 0.4 })} batch={B.rails} shadow={false} />
      <Instances geometry={unitCyl()} material={mat(C.red, { r: 0.5 })} batch={B.red} />
      <Instances geometry={unitCyl()} material={mat(C.white, { r: 0.5 })} batch={B.white} />
      <mesh geometry={fence.g} material={fence.m} renderOrder={1} />
      <RigidBody type="fixed" colliders={false}>
        {COLLIDERS.map((c, i) => (
          <CuboidCollider key={i} args={[c.half, WALL_H / 2, WALL_W / 2]} position={[c.x, c.y + WALL_H / 2, c.z]} rotation={[0, c.yaw, 0]} />
        ))}
        {ends.map((p, i) => (
          <CylinderCollider key={`e${i}`} args={[0.5, 0.5]} position={[p.x, p.y + 0.5, p.z]} />
        ))}
      </RigidBody>
    </group>
  );
}
