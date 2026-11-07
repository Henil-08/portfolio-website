"use client";

// 04 · Roller doors: behind the garage is a corridor of numbered roller doors, one per project
// (P03 painted big on each door, its plate over it). You drive in at the corridor's end and roll
// up to the first door, which rolls up into its housing and the scan line climbs the project
// standing lit in its cell. → drives on to the next door (← backs up): the door you leave rolls
// down, the camera rides alongside, the next one rolls up. Esc backs you out of the corridor.
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { ShowCar } from "@/components/world/garage/ShowCar";
import { ScanSquare } from "@/components/world/garage/Bay";
import { Plinth } from "@/components/world/buildings/PitBuilding";
import { useDrive, type Item } from "@/components/world/garage/anim";
import { ProjectObject } from "@/components/world/models/projects";
import { CI } from "@/components/world/buildings/concrete";
import { garageLabel } from "@/components/world/layout";
import { pad } from "@/components/brand/tokens";
import type { Domain } from "@/content/projects";
import { boardTexture, inOut, lerp, pose, seg, setPose, useSwitch } from "./shared";
import type { SceneProps } from "./types";
import { zoneCode } from "./common";

/** Door pitch along the corridor, the opening, the wall, where the car runs. */
const P = 3.5;
const DW = 2.5;
const DH = 2.5;
const WH = 4.2;
const WALL_Z = -2.6;
const CELL = 2.2;
const LANE_Z = 0.35;
const IN_FROM = 11;

