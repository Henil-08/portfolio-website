"use client";

// The opening in the canvas (docs/BRAND.md, approved 2026-10-26; the mock is
// app/docs/brand/world/StartSequence.tsx): the boot warms every shader, the garage turntable
// stands on the car's own spot, Enter aligns it onto the bloom's first frame, and the real world
// blooms out round the car (bloom/patch.ts hides it, bloom/plan.ts times it) until the camera
// lands on the game's chase view (Rig.tsx OFFSET) and driving starts.
//
// Frames: the garage is drawn in "table" units (the mock's), in a group at the car's spot scaled
// by k = VEHICLE_SCALE / the vehicle's turntable scale, so the handover onto the world is exact.
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getState, setState, useWorld } from "../store";
import { carState } from "../carState";
import { SPAWN } from "../layout";
import { heightAt } from "../terrain";
import { PLAYER_MODEL, VEHICLE_SCALE } from "../Vehicle";
import { liveryOf, vehicleByCode, type Livery, type VehicleCode } from "../vehicles";
import { revealSound } from "../sound";
import { ALIGN, boot, opening, setStage, skipping, stageTime, useOpening } from "./state";
import { ISLAND, PLAN, buildDots, reachFrom, type Bloom } from "./plan";
import { U, bloomOff, bloomOn, bloomStats, scan, warmOwn } from "./patch";

type V3 = [number, number, number];
const S = VEHICLE_SCALE;

/* ------------------------------------------------------------------ easing */

