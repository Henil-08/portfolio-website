// bounds: 0.44 x 0.54 x 0.44 (cuboid base + cone; a cylinder r=0.2 h=0.54 also fits)
"use client";

import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { C } from "../../palette";
import { geo, mat, type GroupProps } from "./shared";

const H = 0.5; // cone body height above the base
const BASE = 0.05;
const R0 = 0.18; // radius at the bottom of the body
const R1 = 0.045; // radius at the tip

const rAt = (y: number) => R0 + (R1 - R0) * (y / H);

function bodyGeo() {
  return geo("cone-body", () => {
    // Lathe profile with a soft flared foot and a rounded tip.
    const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
    pts.push(new THREE.Vector2(R0 + 0.02, 0));
    pts.push(new THREE.Vector2(R0 + 0.012, 0.018));
    pts.push(new THREE.Vector2(R0, 0.04));
    for (let i = 1; i <= 6; i++) {
      const y = 0.04 + (H - 0.08) * (i / 6);
      pts.push(new THREE.Vector2(rAt(y), y));
    }
    for (let i = 1; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      pts.push(new THREE.Vector2(R1 * Math.cos(a), H - 0.04 + R1 * Math.sin(a) * 0.9));
    }
    return new THREE.LatheGeometry(pts, 28);
  });
}

function bandGeo(y0: number, y1: number) {
  return geo(`cone-band-${y0}-${y1}`, () => {
    const g = new THREE.CylinderGeometry(rAt(y1) + 0.008, rAt(y0) + 0.008, y1 - y0, 28, 1, true);
    g.translate(0, (y0 + y1) / 2, 0);
    return g;
  });
}

function collarGeo() {
  return geo("cone-collar", () => {
    const g = new THREE.CylinderGeometry(R0 + 0.03, R0 + 0.04, BASE - 0.02, 28);
    g.translate(0, 0.035 + (BASE - 0.02) / 2, 0);
    return g;
  });
}

/** Traffic cone: safety orange body with two retro-reflective white bands, on a square black base. */
export function Cone(props: GroupProps) {
  const white = mat(C.white, { r: 0.28 });
  return (
    <group {...props}>
      <RoundedBox args={[0.44, 0.035, 0.44]} radius={0.012} smoothness={2} position={[0, 0.0175, 0]} material={mat(C.black, { r: 0.8 })} castShadow receiveShadow />
      <mesh geometry={collarGeo()} material={mat(C.black, { r: 0.75 })} castShadow receiveShadow />
      <group position={[0, BASE - 0.005, 0]}>
        <mesh geometry={bodyGeo()} material={mat(C.orange, { r: 0.4 })} castShadow receiveShadow />
        <mesh geometry={bandGeo(0.14, 0.21)} material={white} castShadow />
        <mesh geometry={bandGeo(0.28, 0.33)} material={white} castShadow />
      </group>
    </group>
  );
}
