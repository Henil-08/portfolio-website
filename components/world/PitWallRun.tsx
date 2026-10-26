"use client";

// The pit wall between the pit lane and the main straight, in the W04 language: a
// concrete wall (wide foot, slim upright) with a paper stripe along the top, and a tall
// ink debris fence on ink posts above it. Each end stops on a short TecPro stack.
// The line is layout.ts `PIT_WALL` (halfway between the lane and the straight).
import { useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as THREE from "three";
import { PIT, PIT_WALL } from "./layout";
import { heightAt } from "./terrain";
import { geo, unitBox } from "./models/props/shared";
import { compose } from "./street/common";
import { Instances } from "./street/Instances";
import { K, WALL_FOOT, WALL_H, debrisFenceMat, km, wallGeo } from "./street/ink";

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

const endGeo = () => geo("pitwall-tecpro", () => new RoundedBoxGeometry(0.8, 0.8, 1.0, 2, 0.12));

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
    stripe.m.push(compose(mx, y + WALL_H, mz, yaw, len + 0.02, 0.06, 0.205));
    rails.m.push(compose(mx, y + FENCE_TOP, mz, yaw, len + 0.02, 0.05, 0.05));
    // posts every POST_EVERY m along the line
    while (next <= acc + len) {
      const t = (next - acc) / len;
      posts.m.push(compose(a.x + (b.x - a.x) * t, y + (WALL_H + FENCE_TOP) / 2, a.z + (b.z - a.z) * t, yaw, 0.08, FENCE_TOP - WALL_H + 0.05, 0.08));
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

/** The fence mesh: one ribbon from the wall top to the top rail. */
function fenceGeometry() {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let acc = 0;
  pts.forEach((p, i) => {
    if (i > 0) acc += p.distanceTo(pts[i - 1]);
    pos.push(p.x, p.y + WALL_H + 0.05, p.z, p.x, p.y + FENCE_TOP, p.z);
    uv.push(acc / 0.5, 0, acc / 0.5, (FENCE_TOP - WALL_H) / 0.5);
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
  const fence = useMemo(() => ({ g: fenceGeometry(), m: debrisFenceMat() }), []);
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
