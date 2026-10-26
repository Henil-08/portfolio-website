"use client";

// 04 · Start sequence mock: after the boot, pick a vehicle on a loadout screen, press Enter,
// and the world builds itself around it. Both stages draw through the page's one canvas.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, View } from "@react-three/drei";
import { Count, Decode, d } from "@/components/brand/motion";
import { Car, Floodlight, Gantry, Garage, Grandstand, Lights, M, TecPro, Town, Trees, W, WallFence } from "./models";
import { Atv, Bike, Supercar } from "./vehicles";

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
  model: () => ReactNode;
  icon: ReactNode;
};

// Game stats only: how each one drives in the world, not facts about anything real.
const VEHICLES: Vehicle[] = [
  {
    code: "V01",
    kind: "Formula",
    name: "HG-08",
    line: "The open-wheeler the world was built around. Fastest on the straight, nervous on the grass.",
    stats: [96, 90, 82],
    len: 5.4,
    cam: [5.6, 2.3, 6.4],
    target: [0, 0.5, 0],
    model: () => <Car />,
    icon: (
      <path d="M4 17h8l3-3h14l3-3h6l2 3h12l4 1v2H50v-1H12v1H4zM2 13h5v6H2zM56 12h6v7h-6z M14 22a4 4 0 1 0 8 0a4 4 0 1 0-8 0M44 22a4 4 0 1 0 8 0a4 4 0 1 0-8 0" />
    ),
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
    model: () => <Atv />,
    icon: (
      <path d="M22 4h14l6 9h6l4 5H12l3-5h5zM24 6v7h3V6zM31 6v7h9l-5-7zM8 21a6 6 0 1 0 12 0a6 6 0 1 0-12 0M44 21a6 6 0 1 0 12 0a6 6 0 1 0-12 0" />
    ),
  },
  {
    code: "V03",
    kind: "Supercar",
    name: "GT-08",
    line: "Mid-engined road car: low wedge, wide hips. The easy one to start with.",
    stats: [88, 78, 80],
    len: 4.7,
    cam: [5.2, 2.1, 5.9],
    target: [0, 0.55, 0],
    model: () => <Supercar />,
    icon: <path d="M3 18l2-5 22-4 9-4h8l12 6 4 2v5H3zM30 8l-3 3h14l-2-4zM10 21a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0-9 0M46 21a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0-9 0" />,
  },
  {
    code: "V04",
    kind: "Bike",
    name: "R-08",
    line: "A sport bike, light and quick to turn. Two wheels, so it forgives nothing.",
    stats: [84, 62, 95],
    len: 2.1,
    cam: [2.9, 1.45, 3.4],
    target: [0, 0.62, 0],
    model: () => <Bike />,
    icon: (
      <path d="M22 9h10l4 3h8l6-6h4l-4 7 4 4H18l-2-4zM36 6h6v3h-6zM6 20a6 6 0 1 0 12 0a6 6 0 1 0-12 0M46 20a6 6 0 1 0 12 0a6 6 0 1 0-12 0" />
    ),
  },
];
const STATS = ["Speed", "Grip", "Handling"];

/* ------------------------------------------------------------------ easing and tweens */

const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
const power2Out = (k: number) => 1 - (1 - k) * (1 - k);
const power2InOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const backOut = (k: number, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);

/** The build's start time on the R3F clock, set by whichever tween runs first. */
const Clock0 = createContext<(now: number) => number>((now) => now);
const useSince = () => useContext(Clock0);

type Kind = "grow" | "pop" | "lift" | "wipeZ" | "wipeX" | "spread";

/** One piece of the world arriving: scale or lift tweened from `at` seconds, mutated per frame. */
function Arrive({ at, dur = 0.6, kind, depth = 6, position, rotation, children }: { at: number; dur?: number; kind: Kind; depth?: number; position?: V3; rotation?: V3; children: ReactNode }) {
  const g = useRef<THREE.Group>(null!);
  const since = useSince();
  useFrame((s) => {
    const k = clamp01((since(s.clock.elapsedTime) - at) / dur);
    const o = g.current;
    o.visible = k > 0;
    if (kind === "grow") o.scale.set(1, Math.max(1e-4, backOut(k, 0.9)), 1);
    else if (kind === "pop") o.scale.setScalar(Math.max(1e-4, backOut(k, 2.4)));
    else if (kind === "lift") o.position.y = -depth * (1 - backOut(k, 1.2));
    else if (kind === "wipeZ") o.scale.set(1, 1, Math.max(1e-4, power2InOut(k)));
    else if (kind === "wipeX") o.scale.set(Math.max(1e-4, power2InOut(k)), 1, 1);
    else if (kind === "spread") o.scale.setScalar(Math.max(1e-4, power2Out(k)));
  });
  return (
    <group position={position} rotation={rotation}>
      <group ref={g} visible={false}>
        {children}
      </group>
    </group>
  );
}

