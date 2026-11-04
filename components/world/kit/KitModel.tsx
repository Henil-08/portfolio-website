"use client";

import type { ThreeElements } from "@react-three/fiber";
import { Instances, type Batch } from "../street/Instances";
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

/** Instances of a kit model: one instanced draw per paint over the same transforms. */
export function KitInstances({ model, batch, shadow = true }: { model: Model; batch: Batch; shadow?: boolean }) {
  return (
    <>
      {model.map(({ paint, geometry }) => (
        <Instances key={paint} geometry={geometry} material={kitMat(paint)} batch={batch} shadow={shadow && paint !== "glass"} />
      ))}
    </>
  );
}
