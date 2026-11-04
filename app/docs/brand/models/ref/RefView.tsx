"use client";

// Reference renders of our procedural vehicles for Meshy multi-image-to-3D (scripts/meshy.mjs):
// `?v=V01&view=front|side|back|three`, wheels hidden (the game keeps its own), painted in a
// role-coded livery (body red, accent green, trim blue) so the returned texture tells us which
// part of the mesh takes which livery colour.
import { useSyncExternalStore, type ComponentType } from "react";
import * as THREE from "three";
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { VEHICLES } from "@/components/world/vehicles";
import type { Livery } from "@/components/world/vehicles/liveries";

const ROLES: Livery = { name: "Paper", body: "#ff1a1a", accent: "#00c040", trim: "#1a40ff", frame: "#1a40ff", spring: "#00c040", lamp: "#00c040" };
const VIEWS: Record<string, [number, number, number]> = { front: [0, 0.35, 1], side: [1, 0.12, 0], back: [0, 0.35, -1], three: [0.8, 0.45, 0.8] };

const readSearch = () => (typeof window === "undefined" ? "" : window.location.search);
const noop = () => () => {};

function Frame({ dir }: { dir: [number, number, number] }) {
  const done = useRef(false);
  useFrame(({ camera, scene }) => {
    if (done.current) return;
    done.current = true;
    fit(camera as THREE.OrthographicCamera, scene, dir);
  });
  return null;
}

function fit(cam: THREE.OrthographicCamera, scene: THREE.Scene, dir: [number, number, number]) {
  // hide wheels, then fit an orthographic camera round what's left
  scene.traverse((o) => {
    if (o.name === "wheel") o.visible = false;
  });
  const box = new THREE.Box3().setFromObject(scene);
  const c = box.getCenter(new THREE.Vector3());
  const r = box.getSize(new THREE.Vector3()).length() / 2;
  cam.position.copy(c).addScaledVector(new THREE.Vector3(...dir).normalize(), r * 4);
  cam.zoom = 960 / (r * 2);
  cam.near = 0.01;
  cam.far = r * 10;
  cam.lookAt(c);
  cam.updateProjectionMatrix();
}

export default function RefView() {
  const q = new URLSearchParams(useSyncExternalStore(noop, readSearch, () => ""));
  const def = VEHICLES.find((v) => v.code === (q.get("v") ?? "V01"));
  const dir = VIEWS[q.get("view") ?? "three"] ?? VIEWS.three;
  if (!def) return null;
  const Model = def.Model as ComponentType<{ livery?: Livery }>;
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#ffffff" }}>
      <Canvas orthographic flat gl={{ preserveDrawingBuffer: true }}>
        <color attach="background" args={["#ffffff"]} />
        <hemisphereLight args={["#ffffff", "#9a9a9a", 1.6]} />
        <directionalLight position={[3, 5, 4]} intensity={1.4} />
        <Model livery={ROLES} />
        <Frame key={q.get("view") ?? "three"} dir={dir} />
      </Canvas>
    </div>
  );
}
