// Static. Mouth 4 m wide x 1.8 m tall, 1.5 m deep, opening faces +Z.
// Colliders (post radius 0.08):
//   front posts: (+-2.0, 0.9, 0.75) capsules h=1.8      crossbar: (0, 1.8, 0.75) along X, length 4
//   back posts:  (+-2.0, 0.6, -0.75) capsules h=1.2      back ground bar: (0, 0.05, -0.75) along X
//   net: back wall cuboid 4 x 1.2 x 0.05 at (0, 0.6, -0.75); side walls 0.05 x 1.5 x 1.5 at (+-2, 0.75, 0)
"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { geo, mat, unitBox, type GroupProps } from "./shared";

const W = 4;
const H = 1.8;
const D = 1.5;
const HB = 1.2; // back height
const PR = 0.08;
const ZF = D / 2;
const ZB = -D / 2;

function barGeo(len: number) {
  return geo(`goal-bar-${len}`, () => new THREE.CapsuleGeometry(PR, len, 4, 14));
}

/** Bar between two points (capsule). */
function Bar({ a, b, m }: { a: THREE.Vector3Tuple; b: THREE.Vector3Tuple; m: THREE.Material }) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return <mesh geometry={barGeo(Math.round(len * 100) / 100)} position={mid} quaternion={q} material={m} castShadow receiveShadow />;
}

/** Net cords as one instanced mesh of thin boxes. */
function Net() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const cords = useMemo(() => {
    const list: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const step = 0.3;
    // back
    for (let x = -W / 2 + step; x < W / 2 - 0.01; x += step) list.push({ a: v(x, 0, ZB), b: v(x, HB, ZB) });
    for (let y = step; y < HB; y += step) list.push({ a: v(-W / 2, y, ZB), b: v(W / 2, y, ZB) });
    // roof (sloped)
    for (let x = -W / 2 + step; x < W / 2 - 0.01; x += step) list.push({ a: v(x, H, ZF), b: v(x, HB, ZB) });
    for (let t = step / D; t < 1; t += step / D) {
      const y = H + (HB - H) * t;
      const z = ZF + (ZB - ZF) * t;
      list.push({ a: v(-W / 2, y, z), b: v(W / 2, y, z) });
    }
    // sides
    for (const sx of [-W / 2, W / 2]) {
      for (let t = step / D; t < 1; t += step / D) {
        const z = ZF + (ZB - ZF) * t;
        list.push({ a: v(sx, 0, z), b: v(sx, H + (HB - H) * t, z) });
      }
      for (let y = step; y < H; y += step) {
        const zEnd = y <= HB ? ZB : ZF + (ZB - ZF) * ((H - y) / (H - HB));
        list.push({ a: v(sx, y, ZF), b: v(sx, y, zEnd) });
      }
    }
    return list;
  }, []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    cords.forEach(({ a, b }, i) => {
      o.position.copy(a).add(b).multiplyScalar(0.5);
      o.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
      o.scale.set(0.03, a.distanceTo(b), 0.03);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [cords]);
  return (
    <instancedMesh ref={ref} args={[unitBox(), mat(C.white, { r: 0.8 }), cords.length]} castShadow receiveShadow />
  );
}

function sheetGeo() {
  return geo("goal-net-sheet", () => {
    // soft see-through fill: back, roof and two sides as one geometry
    const pos: number[] = [];
    const quad = (a: number[], b: number[], c: number[], d: number[]) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    const L = -W / 2;
    const R = W / 2;
    quad([L, 0, ZB], [R, 0, ZB], [R, HB, ZB], [L, HB, ZB]);
    quad([L, HB, ZB], [R, HB, ZB], [R, H, ZF], [L, H, ZF]);
    for (const x of [L, R]) quad([x, 0, ZF], [x, 0, ZB], [x, HB, ZB], [x, H, ZF]);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  });
}

/** Football goal frame with a cord net. Opening faces +Z. */
export function Goal(props: GroupProps) {
  const white = mat(C.white, { r: 0.45 });
  const back = mat(C.metal, { r: 0.5 });
  return (
    <group {...props}>
      <Bar a={[-W / 2, 0, ZF]} b={[-W / 2, H, ZF]} m={white} />
      <Bar a={[W / 2, 0, ZF]} b={[W / 2, H, ZF]} m={white} />
      <Bar a={[-W / 2, H, ZF]} b={[W / 2, H, ZF]} m={white} />
      <Bar a={[-W / 2, HB, ZB]} b={[-W / 2, H, ZF]} m={back} />
      <Bar a={[W / 2, HB, ZB]} b={[W / 2, H, ZF]} m={back} />
      <Bar a={[-W / 2, 0, ZB]} b={[-W / 2, HB, ZB]} m={back} />
      <Bar a={[W / 2, 0, ZB]} b={[W / 2, HB, ZB]} m={back} />
      <Bar a={[-W / 2, 0.02, ZB]} b={[W / 2, 0.02, ZB]} m={back} />
      <Bar a={[-W / 2, 0.02, ZF]} b={[-W / 2, 0.02, ZB]} m={back} />
      <Bar a={[W / 2, 0.02, ZF]} b={[W / 2, 0.02, ZB]} m={back} />
      <Net />
      <mesh geometry={sheetGeo()} material={mat(C.white, { o: 0.18, side: THREE.DoubleSide })} />
      {/* white goal line and six-yard box hint on the grass */}
      <mesh geometry={unitBox()} scale={[W + 0.4, 0.02, 0.1]} position={[0, 0.01, ZF]} material={mat(C.white, { r: 0.8 })} receiveShadow />
    </group>
  );
}
