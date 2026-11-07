// bounds: ball r=BALL_R (origin at ground contact; the ball centre is at y=BALL_R)
"use client";

import type { Ref } from "react";
import * as THREE from "three";
import { BallCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { C } from "../../palette";
import { sweepable } from "../../carState";
import { geo, mat, type GroupProps } from "./shared";

/**
 * The ball's radius. It was 0.35 m, a beach ball two fifths of the goal's height; a real size-5 ball
 * is 0.11 m, which at the world's 2/3 (scale.ts) would be a speck from the chase camera. At 0.16 m it
 * stands a sixth of the 1.8 m goal and two thirds of a TH-18 tyre: a football next to the cars.
 */
export const BALL_R = 0.16;
/**
 * The ball's physics. A real ball is 0.45 kg against the car's ~750: in the game's masses (the car is
 * 2.5, a cone 0.25) that's about 0.1, light enough to fly off the car's nose, heavy enough to stay
 * stable. Bouncy, grippy enough to roll rather than slide, a little drag so it stops on the grass.
 */
export const BALL = { mass: 0.1, restitution: 0.6, friction: 0.8, linearDamping: 0.25, angularDamping: 0.4 };

function ballGeo() {
  return geo("football", () => {
    // A real truncated icosahedron, painted onto a smooth sphere: each sphere face
    // takes the color of the polyhedron face its direction hits (max n.m / d).
    // Pentagons (12, at the icosahedron's vertices) are black, hexagons (20) white,
    // and faces right on a boundary become a soft grey seam.
    const ico = new THREE.IcosahedronGeometry(1, 0);
    const p = ico.getAttribute("position");
    const verts: THREE.Vector3[] = [];
    const planes: { n: THREE.Vector3; d: number; pent: boolean }[] = [];
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i).normalize();
      if (!verts.some((u) => u.distanceToSquared(v) < 1e-6)) verts.push(v);
    }
    const near = verts[0].dot(verts.find((u, i) => i > 0 && u.dot(verts[0]) > 0.3)!);
    const cut = (a: THREE.Vector3, b: THREE.Vector3) => a.clone().multiplyScalar(2).add(b).divideScalar(3);
    for (const v of verts) {
      const u = verts.find((w) => Math.abs(w.dot(v) - near) < 1e-3)!;
      planes.push({ n: v, d: v.dot(cut(v, u)), pent: true });
    }
    for (let f = 0; f < p.count; f += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(p, f).normalize();
      const b = new THREE.Vector3().fromBufferAttribute(p, f + 1).normalize();
      const c = new THREE.Vector3().fromBufferAttribute(p, f + 2).normalize();
      const n = a.clone().add(b).add(c).normalize();
      planes.push({ n, d: n.dot(cut(a, b)), pent: false });
    }
    const g = new THREE.IcosahedronGeometry(BALL_R, 6); // low enough to read faceted
    const pos = g.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const black = new THREE.Color(C.ink);
    const white = new THREE.Color(C.paper);
    const seam = new THREE.Color(C.concreteDark);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let f = 0; f < pos.count; f += 3) {
      a.fromBufferAttribute(pos, f);
      b.fromBufferAttribute(pos, f + 1);
      c.fromBufferAttribute(pos, f + 2);
      const m = a.add(b).add(c).normalize();
      let s1 = -9;
      let s2 = -9;
      let pent = false;
      let pent2 = false;
      for (const pl of planes) {
        const s = pl.n.dot(m) / pl.d;
        if (s > s1) {
          s2 = s1;
          pent2 = pent;
          s1 = s;
          pent = pl.pent;
        } else if (s > s2) {
          s2 = s;
          pent2 = pl.pent;
        }
      }
      // grey seam only between two white hexagons
      const col = pent ? black : !pent2 && s1 - s2 < 0.006 ? seam : white;
      for (let k = 0; k < 3; k++) col.toArray(colors, (f + k) * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.translate(0, BALL_R, 0);
    return g;
  });
}

/** Ink and paper football, r=BALL_R, faceted, matte. */
export function Football(props: GroupProps) {
  return (
    <group {...props}>
      <mesh geometry={ballGeo()} material={mat("#ffffff", { r: 0.6, vc: true, flat: true })} castShadow receiveShadow />
    </group>
  );
}

/**
 * A football that plays: a dynamic sphere (continuous collision, so a fast car can't skip it) that the
 * car's sweeper kicks (carState `sweepable`, Vehicle.tsx SWEEP_CLEAR). `position` is its centre.
 */
export function FootballBody({ ref, position }: { ref?: Ref<RapierRigidBody>; position: [number, number, number] }) {
  return (
    <RigidBody ref={ref} colliders={false} position={position} ccd softCcdPrediction={0.5} linearDamping={BALL.linearDamping} angularDamping={BALL.angularDamping}>
      <BallCollider
        ref={(c) => {
          if (!c) return;
          const h = c.handle;
          sweepable.add(h);
          return () => {
            sweepable.delete(h);
          };
        }}
        args={[BALL_R]}
        mass={BALL.mass}
        friction={BALL.friction}
        restitution={BALL.restitution}
      />
      <group position={[0, -BALL_R, 0]}>
        <Football />
      </group>
    </RigidBody>
  );
}
