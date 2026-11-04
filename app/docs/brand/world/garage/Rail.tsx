"use client";

// Option 04 · Parts rail: the garage's projects hang from trolleys on an overhead ink rail that
// runs through the bay, like parts on a line. ← → run the rail one stop; the hangers swing as
// it starts and stops, and an orange scan line reads the one that stops in front of you.
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { CI } from "@/components/world/buildings/concrete";
import { ProjectObject } from "@/components/world/models/projects";
import { pad } from "@/components/brand/tokens";
import { BayScene, DrivingCar, ScanSquare, Spot, fonts, glide, inOut, lerp, seg, useCanvasTexture, useDrive, useSlide, useTmp, type Item } from "./common";
import type { SceneProps } from "./types";

const RAIL_Y = 3.25;
const RAIL_Z = -1.5;
const SPACING = 3.1;
const TRAY_Y = 1.25;
const DROP = RAIL_Y - 0.14 - TRAY_Y; // pivot to tray
const OBJ = 0.95;
const IN = { pos: new THREE.Vector3(0.45, 2.0, 4.1), look: new THREE.Vector3(0, 1.85, RAIL_Z), fov: 42 };

const ink = new THREE.MeshStandardMaterial({ color: CI.ink, roughness: 0.55, metalness: 0.2 });
const paper = new THREE.MeshStandardMaterial({ color: CI.paper, roughness: 0.7 });

