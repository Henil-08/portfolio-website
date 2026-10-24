"use client";

// The start by the name: a shade tree, bushes, a bench and flowers, and the
// lane to the circuit (positions in ./start.ts and ./access.ts).
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
import AccessRoad from "./AccessRoad";
import { heightAt } from "./terrain";
import { C } from "./palette";
import { START_BENCH, START_BUSHES, START_FLOWERS, START_TREE } from "./start";

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
    const benchKind = kindFromMatrices(bench.m, [{ geometry: propGeometry(BENCH), material: mat("#ffffff", { r: 0.8, vc: true }) }], { mass: 0.6 });
    return { flowers, benchKind, flowerGeo: flowerGeometry() };
  }, []);
  const t = START_TREE;
  return (
    <group name="start-garden">
      <AccessRoad />
      <Tree variant="round" seed={t.seed} position={[t.x, heightAt(t.x, t.z), t.z]} scale={t.s} />
      {START_BUSHES.map(([x, z, s], i) => (
        <Bush key={i} seed={30 + i} position={[x, heightAt(x, z), z]} scale={s} rotation={[0, i * 1.7, 0]} />
      ))}
      <Movables kind={parts.benchKind} />
      <Instances geometry={parts.flowerGeo} material={withWind(mat("#ffffff", { r: 0.7, side: THREE.DoubleSide }), { amount: 0.25, maxHeight: 0.4 })} batch={parts.flowers} shadow={false} />
    </group>
  );
}
