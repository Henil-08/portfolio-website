"use client";

import type { ThreeElements } from "@react-three/fiber";
import { kitMat, type Model } from "./shared";

/** Draws a kit model: one mesh per paint, shared materials. */
export function KitModel({ model, shadows = true, ...props }: ThreeElements["group"] & { model: Model; shadows?: boolean }) {
  return (
    <group {...props}>
      {model.map(({ paint, geometry }) => (
        <mesh key={paint} geometry={geometry} material={kitMat(paint)} castShadow={shadows && paint !== "glass"} receiveShadow />
      ))}
    </group>
  );
}
