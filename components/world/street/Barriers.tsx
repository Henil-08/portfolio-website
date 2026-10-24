"use client";

import * as THREE from "three";
import { heightAt } from "../terrain";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { C } from "../palette";
import { geo, mat } from "../models/props/shared";
import { TYRE_H, TYRE_R, bandGeo, rubberGeo } from "../models/props/Tyre";
import { Movables, type MovableItem, type MovableKind } from "../Movables";
import { STACK_GAP, TYRE_WALLS } from "./layoutStreet";

// No walls round the circuit: open run-off past the kerbs and a short tyre wall
// on the outside of each tight corner, three tyres high with red and white bands,
// a rounded block at each end. All of it can be knocked over.

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

const lift = (y: number) => new THREE.Matrix4().makeTranslation(0, y, 0);

// Every tyre is its own light body (three to a stack) and every end block too, so
// the car can scatter a wall; Movables puts them back once the car is well away.
const KINDS = (() => {
  const tyres: MovableItem[] = [];
  const bands: THREE.Color[] = [];
  const ends: MovableItem[] = [];
  for (const w of TYRE_WALLS) {
    const y = heightAt(w.x, w.z);
    if (w.end) {
      ends.push({ x: w.x, y: y + END.h / 2 + 0.005, z: w.z, yaw: w.yaw });
      continue;
    }
    for (let l = 0; l < LAYERS; l++) {
      // a hand-stacked wobble, the same every load
      const j = Math.sin(w.k * 12.9898 + l * 78.233) * 43758.5453;
      const r = j - Math.floor(j);
      tyres.push({ x: w.x + (r - 0.5) * 0.04, y: y + l * (TYRE_H + 0.004) + TYRE_H / 2 + 0.003, z: w.z, yaw: w.yaw + r * Math.PI });
      bands.push(w.k % 2 ? WHITE : RED);
    }
  }
  const tyre: MovableKind = {
    items: tyres,
    parts: [
      { geometry: rubberGeo(), material: mat(C.black, { r: 0.78 }), local: lift(-TYRE_H / 2) },
      { geometry: bandGeo(), material: mat(C.white, { r: 0.45 }), local: lift(TYRE_H / 2 + 0.002), colors: bands, shadow: false },
    ],
    shape: { type: "cylinder", halfHeight: TYRE_H / 2, radius: Math.min(TYRE_R, STACK_GAP / 2) },
    mass: 0.12,
    friction: 0.6,
    restitution: 0.3,
  };
  const end: MovableKind = {
    items: ends,
    parts: [{ geometry: endGeo(), material: mat(C.white, { r: 0.42 }), local: lift(-END.h / 2), colors: ends.map(() => RED) }],
    shape: { type: "box", hx: END.w / 2, hy: END.h / 2, hz: END.d / 2, round: 0.1 },
    mass: 0.5,
  };
  return { tyre, end };
})();

export function Barriers() {
  return (
    <>
      <Movables kind={KINDS.tyre} />
      <Movables kind={KINDS.end} />
    </>
  );
}
