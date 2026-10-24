"use client";

// Draws the lane from the start to the pit exit (./access.ts): plain asphalt
// and soft chevrons every few metres pointing toward the circuit.
// Visual only; the car drives on the level terrain under it.
import { useMemo } from "react";
import * as THREE from "three";
import { C } from "./palette";
import { heightAt } from "./terrain";
import { ACCESS_WIDTH, accessCurve } from "./access";
import { compose } from "./street/common";
import { Instances } from "./street/Instances";

const N = 90;

function strip(from: number, to: number, lift: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  const t = new THREE.Vector3();
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const p = accessCurve.getPointAt(u);
    accessCurve.getTangentAt(u, t);
    const l = Math.hypot(t.x, t.z) || 1;
    const nx = -t.z / l;
    const nz = t.x / l;
    for (const o of [from, to]) {
      const x = p.x + nx * o;
      const z = p.z + nz * o;
      pos.push(x, heightAt(x, z) + 0.04 + lift, z);
    }
    if (i < N) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A flat chevron pointing along local +x, 1.6 m wide. */
function chevron() {
  const s = new THREE.Shape();
  s.moveTo(0.35, 0);
  s.lineTo(-0.25, 0.8);
  s.lineTo(-0.6, 0.8);
  s.lineTo(0, 0);
  s.lineTo(-0.6, -0.8);
  s.lineTo(-0.25, -0.8);
  s.closePath();
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  return g;
}

export default function AccessRoad() {
  const parts = useMemo(() => {
    const L = accessCurve.getLength();
    const marks = { m: [] as THREE.Matrix4[] };
    const t = new THREE.Vector3();
    for (let d = 6; d < L - 3; d += 6) {
      const u = d / L;
      const p = accessCurve.getPointAt(u);
      accessCurve.getTangentAt(u, t);
      marks.m.push(compose(p.x, heightAt(p.x, p.z) + 0.05, p.z, Math.atan2(-t.z, t.x)));
    }
    const W = ACCESS_WIDTH / 2;
    const chevMat = new THREE.MeshStandardMaterial({ color: C.asphaltLine, transparent: true, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
    return { road: strip(-W, W, 0), marks, chev: chevron(), chevMat };
  }, []);
  return (
    <group name="access-road">
      <mesh geometry={parts.road} receiveShadow>
        <meshStandardMaterial color={C.asphalt} roughness={0.9} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-2} />
      </mesh>
      <Instances
        geometry={parts.chev}
        material={parts.chevMat}
        batch={parts.marks}
        shadow={false}
      />
    </group>
  );
}
