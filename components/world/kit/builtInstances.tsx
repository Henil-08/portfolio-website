"use client";

// Built parts drawn many times: one InstancedMesh per material, every copy placed by its
// own matrix (the world's town, floodlights, TecPro walls...).
import * as THREE from "three";
import { bm, type MatKey, type Parts } from "./builtShared";

const UP = new THREE.Vector3(0, 1, 0);
const NO_CAST: MatKey[] = ["clear", "lens", "lit", "inner"];

/** A transform for one copy: position, yaw and an optional scale. */
export function placeMatrix(x: number, y: number, z: number, yaw = 0, s: number | [number, number, number] = 1) {
  const sc = typeof s === "number" ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, yaw), sc);
}

/**
 * Draws `parts` once per matrix. `material` swaps a key's shared material (a night glow,
 * a see-through twin); left out, the shared one is used.
 */
export function BuiltInstances({ parts, matrices, material, shadows = true }: { parts: Parts; matrices: THREE.Matrix4[]; material?: (k: MatKey) => THREE.Material; shadows?: boolean }) {
  if (!matrices.length) return null;
  return (
    <>
      {(Object.keys(parts) as MatKey[]).map((k) => (
        <instancedMesh
          key={k}
          args={[parts[k], material ? material(k) : bm(k), matrices.length]}
          castShadow={shadows && !NO_CAST.includes(k)}
          receiveShadow
          frustumCulled={false}
          ref={(m) => {
            if (!m) return;
            matrices.forEach((mx, i) => m.setMatrixAt(i, mx));
            m.instanceMatrix.needsUpdate = true;
            m.computeBoundingSphere();
          }}
        />
      ))}
    </>
  );
}
