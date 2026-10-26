// bounds: 0.44 x 0.54 x 0.44 (cuboid base + cone; a cylinder r=0.2 h=0.54 also fits)
"use client";

import * as THREE from "three";
import { C } from "../../palette";
import { geo, mat, type GroupProps } from "./shared";

const H = 0.5; // cone body height above the base
const BASE = 0.04;
const R0 = 0.18; // radius at the bottom of the body
const R1 = 0.04; // radius at the flat tip
const SIDES = 8; // faceted, not turned

const rAt = (y: number) => R0 + (R1 - R0) * (y / H);

function bodyGeo() {
  return geo("cone-body", () => {
    const g = new THREE.CylinderGeometry(R1, R0, H, SIDES);
    g.translate(0, H / 2, 0);
    return g.toNonIndexed();
  });
}

function bandGeo(y0: number, y1: number) {
  return geo(`cone-band-${y0}-${y1}`, () => {
    const g = new THREE.CylinderGeometry(rAt(y1) + 0.006, rAt(y0) + 0.006, y1 - y0, SIDES, 1, true);
    g.translate(0, (y0 + y1) / 2, 0);
    return g.toNonIndexed();
  });
}

/** Traffic cone, Concrete & Ink: an eight-sided orange body (its one accent), two paper bands, a square ink base. */
export function Cone(props: GroupProps) {
  const paper = mat(C.paper, { r: 0.6, flat: true });
  return (
    <group {...props}>
      <mesh position={[0, BASE / 2, 0]} material={mat(C.ink, { r: 0.8 })} castShadow receiveShadow>
        <boxGeometry args={[0.44, BASE, 0.44]} />
      </mesh>
      <group position={[0, BASE, 0]}>
        <mesh geometry={bodyGeo()} material={mat(C.orange, { r: 0.6, flat: true })} castShadow receiveShadow />
        <mesh geometry={bandGeo(0.14, 0.21)} material={paper} castShadow />
        <mesh geometry={bandGeo(0.28, 0.33)} material={paper} castShadow />
      </group>
    </group>
  );
}
