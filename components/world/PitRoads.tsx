"use client";

// Pit entry and exit: two short lanes that peel off the inside of the last corner
// into the pit lane and rejoin on the inside of T1, a paper line along both edges from
// where they leave the track's edge (no paint on the track itself), and PIT IN / PIT OUT boards. Visual only; the car drives on the
// terrain under them, which is level here.
import { useMemo } from "react";
import * as THREE from "three";
import { C } from "./palette";
import { PIT, TRACK_WIDTH, nearestT, pitRoadCurves, trackPoint } from "./layout";
import { EXTENT, GRID, heightAt } from "./terrain";
import { pitAsphalt, roadPaint } from "./Island";
import { Label } from "./models/props/Label";


/** The nearest point on the lap, refined between `nearestT`'s samples (steps there showed as notches in the lines). */
function nearestRoad(x: number, z: number) {
  const { t } = nearestT(x, z);
  let best = { y: 0, dist: Infinity };
  for (let k = -16; k <= 16; k++) {
    const p = trackPoint(t + k / 6400);
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < best.dist) best = { y: p.y, dist: d };
  }
  return best;
}

function surface(x: number, z: number) {
  const n = nearestRoad(x, z);
  // On the track lie exactly on its ribbon (Island.tsx, 0.03 up): the lane's polygon offset
  // then wins every pixel; elsewhere the terrain is carved to the road height under the lanes.
  if (n.dist < TRACK_WIDTH / 2) return n.y + 0.03;
  // the highest terrain within a grid cell: the terrain's triangles must not poke through at the edges
  const c = EXTENT / GRID;
  let h = n.y;
  for (const [dx, dz] of [[0, 0], [c, 0], [-c, 0], [0, c], [0, -c]]) h = Math.max(h, heightAt(x + dx, z + dz));
  return h + 0.04;
}

/** A flat strip along a lane, [from, to] across it; `keep` drops the samples it rejects (and the quads touching them). */
function strip(curve: THREE.Curve<THREE.Vector3>, from: number, to: number, lift = 0, keep?: (x: number, z: number) => boolean) {
  const N = 80;
  const pos: number[] = [];
  const idx: number[] = [];
  const t0 = new THREE.Vector3();
  let prev = -1;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const p = curve.getPoint(u);
    curve.getTangent(u, t0);
    const nx = -t0.z;
    const nz = t0.x;
    const l = Math.hypot(nx, nz) || 1;
    const m = (from + to) / 2;
    if (keep && !keep(p.x + (nx / l) * m, p.z + (nz / l) * m)) {
      prev = -1;
      continue;
    }
    const k = pos.length / 3;
    for (const o of [from, to]) {
      const x = p.x + (nx / l) * o;
      const z = p.z + (nz / l) * o;
      pos.push(x, surface(x, z) + lift, z);
    }
    if (prev >= 0) idx.push(prev, prev + 1, k, prev + 1, k + 1, k);
    prev = k;
  }
  // Wind every triangle to face up: the lanes go opposite ways, and where a tight bend folds
  // the inner edge over itself, double-sided back faces shaded dark slivers across the road.
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i] * 3, idx[i + 1] * 3, idx[i + 2] * 3];
    const ny = (pos[b + 2] - pos[a + 2]) * (pos[c] - pos[a]) - (pos[b] - pos[a]) * (pos[c + 2] - pos[a + 2]);
    if (ny < 0) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  // flat ground: normals straight up
  g.setAttribute("normal", new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  return g;
}

/** Off the track's asphalt: the lane lines start where the lane leaves the track's edge. */
const offTrack = (x: number, z: number) => nearestRoad(x, z).dist > TRACK_WIDTH / 2 - 0.3;
const LINE = 0.18;
// the lines meet the pit lane's own (Places.tsx `PitLane`, 6 m of asphalt, lines at ±3)
const EDGE = 3;

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
    for (const c of [entry, exit])
      out.push({
        road: strip(c, -EDGE - 0.1, EDGE + 0.1),
        lines: [strip(c, EDGE - LINE / 2, EDGE + LINE / 2, 0.004, offTrack), strip(c, -EDGE - LINE / 2, -EDGE + LINE / 2, 0.004, offTrack)],
      });
    return { out, entry: entry.getPoint(0), exit: exit.getPoint(0) };
  }, []);

  return (
    <group>
      {parts.out.map((p, i) => (
        <group key={i}>
          <mesh geometry={p.road} receiveShadow>
            <primitive object={pitAsphalt} attach="material" />
          </mesh>
          {p.lines.map((g, j) => (
            <mesh key={j} geometry={g} material={roadPaint} />
          ))}
        </group>
      ))}
      <Board x={parts.entry.x + 4} z={PIT.z - 6} text="PIT IN" rot={0} />
      <Board x={parts.exit.x - 4} z={PIT.z - 6} text="PIT OUT" rot={0} />
    </group>
  );
}
