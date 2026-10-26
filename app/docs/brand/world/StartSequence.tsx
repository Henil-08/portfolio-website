"use client";

// 04 · Start sequence mock: after the boot, pick a vehicle on a loadout screen, press Enter,
// and the world builds itself around it. Both stages draw through the page's one canvas.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, View } from "@react-three/drei";
import { Count, Decode, d } from "@/components/brand/motion";
import { Lights, M } from "./models";
import { BUILD_LOG, GRID, ISLAND, Island, PLAN, PaperFloor, type BuildClock } from "./island";
import type { RefObject } from "react";
import { PowerMeter, Powers, powerName, type Follow, type PowerState } from "./powers";
import { Atv, Bike, Formula, LIVERIES, Roadster, type Livery } from "./vehicles";
import { VEHICLE_ICONS } from "./vehicleIcons";

type V3 = [number, number, number];

type Vehicle = {
  code: string;
  kind: string;
  name: string;
  line: string;
  stats: [number, number, number];
  len: number;
  cam: V3;
  target: V3;
  /** turntable display scale, see fit() */
  scale: number;
  liveries: Livery[];
  model: (l?: Livery) => ReactNode;
  icon: ReactNode;
};

/**
 * Turntable size: each vehicle is scaled so its swept radius (the farthest point from the spin
 * axis, measured off the model's vertices) lands at a set radius. TH-18 is biggest at 1.42, just
 * inside the dial ring's inner edge (0.86 × the 1.75 plinth = 1.505). The others sit between
 * true proportion (too small) and all the same size (too big): owner, 2026-10-26.
 */
const fit = (r: number, swept: number) => r / swept;

// Game stats only: how each one drives in the world, not facts about anything real.
const VEHICLES: Vehicle[] = [
  {
    code: "V01",
    kind: "Formula",
    name: "TH-18",
    line: "The open-wheeler the world was built around. Fastest on the straight, nervous on the grass.",
    stats: [96, 90, 82],
    len: 5.6,
    cam: [5.3, 2.0, 6.0],
    target: [0, 0.45, 0],
    scale: fit(1.42, 3.02), // front wing tips
    liveries: LIVERIES.V01,
    model: (l) => <Formula livery={l} />,
    icon: VEHICLE_ICONS.V01,
  },
  {
    code: "V02",
    kind: "ATV",
    name: "E14",
    line: "Like E14, the electric ATV I led at SAE e-BAJA (5th of 47, Best Acceleration). Slow on tarmac, happy off it.",
    stats: [58, 94, 74],
    len: 2.4,
    cam: [3.3, 1.75, 3.9],
    target: [0, 0.62, 0],
    scale: fit(1.0, 1.33), // tyre shoulders
    liveries: LIVERIES.V02,
    model: (l) => <Atv livery={l} />,
    icon: VEHICLE_ICONS.V02,
  },
  {
    code: "V03",
    kind: "Road car",
    name: "Atlas",
    line: "Long, low and pale, with crisp creases, a dark glass canopy and a tall wing on two struts. The easy one to start with.",
    stats: [92, 80, 82],
    len: 4.6,
    cam: [5.1, 2.0, 5.8],
    target: [0, 0.5, 0],
    scale: fit(1.25, 2.55), // wing endplates
    liveries: LIVERIES.V03,
    model: (l) => <Roadster livery={l} />,
    icon: VEHICLE_ICONS.V03,
  },
  {
    code: "V04",
    kind: "Bike",
    name: "Apollo",
    line: "A sport bike, light and quick to turn. Two wheels, so it forgives nothing.",
    stats: [84, 62, 95],
    len: 2.1,
    cam: [2.9, 1.45, 3.4],
    target: [0, 0.62, 0],
    scale: fit(0.95, 1.03), // tyres, nose to tail
    liveries: LIVERIES.V04,
    model: (l) => <Bike livery={l} />,
    icon: VEHICLE_ICONS.V04,
  },
];
const STATS = ["Speed", "Grip", "Handling"];

/* ------------------------------------------------------------------ easing and tweens */

