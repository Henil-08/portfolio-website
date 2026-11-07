"use client";

// Ground dressing drawn a few centimetres over the terrain (gravel traps, the promenade, garden paths)
// is solid as drawn: a trimesh of the very triangles on screen, so a tyre rides on what it shows
// instead of sinking to the terrain under it.
import { RigidBody, TrimeshCollider } from "@react-three/rapier";
import * as THREE from "three";

/** One trimesh's [vertices, indices] from any number of geometries, indexed or not. */
export function trimeshOf(...geos: THREE.BufferGeometry[]): [Float32Array, Uint32Array] {
  let nv = 0;
  let ni = 0;
  for (const g of geos) {
    const n = g.getAttribute("position").count;
    nv += n;
    ni += g.getIndex()?.count ?? n;
  }
  const v = new Float32Array(nv * 3);
  const idx = new Uint32Array(ni);
  let ov = 0;
  let oi = 0;
  for (const g of geos) {
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) v.set([p.getX(i), p.getY(i), p.getZ(i)], (ov + i) * 3);
    const ix = g.getIndex();
    if (ix) for (let i = 0; i < ix.count; i++) idx[oi + i] = ov + ix.getX(i);
    else for (let i = 0; i < p.count; i++) idx[oi + i] = ov + i;
    oi += ix?.count ?? p.count;
    ov += p.count;
  }
  return [v, idx];
}

/** A fixed body holding one trimesh: the geometries as drawn, solid. */
export function Solid({ args }: { args: [Float32Array, Uint32Array] }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      <TrimeshCollider args={args} />
    </RigidBody>
  );
}
