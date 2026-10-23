// bounds: cylinder r=0.45 h=0.32 (lying flat, origin at ground center). Wheel hub peaks at y=0.28.
"use client";

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C } from "../../palette";
import { Label } from "./Label";
import { geo, mat, rng, type GroupProps } from "./shared";

export type Compound = "soft" | "medium" | "hard" | "inter";

export const COMPOUND_COLOR: Record<Compound, string> = {
  soft: C.red,
  medium: C.yellow,
  hard: C.white,
  inter: C.green,
};

export const TYRE_R = 0.45;
export const TYRE_H = 0.32;
const R_IN = 0.26;

export function rubberGeo() {
  return geo("tyre-rubber", () => {
    // Rounded-rectangle cross section, swept around Y: a fat doughnut.
    const pts: THREE.Vector2[] = [];
    const cr = 0.075; // outer shoulder radius
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

// Pirelli-style sidewall band: two arcs with gaps that carry the lettering.
const GAP = 0.55; // radians per gap
export function bandGeo() {
  return geo("tyre-band", () => {
    const arc = Math.PI - GAP;
    const parts = [0, Math.PI].map((a0) => {
      const g = new THREE.RingGeometry(0.33, 0.37, 30, 1, a0 + GAP / 2, arc);
      g.rotateX(-Math.PI / 2);
      return g;
    });
    const g = mergeGeometries(parts)!;
    return g;
  });
}

function lineGeo(r: number, w: number) {
  return geo(`tyre-line-${r}`, () => {
    const g = new THREE.RingGeometry(r, r + w, 48);
    g.rotateX(-Math.PI / 2);
    return g;
  });
}

function rimGeo() {
  return geo("tyre-rim", () => {
    // dished satin wheel face with a raised centre-lock hub
    const pts = [
      new THREE.Vector2(0, 0.1),
      new THREE.Vector2(R_IN + 0.004, 0.1),
      new THREE.Vector2(R_IN + 0.004, 0.2),
      new THREE.Vector2(R_IN - 0.02, 0.215),
      new THREE.Vector2(0.18, 0.2),
      new THREE.Vector2(0.09, 0.225),
      new THREE.Vector2(0.075, 0.27),
      new THREE.Vector2(0, 0.275),
    ];
    return new THREE.LatheGeometry(pts, 32);
  });
}

function spokeGeo() {
  return geo("tyre-spokes", () => {
    const parts = Array.from({ length: 10 }, (_, i) => {
      const g = new THREE.BoxGeometry(0.17, 0.025, 0.028);
      g.translate(0.15, 0.218, 0);
      g.rotateY((i / 10) * Math.PI * 2);
      return g;
    });
    return mergeGeometries(parts)!;
  });
}

type TyreProps = GroupProps & { compound?: Compound };

const NAME: Record<Compound, string> = { soft: "SOFT", medium: "MEDIUM", hard: "HARD", inter: "INTER" };

/** Racing tyre lying flat: black rubber, compound-coloured sidewall band, satin wheel. */
export function Tyre({ compound = "soft", ...props }: TyreProps) {
  const band = mat(COMPOUND_COLOR[compound], { r: 0.45 });
  const y = TYRE_H + 0.002;
  return (
    <group {...props}>
      <mesh geometry={rubberGeo()} material={mat(C.black, { r: 0.78 })} castShadow receiveShadow />
      <mesh geometry={bandGeo()} position={[0, y, 0]} material={band} receiveShadow />
      <mesh geometry={lineGeo(0.395, 0.008)} position={[0, y, 0]} material={band} />
      <mesh geometry={rimGeo()} material={mat(C.greyDark, { r: 0.35, m: 0.45 })} castShadow receiveShadow />
      <mesh geometry={spokeGeo()} material={mat(C.charcoal, { r: 0.4, m: 0.3 })} castShadow />
      <mesh geometry={lineGeo(0.03, 0.045)} position={[0, 0.276, 0]} material={mat(C.red, { r: 0.35 })} />
      {/* lettering in the band gaps, tangential */}
      {[0, Math.PI].map((a, i) => (
        <Label
          key={a}
          position={[0.35 * Math.cos(a), y + 0.001, -0.35 * Math.sin(a)]}
          rotation={[-Math.PI / 2, 0, a - Math.PI / 2]}
          fontSize={0.045}
          color={C.white}
          letterSpacing={0.06}
        >
          {i ? NAME[compound] : "HG"}
        </Label>
      ))}
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
