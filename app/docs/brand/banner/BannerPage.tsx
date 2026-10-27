"use client";

// LinkedIn banner options (1584 x 396, LinkedIn's size) in the Datasheet language, plus headline
// options to try in each. `?export=A&t=3` draws one banner alone at full size for a PNG capture.
// LinkedIn puts the profile photo over the bottom left, so nothing important sits there.
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { profile } from "@/content/profile";
import { ATTENTION, Lockup, Mark } from "@/components/brand/mark";
import { TRACK_D } from "./track";

const W = 1584;
const H = 396;
const INK = "#111111";
const PAPER = "#f3f2ed";
const GRAPHITE = "#5d5d58";
const RULE = "#cfcdc4";
const ORANGE = "#ff4f00";

/** Headlines, first person, no claims beyond what's in content/*. */
const LINES = [
  "I build AI that makes life easier.",
  "AI that does the boring parts.",
  "I automate the annoying stuff.",
  "Less busywork. More done.",
  "I make AI useful, not loud.",
  "Shipping AI people actually use.",
  "From model to product.",
  "Making AI feel obvious.",
  "I code. The AI does the chores.",
  "Turning messy data into easy days.",
  "AI, but make it practical.",
  "Built to save you time.",
  "Giving models the context to be useful.",
  "Agents that do the work, not the demo.",
  "Teaching machines the tedious parts.",
];

const CONTACT = [
  ["GH", "github.com/Henil-08"],
  ["HF", "huggingface.co/henil08"],
  ["@", profile.email],
] as const;

/* ------------------------------------------------------------------ the four designs */

/** A · Datasheet: the part-number sheet. Header row, the headline, a spec row, contacts right. */
function Datasheet({ line }: { line: string }) {
  return (
    <div className="relative h-full w-full" style={{ background: PAPER, color: INK }}>
      {/* column rules */}
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className="absolute inset-y-0 w-px" style={{ left: (i + 1) * (W / 13), background: RULE, opacity: 0.55 }} />
      ))}
      <div className="absolute inset-x-0 top-0 flex items-center gap-4 px-10 py-5 font-mono text-[17px]" style={{ borderBottom: `2px solid ${INK}` }}>
        <span className="bg-[#111] px-2 py-0.5 text-white">HG-08</span>
        <span>Datasheet</span>
        <span style={{ color: GRAPHITE }}>· {profile.role} · {profile.location}</span>
        <span className="ml-auto" style={{ color: GRAPHITE }}>Rev 2026.10</span>
      </div>
      <div className="absolute" style={{ left: 470, top: 104 }}>
        <Lockup size={34} name={profile.name} />
        <p className="mt-6 max-w-[720px] text-[60px] font-semibold leading-[1.02] tracking-[-0.025em]">
          {line.replace(/\.$/, "")}
          <span style={{ color: ORANGE }}>.</span>
        </p>
      </div>
      <ul className="absolute right-10 font-mono text-[17px]" style={{ top: 112 }}>
        {CONTACT.map(([k, v]) => (
          <li key={k} className="flex items-baseline gap-3 py-1.5" style={{ borderBottom: `1px solid ${RULE}` }}>
            <span className="w-7" style={{ color: ORANGE }}>{k}</span>
            {v}
          </li>
        ))}
      </ul>
      <div className="absolute bottom-0 right-10 flex gap-8 pb-5 font-mono text-[15px]" style={{ color: GRAPHITE }}>
        <span>Now · {profile.company}</span>
        <span>{profile.coords}</span>
      </div>
    </div>
  );
}

/** B · Attention: the logo's attention map grown into a field across the right, on ink. */
function Attention({ line }: { line: string }) {
  const rows = 6;
  const cols = 10;
  const cell = 46;
  const gap = 8;
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: INK, color: PAPER }}>
      <svg className="absolute" style={{ right: 36, top: 36 }} width={cols * (cell + gap)} height={rows * (cell + gap)} aria-hidden>
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            // the mark's 4x4 weights, tiled and leaning on the long diagonal
            const w0 = ATTENTION[r % 4][c % 4];
            const diag = Math.exp(-Math.pow(c / cols - r / rows, 2) * 18);
            const hit = r === rows - 1 && c === cols - 1;
            const w = hit ? 1 : Math.max(0.06, (w0 < 0 ? 0.5 : w0) * 0.55 * diag + 0.05);
            return <rect key={`${r}-${c}`} x={c * (cell + gap)} y={r * (cell + gap)} width={cell} height={cell} fill={hit ? ORANGE : PAPER} opacity={hit ? 1 : w} />;
          }),
        )}
      </svg>
      <div className="absolute" style={{ left: 56, top: 54 }}>
        <Lockup size={30} name={profile.name} fg={PAPER} />
        <p className="mt-2 font-mono text-[17px]" style={{ color: "#a8a7a1" }}>
          HG-08 · {profile.role} · {profile.location}
        </p>
      </div>
      <p className="absolute max-w-[560px] text-[54px] font-semibold leading-[1.04] tracking-[-0.025em]" style={{ left: 470, bottom: 60 }}>
        {line}
      </p>
    </div>
  );
}

