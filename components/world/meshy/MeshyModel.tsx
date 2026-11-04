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
    const top = def.top ? new THREE.Color(def.top.color) : null;
    const topY = (def.top?.above ?? 1) * def.height;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      // paint whole triangles, by their centre and face normal, so band edges stay crisp
      const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      a.set(pos.getX(i + 1) - pos.getX(i), pos.getY(i + 1) - pos.getY(i), pos.getZ(i + 1) - pos.getZ(i));
      b.set(pos.getX(i + 2) - pos.getX(i), pos.getY(i + 2) - pos.getY(i), pos.getZ(i + 2) - pos.getZ(i));
      n.crossVectors(a, b).normalize();
      const c = top && y > topY && n.y > 0.8 ? top : y < cut ? plinth : body;
      for (let k = 0; k < 3; k++) c.toArray(col, (i + k) * 3);
    }
    out.setAttribute("color", new THREE.BufferAttribute(col, 3));
    out.deleteAttribute("uv");
    out.computeVertexNormals();
    return out;
  }, [scene, def]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }), []);
  const raw = useMemo(() => {
    if (!def.textured) return null;
    const g = scene.clone(true);
    const bb = new THREE.Box3().setFromObject(g);
    const s = def.height / (bb.max.y - bb.min.y);
    g.scale.setScalar(s);
    g.position.y = -bb.min.y * s;
    return g;
  }, [scene, def]);
  if (raw) return <primitive object={raw} />;
  if (!geo) return null;
  return <mesh geometry={geo} material={mat} castShadow={castShadow} receiveShadow />;
}
