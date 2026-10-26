// Three brand directions, round two. Each is its own system (structure, graphic device,
// voice, type and colour), not a recolour of one layout, and each is shown on the same real
// content from content/*: the mark, one project card, the resume and an in-world label.
import Link from "next/link";
import type { ReactNode } from "react";
import { profile, stats } from "@/content/profile";
import { experience } from "@/content/experience";
import { DOMAINS, projects } from "@/content/projects";

const P = projects.find((p) => p.slug === "rtl-coverage-agents")!;
const PI = projects.indexOf(P);
const PREV = projects[(PI + projects.length - 1) % projects.length];
const NEXT = projects[(PI + 1) % projects.length];
const DOMAIN = DOMAINS.find((d) => d.id === P.domain)!.label;
const ROLE = experience[0];
const LINKS = [
  ["Email", profile.email, `mailto:${profile.email}`],
  ["LinkedIn", "in/henilgajjar", profile.links.linkedin],
  ["GitHub", "Henil-08", profile.links.github],
  ["Scholar", "Google Scholar", profile.links.scholar],
] as const;
const pad = (n: number) => String(n).padStart(2, "0");

/** The project's numbers as a spec table; every row is a figure from its points in content/projects.ts. */
const SPECS: [string, string][] = [
  ["Agents", "7"],
  ["Functional coverage", "100%"],
  ["Cycles to close", "43"],
  ["Iterations", "3"],
  ["Planted bugs caught", "10 / 10"],
];

// Figures inside a sentence (44.9%, 20K+, <1s, 10) get picked out so a skim finds them.
const NUM = /((?<![\w./])<?\d[\d.,]*(?:%|x|ms|K|B|TB|h)?\+?)/g;
function Figures({ text, className }: { text: string; className: string }) {
  return text.split(NUM).map((s, i) =>
    i % 2 ? (
      <span key={i} className={className}>
        {s}
      </span>
    ) : (
      s
    ),
  );
}

// Role dates ("Jan 2026 – Present") as decimal years, for the stint chart.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NOW = 2026 + 10 / 12;
function span(dates: string): [number, number] {
  const [a, b] = dates.split(/\s+[–-]\s+/);
  const at = (s: string) => {
    const [m, y] = s.split(" ");
    return +y + MONTHS.indexOf(m) / 12;
  };
  return [at(a), b === "Present" ? NOW : at(b) + 1 / 12];
}

export default function Brand() {
  return (
    <main className="min-h-screen bg-[#e7e6e2] text-[#141414]">
      <header className="mx-auto max-w-[1180px] px-4 pb-10 pt-10 sm:px-8 sm:pt-14" style={{ fontFamily: "var(--b-inter-tight)" }}>
        <Link href="/" className="text-[13px] text-[#141414]/60 hover:text-[#141414]">
          ← Back to the island
        </Link>
        <h1 className="mt-6 max-w-3xl text-[34px] font-semibold leading-[1.05] tracking-tight sm:text-[52px]">Brand directions, round two</h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[#141414]/70">
          Three different systems, not three colourways. Each one has its own idea, its own way of laying out a project, its own resume and its own graphic device. Every word and number
          below is real, from the resume and the old portfolio.
        </p>
        <nav className="mt-6 flex flex-wrap gap-2 text-[14px]">
          {[
            ["1", "Datasheet", "#datasheet"],
            ["2", "Trace", "#trace"],
            ["3", "Casebook", "#casebook"],
          ].map(([n, t, h]) => (
            <a key={h} href={h} className="rounded-full border border-[#141414]/20 bg-white/60 px-4 py-1.5 transition hover:border-[#141414] hover:bg-white">
              <span className="text-[#141414]/45">{n}</span> {t}
            </a>
          ))}
        </nav>
      </header>
      <Datasheet />
      <Trace />
      <Casebook />
      <footer className="mx-auto max-w-[1180px] px-4 py-10 text-[14px] text-[#141414]/60 sm:px-8" style={{ fontFamily: "var(--b-inter-tight)" }}>
        Pick one, or mix: the structure of one with the type or colour of another works too. Whatever you pick replaces the HUD, the garage card, the map, the boot and the resume.
      </footer>
    </main>
  );
}

/* ================================================================== 1 · DATASHEET */
// You as a part someone would design in. Structure comes from IC datasheets: a part number,
// numbered sections, a spec table, units on everything. Ink on paper, one orange.

const DS = { paper: "#f3f2ed", ink: "#111111", grey: "#5d5d58", rule: "#cfcdc4", orange: "#ff4f00" };
const dsMono = "[font-family:var(--b-plex-mono)]";

function ChipMark({ size = 56 }: { size?: number }) {
  const pins = [10, 22, 34, 46];
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden>
      {pins.map((p) => (
        <g key={p} fill={DS.ink}>
          <rect x={p - 2} y="0" width="4" height="7" />
          <rect x={p - 2} y="49" width="4" height="7" />
          <rect x="0" y={p - 2} width="7" height="4" />
          <rect x="49" y={p - 2} width="7" height="4" />
        </g>
      ))}
      <rect x="7" y="7" width="42" height="42" fill={DS.ink} />
      <circle cx="14" cy="14" r="2.4" fill={DS.orange} />
      <text x="28" y="35" textAnchor="middle" fill={DS.paper} fontFamily="var(--b-plex)" fontWeight="600" fontSize="17" letterSpacing="-0.5">
        HG
      </text>
    </svg>
  );
}