const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
const power2Out = (k: number) => 1 - (1 - k) * (1 - k);
const power2InOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const backOut = (k: number, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);

declare global {
  interface Window {
    /** Dev only: freeze the build-in at this many seconds (for stills). */
    __buildT?: number;
    /** Dev only: freeze the loadout swap at this many seconds (for stills). */
    __swapT?: number;
  }
}

const dotFloor = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ebe9e3";
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#b9b6ab";
  g.fillRect(29, 29, 6, 6);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(300, 300);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
})();

/* ------------------------------------------------------------------ stage B scene */

/**
 * The game's own camera (components/world/Rig.tsx): a fixed world offset from the car, looking
 * at the car's position less 0.3 m, fov 34 (components/world/World.tsx). The build-in lands here.
 */
const GAME_OFFSET = new THREE.Vector3(10.5, 12.5, 14);
const GAME_FOV = 34;
/** A camera on a sphere round a target: distance, bearing (atan2(z, x)) and elevation. */
type Pose = { tx: number; ty: number; tz: number; r: number; az: number; el: number };
const END: Pose = {
  tx: GRID.x,
  ty: 0.2,
  tz: GRID.z,
  r: GAME_OFFSET.length(),
  az: Math.atan2(GAME_OFFSET.z, GAME_OFFSET.x),
  el: Math.asin(GAME_OFFSET.y / GAME_OFFSET.length()),
};
/** High over the island's middle, framing all of it. */
const over = (k: number, az: number, el: number): Pose => ({ tx: ISLAND.x, ty: 0, tz: ISLAND.z, r: ISLAND.r * k, az, el });

/** The bloom's camera keyframes: [seconds, pose], eased between. Close on the car, rising with
 * the bloom, then back down onto the game view. */
const PATH: [number, Pose][] = [
  [0, { ...END, ty: 0.5, r: 12, el: 0.42, az: END.az + 0.9 }],
  [2.4, over(2.2, END.az + 0.3, 1.05)],
  [PLAN.camEnd, END],
];
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** After the landing it follows the vehicle (a power moves it), with the power's fov kick and shake. */
function BuildCamera({ clock, followRef }: { clock: BuildClock; followRef: RefObject<Follow> }) {
  const cam = useRef<THREE.PerspectiveCamera>(null!);
  useFrame((s) => {
    const t = clock(s.clock.elapsedTime);
    const path = PATH;
    let i = 0;
    while (i < path.length - 2 && t > path[i + 1][0]) i++;
    const [t0, a] = path[i];
    const [t1, b] = path[i + 1];
    const k = power2InOut(clamp01((t - t0) / (t1 - t0)));
    // distance eases in log space, so the long fall from the overview lands softly
    const r = Math.exp(lerp(Math.log(a.r), Math.log(b.r), k));
    const az = lerp(a.az, b.az, k);
    const el = lerp(a.el, b.el, k);
    // the look-at leaves the car late on the way up and reaches it early on the way down,
    // so the car stays in frame while the camera is low
    const kt = b === END ? 1 - Math.pow(1 - k, 3) : b.r > a.r * 4 ? k * k * k : k;
    const tx = lerp(a.tx, b.tx, kt);
    const ty = lerp(a.ty, b.ty, kt);
    const tz = lerp(a.tz, b.tz, kt);
    const c = cam.current;
    const f = followRef.current;
    const w = s.clock.elapsedTime;
    const sx = f.shake * Math.sin(w * 53.1) * Math.cos(w * 31.7);
    const sy = f.shake * Math.sin(w * 47.3 + 1.3);
    c.position.set(tx + f.x + sx + Math.cos(el) * Math.cos(az) * r, ty + f.y + sy + Math.sin(el) * r, tz + f.z + Math.cos(el) * Math.sin(az) * r);
    c.lookAt(tx + f.x + sx * 0.5, ty + f.y + sy * 0.5, tz + f.z);
    const fov = GAME_FOV + f.fov;
    if (Math.abs(c.fov - fov) > 1e-3) {
      c.fov = fov;
      c.updateProjectionMatrix();
    }
  });
  return <PerspectiveCamera ref={cam} makeDefault fov={GAME_FOV} position={[GRID.x + GAME_OFFSET.x, GAME_OFFSET.y, GRID.z + GAME_OFFSET.z]} near={0.5} far={2400} />;
}

