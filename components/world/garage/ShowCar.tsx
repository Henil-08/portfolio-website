"use client";

// Garage experience: the vehicle that drives into the bay, posed by its parent each frame
// (position and rotation.y on `root`). Its wheels roll with the distance it covers, through the
// game's own spin hooks; once the camera is in the seat (`inCab`), any glass and any part the
// eye sits inside turn see-through, so the cabin never hides the stage.
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RigContext, type Livery, type VehicleDef, type VehicleRig } from "../vehicles";
import { K } from "../vehicles/kit";
import { EYE, S } from "./anim";

const GHOST = new THREE.MeshBasicMaterial({ color: "#151a1f", transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });

type Swap = { mesh: THREE.Mesh; mat: THREE.Material | THREE.Material[] };

export function ShowCar({ v, livery, root, inCab }: { v: VehicleDef; livery: Livery; root: RefObject<THREE.Group | null>; inCab: { readonly current: boolean } }) {
  const spins = useRef<(THREE.Group | null)[]>([]);
  const rig = useMemo<VehicleRig>(
    () => ({
      steer: () => () => {},
      swap: () => () => {},
      spin: (i) => (el) => void (spins.current[i] = el),
      drs: () => {},
    }),
    [],
  );
  const last = useRef<THREE.Vector3 | null>(null);
  const glass = useRef<Swap[] | null>(null);
  const ghosted = useRef(false);
  const model = useRef<THREE.Group>(null!);

  useFrame(() => {
    const g = root.current;
    if (!g) return;
    // the wheels: roll by the distance moved along the nose
    const p = g.position;
    if (last.current) {
      const yaw = g.rotation.y;
      const ds = (p.x - last.current.x) * Math.sin(yaw) + (p.z - last.current.z) * Math.cos(yaw);
      if (ds !== 0)
        v.wheels.forEach((w, i) => {
          const s = spins.current[i];
          if (s) s.rotation.x += ds / (w.r * S);
        });
      last.current.copy(p);
    } else last.current = p.clone();
    // the cabin: find the glass and the parts round the eye once, then swap them in and out
    if (!glass.current) {
      const e = new THREE.Vector3(...EYE[v.code]);
      model.current.updateWorldMatrix(true, true);
      const inv = model.current.matrixWorld.clone().invert();
      const list: Swap[] = [];
      model.current.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const isGlass = m.material === K.canopy || m.material === K.smoke;
        const box = new THREE.Box3().setFromObject(m).applyMatrix4(inv);
        if (isGlass || box.containsPoint(e)) list.push({ mesh: m, mat: m.material });
      });
      glass.current = list;
    }
    const want = inCab.current;
    if (want !== ghosted.current) {
      ghosted.current = want;
      for (const { mesh, mat } of glass.current) mesh.material = want ? GHOST : mat;
    }
  });

  return (
    <group ref={model} scale={S}>
      <RigContext.Provider value={rig}>
        <v.Model livery={livery} />
      </RigContext.Provider>
    </group>
  );
}
