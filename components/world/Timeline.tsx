// Career timeline plaza you drive across.
// Adapted from Bruno Simon's folio-2025 (MIT, (c) 2025 Bruno Simon),
// sources/Game/World/Areas/CareerArea.js: one neon line per role along a time
// axis, a label that rises when the car enters a role's date range, slides
// along with the car and sinks again once you pass the end (it stays up at the
// end of a role that's still going), and a seven-segment year counter on the
// floor that follows the car. Bruno's lines and stones come out of Blender;
// here everything is built from data in content/experience.ts.
//
// Local frame: time runs along -z (Jan 2021 at +z), lanes spread along +x, the
// year counter is on the -x side. Pavement top is at y = 0.04; mount it on a
// flat pad (see PLAZA in ./timeline/data.ts for the footprint).
"use client";

import { Suspense, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { carState } from "./carState";
import { dayNight } from "./daynight";
import { seeded } from "./alive/noise";
import { LANES, PER_YEAR, PLAZA, T0, T1, laneX, tOf, zOf, type Lane } from "./timeline/data";
import { YearCounter, type Probe } from "./timeline/YearCounter";

const FONT = "/fonts/racero.otf";
const TOP = 0.04; // pavement top
const PAD_IN = 0.25; // Bruno's line padding: how early a label wakes up (years)
const ELEVATION = 1.5; // label height when up
const STRIP_W = 0.12; // neon tube width
const SLOT = 1.7; // vertical spacing when several labels are up at once
const MASK = "#1d1826"; // dark outline behind the glowing letters

type Vec3 = [number, number, number];

// ---------------------------------------------------------------- materials

function laneMaterials(color: string) {
  const base = new THREE.Color(color);
  return {
    base,
    dim: new THREE.MeshBasicMaterial({ color: base.clone(), toneMapped: false }),
    lit: new THREE.MeshBasicMaterial({ color: base.clone(), toneMapped: false }),
    label: new THREE.MeshBasicMaterial({ color: base.clone(), toneMapped: false }),
  };
}

const flatSquare = (() => {
  const g = new THREE.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  return g;
})();

// Square outline: a 4-segment ring turned 45 degrees.
const hollowSquare = (() => {
  const g = new THREE.RingGeometry(0.2 * Math.SQRT2 - 0.09, 0.2 * Math.SQRT2, 4, 1, Math.PI / 4);
  g.rotateX(-Math.PI / 2);
  return g;
})();

// Unit strip spanning z in [-1, 0] so scaling z grows it from its anchor.
const strip = (() => {
  const g = new THREE.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, -0.5);
  return g;
})();

// ---------------------------------------------------------------- plaza