function DsHead({ n, children }: { n: string; children: ReactNode }) {
  return (
    <h4 className="mb-3 mt-7 flex items-baseline gap-3 border-b border-[#111] pb-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] first:mt-0">
      <span className={`${dsMono} text-[#ff4f00]`}>{n}</span>
      {children}
    </h4>
  );
}

function Datasheet() {
  return (
    <section id="datasheet" style={{ background: DS.paper, color: DS.ink, fontFamily: "var(--b-plex)" }} className="scroll-mt-4 px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[1180px]">
        {/* cover strip, the way a datasheet opens */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-[3px] border-[#111] pb-4">
          <div className="flex items-center gap-4">
            <ChipMark />
            <div>
              <p className={`${dsMono} text-[12px] text-[#5d5d58]`}>Direction 1</p>
              <h2 className="text-[34px] font-semibold leading-none tracking-tight sm:text-[44px]">Datasheet</h2>
            </div>
          </div>
          <p className={`${dsMono} text-right text-[12px] leading-relaxed text-[#5d5d58]`}>
            HG-26 · AI/ML engineer
            <br />
            Rev 2026.10 · Boston, MA
          </p>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4 text-[16px] leading-relaxed">
            <p>
              <b>The idea.</b> You work where silicon meets models: an ECE degree, RTL verification agents, Verilog models, a car that steered itself. So the identity treats you like
              a part an engineer would design in. Every page is a datasheet: a part number, numbered sections, a spec table, units on every claim.
            </p>
            <p>
              <b>Why it reads well.</b> Engineers and recruiters already know how to skim a datasheet. The structure never changes, so after one card they know where the result, the
              stack and the links are on every other one.
            </p>
            <p>
              <b>Voice.</b> Short, declarative, measured. <span className="text-[#5d5d58]">&ldquo;Closed 100% coverage in 43 cycles.&rdquo; Not &ldquo;blazing fast agents&rdquo;.</span>
            </p>
          </div>
          <table className="w-full self-start border-t-2 border-[#111] text-[14px]">
            <tbody>
              {[
                ["Paper", DS.paper, "Background, everywhere"],
                ["Ink", DS.ink, "Text, rules, the mark"],
                ["Graphite", DS.grey, "Secondary text"],
                ["Rule", DS.rule, "Table lines"],
                ["Signal orange", DS.orange, "Section numbers, one status dot"],
              ].map(([n, c, u]) => (
                <tr key={n} className="border-b border-[#cfcdc4]">
                  <td className="w-8 py-2">
                    <span className="block h-5 w-5 border border-[#111]/30" style={{ background: c }} />
                  </td>
                  <td className="py-2 font-medium">{n}</td>
                  <td className={`${dsMono} py-2 text-[12.5px] text-[#5d5d58]`}>{c}</td>
                  <td className="hidden py-2 text-[#5d5d58] sm:table-cell">{u}</td>
                </tr>
              ))}
              <tr className="border-b border-[#cfcdc4]">
                <td />
                <td className="py-2 font-medium">Type</td>
                <td colSpan={2} className="py-2 text-[#5d5d58]">
                  IBM Plex Sans for everything, <span className={dsMono}>IBM Plex Mono</span> for part numbers and values
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ---------------- project card: one datasheet page */}
        <p className={`${dsMono} mb-3 mt-16 text-[12px] uppercase tracking-[0.1em] text-[#5d5d58]`}>Project card (the garage, the map and the site)</p>
        <article className="border-2 border-[#111] bg-white">
          <div className={`${dsMono} flex flex-wrap justify-between gap-x-6 gap-y-1 bg-[#111] px-4 py-2 text-[12px] text-[#f3f2ed]`}>
            <span>HG-26 / P{pad(PI + 1)}</span>
            <span className="text-[#f3f2ed]/60">{DOMAIN}</span>
            <span>Project datasheet</span>
          </div>
          <div className="grid md:grid-cols-[1.45fr_1fr]">
            <div className="border-[#111] p-5 sm:p-7 md:border-r-2">
              <h3 className="text-[30px] font-semibold leading-tight tracking-tight sm:text-[38px]">{P.name}</h3>
              <p className="mt-1 text-[17px] text-[#5d5d58]">{P.tagline}</p>
              <div className="mt-7">
                <DsHead n="1">Features</DsHead>
                <ul className="space-y-2.5 text-[15px] leading-relaxed">
                  {P.points.map((t) => (
                    <li key={t} className="grid grid-cols-[14px_1fr] gap-2">
                      <span className="mt-[0.55em] h-[7px] w-[7px] bg-[#111]" />
                      <span>
                        <Figures text={t} className="font-semibold" />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="border-t-2 border-[#111] p-5 sm:p-7 md:border-t-0">
              <DsHead n="2">Key specifications</DsHead>
              <table className="w-full text-[14.5px]">
                <tbody>
                  {SPECS.map(([k, v]) => (
                    <tr key={k} className="border-b border-[#cfcdc4]">
                      <td className="py-2 pr-3 text-[#5d5d58]">{k}</td>
                      <td className={`${dsMono} py-2 text-right text-[16px] font-semibold`}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <DsHead n="3">Built with</DsHead>
              {/* the stack hangs off one bus line, like a block diagram */}
              <div className="border-t-2 border-[#111]">
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {P.stack.map((s) => (
                    <span key={s} className={`${dsMono} relative mt-3 border border-[#111] px-2 py-1 text-[12.5px] before:absolute before:-top-[13px] before:left-1/2 before:h-3 before:w-px before:bg-[#111]`}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <DsHead n="4">Source</DsHead>
              {P.links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="group flex items-center justify-between border-b border-[#cfcdc4] py-2 text-[14.5px] hover:border-[#111]">
                  <span className="font-medium">{l.label}</span>
                  <span className={`${dsMono} text-[12.5px] text-[#5d5d58] group-hover:text-[#ff4f00]`}>{l.href.replace("https://", "")} ↗</span>
                </a>
              ))}
            </div>
          </div>
          <div className={`${dsMono} flex justify-between gap-4 border-t-2 border-[#111] px-4 py-2 text-[12px] text-[#5d5d58]`}>
            <span className="truncate">← {PREV.name}</span>
            <span className="shrink-0">
              {pad(PI + 1)} / {projects.length}
            </span>
            <span className="truncate text-right">{NEXT.name} →</span>
          </div>
        </article>

        {/* ---------------- resume + in-world label */}
        <div className="mt-16 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <p className={`${dsMono} mb-3 text-[12px] uppercase tracking-[0.1em] text-[#5d5d58]`}>Resume (first page)</p>
            <div className="border-2 border-[#111] bg-white p-5 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b-[3px] border-[#111] pb-4">
                <div>
                  <h3 className="text-[32px] font-semibold leading-none tracking-tight">{profile.name}</h3>
                  <p className="mt-2 text-[15px]">
                    {profile.role}, {profile.company}
                  </p>
                </div>
                <dl className={`${dsMono} grid grid-cols-[auto_auto] gap-x-3 text-[12px] leading-[1.7]`}>
                  {LINKS.map(([k, v, h]) => (
                    <div key={k} className="contents">
                      <dt className="text-[#5d5d58]">{k}</dt>
                      <dd>
                        <a href={h} className="hover:text-[#ff4f00]">
                          {v}
                        </a>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="grid grid-cols-2 border-b border-[#111] sm:grid-cols-5">
                {stats.map((s) => (
                  <div key={s.label} className="border-b border-[#cfcdc4] py-3 pr-2 sm:border-b-0">
                    <p className={`${dsMono} text-[20px] font-semibold`}>{s.value}</p>
                    <p className="text-[12px] leading-tight text-[#5d5d58]">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-7">
                <DsHead n="1">Experience</DsHead>
              </div>
              {experience.slice(0, 2).map((r) => (
                <div key={r.title} className="grid gap-x-6 border-b border-[#cfcdc4] py-3 sm:grid-cols-[130px_1fr]">
                  <p className={`${dsMono} text-[12px] leading-6 text-[#5d5d58]`}>{r.dates}</p>
                  <div>
                    <p className="text-[15px] font-semibold">
                      {r.title} <span className="font-normal text-[#5d5d58]">· {r.company}</span>
                    </p>
                    <ul className="mt-1.5 space-y-1 text-[14px] leading-relaxed">
                      {r.points.slice(0, 3).map((t) => (
                        <li key={t} className="grid grid-cols-[12px_1fr] gap-1.5">
                          <span className="mt-[0.6em] h-[5px] w-[5px] bg-[#111]" />
                          <span>
                            <Figures text={t} className="font-semibold" />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className={`${dsMono} mb-3 text-[12px] uppercase tracking-[0.1em] text-[#5d5d58]`}>In the world: a zone label</p>
            <div className="bg-[#7d8a3a] p-6">
              <div className="inline-flex items-stretch border-2 border-[#111] bg-white shadow-[4px_4px_0_#111]">
                <span className={`${dsMono} grid place-items-center bg-[#111] px-3 text-[14px] font-semibold text-white`}>E</span>
                <div className="px-3 py-2">
                  <p className={`${dsMono} flex items-center gap-1.5 text-[11px] text-[#5d5d58]`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff4f00]" /> Z03 · Garage
                  </p>
                  <p className="text-[15px] font-semibold">{projects.length} projects</p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-[#5d5d58]">
              Labels in the world look like parts stickers: white, a hard black edge, the key on a black tab. Map pins become zone codes (Z01 Pit wall, Z03 Garage).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== 2 · TRACE */
// One continuous line. Every project is a run that ends in a measured result; the career is
// a stint chart. Carbon, white, and one lime trace colour, like a scope or a telemetry screen.

const TR = { bg: "#0b0c0e", panel: "#131519", line: "#25282e", text: "#ecebe6", mute: "#8d929b", lime: "#c9f23f" };
const trMono = "[font-family:var(--b-jetbrains)]";

function TraceMark({ w = 120 }: { w?: number }) {
  // an H drawn as one stroke, then the line runs on as a trace
  return (
    <svg width={w} height={w * 0.4} viewBox="0 0 120 48" aria-hidden fill="none">
      <path d="M2 40 H14 V8 V40 V24 H34 V8 V40 H58 L66 16 L74 32 L82 22 H118" stroke={TR.lime} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Trace() {
  const roles = experience.map((r) => ({ ...r, at: span(r.dates) }));
  const y0 = 2021;
  const y1 = 2027;
  const x = (y: number) => ((y - y0) / (y1 - y0)) * 100;
  return (
    <section id="trace" style={{ background: TR.bg, color: TR.text, fontFamily: "var(--b-archivo)" }} className="scroll-mt-4 px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <TraceMark />
          <div>
            <p className={`${trMono} text-[12px] text-[#8d929b]`}>Direction 2</p>
            <h2 className="text-[40px] font-bold leading-none tracking-tight sm:text-[54px]" style={{ fontStretch: "118%" }}>
              Trace
            </h2>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4 text-[16px] leading-relaxed text-[#ecebe6]/85">
            <p>
              <b className="text-[#ecebe6]">The idea.</b> You started by getting a car to drive itself, and you still love watching a team react to data in real time. Everything here
              is a run with a measured result. The device is one lime line that keeps going: through the mark, through each project from first step to finish, through the career as a
              stint chart.
            </p>
            <p>
              <b className="text-[#ecebe6]">Why it reads well.</b> It is ordered in time, so it tells the story without extra words, and the result always sits at the end of the line.
              Dark, but high contrast plain type, no glows or textures.
            </p>
            <p>
              <b className="text-[#ecebe6]">Voice.</b> Engineer on the radio: present tense, numbers first.{" "}
              <span className="text-[#8d929b]">&ldquo;Coverage closed. 43 cycles, 3 iterations.&rdquo;</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px self-start bg-[#25282e] sm:grid-cols-3">
            {[
              ["Carbon", TR.bg],
              ["Panel", TR.panel],
              ["Line", TR.line],
              ["White", TR.text],
              ["Mute", TR.mute],
              ["Trace", TR.lime],
            ].map(([n, c]) => (
              <div key={n} className="bg-[#0b0c0e] p-3">
                <span className="block h-10 border border-white/10" style={{ background: c }} />
                <p className="mt-2 text-[14px] font-semibold">{n}</p>
                <p className={`${trMono} text-[12px] text-[#8d929b]`}>{c}</p>
              </div>
            ))}
            <div className="col-span-2 bg-[#0b0c0e] p-3 sm:col-span-3">
              <p className="text-[14px]">
                <span style={{ fontStretch: "118%" }} className="font-bold">
                  Archivo
                </span>{" "}
                wide for headings, normal width for text. <span className={trMono}>JetBrains Mono</span> for steps and values.
              </p>
            </div>
          </div>
        </div>

        {/* ---------------- project card: a run */}
        <p className={`${trMono} mb-3 mt-16 text-[12px] uppercase tracking-[0.1em] text-[#8d929b]`}>Project card (the garage, the map and the site)</p>
        <article className="grid overflow-hidden rounded-[10px] border border-[#25282e] bg-[#131519] md:grid-cols-[360px_1fr]">
          <div className="flex flex-col border-b border-[#25282e] p-6 sm:p-8 md:border-b-0 md:border-r">
            <p className={`${trMono} text-[12px] text-[#8d929b]`}>
              {pad(PI + 1)} · {DOMAIN}
            </p>
            <h3 className="mt-3 text-[32px] font-bold leading-[1.05] tracking-tight" style={{ fontStretch: "112%" }}>
              {P.name}
            </h3>
            <p className="mt-2 text-[16px] text-[#ecebe6]/75">{P.tagline}</p>
            <div className="mt-8 border-l-2 border-[#c9f23f] pl-4">
              <p className="text-[48px] font-bold leading-none tracking-tight text-[#c9f23f]" style={{ fontStretch: "112%" }}>
                {P.headline.value}
              </p>
              <p className="mt-1 text-[14px] text-[#8d929b]">{P.headline.label}</p>
            </div>
            <div className="mt-8 md:mt-auto md:pt-8">
              <p className={`${trMono} mb-2 text-[11px] uppercase tracking-[0.1em] text-[#8d929b]`}>Stack</p>
              <p className="text-[14px] leading-relaxed text-[#ecebe6]/85">{P.stack.join(" · ")}</p>
              <div className="mt-5 flex gap-2">
                {P.links.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="rounded-full bg-[#c9f23f] px-4 py-1.5 text-[14px] font-semibold text-[#0b0c0e] transition hover:bg-white">
                    {l.label} ↗
                  </a>
                ))}
              </div>
            </div>
          </div>
          <ol className="relative p-6 sm:p-8">
            {P.points.map((t, i) => (
              <li key={t} className="group relative grid grid-cols-[36px_1fr] gap-3 pb-6 last:pb-0">
                {/* the trace: a line from step to step, the last step filled as the finish */}
                {i < P.points.length - 1 && <span className="absolute bottom-0 left-[11px] top-6 w-[2px] bg-[#c9f23f]/70" />}
                <span
                  className={`relative z-10 mt-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-[#c9f23f] text-[10px] ${trMono} ${i === P.points.length - 1 ? "bg-[#c9f23f] text-[#0b0c0e]" : "bg-[#131519] text-[#c9f23f]"}`}
                >
                  {i + 1}
                </span>
                <p className="text-[15.5px] leading-relaxed text-[#ecebe6]/85 transition group-hover:text-[#ecebe6]">
                  <Figures text={t} className="font-semibold text-[#ecebe6]" />
                </p>
              </li>
            ))}
          </ol>
        </article>

        {/* ---------------- resume: a stint chart, then the detail */}
        <div className="mt-16 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <p className={`${trMono} mb-3 text-[12px] uppercase tracking-[0.1em] text-[#8d929b]`}>Resume (first page)</p>
            <div className="rounded-[10px] border border-[#25282e] bg-[#131519] p-5 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 className="text-[34px] font-bold leading-none tracking-tight" style={{ fontStretch: "118%" }}>
                    {profile.name}
                  </h3>
                  <p className="mt-2 text-[15px] text-[#ecebe6]/80">
                    {profile.role}, {profile.company} · {profile.location}
                  </p>
                </div>
                <p className="flex flex-wrap gap-x-4 text-[14px]">
                  {LINKS.map(([k, , h]) => (
                    <a key={k} href={h} className="text-[#ecebe6]/80 underline decoration-[#c9f23f] underline-offset-4 hover:text-[#c9f23f]">
                      {k}
                    </a>
                  ))}
                </p>
              </div>
              <div className="mt-7">
                <div className="grid grid-cols-[34%_1fr] sm:grid-cols-[30%_1fr]">
                  <span />
                  <div className={`${trMono} relative mb-1 h-4 text-[11px] text-[#8d929b]`}>
                    {[2021, 2022, 2023, 2024, 2025, 2026].map((y) => (
                      <span key={y} className="absolute -translate-x-1/2" style={{ left: `${x(y + 0.5)}%` }}>
                        &rsquo;{String(y).slice(2)}
                      </span>
                    ))}
                  </div>
                </div>
                {roles.map((r) => {
                  const main = r.kind === "Full time" || r.kind === "Founding team";
                  return (
                    <div key={r.company + r.title} className="group grid grid-cols-[34%_1fr] items-center border-t border-[#25282e] py-1.5 sm:grid-cols-[30%_1fr]">
                      <p className="truncate pr-3 text-[13px] text-[#ecebe6]/80 group-hover:text-[#ecebe6]">
                        {r.company}
                      </p>
                      <div className="relative h-3">
                        <span
                          className={`absolute top-0 h-3 rounded-full transition group-hover:brightness-125 ${main ? "bg-[#c9f23f]" : "bg-[#ecebe6]/35"}`}
                          style={{ left: `${x(r.at[0])}%`, width: `${Math.max(1.2, x(r.at[1]) - x(r.at[0]))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-[#8d929b]">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-5 rounded-full bg-[#c9f23f]" /> Full time and founding
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-5 rounded-full bg-[#ecebe6]/35" /> Internships, teaching, research, teams
                  </span>
                </p>
              </div>
              <div className="mt-7 border-t border-[#25282e] pt-5">
                <p className={`${trMono} text-[12px] text-[#c9f23f]`}>{ROLE.dates}</p>
                <p className="mt-1 text-[16px] font-semibold">
                  {ROLE.title} · <span className="font-normal text-[#ecebe6]/75">{ROLE.company}</span>
                </p>
                <ul className="mt-2 space-y-1.5 text-[14px] leading-relaxed text-[#ecebe6]/80">
                  {ROLE.points.slice(0, 3).map((t) => (
                    <li key={t} className="relative pl-4 before:absolute before:left-0 before:top-[0.7em] before:h-[2px] before:w-2 before:bg-[#c9f23f]">
                      <Figures text={t} className="font-semibold text-[#ecebe6]" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div>
            <p className={`${trMono} mb-3 text-[12px] uppercase tracking-[0.1em] text-[#8d929b]`}>In the world: a zone label</p>
            <div className="bg-[#7d8a3a] p-6">
              <div className="inline-flex items-center gap-3 rounded-full bg-[#0b0c0e]/90 py-2 pl-2 pr-5 text-[#ecebe6]">
                <span className={`${trMono} grid h-7 w-7 place-items-center rounded-full bg-[#c9f23f] text-[13px] font-semibold text-[#0b0c0e]`}>E</span>
                <span className="text-[15px] font-semibold">Garage</span>
                <svg width="28" height="10" viewBox="0 0 28 10" aria-hidden fill="none">
                  <path d="M0 8 H8 L12 2 L16 7 L19 4 H28" stroke={TR.lime} strokeWidth="1.6" />
                </svg>
                <span className="text-[14px] text-[#8d929b]">{projects.length} projects</span>
              </div>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-[#8d929b]">
              Labels are dark pills with the lime key. The boot screen draws the trace mark left to right; the map draws the lap you just drove as the same lime line.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== 3 · CASEBOOK */
// Editorial. Each project is a case in a well-made engineering journal: serif headlines,
// a strict grid, the result as a pull figure in the margin. Warm white, ink, one cobalt.

const CB = { paper: "#faf8f3", ink: "#171717", mute: "#6d685f", rule: "#dcd6ca", cobalt: "#1f3fd1" };
const cbSans = "[font-family:var(--b-inter-tight)]";

function Casebook() {
  return (
    <section id="casebook" style={{ background: CB.paper, color: CB.ink, fontFamily: "var(--b-newsreader)" }} className="scroll-mt-4 px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[1180px]">
        <p className={`${cbSans} text-[12px] uppercase tracking-[0.14em] text-[#6d685f]`}>Direction 3 · Casebook</p>
        {/* the mark is the wordmark: the name in the serif, closed with a cobalt full stop */}
        <h2 className="mt-3 border-b border-[#171717] pb-6 text-[56px] font-medium leading-[0.95] tracking-[-0.02em] sm:text-[104px]">
          Henil Gajjar<span className="text-[#1f3fd1]">.</span>
        </h2>

        <div className="mt-8 grid gap-8 text-[17px] leading-relaxed md:grid-cols-3">
          <p>
            <span className={`${cbSans} mb-2 block text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1f3fd1]`}>The idea</span>
            You have a real story: first in your family to get a degree, a solar car, Shark Tank, a 4.0 in Boston, agents at Waters. A casebook lets each project read like a short,
            well-edited case: what it is, what you did, what it measured.
          </p>
          <p>
            <span className={`${cbSans} mb-2 block text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1f3fd1]`}>Why it reads well</span>
            It is the calmest of the three. Serif text at reading size, generous margins, one accent. It reads like a portfolio from someone senior, and prints like a good paper resume.
          </p>
          <div>
            <span className={`${cbSans} mb-2 block text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1f3fd1]`}>Type and colour</span>
            <p>
              Newsreader for headlines and text, <span className={cbSans}>Inter Tight</span> for labels.
            </p>
            <div className="mt-3 flex gap-2">
              {[CB.paper, CB.ink, CB.mute, CB.rule, CB.cobalt].map((c) => (
                <span key={c} title={c} className="h-9 flex-1 border border-[#171717]/15" style={{ background: c }} />
              ))}
            </div>
            <p className={`${cbSans} mt-1.5 text-[11px] text-[#6d685f]`}>Paper · Ink · Stone · Rule · Cobalt</p>
          </div>
        </div>

        {/* ---------------- project card: a case */}
        <p className={`${cbSans} mb-3 mt-16 text-[12px] uppercase tracking-[0.12em] text-[#6d685f]`}>Project card (the garage, the map and the site)</p>
        <article className="grid gap-x-10 border-t-[3px] border-[#171717] bg-white px-5 py-7 sm:px-9 sm:py-10 md:grid-cols-[230px_1fr]">
          <aside className="order-2 mt-8 md:order-1 md:mt-0">
            <p className={`${cbSans} text-[12px] uppercase tracking-[0.12em] text-[#6d685f]`}>Result</p>
            <p className="mt-1 text-[64px] font-medium leading-none tracking-tight text-[#1f3fd1]">{P.headline.value}</p>
            <p className="mt-1 text-[17px] italic text-[#6d685f]">{P.headline.label}</p>
            <dl className={`${cbSans} mt-8 text-[13.5px]`}>
              {[
                ["Field", DOMAIN],
                ["Stack", P.stack.join(", ")],
              ].map(([k, v]) => (
                <div key={k} className="border-t border-[#dcd6ca] py-2.5">
                  <dt className="text-[11px] uppercase tracking-[0.12em] text-[#6d685f]">{k}</dt>
                  <dd className="mt-0.5 leading-snug">{v}</dd>
                </div>
              ))}
              <div className="border-t border-[#dcd6ca] py-2.5">
                {P.links.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="font-semibold text-[#1f3fd1] underline-offset-4 hover:underline">
                    Read the code on {l.label} →
                  </a>
                ))}
              </div>
            </dl>
          </aside>
          <div className="order-1 md:order-2">
            <p className={`${cbSans} text-[12px] uppercase tracking-[0.12em] text-[#6d685f]`}>Case {pad(PI + 1)}</p>
            <h3 className="mt-2 text-[38px] font-medium leading-[1.05] tracking-[-0.01em] sm:text-[52px]">{P.name}</h3>
            <p className="mt-2 text-[21px] italic text-[#6d685f]">{P.tagline}.</p>
            <ol className="mt-7 space-y-4 text-[18px] leading-[1.55]">
              {P.points.map((t, i) => (
                <li key={t} className="grid grid-cols-[28px_1fr] gap-2 border-t border-[#dcd6ca] pt-4 first:border-t-0 first:pt-0">
                  <span className={`${cbSans} pt-1 text-[13px] font-semibold text-[#1f3fd1]`}>{i + 1}</span>
                  <span>
                    <Figures text={t} className="font-semibold" />
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </article>

        {/* ---------------- resume: margin labels, one column of text */}
        <div className="mt-16 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <p className={`${cbSans} mb-3 text-[12px] uppercase tracking-[0.12em] text-[#6d685f]`}>Resume (first page)</p>
            <div className="bg-white px-5 py-7 shadow-[0_1px_0_#dcd6ca,0_20px_40px_-24px_rgba(0,0,0,0.25)] sm:px-10 sm:py-10">
              <h3 className="text-[40px] font-medium leading-none tracking-[-0.01em]">
                {profile.name}
                <span className="text-[#1f3fd1]">.</span>
              </h3>
              <p className="mt-2 text-[17px] italic text-[#6d685f]">
                {profile.role} at {profile.company}, {profile.location}
              </p>
              <p className={`${cbSans} mt-3 flex flex-wrap gap-x-4 text-[13px]`}>
                {LINKS.map(([k, v, h]) => (
                  <a key={k} href={h} className="hover:text-[#1f3fd1]">
                    {k === "Email" ? v : k}
                  </a>
                ))}
              </p>
              <div className="mt-7 grid gap-x-6 gap-y-3 border-t border-[#171717] pt-4 sm:grid-cols-[110px_1fr]">
                <p className={`${cbSans} text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1f3fd1]`}>Experience</p>
                <div className="space-y-5">
                  {experience.slice(0, 2).map((r) => (
                    <div key={r.title}>
                      <p className="flex flex-wrap items-baseline justify-between gap-x-4 text-[17px]">
                        <span>
                          <b className="font-semibold">{r.title}</b>, {r.company}
                        </span>
                        <span className={`${cbSans} text-[12.5px] text-[#6d685f]`}>{r.dates}</span>
                      </p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[15.5px] leading-relaxed marker:text-[#1f3fd1]">
                        {r.points.slice(0, 3).map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className={`${cbSans} mb-3 text-[12px] uppercase tracking-[0.12em] text-[#6d685f]`}>In the world: a zone label</p>
            <div className="bg-[#7d8a3a] p-6">
              <div className="inline-block bg-[#faf8f3] px-4 py-3 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.45)]">
                <p className="text-[22px] font-medium leading-none">The Garage</p>
                <p className={`${cbSans} mt-1.5 text-[12.5px] text-[#6d685f]`}>
                  {projects.length} projects · press <span className="font-semibold text-[#1f3fd1]">E</span> to look around
                </p>
              </div>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-[#6d685f]">
              In the world, labels are small paper cards with a serif name. The map is drawn like the endpaper map of a book; the boot screen sets the name with its cobalt full stop.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