const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const power2In = (k: number) => k * k;
const power2Out = (k: number) => 1 - (1 - k) * (1 - k);
const power3Out = (k: number) => 1 - Math.pow(1 - k, 3);
const power2InOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const backOut = (k: number, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/* ------------------------------------------------------------------ the garage numbers (the mock's) */

/**
 * Turntable size: each vehicle is scaled so its swept radius lands at a set radius. TH-18 is the
 * biggest at 1.42, just inside the dial ring's inner edge; the others sit between true proportion
 * and all the same size (owner, 2026-10-26).
 */
const TABLE_SCALE: Record<VehicleCode, number> = { V01: 1.42 / 3.02, V02: 1.0 / 1.33, V03: 1.25 / 2.55, V04: 0.95 / 1.03 };
/** table units to world metres, per vehicle */
const kOf = (code: VehicleCode) => S / TABLE_SCALE[code];
const PLINTH = 1.75;
const SELECT_CAM: V3 = [4.3, 2.15, 4.9];
const SELECT_TARGET_Y = 0.42;
const SELECT_FOV = 30;
/** the turntable's slow spin, as the mock's orbit autoRotateSpeed 1.4 (rad/s) */
const SPIN_RATE = ((2 * Math.PI) / 60) * 1.4;
/** Swap timings (s): the old one slides off, the table spins, the scan line reveals the new one. */
const SWAP = { old: 0.3, spin: 0.55, scan0: 0.05, scan1: 0.42, pop0: 0.12, pop1: 0.58 };
const SPIN = Math.PI * 0.8;
/** The dot floor's height under the table top (table units): at the plinth's foot in the garage, then
 * just under the vehicle once aligned, where the bloom keeps it. One floor from the boot on. */
const FLOOR_SELECT = -0.15;
const FLOOR_BUILD = -0.03; // m

/* ------------------------------------------------------------------ the game camera and the bloom's path */

/** The game's chase camera (Rig.tsx): a fixed world offset from the car, looking at it less 0.3 m, fov 34. */
const GAME_OFFSET = new THREE.Vector3(10.5, 12.5, 14);
const GAME_FOV = 34;
type Pose = { tx: number; ty: number; tz: number; r: number; az: number; el: number };
const END_AZ = Math.atan2(GAME_OFFSET.z, GAME_OFFSET.x);
/** The bloom's first frame, close on the car (the mock's 12 m round a true-size car, at game scale). */
const START = { ty: 0.41 * S, r: 12 * S, el: 0.42, az: END_AZ + 0.9 };

function endPose(portrait: boolean): Pose {
  const o = GAME_OFFSET.clone().multiplyScalar(portrait ? 1.45 : 1);
  return { tx: carState.pos.x, ty: carState.pos.y - 0.3, tz: carState.pos.z, r: o.length(), az: Math.atan2(o.z, o.x), el: Math.asin(o.y / o.length()) };
}

/* ------------------------------------------------------------------ the player's vehicle in the scene */

/** The player's model group (Vehicle.tsx `PLAYER_MODEL`), cached while it stays in the scene. */
let player: THREE.Object3D | null = null;
function findPlayer(scene: THREE.Scene) {
  let p: THREE.Object3D | null = player;
  while (p && p !== scene) p = p.parent;
  if (player && p === scene) return player;
  player = scene.getObjectByName(PLAYER_MODEL) ?? null;
  return player;
}

/** Where the vehicle stands: its ground point and heading (rotation about y turning +z forward). */
const spot = { x: SPAWN[0], y: heightAt(SPAWN[0], SPAWN[1]), z: SPAWN[1], yaw: SPAWN[2] + Math.PI / 2 };
const _v = new THREE.Vector3();
function readSpot(scene: THREE.Scene) {
  const p = findPlayer(scene);
  if (!p) return;
  p.updateWorldMatrix(true, false);
  _v.setFromMatrixPosition(p.matrixWorld);
  spot.x = _v.x;
  spot.y = _v.y;
  spot.z = _v.z;
  _v.set(0, 0, 1).transformDirection(p.matrixWorld);
  spot.yaw = Math.atan2(_v.x, _v.z);
}

/* ------------------------------------------------------------------ the dot floor */

const dotTexture = (() => {
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

/** The paper dot floor (the boot's background, components/ui/Boot.tsx): under the garage, then
 * wherever the world hasn't arrived yet. */
const floorMat = (() => {
  const m = new THREE.MeshBasicMaterial({ map: dotTexture });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vFloorP;").replace("#include <project_vertex>", "#include <project_vertex>\nvFloorP = (modelMatrix * vec4(transformed, 1.0)).xz;");
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec2 vFloorP; uniform float uBloomT; uniform vec2 uBloomC; uniform float uBloomR;`,
      )
      .replace("void main() {", `void main() {\n  if (${PLAN.solid.a.toFixed(3)} + ${PLAN.solid.b.toFixed(3)} * pow(min(1.0, distance(vFloorP, uBloomC) / uBloomR), ${(1 / 1.3).toFixed(5)}) <= uBloomT) discard;`);
  };
  m.customProgramCacheKey = () => "bloom-floor";
  return m;
})();

/* ------------------------------------------------------------------ the dots */

const dotMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: { uTime: U.uBloomT, uDpr: { value: 1 }, uInk: { value: new THREE.Color("#151515") }, uHot: { value: new THREE.Color("#ff4f00") } },
  vertexShader: `
    attribute float aSize; attribute float aHot; attribute float aDot; attribute float aSolid;
    uniform float uTime; uniform float uDpr; uniform vec3 uInk; uniform vec3 uHot;
    varying vec3 vCol; varying float vA;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      float age = uTime - aDot;
      float gone = clamp((uTime - aSolid) / 0.5, 0.0, 1.0);
      vA = step(0.0, age) * (1.0 - gone);
      // a square dot a few pixels wide at any distance; it lands with a small overshoot
      float px = clamp(1100.0 / -mv.z, 2.2, 6.0) * aSize;
      float pop = 1.0 + 0.9 * exp(-max(age, 0.0) * 9.0);
      gl_PointSize = vA > 0.0 ? px * pop * (1.0 - 0.4 * gone) * uDpr : 0.0;
      // it lights up orange as it appears, then settles to ink (the start marks stay orange)
      vCol = mix(uInk, uHot, max(aHot, 1.0 - smoothstep(0.05, 0.32, age)));
    }`,
  fragmentShader: `
    varying vec3 vCol; varying float vA;
    void main(){
      if (vA <= 0.0) discard;
      gl_FragColor = vec4(vCol, vA);
      #include <colorspace_fragment>
    }`,
});

/** The trees' real positions, read off the tree registry's instanced meshes (foliage/registry.ts). */
function treeSpots(scene: THREE.Scene) {
  const out: [number, number][] = [];
  const m = new THREE.Matrix4();
  for (const o of scene.children) {
    const im = o as THREE.InstancedMesh;
    if (!im.isInstancedMesh || !im.name.startsWith("trees-") || im.name === "trees-bush") continue;
    for (let i = 0; i < im.count; i++) {
      im.getMatrixAt(i, m);
      out.push([m.elements[12], m.elements[14]]);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ the plinth */

/** The plinth's top: a paper disc with a dial of ticks round the rim, one orange, and the code. */
function plinthTop(code: string) {
  const SZ = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = SZ;
  const g = c.getContext("2d")!;
  const R = SZ / 2;
  g.fillStyle = "#f3f2ed";
  g.fillRect(0, 0, SZ, SZ);
  g.translate(R, R);
  g.strokeStyle = "#cfcdc4";
  g.lineWidth = 3;
  for (const k of [0.86, 0.5]) {
    g.beginPath();
    g.arc(0, 0, R * k, 0, Math.PI * 2);
    g.stroke();
  }
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

const PAPER = new THREE.MeshStandardMaterial({ color: "#f3f2ed", roughness: 0.6 });
const INK_MATTE = new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.8 });

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
      <mesh position={[0, -0.075, 0]} material={PAPER} receiveShadow>
        <cylinderGeometry args={[PLINTH, PLINTH, 0.15, 96]} />
      </mesh>
      <mesh position={[0, -0.06, 0]} material={INK_MATTE}>
        <cylinderGeometry args={[PLINTH + 0.006, PLINTH + 0.006, 0.07, 96, 1, true]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} material={top} receiveShadow>
        <circleGeometry args={[PLINTH, 96]} />
      </mesh>
    </>
  );
}

/* ------------------------------------------------------------------ the turntable and its swap */

type Slot = { code: VehicleCode; l: Livery; n: number };
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

/** Clipped copies, kept per material while the garage is up so their programs stay compiled. */
const clipCache = new Map<THREE.Material, THREE.Material>();
function unclip(A: SwapAnim) {
  for (const [mesh, orig, clone] of A.clips) if (mesh.material === clone) mesh.material = orig;
  A.clips = [];
}
const eachMesh = (o: THREE.Object3D, f: (m: THREE.Mesh, mat: THREE.Material) => void) =>
  o.traverse((x) => {
    if (x instanceof THREE.Mesh && !Array.isArray(x.material)) f(x, x.material);
  });

/**
 * The garage: the turntable on the car's spot, two slots that take turns (the old vehicle slides
 * off and fades while the table spins, an orange scan line sweeps up the new one), then on Enter
 * the align onto the bloom, then the plinth sinking as the world arrives. All tweens mutate refs.
 */
function Garage() {
  const code = useWorld((s) => s.vehicle);
  const liveryName = useWorld((s) => s.livery);
  const stage = useOpening((s) => s.stage);
  const livery = liveryOf(code, liveryName);
  const [st, setSt] = useState<Slots>(() => ({ a: { code, l: livery, n: 0 }, b: null, cur: "a", n: 0 }));
  const live = st[st.cur]!;
  if (live.code !== code) {
    const next = st.cur === "a" ? "b" : "a";
    setSt({ ...st, [next]: { code, l: livery, n: st.n + 1 }, cur: next, n: st.n + 1 });
  } else if (live.l !== livery) {
    setSt({ ...st, [st.cur]: { ...live, l: livery } });
  }
  const root = useRef<THREE.Group>(null!);
  const slotA = useRef<THREE.Group>(null!);
  const slotB = useRef<THREE.Group>(null!);
  const table = useRef<THREE.Group>(null!);
  const scanG = useRef<THREE.Group>(null!);
  const scanMat = useRef<THREE.MeshBasicMaterial>(null!);
  const spinRef = useRef(0);
  const anim = useRef<SwapAnim>({ n: -1, l: null, t0: -10, ts: -10, a0: 0, a1: 0, h: 1, dir: new THREE.Vector3(), plane: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), clips: [], fades: [] });

  useEffect(
    () => () => {
      for (const c of clipCache.values()) c.dispose();
      clipCache.clear();
    },
    [],
  );

  useFrame((s, dt) => {
    const g = root.current;
    const stg = opening.get().stage;
    g.visible = stg !== "done";
    if (stg === "done") return;
    const k = kOf(st[st.cur]!.code);
    // the table stands on the car's spot, in table units
    g.position.set(spot.x, spot.y, spot.z);
    g.scale.setScalar(k);

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
      A.a1 = A.a0 + (st.n > 0 ? SPIN : 0);
      cur.visible = true;
      cur.position.set(0, 0, 0);
      cur.rotation.y = A.a0;
      cur.scale.setScalar(1);
      if (st.n > 0) {
        eachMesh(cur, (mesh, mat) => {
          let c = clipCache.get(mat);
          if (!c) {
            c = mat.clone();
            c.clippingPlanes = [A.plane];
            c.clipShadows = true;
            clipCache.set(mat, c);
          }
          mesh.material = c;
          A.clips.push([mesh, mat, c]);
        });
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
      A.h = new THREE.Box3().setFromObject(cur).max.y / k - spot.y / k;
    } else if (A.l !== curSlot.l) {
      // a new livery: the scan line only
      A.l = curSlot.l;
      A.ts = now;
    }
    if (stg === "boot" || stg === "select") {
      // the slow spin, and drag to turn
      const d = opening.drag;
      spinRef.current += (d.held ? 0 : SPIN_RATE * Math.min(0.05, dt)) + d.yaw;
      d.yaw = 0;
    }
    const spin = spinRef.current;
    const frozen = process.env.NODE_ENV !== "production" && typeof window.__swapT === "number" ? window.__swapT : null;
    const t = frozen ?? now - A.t0;
    if (stg === "boot" || stg === "select") {
      table.current.rotation.y = A.a0 + (A.a1 - A.a0) * power3Out(clamp01(t / SWAP.spin)) + spin;
      align.yaw0 = table.current.rotation.y;
    } else if (stg === "align") {
      const ka = power2InOut(clamp01(stageTime(window.__alignT) / ALIGN));
      table.current.rotation.y = lerp(align.yaw0, align.yaw0 + wrap(spot.yaw - align.yaw0), ka);
    } else {
      // the build: the plinth sinks into the ground as the world blooms round it
      table.current.rotation.y = spot.yaw;
      const kb = power2InOut(clamp01((stageTime(window.__buildT) - 0.15) / 0.7));
      table.current.position.y = -kb * (0.17 * S) / k;
      table.current.visible = kb < 1;
    }
    if (stg !== "build") {
      table.current.position.y = 0;
      table.current.visible = true;
    }
    cur.rotation.y = table.current.rotation.y;
    cur.visible = stg !== "build";
    cur.scale.setScalar(0.96 + 0.04 * backOut(clamp01((t - SWAP.pop0) / (SWAP.pop1 - SWAP.pop0)), 2.4));
    const ko = clamp01(t / SWAP.old);
    old.visible = st.n > 0 && ko < 1 && stg !== "build";
    old.position.copy(A.dir).multiplyScalar(power2In(ko) * 2.6);
    for (const m of A.fades) m.opacity = 1 - power2Out(ko);
    // the scan line rises through the vehicle; below it the vehicle is there, above it not yet
    const ks = ((frozen ?? now - A.ts) - SWAP.scan0) / (SWAP.scan1 - SWAP.scan0);
    const y = -0.02 + (A.h + 0.1) * power2InOut(clamp01(ks));
    // the clip plane is in world space: the table's scale and height
    A.plane.constant = spot.y + y * k;
    scanG.current.visible = ks > 0 && ks < 1.25 && A.n > 0 && stg !== "build";
    scanG.current.position.y = y;
    scanMat.current.opacity = 1 - clamp01((ks - 1) / 0.25);
    if (ks >= 1 && A.clips.length) unclip(A);
  });

  const slot = (o: Slot | null) => {
    if (!o) return null;
    const M = vehicleByCode[o.code].Model;
    return (
      <group key={o.n} scale={TABLE_SCALE[o.code]}>
        <M livery={o.l} />
      </group>
    );
  };
  return (
    <group ref={root} userData={{ bloomSkip: true }} visible={stage !== "done"}>
      <group ref={table}>
        <Plinth code={live.code} />
      </group>
      <group ref={slotA}>{slot(st.a)}</group>
      <group ref={slotB} visible={false}>
        {slot(st.b)}
      </group>
      {/* the scan line: a thin orange hoop just inside the rim, with a faint plane */}
      <group ref={scanG} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PLINTH * 0.965, PLINTH, 96]} />
          <meshBasicMaterial ref={scanMat} color="#ff4f00" transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[PLINTH * 0.965, 96]} />
          <meshBasicMaterial color="#ff4f00" transparent opacity={0.045} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

/** The align's start: the table's heading and the camera's pose when Enter was pressed. */
const align = { yaw0: 0, r: 0, el: 0, fov: SELECT_FOV, ox: 0, oy: 0, has: false };

/* ------------------------------------------------------------------ the driver: boot, camera, bloom */

/** Dev and headless checks: ?nowarm skips the up-front compiles (shaders then compile as they're drawn). */
const warm = !(process.env.NODE_ENV !== "production" && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("nowarm"));

const bloom: Bloom = { cx: SPAWN[0], cz: SPAWN[1], y: 0, R: 100 };

/**
 * Runs the whole opening. Mount it after <CameraRig /> (same frame priority, later in the
 * tree), so its camera writes land after the rig's.
 */
export function Opening() {
  const { gl, scene, camera, size } = useThree();
  const stage = useOpening((s) => s.stage);
  const [dots, setDots] = useState<THREE.BufferGeometry | null>(null);
  const floor = useRef<THREE.Mesh>(null);
  const w = useRef({ step: 0, frames: 0, t: 0, planned: 1, el: Math.asin(SELECT_CAM[1] / Math.hypot(...SELECT_CAM)) });

  useEffect(() => {
    opening.restore = bloomOff;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __bloom: object }).__bloom = { stats: bloomStats, opening, boot, warm: () => ({ ...w.current }), where: () => (readSpot(scene), { ...spot }) };
  }, [scene]);

  useEffect(() => () => dots?.dispose(), [dots]);

  // plans the bloom round the car where it stands now: centre, reach, the dots and the log
  const plan = () => {
    readSpot(scene);
    bloom.cx = spot.x;
    bloom.cz = spot.z;
    bloom.y = spot.y;
    bloom.R = reachFrom(spot.x, spot.z);
    U.uBloomC.value.set(bloom.cx, bloom.cz);
    U.uBloomR.value = bloom.R;
    const d = buildDots(bloom, treeSpots(scene), { yaw: spot.yaw });
    opening.set({ log: d.log });
    setDots(d.geo);
  };

  useFrame((s) => {
    const g = getState();
    const st = w.current;
    const stg = opening.get().stage;
    const c = s.camera as THREE.PerspectiveCamera;
    dotMat.uniforms.uDpr.value = s.gl.getPixelRatio();

    if (stg === "boot") {
      if (!g.ready) return;
      if (skipping()) {
        // ?skip: no opening at all
        setStage("done");
        boot.out = true;
        setState({ phase: "world", revealed: true });
        return;
      }
      st.frames++;
      // the world's own programs compile on the frames behind the boot; after a few, the patch
      // goes on and every patched program compiles, a few frames compile the shadow pass, then the
      // garage opens
      if (st.step === 0 && st.frames > 20) {
        st.step = 3;
        boot.stage = "shaders";
        plan();
        const me = findPlayer(scene);
        scan(scene, (o) => o === me);
        bloomOn();
        U.uBloomT.value = -1e4;
        const done = () => {
          st.step = 4;
          st.frames = 0;
        };
        if (warm) gl.compileAsync(scene, camera).finally(done);
        else done();
      } else if (st.step === 4 && st.frames > 3) {
        st.step = 5;
        st.t = performance.now();
        boot.stage = "ready";
      } else if (st.step === 5 && performance.now() - st.t > 450) {
        st.step = 6;
        boot.out = true;
        setStage("select");
      }
    }
    // in the garage: the world's own programs, for when the build is done
    if (stg === "select" && st.step === 6) {
      st.step = 7;
      if (warm) warmOwn(() => gl.compileAsync(scene, camera));
    }

    // the player's own vehicle hides while the garage shows its stand-in
    const p = stg === "done" ? null : findPlayer(scene);
    if (p) p.visible = stg === "build";

    const run = opening.get().run;
    if (stg === "select" && run > 1 && st.planned !== run) {
      // back in the garage from the world: plan round where the car is now and hide the world
      st.planned = run;
      plan();
      const me = findPlayer(scene);
      scan(scene, (o) => o === me);
      bloomOn();
    }
    if (stg === "select" || stg === "boot") {
      U.uBloomT.value = -1e4;
    }
    if (stg === "done") return;
    {
      // the one dot floor: at the plinth's foot, rising to just under the vehicle on Enter
      const kf = stg === "align" ? power2InOut(clamp01(stageTime(window.__alignT) / ALIGN)) : stg === "build" ? 1 : 0;
      if (floor.current) floor.current.position.y = spot.y + lerp(FLOOR_SELECT * kOf(g.vehicle), FLOOR_BUILD, kf);
    }

    // the camera: the select view and the align in table units, then the bloom's path in metres
    const F = gl.domElement.getBoundingClientRect();
    const C = opening.cell?.getBoundingClientRect();
    const k = kOf(g.vehicle);
    const portrait = size.height > size.width;
    if (stg === "boot" || stg === "select") {
      st.el = THREE.MathUtils.clamp(st.el - opening.drag.el, Math.PI / 2 - 1.45, Math.PI / 2 - 0.9);
      opening.drag.el = 0;
      const r = Math.hypot(...SELECT_CAM);
      const fov = F.height && C?.height ? (2 * Math.atan((Math.tan(THREE.MathUtils.degToRad(SELECT_FOV / 2)) * F.height) / C.height) * 180) / Math.PI : SELECT_FOV;
      const ox = C ? F.width / 2 - (C.left - F.left + C.width / 2) : 0;
      const oy = C ? F.height / 2 - (C.top - F.top + C.height / 2) : 0;
      Object.assign(align, { r, el: st.el, fov, ox, oy, has: true });
      place(c, 0, SELECT_TARGET_Y, r, st.el, START.az, k);
      c.fov = fov;
      if (F.width) c.setViewOffset(F.width, F.height, ox, oy, F.width, F.height);
      c.updateProjectionMatrix();
    } else if (stg === "align") {
      const ka = power2InOut(clamp01(stageTime(window.__alignT) / ALIGN));
      const ty = lerp(SELECT_TARGET_Y, START.ty / k, ka);
      const r = Math.exp(lerp(Math.log(align.r), Math.log(START.r / k), ka));
      place(c, 0, ty, r, lerp(align.el, START.el, ka), START.az, k);
      c.fov = lerp(align.fov, GAME_FOV, ka);
      if (F.width) c.setViewOffset(F.width, F.height, align.ox * (1 - ka), align.oy * (1 - ka), F.width, F.height);
      c.updateProjectionMatrix();
      if (ka >= 1 && typeof window.__alignT !== "number") {
        st.t = 0;
        setStage("build");
        revealSound();
      }
    } else if (stg === "build") {
      const t = stageTime(window.__buildT);
      U.uBloomT.value = t;
      if (c.view?.enabled) c.clearViewOffset();
      const start: Pose = { tx: spot.x, ty: spot.y + START.ty, tz: spot.z, r: START.r, az: START.az, el: START.el };
      const over: Pose = { tx: ISLAND.x, ty: 0, tz: ISLAND.z, r: ISLAND.r * 2.2, az: END_AZ + 0.3, el: 1.05 };
      const end = endPose(portrait);
      const path: [number, Pose][] = [
        [0, start],
        [2.4, over],
        [PLAN.camEnd, end],
      ];
      let i = 0;
      while (i < path.length - 2 && t > path[i + 1][0]) i++;
      const [t0, a] = path[i];
      const [t1, b] = path[i + 1];
      const kk = power2InOut(clamp01((t - t0) / (t1 - t0)));
      // distance eases in log space, so the long fall from the overview lands softly
      const r = Math.exp(lerp(Math.log(a.r), Math.log(b.r), kk));
      // the look-at leaves the car late on the way up and reaches it early on the way down
      const kt = b === end ? 1 - Math.pow(1 - kk, 3) : b.r > a.r * 4 ? kk * kk * kk : kk;
      const az = lerp(a.az, b.az, kk);
      const el = lerp(a.el, b.el, kk);
      const tx = lerp(a.tx, b.tx, kt);
      const ty = lerp(a.ty, b.ty, kt);
      const tz = lerp(a.tz, b.tz, kt);
      c.position.set(tx + Math.cos(el) * Math.cos(az) * r, ty + Math.sin(el) * r, tz + Math.cos(el) * Math.sin(az) * r);
      c.lookAt(tx, ty, tz);
      if (c.fov !== GAME_FOV) {
        c.fov = GAME_FOV;
        c.updateProjectionMatrix();
      }
      if (t >= PLAN.camEnd && typeof window.__buildT !== "number") {
        // landed: the rig's chase camera is this exact frame; the world goes back to its own shaders
        bloomOff();
        setStage("done");
        setState({ phase: "world", revealed: true });
      }
    }
    c.updateMatrixWorld();
    U.uBloomInvVP.value.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse).invert();
  });

  return (
    <>
      <Garage />
      {stage !== "done" && (
        <group userData={{ bloomSkip: true }}>
          <mesh ref={floor} rotation={[-Math.PI / 2, 0, 0]} material={floorMat} renderOrder={-0.5}>
            <planeGeometry args={[900, 900]} />
          </mesh>
          {dots && <points geometry={dots} material={dotMat} frustumCulled={false} renderOrder={4} />}
        </group>
      )}
    </>
  );
}

/** Puts the camera on a sphere round a target, given in table units round the car's spot. */
function place(c: THREE.PerspectiveCamera, tx: number, ty: number, r: number, el: number, az: number, k: number) {
  c.position.set(spot.x + (tx + Math.cos(el) * Math.cos(az) * r) * k, spot.y + (ty + Math.sin(el) * r) * k, spot.z + Math.cos(el) * Math.sin(az) * r * k);
  c.lookAt(spot.x + tx * k, spot.y + ty * k, spot.z);
}
