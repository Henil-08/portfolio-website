// Career timeline: a small stone terrace you drive across.
// Adapted from Bruno Simon's folio-2025 (MIT, (c) 2025 Bruno Simon),
// sources/Game/World/Areas/CareerArea.js: one line per role laid in the ground
// along a time axis. When the car enters a role's dates its stone rises out of
// the ground (his activeElevation), floats with a slow bob, travels along the
// line with the car and its label wipes in (his labelReveal 0 -> 1, power2.inOut,
// 1 s after 0.3 s); past the end it settles back into the ground (a role that is
// still going keeps its stone up). Years are small markers on one side. Bruno's
// lines and stones come out of Blender; here everything is built from
// content/experience.ts.
//
// Local frame: time runs along -z (T0 at +z), lanes spread along +x, the year
// markers are on the -x side. Pavement top is at y = 0.04; mount it on a flat pad
// (see PLAZA in ./timeline/data.ts for the footprint).
"use client";

import { Suspense, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import { carState } from "./carState";
import { dayNight } from "./daynight";
import { LANES, PER_YEAR, PLAZA, T0, T1, YEAR_X, laneX, tOf, zOf, type Lane } from "./timeline/data";

const FONT = "/fonts/racero.otf";
const TOP = 0.04; // pavement top
const PAD_IN = 0.25; // Bruno's line padding: how early a stone wakes up (years)
const ELEVATION = 1.6; // stone height when up
const SLOT = 0.95; // vertical spacing when several stones are up at once
const LABEL_W = 7; // widest label, metres: the wipe runs over this
const MASK = "#1d1826"; // dark outline behind the glowing letters
const STONE = "#c9c0b1";
const GROOVE = "#2c2622";
const EDGE = "#c9b48e";

// ---------------------------------------------------------------- terrace

function Terrace() {
  const w = PLAZA.maxX - PLAZA.minX;
  const d = PLAZA.maxZ - PLAZA.minZ;
  const cx = (PLAZA.minX + PLAZA.maxX) / 2;
  const cz = (PLAZA.minZ + PLAZA.maxZ) / 2;
  const depth = 0.4; // skirt so small terrain bumps never poke through
  return (
    <group>
      <RoundedBox args={[w + 0.5, depth, d + 0.5]} radius={0.12} smoothness={3} position={[cx, TOP - depth / 2 - 0.001, cz]} receiveShadow>
        <meshStandardMaterial color={EDGE} roughness={0.9} />
      </RoundedBox>
      <mesh position={[cx, TOP, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#e6d9bf" roughness={0.92} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- years

/** A small stone marker with its year at every January, and a faint seam across. */
function Years() {
  const years = useMemo(() => Array.from({ length: T1 - T0 + 1 }, (_, i) => T0 + i), []);
  const w = PLAZA.maxX - PLAZA.minX;
  return (
    <group>
      {years.map((y) => (
        <group key={y} position={[0, 0, zOf(y)]}>
          <mesh position={[(PLAZA.minX + PLAZA.maxX) / 2, TOP + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w - 0.4, 0.04]} />
            <meshStandardMaterial color={EDGE} roughness={0.95} />
          </mesh>
          <RoundedBox args={[0.9, 0.14, 0.42]} radius={0.05} smoothness={2} position={[YEAR_X, TOP + 0.05, 0]} castShadow receiveShadow>
            <meshStandardMaterial color={STONE} roughness={0.85} />
          </RoundedBox>
          <Suspense fallback={null}>
            <Text font={FONT} fontSize={0.24} anchorX="center" anchorY="middle" position={[YEAR_X, TOP + 0.125, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} color="#4d4740">
              {String(y)}
            </Text>
          </Suspense>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- lanes

/** A rough stone: a flattened, flat-shaded icosahedron. */
const stoneGeo = (() => {
  const g = new THREE.IcosahedronGeometry(0.42, 1);
  const pos = g.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // a little lumpy, seeded by position so it's stable
    const k = 1 + Math.sin(x * 9.1 + z * 5.3) * 0.08 + Math.cos(y * 7.7 + x * 3.1) * 0.06;
    pos.setXYZ(i, x * k, y * k * 0.6, z * k);
  }
  return g.toNonIndexed();
})();
stoneGeo.computeVertexNormals();
const stoneMat = new THREE.MeshStandardMaterial({ color: STONE, roughness: 0.9, flatShading: true });

const strip = (() => {
  // unit strip spanning z in [-1, 0] so scaling z grows it from its anchor
  const g = new THREE.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, -0.5);
  return g;
})();

type Probe = { x: number; z: number; inside: boolean; slots: number[] };

/** Bruno's in / up logic: in while the car is inside the date range (plus a little padding). */
function laneState(lane: Lane, p: Probe) {
  const tc = tOf(p.z);
  const pad = PAD_IN / PER_YEAR;
  const isIn = p.inside && tc > lane.start - pad && tc < lane.end + pad;
  const past = p.inside && tc >= lane.end;
  return { isIn, past, up: isIn || (past && lane.ongoing) };
}

/** power2.inOut */
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const tmpColor = new THREE.Color();

function LaneView({ lane, probe }: { lane: Lane; probe: RefObject<Probe> }) {
  const x = laneX(lane.index);
  const z0 = zOf(lane.start);
  const z1 = zOf(lane.end);
  const len = z0 - z1;
  const mats = useMemo(() => {
    const base = new THREE.Color(lane.color);
    return { base, dim: new THREE.MeshBasicMaterial({ color: base.clone(), toneMapped: false }), lit: new THREE.MeshBasicMaterial({ color: base.clone(), toneMapped: false }), label: new THREE.MeshBasicMaterial({ color: base.clone(), toneMapped: false }) };
  }, [lane.color]);
  const stone = useRef<THREE.Group>(null);
  const lit = useRef<THREE.Mesh>(null);
  const texts = useRef<(THREE.Mesh & { clipRect?: number[] } | null)[]>([]);
  const st = useRef({ y: 0, z: z0, inFor: 0, reveal: 0, frac: 0, time: lane.index * 1.7 });

  useFrame((_, dt) => {
    const s = st.current;
    const p = probe.current;
    const d = Math.min(dt, 0.1);
    s.time += d;
    const k = dayNight.night;
    const { isIn, past, up } = laneState(lane, p);

    // Bruno: stone.y += (target - y) * dt * 3; it follows the car along the line once it's out of the ground.
    const target = up ? ELEVATION + SLOT * (p.slots[lane.index] ?? 0) : 0;
    s.y += (target - s.y) * Math.min(1, d * 3);
    const zTarget = isIn ? (s.y > 0.6 ? THREE.MathUtils.clamp(p.z, z1, z0) : s.z) : past ? z1 : z0;
    s.z += (zTarget - s.z) * Math.min(1, d * 10);

    // Label: wipes in 0.3 s after the car arrives, over a second; wipes out when it leaves.
    s.inFor = up ? s.inFor + d : 0;
    const want = up && s.inFor > 0.3 ? 1 : 0;
    s.reveal = THREE.MathUtils.clamp(s.reveal + Math.sign(want - s.reveal) * d, 0, 1);
    const wipe = ease(s.reveal);
    for (const t of texts.current) if (t) t.clipRect = [-0.2, -2, -0.2 + wipe * LABEL_W, 2];

    // How much of the line is behind the car: the inlay lights up as you go.
    const frac = p.inside ? THREE.MathUtils.clamp((tOf(p.z) - lane.start) / (lane.end - lane.start), 0, 1) : 0;
    s.frac += (frac - s.frac) * Math.min(1, d * 8);
    if (lit.current) {
      lit.current.scale.set(0.07, 1, Math.max(0.0001, s.frac * len));
      lit.current.visible = s.frac > 0.002;
    }
    mats.dim.color.copy(tmpColor.copy(mats.base).multiplyScalar(0.28 + 0.2 * k));
    mats.lit.color.copy(tmpColor.copy(mats.base).multiplyScalar(1 + 0.45 * k));
    mats.label.color.copy(tmpColor.copy(mats.base).multiplyScalar(1.05 + 0.4 * k));

    const g = stone.current;
    if (g) {
      // down: its top just proud of the pavement; up: a slow bob and a little sway
      const e = THREE.MathUtils.smoothstep(s.y, 0, 0.6);
      g.position.set(x, TOP + 0.02 + s.y + Math.sin(s.time * 1.3) * 0.08 * e, s.z);
      g.rotation.set(Math.sin(s.time * 0.9) * 0.06 * e, s.time * 0.25 * e, Math.cos(s.time * 1.1) * 0.05 * e);
    }
  });

  return (
    <group>
      {/* a dark groove cut into the stone, a dim inlay along it and the lit part behind the car */}
      <mesh position={[x, TOP + 0.003, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.22, len + 0.5]} />
        <meshStandardMaterial color={GROOVE} roughness={0.8} />
      </mesh>
      <mesh geometry={strip} material={mats.dim} position={[x, TOP + 0.006, z0]} scale={[0.07, 1, len]} />
      <mesh ref={lit} geometry={strip} material={mats.lit} position={[x, TOP + 0.008, z0]} scale={[0.07, 1, 0.0001]} visible={false} />
      <group ref={stone} position={[x, TOP, z0]}>
        <mesh geometry={stoneGeo} material={stoneMat} castShadow receiveShadow />
        <Billboard position={[0, 0.45, 0]}>
          <Suspense fallback={null}>
            <Text
              ref={(el: THREE.Mesh | null) => {
                texts.current[0] = el;
              }}
              font={FONT}
              fontSize={0.34}
              anchorX="left"
              anchorY="bottom"
              position={[0.45, 0.28, 0]}
              material={mats.label}
              outlineWidth={0.03}
              outlineColor={MASK}
              clipRect={[-0.2, -2, -0.2, 2]}
            >
              {lane.title}
            </Text>
            <Text
              ref={(el: THREE.Mesh | null) => {
                texts.current[1] = el;
              }}
              font={FONT}
              fontSize={0.22}
              anchorX="left"
              anchorY="bottom"
              position={[0.45, 0, 0]}
              material={mats.label}
              outlineWidth={0.025}
              outlineColor={MASK}
              clipRect={[-0.2, -2, -0.2, 2]}
            >
              {lane.lines[0] ?? ""}
            </Text>
          </Suspense>
        </Billboard>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- root

const local = new THREE.Vector3();

type Vec3 = [number, number, number];

export type TimelineProps = {
  position?: Vec3;
  /** Yaw in radians, or a full Euler tuple. */
  rotation?: number | Vec3;
};

/** The career terrace. Time runs along local -z; see the header for the frame. */
export default function Timeline({ position = [0, 0, 0], rotation = 0 }: TimelineProps) {
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
    // Stack the stones that are up so their labels never sit on top of each other.
    let slot = 0;
    for (const lane of LANES) {
      p.slots[lane.index] = slot;
      if (laneState(lane, p).up) slot++;
    }
  });

  return (
    <group ref={root} position={position} rotation={rot}>
      <Terrace />
      <Years />
      {LANES.map((lane) => (
        <LaneView key={lane.key} lane={lane} probe={probe} />
      ))}
    </group>
  );
}
