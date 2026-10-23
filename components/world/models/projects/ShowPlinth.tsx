// Showroom plinth for a project object: the 1 m glossy Pedestal plus a curved
// charcoal name band on its front with the project name in Racero.
// Put the object on top at y = 1.0 (pass it as children, it is placed there).
"use client";

import type { ReactNode } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { Pedestal } from "../props/Gadgets";
import { Label } from "../props/Label";
import { geo, mat, type GroupProps } from "../props/shared";

const BAND_R = 0.506;
const BAND_ARC = 2.3; // radians of the column the band wraps
const BAND_Y = 0.6;
const BAND_H = 0.17;

function bandGeo() {
  return geo("plinth-band", () => new THREE.CylinderGeometry(BAND_R, BAND_R, BAND_H, 48, 1, true, -BAND_ARC / 2, BAND_ARC));
}
function edgeGeo() {
  return geo("plinth-band-edge", () => new THREE.CylinderGeometry(BAND_R + 0.002, BAND_R + 0.002, 0.008, 48, 1, true, -BAND_ARC / 2, BAND_ARC));
}

// troika Text supports curveRadius; drei's type just doesn't list it
const curve = (r: number) => ({ curveRadius: r }) as object;

export function ShowPlinth({
  label,
  accent = C.red,
  children,
  ...props
}: GroupProps & { label?: string; accent?: string; children?: ReactNode }) {
  const text = (label ?? "").toUpperCase();
  // shrink long names so they stay on the band (~0.95 m of usable arc)
  const fs = Math.min(0.06, 1.05 / (text.length * 0.8 + 2));
  return (
    <group {...props}>
      <Pedestal accent={accent} />
      {text && (
        <>
          <mesh geometry={bandGeo()} position={[0, BAND_Y, 0]} material={mat(C.ink, { r: 0.35, m: 0.1, side: THREE.DoubleSide })} receiveShadow />
          <mesh geometry={edgeGeo()} position={[0, BAND_Y - BAND_H / 2 + 0.018, 0]} material={mat(accent, { glow: 0.6, r: 0.4, side: THREE.DoubleSide })} />
          <Label position={[0, BAND_Y + 0.012, BAND_R + 0.003]} fontSize={fs} color={C.white} letterSpacing={0.06} {...curve(-(BAND_R + 0.003))}>
            {text}
          </Label>
        </>
      )}
      {children && <group position={[0, 1.0, 0]}>{children}</group>}
    </group>
  );
}
