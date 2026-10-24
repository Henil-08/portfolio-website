"use client";

// Pit entry and exit: two short lanes that peel off the inside of the last corner
// into the pit lane and rejoin on the inside of T1, each with a solid white line
// on its track side, and PIT IN / PIT OUT boards. Visual only; the car drives on the
// terrain under them, which is level here.
import { useMemo } from "react";
import * as THREE from "three";
import { C } from "./palette";
import { PIT, PIT_LANE_WIDTH as LANE, TRACK_WIDTH, nearestT, pitRoadCurves, trackPoint } from "./layout";
import { heightAt } from "./terrain";
import { Label } from "./models/props/Label";


function surface(x: number, z: number) {
  const n = nearestT(x, z);
  // On the asphalt sit on the road; elsewhere the terrain is carved to the road height under the lanes.
  if (n.dist < TRACK_WIDTH / 2 + 0.3) return trackPoint(n.t).y + 0.015;
  return Math.max(heightAt(x, z), trackPoint(n.t).y) + 0.04;
}

function strip(curve: THREE.Curve<THREE.Vector3>, from: number, to: number, lift = 0) {
  const N = 40;
  const pos: number[] = [];
  const idx: number[] = [];
  const t0 = new THREE.Vector3();
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const p = curve.getPoint(u);
    curve.getTangent(u, t0);
    const nx = -t0.z;
    const nz = t0.x;
    const l = Math.hypot(nx, nz) || 1;
    for (const o of [from, to]) {
      const x = p.x + (nx / l) * o;
      const z = p.z + (nz / l) * o;
      pos.push(x, surface(x, z) + lift, z);
    }
    if (i < N) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  // flat ground: normals straight up whichever way the lane winds (computed ones
  // pointed down on the exit lane and shaded it dark)
  g.setAttribute("normal", new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  // both windings render: the lanes go opposite ways
  return g;
}

function Board({ x, z, text, rot }: { x: number; z: number; text: string; rot: number }) {
  const y = heightAt(x, z);
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.12, 2.4, 0.12]} />
        <meshStandardMaterial color={C.charcoal} />
      </mesh>
      <mesh position={[0, 2.3, 0.08]} castShadow>
        <boxGeometry args={[2.4, 0.9, 0.08]} />
        <meshStandardMaterial color={C.red} roughness={0.45} />
      </mesh>
      <Label position={[0, 2.3, 0.13]} fontSize={0.42} color={C.white} letterSpacing={0.08}>
        {text}
      </Label>
    </group>
  );
}

export default function PitRoads() {
  const parts = useMemo(() => {
    const [entry, exit] = pitRoadCurves();
    const out: { road: THREE.BufferGeometry; lines: THREE.BufferGeometry[] }[] = [];
    // One solid white line on the track side of each lane: it leaves the racing line where
    // the lane peels off and runs on as the lane's edge (entry +n is the track side, exit -n).
    out.push({ road: strip(entry, -LANE / 2, LANE / 2), lines: [strip(entry, LANE / 2 - 0.2, LANE / 2, 0.004)] });
    out.push({ road: strip(exit, -LANE / 2, LANE / 2), lines: [strip(exit, -LANE / 2, -LANE / 2 + 0.2, 0.004)] });
    return { out, entry: entry.getPoint(0), exit: exit.getPoint(0) };
  }, []);

  return (
    <group>
      {parts.out.map((p, i) => (
        <group key={i}>
          <mesh geometry={p.road} receiveShadow>
            <meshStandardMaterial color={C.asphalt} roughness={0.9} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-2} />
          </mesh>
          {p.lines.map((g, j) => (
            <mesh key={j} geometry={g}>
              <meshStandardMaterial color={C.asphaltLine} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-4} />
            </mesh>
          ))}
        </group>
      ))}
      <Board x={parts.entry.x + 4} z={PIT.z - 6} text="PIT IN" rot={0} />
      <Board x={parts.exit.x - 4} z={PIT.z - 6} text="PIT OUT" rot={0} />
    </group>
  );
}
