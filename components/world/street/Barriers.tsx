"use client";

import { CylinderCollider, RigidBody, RoundCuboidCollider } from "@react-three/rapier";
import * as THREE from "three";
import { heightAt } from "../terrain";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { C } from "../palette";
import { geo, mat } from "../models/props/shared";
import { TYRE_H, TYRE_R, bandGeo, rubberGeo } from "../models/props/Tyre";
import { compose } from "./common";
import { Instances, batch } from "./Instances";
import { STACK_GAP, TYRE_WALLS } from "./layoutStreet";

// Bruno's circuit (folio-2025, MIT) has no walls: open run-off past the kerbs and a
// few tyre stacks where a car runs wide. Ours: a short tyre wall on the outside of
// each tight corner, three tyres high with red and white bands, a rounded block at
// each end. Fixed colliders only where something stands.

const LAYERS = 3;
const END = { w: 1.3, h: 0.6, d: 0.75 };

const endGeo = () =>
  geo("street-wall-end", () => {
    const g = new RoundedBoxGeometry(END.w, END.h, END.d, 3, 0.14);
    g.translate(0, END.h / 2, 0);
    return g;
  });

const RED = new THREE.Color(C.red);
const WHITE = new THREE.Color(C.white);

const B = (() => {
  const rubber = batch();
  const band = batch();
  const ends = batch();
  for (const w of TYRE_WALLS) {
    const y = heightAt(w.x, w.z);
    if (w.end) {
      ends.m.push(compose(w.x, y, w.z, w.yaw));
      ends.c.push(RED);
      continue;
    }
    for (let l = 0; l < LAYERS; l++) {
      // a hand-stacked wobble, the same every load
      const j = Math.sin(w.k * 12.9898 + l * 78.233) * 43758.5453;
      const r = j - Math.floor(j);
      const yaw = w.yaw + r * Math.PI;
      const ly = y + l * (TYRE_H + 0.004);
      rubber.m.push(compose(w.x + (r - 0.5) * 0.04, ly, w.z, yaw));
      band.m.push(compose(w.x + (r - 0.5) * 0.04, ly + TYRE_H + 0.002, w.z, yaw));
      band.c.push(w.k % 2 ? WHITE : RED);
    }
  }
  return { rubber: { m: rubber.m }, band, ends };
})();

export function Barriers() {
  return (
    <>
      <Instances geometry={rubberGeo()} material={mat(C.black, { r: 0.78 })} batch={B.rubber} />
      <Instances geometry={bandGeo()} material={mat(C.white, { r: 0.45 })} batch={B.band} shadow={false} />
      <Instances geometry={endGeo()} material={mat(C.white, { r: 0.42 })} batch={B.ends} />
      <RigidBody type="fixed" colliders={false} friction={0.25} restitution={0.35}>
        {TYRE_WALLS.map((w, i) =>
          w.end ? (
            <RoundCuboidCollider
              key={i}
              args={[END.w / 2 - 0.1, END.h / 2 - 0.1, END.d / 2 - 0.1, 0.1]}
              position={[w.x, heightAt(w.x, w.z) + END.h / 2, w.z]}
              rotation={[0, w.yaw, 0]}
            />
          ) : (
            <CylinderCollider
              key={i}
              args={[(LAYERS * TYRE_H) / 2, Math.min(TYRE_R, STACK_GAP / 2)]}
              position={[w.x, heightAt(w.x, w.z) + (LAYERS * TYRE_H) / 2, w.z]}
            />
          )
        )}
      </RigidBody>
    </>
  );
}