/** Daylight over the whole island, with a shadow box that covers it. */
function IslandLights() {
  return (
    <>
      <hemisphereLight args={["#ffffff", "#b8b4a9", 1.05]} />
      <directionalLight
        position={[70, 120, 50]}
        intensity={2.3}
        color="#fff6ea"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
        shadow-camera-far={420}
      />
    </>
  );
}

function BuildScene({ v, powerRef }: { v: Vehicle; powerRef: RefObject<PowerState | null> }) {
  const t0 = useRef(-1);
  const followRef = useRef<Follow>({ x: 0, y: 0, z: 0, fov: 0, shake: 0 });
  const clock = useCallback((now: number) => {
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined" && typeof window.__buildT === "number") return window.__buildT;
    if (t0.current < 0) t0.current = now;
    return now - t0.current;
  }, []);
  return (
    <>
      <color attach="background" args={["#ebe9e3"]} />
      <fog attach="fog" args={["#ebe9e3", 420, 1100]} />
      <BuildCamera clock={clock} followRef={followRef} />
      <IslandLights />
      {/* 1 · the paper floor and its dot grid, giving way as the island arrives */}
      <PaperFloor map={dotFloor} />
      {/* 2 · the whole island: first as dots in its own layout, then rising out of them */}
      <Island clock={clock} />
      {/* the chosen vehicle on its grid slot; Shift fires its power once the world has landed */}
      <Powers code={v.code} clock={clock} powerRef={powerRef} followRef={followRef}>
        {v.model()}
      </Powers>
    </>
  );
}

/* ------------------------------------------------------------------ stage A scene */

/** The turntable: one size for every vehicle. */
const PLINTH = 1.75;
const SELECT_CAM: V3 = [4.3, 2.15, 4.9];
const SELECT_TARGET: V3 = [0, 0.42, 0];
/** Loadout swap timings (s): old slides off, the table spins, the scan line reveals the new one. */
const SWAP = { old: 0.3, spin: 0.55, scan0: 0.05, scan1: 0.42, pop0: 0.12, pop1: 0.58 };
const SPIN = Math.PI * 0.8;
const power2In = (k: number) => k * k;
const power3Out = (k: number) => 1 - Math.pow(1 - k, 3);
const UP_Y = new THREE.Vector3(0, 1, 0);

