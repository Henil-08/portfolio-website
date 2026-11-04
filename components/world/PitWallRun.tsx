"use client";

// The pit wall between the pit lane and the main straight, after the approved concept
// (pitwall): a concrete wall (wide foot, slim upright) under a paper cap, and a tall fence of
// ink bars on ink posts above it, kinked toward the track at the top. Each end stops on a
// short TecPro stack. The booths stand on the lane side (models/props/PitWall.tsx).
// The line is layout.ts `PIT_WALL` (halfway between the lane and the straight).
import { useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { PIT, PIT_WALL } from "./layout";
import { heightAt } from "./terrain";
import { geo, unitBox } from "./models/props/shared";
import { compose } from "./street/common";
import { Instances } from "./street/Instances";
import { K, WALL_FOOT, WALL_H, km, wallGeo } from "./street/ink";
import { bm, cboxGeo } from "./kit/builtShared";

const WALL_W = WALL_FOOT; // collider depth
const FENCE_TOP = 4.4;
const POST_EVERY = 2.5; // m
const CHUNK = 6; // points per collider

// one level for the whole wall (the pit straight is flat; sampling each point made it step)
const Y = heightAt((PIT.from + PIT.to) / 2, PIT.z);
const pts = PIT_WALL.map(([x, z]) => new THREE.Vector3(x, Y, z));
const yawAt = (i: number) => {
  const a = pts[Math.max(0, i - 1)];
  const b = pts[Math.min(pts.length - 1, i + 1)];
  return Math.atan2(-(b.z - a.z), b.x - a.x);
};

const KINK = 0.45; // the fence's top bends this far toward the track
const KINK_H = 0.5;
const endGeo = () => geo("pitwall-tecpro-v2", () => cboxGeo(0.8, 0.8, 1.0, 0.14));

const B = (() => {
  const wall = { m: [] as THREE.Matrix4[] };
  const stripe = { m: [] as THREE.Matrix4[] };
  const posts = { m: [] as THREE.Matrix4[] };
  const rails = { m: [] as THREE.Matrix4[] };
  const ends = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  let acc = 0;
  let next = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = a.distanceTo(b);
    const yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const y = (a.y + b.y) / 2;
    wall.m.push(compose(mx, y, mz, yaw, len + 0.02, 1, 1));
    stripe.m.push(compose(mx, y + WALL_H - 0.12, mz, yaw, len + 0.02, 0.3, 0.24));
    rails.m.push(compose(mx, y + FENCE_TOP, mz, yaw, len + 0.02, 0.05, 0.05));
    // toward the track: local +z of the segment
    const tx = Math.sin(yaw) * KINK, tz = Math.cos(yaw) * KINK;
    rails.m.push(compose(mx + tx, y + FENCE_TOP + KINK_H, mz + tz, yaw, len + 0.02, 0.05, 0.05));
    // posts every POST_EVERY m along the line
    while (next <= acc + len) {
      const t = (next - acc) / len;
      const px = a.x + (b.x - a.x) * t, pz = a.z + (b.z - a.z) * t;
      posts.m.push(compose(px, y + (WALL_H + FENCE_TOP) / 2, pz, yaw, 0.08, FENCE_TOP - WALL_H + 0.05, 0.08));
      const kl = Math.hypot(KINK, KINK_H);
      posts.m.push(compose(px + tx / 2, y + FENCE_TOP + KINK_H / 2, pz + tz / 2, yaw, 0.07, kl, 0.07, Math.atan2(KINK, KINK_H)));
      next += POST_EVERY;
    }
    acc += len;
  }
  // a two-high TecPro stack across each end, ink under paper, the top one orange at the far end
  const cols = [new THREE.Color(K.ink), new THREE.Color(K.paper), new THREE.Color(K.orange)];
  [0, pts.length - 1].forEach((i, e) => {
    const p = pts[i];
    const dir = e ? 1 : -1;
    const yaw = yawAt(i);
    const off = 0.5;
    const x = p.x + Math.cos(yaw) * off * dir;
    const z = p.z - Math.sin(yaw) * off * dir;
    for (let k = 0; k < 2; k++) {
      ends.m.push(compose(x, p.y + 0.4 + k * 0.8, z, yaw));
      ends.c.push(cols[k === 1 && e === 1 ? 2 : k]);
    }
  });
  return { wall, stripe, posts, rails, ends };
})();

/** The fence mesh: a ribbon of bars from the wall top to the top rail, then the kinked top. */
function fenceGeometry() {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const BAR = 0.09; // bar spacing, m
  let acc = 0;
  pts.forEach((p, i) => {
    if (i > 0) acc += p.distanceTo(pts[i - 1]);
    const yaw = yawAt(i);
    const kx = Math.sin(yaw) * KINK, kz = Math.cos(yaw) * KINK;
    pos.push(p.x, p.y + WALL_H + 0.05, p.z, p.x, p.y + FENCE_TOP, p.z, p.x + kx, p.y + FENCE_TOP + KINK_H, p.z + kz);
    const v1 = (FENCE_TOP - WALL_H) / BAR;
    uv.push(acc / BAR, 0, acc / BAR, v1, acc / BAR, v1 + Math.hypot(KINK, KINK_H) / BAR);
    if (i > 0) {
      const k = (i - 1) * 3;
      idx.push(k, k + 3, k + 1, k + 1, k + 3, k + 4, k + 1, k + 4, k + 2, k + 2, k + 4, k + 5);
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
  const fence = useMemo(() => ({ g: fenceGeometry(), m: bm("bars") }), []);
  if (pts.length < 2) return null;
  return (
    <group name="pit-wall">
      <Instances geometry={wallGeo()} material={km.concrete()} batch={B.wall} />
      <Instances geometry={unitBox()} material={km.paper()} batch={B.stripe} shadow={false} />
      <Instances geometry={unitBox()} material={km.ink()} batch={B.posts} />
      <Instances geometry={unitBox()} material={km.ink()} batch={B.rails} shadow={false} />
      <Instances geometry={endGeo()} material={km.painted()} batch={B.ends} />
      <mesh geometry={fence.g} material={fence.m} />
      <RigidBody type="fixed" colliders={false}>
        {COLLIDERS.map((c, i) => (
          <CuboidCollider key={i} args={[c.half, WALL_H / 2, WALL_W / 2]} position={[c.x, c.y + WALL_H / 2, c.z]} rotation={[0, c.yaw, 0]} />
        ))}
        {B.ends.m.filter((_, i) => i % 2 === 0).map((m, i) => {
          const p = new THREE.Vector3().setFromMatrixPosition(m);
          return <CuboidCollider key={`e${i}`} args={[0.4, 0.8, 0.5]} position={[p.x, p.y + 0.4, p.z]} rotation={[0, yawAt(i ? pts.length - 1 : 0), 0]} />;
        })}
      </RigidBody>
    </group>
  );
}
