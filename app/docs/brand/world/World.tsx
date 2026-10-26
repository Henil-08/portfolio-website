"use client";

// World proposals: "Concrete & Ink". One diorama of the main straight (day and night) and a
// turntable per model, all drawn by one WebGL canvas through drei <View> regions.
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, View } from "@react-three/drei";
import { profile } from "@/content/profile";
import { pad } from "@/components/brand/tokens";
import { Lockup } from "@/components/brand/mark";
import StartSequence from "./StartSequence";
import { Car, Diorama, Lights, Floodlight, Gantry, Garage, Grandstand, KerbEdge, TecPro, Town, Trees, W, WallFence } from "./models";

/** One turntable: its own camera, lights and a plinth. */
function Turntable({ cam, target = [0, 1, 0], children, size = 12, night }: { cam: [number, number, number]; target?: [number, number, number]; children: ReactNode; size?: number; night?: boolean }) {
  return (
    <>
      <color attach="background" args={[night ? "#101215" : "#ebe9e3"]} />
      <PerspectiveCamera makeDefault position={cam} fov={28} />
      <OrbitControls makeDefault target={target} autoRotate autoRotateSpeed={0.9} enableZoom={false} enablePan={false} />
      <Lights night={night} size={size} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[size, 48]} />
        <meshStandardMaterial color={night ? "#1a1c20" : "#e1ded6"} roughness={1} />
      </mesh>
      {children}
    </>
  );
}