/** The plinth's top: a paper disc with a dial of ticks round the rim, one orange, and the code. */
function plinthTop(code: string) {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const R = S / 2;
  g.fillStyle = "#f3f2ed";
  g.fillRect(0, 0, S, S);
  g.translate(R, R);
  g.strokeStyle = "#cfcdc4";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, 0, R * 0.86, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(0, 0, R * 0.5, 0, Math.PI * 2);
  g.stroke();
  // 120 ticks, every tenth long; the orange one points at the nose (+z is the canvas bottom)
  for (let i = 0; i < 120; i++) {
    const a = Math.PI / 2 + (i / 120) * Math.PI * 2;
    const long = i % 10 === 0;
    const r0 = R * (long ? 0.88 : 0.91);
    g.strokeStyle = i === 0 ? "#ff4f00" : long ? "#111" : "#5d5d58";
    g.lineWidth = i === 0 ? 12 : long ? 5 : 3;
    g.beginPath();
    g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    g.lineTo(Math.cos(a) * R * (i === 0 ? 0.99 : 0.97), Math.sin(a) * R * (i === 0 ? 0.99 : 0.97));
    g.stroke();
  }
  const fam = getComputedStyle(document.body).getPropertyValue("--font-plex-mono").trim() || "monospace";
  g.fillStyle = "rgba(93,93,88,0.55)";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `600 58px ${fam}, monospace`;
  g.fillText(code, 0, R * 0.7);
  g.font = `500 22px ${fam}, monospace`;
  g.fillText("HG-08 / GARAGE", 0, -R * 0.7);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A low paper drum with an ink band round its edge; the top spins with the vehicle. */
function Plinth({ code }: { code: string }) {
  const top = useMemo(() => new THREE.MeshStandardMaterial({ map: plinthTop(code), roughness: 0.85 }), [code]);
  useEffect(
    () => () => {
      top.map?.dispose();
      top.dispose();
    },
    [top],
  );
  return (
    <>
      <mesh position={[0, -0.075, 0]} material={M.paper} receiveShadow>
        <cylinderGeometry args={[PLINTH, PLINTH, 0.15, 96]} />
      </mesh>
      <mesh position={[0, -0.06, 0]} material={M.inkMatte}>
        <cylinderGeometry args={[PLINTH + 0.006, PLINTH + 0.006, 0.07, 96, 1, true]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} material={top} receiveShadow>
        <circleGeometry args={[PLINTH, 96]} />
      </mesh>
    </>
  );
}

type Slot = { v: Vehicle; l: Livery; n: number };
type Slots = { a: Slot | null; b: Slot | null; cur: "a" | "b"; n: number };
type SwapAnim = {
  n: number;
  l: Livery | null;
  t0: number;
  ts: number;
  a0: number;
  a1: number;
  h: number;
  dir: THREE.Vector3;
  /** keeps what's below the scan line */
  plane: THREE.Plane;
  clips: [THREE.Mesh, THREE.Material, THREE.Material][];
  fades: THREE.Material[];
};

/** Put back the materials the reveal swapped for clipped copies. */
function unclip(A: SwapAnim) {
  for (const [mesh, orig, clone] of A.clips) {
    if (mesh.material === clone) mesh.material = orig;
    clone.dispose();
  }
  A.clips = [];
}

const eachMesh = (o: THREE.Object3D, f: (m: THREE.Mesh, mat: THREE.Material) => void) =>
  o.traverse((x) => {
    if (x instanceof THREE.Mesh && !Array.isArray(x.material)) f(x, x.material);
  });

/**
 * Two slots take turns: on a switch the old vehicle slides off sideways and fades while the
 * table spins round, and an orange scan line sweeps up the new one, revealing it as it rises.
 * A new livery runs the scan line alone. All tweens mutate refs in useFrame.
 */
function SelectScene({ v, livery }: { v: Vehicle; livery: Livery }) {
  const [st, setSt] = useState<Slots>(() => ({ a: { v, l: livery, n: 0 }, b: null, cur: "a", n: 0 }));
  const live = st[st.cur]!;
  if (live.v !== v) {
    const next = st.cur === "a" ? "b" : "a";
    setSt({ ...st, [next]: { v, l: livery, n: st.n + 1 }, cur: next, n: st.n + 1 });
  } else if (live.l !== livery) {
    setSt({ ...st, [st.cur]: { ...live, l: livery } });
  }
  const slotA = useRef<THREE.Group>(null!);
  const slotB = useRef<THREE.Group>(null!);
  const table = useRef<THREE.Group>(null!);
  const scan = useRef<THREE.Group>(null!);
  const scanMat = useRef<THREE.MeshBasicMaterial>(null!);
  const anim = useRef<SwapAnim>({ n: -1, l: null, t0: -10, ts: -10, a0: 0, a1: 0, h: 1, dir: new THREE.Vector3(), plane: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), clips: [], fades: [] });

  useFrame((s) => {
    const now = s.clock.elapsedTime;
    const A = anim.current;
    const cur = (st.cur === "a" ? slotA : slotB).current;
    const old = (st.cur === "a" ? slotB : slotA).current;
    const curSlot = st[st.cur]!;
    if (A.n !== st.n) {
      // a switch: settle the last one, then set this one up
      unclip(A);
      A.fades.forEach((m) => m.dispose());
      A.fades = [];
      s.gl.localClippingEnabled = true;
      A.n = st.n;
      A.l = curSlot.l;
      A.t0 = A.ts = now;
      A.a0 = table.current.rotation.y;
      A.a1 = A.a0 + SPIN;
      cur.visible = true;
      cur.position.set(0, 0, 0);
      cur.rotation.y = A.a0;
      cur.scale.setScalar(1);
      eachMesh(cur, (mesh, mat) => {
        const c = mat.clone();
        c.clippingPlanes = [A.plane];
        c.clipShadows = true;
        mesh.material = c;
        A.clips.push([mesh, mat, c]);
      });
      A.h = new THREE.Box3().setFromObject(cur).max.y;
      if (st.n > 0) {
        // the old one leaves toward the camera's right, fading as it goes
        A.dir.setFromMatrixColumn(s.camera.matrixWorld, 0).setY(0).normalize();
        eachMesh(old, (mesh, mat) => {
          const c = mat.clone();
          c.transparent = true;
          c.depthWrite = false;
          mesh.material = c;
          mesh.castShadow = false;
          A.fades.push(c);
        });
      }
    } else if (A.l !== curSlot.l) {
      // a new livery: the scan line only
      A.l = curSlot.l;
      A.ts = now;
    }
    const frozen = process.env.NODE_ENV !== "production" && typeof window.__swapT === "number" ? window.__swapT : null;
    const t = frozen ?? now - A.t0;
    table.current.rotation.y = A.a0 + (A.a1 - A.a0) * power3Out(clamp01(t / SWAP.spin));
    cur.rotation.y = table.current.rotation.y;
    cur.scale.setScalar(0.96 + 0.04 * backOut(clamp01((t - SWAP.pop0) / (SWAP.pop1 - SWAP.pop0)), 2.4));
    const ko = clamp01(t / SWAP.old);
    old.visible = st.n > 0 && ko < 1;
    old.position.copy(A.dir).multiplyScalar(power2In(ko) * 2.6);
    for (const m of A.fades) m.opacity = 1 - power2Out(ko);
    // the scan line rises through the vehicle; below it the vehicle is there, above it not yet
    const k = ((frozen ?? now - A.ts) - SWAP.scan0) / (SWAP.scan1 - SWAP.scan0);
    const y = -0.02 + (A.h + 0.1) * power2InOut(clamp01(k));
    A.plane.constant = y;
    scan.current.visible = k > 0 && k < 1.25;
    scan.current.position.y = y;
    scanMat.current.opacity = 1 - clamp01((k - 1) / 0.25);
    if (k >= 1 && A.clips.length) unclip(A);
  });
  // dev only: pin the camera for stills (window.__selCam = [x, y, z])
  useFrame((s) => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __selCam?: V3 };
    if (!w.__selCam) return;
    const cur = (st.cur === "a" ? slotA : slotB).current;
    // in the vehicle's own frame, so +z is always its nose
    s.camera.position.set(...w.__selCam).applyAxisAngle(UP_Y, cur.rotation.y);
    s.camera.lookAt(0, w.__selCam[1] > 6 ? 0 : SELECT_TARGET[1], 0);
  });

  const slot = (o: Slot | null) => o && <group key={o.n} scale={o.v.scale}>{o.v.model(o.l)}</group>;
  return (
    <>
      <color attach="background" args={["#ebe9e3"]} />
      <PerspectiveCamera makeDefault position={SELECT_CAM} fov={30} />
      <OrbitControls makeDefault target={SELECT_TARGET} autoRotate autoRotateSpeed={1.4} enableZoom={false} enablePan={false} minPolarAngle={0.9} maxPolarAngle={1.45} />
      <Lights size={6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]} receiveShadow>
        <circleGeometry args={[40, 32]} />
        <meshStandardMaterial color="#e1ded6" roughness={1} />
      </mesh>
      <group ref={table}>
        <Plinth code={live.v.code} />
      </group>
      <group ref={slotA}>{slot(st.a)}</group>
      <group ref={slotB} visible={false}>
        {slot(st.b)}
      </group>
      {/* the scan line: a thin orange hoop just inside the rim, with a faint plane */}
      <group ref={scan} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PLINTH * 0.965, PLINTH, 96]} />
          <meshBasicMaterial ref={scanMat} color="#ff4f00" transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[PLINTH * 0.965, 96]} />
          <meshBasicMaterial color="#ff4f00" transparent opacity={0.045} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </>
  );
}

