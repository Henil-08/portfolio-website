"use client";

// 02 · Teardown, the docs mock: the game's own teardown studio (components/world/garage/teardown)
// in a bay of its own. The stand-in drives in through the door and pulls aside to park by the
// drafting table while the camera rises out of its chase into the drawing view.
import { useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { ShowCar } from "@/components/world/garage/ShowCar";
import { Spot } from "@/components/world/garage/Bay";
import { OUT_Z, useDrive } from "@/components/world/garage/anim";
import { PARK_WAY, Studio, TZ, Table, TeardownCallouts, VIEW, projectCallouts, teardownView } from "@/components/world/garage/teardown/studio";
import { BayScene, OUTSIDE } from "./common";
import { blendIn, chaseOf, inOut, pose, seg, setPose } from "./shared";
import type { OverlayProps, SceneProps } from "./types";

export default function Teardown({ v, livery, list, sel, inside, domain }: SceneProps) {
  const cam = useRef<THREE.PerspectiveCamera>(null!);
  const drive = useDrive(inside);
  const car = useRef<THREE.Group>(null);
  const inCab = useRef(false);
  const size = useThree((s) => s.size);
  const [fit] = useState(() => ({ dist: 4, look: new THREE.Vector3(0, 1, TZ) }));
  const t = useRef({ chase: pose([0, 0, 0], [0, 0, 0], 46), view: pose([0, 0, 0], [0, 0, 0], VIEW.fov), out: pose([0, 0, 0], [0, 0, 0], VIEW.fov), p: new THREE.Vector3(), tan: new THREE.Vector3() });

  useFrame((s, dt) => {
    const c = t.current;
    const k = drive.current;
    // the stand-in: in through the door, aside to park by the table, wheels turning
    const g = car.current!;
    const u = inOut(seg(k, 0, 0.78));
    PARK_WAY.getPoint(u, c.p);
    PARK_WAY.getTangent(Math.min(0.999, Math.max(0.001, u)), c.tan);
    g.position.copy(c.p);
    g.rotation.y = Math.atan2(c.tan.x, c.tan.z);
    chaseOf(g.position, g.rotation.y, c.chase);
    teardownView(c.view, fit, cam.current.aspect || 1, size.width, s.clock.elapsedTime, dt);
    c.view.fov = VIEW.fov;
    setPose(cam.current, blendIn(k, c.chase, c.view, c.out, 0.45, 0.35));
    inCab.current = false;
    cam.current.updateMatrixWorld();
    projectCallouts(cam.current);
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={OUTSIDE.pos.toArray()} fov={OUTSIDE.fov} near={0.03} far={160} />
      <BayScene domain={domain} lamp={11} />
      <Spot position={[0.9, 4.2, TZ + 2.2]} target={[0, 0.9, TZ]} angle={0.55} intensity={20} />
      <Studio drawings />
      <Table key={list.map((x) => x.p.slug).join()} list={list} sel={sel} inside={inside} drive={drive} />
      <group ref={car} position={[0, 0, OUT_Z]} rotation={[0, Math.PI, 0]}>
        <ShowCar key={`${v.code}-${livery.name}`} v={v} livery={livery} root={car} inCab={inCab} />
      </group>
    </>
  );
}

/** The callouts over the mock's 3D cell. */
export function TeardownOverlay({ inside }: OverlayProps) {
  return <TeardownCallouts inside={inside} />;
}
