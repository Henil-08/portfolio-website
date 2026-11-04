"use client";

import type { ThreeElements } from "@react-three/fiber";
import { Instances, type Batch } from "../street/Instances";
import { creased } from "../studio/normals";
import { studioMaterial } from "../studio/materials";
import { kitMat, type Model } from "./shared";

/**
 * Draws a kit model: one mesh per paint, shared materials. Opt-in studio options (off by
 * default, the world's look is unchanged): `crease` smooth-shades below that angle in degrees
 * so chamfers catch light (studio/normals.ts); `grain` adds the concrete/paper grain.
 */
export function KitModel({ model, shadows = true, crease, grain, ...props }: ThreeElements["group"] & { model: Model; shadows?: boolean; crease?: number; grain?: boolean }) {
  return (
    <group {...props}>
      {model.map(({ paint, geometry }) => (
        <mesh
          key={paint}
          geometry={crease ? creased(geometry, crease) : geometry}
          material={crease || grain ? studioMaterial(kitMat(paint), { smooth: !!crease, grain: grain ? "auto" : 0 }) : kitMat(paint)}
          castShadow={shadows && paint !== "glass"}
          receiveShadow
        />
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
