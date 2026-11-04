"use client";

// Garage experience · Cockpit + pit wall, the docs mock: the game's own garage pieces
// (components/world/garage) in a bay of their own, with the vehicle waiting on the pit lane
// straight out of the door and the establishing shot as the camera's starting pose.
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { BayLights, GarageBay } from "@/components/world/garage/Bay";
import { ShowCar } from "@/components/world/garage/ShowCar";
import { OUT_Z, blendCamera, cockpitPoses, glanceOf, inOut, lerp, newPoses, parkZ, seg, useDrive, useSlide } from "@/components/world/garage/anim";
import { BayScene, OUTSIDE, setCam } from "./common";
import type { SceneProps } from "./types";

export default function CockpitWall({ v, livery, domain, list, sel, dir, inside, onPick }: SceneProps) {
  const cam = useRef<THREE.PerspectiveCamera>(null!);
  const drive = useDrive(inside);
  const slide = useSlide(sel, dir);
  const car = useRef<THREE.Group>(null);
  const inCab = useRef(false);
  const scratch = useRef({ poses: newPoses(), p: new THREE.Vector3(), l: new THREE.Vector3() });

  useFrame(() => {
    const t = scratch.current;
    const k = drive.current;
    const g = car.current!;
    // off the pit lane, through the door, to a stop with the eye at EYE_Z
    g.position.set(0, 0, lerp(OUT_Z, parkZ(v.code), inOut(seg(k, 0, 0.8))));
    g.rotation.y = Math.PI;
    cockpitPoses(t.poses, k, v.code, g.position, Math.PI, glanceOf(slide.current));
    const fov = blendCamera(t.poses, OUTSIDE.pos, OUTSIDE.look, OUTSIDE.fov, t.p, t.l);
    setCam(cam.current, t.p, t.l, fov);
    inCab.current = t.poses.b > 0.8;
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={OUTSIDE.pos.toArray()} fov={OUTSIDE.fov} near={0.03} far={160} />
      <BayScene domain={domain} lamp={9} />
      <BayLights />
      <GarageBay list={list} drive={drive} slide={slide} onPick={onPick} />
      <group ref={car} position={[0, 0, OUT_Z]} rotation={[0, Math.PI, 0]}>
        <ShowCar key={`${v.code}-${livery.name}`} v={v} livery={livery} root={car} inCab={inCab} />
      </group>
    </>
  );
}
