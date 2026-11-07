"use client";

// 03 · On-board display: you never get out. The stand-in drives in and the camera settles at
// the driver's eye; the bay is bare but for a stage ahead. The car's own display is the browser:
// a dash panel at the bottom of the view (shift lights, one per project, the one you're on
// orange; a rotary strip of project codes; the paddles either side) and a heads-up frame round
// the stage with the project's code, name and figure decoding in. A paddle (or ← →) turns the
// rotary: the project on the stage drops through the scan line and the next one materialises
// up through it.
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { ShowCar } from "@/components/world/garage/ShowCar";
import { ScanSquare, Spot } from "@/components/world/garage/Bay";
import { Plinth } from "@/components/world/buildings/PitBuilding";
import { OUT_Z, blendCamera, cockpitPoses, inOut, lerp, newPoses, parkZ, seg, useDrive } from "@/components/world/garage/anim";
import { ProjectObject } from "@/components/world/models/projects";
import { CI } from "@/components/world/buildings/concrete";
import { Decode } from "@/components/brand/motion";
import { pad } from "@/components/brand/tokens";
import { BayScene, OUTSIDE, setCam } from "./common";
import { useSwitch } from "./shared";
import type { OverlayProps, SceneProps } from "./types";

const STAGE_Z = -1.15;
const TOP = 0.62;
const SCALE = 1.7;
const LOOK = new THREE.Vector3(0, 1.12, STAGE_Z);

export default function OnBoard({ v, livery, domain, list, sel, dir, inside }: SceneProps) {
  const cam = useRef<THREE.PerspectiveCamera>(null!);
  const drive = useDrive(inside);
  const sw = useSwitch(sel, dir, 0.9);
  const car = useRef<THREE.Group>(null);
  const inCab = useRef(false);
  const objs = useRef<(THREE.Group | null)[]>([]);
  const scan = useRef<THREE.Group>(null!);
  const t = useRef({ poses: newPoses(), p: new THREE.Vector3(), l: new THREE.Vector3() });

  useFrame((s) => {
    const c = t.current;
    const k = drive.current;
    const g = car.current!;
    g.position.set(0, 0, lerp(OUT_Z, parkZ(v.code), inOut(seg(k, 0, 0.8))));
    g.rotation.y = Math.PI;
    cockpitPoses(c.poses, k, v.code, g.position, Math.PI);
    c.poses.look.copy(LOOK);
    const fov = blendCamera(c.poses, OUTSIDE.pos, OUTSIDE.look, OUTSIDE.fov, c.p, c.l, cam.current.aspect);
    setCam(cam.current, c.p, c.l, fov);
    inCab.current = c.poses.b > 0.8;

    // the stage: the old one squashes down through the scan line, the new one grows up through it
    const { from, to, k: sk } = sw.current;
    const first = from === to;
    const up = first ? inOut(seg(k, 0.7, 0.95)) : inOut(seg(sk, 0.45, 1));
    const down = first ? 0 : 1 - inOut(seg(sk, 0, 0.42));
    list.forEach((_, i) => {
      const o = objs.current[i];
      if (!o) return;
      const m = i === to ? up : i === from ? down : 0;
      o.visible = m > 0.001;
      o.scale.set(SCALE, SCALE * Math.max(0.02, m), SCALE);
      o.rotation.y = Math.sin(s.clock.elapsedTime * 0.5) * 0.25;
    });
    const sc = first ? seg(k, 0.7, 0.95) : sk < 0.43 ? 1 - seg(sk, 0, 0.42) : seg(sk, 0.45, 1);
    scan.current.visible = sc > 0.001 && sc < 0.999;
    scan.current.position.y = TOP + 1.45 * sc;
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={OUTSIDE.pos.toArray()} fov={OUTSIDE.fov} near={0.03} far={160} />
      <BayScene domain={domain} lamp={8} />
      <Spot position={[0.9, 3.6, STAGE_Z + 1.8]} target={[0, 1.0, STAGE_Z]} angle={0.5} intensity={24} />
      {/* the stage: a paper riser, a concrete plinth on it */}
      <mesh position={[0, 0.06, STAGE_Z]} receiveShadow castShadow>
        <boxGeometry args={[2.6, 0.12, 1.5]} />
        <meshStandardMaterial color={CI.paper} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.06, STAGE_Z + 0.755]}>
        <boxGeometry args={[2.62, 0.12, 0.02]} />
        <meshStandardMaterial color={CI.ink} roughness={0.6} />
      </mesh>
      <group position={[0, 0.12, STAGE_Z]} scale={[1, 0.5, 1]}>
        <Plinth />
      </group>
      {list.map((it, i) => (
        <group key={it.p.slug} ref={(g) => void (objs.current[i] = g)} position={[0, TOP, STAGE_Z]} visible={false}>
          <ProjectObject slug={it.p.slug} active />
        </group>
      ))}
      <group ref={scan} position={[0, TOP, STAGE_Z]} visible={false}>
        <ScanSquare size={1.5} />
      </group>
      <group ref={car} position={[0, 0, OUT_Z]} rotation={[0, Math.PI, 0]}>
        <ShowCar key={`${v.code}-${livery.name}`} v={v} livery={livery} root={car} inCab={inCab} />
      </group>
    </>
  );
}

