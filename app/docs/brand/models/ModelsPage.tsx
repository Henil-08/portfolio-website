"use client";

// Models for review, each beside its approved concept: the code-built kit and the Meshy models,
// in the current look and in the Studio look (components/world/studio), which aims at the
// concept renders. Canvases mount only on screen. ?view=studio|current|both, ?still, ?ssao=1.
import Link from "next/link";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { profile } from "@/content/profile";
import { Lockup } from "@/components/brand/mark";
import { CONCEPTS, MESHY } from "@/components/world/meshy/catalog";
import { MeshyModel } from "@/components/world/meshy/MeshyModel";
import { Lights } from "../world/models";
import { StudioSet, STUDIO_TONE } from "@/components/world/studio/StudioStage";
import { Studify } from "@/components/world/studio/Studify";
import type { Build } from "./builds/types";
import { BUILDS as NATURE } from "./builds/nature";
import { BUILDS as BUILT } from "./builds/built";

const BUILDS: Build[] = [...NATURE, ...BUILT];

/** Crease angle per model (studio/normals.ts): faceted pieces keep their facets, the rest smooth below 35 degrees. */
const FLAT = new Set(["tree-cypress", "tree-round", "bush", "grasses", "rocks", "bollard"]);

/** One thing to compare: its concept, the current look and the studio look. */
type Subject = { id: string; name: string; concept?: string; height: number; span: number; crease: number; draw: () => ReactNode };

const conceptOf = (id: string) => (id.startsWith("driver") ? "driver" : CONCEPTS.some((c) => c.id === id) ? id : undefined);

const FROM_BUILDS: Subject[] = BUILDS.map((b) => ({ id: b.id, name: b.name, concept: b.id, height: b.height, span: b.span, crease: FLAT.has(b.id) ? 12 : 35, draw: () => <b.Model /> }));
const FROM_MESHY: Subject[] = MESHY.map((m) => ({
  id: m.id,
  name: m.name,
  concept: conceptOf(m.id),
  height: m.height,
  span: Math.max(m.height, m.span ?? 0),
  crease: m.textured ? 0 : 35,
  draw: () => (
    <Suspense fallback={null}>
      <MeshyModel def={m} />
    </Suspense>
  ),
}));

/** Studio prep time per model (normals + AO bake + materials), readable as window.__studioMs. */
function bakeLog(id: string, ms: number) {
  const w = window as unknown as { __studioMs?: Record<string, number> };
  (w.__studioMs ??= {})[id] = Math.round(ms);
}

type View = "both" | "current" | "studio";
type Opts = { turn: boolean; ssao: boolean };

/** Mounts its canvas only while on screen, so the page never holds more WebGL contexts than the browser allows. */
function Lazy({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={box} className="h-full w-full">
      {on && children}
    </div>
  );
}

/** Camera that fits the model's bounding sphere, three-quarter view from front-right like the concepts. */
function frame(s: Subject) {
  const r = 0.5 * Math.hypot(s.span, s.height, s.span * 0.6);
  const d = (r / Math.sin(THREE.MathUtils.degToRad(15))) * 1.02;
  const dir = new THREE.Vector3(0.72, 0.38, 1).normalize().multiplyScalar(d);
  return { d, target: [0, s.height * 0.45, 0] as [number, number, number], position: [dir.x, dir.y + s.height * 0.45, dir.z] as [number, number, number] };
}

/** The look the world has today: the proposal's hemisphere + sun, default ACES. */
function CurrentTable({ s, turn }: { s: Subject; turn: boolean }) {
  const { position, target } = frame(s);
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position, fov: 30 }}>
      <color attach="background" args={["#ebe9e3"]} />
      <Lights size={Math.max(8, s.span)} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[s.span * 1.6, 64]} />
        <meshStandardMaterial color="#e1ded6" roughness={1} />
      </mesh>
      {s.draw()}
      <OrbitControls target={target} autoRotate={turn} autoRotateSpeed={1.2} enablePan={false} minPolarAngle={0.4} maxPolarAngle={1.5} />
    </Canvas>
  );
}

/** The studio look (components/world/studio): soft light, soft shadows, AO, creased normals, grain, Neutral tone mapping. */
function StudioTable({ s, turn, ssao }: { s: Subject } & Opts) {
  const { d, position, target } = frame(s);
  const [ready, setReady] = useState(0);
  const size = Math.max(s.span, s.height);
  return (
    <Canvas shadows="variance" dpr={[1, 2]} camera={{ position, fov: 30, far: d * 12 }} gl={STUDIO_TONE}>
      <StudioSet key={ready} size={size} camDistance={d * 1.3} post={ssao} />
      <Studify crease={s.crease} onReady={(ms) => (bakeLog(s.id, ms), setReady((r) => r + 1))}>
        {s.draw()}
      </Studify>
      <OrbitControls target={target} autoRotate={turn} autoRotateSpeed={1.2} enablePan={false} minPolarAngle={0.4} maxPolarAngle={1.5} />
    </Canvas>
  );
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <span className="inline-flex border-2 border-ink font-mono text-[12px]">
      {options.map(([v, label]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={`px-2 py-1 ${v === value ? "bg-ink text-paper" : "bg-white text-ink hover:bg-paper"}`}>
          {label}
        </button>
      ))}
    </span>
  );
}

const VIEWS: [View, string][] = [
  ["both", "Both"],
  ["current", "Current"],
  ["studio", "Studio"],
];

