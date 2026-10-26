// bounds: cylinder r=0.45 h=0.32 (lying flat, origin at ground center). Wheel hub peaks at y=0.28.
"use client";

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C } from "../../palette";
import { Label } from "./Label";
import { geo, mat, rng, type GroupProps } from "./shared";

export type Compound = "soft" | "medium" | "hard" | "inter";

// Concrete & Ink, as the UI's compound codes (Panels.tsx): soft is the orange one, hard paper,
// medium and inter in concrete tones; each also carries its letter in Plex Mono.
export const COMPOUND_COLOR: Record<Compound, string> = {
  soft: C.orange,
  medium: C.concrete,
  hard: C.paper,
  inter: C.concreteDark,
};

export const TYRE_R = 0.45;
export const TYRE_H = 0.32;
const R_IN = 0.26;

const SIDES = 16; // faceted, not turned

export function rubberGeo() {
  return geo("tyre-rubber", () => {
    // Chamfered rectangular cross section swept round Y: hard shoulders, faceted tread.
    const c = 0.05;
    const pts = [
      [R_IN, 0.015],
      [R_IN + 0.015, 0],
      [TYRE_R - c, 0],
      [TYRE_R, c],
      [TYRE_R, TYRE_H - c],
      [TYRE_R - c, TYRE_H],
      [R_IN + 0.015, TYRE_H],
      [R_IN, TYRE_H - 0.015],
      [R_IN, 0.015],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, SIDES).toNonIndexed();
  });
}

// Pirelli-style sidewall band: two arcs with gaps that carry the lettering.
const GAP = 0.55; // radians per gap
export function bandGeo() {
  return geo("tyre-band", () => {
    const arc = Math.PI - GAP;
    const parts = [0, Math.PI].map((a0) => {
      const g = new THREE.RingGeometry(0.33, 0.37, 8, 1, a0 + GAP / 2, arc);
      g.rotateX(-Math.PI / 2);
      return g;
    });
    const g = mergeGeometries(parts)!;
    return g;
  });
}

function lineGeo(r: number, w: number) {
  return geo(`tyre-line-${r}`, () => {
    const g = new THREE.RingGeometry(r, r + w, SIDES);
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
    return new THREE.LatheGeometry(pts, SIDES);
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

const CODE: Record<Compound, string> = { soft: "S", medium: "M", hard: "H", inter: "I" };

/** Racing tyre lying flat: ink rubber, a sidewall band in its compound's tone, graphite wheel, Plex Mono codes. */
export function Tyre({ compound = "soft", ...props }: TyreProps) {
  const band = mat(COMPOUND_COLOR[compound], { r: 0.6 });
  const y = TYRE_H + 0.002;
  return (
    <group {...props}>
      <mesh geometry={rubberGeo()} material={mat(C.black, { r: 0.85, flat: true })} castShadow receiveShadow />
      <mesh geometry={bandGeo()} position={[0, y, 0]} material={band} receiveShadow />
      <mesh geometry={lineGeo(0.395, 0.008)} position={[0, y, 0]} material={band} />
      <mesh geometry={rimGeo()} material={mat(C.charcoal, { r: 0.5, m: 0.4, flat: true })} castShadow receiveShadow />
      <mesh geometry={spokeGeo()} material={mat(C.ink, { r: 0.6, m: 0.2 })} castShadow />
      {/* lettering in the band gaps, tangential: the compound's letter and the car's code */}
      {[0, Math.PI].map((a, i) => (
        <Label
          key={a}
          mono
          position={[0.35 * Math.cos(a), y + 0.001, -0.35 * Math.sin(a)]}
          rotation={[-Math.PI / 2, 0, a - Math.PI / 2]}
          fontSize={i ? 0.07 : 0.045}
          color={C.paper}
          letterSpacing={0.04}
        >
          {i ? CODE[compound] : "HG-08"}
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
