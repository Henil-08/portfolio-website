// Pedestal: static, cylinder r=0.55 h=1.0 (top at y=1.0). Things on show sit on top at y~1.0.
"use client";

import * as THREE from "three";
import { C } from "../../palette";
import { geo, mat, type GroupProps } from "./shared";

function pedestalGeo() {
  return geo("pedestal", () => {
    // eight-sided concrete column with a chamfered top, set on an ink plinth
    const pts: [number, number][] = [
      [0, 0.1],
      [0.5, 0.1],
      [0.5, 0.97],
      [0.47, 1.0],
      [0, 1.0],
    ];
    return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 8).toNonIndexed();
  });
}

function plinthGeo() {
  return geo("pedestal-plinth", () => {
    const pts: [number, number][] = [
      [0, 0],
      [0.58, 0],
      [0.58, 0.1],
      [0, 0.1],
    ];
    return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 8).toNonIndexed();
  });
}

function ringGeo(r: number, h: number) {
  return geo(`pedestal-ring-${r}-${h}`, () => new THREE.CylinderGeometry(r, r, h, 8, 1, true));
}

/** Showcase pedestal, 1 m tall: an eight-sided concrete column on an ink plinth, a thin orange line and a lit top. */
export function Pedestal({ accent = C.orange, ...props }: GroupProps & { accent?: string }) {
  return (
    <group {...props}>
      <mesh geometry={plinthGeo()} material={mat(C.ink, { r: 0.6, m: 0.2, flat: true })} castShadow receiveShadow />
      <mesh geometry={pedestalGeo()} material={mat(C.concrete, { r: 0.95, flat: true })} castShadow receiveShadow />
      <mesh geometry={ringGeo(0.503, 0.03)} position={[0, 0.86, 0]} material={mat(accent, { r: 0.55 })} />
      {/* soft light disc on top */}
      <mesh geometry={geo("pedestal-top", () => new THREE.CylinderGeometry(1, 1, 1, 8))} scale={[0.4, 0.006, 0.4]} position={[0, 1.003, 0]} material={mat(C.paper, { glow: 0.35, r: 0.3 })} />
    </group>
  );
}
