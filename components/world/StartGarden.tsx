"use client";

// The start on the verge: a shade tree, bushes, a bench, flowers and the slab
// path onto the straight (positions in ./start.ts).
import { useMemo } from "react";
import * as THREE from "three";
import { Bush, Tree } from "./models/props";
import { BENCH } from "./models/props/propModels";
import { PROP_SCALE, propFoot, propGeometry } from "./models/props/kit";
import { mat } from "./models/props/shared";
import { withWind } from "./alive/sway";
import { flowerGeometry } from "./districts/hills";
import { compose, rng } from "./street/common";
import { Instances } from "./street/Instances";
import { Movables, kindFromMatrices } from "./Movables";
import { heightAt } from "./terrain";
import { C } from "./palette";
import { START_BENCH, START_BUSHES, START_FLOWERS, START_PATH, START_TREE } from "./start";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const PETALS = [C.white, C.cream, C.pink, C.yellow].map((c) => new THREE.Color(c));

export default function StartGarden() {
  const parts = useMemo(() => {
    const r = rng(77);
    const flowers = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
    for (const [x, z] of START_FLOWERS) {
      const tint = PETALS[Math.floor(r() * PETALS.length)];
      for (let j = 0; j < 6; j++) {
        const fx = x + (r() - 0.5) * 2.4;
        const fz = z + (r() - 0.5) * 1.6;
        const s = 0.6 + r() * 0.4;
        flowers.m.push(compose(fx, heightAt(fx, fz) + 0.1 * s, fz, r() * Math.PI * 2, s, s, s));
        flowers.c.push(tint);
      }
    }
    const k = 0.85 * PROP_SCALE;
    const b = START_BENCH;
    const bench = { m: [compose(b.x, heightAt(b.x, b.z) + propFoot(BENCH) * k, b.z, b.yaw, k, k, k)] };
    const tones = ["#c9ab8a", "#d8c3a2", "#bf9c7f", "#e0cfb2"].map((c) => new THREE.Color(c));
    const path = { m: START_PATH, c: START_PATH.map(() => tones[Math.floor(r() * tones.length)]) };
    const benchKind = kindFromMatrices(bench.m, [{ geometry: propGeometry(BENCH), material: mat("#ffffff", { r: 0.8, vc: true }) }], { mass: 0.6 });
    return { flowers, path, benchKind, flowerGeo: flowerGeometry(), slabGeo: new RoundedBoxGeometry(1, 1, 1, 2, 0.3) };
  }, []);
  const t = START_TREE;
  return (
    <group name="start-garden">
      <Tree variant="round" seed={t.seed} position={[t.x, heightAt(t.x, t.z), t.z]} scale={t.s} />
      {START_BUSHES.map(([x, z, s], i) => (
        <Bush key={i} seed={30 + i} position={[x, heightAt(x, z), z]} scale={s} rotation={[0, i * 1.7, 0]} />
      ))}
      <Instances geometry={parts.slabGeo} material={mat("#ffffff", { r: 0.9 })} batch={parts.path} shadow={false} />
      <Movables kind={parts.benchKind} />
      <Instances geometry={parts.flowerGeo} material={withWind(mat("#ffffff", { r: 0.7, side: THREE.DoubleSide }), { amount: 0.25, maxHeight: 0.4 })} batch={parts.flowers} shadow={false} />
    </group>
  );
}
