"use client";

// Wraps any model (kit, built, Meshy) and gives it the studio treatment once its meshes are in:
// creased smooth normals, baked AO and grain (normals.ts, ao.ts, materials.ts). Works on what
// the children draw, so the model code doesn't change. Geometry is cloned per mesh (the AO is
// per placement), materials are shared studio clones. Instanced meshes get grain only.
import { useEffect, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { creaseNormals } from "./normals";
import { bakeAO, type AoOpts } from "./ao";
import { studioMaterial, type StudioMat } from "./materials";

export type StudifyOpts = {
  /** crease angle in degrees for smooth normals; 0 keeps the model's own normals */
  crease?: number;
  grain?: StudioMat["grain"];
  /** bake AO (false to skip) */
  ao?: boolean | AoOpts;
  aoDirect?: number;
};

type Saved = { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[] };

export function Studify({ children, onReady, crease = 50, grain = "auto", ao = true, aoDirect }: StudifyOpts & { children: ReactNode; onReady?: (ms: number) => void }) {
  const ref = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const st = useRef({ last: 0, count: -1, since: 0, done: -1 });
  const saved = useRef(new Map<THREE.Mesh, Saved>());

  useEffect(() => {
    const map = saved.current;
    return () => {
      for (const [m, s] of map) {
        if (m.geometry !== s.geometry) m.geometry.dispose();
        m.geometry = s.geometry;
        m.material = s.material;
      }
      map.clear();
    };
  }, []);

  useFrame(() => {
    const g = ref.current;
    const s = st.current;
    const now = performance.now();
    if (!g || now - s.last < 120) return;
    s.last = now;
    let count = 0;
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) count++;
    });
    if (count !== s.count) {
      s.count = count;
      s.since = now;
      return;
    }
    // wait until the mesh count has held a moment (Suspense, lazy parts)
    if (now - s.since < 300 || s.done === count || !count) return;
    s.done = count;
    const t0 = performance.now();
    const meshes: THREE.Mesh[] = [];
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) meshes.push(o);
    });
    for (const m of meshes) {
      if (saved.current.has(m)) continue;
      saved.current.set(m, { geometry: m.geometry, material: m.material });
      // instanced draws and custom geometries (troika text) keep theirs
      if (m instanceof THREE.InstancedMesh || m.geometry instanceof THREE.InstancedBufferGeometry) continue;
      const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
      const textured = !!mat.map;
      m.geometry = crease > 0 && !textured ? creaseNormals(m.geometry.index ? m.geometry : m.geometry.clone(), crease) : m.geometry.clone();
    }
    if (ao) bakeAO(gl, g, ao === true ? {} : ao);
    for (const m of meshes) {
      if (m.geometry instanceof THREE.InstancedBufferGeometry) continue;
      const orig = saved.current.get(m)!;
      const one = (x: THREE.Material) =>
        studioMaterial(x, {
          ao: !!m.geometry.getAttribute("studioAO"),
          grain: (x as THREE.MeshStandardMaterial).map ? 0 : grain,
          smooth: crease > 0 && !(m instanceof THREE.InstancedMesh),
          aoDirect,
        });
      m.material = Array.isArray(orig.material) ? orig.material.map(one) : one(orig.material);
    }
    onReady?.(performance.now() - t0);
  });

  return <group ref={ref}>{children}</group>;
}
