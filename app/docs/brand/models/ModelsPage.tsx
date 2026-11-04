"use client";

// Meshy-made models for review: each on a turntable in the brand paint, before it goes in the world.
// One canvas per card (there are few). Source list: components/world/meshy/catalog.ts.
import Link from "next/link";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { profile } from "@/content/profile";
import { Lockup } from "@/components/brand/mark";
import { CONCEPTS, MESHY, type MeshyModel as Def } from "@/components/world/meshy/catalog";
import { MeshyModel } from "@/components/world/meshy/MeshyModel";
import { Lights } from "../world/models";

function Turntable({ def }: { def: Def }) {
  const span = Math.max(def.height, def.span ?? 0);
  const d = Math.max(def.height * 2.6, span * 1.35);
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [d * 0.75, def.height * 0.9 + span * 0.25, d], fov: 30 }}>
      <color attach="background" args={["#ebe9e3"]} />
      <Lights size={8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[span * 1.6, 64]} />
        <meshStandardMaterial color="#e1ded6" roughness={1} />
      </mesh>
      <Suspense fallback={null}>
        <MeshyModel def={def} />
      </Suspense>
      <OrbitControls target={[0, def.height * 0.5, 0]} autoRotate autoRotateSpeed={1.2} enablePan={false} minPolarAngle={0.5} maxPolarAngle={1.5} />
    </Canvas>
  );
}

export default function ModelsPage() {
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
        <h2 className="mt-14 mb-3 text-[24px] font-semibold tracking-[-0.02em]">In 3D</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {MESHY.map((m) => (
            <section key={m.id} className="border-2 border-ink bg-white">
              <div className="flex items-center bg-ink px-3 py-2 font-mono text-[12px] text-white">
                {m.name}
                <span className="ml-auto text-white/60">{m.id}.glb</span>
              </div>
              <div className="aspect-[4/3]">
                <Turntable def={m} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
