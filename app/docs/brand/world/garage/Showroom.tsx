"use client";

// Option 02 · Showroom turntable: the vehicle parks to one side and a turntable set in the bay
// floor carries the garage's projects round on low plinths, the way the vehicle select turns
// its vehicle. ← → turn it one stop; the one at the front is lit, lifted and scanned.
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Plinth } from "@/components/world/buildings/PitBuilding";
import { CI } from "@/components/world/buildings/concrete";
import { ProjectObject } from "@/components/world/models/projects";
import { BayScene, DrivingCar, ScanSquare, backOut, fonts, Spot, glide, inOut, out3, seg, useCanvasTexture, useDrive, useSlide, useTmp, zoneCode } from "./common";
import type { SceneProps } from "./types";

const C = new THREE.Vector3(0.95, 0, -1.05);
const TABLE_R = 2.15;
const TABLE_H = 0.14;
const RING = 1.42;
const PL = 0.42; // plinth height on the table
const OBJ = 0.7;
const CAR_X = -2.35;

const IN = { pos: new THREE.Vector3(-0.5, 2.05, 4.5), look: new THREE.Vector3(0.5, 0.8, C.z + RING * 0.6), fov: 50 };
/** The front stop faces the camera, not the door, so the project on show squares up to you. */
const FRONT = Math.atan2(IN.pos.x - C.x, IN.pos.z - C.z);
const FX = Math.sin(FRONT) * RING;
const FZ = Math.cos(FRONT) * RING;

/** The table top: a paper disc with a dial of ticks and the garage's code, like the select plinth. */
function useTop(code: string, n: number) {
  return useCanvasTexture(
    1024,
    1024,
    (g) => {
      const R = 512;
      g.fillStyle = CI.paper;
      g.fillRect(0, 0, 1024, 1024);
      g.translate(R, R);
      g.strokeStyle = "#cfcdc4";
      g.lineWidth = 3;
      for (const r of [0.93, 0.42]) {
        g.beginPath();
        g.arc(0, 0, R * r, 0, Math.PI * 2);
        g.stroke();
      }
      for (let i = 0; i < 120; i++) {
        const a = Math.PI / 2 + (i / 120) * Math.PI * 2;
        const long = i % (120 / n) === 0 || i % 10 === 0;
        g.strokeStyle = long ? CI.ink : "#5d5d58";
        g.lineWidth = long ? 5 : 2.5;
        g.beginPath();
        g.moveTo(Math.cos(a) * R * (long ? 0.94 : 0.96), Math.sin(a) * R * (long ? 0.94 : 0.96));
        g.lineTo(Math.cos(a) * R * 0.99, Math.sin(a) * R * 0.99);
        g.stroke();
      }
      const f = fonts();
      g.fillStyle = "rgba(93,93,88,0.55)";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `600 54px ${f.mono}`;
      g.fillText(code, 0, 0);
      g.font = `500 22px ${f.mono}`;
      g.fillText("HG-08 / SHOWROOM", 0, 50);
    },
    `${code}:${n}`,
  );
}