const MODELS: {
  code: string;
  name: string;
  replaces: string;
  materials: [string, string][];
  notes: string;
  cam: [number, number, number];
  target?: [number, number, number];
  size?: number;
  model: (night: boolean) => ReactNode;
}[] = [
  {
    code: "W01",
    name: "Car · HG-08",
    replaces: "models/Car.tsx",
    materials: [["Ink", W.ink], ["Paper", W.paper], ["Orange", W.orange], ["Graphite", W.graphite]],
    notes: "A real F1 silhouette instead of a toy: long nose, halo, two-element wings, low floor. Ink body, paper engine cover with 08 on it, one orange line down the nose. Tyres black with a paper sidewall band (it turns blue for wets).",
    cam: [5.8, 2.6, 6.8],
    target: [0, 0.5, 0],
    size: 5,
    model: () => <Car />,
  },
  {
    code: "W02",
    name: "Garages",
    replaces: "Places.tsx garage block",
    materials: [["Concrete", W.concrete], ["Glass", W.glass], ["Ink", W.ink], ["Orange", W.orange]],
    notes: "One long concrete block like a modern pit building: five glazed bays coded Z05–Z09, a dark glass band upstairs, a thin ink roof cantilevered over the apron. At night the bays and the band glow.",
    cam: [40, 20, 46],
    target: [0, 3, 0],
    size: 22,
    model: (n) => <Garage night={n} />,
  },
  {
    code: "W03",
    name: "TecPro barrier",
    replaces: "Tyre walls (street/Barriers.tsx)",
    materials: [["Ink", W.ink], ["Paper", W.paper], ["Graphite", W.graphite], ["Orange", W.orange]],
    notes: "Modern energy-absorbing blocks instead of tyre stacks: alternating ink and paper, a strap along each row, one orange block per run. Still knock-about props in the game.",
    cam: [9, 4.5, 9],
    target: [0, 0.8, 0],
    size: 8,
    model: () => <TecPro n={8} />,
  },
  {
    code: "W04",
    name: "Wall and debris fence",
    replaces: "PitWallRun.tsx, Trackside fences",
    materials: [["Concrete", W.concrete], ["Paper", W.paper], ["Ink", W.ink]],
    notes: "A concrete safety wall with a paper top stripe, a tall ink mesh fence on thin posts. Replaces the red caps and the toy fence.",
    cam: [11, 6, 11],
    target: [0, 2, 0],
    size: 10,
    model: () => <WallFence len={10} />,
  },
  {
    code: "W05",
    name: "Kerb and track edge",
    replaces: "Island.tsx kerbs, runoff",
    materials: [["Asphalt", W.asphalt], ["Ink", W.ink], ["Paper", W.paper], ["Gravel", W.gravel]],
    notes: "Ink and paper kerbs instead of red and white, a paper edge line on the asphalt, pale gravel run-off, muted grass. The track finally reads like a circuit.",
    cam: [6, 3.2, 7],
    target: [0, 0.2, 0],
    size: 9,
    model: () => <KerbEdge len={10} />,
  },
  {
    code: "W06",
    name: "Grandstand",
    replaces: "Trackside.tsx stands",
    materials: [["Concrete", W.concrete], ["Graphite", W.graphite], ["Ink", W.ink], ["Paper", W.paper]],
    notes: "Stepped concrete tiers, graphite seats with one paper row, ink steel frame and a thin cantilever roof with a paper fascia.",
    cam: [26, 13, 28],
    target: [0, 3, -3],
    size: 16,
    model: () => <Grandstand len={14} />,
  },
  {
    code: "W07",
    name: "Floodlight",
    replaces: "street/Floodlights.tsx",
    materials: [["Ink", W.ink], ["Paper", "#fff3dc"], ["Concrete", W.concrete]],
    notes: "A slim ink mast on a concrete foot with a tilted bank of eight panels. Lit at night, off by day.",
    cam: [17, 11, 21],
    target: [0, 6.5, 0],
    size: 6,
    model: (n) => <Floodlight night={n} />,
  },
  {
    code: "W08",
    name: "Start gantry",
    replaces: "Start gantry, timing boards",
    materials: [["Ink", W.ink], ["Orange", W.orange], ["Concrete", W.concrete]],
    notes: "Ink pylons and beam, a black LED board in orange mono (HG-08, the lap), five start lights that glow orange.",
    cam: [17, 7.5, 20],
    target: [0, 3.6, 0],
    size: 10,
    model: (n) => <Gantry night={n} />,
  },
  {
    code: "W09",
    name: "Town",
    replaces: "street/town.ts buildings",
    materials: [["Concrete", W.concrete], ["Glass", W.glass], ["Ink", W.ink], ["Orange", W.orange]],
    notes: "Concrete blocks with recessed window grids and glazed ground floors, flat roofs with an ink line. No pastel walls or pitched roofs. One orange door per street.",
    cam: [44, 24, 50],
    target: [0, 8, 0],
    size: 18,
    model: () => <Town />,
  },
  {
    code: "W10",
    name: "Trees",
    replaces: "foliage/species.ts",
    materials: [["Leaf", W.leaf], ["Leaf light", W.leafLight], ["Ink", W.ink], ["Grass", W.grass]],
    notes: "Two forms only: tall faceted cypresses and round faceted crowns, in muted sage, on ink trunks. Calm, architectural, no candy colours.",
    cam: [19, 9, 22],
    target: [0, 4, 0],
    size: 10,
    model: () => <Trees />,
  },
];

const PALETTE: [string, string, string][] = [
  ["Concrete", W.concrete, "Buildings, walls, plinths"],
  ["Concrete dark", W.concreteDark, "Aprons, parapets"],
  ["Asphalt", W.asphalt, "Track, pit lane, roads"],
  ["Gravel", W.gravel, "Run-off, beaches"],
  ["Grass", W.grass, "Ground"],
  ["Leaf", W.leaf, "Trees"],
  ["Water", W.water, "Sea, lakes, river"],
  ["Ink", W.ink, "Steel, frames, the car"],
  ["Paper", W.paper, "Paint: lines, kerbs, fascias"],
  ["Orange", W.orange, "One accent per object"],
];

