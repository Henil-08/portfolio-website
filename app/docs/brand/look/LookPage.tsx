"use client";

// The look=next review (docs/BRAND.md 2026-11-09): the same fixed poses in the current look and
// in the polish pass, one condition at a time. Stills come from scripts/look/compare.mjs (PUBLIC=1
// writes public/look/<pose>-<cond>-<look>.webp); the switch itself is components/world/look.ts.
import { useState } from "react";
import Link from "next/link";
import { profile } from "@/content/profile";
import { Lockup } from "@/components/brand/mark";

const CONDS = [
  { id: "day", name: "Day" },
  { id: "dusk", name: "Dusk" },
  { id: "night", name: "Night" },
  { id: "rain", name: "Rain" },
] as const;

const POSES = [
  { id: "chase", name: "Chase start" },
  { id: "straight", name: "Main straight" },
  { id: "garage", name: "Garage bay, outside" },
  { id: "teardown", name: "Teardown, inside" },
  { id: "town", name: "Town" },
  { id: "waterfront", name: "Waterfront" },
  { id: "top", name: "Top view" },
];

const CHANGES = [
  ["HDR and tone mapping", "Filmic Khronos PBR Neutral at the end of the post chain, with an exposure per time of day. Highlights roll off instead of clipping; paper, ink and orange stay true below the shoulder."],
  ["Light", "The flat hemisphere fill drops from 0.7 to about 0.15. A CC0 overcast sky (Poly Haven) lights and reflects through a prefiltered environment map, under a warmer key. Shadows take the sky's cool colour and are never black. Night and rain have their own keys and exposures."],
  ["Materials", "Uniform satin plastic is retired: roughness by surface (paper matte, concrete and asphalt rough, ink semi-matte, glass glossy, metal brushed), clearcoat on the car paint over the livery's own colours, and small CC0 micro-textures (normal and roughness only, no colour) mapped in world space, so no model needs UVs. Rain glosses the tarmac."],
  ["Contact and occlusion", "A soft contact shadow under the car, and ambient occlusion baked once at load onto the static kit models (done during the boot, nothing per frame)."],
  ["Anti-aliasing", "MSAA on the composer on High, so fences, kerbs and thin lines stop crawling; SMAA stays on Balanced and Low."],
  ["Post", "Bloom only past 1.0, at 0.25. Light grain and a slight vignette on High only."],
] as const;

