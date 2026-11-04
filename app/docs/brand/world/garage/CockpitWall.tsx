"use client";

// Garage experience · Cockpit + pit wall (owner, 2026-11-05: 01 Cockpit and 03 Pit wall screens
// combined). The chosen vehicle drives into the bay with its wheels rolling, and one camera move
// follows it in and settles at the driver's eye. Ahead: a lit stage with one project on it and,
// behind it, the bay's back wall of datasheet screens, one per project in this garage. The screen
// for the project on the stage lights and steps forward in an orange frame; ← → slide the stage
// object off and the next one on, and the frame moves along the wall in step.
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Plinth } from "@/components/world/buildings/PitBuilding";
import { CI } from "@/components/world/buildings/concrete";
import { ProjectObject } from "@/components/world/models/projects";
import { RigContext, type Livery, type VehicleDef, type VehicleRig } from "@/components/world/vehicles";
import { K } from "@/components/world/vehicles/kit";
import { DOMAINS } from "@/content/projects";
import { pad } from "@/components/brand/tokens";
import { BACK_Z, BayScene, OUTSIDE, OUT_Z, S, ScanSquare, Spot, fonts, inOut, lerp, out3, seg, setCam, useCanvasTexture, useDrive, useSlide, type Item, type V3 } from "./common";
import type { SceneProps } from "./types";

/* ------------------------------------------------------------------ the bay's layout */

/** The stage in front of the wall, and how far a project travels to leave it. */
const STAGE_Z = -1.75;
const STAGE_Y = 0.12;
const OFF = 3.2;
const OBJ = 1.2;
const PLINTH_H = 0.5;
/** Every driver's eye parks this far out from the bay's centre line, so the view frames alike. */
const EYE_Z = 1.9;
/** Where the eye looks once parked: between the stage object and the wall above it. */
const TARGET = new THREE.Vector3(0, 1.5, -2.2);
const FOV = 54;

/** The screens: 16:10 datasheets, up to four across, two rows. */
const SW = 1.04;
const SH = 0.65;
const GAP = 0.14;
const WALL_Z = BACK_Z + 0.06;
/** How far the lit screen steps out of the wall. */
const POP = 0.22;

/**
 * The driver's eye in each model's own frame (nose +z, ground 0, true metres), placed so the
 * stage and the wall both clear the bodywork: TH-18 just under the halo, E14 low in the seat so the cage's front hoop frames the wall rather than crossing it,
 * Atlas at head height under the canopy (the glass goes see-through once you are in), Apollo
 * sat up over the tank so the screen and bars stay below the stage.
 */
const EYE: Record<VehicleDef["code"], V3> = {
  V01: [0, 0.98, -0.36],
  V02: [0, 1.1, -0.02],
  V03: [0, 1.0, -0.3],
  V04: [0, 1.42, -0.3],
};

function slots(n: number) {
  const cols = n <= 4 ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / cols);
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const c = i - r * cols;
    return new THREE.Vector3((c - (inRow - 1) / 2) * (SW + GAP), rows === 1 ? 2.45 : 2.88 - r * (SH + GAP), WALL_Z);
  });
}

/* ------------------------------------------------------------------ the wall */

