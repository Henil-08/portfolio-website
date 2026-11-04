"use client";

// Option 03 · Pit wall screens: the vehicle parks and the camera rises to a wall of datasheet
// screens across the back of the bay, one per project, like the timing screens on a pit wall.
// ← → pick one; it leaves an empty orange frame on the wall and flies forward to full size,
// and its project object rises on the plinth beside it.
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Plinth } from "@/components/world/buildings/PitBuilding";
import { CI } from "@/components/world/buildings/concrete";
import { ProjectObject } from "@/components/world/models/projects";
import { DOMAINS } from "@/content/projects";
import { pad } from "@/components/brand/tokens";
import { BACK_Z, BayScene, DrivingCar, ScanSquare, Spot, backOut, fonts, glide, inOut, lerp, seg, useCanvasTexture, useDrive, useSlide, useTmp, type Item } from "./common";
import type { SceneProps } from "./types";

const SW = 1.5;
const SH = 0.95;
const GAP = 0.18;
/** Where the picked screen comes to, and the plinth beside it. */
const FULL = new THREE.Vector3(-0.4, 1.95, 0.45);
const FULL_SCALE = 1.15;
const PLINTH_AT = new THREE.Vector3(1.1, 0, 0.3);
const IN = { pos: new THREE.Vector3(0.2, 2.15, 3.9), look: new THREE.Vector3(0.15, 1.75, -0.6), fov: 44 };

/** Wall slots: up to four across, two rows, centred on the back wall. */
function slots(n: number) {
  const cols = n <= 4 ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / cols);
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const c = i - r * cols;
    return new THREE.Vector3((c - (inRow - 1) / 2) * (SW + GAP), rows === 1 ? 2.05 : 2.6 - r * (SH + GAP), BACK_Z + 0.08);
  });
}

