"use client";

// Option 01 · Cockpit (the owner's idea): the vehicle drives into the bay and the camera moves
// into its driver's seat. One project stands on a lit stage in front; Next slides it off the
// stage and the next one slides on, and an orange square scans up it as it lands.
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Plinth } from "@/components/world/buildings/PitBuilding";
import { CI } from "@/components/world/buildings/concrete";
import { ProjectObject } from "@/components/world/models/projects";
import { BayScene, DrivingCar, EYE, OUTSIDE, S, Spot, ScanSquare, inOut, lerp, out3, parkPose, seg, setCam, useDrive, useSlide } from "./common";
import type { SceneProps } from "./types";

/** The stage at the back of the bay, and how far a project travels to leave it. */
const STAGE_Z = -2.05;
const STAGE_Y = 0.12;
const OFF = 3.4;
/** Every driver's eye ends up this far out from the back wall, so the stage frames alike. */
const EYE_Z = 1.6;
const OBJ = 1.3;
const PLINTH_H = 0.55;


function Stage() {
  return (
    <group position={[0, 0, STAGE_Z]}>
      {/* a low paper riser with an ink lip and one orange mark at its front edge */}
      <mesh position={[0, STAGE_Y / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[3.2, STAGE_Y, 1.8]} />
        <meshStandardMaterial color={CI.paper} roughness={0.7} />
      </mesh>
      <mesh position={[0, STAGE_Y / 2, 0.905]}>
        <boxGeometry args={[3.22, STAGE_Y, 0.02]} />
        <meshStandardMaterial color={CI.ink} roughness={0.6} />
      </mesh>
      <mesh position={[0, STAGE_Y + 0.002, 0.82]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.24, 0.05]} />
        <meshBasicMaterial color={CI.orange} toneMapped={false} />
      </mesh>
      {/* the stage light: a warm key from above the door side, a cooler fill from the back */}
      <Spot position={[0.8, 3.4, 1.6]} target={[0, 1.0, 0]} angle={0.55} intensity={30} />
      <pointLight position={[-1.6, 2.4, -0.6]} intensity={4} distance={5} decay={1.5} color="#ffffff" />
    </group>
  );
}

/** One project on its plinth; the carriage slides it on or off the stage. */
function Carriage({ slug, groupRef }: { slug: string; groupRef: (g: THREE.Group | null) => void }) {
  return (
    <group ref={groupRef} visible={false}>
      {/* the game's plinth, cut down so the project sits at the driver's eye */}
      <group scale={[1, PLINTH_H, 1]}>
        <Plinth />
      </group>
      <group position={[0, PLINTH_H, 0]} scale={OBJ}>
        <ProjectObject slug={slug} active />
      </group>
    </group>
  );
}

export default function Cockpit({ v, livery, domain, list, sel, dir, inside }: SceneProps) {
  const cam = useRef<THREE.PerspectiveCamera>(null!);
  const drive = useDrive(inside);
  const slide = useSlide(sel, dir);
  const items = useRef<(THREE.Group | null)[]>([]);
  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const nose = EYE_Z - (v.box.max[2] - EYE[v.code][2]) * S;
  const park = parkPose(v, 0, nose);
  const seat = park.eye;
  const target = new THREE.Vector3(0, STAGE_Y + PLINTH_H + 0.32 * OBJ, STAGE_Z);

  useFrame((s) => {
    const k = drive.current;
    const { from, to, dir: d, k: sk } = slide.current;
    // the slide: the old one leaves the way you pressed, the new one comes in from the other side
    const e = inOut(sk);
    items.current.forEach((g, i) => {
      if (!g) return;
      const leaving = i === from && from !== to && sk < 1;
      const arriving = i === to;
      g.visible = leaving || arriving;
      if (arriving) g.position.set(from === to ? 0 : d * OFF * (1 - e), STAGE_Y, STAGE_Z);
      if (leaving) g.position.set(-d * OFF * e, STAGE_Y, STAGE_Z);
      // the arriving one leans into its stop, the way a carriage settles
      g.rotation.z = arriving && from !== to ? Math.sin(sk * Math.PI) * 0.04 * d : 0;
      g.rotation.y = arriving ? Math.sin(s.clock.elapsedTime * 0.5) * 0.18 : 0;
    });

    // the camera: wide on the building, then after the car through the door and into the seat
    const kc = inOut(seg(k, 0.12, 1));
    const lift = Math.sin(kc * Math.PI) * 1.1;
    pos.current.lerpVectors(OUTSIDE.pos, seat, kc).y += lift * (1 - kc * 0.4);
    look.current.lerpVectors(OUTSIDE.look, target, out3(kc));
    setCam(cam.current, pos.current, look.current, lerp(OUTSIDE.fov, 56, kc));
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={OUTSIDE.pos.toArray()} fov={OUTSIDE.fov} near={0.04} far={160} />
      <BayScene domain={domain} lamp={10} />
      <Stage />
      {list.map((it, i) => (
        <Carriage key={it.p.slug} slug={it.p.slug} groupRef={(g) => void (items.current[i] = g)} />
      ))}
      <group position={[0, STAGE_Y + PLINTH_H, STAGE_Z]}>
        <ScanLive slide={slide} drive={drive} />
      </group>
      <DrivingCar v={v} livery={livery} x={0} nose={nose} drive={drive} />
    </>
  );
}

/** The scan square, re-rendered each frame from the clocks without React state. */
function ScanLive({ slide, drive }: { slide: ReturnType<typeof useSlide>; drive: ReturnType<typeof useDrive> }) {
  const g = useRef<THREE.Group>(null!);
  useFrame(() => {
    const { from, to, k: sk } = slide.current;
    const ks = from === to ? seg(drive.current, 0.86, 1.0) : seg(sk, 0.6, 1.0);
    const on = ks > 0 && ks < 1;
    g.current.visible = on;
    g.current.position.y = 1.45 * inOut(ks);
  });
  return (
    <group ref={g}>
      <ScanSquare size={1.25} />
    </group>
  );
}