/** Delay that grows with distance from the car, so things arrive in a wave. */
const wave = (base: number, x: number, z: number, per = 0.014) => base + Math.hypot(x, z) * per;

const dotFloor = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = W.paper;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#b9b6ab";
  g.fillRect(30, 30, 4, 4);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(160, 160);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

/* ------------------------------------------------------------------ stage B scene */

const CAR_X = -2.4;

function FloorFade() {
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const since = useSince();
  useFrame((s) => {
    mat.current.opacity = power2Out(clamp01(since(s.clock.elapsedTime) / 0.45));
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
      <planeGeometry args={[480, 480]} />
      <meshBasicMaterial ref={mat} map={dotFloor} transparent opacity={0} />
    </mesh>
  );
}

/** Eases from a close orbit round the vehicle out to the chase-cam angle. */
function BuildCamera({ v }: { v: Vehicle }) {
  const cam = useRef<THREE.PerspectiveCamera>(null!);
  const since = useSince();
  const look = useRef(new THREE.Vector3());
  useFrame((s) => {
    const t = since(s.clock.elapsedTime);
    const r = v.len * 0.85 + 2;
    const a = 2.3 - t * 0.55;
    const orbit = new THREE.Vector3(CAR_X + Math.sin(a) * r, 1.3 + v.len * 0.1, Math.cos(a) * r);
    const chase = new THREE.Vector3(CAR_X + 1.4, 2.6 + v.len * 0.75, -4.5 - v.len * 2);
    const e = power2InOut(clamp01((t - 0.35) / 3.1));
    cam.current.position.lerpVectors(orbit, chase, e);
    look.current.set(CAR_X, 0.6, 0).lerp(new THREE.Vector3(CAR_X + 1, 0.2, 12), e);
    cam.current.lookAt(look.current);
  });
  return <PerspectiveCamera ref={cam} makeDefault fov={36} position={[CAR_X + 6, 2, 6]} near={0.1} far={400} />;
}

const KERB_N = 14;
function Kerb({ z, x, flip }: { z: number; x: number; flip?: boolean }) {
  return (
    <Arrive at={wave(0.85, x, z, 0.012)} dur={0.5} kind="wipeZ" position={[x, 0, z]} rotation={flip ? [0, Math.PI, 0] : undefined}>
      {Array.from({ length: KERB_N }, (_, i) => (
        <mesh key={i} position={[0, 0.06, i * 1.2 + 0.6]} material={i % 2 ? M.paper : M.ink} receiveShadow>
          <boxGeometry args={[1.0, 0.1, 1.2]} />
        </mesh>
      ))}
    </Arrive>
  );
}

function BuildScene({ v }: { v: Vehicle }) {
  const t0 = useRef(-1);
  const since = useCallback((now: number) => {
    if (t0.current < 0) t0.current = now;
    return now - t0.current;
  }, []);
  const segs = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
  return (
    <Clock0.Provider value={since}>
      <color attach="background" args={["#ebe9e3"]} />
      <fog attach="fog" args={["#ebe9e3", 55, 150]} />
      <BuildCamera v={v} />
      <Lights size={60} />
      {/* 1 · paper floor with the dot grid, then the ground spreading out from the car */}
      <FloorFade />
      <Arrive at={0.15} dur={1.1} kind="spread" position={[CAR_X, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} material={M.grass} receiveShadow>
          <circleGeometry args={[110, 64]} />
        </mesh>
      </Arrive>
      {/* 2 · the track draws out from under the car */}
      <Arrive at={0.35} dur={0.9} kind="wipeZ">
        <mesh position={[0, 0.025, 0]} material={M.asphalt} receiveShadow>
          <boxGeometry args={[12, 0.05, 170]} />
        </mesh>
      </Arrive>
      <Arrive at={0.55} dur={0.7} kind="wipeZ">
        <mesh position={[11.5, 0.024, 0]} material={M.asphalt} receiveShadow>
          <boxGeometry args={[6, 0.05, 120]} />
        </mesh>
        <mesh position={[-9.2, 0.02, 0]} material={M.gravel} receiveShadow>
          <boxGeometry args={[6.4, 0.04, 170]} />
        </mesh>
      </Arrive>
      {/* 3 · edge lines, the grid slots and the kerbs wipe along */}
      <Arrive at={0.7} dur={0.8} kind="wipeZ">
        {[-5.6, 5.6].map((x) => (
          <mesh key={x} position={[x, 0.03, 0]} material={M.paper}>
            <boxGeometry args={[0.2, 0.053, 170]} />
          </mesh>
        ))}
      </Arrive>
      <Arrive at={0.8} dur={0.45} kind="wipeX" position={[-6, 0, 9]}>
        <mesh position={[6, 0.03, 0]} material={M.paper}>
          <boxGeometry args={[12, 0.055, 0.6]} />
        </mesh>
      </Arrive>
      {[
        [CAR_X, 3.2],
        [2.4, -4.2],
        [CAR_X, -11.6],
        [2.4, -19],
      ].map(([x, z], i) => (
        <Arrive key={i} at={0.75 + i * 0.08} dur={0.4} kind="pop" position={[x, 0, z]}>
          <mesh position={[0, 0.03, 0]} material={M.paper}>
            <boxGeometry args={[2.4, 0.055, 0.16]} />
          </mesh>
          <mesh position={[-1.12, 0.03, -0.6]} material={M.paper}>
            <boxGeometry args={[0.16, 0.055, 1.2]} />
          </mesh>
        </Arrive>
      ))}
      <Kerb x={-6.1} z={18} />
      <Kerb x={6.1} z={18} />
      <Kerb x={-6.1} z={-18} flip />
      <Kerb x={6.1} z={-18} flip />
      {/* 4 · barriers rise in a wave travelling out from the car */}
      {segs.map((z) => (
        <Arrive key={`w${z}`} at={wave(1.0, 7.4, z)} dur={0.55} kind="lift" depth={5} position={[7.4, 0, z]} rotation={[0, Math.PI / 2, 0]}>
          <WallFence len={10} />
        </Arrive>
      ))}
      {segs.map((z) => (
        <Arrive key={`t${z}`} at={wave(1.05, -12.6, z)} dur={0.5} kind="lift" depth={2} position={[-12.6, 0, z - 4.5]} rotation={[0, Math.PI / 2, 0]}>
          <TecPro n={9} />
        </Arrive>
      ))}
      {/* 5 · garages, stands and the town extrude up */}
      {[
        [26, -8],
        [26, 26],
      ].map(([x, z]) => (
        <Arrive key={`g${z}`} at={wave(1.45, x, z, 0.01)} dur={0.7} kind="grow" position={[x, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
          <Garage />
        </Arrive>
      ))}
      {[
        [-17, -6, 26],
        [-17, 26, 20],
      ].map(([x, z, len]) => (
        <Arrive key={`s${z}`} at={wave(1.5, x, z, 0.01)} dur={0.7} kind="grow" position={[x, 0, z]} rotation={[0, Math.PI / 2, 0]}>
          <Grandstand len={len} />
        </Arrive>
      ))}
      <Arrive at={1.35} dur={0.6} kind="lift" depth={8} position={[0, 0, 30]}>
        <Gantry />
      </Arrive>
      {[
        [-52, 46, Math.PI / 2],
        [58, -34, -Math.PI / 2],
        [56, 58, -Math.PI / 2],
        [26, 84, -Math.PI / 2],
      ].map(([x, z, r]) => (
        <Arrive key={`b${z}`} at={wave(1.6, x, z, 0.006)} dur={0.8} kind="grow" position={[x, 0, z]} rotation={[0, r, 0]}>
          <Town />
        </Arrive>
      ))}
      {/* 6 · trees pop with overshoot */}
      {[
        [-34, -30],
        [-30, 62],
        [42, 6],
        [-46, 12],
        [38, -60],
        [30, 46],
        [-24, -64],
        [-24, 50],
        [18, 60],
      ].map(([x, z]) => (
        <Arrive key={`tr${x}${z}`} at={wave(2.0, x, z, 0.008)} dur={0.5} kind="pop" position={[x, 0, z]}>
          <Trees />
        </Arrive>
      ))}
      {/* 7 · floodlights rise last */}
      {[-34, -8, 18, 44].map((z, i) => (
        <Arrive key={`f${z}`} at={2.45 + i * 0.09} dur={0.6} kind="lift" depth={13} position={[-14.5, 0, z]} rotation={[0, Math.PI / 2, 0]}>
          <Floodlight />
        </Arrive>
      ))}
      {/* the chosen vehicle on its slot */}
      <group position={[CAR_X, 0, 0]}>{v.model()}</group>
    </Clock0.Provider>
  );
}

/* ------------------------------------------------------------------ stage A scene */

/** The selected vehicle drops onto the plinth with a little overshoot. */
function DropIn({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null!);
  const t0 = useRef(-1);
  useFrame((s) => {
    if (t0.current < 0) t0.current = s.clock.elapsedTime;
    const k = clamp01((s.clock.elapsedTime - t0.current) / 0.5);
    g.current.position.y = (1 - power2Out(k)) * 0.9;
    g.current.scale.setScalar(0.82 + 0.18 * backOut(k, 2));
  });
  return (
    <group ref={g} position={[0, 0.9, 0]} scale={0.82}>
      {children}
    </group>
  );
}

function SelectScene({ v }: { v: Vehicle }) {
  const r = v.len * 0.62 + 0.3;
  return (
    <>
      <color attach="background" args={["#ebe9e3"]} />
      <PerspectiveCamera makeDefault position={v.cam} fov={30} />
      <OrbitControls makeDefault target={v.target} autoRotate autoRotateSpeed={1.4} enableZoom={false} enablePan={false} minPolarAngle={0.9} maxPolarAngle={1.45} />
      <Lights size={6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13, 0]} receiveShadow>
        <circleGeometry args={[40, 32]} />
        <meshStandardMaterial color="#e1ded6" roughness={1} />
      </mesh>
      {/* paper plinth with an ink rim and one orange tick at the front */}
      <mesh position={[0, -0.07, 0]} material={M.ink}>
        <cylinderGeometry args={[r + 0.05, r + 0.05, 0.12, 64]} />
      </mesh>
      <mesh position={[0, -0.05, 0]} material={M.paper} receiveShadow>
        <cylinderGeometry args={[r, r, 0.1, 64]} />
      </mesh>
      <mesh position={[0, 0.002, r - 0.12]} material={M.orange}>
        <boxGeometry args={[0.06, 0.004, 0.2]} />
      </mesh>
      <DropIn>{v.model()}</DropIn>
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

const BUILD_STEPS: [string, number][] = [
  ["Floor", 0],
  ["Track", 350],
  ["Kerbs, lines", 700],
  ["Barriers", 1000],
  ["Garages, stands", 1450],
  ["Trees", 2000],
  ["Floodlights", 2450],
  ["Chase cam", 3450],
];

export default function StartSequence() {
  const box = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(0);
  const [phase, setPhase] = useState<Phase>("select");
  const [run, setRun] = useState(0); // bumps to replay
  const [down, setDown] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const v = VEHICLES[sel];

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
                  <SelectScene key={v.code} v={v} />
                </View>
                <span className="font-mono pointer-events-none absolute left-3 top-3 z-[25] bg-white px-1.5 py-0.5 text-[11.5px] shadow-[3px_3px_0_#111] ring-2 ring-[#111]">
                  {v.code} · Drag to turn
                </span>
              </div>

              {/* spec column: decodes and counts on every switch */}
              <div key={v.code} data-anim="" data-run="" className="flex flex-col gap-4 p-4">
                <div>
                  <p className="font-mono text-[12px] text-[#ff4f00]">
                    <Decode text={`${v.code} · ${v.kind}`} run delay={60} dur={300} />
                  </p>
                  <h3 className="mt-1 text-[34px] font-semibold leading-none tracking-tight">
                    <Decode text={v.name} run delay={120} dur={380} />
                  </h3>
                  <p className="dsa-rise mt-2.5 text-[14.5px] leading-relaxed text-[#5d5d58]" style={d(220)}>
                    {v.line}
                  </p>
                </div>
                <div className="mt-auto space-y-3">
                  {STATS.map((s, i) => (
                    <div key={s}>
                      <div className="flex items-baseline justify-between text-[12px] font-semibold uppercase tracking-[0.06em]">
                        <span>{s}</span>
                        <span className="font-mono text-[13px]">
                          <Count value={String(v.stats[i])} run delay={200 + i * 90} dur={600} />
                        </span>
                      </div>
                      <div className="mt-1 h-[10px] border-2 border-[#111] bg-[#f3f2ed]">
                        <div className="h-full origin-left" style={{ width: `${v.stats[i]}%` }}>
                          <div className="dsa-x h-full bg-[#111]" style={d(200 + i * 90)} />
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
              <BuildScene v={v} />
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
              <p className="ss-fadeout font-mono absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap text-[13px]" style={d(2900)}>
                Press <kbd className="x-key is-down">Enter</kbd> to drive
              </p>
              <div className="dsa-flicker absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center border-2 border-[#111] bg-white shadow-[3px_3px_0_#111]" style={d(3500)}>
                <span className="font-mono bg-[#111] px-2 py-1 text-[12px] text-white">E</span>
                <span className="px-2.5 py-1 text-[13px] font-semibold uppercase tracking-[0.06em]">
                  <span className="font-mono mr-1.5 text-[#ff4f00]">Z01</span>Start grid
                </span>
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
          {phase === "build" ? `${v.code} ${v.name} · building the world` : `${v.code} ${v.name} selected · ← → to switch`}
        </span>
      </div>
    </div>
  );
}
