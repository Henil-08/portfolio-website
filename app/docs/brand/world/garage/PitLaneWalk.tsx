"use client";

// 01 · Pit lane walk: the garage's projects are parked in a row across the bay like a team's
// line-up, each on its own stand with a pit board on a pole beside it. You drive in and the
// camera gets out and walks the line: ← → tracks it sideways to the next stand, pulling back a
// little on the way; the one you stop at turns to face you, its stand's edge lights orange and
// its pit board swings out to you (code, name, the figure that matters), while the one you left
// turns back and its board swings edge-on again. The datasheet slides in beside.
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { ShowCar } from "@/components/world/garage/ShowCar";
import { OUT_Z, useDrive } from "@/components/world/garage/anim";
import { ProjectObject } from "@/components/world/models/projects";
import { CI } from "@/components/world/buildings/concrete";
import { DOMAINS } from "@/content/projects";
import { pad } from "@/components/brand/tokens";
import type { Item } from "@/components/world/garage/anim";
import { BayScene, OUTSIDE } from "./common";
import { blendIn, boardTexture, chaseOf, inOut, lerp, pose, seg, setPose, useSwitch } from "./shared";
import type { SceneProps } from "./types";

const ROW_Z = -1.55;
const PARK_Z = 2.75;
/** How far apart the stands are: as wide as the bay allows, never wider than 1.5 m. */
const pitch = (n: number) => Math.min(1.5, 9.4 / Math.max(1, n));
const xOf = (i: number, n: number) => (i - (n - 1) / 2) * pitch(n);

/** The pit board: the project's code big, its name, the figure in orange, as a crew holds it out. */
function useBoard(it: Item) {
  return useMemo(
    () =>
      boardTexture(512, 368, (g, f) => {
        g.fillStyle = CI.ink;
        g.fillRect(0, 0, 512, 368);
        g.strokeStyle = CI.paper;
        g.lineWidth = 6;
        g.strokeRect(12, 12, 488, 344);
        g.fillStyle = CI.orange;
        g.fillRect(34, 36, 30, 30);
        g.fillStyle = CI.paper;
        g.font = `500 28px ${f.mono}`;
        g.textBaseline = "middle";
        g.fillText(DOMAINS.find((d) => d.id === it.p.domain)!.label.toUpperCase().slice(0, 22), 80, 52);
        g.font = `600 150px ${f.mono}`;
        g.textBaseline = "alphabetic";
        g.fillText(`P${pad(it.index + 1)}`, 30, 210);
        let s = 40;
        g.font = `600 ${s}px ${f.sans}`;
        while (g.measureText(it.p.name).width > 450 && s > 22) g.font = `600 ${(s -= 2)}px ${f.sans}`;
        g.fillText(it.p.name, 34, 266);
        g.fillStyle = CI.orange;
        let fs = 54;
        g.font = `600 ${fs}px ${f.mono}`;
        while (g.measureText(it.p.headline.value).width > 450 && fs > 26) g.font = `600 ${(fs -= 4)}px ${f.mono}`;
        g.fillText(it.p.headline.value, 32, 330);
      }),
    [it],
  );
}

/** One stand: a chamfer-topped concrete block with an ink plate, the project on it, the pit board. */
function Stand({ it, x, objRef, boardRef, edgeRef }: { it: Item; x: number; objRef: (g: THREE.Group | null) => void; boardRef: (g: THREE.Group | null) => void; edgeRef: (m: THREE.MeshBasicMaterial | null) => void }) {
  const tex = useBoard(it);
  return (
    <group position={[x, 0, ROW_Z]}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.72, 0.4, 0.72]} />
        <meshStandardMaterial color={CI.concrete} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.415, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.76, 0.03, 0.76]} />
        <meshStandardMaterial color={CI.ink} roughness={0.6} />
      </mesh>
      {/* the stand's front edge: ink, orange while it is the one you're at */}
      <mesh position={[0, 0.415, 0.385]}>
        <boxGeometry args={[0.76, 0.03, 0.012]} />
        <meshBasicMaterial ref={edgeRef} color={CI.ink} toneMapped={false} />
      </mesh>
      <group ref={objRef} position={[0, 0.43, 0]} scale={0.78}>
        <ProjectObject slug={it.p.slug} active />
      </group>
      {/* the pit board on its pole, behind and to the right */}
      <mesh position={[0.5, 0.66, -0.22]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 1.32, 8]} />
        <meshStandardMaterial color={CI.ink} roughness={0.5} metalness={0.3} />
      </mesh>
      <group ref={boardRef} position={[0.5, 1.42, -0.22]}>
        <mesh castShadow>
          <boxGeometry args={[0.6, 0.43, 0.02]} />
          <meshStandardMaterial color={CI.ink} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.011]}>
          <planeGeometry args={[0.58, 0.416]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** easeOutBack: the board swings out a touch past square and settles. */
const outBack = (k: number) => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);

