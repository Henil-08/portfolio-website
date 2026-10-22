// bounds: cylinder r=0.45 h=0.32 (lying flat, origin at ground center)
"use client";

import * as THREE from "three";
import { C } from "../../palette";
import { geo, mat, rng, type GroupProps } from "./shared";

export type Compound = "soft" | "medium" | "hard" | "inter";

export const COMPOUND_COLOR: Record<Compound, string> = {
  soft: C.red,
  medium: C.yellow,
  hard: C.white,
  inter: C.grassDark,
};

export const TYRE_R = 0.45;
export const TYRE_H = 0.32;
const R_IN = 0.24;

function rubberGeo() {
  return geo("tyre-rubber", () => {
    // Rounded-rectangle cross section, swept around Y: a fat doughnut.
    const pts: THREE.Vector2[] = [];
    const cr = 0.1; // outer corner radius (chunky shoulder)
    const ci = 0.03;
    const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
      for (let i = 0; i <= 6; i++) {
        const a = a0 + (a1 - a0) * (i / 6);
        pts.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
      }
    };
    // inner bottom -> outer bottom -> outer top -> inner top (counter-clockwise outline)
    arc(R_IN + ci, ci, ci, Math.PI, Math.PI * 1.5);
    arc(TYRE_R - cr, cr, cr, -Math.PI / 2, 0);
    arc(TYRE_R - cr, TYRE_H - cr, cr, 0, Math.PI / 2);
    arc(R_IN + ci, TYRE_H - ci, ci, Math.PI / 2, Math.PI);
    pts.push(pts[0].clone());
    return new THREE.LatheGeometry(pts, 36);
  });
}

function stripeGeo() {
  return geo("tyre-stripe", () => {
    const g = new THREE.RingGeometry(0.3, 0.355, 40);
    g.rotateX(-Math.PI / 2);
    return g;
  });
}

function rimGeo() {
  return geo("tyre-rim", () => {
    const pts = [
      new THREE.Vector2(0, 0.08),
      new THREE.Vector2(R_IN + 0.005, 0.08),
      new THREE.Vector2(R_IN + 0.005, 0.12),
      new THREE.Vector2(0.17, 0.16),
      new THREE.Vector2(0.08, 0.2),
      new THREE.Vector2(0.06, 0.24),
      new THREE.Vector2(0, 0.25),
    ];
    return new THREE.LatheGeometry(pts, 24);
  });
}

type TyreProps = GroupProps & { compound?: Compound };

/** One chunky racing tyre lying flat, with a compound-colored sidewall stripe. */
export function Tyre({ compound = "soft", ...props }: TyreProps) {
  return (
    <group {...props}>
      <mesh geometry={rubberGeo()} material={mat(C.asphalt, { r: 0.9 })} castShadow receiveShadow />
      <mesh
        geometry={stripeGeo()}
        position={[0, TYRE_H + 0.002, 0]}
        material={mat(COMPOUND_COLOR[compound], { r: 0.6 })}
        receiveShadow
      />
      <mesh geometry={rimGeo()} material={mat(C.metal, { r: 0.35, m: 0.4 })} castShadow receiveShadow />
    </group>
  );
}

type StackProps = GroupProps & {
  n?: number;
  /** one compound for all, or one per tyre (cycled) */
  compound?: Compound | Compound[];
  seed?: number;
};

/** Visual helper: n tyres stacked with a little hand-placed wobble. bounds: r=0.47, h=0.32*n */
export function TyreStack({ n = 3, compound = "soft", seed = 1, ...props }: StackProps) {
  const rand = rng(seed);
  const list = Array.isArray(compound) ? compound : [compound];
  return (
    <group {...props}>
      {Array.from({ length: n }, (_, i) => (
        <Tyre
          key={i}
          compound={list[i % list.length]}
          position={[(rand() - 0.5) * 0.05, i * TYRE_H, (rand() - 0.5) * 0.05]}
          rotation={[0, rand() * Math.PI, 0]}
        />
      ))}
    </group>
  );
}
