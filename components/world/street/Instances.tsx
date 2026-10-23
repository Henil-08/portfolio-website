"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

export type Batch = { m: THREE.Matrix4[]; c?: THREE.Color[] };

/** One draw call for a list of transforms (and optional per-instance colours). */
export function Instances({
  geometry,
  material,
  batch,
  shadow = true,
  receive = true,
  frustum = false,
  order,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  batch: Batch;
  shadow?: boolean;
  receive?: boolean;
  frustum?: boolean;
  order?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    batch.m.forEach((m, i) => mesh.setMatrixAt(i, m));
    if (batch.c) batch.c.forEach((c, i) => mesh.setColorAt(i, c));
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [batch]);
  if (!batch.m.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, batch.m.length]}
      castShadow={shadow}
      receiveShadow={receive}
      frustumCulled={frustum}
      renderOrder={order}
    />
  );
}

export function batch(): Required<Batch> {
  return { m: [], c: [] };
}