/* ------------------------------------------------------------------ the mock */

type Phase = "select" | "cover" | "build";

const CSS = `
.ss-cover{transform-origin:left;animation:ss-in .38s cubic-bezier(.6,0,.2,1) both}
.ss-uncover{transform-origin:right;animation:ss-out .45s cubic-bezier(.6,0,.2,1) both}
@keyframes ss-in{from{transform:scaleX(0)}to{transform:none}}
@keyframes ss-out{from{transform:none}to{transform:scaleX(0)}}
.ss-fadeout{animation:ss-fade .6s ease-in var(--d,0ms) both}
@keyframes ss-fade{to{opacity:0;transform:translateY(6px)}}
@media (prefers-reduced-motion:reduce){.ss-cover,.ss-uncover,.ss-fadeout{animation-duration:1ms}}
`;

/** What arrives when (ms), read from the island's own timeline so the log ticks with it. */
const BUILD_STEPS = BUILD_LOG();
const DONE_MS = BUILD_STEPS[BUILD_STEPS.length - 1][1];

export default function StartSequence() {
  const box = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(0);
  const [phase, setPhase] = useState<Phase>("select");
  const [run, setRun] = useState(0); // bumps to replay
  const power = useRef<PowerState | null>(null); // the stage-B power meter, shared by the scene and the HUD
  const [down, setDown] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // the chosen livery per vehicle (index into its liveries), kept while you switch around
  const [livs, setLivs] = useState<Record<string, number>>({});
  const base = VEHICLES[sel];
  const liv = livs[base.code] ?? 0;
  const livery = base.liveries[liv];
  const paint = (i: number) => setLivs((m) => ({ ...m, [base.code]: i }));
  // stage B gets the vehicle already in its chosen livery
  const v: Vehicle = { ...base, model: (l) => base.model(l ?? livery) };

  const go = () => {
    if (phase !== "select") return;
    setPhase("cover");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase("build"), 420);
  };
  const back = () => {
    clearTimeout(timer.current);
    setPhase("select");
    setRun((n) => n + 1);
  };
  const replay = () => setRun((n) => n + 1);
  const pick = (i: number) => setSel((i + VEHICLES.length) % VEHICLES.length);

  // keys only while the mock is on screen, so the page still scrolls normally elsewhere
  const live = useRef(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (live.current = e.intersectionRatio > 0.4), { threshold: [0, 0.4, 0.8] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const handlers = useRef({ go, back, pick, sel, phase });
  useEffect(() => {
    handlers.current = { go, back, pick, sel, phase };
  });
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (!live.current) return;
      const h = handlers.current;
      const k = e.code || e.key;
      if (k === "ArrowRight" || k === "ArrowLeft") {
        if (h.phase !== "select") return;
        e.preventDefault();
        h.pick(h.sel + (k === "ArrowRight" ? 1 : -1));
      } else if (k === "Enter" || k === "NumpadEnter") {
        e.preventDefault();
        h.go();
      } else if (k === "Escape") h.back();
      else return;
      setDown(k === "NumpadEnter" ? "Enter" : k);
    };
    const onUp = () => setDown(null);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      clearTimeout(timer.current);
    };
  }, []);

  const key = (k: string, label: string) => <kbd className={`x-key text-[#111] ${down === k ? "is-down" : ""}`}>{label}</kbd>;
  const selecting = phase !== "build";

  return (
    <div>
      <style>{CSS}</style>
      <div ref={box} className="relative h-[640px] w-full border-2 border-[#111] bg-white">
        {selecting ? (
          <div key={`a${run}`} data-anim="" data-run="" className="dsa-frame absolute inset-0 grid grid-rows-[auto_1fr_auto]">
            {/* ink header bar */}
            <div className="dsa-x flex items-center gap-3 bg-[#111] px-3 py-2 text-white" style={d(150)}>
              <span className="font-mono text-[12px]">
                HG-08 / GARAGE · <span className="text-[#ff4f00]">Select vehicle</span>
              </span>
              <span className="font-mono ml-auto hidden items-center gap-2 text-[11.5px] text-white/60 sm:flex">
                <span className="border border-white/40 px-1.5">Esc</span> Back
                <span className="ml-2 border border-white/40 px-1.5">← →</span> Choose
                <span className="ml-2 border border-white/40 px-1.5">Enter</span> Drive
              </span>
            </div>

            <div className="grid min-h-0 grid-cols-1 md:grid-cols-[1fr_300px]">
              <div data-cursor="drag" className="relative min-h-0 border-b-2 border-[#111] md:border-b-0 md:border-r-2">
                <View className="absolute inset-0">
                  <SelectScene v={base} livery={livery} />
                </View>
                <span className="font-mono pointer-events-none absolute left-3 top-3 z-[25] bg-white px-1.5 py-0.5 text-[11.5px] shadow-[3px_3px_0_#111] ring-2 ring-[#111]">
                  {v.code} · Drag to turn
                </span>
              </div>

              {/* spec column: decodes and counts on every switch */}
              <div key={v.code} data-anim="" data-run="" className="flex flex-col gap-4 p-4">
                <div>
                  {/* timed with the swap: the code as the old one leaves, the name with the scan line */}
                  <p className="font-mono text-[12px] text-[#ff4f00]">
                    <Decode text={`${v.code} · ${v.kind}`} run delay={40} dur={260} />
                  </p>
                  <h3 className="mt-1 text-[34px] font-semibold leading-none tracking-tight">
                    <Decode text={v.name} run delay={80} dur={360} />
                  </h3>
                  <p className="dsa-rise mt-2.5 text-[14.5px] leading-relaxed text-[#5d5d58]" style={d(180)}>
                    {v.line}
                  </p>
                </div>
                {/* livery: square swatches, the chosen one framed in ink */}
                <div className="dsa-rise" style={d(220)}>
                  <div className="flex items-baseline justify-between text-[12px] font-semibold uppercase tracking-[0.06em]">
                    <span>Livery</span>
                    <span className="font-mono text-[12px] normal-case tracking-normal text-[#5d5d58]">{livery.name}</span>
                  </div>
                  <div role="radiogroup" aria-label="Livery" className="mt-1.5 flex gap-2">
                    {v.liveries.map((o, i) => {
                      const on = i === liv;
                      return (
                        <button
                          key={o.name}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={o.name}
                          title={o.name}
                          onClick={() => paint(i)}
                          className={`relative h-8 w-8 border-2 border-[#111] p-[3px] transition-colors ${on ? "bg-[#111]" : "bg-white hover:bg-[#cfcdc4]"}`}
                        >
                          <span className="relative block h-full w-full overflow-hidden ring-1 ring-[#111]/25" style={{ background: o.body }}>
                            <span className="absolute bottom-0 right-0 h-1/2 w-1/2" style={{ background: o.accent }} />
                            <span className="absolute bottom-0 left-0 h-[3px] w-1/2" style={{ background: o.trim }} />
                          </span>
                          {on && <span className="absolute -bottom-[7px] left-1/2 h-[3px] w-3 -translate-x-1/2 bg-[#ff4f00]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-auto space-y-3">
                  {STATS.map((s, i) => (
                    <div key={s}>
                      <div className="flex items-baseline justify-between text-[12px] font-semibold uppercase tracking-[0.06em]">
                        <span>{s}</span>
                        <span className="font-mono text-[13px]">
                          <Count value={String(v.stats[i])} run delay={140 + i * 70} dur={420} />
                        </span>
                      </div>
                      <div className="mt-1 h-[10px] border-2 border-[#111] bg-[#f3f2ed]">
                        <div className="h-full origin-left" style={{ width: `${v.stats[i]}%` }}>
                          <div className="dsa-x h-full bg-[#111]" style={d(140 + i * 70)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="font-mono text-[11px] text-[#5d5d58]">Game stats, out of 100</p>
                </div>
              </div>
            </div>

            {/* the four cards and the Enter prompt */}
            <div className="grid grid-cols-2 border-t-2 border-[#111] sm:grid-cols-[repeat(4,1fr)_auto]">
              {VEHICLES.map((o, i) => {
                const on = i === sel;
                return (
                  <button
                    key={o.code}
                    type="button"
                    onClick={() => pick(i)}
                    aria-pressed={on}
                    className={`dsa-wipe group flex items-center gap-3 border-r-2 border-[#111] px-3 py-2.5 text-left transition-colors ${on ? "bg-[#111] text-white" : "bg-white hover:bg-[#111] hover:text-white"}`}
                    style={d(380 + i * 90)}
                  >
                    <svg viewBox="0 0 64 28" className="h-7 w-14 shrink-0" fill="currentColor" aria-hidden>
                      {o.icon}
                    </svg>
                    <span className="min-w-0">
                      <span className={`font-mono block text-[11px] ${on ? "text-[#ff4f00]" : "text-[#5d5d58] group-hover:text-white/60"}`}>
                        {o.code} · {o.kind}
                      </span>
                      <span className="block truncate text-[15px] font-semibold leading-tight">{o.name}</span>
                    </span>
                  </button>
                );
              })}
              <div className="col-span-2 flex items-center justify-center gap-3 px-4 py-2.5 sm:col-span-1">
                <button type="button" onClick={go} className="x-btn x-primary dsa-flicker" style={d(800)}>
                  Press {key("Enter", "Enter")} to drive <span className="x-arrow">→</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div key={`b${run}`} className="absolute inset-0">
            <View className="absolute inset-0">
              <BuildScene v={v} powerRef={power} />
            </View>
            {/* HUD over the build */}
            <div data-anim="" data-run="" className="pointer-events-none absolute inset-0 z-[25]">
              <div className="dsa-frame absolute left-3 top-3 w-[210px] border-2 border-[#111] bg-white">
                <div className="font-mono bg-[#111] px-2 py-1 text-[11.5px] text-white">
                  HG-08 / WORLD · <span className="text-[#ff4f00]">{v.code}</span>
                </div>
                <ol className="px-2 py-1.5">
                  {BUILD_STEPS.map(([s, ms], i) => (
                    <li key={s} className="dsa-wipe font-mono flex justify-between text-[11.5px] leading-[1.7]" style={d(ms)}>
                      <span>
                        <span className="text-[#ff4f00]">{String(i + 1).padStart(2, "0")}</span> {s}
                      </span>
                      <span className="text-[#5d5d58]">{(ms / 1000).toFixed(2)}s</span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="ss-fadeout font-mono absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap text-[13px]" style={d(DONE_MS - 600)}>
                Press <kbd className="x-key is-down">Enter</kbd> to drive
              </p>
              <div className="dsa-flicker absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center border-2 border-[#111] bg-white shadow-[3px_3px_0_#111]" style={d(DONE_MS + 150)}>
                <span className="font-mono bg-[#111] px-2 py-1 text-[12px] text-white">E</span>
                <span className="px-2.5 py-1 text-[13px] font-semibold uppercase tracking-[0.06em]">
                  <span className="font-mono mr-1.5 text-[#ff4f00]">Z01</span>Start grid
                </span>
              </div>
              {/* the power meter: fills from the start of the build, Shift fires it once the world has landed */}
              <div className="dsa-flicker absolute right-3 top-3" style={d(DONE_MS + 250)}>
                <PowerMeter code={v.code} powerRef={power} liveRef={live} />
              </div>
            </div>
          </div>
        )}
        {phase === "cover" && <div className="ss-cover absolute inset-0 z-[26] bg-[#111]" />}
        {phase === "build" && <div key={`u${run}`} className="ss-uncover pointer-events-none absolute inset-0 z-[26] bg-[#111]" />}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={replay} className="x-btn x-secondary">
          ↺ Replay {phase === "build" ? "build-in" : "select"}
        </button>
        {phase === "build" && (
          <button type="button" onClick={back} className="x-btn x-secondary">
            {key("Escape", "Esc")} Back to select
          </button>
        )}
        <span className="font-mono text-[12px] text-[#5d5d58]">
          {phase === "build" ? `${v.code} ${v.name} · Shift · ${powerName(v.code)}` : `${v.code} ${v.name} selected · ← → to switch`}
        </span>
      </div>
    </div>
  );
}
