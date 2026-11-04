"use client";

// Loads a Meshy model from public/models and paints it in the brand colours (see catalog.ts).
import { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { MeshyModel as Def } from "./catalog";

export function MeshyModel({ def, castShadow = true }: { def: Def; castShadow?: boolean }) {
  const { scene } = useGLTF(`/models/${def.id}.glb`);
  const geo = useMemo(() => {
    let g: THREE.BufferGeometry | null = null;
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      // bake the node's own transform in; Meshy files carry one
      if (!g && o instanceof THREE.Mesh) g = (o.geometry as THREE.BufferGeometry).clone().applyMatrix4(o.matrixWorld);
    });
    if (!g) return null;
    const out = (g as THREE.BufferGeometry).toNonIndexed();
    out.computeBoundingBox();
    const bb = out.boundingBox!;
    const s = def.height / (bb.max.y - bb.min.y);
    out.scale(s, s, s);
    out.translate(0, -bb.min.y * s, 0);
    const pos = out.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const body = new THREE.Color(def.body);
    const plinth = new THREE.Color(def.plinth);
    const cut = def.base * def.height;
    for (let i = 0; i < pos.count; i += 3) {
      // paint whole triangles, by their centre, so the band edge stays crisp
      const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const c = y < cut ? plinth : body;
      for (let k = 0; k < 3; k++) c.toArray(col, (i + k) * 3);
    }
    out.setAttribute("color", new THREE.BufferAttribute(col, 3));
    out.deleteAttribute("uv");
    out.computeVertexNormals();
    return out;
  }, [scene, def]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }), []);
  if (!geo) return null;
  return <mesh geometry={geo} material={mat} castShadow={castShadow} receiveShadow />;
}
