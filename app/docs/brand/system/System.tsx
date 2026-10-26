"use client";

// The portfolio in the Datasheet language: the identity, every motion primitive with its
// timing, the micro-interactions as live components, and the real screens (boot, driving
// HUD, garage, map, resume, 404) built from them. All copy comes from content/*.
import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { profile, story } from "@/content/profile";
import { projects, DOMAINS } from "@/content/projects";
import { ACHIEVEMENTS } from "@/content/achievements";
import { radioLines, radioText } from "@/content/radio";
import { sectorT, trackPoint, trackTangent, zones } from "@/components/world/layout";
import TacticalMap, { Compass, gridRef } from "@/components/brand/TacticalMap";
import { Count, Decode, Stage, d } from "@/components/brand/motion";
import { DsCard, DsResume } from "@/components/brand/sheets";
import { DS, pad } from "@/components/brand/tokens";
import { ATTENTION, Lockup, Mark } from "@/components/brand/mark";
import Corners from "@/components/brand/Corners";

/* ------------------------------------------------------------------ page frame */

function useTake() {
  const [take, setTake] = useState(0);
  return [take, () => setTake((t) => t + 1)] as const;
}

function Replay({ onClick, light }: { onClick: () => void; light?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`font-mono border px-2 py-0.5 text-[11px] transition ${light ? "border-white/30 text-white/70 hover:border-white hover:text-white" : "border-[#111]/30 text-[#5d5d58] hover:border-[#111] hover:text-[#111]"}`}>
      ↻ Replay
    </button>
  );
}