/** The heads-up frame and the dash display over the 3D cell. */
export function OnBoardOverlay({ list, sel, inside, step, garage }: OverlayProps) {
  const it = list[Math.min(sel, list.length - 1)];
  const n = list.length;
  const code = `P${pad(it.index + 1)}`;
  if (!inside) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[24]">
      {/* heads-up: corner brackets round the stage, the readout above it */}
      <div className="absolute left-1/2 top-[24%] h-[44%] w-[min(60%,440px)] -translate-x-1/2">
        {(["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"] as const).map((c) => (
          <span key={c} className={`gx-hud absolute h-5 w-5 border-[#111] ${c}`} />
        ))}
        <span className="absolute left-0 top-0 h-[2px] w-2 bg-[#ff4f00]" />
        <div key={it.index} className="absolute -top-9 left-0 right-0 flex items-baseline justify-between gap-3 font-mono text-[11.5px]">
          <span className="truncate bg-white/85 px-1.5">
            <span className="text-[#ff4f00]">{code}</span> <Decode text={it.p.name} run dur={380} />
          </span>
          <span className="shrink-0 bg-[#111] px-1.5 font-semibold text-[#ff4f00]">
            <Decode text={it.p.headline.value} run delay={120} dur={300} />
          </span>
        </div>
      </div>
      <span className="font-mono absolute left-3 top-3 bg-[#111] px-1.5 py-0.5 text-[11px] text-white">ON-BOARD · {garage}</span>

      {/* the dash display, paddles either side */}
      <div className="pointer-events-auto absolute bottom-3 left-1/2 flex w-[min(94%,440px)] -translate-x-1/2 items-stretch">
        <button type="button" aria-label="Previous project" onClick={() => step(-1)} className="font-mono -mr-[2px] w-12 border-2 border-[#111] bg-[#111] text-[16px] text-white shadow-[3px_3px_0_#ff4f00] transition hover:bg-white hover:text-[#111] active:translate-y-[2px]">
          −
        </button>
        <div className="min-w-0 flex-1 border-2 border-[#111] bg-[#111] px-3 pb-2 pt-1.5 text-white">
          {/* shift lights: one per project, passed in paper, yours orange */}
          <div className="flex gap-1">
            {list.map((x, i) => (
              <span key={x.p.slug} className={`h-2 flex-1 ${i === sel ? "bg-[#ff4f00]" : i < sel ? "bg-[#f3f2ed]" : "bg-[#3a3b3d]"} transition-colors duration-200`} />
            ))}
          </div>
          {/* the rotary: every code on a strip, the one you're on centred and boxed */}
          <div className="relative mt-1.5 h-8 overflow-hidden">
            <div className="absolute left-1/2 top-0 flex transition-transform duration-300 ease-[cubic-bezier(.6,0,.2,1)]" style={{ transform: `translateX(${-(sel + 0.5) * 64}px)` }}>
              {list.map((x, i) => (
                <span key={x.p.slug} className={`font-mono flex h-8 w-16 items-center justify-center text-[15px] ${i === sel ? "font-semibold text-white" : "text-white/35"}`}>
                  P{pad(x.index + 1)}
                </span>
              ))}
            </div>
            <span className="pointer-events-none absolute left-1/2 top-0 h-8 w-16 -translate-x-1/2 border-2 border-[#ff4f00]" />
          </div>
          <div className="font-mono mt-1 flex justify-between text-[10.5px] text-white/60">
            <span>PROJECT</span>
            <span>
              {pad(sel + 1)}/{pad(n)}
            </span>
          </div>
        </div>
        <button type="button" aria-label="Next project" onClick={() => step(1)} className="font-mono -ml-[2px] w-12 border-2 border-[#111] bg-[#111] text-[16px] text-white shadow-[3px_3px_0_#ff4f00] transition hover:bg-white hover:text-[#111] active:translate-y-[2px]">
          +
        </button>
      </div>
    </div>
  );
}