/** C · Lap: the island's real circuit as a plan, one orange dot on the start line. */
function Lap({ line }: { line: string }) {
  // track bounds x -86..87, z -79..44; drawn into a 520 x 340 box on the right
  const sx = 500 / 174;
  const view = `-90 -82 180 130`;
  return (
    <div className="relative h-full w-full" style={{ background: PAPER, color: INK }}>
      <svg className="absolute" style={{ right: 56, top: 52 }} width={180 * sx * 0.62} height={130 * sx * 0.62} viewBox={view} aria-hidden>
        <path d={TRACK_D} fill="none" stroke={RULE} strokeWidth={9} strokeLinejoin="round" />
        <path d={TRACK_D} fill="none" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
        <rect x={-1.6} y={39.4} width={3.2} height={7.2} fill={ORANGE} />
      </svg>
      <div className="absolute font-mono text-[15px]" style={{ right: 56, bottom: 40, color: GRAPHITE }}>
        HG-08 · LAP 01 · 4 SECTORS · 9 GARAGES
      </div>
      <div className="absolute" style={{ left: 470, top: 86 }}>
        <p className="font-mono text-[17px]" style={{ color: ORANGE }}>
          ● {profile.role}
        </p>
        <p className="mt-4 max-w-[640px] text-[60px] font-semibold leading-[1.03] tracking-[-0.025em]">{line}</p>
        <div className="mt-6 flex items-center gap-4">
          <Lockup size={26} name={profile.name} />
          <span className="font-mono text-[16px]" style={{ color: GRAPHITE }}>
            {profile.location} · github.com/Henil-08
          </span>
        </div>
      </div>
    </div>
  );
}

/** D · Prompt: a terminal sticker, the headline as the answer, an orange block cursor. */
function Prompt({ line }: { line: string }) {
  return (
    <div className="relative h-full w-full" style={{ background: PAPER, color: INK }}>
      <div className="absolute flex items-center gap-4" style={{ left: 56, top: 44 }}>
        <Mark size={40} />
        <div>
          <p className="text-[26px] font-semibold leading-none tracking-[-0.02em]">{profile.name}</p>
          <p className="mt-1.5 font-mono text-[15px]" style={{ color: GRAPHITE }}>
            {profile.role} · {profile.location}
          </p>
        </div>
      </div>
      <div className="absolute border-2 bg-white" style={{ left: 470, right: 56, top: 64, borderColor: INK, boxShadow: `6px 6px 0 ${INK}` }}>
        <div className="flex items-center gap-3 px-4 py-2 font-mono text-[15px] text-white" style={{ background: INK }}>
          HG-08 / shell
          <span className="ml-auto" style={{ color: "#a8a7a1" }}>
            zsh · 1584 × 396
          </span>
        </div>
        <div className="px-6 py-5 font-mono">
          <p className="text-[20px]" style={{ color: GRAPHITE }}>
            <span style={{ color: ORANGE }}>❯</span> henil --what-do-you-do
          </p>
          <p className="mt-3 text-[40px] font-semibold leading-[1.1] tracking-[-0.02em]">
            {line}
            <span className="ml-2 inline-block h-[0.9em] w-[0.5em] translate-y-[0.12em]" style={{ background: ORANGE }} />
          </p>
          <p className="mt-4 text-[16px]" style={{ color: GRAPHITE }}>
            github.com/Henil-08 · {profile.email}
          </p>
        </div>
      </div>
    </div>
  );
}