/** Concept | current | studio, with its own view switch (follows the page's until used). */
function Row({ s, view: pageView, opts }: { s: Subject; view: View; opts: Opts }) {
  const [own, setOwn] = useState<View | null>(null);
  const [seenPage, setSeenPage] = useState(pageView);
  if (seenPage !== pageView) {
    setSeenPage(pageView);
    setOwn(null);
  }
  const view = own ?? pageView;
  const cells = view === "both" ? "grid-cols-3" : "grid-cols-[1fr_2fr]";
  return (
    <div id={`m-${s.id}`} className="border-2 border-ink bg-white">
      <div className="flex items-center gap-3 border-b-2 border-ink px-2 py-1.5 font-mono text-[12px]">
        {s.name}
        <span className="text-graphite">{s.id}</span>
        <span className="ml-auto">
          <Seg value={view} options={VIEWS} onChange={setOwn} />
        </span>
      </div>
      <div className={`grid ${cells}`}>
        <figure className="relative border-r-2 border-ink">
          {s.concept ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={`/models/concepts/${s.concept}.png`} alt={s.name} className="aspect-square w-full object-cover" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center font-mono text-[12px] text-graphite">no concept</div>
          )}
          <figcaption className="absolute left-2 top-2 bg-white px-1 font-mono text-[11px]">Concept</figcaption>
        </figure>
        {view !== "studio" && (
          <div className={`relative ${view === "both" ? "border-r-2 border-ink" : ""}`}>
            <Lazy>
              <CurrentTable s={s} turn={opts.turn} />
            </Lazy>
            <span className="absolute left-2 top-2 bg-white px-1 font-mono text-[11px]">Current</span>
          </div>
        )}
        {view !== "current" && (
          <div className="relative">
            <Lazy>
              <StudioTable s={s} {...opts} />
            </Lazy>
            <span className="absolute left-2 top-2 bg-ink px-1 font-mono text-[11px] text-paper">Studio</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ModelsPage() {
  const [view, setView] = useState<View>("both");
  const [opts, setOpts] = useState<Opts>({ turn: true, ssao: false });
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const v = q.get("view");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL after hydration
    if (v === "both" || v === "current" || v === "studio") setView(v);
    setOpts({ turn: !q.has("still"), ssao: q.get("ssao") === "1" });
  }, []);
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-4 py-3">
          <Lockup size={16} name={profile.name} />
          <span className="font-mono text-[12px] text-graphite">HG-08 · Models</span>
          <nav className="ml-auto flex gap-4 font-mono text-[12px] text-graphite">
            <Link href="/docs/brand/world" className="hover:text-ink">
              World
            </Link>
            <Link href="/docs/brand/system" className="hover:text-ink">
              Design system
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-[1240px] px-4 pb-24">
        <p className="mt-12 font-mono text-[12px] text-graphite">HG-08 · Models · For review</p>
        <h1 className="mt-3 text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[64px]">
          Made with Meshy, painted by us<span className="text-signal">.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-graphite">
          Meshy makes the shape; the paint, codes and the orange accent are ours. Drag to turn. Plan and prompts: docs/research/meshy-models.md.
        </p>
        {[...new Set(CONCEPTS.map((c) => c.group))].map((g, gi) => (
          <section key={g} className="mt-12">
            <h2 className="mb-3 flex items-baseline gap-3 text-[24px] font-semibold tracking-[-0.02em]">
              <span className="font-mono text-[13px] text-signal">{String(gi + 1).padStart(2, "0")}</span>
              {g} <span className="font-mono text-[12px] font-normal text-graphite">concepts, before 3D</span>
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {CONCEPTS.filter((c) => c.group === g).map((c) => (
                <figure key={c.id} className="border-2 border-ink bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/models/concepts/${c.id}.png`} alt={c.name} className="aspect-square w-full object-cover" />
                  <figcaption className="flex border-t-2 border-ink px-2 py-1.5 font-mono text-[12px]">
                    {c.name}
                    <span className="ml-auto text-graphite">{MESHY.some((m) => m.id === c.id) ? "3D ✓" : "concept"}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
        <div className="sticky top-[54px] z-20 mt-14 flex flex-wrap items-center gap-3 border-2 border-ink bg-paper px-3 py-2 font-mono text-[12px]">
          <span>All rows</span>
          <Seg value={view} options={VIEWS} onChange={setView} />
          <span className="ml-3">Turn</span>
          <Seg value={opts.turn ? "on" : "off"} options={[["on", "On"], ["off", "Off"]]} onChange={(v) => setOpts((o) => ({ ...o, turn: v === "on" }))} />
          <span className="ml-3">Studio SSAO</span>
          <Seg value={opts.ssao ? "on" : "off"} options={[["on", "On"], ["off", "Off"]]} onChange={(v) => setOpts((o) => ({ ...o, ssao: v === "on" }))} />
        </div>
        <section className="mt-6">
          <h2 className="mb-3 text-[24px] font-semibold tracking-[-0.02em]">
            Built in code <span className="font-mono text-[12px] font-normal text-graphite">concept, current, studio · drag to turn</span>
          </h2>
          <div className="space-y-4">
            {FROM_BUILDS.map((s) => (
              <Row key={s.id} s={s} view={view} opts={opts} />
            ))}
          </div>
        </section>
        <h2 className="mt-14 mb-3 text-[24px] font-semibold tracking-[-0.02em]">Meshy 3D</h2>
        <div className="space-y-4">
          {FROM_MESHY.map((s) => (
            <Row key={s.id} s={s} view={view} opts={opts} />
          ))}
        </div>
      </div>
    </main>
  );
}