/** One screen's face: the datasheet in miniature, readable at full size. */
function Face({ it }: { it: Item }) {
  const p = it.p;
  const tex = useCanvasTexture(
    1200,
    760,
    (g) => {
      const f = fonts();
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, 1200, 760);
      g.fillStyle = CI.ink;
      g.fillRect(0, 0, 1200, 78);
      g.font = `500 32px ${f.mono}`;
      g.textBaseline = "middle";
      g.fillStyle = CI.paper;
      g.fillText(`HG-08 / P${pad(it.index + 1)}`, 40, 40);
      g.textAlign = "right";
      g.fillStyle = "rgba(243,242,237,0.6)";
      g.fillText(DOMAINS.find((x) => x.id === p.domain)!.label, 1160, 40);
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      // name, wrapped to two lines at most
      g.fillStyle = CI.ink;
      let size = 76;
      g.font = `600 ${size}px ${f.sans}`;
      while (g.measureText(p.name).width > 1120 && size > 52) g.font = `600 ${(size -= 4)}px ${f.sans}`;
      g.fillText(p.name, 40, 190);
      g.fillStyle = "#5d5d58";
      g.font = `400 36px ${f.sans}`;
      g.fillText(p.tagline.length > 56 ? `${p.tagline.slice(0, 55)}…` : p.tagline, 40, 252);
      // the figure that matters
      g.fillStyle = CI.ink;
      g.fillRect(40, 300, 1120, 3);
      g.font = `600 150px ${f.mono}`;
      g.fillStyle = CI.orange;
      g.fillText(p.headline.value, 34, 470);
      g.fillStyle = "#5d5d58";
      g.font = `600 30px ${f.sans}`;
      g.fillText(p.headline.label.toUpperCase(), 40, 528);
      // the stack along a bus line
      g.fillStyle = CI.ink;
      g.fillRect(40, 600, 1120, 3);
      g.font = `500 28px ${f.mono}`;
      let x = 40;
      for (const s of p.stack) {
        const w = g.measureText(s).width + 28;
        if (x + w > 1160) break;
        g.fillRect(x + w / 2, 603, 2, 22);
        g.strokeStyle = CI.ink;
        g.lineWidth = 2;
        g.strokeRect(x, 625, w, 52);
        g.fillText(s, x + 14, 661);
        x += w + 14;
      }
    },
    p.slug,
  );
  return (
    <mesh position={[0, 0, 0.03]}>
      <planeGeometry args={[SW, SH]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

export default function PitWall({ v, livery, domain, list, sel, dir, inside, onPick }: SceneProps) {
  const cam = useRef<THREE.PerspectiveCamera>(null!);
  const tmp = useTmp();
  const drive = useDrive(inside);
  const slide = useSlide(sel, dir);
  const screens = useRef<(THREE.Group | null)[]>([]);
  const frames = useRef<(THREE.Mesh | null)[]>([]);
  const objs = useRef<(THREE.Group | null)[]>([]);
  const scan = useRef<THREE.Group>(null!);
  const at = slots(list.length);
  const tq = useRef(new THREE.Quaternion());

  useFrame((s) => {
    const { from, to, k } = slide.current;
    const first = from === to;
    // the camera's facing, so the picked screen squares up to it
    tq.current.setFromRotationMatrix(new THREE.Matrix4().lookAt(IN.pos, FULL, new THREE.Vector3(0, 1, 0)));
    screens.current.forEach((g, i) => {
      if (!g) return;
      let f = 0;
      if (i === to) f = first ? inOut(seg(drive.current, 0.78, 1)) : inOut(seg(k, 0.3, 1));
      else if (i === from && !first) f = 1 - inOut(seg(k, 0, 0.55));
      g.position.lerpVectors(at[i], FULL, f);
      g.position.z += Math.sin(f * Math.PI) * 0.6;
      g.scale.setScalar(lerp(1, FULL_SCALE, f));
      g.quaternion.identity().slerp(tq.current, f);
      const fr = frames.current[i];
      if (fr) (fr.material as THREE.MeshBasicMaterial).color.set(i === to ? CI.orange : CI.ink);
    });
    // the object: the old one sinks, the new one rises with the scan
    objs.current.forEach((g, i) => {
      if (!g) return;
      const up = i === to ? (first ? seg(drive.current, 0.82, 1) : seg(k, 0.45, 1)) : i === from && !first ? 1 - seg(k, 0, 0.35) : 0;
      g.visible = up > 0.001;
      g.scale.setScalar(0.85 * backOut(up, 1.6));
      g.rotation.y = Math.sin(s.clock.elapsedTime * 0.5) * 0.25;
    });
    const ks = first ? seg(drive.current, 0.86, 1) : seg(k, 0.55, 1);
    scan.current.visible = ks > 0 && ks < 1;
    scan.current.position.y = 1.0 + 1.3 * inOut(ks);
    glide(cam.current, drive.current, IN.pos, IN.look, IN.fov, tmp, 1.2);
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault fov={34} near={0.05} far={160} />
      <BayScene domain={domain} lamp={8} />
      {/* the wall: an ink frame per slot, orange round the one on show */}
      {list.map((it, i) => (
        <mesh key={`f${it.p.slug}`} ref={(m) => void (frames.current[i] = m)} position={at[i].toArray()}>
          <boxGeometry args={[SW + 0.1, SH + 0.1, 0.02]} />
          <meshBasicMaterial color={CI.ink} toneMapped={false} />
        </mesh>
      ))}
      {list.map((it, i) => (
        <mesh key={`b${it.p.slug}`} position={[at[i].x, at[i].y, at[i].z + 0.012]}>
          <planeGeometry args={[SW + 0.04, SH + 0.04]} />
          <meshStandardMaterial color="#d9d6ce" roughness={0.95} />
        </mesh>
      ))}
      {list.map((it, i) => (
        <group
          key={it.p.slug}
          ref={(g) => void (screens.current[i] = g)}
          position={at[i].toArray()}
          onClick={(e) => {
            e.stopPropagation();
            onPick(i);
          }}
        >
          <mesh position={[0, 0, 0.0]}>
            <boxGeometry args={[SW + 0.06, SH + 0.06, 0.05]} />
            <meshStandardMaterial color={CI.ink} roughness={0.5} metalness={0.2} />
          </mesh>
          <Face it={it} />
        </group>
      ))}
      {/* the plinth beside the picked screen, with its object */}
      <group position={PLINTH_AT.toArray()}>
        <Plinth />
        {list.map((it, i) => (
          <group key={it.p.slug} ref={(g) => void (objs.current[i] = g)} position={[0, 1.0, 0]} visible={false}>
            <ProjectObject slug={it.p.slug} active />
          </group>
        ))}
        <group ref={scan}>
          <ScanSquare size={1.05} />
        </group>
        <Spot position={[-0.6, 3.3, 1.8]} target={[0, 1.4, 0]} angle={0.45} intensity={22} distance={7} />
      </group>
      <DrivingCar v={v} livery={livery} x={0} nose={0.2} drive={drive} />
    </>
  );
}