/** One screen's face: the datasheet in miniature, code, name, the figure in orange, the stack. */
function Face({ it, matRef }: { it: Item; matRef: (m: THREE.MeshBasicMaterial | null) => void }) {
  const p = it.p;
  const W = 1200;
  const H = 750;
  const tex = useCanvasTexture(
    W,
    H,
    (g) => {
      const f = fonts();
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, W, H);
      g.fillStyle = CI.ink;
      g.fillRect(0, 0, W, 84);
      g.font = `500 34px ${f.mono}`;
      g.textBaseline = "middle";
      g.fillStyle = CI.orange;
      g.fillText(`P${pad(it.index + 1)}`, 40, 43);
      g.fillStyle = CI.paper;
      g.fillText(" / HG-08", 40 + g.measureText(`P${pad(it.index + 1)}`).width, 43);
      g.textAlign = "right";
      g.fillStyle = "rgba(243,242,237,0.6)";
      g.fillText(DOMAINS.find((x) => x.id === p.domain)!.label, W - 40, 43);
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      g.fillStyle = CI.ink;
      let size = 84;
      g.font = `600 ${size}px ${f.sans}`;
      while (g.measureText(p.name).width > W - 80 && size > 52) g.font = `600 ${(size -= 4)}px ${f.sans}`;
      g.fillText(p.name, 40, 200);
      g.fillStyle = CI.ink;
      g.fillRect(40, 250, W - 80, 4);
      let fig = 170;
      g.font = `600 ${fig}px ${f.mono}`;
      while (g.measureText(p.headline.value).width > W - 80 && fig > 80) g.font = `600 ${(fig -= 10)}px ${f.mono}`;
      g.fillStyle = CI.orange;
      g.fillText(p.headline.value, 32, 430);
      g.fillStyle = "#5d5d58";
      g.font = `600 34px ${f.sans}`;
      g.fillText(p.headline.label.toUpperCase(), 40, 492);
      g.fillStyle = CI.ink;
      g.fillRect(40, 566, W - 80, 4);
      g.font = `500 32px ${f.mono}`;
      let x = 40;
      for (const s of p.stack) {
        const w = g.measureText(s).width + 32;
        if (x + w > W - 40) break;
        g.fillRect(x + w / 2, 570, 3, 24);
        g.strokeStyle = CI.ink;
        g.lineWidth = 3;
        g.strokeRect(x, 594, w, 60);
        g.fillText(s, x + 16, 636);
        x += w + 16;
      }
    },
    p.slug,
  );
  return (
    <mesh position={[0, 0, 0.03]}>
      <planeGeometry args={[SW, SH]} />
      <meshBasicMaterial ref={matRef} map={tex} toneMapped={false} />
    </mesh>
  );
}

