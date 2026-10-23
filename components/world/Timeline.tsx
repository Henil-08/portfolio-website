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

import { Suspense, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, RoundedBox, Text } from "@react-three/drei";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
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
  // Garden flagstones: warm cream slabs, two sizes in running courses, soft grout.
  const pxPerM = 32;
  const w = Math.round((PLAZA.maxX - PLAZA.minX) * pxPerM);
  const h = Math.round((PLAZA.maxZ - PLAZA.minZ) * pxPerM);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const r = seeded(21);
  ctx.fillStyle = "#dccaa8";
  ctx.fillRect(0, 0, w, h);
  const row = pxPerM * 1.1;
  for (let y = 0; y < h; y += row) {
    let x = -r() * pxPerM;
    while (x < w) {
      const sw = pxPerM * (1.2 + Math.floor(r() * 3) * 0.4);
      const v = r();
      ctx.fillStyle = `rgb(${238 - v * 9},${227 - v * 9},${204 - v * 8})`;
      ctx.beginPath();
      ctx.roundRect(x + 1.2, y + 1.2, sw - 2.4, row - 2.4, 3);
      ctx.fill();
      x += sw;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const STONE = "#e9dcc4";
const EDGE = "#c9b48e";
const GROOVE = "#2c2622"; // the dark channel each neon line is set into

function Plaza() {
  const map = useMemo(() => paverTexture(), []);
  const w = PLAZA.maxX - PLAZA.minX;
  const d = PLAZA.maxZ - PLAZA.minZ;
  const cx = (PLAZA.minX + PLAZA.maxX) / 2;
  const cz = (PLAZA.minZ + PLAZA.maxZ) / 2;
  const depth = 0.4; // skirt so small terrain bumps never poke through
  const rim = 0.32;
  return (
    <group>
      {/* A soft, bevelled stone edge all round, flush enough to drive over. */}
      <RoundedBox args={[w + rim * 2, depth, d + rim * 2]} radius={0.12} smoothness={3} position={[cx, TOP - depth / 2 - 0.001, cz]} receiveShadow>
        <meshStandardMaterial color={EDGE} roughness={0.9} />
      </RoundedBox>
      <mesh position={[cx, TOP, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={map} color={STONE} roughness={0.92} />
      </mesh>
      {/* faint year seams across the terrace */}
      {Array.from({ length: T1 - T0 + 1 }, (_, i) => (
        <mesh key={i} position={[cx, TOP + 0.002, zOf(T0 + i)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w - 0.6, 0.07]} />
          <meshStandardMaterial color={EDGE} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- planters

// Low stone planters along both long sides, with gaps to walk (or drive) through.
const PLANTER = { len: 3.2, w: 1.1, h: 0.42, gap: 0.8 };
export const PLANTER_OUT = 0.32 + 0.35 + PLANTER.w / 2; // from the terrace edge to a planter's centre

function planterSpots() {
  const out: Vec3[] = [];
  const n = Math.floor((PLAZA.maxZ - PLAZA.minZ + PLANTER.gap) / (PLANTER.len + PLANTER.gap));
  const span = n * PLANTER.len + (n - 1) * PLANTER.gap;
  for (const x of [PLAZA.minX - PLANTER_OUT, PLAZA.maxX + PLANTER_OUT])
    for (let i = 0; i < n; i++) out.push([x, 0, -span / 2 + PLANTER.len / 2 + i * (PLANTER.len + PLANTER.gap)]);
  return out;
}

const planterBodyGeo = new RoundedBoxGeometry(PLANTER.w, PLANTER.h, PLANTER.len, 3, 0.1);
const shrubGeo = new THREE.IcosahedronGeometry(1, 2);

function Planters({ colliders }: { colliders: boolean }) {
  const spots = useMemo(() => planterSpots(), []);
  const body = useRef<THREE.InstancedMesh>(null);
  const soil = useRef<THREE.InstancedMesh>(null);
  const shrubs = useRef<THREE.InstancedMesh>(null);
  const shrubCount = spots.length * 4;
  useLayoutEffect(() => {
    const r = seeded(8);
    const o = new THREE.Object3D();
    const greens = ["#6f8f5a", "#5c7a4b", "#7f9670"].map((c) => new THREE.Color(c));
    spots.forEach((p, i) => {
      o.position.set(p[0], PLANTER.h / 2, p[2]);
      o.scale.set(1, 1, 1);
      o.rotation.set(0, 0, 0);
      o.updateMatrix();
      body.current?.setMatrixAt(i, o.matrix);
      o.position.set(p[0], PLANTER.h - 0.02, p[2]);
      o.scale.set(PLANTER.w - 0.22, 0.04, PLANTER.len - 0.22);
      o.updateMatrix();
      soil.current?.setMatrixAt(i, o.matrix);
      for (let k = 0; k < 4; k++) {
        const s = 0.32 + r() * 0.12;
        o.position.set(p[0] + (r() - 0.5) * 0.25, PLANTER.h + s * 0.55, p[2] - PLANTER.len / 2 + 0.45 + k * ((PLANTER.len - 0.9) / 3));
        o.scale.set(s, s * 0.85, s);
        o.rotation.set(0, r() * 6, 0);
        o.updateMatrix();
        shrubs.current?.setMatrixAt(i * 4 + k, o.matrix);
        shrubs.current?.setColorAt(i * 4 + k, greens[Math.floor(r() * greens.length)]);
      }
    });
    for (const m of [body.current, soil.current, shrubs.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }, [spots]);
  return (
    <group>
      <instancedMesh ref={body} args={[planterBodyGeo, undefined, spots.length]} castShadow receiveShadow>
        <meshStandardMaterial color={EDGE} roughness={0.88} />
      </instancedMesh>
      <instancedMesh ref={soil} args={[unitBoxGeo, undefined, spots.length]} receiveShadow>
        <meshStandardMaterial color="#8c7461" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={shrubs} args={[shrubGeo, undefined, shrubCount]} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.85} />
      </instancedMesh>
      {colliders && (
        <RigidBody type="fixed" colliders={false}>
          {spots.map((p, i) => (
            <CuboidCollider key={i} args={[PLANTER.w / 2, PLANTER.h / 2, PLANTER.len / 2]} position={[p[0], PLANTER.h / 2, p[2]]} />
          ))}
        </RigidBody>
      )}
    </group>
  );
}

// ---------------------------------------------------------------- bollards

// Garden bollards at every year on both sides: a round stone post with a glowing band.
const BOLLARD = { r: 0.15, h: 0.7 };
const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
const bollardGeo = (() => {
  const g = new THREE.CapsuleGeometry(BOLLARD.r, BOLLARD.h - BOLLARD.r * 2, 6, 20);
  g.translate(0, BOLLARD.h / 2, 0);
  return g;
})();
const bandGeo = (() => {
  const g = new THREE.CylinderGeometry(BOLLARD.r + 0.008, BOLLARD.r + 0.008, 0.06, 20, 1, true);
  g.translate(0, BOLLARD.h * 0.66, 0);
  return g;
})();

function Posts({ colliders }: { colliders: boolean }) {
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, side: THREE.DoubleSide }), []);
  const posts = useRef<THREE.InstancedMesh>(null);
  const bands = useRef<THREE.InstancedMesh>(null);
  useFrame(({ clock }) => {
    const k = dayNight.night;
    const flicker = 0.94 + Math.sin(clock.elapsedTime * 2.1) * 0.06;
    glow.color.setRGB(1, 0.62, 0.36).multiplyScalar((0.75 + k * 0.9) * flicker);
  });
  const spots = useMemo(() => {
    const out: Vec3[] = [];
    for (let t = T0; t <= T1; t++) {
      out.push([PLAZA.minX + 0.45, TOP, zOf(t)]);
      out.push([PLAZA.maxX - 0.45, TOP, zOf(t)]);
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    spots.forEach((p, i) => {
      m.makeTranslation(p[0], p[1], p[2]);
      posts.current?.setMatrixAt(i, m);
      bands.current?.setMatrixAt(i, m);
    });
    for (const im of [posts.current, bands.current]) if (im) im.instanceMatrix.needsUpdate = true;
  }, [spots]);
  return (
    <group>
      <instancedMesh ref={posts} args={[bollardGeo, undefined, spots.length]} castShadow receiveShadow>
        <meshStandardMaterial color="#4a4440" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={bands} args={[bandGeo, glow, spots.length]} />
      {colliders && (
        <RigidBody type="fixed" colliders={false}>
          {spots.map((p, i) => (
            <CylinderCollider key={i} args={[BOLLARD.h / 2, BOLLARD.r]} position={[p[0], p[1] + BOLLARD.h / 2, p[2]]} />
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

  const yLine = TOP + 0.007;
  return (
    <group>
      {/* a dark groove cut into the stone, the dim tube in it and the lit part on top */}
      <mesh position={[x, TOP + 0.003, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.3, len + 0.3]} />
        <meshStandardMaterial color={GROOVE} roughness={0.8} />
      </mesh>
      <mesh geometry={strip} material={mats.dim} position={[x, yLine, z0]} scale={[STRIP_W, 1, len]} />
      <mesh ref={litStrip} geometry={strip} material={mats.lit} position={[x, yLine + 0.002, z0]} scale={[STRIP_W, 1, 0.0001]} visible={false} />

      {/* start node (filled), set in a round stone */}
      <mesh position={[x, TOP + 0.005, z0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.4, 24]} />
        <meshStandardMaterial color={GROOVE} roughness={0.8} />
      </mesh>
      <mesh ref={startNode} geometry={flatSquare} material={mats.dim} position={[x, TOP + 0.01, z0]} scale={0.4} />

      {/* end node: hollow when the role is done, a pulsing square while it's still going */}
      <mesh position={[x, TOP + 0.005, z1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.4, 24]} />
        <meshStandardMaterial color={GROOVE} roughness={0.8} />
      </mesh>
      {lane.ongoing ? (
        <mesh ref={endNode} geometry={flatSquare} material={mats.dim} position={[x, TOP + 0.01, z1]} scale={0.4} />
      ) : (
        <mesh ref={endNode} geometry={hollowSquare} material={mats.dim} position={[x, TOP + 0.01, z1]} />
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
      <Planters colliders={colliders} />
      <Posts colliders={colliders} />
      {LANES.map((lane) => (
        <LaneView key={lane.key} lane={lane} probe={probe} />
      ))}
      <YearCounter probe={probe} />
    </group>
  );
}
