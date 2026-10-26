"use client";

// The start by the name, in Concrete & Ink (positions in ./start.ts): two low square
// concrete planters of gravel and tall grasses framing the path behind the car (no tree:
// nothing tall may hide the car at spawn), faceted bushes, the district bench, and strips
// of grasses with paper blooms. The way to the circuit
// is a garden path (garden/layout.ts).
import { useMemo } from "react";
import * as THREE from "three";
import { Bush } from "./models/props";
import { PROP_SCALE } from "./models/props/kit";
import { mat, unitBox } from "./models/props/shared";
import { grassGeo } from "./garden";
import { withWind } from "./alive/sway";
import { benchGeo } from "./districts/furniture";
import { compose, rng } from "./street/common";
import { Instances } from "./street/Instances";
import { Movables, kindFromMatrices } from "./Movables";
import { heightAt } from "./terrain";
import { C } from "./palette";
import { START_BENCH, START_BUSHES, START_FLOWERS, START_PLANTERS } from "./start";

const BLOOMS = [C.paper, C.paper, C.cream, C.concrete].map((c) => new THREE.Color(c));
const GRASSES = ["#8b9270", C.leaf, "#8b9270"].map((c) => new THREE.Color(c));
const SURROUND = 1.6; // planter, outer size (m)
const WALL = 0.16;

export default function StartGarden() {
  const parts = useMemo(() => {
    const r = rng(77);
    const grasses = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
    const blooms = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
    for (const [x, z] of START_FLOWERS) {
      for (let j = 0; j < 9; j++) {
        const fx = x + (r() - 0.5) * 2.2;
        const fz = z + (r() - 0.5) * 1.2;
        const h = 0.4 + r() * 0.35;
        grasses.m.push(compose(fx, heightAt(fx, fz), fz, r() * 6, 0.05, h, 0.05));
        grasses.c.push(GRASSES[Math.floor(r() * GRASSES.length)]);
      }
      for (let j = 0; j < 4; j++) {
        const fx = x + (r() - 0.5) * 2;
        const fz = z + (r() - 0.5) * 1;
        const s = 0.07 + r() * 0.03;
        blooms.m.push(compose(fx, heightAt(fx, fz) + 0.35 + r() * 0.15, fz, r() * 6, s, s, s));
        blooms.c.push(BLOOMS[Math.floor(r() * BLOOMS.length)]);
      }
    }
    // the planters: four low concrete walls round a gravel square, grasses in it
    const walls = { m: [] as THREE.Matrix4[] };
    const gravel = { m: [] as THREE.Matrix4[] };
    const h = SURROUND / 2 - WALL / 2;
    const inner = SURROUND - WALL * 2;
    for (const [px, pz] of START_PLANTERS) {
      const py = heightAt(px, pz);
      for (const [dx, dz, sx, sz] of [
        [0, -h, SURROUND, WALL],
        [0, h, SURROUND, WALL],
        [-h, 0, WALL, inner],
        [h, 0, WALL, inner],
      ])
        walls.m.push(compose(px + dx, py + 0.12, pz + dz, 0, sx, 0.3, sz));
      gravel.m.push(compose(px, py + 0.2, pz, 0, inner, 0.02, inner));
      for (let j = 0; j < 14; j++) {
        const gx = px + (r() - 0.5) * (inner - 0.15);
        const gz = pz + (r() - 0.5) * (inner - 0.15);
        grasses.m.push(compose(gx, py + 0.2, gz, r() * 6, 0.05, 0.5 + r() * 0.35, 0.05));
        grasses.c.push(GRASSES[Math.floor(r() * GRASSES.length)]);
      }
    }
    const k = 0.72 * PROP_SCALE;
    const b = START_BENCH;
    const bench = { m: [compose(b.x, heightAt(b.x, b.z) + 0.78 * k, b.z, b.yaw, k, k, k)] };
    const benchKind = kindFromMatrices(bench.m, [{ geometry: benchGeo(), material: mat("#ffffff", { r: 0.8, vc: true }) }], { mass: 0.6 });
    return { grasses, blooms, walls, gravel, benchKind };
  }, []);
  return (
    <group name="start-garden">
      <Instances geometry={unitBox()} material={mat(C.concrete, { r: 0.9 })} batch={parts.walls} />
      <Instances geometry={unitBox()} material={mat(C.gravel, { r: 1 })} batch={parts.gravel} shadow={false} />
      {START_BUSHES.map(([x, z, s], i) => (
        <Bush key={i} seed={30 + i} position={[x, heightAt(x, z), z]} scale={s} rotation={[0, i * 1.7, 0]} />
      ))}
      <Movables kind={parts.benchKind} />
      <Instances geometry={grassGeo()} material={withWind(mat("#ffffff", { r: 0.9, flat: true }), { amount: 0.25, maxHeight: 0.9 })} batch={parts.grasses} shadow={false} />
      <Instances geometry={unitBox()} material={mat("#ffffff", { r: 0.8 })} batch={parts.blooms} shadow={false} />
    </group>
  );
}