/** An orange frame of four bars, open in the middle. */
function Frame({ w, h, t = 0.035 }: { w: number; h: number; t?: number }) {
  return (
    <group>
      {[1, -1].map((s) => (
        <mesh key={`h${s}`} position={[0, (s * (h + t)) / 2, 0]}>
          <boxGeometry args={[w + 2 * t, t, 0.02]} />
          <meshBasicMaterial color={CI.orange} toneMapped={false} />
        </mesh>
      ))}
      {[1, -1].map((s) => (
        <mesh key={`v${s}`} position={[(s * (w + t)) / 2, 0, 0]}>
          <boxGeometry args={[t, h, 0.02]} />
          <meshBasicMaterial color={CI.orange} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ the stage */

function Stage() {
  return (
    <group position={[0, 0, STAGE_Z]}>
      {/* a low paper riser with an ink lip and one orange mark at its front edge */}
      <mesh position={[0, STAGE_Y / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[3.0, STAGE_Y, 1.5]} />
        <meshStandardMaterial color={CI.paper} roughness={0.7} />
      </mesh>
      <mesh position={[0, STAGE_Y / 2, 0.755]}>
        <boxGeometry args={[3.02, STAGE_Y, 0.02]} />
        <meshStandardMaterial color={CI.ink} roughness={0.6} />
      </mesh>
      <mesh position={[0, STAGE_Y + 0.002, 0.68]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.24, 0.05]} />
        <meshBasicMaterial color={CI.orange} toneMapped={false} />
      </mesh>
      <Spot position={[0.9, 3.4, 1.8]} target={[0, 1.0, 0]} angle={0.5} intensity={26} />
      <pointLight position={[-1.6, 2.2, 0.4]} intensity={3} distance={5} decay={1.5} color="#ffffff" />
    </group>
  );
}

/** One project on its cut-down plinth; the carriage slides it on or off the stage. */
function Carriage({ slug, groupRef }: { slug: string; groupRef: (g: THREE.Group | null) => void }) {
  return (
    <group ref={groupRef} visible={false}>
      <group scale={[1, PLINTH_H, 1]}>
        <Plinth />
      </group>
      <group position={[0, PLINTH_H, 0]} scale={OBJ}>
        <ProjectObject slug={slug} active />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ the vehicle */

const GHOST = new THREE.MeshBasicMaterial({ color: "#151a1f", transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });

/**
 * The chosen vehicle, posed by the scene each frame. Its wheels roll with the distance it covers
 * (the game's own spin hooks), and once the camera is in the seat any glass, and any part the
 * eye sits inside, turns see-through so the cabin never hides the stage.
 */
function Car({ v, livery, root, inCab }: { v: VehicleDef; livery: Livery; root: RefObject<THREE.Group>; inCab: RefObject<boolean> }) {
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
  const last = useRef<number | null>(null);
  const glass = useRef<{ mesh: THREE.Mesh; mat: THREE.Material | THREE.Material[] }[] | null>(null);
  const ghosted = useRef(false);
  const model = useRef<THREE.Group>(null!);

  useFrame(() => {
    const g = root.current;
    if (!g) return;
    // the wheels: roll by the distance moved, forward is -z in the bay
    const z = g.position.z;
    if (last.current !== null) {
      const dz = last.current - z;
      if (dz !== 0) v.wheels.forEach((w, i) => {
        const s = spins.current[i];
        if (s) s.rotation.x += dz / (w.r * S);
      });
    }
    last.current = z;
    // the cabin: find the glass and the parts round the eye once, then swap them in and out
    if (!glass.current) {
      const e = new THREE.Vector3(...EYE[v.code]);
      model.current.updateWorldMatrix(true, true);
      const inv = model.current.matrixWorld.clone().invert();
      const list: { mesh: THREE.Mesh; mat: THREE.Material | THREE.Material[] }[] = [];
      model.current.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const isGlass = m.material === K.canopy || m.material === K.smoke;
        const box = new THREE.Box3().setFromObject(m).applyMatrix4(inv);
        if (isGlass || box.containsPoint(e)) list.push({ mesh: m, mat: m.material });
      });
      glass.current = list;
    }
    const want = inCab.current;
    if (want !== ghosted.current) {
      ghosted.current = want;
      for (const { mesh, mat } of glass.current) mesh.material = want ? GHOST : mat;
    }
  });

  return (
    <group ref={root} position={[0, 0, OUT_Z]} rotation={[0, Math.PI, 0]}>
      <group ref={model} scale={S}>
        <RigContext.Provider value={rig}>
          <v.Model livery={livery} />
        </RigContext.Provider>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ the scene */

export default function CockpitWall({ v, livery, domain, list, sel, dir, inside, onPick }: SceneProps) {
  const cam = useRef<THREE.PerspectiveCamera>(null!);
  const drive = useDrive(inside);
  const slide = useSlide(sel, dir);
  const car = useRef<THREE.Group>(null!);
  const inCab = useRef(false);
  const items = useRef<(THREE.Group | null)[]>([]);
  const screens = useRef<(THREE.Group | null)[]>([]);
  const faces = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const cursor = useRef<THREE.Group>(null!);
  const scan = useRef<THREE.Group>(null!);
  const at = useMemo(() => slots(list.length), [list.length]);
  const e = EYE[v.code];
  // parked: the eye at EYE_Z, so the car's centre sits this far behind it
  const parkZ = EYE_Z + e[2] * S;
  const scratch = useRef({ p: new THREE.Vector3(), l: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Color() });

  useFrame((s) => {
    const tmp = scratch.current;
    const k = drive.current;
    const { from, to, dir: d, k: sk } = slide.current;
    const first = from === to;
    const es = inOut(sk);

    // the drive: off the pit lane, through the door, to a stop with the eye at EYE_Z
    const cz = lerp(OUT_Z, parkZ, inOut(seg(k, 0, 0.8)));
    car.current.position.set(0, 0, cz);

    // one camera move: wide on the building, down behind the car as it rolls in, then forward
    // into the seat as it stops. Backing out plays the same path the other way.
    const a = inOut(seg(k, 0.02, 0.5));
    const b = inOut(seg(k, 0.42, 1));
    tmp.a.set(0.0, 1.9, cz + 4.2); // the chase point, behind and above
    tmp.b.set(-e[0] * S, e[1] * S, cz - e[2] * S); // the eye, wherever the car is
    tmp.p.lerpVectors(OUTSIDE.pos, tmp.a, a).lerp(tmp.b, b);
    tmp.a.set(0, 0.9, cz - 4); // the chase look, just ahead of the nose
    tmp.l.lerpVectors(OUTSIDE.look, tmp.a, out3(a)).lerp(TARGET, b);
    // a glance the way the stage moves, so the eye follows the slide
    tmp.l.x += first ? 0 : Math.sin(sk * Math.PI) * 0.18 * d * b;
    setCam(cam.current, tmp.p, tmp.l, lerp(lerp(OUTSIDE.fov, 46, a), FOV, b));
    inCab.current = b > 0.8;

    // the stage: the old project leaves the way you pressed, the new one comes on from the other side
    items.current.forEach((g, i) => {
      if (!g) return;
      const leaving = i === from && !first && sk < 1;
      const arriving = i === to;
      g.visible = leaving || arriving;
      if (arriving) g.position.set(first ? 0 : d * OFF * (1 - es), STAGE_Y, STAGE_Z);
      if (leaving) g.position.set(-d * OFF * es, STAGE_Y, STAGE_Z);
      g.rotation.z = arriving && !first ? Math.sin(sk * Math.PI) * 0.04 * d : 0;
      g.rotation.y = arriving ? Math.sin(s.clock.elapsedTime * 0.5) * 0.2 : 0;
    });

    // the wall lights as you arrive; then the lit screen follows the stage
    const on = inOut(seg(k, 0.72, 0.95));
    screens.current.forEach((g, i) => {
      if (!g) return;
      let f = 0;
      if (i === to) f = first ? 1 : inOut(seg(sk, 0.25, 1));
      else if (i === from && !first) f = 1 - inOut(seg(sk, 0, 0.5));
      f *= on;
      g.position.set(at[i].x, at[i].y, at[i].z + POP * f);
      g.scale.setScalar(1 + 0.06 * f);
      const m = faces.current[i];
      if (m) m.color.copy(tmp.c.setScalar(lerp(0.62, 1, Math.max(f, 1 - on))));
    });
    // the orange frame rides along the wall from the old screen to the new one
    const fp = first ? at[to] : tmp.a.lerpVectors(at[from], at[to], es);
    cursor.current.position.set(fp.x, fp.y, fp.z + POP + 0.02);
    cursor.current.scale.setScalar((1 + 0.06) * lerp(0.6, 1, on));
    cursor.current.visible = on > 0.01;

    // the scan square climbs the new object as it lands
    const ks = first ? seg(k, 0.86, 1) : seg(sk, 0.6, 1);
    scan.current.visible = ks > 0 && ks < 1;
    scan.current.position.y = STAGE_Y + PLINTH_H + 1.3 * inOut(ks);
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={OUTSIDE.pos.toArray()} fov={OUTSIDE.fov} near={0.03} far={160} />
      <BayScene domain={domain} lamp={9} />

      {/* the pit wall: an ink board behind the screens, one screen per project */}
      <mesh position={[0, at.length > 4 ? 2.46 : 2.45, BACK_Z + 0.02]}>
        <boxGeometry args={[Math.min(7.6, Math.ceil(at.length > 4 ? at.length / 2 : at.length) * (SW + GAP) + 0.3), at.length > 4 ? 2 * SH + GAP + 0.3 : SH + 0.3, 0.03]} />
        <meshStandardMaterial color={CI.graphite} roughness={0.9} />
      </mesh>
      {list.map((it, i) => (
        <group
          key={it.p.slug}
          ref={(g) => void (screens.current[i] = g)}
          position={at[i].toArray()}
          onClick={(ev) => {
            ev.stopPropagation();
            onPick(i);
          }}
        >
          <mesh>
            <boxGeometry args={[SW + 0.05, SH + 0.05, 0.05]} />
            <meshStandardMaterial color={CI.ink} roughness={0.5} metalness={0.2} />
          </mesh>
          <Face it={it} matRef={(m) => void (faces.current[i] = m)} />
        </group>
      ))}
      <group ref={cursor} visible={false}>
        <Frame w={SW + 0.08} h={SH + 0.08} />
      </group>
      <Spot position={[0, 4.2, 0.6]} target={[0, 2.4, BACK_Z]} angle={0.7} intensity={10} distance={7} />

      <Stage />
      {list.map((it, i) => (
        <Carriage key={it.p.slug} slug={it.p.slug} groupRef={(g) => void (items.current[i] = g)} />
      ))}
      <group ref={scan} position={[0, 0, STAGE_Z]} visible={false}>
        <ScanSquare size={1.15} />
      </group>

      <Car key={`${v.code}-${livery.name}`} v={v} livery={livery} root={car} inCab={inCab} />
    </>
  );
}