/** The paper tag on each tray: code and name. */
function Tag({ it }: { it: Item }) {
  const tex = useCanvasTexture(
    640,
    200,
    (g) => {
      const f = fonts();
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, 640, 200);
      g.fillStyle = CI.ink;
      g.fillRect(0, 0, 640, 56);
      g.fillStyle = CI.orange;
      g.font = `600 30px ${f.mono}`;
      g.textBaseline = "middle";
      g.fillText(`P${pad(it.index + 1)}`, 22, 29);
      g.fillStyle = "rgba(243,242,237,0.65)";
      g.textAlign = "right";
      g.fillText(it.p.headline.value, 618, 29);
      g.textAlign = "left";
      g.fillStyle = CI.ink;
      let s = 52;
      g.font = `600 ${s}px ${f.sans}`;
      while (g.measureText(it.p.name).width > 600 && s > 30) g.font = `600 ${(s -= 2)}px ${f.sans}`;
      g.fillText(it.p.name, 22, 128);
    },
    it.p.slug,
  );
  return (
    <mesh position={[0, -0.2, 0.51]}>
      <planeGeometry args={[0.96, 0.3]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

export default function Rail({ v, livery, domain, list, sel, dir, inside, onPick }: SceneProps) {
  const cam = useRef<THREE.PerspectiveCamera>(null!);
  const tmp = useTmp();
  const drive = useDrive(inside);
  const slide = useSlide(sel, dir);
  const hangers = useRef<(THREE.Group | null)[]>([]);
  const scan = useRef<THREE.Group>(null!);
  // the rail position (in stops) and each hanger's swing, a damped pendulum driven by the rail
  const rail = useRef({ x: sel, v: 0, a: 0, th: 0, w: 0, p0: sel, to: sel });

  useFrame((s, dt0) => {
    const dt = Math.min(dt0, 0.05);
    const R = rail.current;
    const { from, to, k } = slide.current;
    if (R.to !== to) {
      R.p0 = R.x;
      R.to = to;
    }
    const x = lerp(R.p0, to, inOut(k));
    const vel = (x - R.x) / Math.max(dt, 1e-4);
    const acc = (vel - R.v) / Math.max(dt, 1e-4);
    R.x = x;
    R.v = vel;
    // θ'' = -(g/L) sin θ - (a/L) cos θ - c θ'   (a is the rail's acceleration, m/s²)
    const L = DROP;
    const ax = THREE.MathUtils.clamp(acc * SPACING, -40, 40);
    R.w += (-(9.8 / L) * Math.sin(R.th) - (ax / L) * Math.cos(R.th) - 2.6 * R.w) * dt;
    R.th = THREE.MathUtils.clamp(R.th + R.w * dt, -0.35, 0.35);
    hangers.current.forEach((g, i) => {
      if (!g) return;
      g.position.x = (i - x) * SPACING;
      g.rotation.z = R.th;
      const obj = g.children[g.children.length - 1] as THREE.Group;
      obj.rotation.y = i === to ? Math.sin(s.clock.elapsedTime * 0.5) * 0.3 : 0;
    });
    const ks = from === to ? seg(drive.current, 0.86, 1) : seg(k, 0.62, 1);
    scan.current.visible = ks > 0 && ks < 1;
    scan.current.position.y = RAIL_Y - 0.35 - (RAIL_Y - 0.35 - TRAY_Y) * inOut(ks);
    glide(cam.current, drive.current, IN.pos, IN.look, IN.fov, tmp);
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault fov={34} near={0.05} far={160} />
      <BayScene domain={domain} lamp={9} />
      {/* the rail: an ink I-beam across the bay on two hangers from the ceiling */}
      <group position={[0, RAIL_Y, RAIL_Z]}>
        <mesh material={ink} castShadow>
          <boxGeometry args={[8.4, 0.03, 0.2]} />
        </mesh>
        <mesh material={ink} position={[0, 0.1, 0]}>
          <boxGeometry args={[8.4, 0.2, 0.03]} />
        </mesh>
        <mesh material={ink} position={[0, 0.2, 0]}>
          <boxGeometry args={[8.4, 0.03, 0.2]} />
        </mesh>
        {[-2.6, 2.6].map((x) => (
          <mesh key={x} material={ink} position={[x, 0.27, 0]}>
            <boxGeometry args={[0.05, 0.14, 0.05]} />
          </mesh>
        ))}
        {/* the stop: one orange mark on the beam over the centre */}
        <mesh position={[0, 0.1, 0.017]}>
          <planeGeometry args={[0.3, 0.06]} />
          <meshBasicMaterial color={CI.orange} toneMapped={false} />
        </mesh>
      </group>
      {list.map((it, i) => (
        <group
          key={it.p.slug}
          ref={(g) => void (hangers.current[i] = g)}
          position={[(i - sel) * SPACING, RAIL_Y - 0.02, RAIL_Z]}
          onClick={(e) => {
            e.stopPropagation();
            onPick(i);
          }}
        >
          {/* trolley wheels on the bottom flange, a yoke, two cables to the tray */}
          <mesh material={ink} position={[0, -0.06, 0]}>
            <boxGeometry args={[0.42, 0.1, 0.26]} />
          </mesh>
          <mesh material={ink} position={[0, -0.14, 0]}>
            <boxGeometry args={[0.9, 0.05, 0.06]} />
          </mesh>
          {[-0.42, 0.42].map((x) => (
            <mesh key={x} material={ink} position={[x, -0.14 - DROP / 2, 0]}>
              <boxGeometry args={[0.014, DROP, 0.014]} />
            </mesh>
          ))}
          <group position={[0, -0.14 - DROP, 0]}>
            <mesh material={paper} castShadow receiveShadow>
              <boxGeometry args={[1.0, 0.05, 0.9]} />
            </mesh>
            <mesh material={ink} position={[0, -0.04, 0]}>
              <boxGeometry args={[1.0, 0.03, 0.9]} />
            </mesh>
            <Tag it={it} />
          </group>
          <group position={[0, -0.14 - DROP + 0.025, 0]} scale={OBJ}>
            <ProjectObject slug={it.p.slug} active />
          </group>
        </group>
      ))}
      <group ref={scan} position={[0, 0, RAIL_Z]}>
        <ScanSquare size={1.15} />
      </group>
      <Spot position={[0.6, 3.5, 1.2]} target={[0, 1.6, RAIL_Z]} angle={0.5} intensity={24} />
      <DrivingCar v={v} livery={livery} x={0} nose={-0.35} drive={drive} />
    </>
  );
}