function Section({ id, n, title, intro, children }: { id: string; n: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16 pt-16 sm:pt-24">
      <div className="flex items-baseline gap-4 border-b-[3px] border-[#111] pb-3">
        <span className={`font-mono text-[15px] text-[#ff4f00]`}>{n}</span>
        <h2 className="text-[30px] font-semibold leading-none tracking-tight sm:text-[40px]">{title}</h2>
      </div>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[#5d5d58]">{intro}</p>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Sub({ n, children }: { n: string; children: ReactNode }) {
  return (
    <h3 className="mb-4 mt-12 flex items-baseline gap-3 border-b border-[#111] pb-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] first:mt-0">
      <span className={`font-mono text-[#ff4f00]`}>{n}</span>
      {children}
    </h3>
  );
}

/* ------------------------------------------------------------------ 1 · identity */

function Identity() {
  const [take, replay] = useTake();
  return (
    <Section id="identity" n="01" title="Identity" intro="One mark, one paper, one ink, one orange. Everything else is structure: numbered sections, hard rules, tables, units on every claim.">
      <div className="grid gap-px border-2 border-[#111] bg-[#111] lg:grid-cols-[1.1fr_1fr]">
        <div className="relative grid min-h-[340px] place-items-center bg-white p-8">
          <span className={`font-mono absolute left-4 top-3 text-[11px] uppercase tracking-[0.1em] text-[#5d5d58]`}>The mark · L10 · A</span>
          <span className="absolute right-3 top-2">
            <Replay onClick={replay} />
          </span>
          <div className="flex flex-col items-center gap-6">
            <Mark key={take} size={180} motion />
            <div className="text-center">
              <p className="text-[28px] font-semibold leading-none tracking-tight">{profile.name}</p>
              <p className={`font-mono mt-2 text-[12px] text-[#5d5d58]`}>HG-08 · AI/ML engineer</p>
            </div>
          </div>
        </div>
        <div className="grid grid-rows-[1fr_auto] bg-white">
          <div className="grid grid-cols-2">
            <div className="grid place-items-center border-b border-r border-[#cfcdc4] bg-[#111] p-6">
              <Mark size={96} fg={DS.paper} />
            </div>
            <div className="grid place-items-center gap-3 border-b border-[#cfcdc4] p-6">
              <div className="flex items-end gap-3">
                <Mark size={32} />
                <Mark size={16} />
              </div>
              <span className={`font-mono text-[11px] text-[#5d5d58]`}>32 · 16 px, favicon</span>
            </div>
            <div className="col-span-2 flex flex-col items-start gap-4 border-b border-[#cfcdc4] p-6">
              <span className={`font-mono text-[11px] text-[#5d5d58]`}>Lockup · square = name size · gap 0.4×</span>
              <Lockup size={36} name={profile.name} />
              <div className="flex flex-wrap items-center gap-6">
                <Lockup size={20} name={profile.name} />
                <Lockup size={14} name={profile.name} />
              </div>
            </div>
          </div>
          <ul className="space-y-1.5 p-5 text-[14px] leading-relaxed">
            {[
              "Clear space around the mark: one cell on every side.",
              "Next to the name, the square is as tall as the name's font size, 0.4 of that apart.",
              "Smallest size 16 px. Never recolour the cells; on ink, they turn paper.",
              "It animates once, on the boot. Everywhere else it sits still.",
              "The orange cell is the only orange in the mark. Nothing else gets added to it.",
            ].map((t) => (
              <li key={t} className="grid grid-cols-[12px_1fr] gap-2">
                <span className="mt-[0.6em] h-[5px] w-[5px] bg-[#111]" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Sub n="1.1">Colour</Sub>
      <div className="grid grid-cols-2 gap-px border-2 border-[#111] bg-[#111] sm:grid-cols-5">
        {(
          [
            ["Paper", DS.paper, "Every background"],
            ["Ink", DS.ink, "Text, rules, frames, fills"],
            ["Graphite", DS.grey, "Secondary text"],
            ["Rule", DS.rule, "Table lines, quiet borders"],
            ["Signal", DS.orange, "Focus, status, the figure that matters"],
          ] as const
        ).map(([n, c, u]) => (
          <div key={n} className="bg-white">
            <div className="h-20 border-b border-[#cfcdc4]" style={{ background: c }} />
            <div className="p-3">
              <p className="text-[14px] font-semibold">{n}</p>
              <p className={`font-mono text-[12px] text-[#5d5d58]`}>{c}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-[#5d5d58]">{u}</p>
            </div>
          </div>
        ))}
      </div>

      <Sub n="1.2">Type</Sub>
      <div className="border-2 border-[#111] bg-white">
        {(
          [
            ["Display", "IBM Plex Sans 600 · 44 / 1.0 · −0.02em", <span key="a" className="text-[44px] font-semibold leading-none tracking-tight">AI in Verification</span>],
            ["Title", "IBM Plex Sans 600 · 22 / 1.2", <span key="b" className="text-[22px] font-semibold">Seven agents that write and run chip tests</span>],
            ["Body", "IBM Plex Sans 400 · 15 / 1.6", <span key="c" className="text-[15px] leading-relaxed">{projects[0].points[2]}</span>],
            ["Label", "IBM Plex Sans 600 · 13 · caps · 0.06em", <span key="d" className="text-[13px] font-semibold uppercase tracking-[0.06em]">Key specifications</span>],
            ["Code", "IBM Plex Mono 400 · 12", <span key="e" className={`font-mono text-[12px]`}>HG-08 / P01 · Z03 · Garage</span>],
            ["Figure", "IBM Plex Mono 600 · 16–48 · tabular", <span key="f" className={`font-mono text-[32px] font-semibold`}>17.3% → 44.9%</span>],
          ] as const
        ).map(([n, spec, ex]) => (
          <div key={n} className="grid items-baseline gap-2 border-b border-[#cfcdc4] px-5 py-4 last:border-b-0 sm:grid-cols-[150px_1fr]">
            <div>
              <p className="text-[13px] font-semibold">{n}</p>
              <p className={`font-mono text-[11px] text-[#5d5d58]`}>{spec}</p>
            </div>
            <div className="min-w-0">{ex}</div>
          </div>
        ))}
      </div>

      <Sub n="1.3">Rules</Sub>
      <ol className="grid gap-px border-2 border-[#111] bg-[#111] sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Hard edges", "No rounded corners, no blur, no glow, no gradients. Shadows are solid ink, offset 3 px."],
          ["Number everything", "Sections, specs, zones and projects carry a code: 01, P01, Z03, HG-08."],
          ["Units on claims", "A figure always has its unit and its label: 250ms p95 TTFT, not “fast”."],
          ["One orange", "Orange marks focus, status and the one figure that matters. Never a fill for a whole panel."],
          ["Motion builds, then stops", "Things assemble once when they appear. Nothing loops except loaders, the radio wave and a cursor."],
          ["Readable first", "Body copy is plain sentence case at 15 px or more. Caps only for short labels."],
        ].map(([t, b], i) => (
          <li key={t} className="bg-white p-5">
            <p className={`font-mono text-[12px] text-[#ff4f00]`}>R{pad(i + 1)}</p>
            <p className="mt-1 text-[16px] font-semibold">{t}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-[#5d5d58]">{b}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ------------------------------------------------------------------ 2 · motion */

function Prim({ code, name, spec, use, children }: { code: string; name: string; spec: string; use: string; children: (run: boolean) => ReactNode }) {
  const [take, replay] = useTake();
  return (
    <div className="flex flex-col border-2 border-[#111] bg-white">
      <div className="flex items-center justify-between border-b-2 border-[#111] px-3 py-1.5">
        <span className="text-[13px] font-semibold uppercase tracking-[0.06em]">
          <span className={`font-mono mr-2 text-[#ff4f00]`}>{code}</span>
          {name}
        </span>
        <Replay onClick={replay} />
      </div>
      <div className="grid min-h-[150px] place-items-center p-5">
        <Stage key={take} motion className="w-full">
          {(run) => children(run)}
        </Stage>
      </div>
      <div className="mt-auto border-t border-[#cfcdc4] px-3 py-2">
        <p className={`font-mono text-[11.5px]`}>{spec}</p>
        <p className="text-[12.5px] text-[#5d5d58]">{use}</p>
      </div>
    </div>
  );
}

function Loader() {
  return (
    <svg width={72} height={72} viewBox="0 0 64 64" aria-hidden>
      {ATTENTION.flatMap((row, r) =>
        row.map((w, c) => (
          <rect
            key={`${r}${c}`}
            className="x-load"
            style={{ animationDelay: `${(r + c) * 110}ms`, "--lo": w < 0 ? 0.35 : 0.08 } as CSSProperties}
            x={4 + c * 14.5}
            y={4 + r * 14.5}
            width="12.5"
            height="12.5"
            fill={w < 0 ? DS.orange : DS.ink}
          />
        )),
      )}
    </svg>
  );
}

function MotionSection() {
  const [take, replay] = useTake();
  return (
    <Section
      id="motion"
      n="02"
      title="Motion"
      intro="Nine moves, all fast and mechanical, like a game menu booting. They play once when something appears, in order: frame, bars, text, figures, details. Reduced motion skips straight to the end."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col border-2 border-[#111] bg-white sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between border-b-2 border-[#111] px-3 py-1.5">
            <span className="text-[13px] font-semibold uppercase tracking-[0.06em]">
              <span className={`font-mono mr-2 text-[#ff4f00]`}>M00</span>The mark
            </span>
            <Replay onClick={replay} />
          </div>
          <div className="grid min-h-[150px] place-items-center p-5">
            <Mark key={take} size={92} motion />
          </div>
          <div className="mt-auto border-t border-[#cfcdc4] px-3 py-2">
            <p className={`font-mono text-[11.5px]`}>trace .5s · fill .35s · 45ms per diagonal · ≈ .8s</p>
            <p className="text-[12.5px] text-[#5d5d58]">Boot, and once on first load in the header.</p>
          </div>
        </div>
        <Prim code="M01" name="Draw" spec="clip top → bottom · .6s · cubic(.6,0,.2,1)" use="Panels and cards opening.">
          {() => <div className="dsa-frame mx-auto h-24 w-full max-w-[220px] border-2 border-[#111] bg-[#f3f2ed]" style={d(0)} />}
        </Prim>
        <Prim code="M02" name="Wipe" spec="scaleX 0 → 1 · .5s · cubic(.6,0,.2,1)" use="Header bars, rules, table lines.">
          {() => (
            <div className="relative mx-auto w-full max-w-[240px] px-3 py-2">
              <span className="dsa-x absolute inset-0 bg-[#111]" style={d(0)} />
              <span className={`font-mono dsa-rise relative text-[12px] text-white`} style={d(250)}>
                HG-08 / P01 · Project datasheet
              </span>
            </div>
          )}
        </Prim>
        <Prim code="M03" name="Decode" spec="3 glyphs ahead · .45s · left → right" use="Titles, part numbers, zone codes.">
          {(run) => (
            <p className="text-center text-[26px] font-semibold tracking-tight">
              <Decode text="AI in Verification" run={run} dur={550} />
            </p>
          )}
        </Prim>
        <Prim code="M04" name="Count" spec="0 → value · .7s · ease-out cubic" use="Every figure in a spec table or HUD.">
          {(run) => (
            <p className={`font-mono text-center text-[40px] font-semibold`}>
              <Count value="44.9%" run={run} dur={900} />
            </p>
          )}
        </Prim>
        <Prim code="M05" name="Stagger" spec="clip wipe .45s · 110ms apart" use="Bullets, list rows, table rows.">
          {() => (
            <ul className="mx-auto w-full max-w-[260px] space-y-2 text-[13px]">
              {projects[1].points.slice(0, 3).map((t, i) => (
                <li key={t} className="grid grid-cols-[12px_1fr] gap-1.5">
                  <span className="dsa-pop mt-[0.5em] h-[6px] w-[6px] bg-[#111]" style={d(i * 110)} />
                  <span className="dsa-wipe truncate" style={d(30 + i * 110)}>
                    {t}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Prim>
        <Prim code="M06" name="Pop" spec="scale 0 → 1 · .28s · overshoot" use="Bullets, status dots, map pins, section numbers.">
          {() => (
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={`dsa-pop h-6 w-6 ${i === 4 ? "bg-[#ff4f00]" : "bg-[#111]"}`} style={d(i * 80)} />
              ))}
            </div>
          )}
        </Prim>
        <Prim code="M07" name="Scan" spec="one pass · 1.2s · once per panel" use="A card or panel the first time it opens.">
          {() => (
            <div className="relative mx-auto h-24 w-full max-w-[220px] overflow-hidden border-2 border-[#111] bg-white">
              <span className="dsa-scan absolute inset-x-0 h-[2px] bg-[#ff4f00]" style={d(0)} />
              <div className="space-y-2 p-3">
                <span className="block h-2 w-3/4 bg-[#cfcdc4]" />
                <span className="block h-2 w-1/2 bg-[#cfcdc4]" />
                <span className="block h-2 w-2/3 bg-[#cfcdc4]" />
              </div>
            </div>
          )}
        </Prim>
        <Prim code="M08" name="Flicker" spec="on / off steps · .55s" use="Labels that appear in the world, toasts.">
          {() => (
            <div className="flex justify-center"><div className="dsa-flicker inline-flex items-stretch border-2 border-[#111] bg-white shadow-[3px_3px_0_#111]" style={d(0)}>
              <span className={`font-mono grid place-items-center bg-[#111] px-2.5 text-[13px] font-semibold text-white`}>E</span>
              <span className="px-3 py-1.5 text-[14px] font-semibold">Podium</span>
            </div></div>
          )}
        </Prim>
        <div className="flex flex-col border-2 border-[#111] bg-white">
          <div className="border-b-2 border-[#111] px-3 py-1.5">
            <span className="text-[13px] font-semibold uppercase tracking-[0.06em]">
              <span className={`font-mono mr-2 text-[#ff4f00]`}>M09</span>Loading
            </span>
          </div>
          <div className="grid min-h-[150px] place-items-center p-5">
            <Loader />
          </div>
          <div className="mt-auto border-t border-[#cfcdc4] px-3 py-2">
            <p className={`font-mono text-[11.5px]`}>the mark, cells pulsing on the diagonal · loops</p>
            <p className="text-[12.5px] text-[#5d5d58]">While the world or an answer loads. The only loop.</p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ 3 · interactions */

function KeyCap({ k, code }: { k: string; code: string }) {
  const [down, setDown] = useState(false);
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.code === code && setDown(e.type === "keydown");
    window.addEventListener("keydown", on);
    window.addEventListener("keyup", on);
    return () => {
      window.removeEventListener("keydown", on);
      window.removeEventListener("keyup", on);
    };
  }, [code]);
  return <span className={`x-key ${down ? "is-down" : ""}`}>{k}</span>;
}

function Tabs() {
  const items = ["Map", "Achievements", "Settings"];
  const [i, setI] = useState(0);
  return (
    <div className="relative inline-grid grid-cols-3 border-2 border-[#111] bg-white">
      <span className="absolute inset-y-0 w-1/3 bg-[#111] transition-transform duration-200 ease-[cubic-bezier(.6,0,.2,1)]" style={{ transform: `translateX(${i * 100}%)` }} />
      {items.map((t, j) => (
        <button key={t} type="button" onClick={() => setI(j)} className={`font-mono relative px-4 py-2 text-[12px] uppercase tracking-[0.06em] transition-colors ${i === j ? "text-white" : "text-[#111]"}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

// I09: the cursor is Magnetic (owner's pick). Targets to try it on: boxed ones dock the orange
// square outside their corner, unboxed links get corner brackets, wide rows keep it on the pointer.
function CursorLab() {
  return (
    <div className="space-y-5">
      <ul className="space-y-1.5 text-[13.5px]">
        {[
          ["Boxed", "Buttons, chips, tabs lean toward you; the square docks just outside their bottom-right corner in orange."],
          ["Links", "A link with only an underline gets orange corner brackets round it instead."],
          ["Rows", "Wide rows keep the square on the pointer; the row inverts as usual."],
          ["Press", "A click throws four little cells, the logo's weights and its orange one."],
        ].map(([k, v]) => (
          <li key={k} className="grid grid-cols-[64px_1fr] gap-2">
            <span className="font-mono text-[12px] text-[#ff4f00]">{k}</span>
            {v}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-5 text-[14px]">
        <button type="button" className="x-btn x-primary">
          Send <span className="x-arrow">→</span>
        </button>
        <button type="button" className="x-btn x-secondary">
          Secondary
        </button>
        <a href={profile.links.github} target="_blank" rel="noreferrer" className="x-link font-medium">
          GitHub
        </a>
        <a href={`mailto:${profile.email}`} className="x-link font-medium">
          Email
        </a>
        <button type="button" className="x-chip">
          Map
        </button>
        <input placeholder="Text field" className="w-36 border-2 border-[#111] bg-white px-2 py-1.5 outline-none" />
        <span data-cursor="drag" className="font-mono grid h-16 w-28 place-items-center border-2 border-dashed border-[#111] text-[12px] text-[#5d5d58]">
          3D view
        </span>
      </div>
      <a href="#interactions" data-code="P01" className="x-row grid grid-cols-[38px_1fr_18px] items-center gap-3 border-y border-[#cfcdc4] px-2 py-2.5 text-[14px]">
        <span className="font-mono text-[12px] text-[#ff4f00]">P01</span>
        <span>A row link, like the project list</span>
        <span className="x-arrow">→</span>
      </a>
    </div>
  );
}

function Toggle({ label }: { label: string }) {
  const [on, setOn] = useState(true);
  return (
    <button type="button" onClick={() => setOn(!on)} className="x-sel flex items-center gap-3" aria-pressed={on}>
      <Corners inset={-5} />
      <span className="relative h-6 w-12 border-2 border-[#111] bg-white">
        <span className={`absolute top-[2px] h-4 w-4 transition-all duration-200 ease-[cubic-bezier(.3,1.6,.5,1)] ${on ? "left-[26px] bg-[#111]" : "left-[2px] bg-[#cfcdc4]"}`} />
      </span>
      <span className="text-[14px]">{label}</span>
      <span className={`font-mono w-7 text-[12px] ${on ? "text-[#111]" : "text-[#5d5d58]"}`}>{on ? "ON" : "OFF"}</span>
    </button>
  );
}

function AskBox() {
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState(0);
  return (
    <div className="border-2 border-[#111] bg-white">
      <div className={`font-mono flex items-center justify-between bg-[#111] px-3 py-1.5 text-[11.5px] text-white`}>
        <span>ASK · Race engineer</span>
        <span className="flex items-center gap-1.5">
          <span className="x-blink h-1.5 w-1.5 rounded-full bg-[#ff4f00]" /> live
        </span>
      </div>
      <form
        className="x-sel m-3 flex border-2 border-[#111]"
        onSubmit={(e) => {
          e.preventDefault();
          setAsked((a) => a + 1);
        }}
      >
        <Corners inset={-6} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What does he work on?" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[15px] caret-[#ff4f00] outline-none" />
        <button type="submit" className={`font-mono border-l-2 border-[#111] bg-[#111] px-3 text-[12px] text-white`}>
          ↵
        </button>
      </form>
      <div className="min-h-[72px] border-t border-[#cfcdc4] px-3 py-3 text-[15px] leading-relaxed">
        {asked ? <Decode key={asked} text={profile.oneLiner} run dur={1600} /> : <span className="text-[#5d5d58]">Type a question and press Enter. The answer decodes in as it streams.</span>}
      </div>
    </div>
  );
}

function Toast({ take }: { take: number }) {
  const a = ACHIEVEMENTS[0];
  return (
    <Stage key={take} motion>
      {(run) => (
        <div className="dsa-flicker inline-block border-2 border-[#111] bg-white shadow-[3px_3px_0_#111]" style={d(0)}>
          <div className="flex items-center gap-3 px-3 py-2">
            <span className="dsa-pop grid h-7 w-7 place-items-center bg-[#ff4f00] text-[13px] font-bold text-white" style={d(150)}>
              ✓
            </span>
            <div>
              <p className={`font-mono text-[11px] text-[#5d5d58]`}>Achievement A01</p>
              <p className="text-[15px] font-semibold">
                <Decode text={a.name} run={run} delay={200} />
              </p>
              <p className="text-[12.5px] text-[#5d5d58]">{a.how}</p>
            </div>
          </div>
          <span className="x-countdown block h-[3px] bg-[#111]" style={{ "--t": "4s" } as CSSProperties} />
        </div>
      )}
    </Stage>
  );
}

function Interactions() {
  const [toast, fire] = useTake();
  const list = projects.slice(0, 4);
  return (
    <Section
      id="interactions"
      n="03"
      title="Micro-interactions"
      intro="Everything here is live: hover it, tab to it, click it, press E, M or Esc on your keyboard. Hover and focus share one signal, the orange corner brackets, so keyboard users get the same feedback."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel code="I01" title="Buttons" note="Primary: brackets on hover, arrow nudges, presses into its shadow. Secondary: ink wipes in from the left. Link: the underline draws.">
          <div className="flex flex-wrap items-center gap-5">
            <a href="#screens" className="x-sel x-btn x-primary">
              <Corners />
              Take the car out <span className="x-arrow">→</span>
            </a>
            <a href="/resume" className="x-btn x-secondary">
              Resume <span className="x-arrow">↗</span>
            </a>
            <a href={`mailto:${profile.email}`} className="x-link text-[15px] font-medium">
              Email me
            </a>
          </div>
        </Panel>
        <Panel code="I02" title="Keys" note="Key caps press down with your real keyboard. Every action on screen shows its key.">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[14px]">
            <span className="flex items-center gap-2">
              <KeyCap k="E" code="KeyE" /> Open
            </span>
            <span className="flex items-center gap-2">
              <KeyCap k="M" code="KeyM" /> Map
            </span>
            <span className="flex items-center gap-2">
              <KeyCap k="Esc" code="Escape" /> Close
            </span>
            <span className="flex items-center gap-2">
              <KeyCap k="←" code="ArrowLeft" />
              <KeyCap k="→" code="ArrowRight" /> Browse
            </span>
          </div>
        </Panel>
        <Panel code="I03" title="Tabs and toggles" note="The ink block slides between tabs. Toggles are square, and say ON or OFF in words.">
          <div className="flex flex-wrap items-center gap-6">
            <Tabs />
            <div className="space-y-3">
              <Toggle label="Sound" />
              <Toggle label="Engineer voice" />
            </div>
          </div>
        </Panel>
        <Panel code="I04" title="Chips" note="Stack items. They invert on hover.">
          <div className="flex flex-wrap gap-2">
            {projects[0].stack.map((s) => (
              <span key={s} className="x-chip">
                {s}
              </span>
            ))}
          </div>
        </Panel>
        <Panel code="I05" title="Rows" note="Any list of things you can open. The row inverts, the arrow arrives, figures stay in mono.">
          <div className="border-t-2 border-[#111]">
            {list.map((p) => (
              <a key={p.slug} href="#screens" className="x-row grid grid-cols-[38px_1fr_auto_18px] items-center gap-3 border-b border-[#cfcdc4] px-2 py-2.5">
                <span className={`font-mono x-mute text-[12px] text-[#5d5d58]`}>P{pad(projects.indexOf(p) + 1)}</span>
                <span className="truncate text-[15px] font-medium">{p.name}</span>
                <span className={`font-mono text-[13px] font-semibold`}>{p.headline.value}</span>
                <span className="x-arrow">→</span>
              </a>
            ))}
          </div>
        </Panel>
        <Panel code="I06" title="Ask" note="The input shows the brackets while focused and an orange caret. Answers decode in as they stream.">
          <AskBox />
        </Panel>
        <Panel code="I07" title="Toast" note="Flickers on, counts down with a bar, leaves. One at a time, top centre.">
          <div className="flex flex-wrap items-center gap-5">
            <button type="button" onClick={fire} className="x-btn x-secondary">
              Unlock one
            </button>
            {toast > 0 && <Toast take={toast} />}
          </div>
        </Panel>
        <Panel code="I08" title="Tooltip and status" note="Hover the code for its tooltip. Status dots are the only round thing, and blink only while live.">
          <div className="flex flex-wrap items-center gap-6 text-[14px]">
            <span className="group relative">
              <span className={`font-mono cursor-help border-b border-dashed border-[#111]`}>TTFT</span>
              <span className="pointer-events-none absolute bottom-full left-0 mb-2 w-max max-w-[220px] border-2 border-[#111] bg-white px-2.5 py-1.5 text-[13px] opacity-0 shadow-[3px_3px_0_#111] transition-opacity duration-100 group-hover:opacity-100">
                Time to first token: how long until the first word of an answer appears.
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="x-blink h-2 w-2 rounded-full bg-[#ff4f00]" /> Radio live
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#111]" /> Visited
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full border border-[#111]" /> Not yet
            </span>
          </div>
        </Panel>
        <Panel code="I09" title="Cursor" note="Live on every page. A small ink square follows you and shrinks while you press. A bar over text, DRAG over 3D views. Pick what it does over clickable things; the choice is saved in this browser so you can carry it around the site. Mouse and pen only; touch keeps its own.">
          <CursorLab />
        </Panel>
      </div>
    </Section>
  );
}

function Panel({ code, title, note, children }: { code: string; title: string; note: string; children: ReactNode }) {
  return (
    <div className="border-2 border-[#111] bg-white">
      <div className="border-b-2 border-[#111] px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.06em]">
        <span className={`font-mono mr-2 text-[#ff4f00]`}>{code}</span>
        {title}
      </div>
      <div className="p-5">{children}</div>
      <p className="border-t border-[#cfcdc4] px-4 py-2 text-[13px] leading-relaxed text-[#5d5d58]">{note}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ 4 · screens */

function Screen({ code, title, note, onReplay, children, bg }: { code: string; title: string; note: string; onReplay?: () => void; children: ReactNode; bg?: string }) {
  return (
    <figure className="mb-10">
      <figcaption className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`font-mono text-[13px] text-[#ff4f00]`}>{code}</span>
        <span className="text-[13px] font-semibold uppercase tracking-[0.06em]">{title}</span>
        <span className="text-[13px] text-[#5d5d58]">{note}</span>
        {onReplay && (
          <span className="ml-auto">
            <Replay onClick={onReplay} />
          </span>
        )}
      </figcaption>
      {/* a fixed 16:10 stage; on small screens it scrolls sideways inside its frame, not the page */}
      <div className="overflow-x-auto border-2 border-[#111]">
        <div className="relative aspect-[16/10] min-w-[900px] overflow-hidden bg-[#f3f2ed] bg-cover bg-center" style={bg ? { backgroundImage: `url(${bg})` } : undefined}>
          {children}
        </div>
      </div>
    </figure>
  );
}

function BootScreen() {
  const [take, replay] = useTake();
  return (
    <Screen code="S01" title="Boot" note="First load. The mark builds, the name decodes, the world loads, then Enter." onReplay={replay}>
      <Stage key={take} motion className="absolute inset-0">
        {(run) => (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Mark size={150} motion={run} />
            <p className="mt-8 text-[40px] font-semibold leading-none tracking-tight">
              <Decode text={profile.name} run={run} delay={750} dur={500} />
            </p>
            <p className={`font-mono mt-3 text-[13px] text-[#5d5d58]`}>
              <Decode text={`HG-08 · ${profile.role} · ${profile.location}`} run={run} delay={1000} dur={600} />
            </p>
            <div className="mt-10 w-[320px]">
              <div className={`font-mono mb-1.5 flex justify-between text-[12px]`}>
                <span className="dsa-rise" style={d(1100)}>
                  Loading the island
                </span>
                <Count value="100%" run={run} delay={1150} dur={1500} />
              </div>
              <div className="h-[6px] border border-[#111]">
                <span className="dsa-x block h-full bg-[#111]" style={{ ...d(1150), animationDuration: "1.5s" }} />
              </div>
            </div>
            <p className="dsa-flicker mt-8 flex items-center gap-2.5 text-[15px]" style={d(2750)}>
              Press <span className="x-key">Enter</span> to drive
            </p>
            <span className={`font-mono dsa-rise absolute bottom-4 left-5 text-[12px] text-[#5d5d58]`} style={d(1200)}>
              {profile.coords}
            </span>
            <span className={`font-mono dsa-rise absolute bottom-4 right-5 text-[12px] text-[#5d5d58]`} style={d(1200)}>
              Rev 2026.10
            </span>
          </div>
        )}
      </Stage>
    </Screen>
  );
}

function HudScreen() {
  const [take, replay] = useTake();
  const z = zones[1];
  const line = radioText(radioLines[z.id] ?? "");
  const tabs: [string, string][] = [
    ["M", "Map"],
    ["", "Controls"],
    ["", "Settings"],
    ["", "Sound"],
  ];
  return (
    <Screen code="S02" title="Driving" note={`Pulling up at ${z.label}: radio, zone label, a toast, the tabs and the speed.`} onReplay={replay} bg="/img/design/day.jpg">
      <Stage key={take} motion className="absolute inset-0">
        {(run) => (
          <>
            {/* radio, top left */}
            <div className="dsa-frame absolute left-5 top-5 w-[340px] border-2 border-[#111] bg-white" style={d(300)}>
              <div className={`font-mono flex items-center justify-between bg-[#111] px-3 py-1.5 text-[11.5px] text-white`}>
                <span>RADIO · Race engineer</span>
                <span className="flex h-3 items-end gap-[2px]">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className="x-wave block w-[3px] bg-[#ff4f00]" style={{ height: 12, animationDelay: `${i * 90}ms` }} />
                  ))}
                </span>
              </div>
              <p className="px-3 py-2.5 text-[14px] leading-relaxed">
                <Decode text={line} run={run} delay={600} dur={1800} />
              </p>
            </div>
            {/* edge tabs, top right */}
            <div className="absolute right-5 top-5 flex gap-2">
              {tabs.map(([k, t], i) => (
                <span key={t} className="dsa-rise flex items-center gap-2 border-2 border-[#111] bg-white px-2.5 py-1.5 text-[13px] font-medium shadow-[3px_3px_0_#111]" style={d(100 + i * 60)}>
                  {k && <span className={`font-mono bg-[#111] px-1.5 text-[11px] text-white`}>{k}</span>}
                  {t}
                </span>
              ))}
              <span className="dsa-rise flex items-center border-2 border-[#111] bg-[#111] px-2.5 py-1.5 text-[13px] font-medium text-white shadow-[3px_3px_0_#ff4f00]" style={d(340)}>
                Resume ↗
              </span>
            </div>
            {/* toast, top centre */}
            <div className="absolute left-1/2 top-24 -translate-x-1/2">
              <div className="dsa-flicker border-2 border-[#111] bg-white shadow-[3px_3px_0_#111]" style={d(1700)}>
                <div className="flex items-center gap-2.5 px-3 py-1.5">
                  <span className="grid h-6 w-6 place-items-center bg-[#ff4f00] text-[12px] font-bold text-white">✓</span>
                  <span className="text-[14px] font-semibold">{ACHIEVEMENTS[0].name}</span>
                  <span className="text-[12.5px] text-[#5d5d58]">{ACHIEVEMENTS[0].how}</span>
                </div>
              </div>
            </div>
            {/* zone label, bottom centre */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <div className="dsa-flicker inline-flex items-stretch border-2 border-[#111] bg-white shadow-[4px_4px_0_#111]" style={d(900)}>
                <span className={`font-mono grid place-items-center bg-[#111] px-3.5 text-[16px] font-semibold text-white`}>E</span>
                <div className="px-4 py-2">
                  <p className={`font-mono flex items-center gap-1.5 text-[11.5px] text-[#5d5d58]`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff4f00]" /> <Decode text={`Z${pad(2)} · ${z.label}`} run={run} delay={1050} />
                  </p>
                  <p className="text-[17px] font-semibold">{story[1].title}</p>
                </div>
              </div>
            </div>
            {/* speed, bottom left */}
            <div className="dsa-rise absolute bottom-6 left-6 border-2 border-[#111] bg-white px-3 py-2 shadow-[3px_3px_0_#111]" style={d(200)}>
              <p className={`font-mono text-[40px] font-semibold leading-none`}>
                <Count value="42" run={run} delay={200} dur={900} />
              </p>
              <p className={`font-mono mt-1 text-[11px] text-[#5d5d58]`}>km/h · Sector {story[1].lap}</p>
            </div>
          </>
        )}
      </Stage>
    </Screen>
  );
}

function GarageScreen() {
  const [take, replay] = useTake();
  const [i, setI] = useState(0);
  const domain = DOMAINS.find((x) => x.id === projects[i].domain)!.label;
  return (
    <Screen code="S03" title="Garage" note="The project sheet over the garage. ← → or the footer steps through projects; each one boots in." onReplay={replay} bg="/img/design/night.jpg">
      <div className="absolute inset-0 bg-[#111]/35" />
      <div className="absolute left-6 top-6">
        <div className="inline-flex items-stretch border-2 border-[#111] bg-white shadow-[4px_4px_0_#111]">
          <span className={`font-mono grid place-items-center bg-[#111] px-3 text-[13px] text-white`}>Esc</span>
          <div className="px-3 py-1.5">
            <p className={`font-mono text-[11px] text-[#5d5d58]`}>Garage</p>
            <p className="text-[14px] font-semibold">{domain}</p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-6 right-6 top-6 w-[66%] overflow-y-auto">
        <DsCard key={`${take}-${i}`} index={i} motion onNav={(dir) => setI((x) => (x + dir + projects.length) % projects.length)} />
      </div>
    </Screen>
  );
}

function MapScreen() {
  const [take, replay] = useTake();
  const ref = gridRef;
  const me = zones[1];
  // on the track just before the zone, looking down the track
  const meT = sectorT(1) - 0.012;
  const mp = trackPoint(meT);
  const mt = trackTangent(meT);
  const [mx, mz] = [mp.x, mp.z];
  const goal = zones.findIndex((z) => z.id === "podium");
  const g = zones[goal];
  const dist = Math.round(Math.hypot(g.pos[0] - mx, g.pos[1] - mz));
  const fwd = (Math.atan2(mt.z, mt.x) * 180) / Math.PI;
  return (
    <Screen code="S04" title="Map" note="M opens it. A tactical map of the real island: grid references, buildings, the objective pinging, you and where you are looking." onReplay={replay} bg="/img/design/day.jpg">
      <div className="absolute inset-0 bg-[#111]/40" />
      <Stage key={take} motion className="absolute inset-5">
        {(run) => (
          <div className="dsa-frame flex h-full flex-col border-2 border-[#111] bg-[#f3f2ed]" style={d(0)}>
            <div className={`font-mono relative flex items-center gap-4 px-4 py-2 text-[12px] text-white`}>
              <span className="dsa-x absolute inset-0 bg-[#111]" style={d(120)} />
              <span className="relative">
                <Decode text="HG-08 / MAP · The island" run={run} delay={250} />
              </span>
              <span className="relative ml-auto flex items-center gap-1.5 text-white/70">
                <span className="x-blink h-1.5 w-1.5 rounded-full bg-[#ff4f00]" /> Live
              </span>
              <span className="relative flex items-center gap-2">
                <span className="bg-white px-1.5 text-[#111]">Esc</span> Close
              </span>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-[1fr_300px]">
              <div className="relative min-h-0 overflow-hidden border-r-2 border-[#111] bg-[#e9e7e0]">
                <TacticalMap player={{ x: mx, z: mz, deg: fwd }} found={zones.slice(0, 4).map((z) => z.id)} objective="podium" className="absolute inset-0 h-full w-full" />
                <span className="dsa-scan pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-[#ff4f00]" style={d(150)} />
                <Compass />
              </div>

              <div className="min-h-0 overflow-y-auto bg-white p-4 text-[13px]">
                <h4 className="mb-2 flex items-baseline gap-3 border-b border-[#111] pb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em]">
                  <span className={`font-mono text-[#ff4f00]`}>1</span> Position
                </h4>
                {(
                  [
                    ["You", `${me.label} · ${ref(mx, mz)}`],
                    ["Objective", `${g.label} · ${ref(g.pos[0], g.pos[1])}`],
                    ["Distance", `${dist} m`],
                  ] as const
                ).map(([k, v], i) => (
                  <div key={k} className="dsa-wipe flex justify-between gap-3 border-b border-[#cfcdc4] py-1.5" style={d(500 + i * 70)}>
                    <span className="text-[#5d5d58]">{k}</span>
                    <span className={`font-mono font-semibold`}>
                      {k === "Distance" ? <Count value={v} run={run} delay={600} /> : v}
                    </span>
                  </div>
                ))}
                <h4 className="mb-2 mt-5 flex items-baseline gap-3 border-b border-[#111] pb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em]">
                  <span className={`font-mono text-[#ff4f00]`}>2</span> Legend
                </h4>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]">
                  {(
                    [
                      [<span key="t" className="h-2.5 w-5 border border-[#111] bg-[#c9c6bd]" />, "Track, pit lane"],
                      [<span key="b" className="h-3 w-3 bg-[#111]/80" />, "Building"],
                      [<span key="z" className={`font-mono border border-[#111] px-0.5 text-[9px] font-semibold`}>Z</span>, "Zone"],
                      [<span key="o" className="h-3 w-3 rounded-full border-2 border-[#ff4f00]" />, "Objective"],
                      [<span key="y" className="h-0 w-0 border-y-[5px] border-l-[9px] border-y-transparent border-l-[#ff4f00]" />, "You"],
                      [<span key="s" className="h-3 w-1 bg-[#ff4f00]" />, "Start line"],
                    ] as const
                  ).map(([icon, t]) => (
                    <span key={t} className="flex items-center gap-2">
                      <span className="grid w-5 place-items-center">{icon}</span>
                      {t}
                    </span>
                  ))}
                </div>
                <h4 className="mb-1 mt-5 flex items-baseline gap-3 border-b border-[#111] pb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em]">
                  <span className={`font-mono text-[#ff4f00]`}>3</span> Achievements
                  <span className={`font-mono ml-auto text-[11.5px] font-normal normal-case text-[#5d5d58]`}>
                    <Count value="3" run={run} delay={500} /> / {ACHIEVEMENTS.length}
                  </span>
                </h4>
                {ACHIEVEMENTS.slice(0, 6).map((a, k) => {
                  const got = k < 3; // example state for the mock-up
                  return (
                    <div key={a.id} className="dsa-wipe grid grid-cols-[30px_1fr_10px] items-center gap-2 border-b border-[#cfcdc4] py-1" style={d(700 + k * 60)}>
                      <span className={`font-mono text-[11px] text-[#5d5d58]`}>A{pad(k + 1)}</span>
                      <span className="min-w-0">
                        <span className={`block truncate font-medium ${got ? "" : "text-[#5d5d58]"}`}>{got ? a.name : "• • • • •"}</span>
                        <span className="block truncate text-[11.5px] text-[#5d5d58]">{a.how}</span>
                      </span>
                      <span className={`h-2 w-2 rounded-full ${got ? "bg-[#ff4f00]" : "border border-[#111]"}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Stage>
    </Screen>
  );
}

function NotFoundScreen() {
  const [take, replay] = useTake();
  return (
    <Screen code="S06" title="404" note="The same voice as the radio, same structure as everything else." onReplay={replay}>
      <Stage key={take} motion className="absolute inset-0">
        {(run) => (
          <div className="absolute inset-0 grid place-items-center">
            <div className="dsa-frame w-[520px] border-2 border-[#111] bg-white" style={d(0)}>
              <div className={`font-mono relative flex justify-between px-4 py-2 text-[12px] text-white`}>
                <span className="dsa-x absolute inset-0 bg-[#111]" style={d(100)} />
                <span className="relative">
                  <Decode text="E404 · Off track" run={run} delay={250} />
                </span>
                <span className="relative">HG-08</span>
              </div>
              <div className="flex items-start gap-5 p-6">
                <Mark size={64} />
                <div>
                  <p className="text-[30px] font-semibold leading-none tracking-tight">
                    <Decode text="Track limits" run={run} delay={350} />
                  </p>
                  <p className="dsa-rise mt-2 text-[15px] text-[#5d5d58]" style={d(600)}>
                    You went off the island. Lap time deleted.
                  </p>
                  <a href="#screens" className="x-sel x-btn x-primary dsa-rise mt-5" style={d(800)}>
                    <Corners />
                    Back to the island <span className="x-arrow">→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </Stage>
    </Screen>
  );
}

function Screens() {
  const [take, replay] = useTake();
  return (
    <Section id="screens" n="04" title="The portfolio" intro="The real screens, built only from the pieces above, with the real content. The world behind them stays exactly as it is.">
      <BootScreen />
      <HudScreen />
      <GarageScreen />
      <MapScreen />
      <figure className="mb-10">
        <figcaption className="mb-2 flex flex-wrap items-baseline gap-x-3">
          <span className={`font-mono text-[13px] text-[#ff4f00]`}>S05</span>
          <span className="text-[13px] font-semibold uppercase tracking-[0.06em]">Resume</span>
          <span className="text-[13px] text-[#5d5d58]">/resume, first page. Prints as plain ink on white.</span>
          <span className="ml-auto">
            <Replay onClick={replay} />
          </span>
        </figcaption>
        <div className="max-w-[820px]">
          <DsResume key={take} motion />
        </div>
      </figure>
      <NotFoundScreen />
    </Section>
  );
}

/* ------------------------------------------------------------------ page */

export default function System() {
  const [take, replay] = useTake();
  return (
    <main className="min-h-screen bg-[#f3f2ed] pb-24 text-[#111]">
      <header className="sticky top-0 z-30 border-b-2 border-[#111] bg-[#f3f2ed]">
        <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-4 py-2.5 sm:px-8">
          <button type="button" onClick={replay} title="Replay the mark">
            <Lockup key={take} size={17} name={profile.name} motion />
          </button>
          <span className={`font-mono hidden text-[12px] text-[#5d5d58] sm:inline`}>HG-08 · Design system</span>
          <nav className="ml-auto hidden items-center gap-5 text-[14px] md:flex">
            {[
              ["01", "Identity", "#identity"],
              ["02", "Motion", "#motion"],
              ["03", "Interactions", "#interactions"],
              ["04", "Portfolio", "#screens"],
            ].map(([n, t, h]) => (
              <a key={h} href={h} className="x-link">
                <span className={`font-mono mr-1 text-[11px] text-[#ff4f00]`}>{n}</span>
                {t}
              </a>
            ))}
          </nav>
          <Link href="/docs/brand/logo/motion" className={`font-mono ml-auto text-[12px] text-[#5d5d58] hover:text-[#111] md:ml-0`}>
            Logo ↗
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-[1180px] px-4 sm:px-8">
        <div className="pt-12 sm:pt-16">
          <p className={`font-mono text-[12px] text-[#5d5d58]`}>HG-08 · Rev 2026.10 · Approved 2026-10-25</p>
          <h1 className="mt-2 max-w-3xl text-[40px] font-semibold leading-[1.02] tracking-tight sm:text-[64px]">
            The portfolio, in its own language<span className="text-[#ff4f00]">.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-[#5d5d58]">
            How every screen, component and moment of motion looks once the Datasheet identity lands. This page is the reference the real UI gets built from.
          </p>
        </div>
        <Identity />
        <MotionSection />
        <Interactions />
        <Screens />
      </div>
    </main>
  );
}
