"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { heightAt } from "../terrain";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { C } from "../palette";
import { geo, mat } from "../models/props/shared";
import { BARRIER_D, BARRIER_H, compose } from "./common";
import { Instances, batch } from "./Instances";
import { BLOCK, BLOCKS, CHUNKS } from "./layoutStreet";

const blockGeo = () =>
  geo("street-tecpro", () => {
    const g = new RoundedBoxGeometry(BLOCK - 0.08, BARRIER_H, BARRIER_D, 2, 0.07);
    g.translate(0, BARRIER_H / 2, 0);
    return g;
  });
// thin charcoal belt around each block, like the straps on a TecPro module
const strapGeo = () =>
  geo("street-tecpro-strap", () => {
    const g = new THREE.BoxGeometry(BLOCK - 0.2, 0.05, BARRIER_D + 0.02);
    g.translate(0, BARRIER_H * 0.62, 0);
    return g;
  });

const RED = new THREE.Color(C.red);
const WHITE = new THREE.Color(C.white);

const BLOCK_BATCH = (() => {
  const b = batch();
  for (const k of BLOCKS) {
    b.m.push(compose(k.x, heightAt(k.x, k.z), k.z, k.yaw));
    b.c.push(k.k % 2 ? RED : WHITE);
  }
  return b;
})();
const STRAP_BATCH = (() => {
  const b = batch();
  for (const k of BLOCKS) {
    b.m.push(compose(k.x, heightAt(k.x, k.z), k.z, k.yaw));
  }
  return { m: b.m };
})();

export function Barriers() {
  return (
    <>
      <Instances geometry={blockGeo()} material={mat(C.white, { r: 0.42 })} batch={BLOCK_BATCH} />
      <Instances geometry={strapGeo()} material={mat(C.charcoal, { r: 0.55 })} batch={STRAP_BATCH} shadow={false} />
      <RigidBody type="fixed" colliders={false} friction={0.25} restitution={0.35}>
        {CHUNKS.map((c, i) => (
          <CuboidCollider
            key={i}
            args={[c.len / 2, 0.75, BARRIER_D / 2 + 0.05]}
            position={[c.x, heightAt(c.x, c.z) + 0.75, c.z]}
            rotation={[0, c.yaw, 0]}
            friction={0.25}
            restitution={0.35}
          />
        ))}
      </RigidBody>
    </>
  );
}