function paverTexture() {
  const pxPerM = 32;
  const w = Math.round((PLAZA.maxX - PLAZA.minX) * pxPerM);
  const h = Math.round((PLAZA.maxZ - PLAZA.minZ) * pxPerM);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const r = seeded(21);
  ctx.fillStyle = "#8d8794";
  ctx.fillRect(0, 0, w, h);
  // running-bond pavers, 1 m x 0.5 m, a little shade jitter each
  const pw = pxPerM;
  const ph = pxPerM / 2;
  for (let row = 0; row * ph < h; row++) {
    const off = row % 2 ? pw / 2 : 0;
    for (let x = -off; x < w; x += pw) {
      const v = 214 + Math.floor((r() - 0.5) * 22);
      ctx.fillStyle = `rgb(${v - 4},${v - 6},${v})`;
      ctx.fillRect(x + 1.5, row * ph + 1.5, pw - 3, ph - 3);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function Plaza() {
  const map = useMemo(() => paverTexture(), []);
  const w = PLAZA.maxX - PLAZA.minX;
  const d = PLAZA.maxZ - PLAZA.minZ;
  const cx = (PLAZA.minX + PLAZA.maxX) / 2;
  const cz = (PLAZA.minZ + PLAZA.maxZ) / 2;
  const depth = 0.4; // skirt so small terrain bumps never poke through
  return (
    <group>
      <mesh position={[cx, TOP - depth / 2 - 0.002, cz]} receiveShadow>
        <boxGeometry args={[w + 0.3, depth, d + 0.3]} />
        <meshStandardMaterial color="#6f6a76" roughness={0.95} />
      </mesh>
      <mesh position={[cx, TOP, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={map} color="#d8d3dc" roughness={0.9} />
      </mesh>
      {/* faint year seams across the plaza */}
      {Array.from({ length: T1 - T0 + 1 }, (_, i) => (
        <mesh key={i} position={[cx, TOP + 0.002, zOf(T0 + i)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w - 0.6, 0.06]} />
          <meshStandardMaterial color="#6a6475" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- posts

const POST = { w: 0.24, h: 0.75 };

function Posts({ colliders }: { colliders: boolean }) {
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useFrame(({ clock }) => {
    const k = dayNight.night;
    const flicker = 0.94 + Math.sin(clock.elapsedTime * 2.1) * 0.06;
    glow.color.setRGB(1, 0.45, 0.62).multiplyScalar((0.75 + k * 0.6) * flicker);
  });
  const spots = useMemo(() => {
    const out: Vec3[] = [];
    for (let t = T0; t <= T1; t++) {
      out.push([PLAZA.minX + 0.45, TOP, zOf(t)]);
      out.push([PLAZA.maxX - 0.45, TOP, zOf(t)]);
    }
    return out;
  }, []);
  return (
    <group>
      {spots.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, POST.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[POST.w, POST.h, POST.w]} />
            <meshStandardMaterial color="#2a2533" roughness={0.6} />
          </mesh>
          {/* glowing slit on all four faces */}
          <mesh position={[0, POST.h * 0.72, 0]} material={glow}>
            <boxGeometry args={[POST.w + 0.012, 0.05, POST.w + 0.012]} />
          </mesh>
        </group>
      ))}
      {colliders && (
        <RigidBody type="fixed" colliders={false}>
          {spots.map((p, i) => (
            <CuboidCollider key={i} args={[POST.w / 2, POST.h / 2, POST.w / 2]} position={[p[0], p[1] + POST.h / 2, p[2]]} />
          ))}
        </RigidBody>
      )}
    </group>
  );
}

// ---------------------------------------------------------------- lanes

const tmpColor = new THREE.Color();

/** Bruno's in / up logic: in while the car is inside the date range (plus a little padding). */
function laneState(lane: Lane, p: Probe) {
  const tc = tOf(p.z);
  const pad = PAD_IN / PER_YEAR;
  const isIn = p.inside && tc > lane.start - pad && tc < lane.end + pad;
  const past = p.inside && tc >= lane.end;
  return { isIn, past, up: isIn || (past && lane.ongoing) };
}

function LaneView({ lane, probe }: { lane: Lane; probe: RefObject<Probe> }) {
  const x = laneX(lane.index);
  const z0 = zOf(lane.start);
  const z1 = zOf(lane.end);
  const len = z0 - z1;
  const mats = useMemo(() => laneMaterials(lane.color), [lane.color]);
  const litStrip = useRef<THREE.Mesh>(null);
  const startNode = useRef<THREE.Mesh>(null);
  const endNode = useRef<THREE.Mesh>(null);
  const label = useRef<THREE.Group>(null);
  const st = useRef({ frac: 0, lift: 0, z: z0, y: ELEVATION, time: 0 });

  useFrame((_, dt) => {
    const s = st.current;
    const p = probe.current;
    const d = Math.min(dt, 1 / 30);
    s.time += d;
    const tc = tOf(p.z);
    const k = dayNight.night;

    // How much of the line is behind the car.
    const fracTarget = p.inside ? THREE.MathUtils.clamp((tc - lane.start) / (lane.end - lane.start), 0, 1) : 0;
    s.frac += (fracTarget - s.frac) * Math.min(1, d * 8);

    const { isIn, past, up } = laneState(lane, p);
    s.y += (ELEVATION + SLOT * (p.slots[lane.index] ?? 0) - s.y) * Math.min(1, d * 6);
    s.lift += ((up ? 1 : 0) - s.lift) * Math.min(1, d * 3 * 2);
    const zTarget = isIn ? THREE.MathUtils.clamp(p.z, z1, z0) : past ? z1 : z0;
    s.z += (zTarget - s.z) * Math.min(1, d * 10 * 2);

    // Colours: neon reads in daylight, a touch hotter at night.
    const pulse = lane.ongoing ? 0.85 + Math.sin(s.time * 3) * 0.15 : 1;
    mats.dim.color.copy(tmpColor.copy(mats.base).multiplyScalar(0.3 + 0.22 * k));
    mats.lit.color.copy(tmpColor.copy(mats.base).multiplyScalar(1 + 0.45 * k));
    mats.label.color.copy(tmpColor.copy(mats.base).multiplyScalar(1.05 + 0.4 * k));

    const ls = litStrip.current;
    if (ls) {
      ls.scale.set(STRIP_W, 1, Math.max(0.0001, s.frac * len));
      ls.visible = s.frac > 0.002;
    }
    if (startNode.current) startNode.current.material = s.frac > 0.002 ? mats.lit : mats.dim;
    if (endNode.current) {
      endNode.current.material = s.frac > 0.995 ? mats.lit : mats.dim;
      if (lane.ongoing) endNode.current.scale.setScalar(0.4 * pulse);
    }

    const g = label.current;
    if (g) {
      const e = THREE.MathUtils.smootherstep(s.lift, 0, 1);
      g.position.set(x, TOP + s.y * e - 0.4 * (1 - e), s.z);
      g.scale.setScalar(Math.max(0.0001, e));
      g.visible = s.lift > 0.01;
    }
  });

  const yLine = TOP + 0.016;
  return (
    <group>
      {/* dark bed with the dim tube and the lit part on top */}
      <mesh position={[x, TOP + 0.007, (z0 + z1) / 2]} receiveShadow>
        <boxGeometry args={[0.34, 0.014, len + 0.3]} />
        <meshStandardMaterial color="#1f1b27" roughness={0.7} />
      </mesh>
      <mesh geometry={strip} material={mats.dim} position={[x, yLine, z0]} scale={[STRIP_W, 1, len]} />
      <mesh ref={litStrip} geometry={strip} material={mats.lit} position={[x, yLine + 0.002, z0]} scale={[STRIP_W, 1, 0.0001]} visible={false} />

      {/* start node (filled) */}
      <mesh position={[x, TOP + 0.02, z0]} receiveShadow castShadow>
        <boxGeometry args={[0.66, 0.04, 0.66]} />
        <meshStandardMaterial color="#1f1b27" roughness={0.7} />
      </mesh>
      <mesh ref={startNode} geometry={flatSquare} material={mats.dim} position={[x, TOP + 0.042, z0]} scale={0.4} />

      {/* end node: hollow when the role is done, a pulsing square while it's still going */}
      <mesh position={[x, TOP + 0.02, z1]} receiveShadow castShadow>
        <boxGeometry args={[0.66, 0.04, 0.66]} />
        <meshStandardMaterial color="#1f1b27" roughness={0.7} />
      </mesh>
      {lane.ongoing ? (
        <mesh ref={endNode} geometry={flatSquare} material={mats.dim} position={[x, TOP + 0.042, z1]} scale={0.4} />
      ) : (
        <mesh ref={endNode} geometry={hollowSquare} material={mats.dim} position={[x, TOP + 0.042, z1]} />
      )}

      <group ref={label} position={[x, TOP, z0]} visible={false}>
        <Billboard>
          <Suspense fallback={null}>
            <LabelText lane={lane} material={mats.label} />
          </Suspense>
        </Billboard>
      </group>
    </group>
  );
}

function LabelText({ lane, material }: { lane: Lane; material: THREE.Material }) {
  const title = 0.4;
  const sub = 0.28;
  const lh = 0.34;
  const x0 = 0.3;
  return (
    <group>
      <Text
        font={FONT}
        fontSize={title}
        anchorX="left"
        anchorY="bottom"
        position={[x0, lane.lines.length * lh + 0.06, 0]}
        material={material}
        outlineWidth={0.035}
        outlineColor={MASK}
      >
        {lane.title}
      </Text>
      {lane.lines.map((l, i) => (
        <Text
          key={l}
          font={FONT}
          fontSize={sub}
          anchorX="left"
          anchorY="bottom"
          position={[x0, (lane.lines.length - 1 - i) * lh, 0]}
          material={material}
          outlineWidth={0.03}
          outlineColor={MASK}
        >
          {l}
        </Text>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- root

const local = new THREE.Vector3();

export type TimelineProps = {
  position?: Vec3;
  /** Yaw in radians, or a full Euler tuple. */
  rotation?: number | Vec3;
  /** Fixed colliders on the posts (needs a <Physics> parent). */
  colliders?: boolean;
};

/** The career plaza. Time runs along local -z; see the header for the frame. */
export default function Timeline({ position = [0, 0, 0], rotation = 0, colliders = true }: TimelineProps) {
  const root = useRef<THREE.Group>(null);
  const probe = useRef<Probe>({ x: 0, z: PLAZA.maxZ, inside: false, slots: LANES.map(() => 0) });
  const rot: Vec3 = typeof rotation === "number" ? [0, rotation, 0] : rotation;

  useFrame(() => {
    const g = root.current;
    if (!g) return;
    g.updateWorldMatrix(true, false);
    g.worldToLocal(local.copy(carState.pos));
    const p = probe.current;
    p.x = local.x;
    p.z = local.z;
    p.inside = local.x > PLAZA.minX - 1 && local.x < PLAZA.maxX + 1 && local.z > PLAZA.minZ - 1 && local.z < PLAZA.maxZ + 1 && local.y < 6;
    // Stack the labels that are up so they never sit on top of each other.
    let slot = 0;
    for (const lane of LANES) {
      p.slots[lane.index] = slot;
      if (laneState(lane, p).up) slot++;
    }
  });

  return (
    <group ref={root} position={position} rotation={rot}>
      <Plaza />
      <Posts colliders={colliders} />
      {LANES.map((lane) => (
        <LaneView key={lane.key} lane={lane} probe={probe} />
      ))}
      <YearCounter probe={probe} />
    </group>
  );
}
