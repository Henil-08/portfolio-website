"use client";

// The start by the name, in Concrete & Ink (positions in ./start.ts): two concrete troughs of
// grasses (the kit's approved concept) framing the path behind the car (no tree:
// nothing tall may hide the car at spawn), faceted bushes, the district bench, and strips
// of grasses with paper blooms. The way to the circuit
// is a garden path (garden/layout.ts).
import { useMemo } from "react";
import * as THREE from "three";
import { Bush } from "./models/props";
import { WORLD_SCALE } from "./scale";
import { mat, unitBox } from "./models/props/shared";
import { grassGeo } from "./garden";
import { withWind } from "./alive/sway";
import { benchParts } from "./districts/furniture";
import { compose, rng } from "./street/common";
import { Instances } from "./street/Instances";
import { Movables, kindFromMatrices } from "./Movables";
import { heightAt } from "./terrain";
import { KitInstances } from "./kit/KitModel";
import { grassesModel } from "./kit/nature";
import { C } from "./palette";
import { START_BENCH, START_BUSHES, START_FLOWERS, START_PLANTERS } from "./start";
import ScaleLineup from "./ScaleLineup";

const BLOOMS = [C.paper, C.paper, C.cream, C.concrete].map((c) => new THREE.Color(c));
const GRASSES = ["#8b9270", C.leaf, "#8b9270"].map((c) => new THREE.Color(c));

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
    // the planters: the kit grasses trough (the approved concept), at the world's scale
    const planters = { m: START_PLANTERS.map(([px, pz]) => compose(px, heightAt(px, pz), pz, 0, WORLD_SCALE, WORLD_SCALE, WORLD_SCALE)) };
    const b = START_BENCH;
    const bench = { m: [compose(b.x, heightAt(b.x, b.z), b.z, b.yaw)] };
    const benchKind = kindFromMatrices(bench.m, benchParts(), { mass: 0.6 });
    return { grasses, blooms, planters, benchKind };
  }, []);
  return (
    <group name="start-garden">
      <KitInstances model={grassesModel()} batch={parts.planters} />
      {START_BUSHES.map(([x, z, s], i) => (
        <Bush key={i} seed={30 + i} position={[x, heightAt(x, z), z]} scale={s} rotation={[0, i * 1.7, 0]} />
      ))}
      <Movables kind={parts.benchKind} />
      <Instances geometry={grassGeo()} material={withWind(mat("#ffffff", { r: 0.9, flat: true }), { amount: 0.25, maxHeight: 0.9 })} batch={parts.grasses} shadow={false} />
      <Instances geometry={unitBox()} material={mat("#ffffff", { r: 0.8 })} batch={parts.blooms} shadow={false} />
      {/* dev only: window.__lineup() (./ScaleLineup.tsx) */}
      {process.env.NODE_ENV !== "production" && <ScaleLineup />}
    </group>
  );
}
