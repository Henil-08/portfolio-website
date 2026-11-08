"use client";

// Garage experience: the vehicle that drives into the bay, posed by its parent each frame
// (position and rotation.y on `root`). Its wheels roll with the distance it covers, through the
// game's own spin hooks; once the camera is in the seat (`inCab`), any glass and any part the
// eye sits inside turn see-through, so the cabin never hides the stage. Like the player's vehicle
// (Vehicle.tsx), its parts are baked into one mesh per material on the body and on each wheel's
// spin group once it has mounted (vehicles/merge.ts), so a vehicle of 140 parts costs the bay what
// one of 60 does; the cabin's parts stay as they are.
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RigContext, type Livery, type VehicleDef, type VehicleRig } from "../vehicles";
import { K } from "../vehicles/kit";
import { merge, unmerge, type Baked } from "../vehicles/merge";
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
  const baked = useRef<{ b: Baked | null; wait: number }>({ b: null, wait: 0 });
  useEffect(() => {
    const st = baked.current;
    return () => {
      unmerge(st.b);
      st.b = null;
    };
  }, []);

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
          if (s) s.rotation.x += ds / (w.r * S(v.code));
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
    // the bake, a few frames after mounting (dev: window.__bakeOff = true keeps the parts)
    const st = baked.current;
    const devOff = process.env.NODE_ENV !== "production" && (window as unknown as { __bakeOff?: boolean }).__bakeOff;
    if (devOff && st.b) {
      unmerge(st.b);
      st.b = null;
    } else if (!devOff && !st.b && ++st.wait > 3) {
      const anchors = new Set<THREE.Object3D>(spins.current.filter((x): x is THREE.Group => !!x));
      st.b = merge(model.current, anchors, new Set(glass.current.map((x) => x.mesh)));
    }
    const want = inCab.current;
    if (want !== ghosted.current) {
      ghosted.current = want;
      for (const { mesh, mat } of glass.current) mesh.material = want ? GHOST : mat;
    }
  });

  return (
    <group ref={model} scale={S(v.code)}>
      <RigContext.Provider value={rig}>
        <v.Model livery={livery} />
      </RigContext.Provider>
    </group>
  );
}