export default function PitLaneWalk({ v, livery, domain, list, sel, dir, inside }: SceneProps) {
  const cam = useRef<THREE.PerspectiveCamera>(null!);
  const drive = useDrive(inside);
  const sw = useSwitch(sel, dir, 0.95);
  const car = useRef<THREE.Group>(null);
  const inCab = useRef(false);
  const objs = useRef<(THREE.Group | null)[]>([]);
  const boards = useRef<(THREE.Group | null)[]>([]);
  const edges = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const spot = useRef<THREE.SpotLight>(null!);
  const [target] = useState(() => new THREE.Object3D());
  const n = list.length;
  const t = useRef({ chase: pose([0, 0, 0], [0, 0, 0], 46), walk: pose([0, 0, 0], [0, 0, 0], 40), out: pose([0, 0, 0], [0, 0, 0], 40), ink: new THREE.Color(CI.ink), orange: new THREE.Color(CI.orange) });

  useFrame((s) => {
    const c = t.current;
    const k = drive.current;
    const { from, to, k: sk } = sw.current;
    const first = from === to;
    // the stand-in rolls in and parks across the door; the camera gets out over it
    const g = car.current!;
    g.position.set(0, 0, lerp(OUT_Z, PARK_Z, inOut(seg(k, 0, 0.75))));
    g.rotation.y = Math.PI;
    chaseOf(g.position, Math.PI, c.chase);
    // the walk: sideways along the row to the stand, pulling back a little on the way
    const e = inOut(sk);
    const xc = first ? xOf(to, n) : lerp(xOf(from, n), xOf(to, n), e);
    const back = first ? 0 : Math.sin(sk * Math.PI);
    c.walk.pos.set(xc, 1.42 + back * 0.12, 2.0 + back * 0.6);
    c.walk.look.set(xc + (first ? 0 : (xOf(to, n) - xOf(from, n)) * 0.12 * back), 0.9, ROW_Z);
    c.walk.fov = 44 + back * 4;
    setPose(cam.current, blendIn(k, c.chase, c.walk, c.out, 0.5, 0.4));
    inCab.current = false;

    // who is lit: the one you're at, the one you're leaving fading out
    const arrive = (first ? inOut(seg(k, 0.65, 1)) : inOut(seg(sk, 0.35, 1)));
    const leave = first ? 0 : 1 - inOut(seg(sk, 0, 0.45));
    for (let i = 0; i < n; i++) {
      const a = i === to ? arrive : i === from ? leave : 0;
      const o = objs.current[i];
      if (o) {
        o.rotation.y = lerp(-0.65, Math.sin(s.clock.elapsedTime * 0.6) * 0.35, a);
        o.scale.setScalar(0.78 + 0.14 * a);
      }
      const b = boards.current[i];
      if (b) b.rotation.y = lerp(Math.PI / 2 - 0.12, 0, i === to ? outBack(arrive) : a);
      edges.current[i]?.color.lerpColors(c.ink, c.orange, a);
    }
    // one light over the stand you're at
    target.position.set(xc, 0.6, ROW_Z);
    spot.current.position.set(xc + 0.4, 3.6, ROW_Z + 1.6);
    spot.current.intensity = 22 * inOut(seg(k, 0.4, 0.9));
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={OUTSIDE.pos.toArray()} fov={OUTSIDE.fov} near={0.03} far={160} />
      <BayScene domain={domain} lamp={7} />
      <primitive object={target} />
      <spotLight ref={spot} target={target} angle={0.42} penumbra={0.7} intensity={0} distance={7} decay={1.5} color={CI.lamp} />
      {/* the line the stands are parked on, ink, with a tick in front of each */}
      <mesh position={[0, 0.004, ROW_Z + 0.62]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[pitch(n) * n, 0.03]} />
        <meshBasicMaterial color={CI.ink} />
      </mesh>
      {list.map((it, i) => (
        <group key={it.p.slug}>
          <mesh position={[xOf(i, n), 0.005, ROW_Z + 0.7]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.03, 0.16]} />
            <meshBasicMaterial color={CI.ink} />
          </mesh>
          <Stand
            it={it}
            x={xOf(i, n)}
            objRef={(g) => void (objs.current[i] = g)}
            boardRef={(g) => void (boards.current[i] = g)}
            edgeRef={(m) => void (edges.current[i] = m)}
          />
        </group>
      ))}
      <group ref={car} position={[0, 0, OUT_Z]} rotation={[0, Math.PI, 0]}>
        <ShowCar key={`${v.code}-${livery.name}`} v={v} livery={livery} root={car} inCab={inCab} />
      </group>
    </>
  );
}
