"use client";

import * as THREE from "three";
import { heightAt } from "../terrain";
import { geo } from "../models/props/shared";
import { Kit, bm, cboxGeo, sliceGeo } from "../kit/builtShared";
import { Movables, type MovableItem, type MovableKind } from "../Movables";
import { BLOCK, BLOCK_D, BLOCK_H, TYRE_WALLS } from "./layoutStreet";
import { K, km } from "./ink";

// No walls round the circuit: open run-off past the kerbs and a short TecPro barrier
// on the outside of each tight corner, after the approved concept (tecpro): two rows of
// chamfered blocks, ink and paper in turn, the top row set half a block along, a graphite
// strap and buckle round each block near its end, and one orange block per wall. Every block is its own light body, so the car can scatter
// a wall; Movables puts them back once the car is well away.

const C = 0.17; // chamfer
const blockGeo = () => geo("tecpro-block-v2", () => cboxGeo(BLOCK, BLOCK_H, BLOCK_D, C));
/** The strap: an upright band round the block near its end, just proud, and its buckle on the front. */
const strapGeo = () =>
  geo("tecpro-strap-v2", () => {
    const k = new Kit();
    const x = BLOCK / 2 - 0.24;
    k.add("strap", sliceGeo(0.07, BLOCK_H + 0.016, BLOCK_D + 0.016, C), [x, 0, 0]);
    k.cbox("strap", [0.16, 0.2, 0.05], [x, 0, BLOCK_D / 2 + 0.02], 0.015);
    return k.build().strap!;
  });

const INK = new THREE.Color(K.ink);
const PAPER = new THREE.Color(K.paper);
const ORANGE = new THREE.Color(K.orange);

const KIND = (() => {
  const items: MovableItem[] = [];
  const colors: THREE.Color[] = [];
  // one orange block per wall, two thirds along its top row
  const tops = new Map<number, number>();
  for (const w of TYRE_WALLS) if (w.row === 1) tops.set(w.wall, Math.max(tops.get(w.wall) ?? 0, w.i));
  for (const w of TYRE_WALLS) {
    const y = heightAt(w.x, w.z);
    items.push({ x: w.x, y: y + BLOCK_H / 2 + w.row * (BLOCK_H + 0.004) + 0.003, z: w.z, yaw: w.yaw });
    const orange = w.row === 1 && w.i === Math.round(((tops.get(w.wall) ?? 0) * 2) / 3);
    colors.push(orange ? ORANGE : (w.i + w.row) % 2 ? PAPER : INK);
  }
  const kind: MovableKind = {
    items,
    parts: [
      { geometry: blockGeo(), material: km.painted(), colors },
      { geometry: strapGeo(), material: bm("strap"), shadow: false },
    ],
    shape: { type: "box", hx: BLOCK / 2, hy: BLOCK_H / 2, hz: BLOCK_D / 2, round: 0.1 },
    mass: 0.3,
    friction: 0.6,
    restitution: 0.2,
  };
  return kind;
})();

export function Barriers() {
  return <Movables kind={KIND} />;
}