const DESIGNS: { id: string; name: string; note: string; draw: (line: string) => ReactNode }[] = [
  { id: "A", name: "Datasheet", note: "The part-number sheet: header row, column rules, the headline, contacts on the right.", draw: (l) => <Datasheet line={l} /> },
  { id: "B", name: "Attention", note: "The logo's attention map grown into a field on ink; the one orange cell at the end.", draw: (l) => <Attention line={l} /> },
  { id: "C", name: "Lap", note: "The island's real circuit in plan, the start line in orange. Ties the banner to the site.", draw: (l) => <Lap line={l} /> },
  { id: "D", name: "Prompt", note: "A terminal sticker: the question, the headline as the answer, an orange block cursor.", draw: (l) => <Prompt line={l} /> },
];

/* ------------------------------------------------------------------ page */

const readSearch = () => (typeof window === "undefined" ? "" : window.location.search);
const noop = () => () => {};

/** A banner at its real size, scaled to fit its column. */
function Frame({ children, safe }: { children: ReactNode; safe: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0.5);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setK(e.contentRect.width / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="relative w-full overflow-hidden outline outline-2 outline-ink" style={{ aspectRatio: `${W} / ${H}` }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${k})` }}>
        {children}
        {safe && (
          // LinkedIn's profile photo (desktop) and the strips phones crop off the sides
          <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden>
            <circle cx={225} cy={396} r={170} fill="rgba(255,79,0,0.12)" stroke={ORANGE} strokeWidth={2} strokeDasharray="8 6" />
            <rect x={0} y={0} width={90} height={H} fill="rgba(17,17,17,0.08)" />
            <rect x={W - 90} y={0} width={90} height={H} fill="rgba(17,17,17,0.08)" />
          </svg>
        )}
      </div>
    </div>
  );
}

export default function BannerPage() {
  const search = useSyncExternalStore(noop, readSearch, () => "");
  const q = new URLSearchParams(search);
  const [pick, setPick] = useState(0);
  const [safe, setSafe] = useState(true);

  const exp = DESIGNS.find((x) => x.id === q.get("export"));
  if (exp) {
    const t = Math.min(LINES.length - 1, Math.max(0, Number(q.get("t") ?? 0)));
    return <div style={{ width: W, height: H }}>{exp.draw(LINES[t])}</div>;
  }

  const line = LINES[pick];
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-4 py-3">
          <Lockup size={16} name={profile.name} />
          <span className="font-mono text-[12px] text-graphite">HG-08 · LinkedIn banner</span>
          <nav className="ml-auto flex gap-4 font-mono text-[12px] text-graphite">
            <Link href="/docs/brand/system" className="hover:text-ink">
              Design system
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-4 pb-24">
        <p className="mt-12 font-mono text-[12px] text-graphite">HG-08 · Banner · For review</p>
        <h1 className="mt-3 text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[64px]">
          Four banners, fifteen lines<span className="text-signal">.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-graphite">
          LinkedIn&apos;s size, 1584 × 396. Pick a line and every banner updates. The orange circle is where your
          profile photo sits on desktop, the grey strips are what phones crop.
        </p>

        {/* headline picker */}
        <section className="mt-10 border-2 border-ink bg-white">
          <div className="flex items-center gap-3 bg-ink px-3 py-2 font-mono text-[12px] text-white">
            01 · Headline
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-white/70">
              <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} className="accent-[#ff4f00]" />
              Show safe zones
            </label>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-3">
            {LINES.map((l, i) => (
              <li key={l}>
                <button
                  type="button"
                  onClick={() => setPick(i)}
                  className={`flex w-full items-baseline gap-3 border-b border-r border-rule px-3 py-2.5 text-left text-[14.5px] transition-colors ${i === pick ? "bg-ink text-white" : "hover:bg-paper"}`}
                >
                  <span className={`font-mono text-[11px] ${i === pick ? "text-signal" : "text-graphite"}`}>T{String(i + 1).padStart(2, "0")}</span>
                  {l}
                </button>
              </li>
            ))}
          </ol>
        </section>

        {DESIGNS.map((x, i) => (
          <section key={x.id} className="mt-12">
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-[13px] text-signal">{String(i + 2).padStart(2, "0")}</span>
              <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
                {x.id} · {x.name}
              </h2>
              <p className="text-[14px] text-graphite">{x.note}</p>
              <a href={`?export=${x.id}&t=${pick}`} target="_blank" className="ml-auto font-mono text-[12px] underline underline-offset-4 hover:text-signal">
                Open at full size ↗
              </a>
            </div>
            <Frame safe={safe}>{x.draw(line)}</Frame>
          </section>
        ))}
      </div>
    </main>
  );
}