/** A door's face: ribbed slats with its project code painted big, as a numbered garage door. */
function useDoorTex(it: Item) {
  return useMemo(
    () =>
      boardTexture(512, 512, (g, f) => {
        g.fillStyle = "#d8d5cc";
        g.fillRect(0, 0, 512, 512);
        for (let y = 0; y < 512; y += 32) {
          g.fillStyle = "#c3bfb5";
          g.fillRect(0, y + 26, 512, 6);
          g.fillStyle = "rgba(255,255,255,0.35)";
          g.fillRect(0, y, 512, 3);
        }
        g.fillStyle = CI.ink;
        g.font = `600 190px ${f.mono}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(`P${pad(it.index + 1)}`, 256, 250);
        g.fillStyle = CI.orange;
        g.fillRect(226, 370, 60, 18);
      }),
    [it],
  );
}

/** The plate over a door: the orange square, the code and the project's name. */
function usePlateTex(it: Item) {
  return useMemo(
    () =>
      boardTexture(1024, 128, (g, f) => {
        g.fillStyle = CI.paper;
        g.fillRect(0, 0, 1024, 128);
        g.fillStyle = CI.orange;
        g.fillRect(28, 32, 64, 64);
        g.fillStyle = CI.ink;
        let s = 52;
        const t = `P${pad(it.index + 1)} · ${it.p.name}`;
        g.font = `500 ${s}px ${f.mono}`;
        while (g.measureText(t).width > 880 && s > 28) g.font = `500 ${(s -= 2)}px ${f.mono}`;
        g.textBaseline = "middle";
        g.fillText(t, 120, 66);
      }),
    [it],
  );
}

/** The sign at the corridor's mouth: the garage's code and name. */
function useSignTex(domain: Domain) {
  return useMemo(
    () =>
      boardTexture(512, 256, (g, f) => {
        g.fillStyle = CI.ink;
        g.fillRect(0, 0, 512, 256);
        g.fillStyle = CI.orange;
        g.fillRect(36, 40, 40, 40);
        g.fillStyle = CI.paper;
        g.font = `500 44px ${f.mono}`;
        g.textBaseline = "middle";
        g.fillText(zoneCode(domain), 100, 62);
        g.font = `600 64px ${f.sans}`;
        g.fillText(garageLabel[domain].toUpperCase(), 36, 170);
      }),
    [domain],
  );
}

const concrete = new THREE.MeshStandardMaterial({ color: "#cbc7bd", roughness: 0.95 });
const floorMat = new THREE.MeshStandardMaterial({ color: "#bdb9b0", roughness: 0.9 });
const inner = new THREE.MeshStandardMaterial({ color: "#ece9e1", roughness: 0.85, emissive: "#ece9e1", emissiveIntensity: 0.18 });
const ink = new THREE.MeshStandardMaterial({ color: CI.ink, roughness: 0.55, metalness: 0.2 });

/** One door: its opening's cell (pale, a light along the top), the project on a plinth, the door that rolls. */
function Door({ it, x, doorRef, objRef }: { it: Item; x: number; doorRef: (g: THREE.Group | null) => void; objRef: (g: THREE.Group | null) => void }) {
  const face = useDoorTex(it);
  const plate = usePlateTex(it);
  return (
    <group position={[x, 0, 0]}>
      {/* the cell behind the opening */}
      <mesh position={[0, DH / 2, WALL_Z - 0.15 - CELL]} material={inner} receiveShadow>
        <boxGeometry args={[DW, DH, 0.05]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * DW) / 2, DH / 2, WALL_Z - 0.15 - CELL / 2]} material={inner} receiveShadow>
          <boxGeometry args={[0.05, DH, CELL]} />
        </mesh>
      ))}
      <mesh position={[0, DH, WALL_Z - 0.15 - CELL / 2]} material={inner}>
        <boxGeometry args={[DW, 0.05, CELL]} />
      </mesh>
      <mesh position={[0, DH - 0.06, WALL_Z - 0.2 - CELL + 0.05]}>
        <boxGeometry args={[DW - 0.3, 0.04, 0.04]} />
        <meshBasicMaterial color="#fff6e6" toneMapped={false} />
      </mesh>
      <group position={[0, 0, WALL_Z - 0.15 - CELL * 0.55]} scale={[0.9, 0.42, 0.9]}>
        <Plinth />
      </group>
      <group ref={objRef} position={[0, 0.42, WALL_Z - 0.15 - CELL * 0.55]} scale={1.45} visible={false}>
        <ProjectObject slug={it.p.slug} active />
      </group>
      {/* the frame, the roller's housing, the plate */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (DW / 2 + 0.06), DH / 2, WALL_Z + 0.16]} material={ink}>
          <boxGeometry args={[0.12, DH, 0.08]} />
        </mesh>
      ))}
      <mesh position={[0, DH + 0.2, WALL_Z + 0.22]} material={ink} castShadow>
        <boxGeometry args={[DW + 0.24, 0.4, 0.2]} />
      </mesh>
      <mesh position={[0, DH + 0.75, WALL_Z + 0.152]}>
        <planeGeometry args={[2.4, 0.3]} />
        <meshStandardMaterial map={plate} roughness={0.7} />
      </mesh>
      {/* the door: hangs from the top of the opening, shortens as it rolls up */}
      <group ref={doorRef} position={[0, DH, WALL_Z + 0.1]}>
        <mesh position={[0, -DH / 2, 0]} castShadow>
          <boxGeometry args={[DW, DH, 0.05]} />
          <meshStandardMaterial map={face} roughness={0.75} metalness={0.15} />
        </mesh>
        <mesh position={[0, -DH + 0.04, 0.03]}>
          <boxGeometry args={[DW, 0.08, 0.04]} />
          <meshStandardMaterial color={CI.ink} roughness={0.5} />
        </mesh>
      </group>
      {/* the stop line on the corridor floor in front of it */}
      <mesh position={[0, 0.004, WALL_Z + 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[DW, 0.06]} />
        <meshBasicMaterial color={CI.paper} />
      </mesh>
    </group>
  );
}

export default function RollerDoors({ v, livery, domain, list, sel, dir, inside }: SceneProps) {
  const cam = useRef<THREE.PerspectiveCamera>(null!);
  const drive = useDrive(inside);
  const sw = useSwitch(sel, dir, 2.1);
  const car = useRef<THREE.Group>(null);
  const inCab = useRef(false);
  const doors = useRef<(THREE.Group | null)[]>([]);
  const objs = useRef<(THREE.Group | null)[]>([]);
  const scan = useRef<THREE.Group>(null!);
  const spot = useRef<THREE.SpotLight>(null!);
  const [target] = useState(() => new THREE.Object3D());
  const sign = useSignTex(domain);
  const n = list.length;
  const t = useRef({ view: pose([0, 0, 0], [0, 0, 0], 44), camX: 0 });
  const span = (n - 1) * P;

  useFrame((s, dt) => {
    const c = t.current;
    const k = drive.current;
    const { from, to, k: sk } = sw.current;
    const first = from === to;
    // the car: in from the corridor's mouth to the first door, then door to door
    const doorX = first ? to * P : lerp(from * P, to * P, inOut(seg(sk, 0.12, 0.78)));
    const carX = lerp(-IN_FROM, doorX, inOut(seg(k, 0, 0.8)));
    const g = car.current!;
    g.position.set(carX, 0, LANE_Z);
    g.rotation.y = Math.PI / 2;
    // the camera rides alongside, a beat behind, and leans back a little while it moves
    c.camX = k < 0.999 && first ? carX : lerp(c.camX, carX, Math.min(1, dt * 5));
    if (s.clock.elapsedTime < 0.2) c.camX = carX;
    const moving = first ? 1 - seg(k, 0.6, 0.9) : Math.sin(seg(sk, 0.1, 0.85) * Math.PI);
    // stopped, it leans in toward the open door; on the move it rides back alongside the car
    c.view.pos.set(c.camX - 0.25 - moving * 1.45, 2.05 + moving * 0.25, 3.55 + moving * 2.05);
    c.view.look.set(c.camX + 0.05 + moving * 0.7, 1.0 + moving * 0.15, WALL_Z - 1.1 + moving * 0.5);
    c.view.fov = 42 + moving * 8;
    setPose(cam.current, c.view);

    // the doors: yours rolls up, the one you left rolls down
    for (let i = 0; i < n; i++) {
      let up = 0;
      if (first) up = i === to ? 1 : 0;
      else if (i === to) up = inOut(seg(sk, 0.7, 1));
      else if (i === from) up = 1 - inOut(seg(sk, 0, 0.3));
      up *= inOut(seg(k, 0.72, 1));
      const d = doors.current[i];
      if (d) d.scale.y = Math.max(0.03, 1 - up * 0.97);
      const o = objs.current[i];
      if (o) {
        o.visible = up > 0.02;
        o.rotation.y = Math.sin(s.clock.elapsedTime * 0.5) * 0.3;
      }
    }
    const sc = first ? seg(k, 0.82, 1) : seg(sk, 0.8, 1);
    scan.current.visible = sc > 0.001 && sc < 0.999;
    scan.current.position.set(to * P, 0.42 + 1.4 * sc, WALL_Z - 0.15 - CELL * 0.55);
    target.position.set(to * P, 0.9, WALL_Z - 1.4);
    spot.current.position.set(to * P + 0.3, 3.8, 0.6);
    spot.current.intensity = 26 * (first ? seg(k, 0.7, 1) : seg(sk, 0.65, 1));
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={[-IN_FROM - 1, 2, 5]} fov={44} near={0.05} far={160} />
      <color attach="background" args={["#ebe9e3"]} />
      <fog attach="fog" args={["#ebe9e3", 14, 42]} />
      <hemisphereLight args={["#ffffff", "#b8b4a9", 1.0]} />
      <directionalLight position={[6, 12, 9]} intensity={1.6} color="#fff6ea" />
      <primitive object={target} />
      <spotLight ref={spot} target={target} angle={0.45} penumbra={0.7} intensity={0} distance={9} decay={1.4} color={CI.lamp} />
      {/* the corridor: floor, the wall with an opening per door, a ceiling strip over the lane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[span / 2, 0, 0]} material={floorMat} receiveShadow>
        <planeGeometry args={[span + 40, 14]} />
      </mesh>
      <mesh position={[span / 2, 0.003, LANE_Z + 1.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[span + 30, 0.08]} />
        <meshBasicMaterial color={CI.ink} />
      </mesh>
      {Array.from({ length: n + 1 }, (_, i) => {
        // the wall between openings (and the long ends)
        const x0 = i === 0 ? -IN_FROM - 6 : (i - 1) * P + DW / 2 + 0.12;
        const x1 = i === n ? span + 8 : i * P - DW / 2 - 0.12;
        return (
          <mesh key={i} position={[(x0 + x1) / 2, WH / 2, WALL_Z]} material={concrete} receiveShadow>
            <boxGeometry args={[x1 - x0, WH, 0.3]} />
          </mesh>
        );
      })}
      {list.map((_, i) => (
        <mesh key={i} position={[i * P, (DH + WH) / 2, WALL_Z]} material={concrete}>
          <boxGeometry args={[DW + 0.24, WH - DH, 0.3]} />
        </mesh>
      ))}
      <mesh position={[span / 2, WH + 0.06, WALL_Z + 0.4]} material={ink}>
        <boxGeometry args={[span + IN_FROM + 14, 0.12, 1.1]} />
      </mesh>
      <mesh position={[span / 2, WH - 0.01, WALL_Z + 0.75]}>
        <boxGeometry args={[span + IN_FROM + 13, 0.03, 0.06]} />
        <meshBasicMaterial color="#fff6e6" toneMapped={false} />
      </mesh>
      {/* the sign at the mouth */}
      <mesh position={[-IN_FROM + 3.5, 2.1, WALL_Z + 0.152]}>
        <planeGeometry args={[2.0, 1.0]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {list.map((it, i) => (
        <Door key={it.p.slug} it={it} x={i * P} doorRef={(g) => void (doors.current[i] = g)} objRef={(g) => void (objs.current[i] = g)} />
      ))}
      <group ref={scan} visible={false}>
        <ScanSquare size={1.4} />
      </group>
      <group ref={car} position={[-IN_FROM, 0, LANE_Z]} rotation={[0, Math.PI / 2, 0]}>
        <ShowCar key={`${v.code}-${livery.name}`} v={v} livery={livery} root={car} inCab={inCab} />
      </group>
    </>
  );
}
