"use client";

// 04 · Start sequence mock: after the boot, pick a vehicle on a loadout screen, press Enter,
// and the world builds itself around it. Both stages draw through the page's one canvas.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, View } from "@react-three/drei";
import { Count, Decode, d } from "@/components/brand/motion";
import { Lights, M } from "./models";
import { BUILD_LOG, GRID, Island, PaperFloor, T, type BuildClock } from "./island";
import { Atv, Bike, Formula, Roadster } from "./vehicles";
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
    len: 5.6,
    cam: [5.3, 2.0, 6.0],
    target: [0, 0.45, 0],
    model: () => <Formula />,
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
    model: () => <Atv />,
    icon: VEHICLE_ICONS.V02,
  },
  {
    code: "V03",
    kind: "Road car",
    name: "Roadster",
    line: "A low wedge of flat, creased panels under a dark glass canopy, with a tall wing on two struts. The easy one to start with.",
    stats: [92, 80, 82],
    len: 4.6,
    cam: [5.1, 2.0, 5.8],
    target: [0, 0.5, 0],
    model: () => <Roadster />,
    icon: VEHICLE_ICONS.V03,
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

/** Roughly the island's middle: where the camera looks while it's high. */
const MID = new THREE.Vector3(2, 0, -8);
/** How far round the camera swings (radians): three quarters of a turn. */
const SWEEP = Math.PI * 1.5;

/**
 * Close on the car, then up and round the island in a wide arc while the ring builds it,
 * then down behind the car into the chase cam as the last pieces land.
 */
function BuildCamera({ v, clock }: { v: Vehicle; clock: BuildClock }) {
  const cam = useRef<THREE.PerspectiveCamera>(null!);
  const pivot = useRef(new THREE.Vector3());
  useFrame((s) => {
    const t = clock(s.clock.elapsedTime);
    const u = clamp01((t - T.cam0) / T.camDur);
    const e = power2InOut(u);
    // 0 at the car, 1 over the island: up, hold a beat while the ring crosses it, down
    const high = power2InOut(clamp01(Math.min(u / 0.42, (1 - u) / 0.38)));
    const close = { r: v.len * 0.95 + 2.8, h: 1.1 + v.len * 0.14 };
    const chase = { r: 4.6 + v.len * 1.9, h: 2.3 + v.len * 0.62 };
    const behind = Math.atan2(-GRID.fz, -GRID.fx);
    const az = behind + (1 - e) * SWEEP;
    const r = close.r + (chase.r - close.r) * e + 104 * high;
    const h = close.h + (chase.h - close.h) * e + 76 * high;
    // the camera turns round a pivot that drifts from the car to the island's middle and back
    pivot.current.set(GRID.x, 0.6, GRID.z).lerp(MID, high * 0.85);
    const c = cam.current;
    c.position.set(pivot.current.x + Math.cos(az) * r, h, pivot.current.z + Math.sin(az) * r);
    // looking at the pivot, and at the end along the car's nose like the chase cam
    pivot.current.x += GRID.fx * 10 * e * e;
    pivot.current.z += GRID.fz * 10 * e * e;
    pivot.current.y = 0.6 - 0.3 * e;
    c.lookAt(pivot.current);
    c.fov = 38 + 10 * high;
    c.updateProjectionMatrix();
  });
  return <PerspectiveCamera ref={cam} makeDefault fov={38} position={[GRID.x + 6, 2, GRID.z + 6]} near={0.2} far={900} />;
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

function BuildScene({ v }: { v: Vehicle }) {
  const t0 = useRef(-1);
  const clock = useCallback((now: number) => {
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined" && typeof window.__buildT === "number") return window.__buildT;
    if (t0.current < 0) t0.current = now;
    return now - t0.current;
  }, []);
  return (
    <>
      <color attach="background" args={["#ebe9e3"]} />
      <fog attach="fog" args={["#ebe9e3", 240, 620]} />
      <BuildCamera v={v} clock={clock} />
      <IslandLights />
      {/* 1 · the paper floor and its dot grid, eaten by the ring as the island arrives */}
      <PaperFloor map={dotFloor} />
      {/* 2 · the whole island, element by element as the ring reaches it */}
      <Island clock={clock} />
      {/* the chosen vehicle on its grid slot */}
      <group position={[GRID.x, GRID.y, GRID.z]} rotation={[0, GRID.yaw, 0]}>
        {v.model()}
      </group>
    </>
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

/** What arrives when (ms), read from the island's own timeline so the log ticks with it. */
const BUILD_STEPS = BUILD_LOG();
const DONE_MS = BUILD_STEPS[BUILD_STEPS.length - 1][1];

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
              <p className="ss-fadeout font-mono absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap text-[13px]" style={d(DONE_MS - 600)}>
                Press <kbd className="x-key is-down">Enter</kbd> to drive
              </p>
              <div className="dsa-flicker absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center border-2 border-[#111] bg-white shadow-[3px_3px_0_#111]" style={d(DONE_MS + 150)}>
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
