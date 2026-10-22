// bounds: ball r=0.35 (origin at ground contact; the ball center is at y=0.35)
"use client";

import * as THREE from "three";
import { C } from "../../palette";
import { geo, mat, type GroupProps } from "./shared";

export const BALL_R = 0.35;

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
    const g = new THREE.IcosahedronGeometry(BALL_R, 14);
    const pos = g.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const black = new THREE.Color(C.charcoal);
    const white = new THREE.Color(C.white);
    const seam = new THREE.Color(C.greyLight);
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

/** Classic black and white football, r=0.35, glossy match-ball finish. */
export function Football(props: GroupProps) {
  return (
    <group {...props}>
      <mesh geometry={ballGeo()} material={mat(C.white, { r: 0.32, vc: true })} castShadow receiveShadow />
    </group>
  );
}