export default function LookPage() {
  const [cond, setCond] = useState<(typeof CONDS)[number]["id"]>("day");
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-4 py-3">
          <Lockup size={16} name={profile.name} />
          <span className="font-mono text-[12px] text-graphite">HG-08 · Look review</span>
          <nav className="ml-auto flex gap-4 font-mono text-[12px] text-graphite">
            <Link href="/docs/brand/direction" className="hover:text-ink">
              Direction
            </Link>
            <Link href="/docs/brand/world" className="hover:text-ink">
              World
            </Link>
            <Link href="/docs/brand/models" className="hover:text-ink">
              Models
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-[1400px] px-4 pb-24">
        <p className="mt-12 font-mono text-[12px] text-graphite">HG-08 · Rendering polish pass · current vs next</p>
        <h1 className="mt-3 text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[64px]">
          Same world, lit properly<span className="text-signal">.</span>
        </h1>
        <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-graphite">
          The palette, the models and the interface are unchanged. What changes is how the world is lit and rendered. Each pair below is the same pose at the
          same moment: the current look on the left, the polish pass on the right.
        </p>

        <section className="mt-10 grid gap-3 md:grid-cols-2">
          <div className="border-2 border-ink bg-white">
            <div className="bg-ink px-3 py-2 font-mono text-[12px] text-white">Try it in the world</div>
            <ul className="divide-y divide-rule font-mono text-[13px]">
              <li className="flex flex-wrap items-baseline gap-x-3 px-3 py-2.5">
                <Link href="/?look=next" className="x-link font-semibold">
                  /?look=next
                </Link>
                <span className="text-graphite">turns the polish pass on</span>
              </li>
              <li className="flex flex-wrap items-baseline gap-x-3 px-3 py-2.5">
                <Link href="/?look=current" className="x-link font-semibold">
                  /?look=current
                </Link>
                <span className="text-graphite">back to the current look</span>
              </li>
              <li className="flex flex-wrap items-baseline gap-x-3 px-3 py-2.5">
                <Link href="/?look=next&cam=next" className="x-link font-semibold">
                  &amp;cam=next
                </Link>
                <span className="text-graphite">lower, longer chase camera (off by default)</span>
              </li>
              <li className="flex flex-wrap items-baseline gap-x-3 px-3 py-2.5">
                <Link href="/?look=next&hud=next" className="x-link font-semibold">
                  &amp;hud=next
                </Link>
                <span className="text-graphite">quiet driving HUD (off by default)</span>
              </li>
            </ul>
          </div>
          <div className="border-2 border-ink bg-white px-3 py-3 text-[14px] leading-relaxed">
            <p>
              Each switch is remembered in this browser until the other value is asked for, so a reload keeps it. The current look stays the default for every
              visitor. <span className="font-mono text-[12.5px]">?quality=high|balanced|low</span> still picks the tier: Low drops the new look&apos;s extra costs
              (MSAA, micro-textures, grain) and costs what the current look costs.
            </p>
            <p className="mt-2 text-graphite">
              One switch in code: <span className="font-mono text-[12.5px]">components/world/look.ts</span>.
            </p>
          </div>
        </section>

        <div className="sticky top-[58px] z-20 -mx-4 mt-12 flex items-center gap-2 border-b-2 border-ink bg-paper px-4 py-3">
          <span className="mr-2 font-mono text-[12px] text-graphite">Condition</span>
          {CONDS.map((c) => (
            <button key={c.id} onClick={() => setCond(c.id)} className={`ds-tab ${cond === c.id ? "bg-ink text-white" : ""}`} aria-pressed={cond === c.id}>
              {c.name}
            </button>
          ))}
          <span className="ml-auto hidden font-mono text-[12px] text-graphite sm:inline">left: current · right: next</span>
        </div>

        {POSES.map((p, i) => (
          <section key={p.id} className="mt-10">
            <div className="mb-3 flex items-baseline gap-3">
              <span className="font-mono text-[13px] text-signal">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="text-[24px] font-semibold tracking-[-0.02em]">{p.name}</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {(["current", "next"] as const).map((l) => (
                <figure key={l} className="border-2 border-ink bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/look/${p.id}-${cond}-${l}.webp`} alt={`${p.name}, ${cond}, ${l} look`} loading="lazy" className="aspect-[8/5] w-full object-cover" />
                  <figcaption className="border-t-2 border-ink px-2 py-1.5 font-mono text-[12px]">
                    {l === "current" ? "Current" : "?look=next"} · {CONDS.find((c) => c.id === cond)!.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-16 border-2 border-ink bg-white">
          <div className="bg-ink px-3 py-2 font-mono text-[12px] text-white">What the polish pass changes</div>
          <ol className="divide-y divide-rule">
            {CHANGES.map(([h, t], i) => (
              <li key={h} className="flex gap-3 px-3 py-2.5 text-[14.5px]">
                <span className="font-mono text-[12px] text-signal">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="font-semibold">{h}.</span> {t}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6 border-2 border-ink bg-white px-3 py-3 text-[13.5px] leading-relaxed">
          <p className="font-mono text-[12px] text-graphite">Cost</p>
          <p className="mt-1">
            Measured against the current look, interleaved on the same production build (docs/research/performance.md, &ldquo;look=next&rdquo;): desktop Chrome
            holds 60 fps on High with MSAA in every condition (main thread 4.2&ndash;4.4 ms a frame, the same draw calls, +1 MB of GPU memory); at a 4&times;
            CPU throttle and on the phone emulation it is within the run-to-run noise of the current look, and Auto steps down the same way.
          </p>
        </section>

        <section className="mt-6 border-2 border-ink bg-white px-3 py-3 text-[13.5px] leading-relaxed">
          <p className="font-mono text-[12px] text-graphite">Assets, all CC0</p>
          <p className="mt-1">
            Environment: Kloofendal Overcast (Pure Sky), Greg Zaal, Poly Haven. Micro-textures: Concrete 034, Asphalt 026 C, Painted Plaster 017 and Metal 009,
            ambientCG. Sources and licence notes: <span className="font-mono text-[12.5px]">public/env/LICENSE.md</span>,{" "}
            <span className="font-mono text-[12.5px]">public/textures/LICENSE.md</span>.
          </p>
        </section>
      </div>
    </main>
  );
}