export default function World() {
  const main = useRef<HTMLDivElement>(null!);
  const [night, setNight] = useState(false);
  return (
    <div ref={main} className="relative min-h-screen bg-[#f3f2ed] pb-24 text-[#111]">
      <header className="sticky top-0 z-30 border-b-2 border-[#111] bg-[#f3f2ed]">
        <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-4 py-2.5 sm:px-8">
          <Link href="/docs/brand/system">
            <Lockup size={17} name={profile.name} />
          </Link>
          <span className={`font-mono hidden text-[12px] text-[#5d5d58] sm:inline`}>HG-08 · World proposals</span>
          <Link href="/docs/brand/places" className={`font-mono ml-auto text-[12px] text-[#5d5d58] hover:text-[#111]`}>
            Places ↗
          </Link>
          <Link href="/docs/brand/system" className={`font-mono text-[12px] text-[#5d5d58] hover:text-[#111]`}>
            ← Design system
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-4 sm:px-8">
        <div className="pt-12 sm:pt-16">
          <p className={`font-mono text-[12px] text-[#5d5d58]`}>HG-08 · World · For approval</p>
          <h1 className="mt-2 max-w-3xl text-[40px] font-semibold leading-[1.02] tracking-tight sm:text-[64px]">
            Concrete and ink<span className="text-[#ff4f00]">.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-[#5d5d58]">
            The island redrawn to match the identity: a modern circuit instead of a toy town. Matte concrete, dark asphalt, ink steel, paper paint, muted greens and one orange per object. Drag
            any view to turn it.
          </p>
        </div>

        {/* 01 · diorama */}
        <section className="pt-14">
          <div className="flex flex-wrap items-baseline gap-4 border-b-[3px] border-[#111] pb-3">
            <span className={`font-mono text-[15px] text-[#ff4f00]`}>01</span>
            <h2 className="text-[30px] font-semibold leading-none tracking-tight sm:text-[40px]">The main straight</h2>
            <div className="ml-auto flex border-2 border-[#111] bg-white">
              {(["Day", "Night"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setNight(t === "Night")} className={`font-mono px-3 py-1 text-[12px] uppercase ${night === (t === "Night") ? "bg-[#111] text-white" : ""}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[#5d5d58]">Every model below, together: the garages behind the pit wall, TecPro and a grandstand opposite, floodlights, the start gantry, the car, town and trees beyond.</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_300px]">
            <div data-cursor="drag">
            <View className="aspect-[16/10] w-full border-2 border-[#111]">
              <color attach="background" args={[night ? "#0d0f12" : "#e7e5de"]} />
              <fog attach="fog" args={[night ? "#0d0f12" : "#e7e5de", 70, 170]} />
              <PerspectiveCamera makeDefault position={[44, 15, -30]} fov={30} />
              <OrbitControls makeDefault target={[2, 2, 2]} autoRotate autoRotateSpeed={0.35} enableZoom={false} enablePan={false} maxPolarAngle={1.35} />
              <Lights night={night} size={60} />
              <Diorama night={night} />
            </View>
            </div>
            <div className="border-2 border-[#111] bg-white">
              <div className="border-b-2 border-[#111] px-3 py-2 text-[13px] font-semibold uppercase tracking-[0.06em]">
                <span className={`font-mono mr-2 text-[#ff4f00]`}>A</span>Before
              </div>
              {/* the world as it is today, for comparison */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/design/day.jpg" alt="The world as it looks today" className="aspect-[16/10] w-full object-cover" />
              <p className="px-3 py-2 text-[13px] leading-relaxed text-[#5d5d58]">Today: toy car, red caps, saturated grass, warm sand. Fun, but it fights the new UI.</p>
              <div className="border-y-2 border-[#111] px-3 py-2 text-[13px] font-semibold uppercase tracking-[0.06em]">
                <span className={`font-mono mr-2 text-[#ff4f00]`}>B</span>Kept
              </div>
              <ul className="space-y-1 px-3 py-2 text-[13px] leading-relaxed">
                {["The island, the track and every place on it", "Driving, physics, knock-about props", "Day and night, rain and the radio", "Soft low-poly forms, just calmer"].map((t) => (
                  <li key={t} className="grid grid-cols-[10px_1fr] gap-1.5">
                    <span className="mt-[0.6em] h-[5px] w-[5px] bg-[#111]" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 02 · palette */}
        <section className="pt-16">
          <div className="flex items-baseline gap-4 border-b-[3px] border-[#111] pb-3">
            <span className={`font-mono text-[15px] text-[#ff4f00]`}>02</span>
            <h2 className="text-[30px] font-semibold leading-none tracking-tight sm:text-[40px]">World palette</h2>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-px border-2 border-[#111] bg-[#111] sm:grid-cols-5">
            {PALETTE.map(([n, c, u]) => (
              <div key={n} className="bg-white">
                <div className="h-14" style={{ background: c }} />
                <div className="p-2.5">
                  <p className="text-[13.5px] font-semibold">{n}</p>
                  <p className={`font-mono text-[11.5px] text-[#5d5d58]`}>{c}</p>
                  <p className="text-[12px] leading-snug text-[#5d5d58]">{u}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 03 · models */}
        <section className="pt-16">
          <div className="flex items-baseline gap-4 border-b-[3px] border-[#111] pb-3">
            <span className={`font-mono text-[15px] text-[#ff4f00]`}>03</span>
            <h2 className="text-[30px] font-semibold leading-none tracking-tight sm:text-[40px]">Models</h2>
          </div>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[#5d5d58]">Each one replaces something in the world today. Approve them one by one or as a set.</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {MODELS.map((m, i) => (
              <article key={m.code} className="flex flex-col border-2 border-[#111] bg-white">
                <div className={`font-mono flex justify-between gap-4 bg-[#111] px-3 py-1.5 text-[12px] text-white`}>
                  <span>
                    HG-08 / {m.code} · {pad(i + 1)}
                  </span>
                  <span className="truncate text-white/60">Replaces {m.replaces}</span>
                </div>
                <div data-cursor="drag">
                <View className="aspect-[4/3] w-full border-b-2 border-[#111]">
                  <Turntable cam={m.cam} target={m.target} size={m.size} night={night}>
                    {m.model(night)}
                  </Turntable>
                </View>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-[20px] font-semibold tracking-tight">{m.name}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed">{m.notes}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    {m.materials.map(([n, c]) => (
                      <span key={n} className={`font-mono flex items-center gap-1.5 border border-[#111] px-1.5 py-0.5 text-[11.5px]`}>
                        <span className="h-2.5 w-2.5 border border-[#111]/30" style={{ background: c }} />
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 04 · start sequence */}
        <section id="start" className="pt-16">
          <div className="flex items-baseline gap-4 border-b-[3px] border-[#111] pb-3">
            <span className={`font-mono text-[15px] text-[#ff4f00]`}>04</span>
            <h2 className="text-[30px] font-semibold leading-none tracking-tight sm:text-[40px]">Start sequence</h2>
          </div>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[#5d5d58]">
            A new way into the world, after the boot animation. Instead of a car in a small circle, you pick what to drive on a loadout screen, press Enter, and the island builds itself
            around you. The vehicle you pick is the one you drive.
          </p>
          <ol className="mt-5 grid grid-cols-2 gap-px border-2 border-[#111] bg-[#111] sm:grid-cols-4">
            {[
              ["S01", "Boot", "Mark, name, loading bar. Exists today."],
              ["S01b", "Select vehicle", "Four cards, a turntable, game stats. ← → and Enter."],
              ["S01c", "World builds in", "Floor, track, barriers, buildings, trees, lights, in about 3 s."],
              ["S02", "Drive", "The camera settles behind you and the HUD takes over."],
            ].map(([c, t, b], i) => (
              <li key={c} className="bg-white p-3">
                <p className={`font-mono text-[11.5px] ${i === 1 || i === 2 ? "text-[#ff4f00]" : "text-[#5d5d58]"}`}>
                  {pad(i + 1)} · {c}
                  {i === 1 || i === 2 ? " · new" : ""}
                </p>
                <p className="mt-1 text-[15px] font-semibold">{t}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-[#5d5d58]">{b}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6">
            <StartSequence />
          </div>
        </section>
      </div>

      {/* one canvas draws every View region above */}
      <Canvas eventSource={main} shadows dpr={[1, 2]} className="!pointer-events-none !fixed !inset-0 z-20" gl={{ antialias: true }}>
        <View.Port />
      </Canvas>
    </div>
  );
}