export default function Showroom({ v, livery, domain, list, sel, dir, inside, onPick }: SceneProps) {
  const cam = useRef<THREE.PerspectiveCamera>(null!);
  const tmp = useTmp();
  const drive = useDrive(inside);
  const slide = useSlide(sel, dir);
  const table = useRef<THREE.Group>(null!);
  const items = useRef<(THREE.Group | null)[]>([]);
  const scan = useRef<THREE.Group>(null!);
  const pointer = useRef<THREE.Mesh>(null!);
  const n = list.length;
  const step = (Math.PI * 2) / n;
  // the table's angle: it turns one stop per press, the way you pressed, never the long way
  const turn = useRef({ to: sel, a0: FRONT - sel * step, a1: FRONT - sel * step });
  const top = useTop(zoneCode(domain), n);

  useFrame((s) => {
    const T = turn.current;
    const sc = slide.current;
    if (T.to !== sc.to) {
      const fwd = (((sc.to - T.to) % n) + n) % n;
      const delta = sc.dir > 0 ? fwd : fwd - n;
      T.a0 = table.current.rotation.y;
      T.a1 = T.a1 - delta * step;
      T.to = sc.to;
    }
    const ke = out3(sc.k);
    table.current.rotation.y = T.a0 + (T.a1 - T.a0) * ke;
    // the one at the front lifts a little and turns to show itself
    items.current.forEach((g, i) => {
      if (!g) return;
      const front = i === sc.to;
      const lift = front ? backOut(seg(sc.from === sc.to ? drive.current : sc.k, 0.55, 1), 2) : 0;
      const obj = g.children[1] as THREE.Group;
      obj.scale.setScalar(OBJ * (1 + 0.55 * lift));
      obj.position.y = PL + 0.04 * lift;
      obj.rotation.y = front ? Math.sin(s.clock.elapsedTime * 0.6) * 0.3 * lift : 0;
    });
    const ks = sc.from === sc.to ? seg(drive.current, 0.86, 1) : seg(sc.k, 0.6, 1);
    scan.current.visible = ks > 0 && ks < 1;
    scan.current.position.y = TABLE_H + PL + 1.25 * inOut(ks);
    pointer.current.scale.x = 0.2 + 0.8 * out3(seg(sc.k, 0.5, 1));
    glide(cam.current, drive.current, IN.pos, IN.look, IN.fov, tmp);
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault fov={34} near={0.05} far={160} />
      <BayScene domain={domain} lamp={8} />
      {/* the turntable, set flush into the floor: paper top, ink band */}
      <group position={C.toArray()}>
        <mesh position={[0, TABLE_H / 2, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[TABLE_R, TABLE_R, TABLE_H, 96]} />
          <meshStandardMaterial color={CI.paper} roughness={0.8} />
        </mesh>
        <mesh position={[0, TABLE_H * 0.55, 0]}>
          <cylinderGeometry args={[TABLE_R + 0.006, TABLE_R + 0.006, TABLE_H * 0.5, 96, 1, true]} />
          <meshStandardMaterial color={CI.ink} roughness={0.8} />
        </mesh>
        <group ref={table} rotation={[0, FRONT - sel * step, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TABLE_H + 0.002, 0]} receiveShadow>
            <circleGeometry args={[TABLE_R, 96]} />
            <meshStandardMaterial map={top} roughness={0.85} />
          </mesh>
          {list.map((it, i) => (
            <group
              key={it.p.slug}
              ref={(g) => void (items.current[i] = g)}
              position={[Math.sin(i * step) * RING, TABLE_H, Math.cos(i * step) * RING]}
              rotation={[0, i * step, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onPick(i);
              }}
            >
              <group scale={[0.62, PL, 0.62]}>
                <Plinth />
              </group>
              <group position={[0, PL, 0]} scale={OBJ}>
                <ProjectObject slug={it.p.slug} active />
              </group>
            </group>
          ))}
        </group>
        {/* the fixed front mark: an orange bar on the table's edge that draws out as it stops */}
        <mesh ref={pointer} position={[Math.sin(FRONT) * (TABLE_R - 0.06), TABLE_H + 0.004, Math.cos(FRONT) * (TABLE_R - 0.06)]} rotation={[-Math.PI / 2, 0, FRONT]}>
          <planeGeometry args={[0.5, 0.05]} />
          <meshBasicMaterial color={CI.orange} toneMapped={false} />
        </mesh>
        <group ref={scan} position={[FX, 0, FZ]} rotation={[0, FRONT, 0]}>
          <ScanSquare size={0.95} />
        </group>
        <Spot position={[FX * 1.4, 3.3, FZ + 1.6]} target={[FX, 0.8, FZ]} angle={0.42} intensity={26} distance={7} />
      </group>
      <DrivingCar v={v} livery={livery} x={CAR_X} nose={-1.55} drive={drive} from={CAR_X} />
    </>
  );
}
