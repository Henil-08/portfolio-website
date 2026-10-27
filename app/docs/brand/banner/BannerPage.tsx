"use client";

// LinkedIn banner options (1584 x 396, LinkedIn's size) in the Datasheet language, each in a dark
// and a light version, plus headline options to try in each. `?export=B&theme=dark&t=0` draws one
// banner alone at full size for a PNG capture. LinkedIn puts the profile photo over the bottom
// left, so nothing important sits there.
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { profile, stats } from "@/content/profile";
import { ATTENTION, Lockup, Mark } from "@/components/brand/mark";
import { TRACK_D } from "./track";

const W = 1584;
const H = 396;
const ORANGE = "#ff4f00";

type Theme = { id: "dark" | "light"; bg: string; fg: string; sub: string; rule: string; card: string };
const DARK: Theme = { id: "dark", bg: "#111111", fg: "#f3f2ed", sub: "#a8a7a1", rule: "#2e2e2c", card: "#191918" };
const LIGHT: Theme = { id: "light", bg: "#f3f2ed", fg: "#111111", sub: "#5d5d58", rule: "#cfcdc4", card: "#ffffff" };
const THEMES = [DARK, LIGHT];

/** Headlines, first person, no claims beyond what's in content/*. The owner's two picks first. */
const LINES = [
  "Giving models the context to be useful.",
  "I code. The AI does the chores.",
  "I build AI that makes life easier.",
  "AI that does the boring parts.",
  "I automate the annoying stuff.",
  "Less busywork. More done.",
  "I make AI useful, not loud.",
  "Shipping AI people actually use.",
  "From model to product.",
  "Making AI feel obvious.",
  "Turning messy data into easy days.",
  "AI, but make it practical.",
  "Built to save you time.",
  "Agents that do the work, not the demo.",
  "Teaching machines the tedious parts.",
];
const PICKS = 2;

/** The headline block every design shares: big Plex, set right of the profile photo. */
function Headline({ line, t, size = 56, width = 600 }: { line: string; t: Theme; size?: number; width?: number }) {
  return (
    <p className="font-semibold tracking-[-0.025em]" style={{ fontSize: size, lineHeight: 1.04, maxWidth: width, color: t.fg }}>
      {line}
    </p>
  );
}

function NameRow({ t, size = 26, note = `${profile.role} · ${profile.location}` }: { t: Theme; size?: number; note?: string }) {
  return (
    <div className="flex items-center gap-4">
      <Lockup size={size} name={profile.name} fg={t.fg} />
      <span className="font-mono text-[16px]" style={{ color: t.sub }}>
        {note}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ designs */

/** B · Attention: the logo's attention map grown into a field, the one orange cell at the end. */
function Attention({ line, t }: { line: string; t: Theme }) {
  const rows = 6;
  const cols = 10;
  const cell = 46;
  const gap = 8;
  return (
    <>
      <svg className="absolute" style={{ right: 36, top: 36 }} width={cols * (cell + gap)} height={rows * (cell + gap)} aria-hidden>
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            // the mark's 4x4 weights, tiled and leaning on the long diagonal
            const w0 = ATTENTION[r % 4][c % 4];
            const diag = Math.exp(-Math.pow(c / cols - r / rows, 2) * 18);
            const hit = r === rows - 1 && c === cols - 1;
            const w = hit ? 1 : Math.max(0.06, (w0 < 0 ? 0.5 : w0) * 0.55 * diag + 0.05);
            return <rect key={`${r}-${c}`} x={c * (cell + gap)} y={r * (cell + gap)} width={cell} height={cell} fill={hit ? ORANGE : t.fg} opacity={hit ? 1 : w} />;
          }),
        )}
      </svg>
      <div className="absolute" style={{ left: 56, top: 54 }}>
        <Lockup size={30} name={profile.name} fg={t.fg} />
        <p className="mt-2 font-mono text-[17px]" style={{ color: t.sub }}>
          HG-08 · {profile.role} · {profile.location}
        </p>
      </div>
      <div className="absolute" style={{ left: 470, bottom: 60 }}>
        <Headline line={line} t={t} size={54} width={560} />
      </div>
    </>
  );
}

/** C · Lap: the island's real circuit in plan, one orange mark on the start line. */
function Lap({ line, t }: { line: string; t: Theme }) {
  return (
    <>
      <svg className="absolute" style={{ right: 56, top: 52 }} width={320} height={231} viewBox="-90 -82 180 130" aria-hidden>
        <path d={TRACK_D} fill="none" stroke={t.rule} strokeWidth={9} strokeLinejoin="round" />
        <path d={TRACK_D} fill="none" stroke={t.fg} strokeWidth={2.6} strokeLinejoin="round" />
        <rect x={-1.6} y={39.4} width={3.2} height={7.2} fill={ORANGE} />
      </svg>
      <div className="absolute font-mono text-[15px]" style={{ right: 56, bottom: 40, color: t.sub }}>
        HG-08 · LAP 01 · 4 SECTORS · 9 GARAGES
      </div>
      <div className="absolute" style={{ left: 470, top: 70 }}>
        <p className="font-mono text-[17px]" style={{ color: ORANGE }}>
          ● {profile.role}
        </p>
        <div className="mt-4">
          <Headline line={line} t={t} size={56} width={640} />
        </div>
        <div className="mt-6">
          <NameRow t={t} note={`${profile.location} · github.com/Henil-08`} />
        </div>
      </div>
    </>
  );
}

/** D · Prompt: a terminal sticker, the headline as the answer, an orange block cursor. */
function Prompt({ line, t }: { line: string; t: Theme }) {
  return (
    <>
      <div className="absolute flex items-center gap-4" style={{ left: 56, top: 44 }}>
        <Mark size={40} fg={t.fg} />
        <div>
          <p className="text-[26px] font-semibold leading-none tracking-[-0.02em]" style={{ color: t.fg }}>
            {profile.name}
          </p>
          <p className="mt-1.5 font-mono text-[15px]" style={{ color: t.sub }}>
            {profile.role} · {profile.location}
          </p>
        </div>
      </div>
      <div className="absolute border-2" style={{ left: 470, right: 56, top: 64, borderColor: t.fg, background: t.card, boxShadow: `6px 6px 0 ${t.fg}` }}>
        <div className="flex items-center gap-3 px-4 py-2 font-mono text-[15px]" style={{ background: t.fg, color: t.bg }}>
          HG-08 / shell
          <span className="ml-auto opacity-60">zsh</span>
        </div>
        <div className="px-6 py-5 font-mono">
          <p className="text-[20px]" style={{ color: t.sub }}>
            <span style={{ color: ORANGE }}>❯</span> henil --what-do-you-do
          </p>
          <p className="mt-3 text-[40px] font-semibold leading-[1.1] tracking-[-0.02em]" style={{ color: t.fg }}>
            {line}
            <span className="ml-2 inline-block h-[0.9em] w-[0.5em] translate-y-[0.12em]" style={{ background: ORANGE }} />
          </p>
          <p className="mt-4 text-[16px]" style={{ color: t.sub }}>
            github.com/Henil-08 · {profile.email}
          </p>
        </div>
      </div>
    </>
  );
}

/** E · Telemetry: a lap trace like an F1 speed plot, one orange marker at the peak. */
function Telemetry({ line, t }: { line: string; t: Theme }) {
  const cw = 500;
  const ch = 220;
  // a fixed, hand-shaped trace: straights, braking zones, a long top speed run
  const pts = [0.35, 0.6, 0.82, 0.9, 0.42, 0.3, 0.55, 0.7, 0.5, 0.25, 0.4, 0.75, 0.92, 0.98, 0.96, 0.5, 0.32, 0.58, 0.74, 0.6];
  const step = cw / (pts.length - 1);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)} ${(ch - v * ch).toFixed(1)}`).join(" ");
  const peak = 13;
  return (
    <>
      <svg className="absolute" style={{ right: 56, top: 70 }} width={cw} height={ch + 30} aria-hidden>
        {[0, 0.25, 0.5, 0.75, 1].map((k) => (
          <line key={k} x1={0} x2={cw} y1={ch - k * ch} y2={ch - k * ch} stroke={t.rule} strokeWidth={1} />
        ))}
        {[1, 2, 3].map((s) => (
          <line key={s} x1={(cw * s) / 4} x2={(cw * s) / 4} y1={0} y2={ch} stroke={t.rule} strokeDasharray="4 5" />
        ))}
        <path d={d} fill="none" stroke={t.fg} strokeWidth={3} strokeLinejoin="round" />
        <rect x={peak * step - 6} y={ch - pts[peak] * ch - 6} width={12} height={12} fill={ORANGE} />
        {["S1", "S2", "S3", "S4"].map((s, i) => (
          <text key={s} x={(cw * i) / 4 + 6} y={ch + 22} fontFamily="var(--font-plex-mono)" fontSize={14} fill={t.sub}>
            {s}
          </text>
        ))}
      </svg>
      <div className="absolute font-mono text-[15px]" style={{ right: 56, top: 34, color: t.sub }}>
        HG-08 · TELEMETRY · LAP 01
      </div>
      <div className="absolute" style={{ left: 470, top: 70 }}>
        <Headline line={line} t={t} size={54} width={520} />
        <div className="mt-6">
          <NameRow t={t} size={24} note={profile.location} />
        </div>
      </div>
    </>
  );
}

/** F · Ruler: pure type over a measuring scale, the part number at the end of it. */
function Ruler({ line, t }: { line: string; t: Theme }) {
  return (
    <>
      <div className="absolute flex items-baseline gap-4 font-mono text-[16px]" style={{ left: 470, top: 40, color: t.sub }}>
        <span className="px-2 py-0.5" style={{ background: t.fg, color: t.bg }}>
          HG-08
        </span>
        {profile.name} · {profile.role} · {profile.location}
      </div>
      <div className="absolute" style={{ left: 470, top: 96 }}>
        <Headline line={line} t={t} size={76} width={1040} />
      </div>
      <svg className="absolute bottom-0 left-0" width={W} height={56} aria-hidden>
        <line x1={0} x2={W} y1={55} y2={55} stroke={t.fg} strokeWidth={2} />
        {Array.from({ length: Math.floor(W / 12) + 1 }, (_, i) => {
          const long = i % 10 === 0;
          const mid = i % 5 === 0;
          const x = i * 12;
          return <line key={i} x1={x} x2={x} y1={55} y2={long ? 22 : mid ? 34 : 44} stroke={i === 120 ? ORANGE : t.fg} strokeWidth={i === 120 ? 3 : 1} />;
        })}
        {Array.from({ length: 14 }, (_, i) =>
          i > 3 ? (
            <text key={i} x={i * 120 + 4} y={18} fontFamily="var(--font-plex-mono)" fontSize={12} fill={t.sub}>
              {i * 10}
            </text>
          ) : null,
        )}
      </svg>
    </>
  );
}

/** G · Context: the facts a model would be handed, as a context window, rows lit by attention. */
function Context({ line, t }: { line: string; t: Theme }) {
  const rows: [string, string, number][] = [
    ["role", profile.role, 0.4],
    ["now", profile.company, 0.9],
    ["base", profile.location, 0.2],
    ...stats.slice(0, 4).map((s, i): [string, string, number] => [["industry", "llms", "papers", "cites"][i], `${s.value} ${s.label}`, [0.6, 1, 0.3, 0.5][i]]),
    ["github", "github.com/Henil-08", 0.15],
  ];
  return (
    <>
      <div className="absolute border-l-2 pl-5 font-mono text-[15px]" style={{ right: 56, top: 40, width: 470, borderColor: t.fg }}>
        <p className="mb-2" style={{ color: t.sub }}>
          context · HG-08 · {rows.length} rows
        </p>
        {rows.map(([k, v, a]) => (
          <div key={k + v} className="flex items-center gap-3 py-[3px]">
            <span className="h-[14px] w-[44px] shrink-0" style={{ background: a > 0.85 ? ORANGE : t.fg, opacity: a > 0.85 ? 1 : a * 0.8 }} />
            <span className="w-[80px] shrink-0" style={{ color: t.sub }}>
              {k}
            </span>
            <span className="truncate" style={{ color: t.fg }}>
              {v}
            </span>
          </div>
        ))}
      </div>
      <div className="absolute" style={{ left: 470, top: 66 }}>
        <Headline line={line} t={t} size={56} width={520} />
        <div className="mt-6">
          <Lockup size={24} name={profile.name} fg={t.fg} />
        </div>
      </div>
    </>
  );
}

/** H · Pit board: the sign held over the pit wall, the headline on the board. */
function PitBoard({ line, t }: { line: string; t: Theme }) {
  const board = t.id === "dark" ? "#f3f2ed" : "#111111";
  const ink = t.id === "dark" ? "#111111" : "#f3f2ed";
  return (
    <>
      <div className="absolute" style={{ left: 56, top: 48 }}>
        <Lockup size={28} name={profile.name} fg={t.fg} />
        <p className="mt-2 font-mono text-[16px]" style={{ color: t.sub }}>
          {profile.role}
        </p>
        <p className="font-mono text-[16px]" style={{ color: t.sub }}>
          {profile.location}
        </p>
      </div>
      <div className="absolute" style={{ left: 470, right: 56, top: 40, bottom: 40, background: board }}>
        <div className="flex h-full">
          <div className="flex w-[180px] shrink-0 flex-col justify-between border-r-4 p-5 font-mono" style={{ borderColor: ink, color: ink }}>
            <span className="text-[44px] font-semibold leading-none">P1</span>
            <span className="text-[20px]">HG-08</span>
            <span className="text-[20px]">
              L<span style={{ color: ORANGE }}>01</span>
            </span>
          </div>
          <div className="flex flex-1 items-center px-8">
            <p className="font-mono font-semibold uppercase tracking-[0.02em]" style={{ fontSize: 46, lineHeight: 1.12, color: ink }}>
              {line.replace(/\.$/, "")}
            </p>
          </div>
        </div>
        <span className="absolute -top-3 right-10 h-3 w-24" style={{ background: ORANGE }} />
      </div>
    </>
  );
}

const DESIGNS: { id: string; name: string; note: string; draw: (line: string, t: Theme) => ReactNode }[] = [
  { id: "B", name: "Attention", note: "The logo's attention map grown into a field; the one orange cell at the end.", draw: (l, t) => <Attention line={l} t={t} /> },
  { id: "C", name: "Lap", note: "The island's real circuit in plan, the start line in orange.", draw: (l, t) => <Lap line={l} t={t} /> },
  { id: "D", name: "Prompt", note: "A terminal sticker: the question, the headline as the answer.", draw: (l, t) => <Prompt line={l} t={t} /> },
  { id: "E", name: "Telemetry", note: "A lap trace like an F1 speed plot, sectors marked, one orange point at the peak.", draw: (l, t) => <Telemetry line={l} t={t} /> },
  { id: "F", name: "Ruler", note: "Just type, big, over a measuring scale. The quietest one.", draw: (l, t) => <Ruler line={l} t={t} /> },
  { id: "G", name: "Context", note: "Your real facts laid out as a model's context window, rows lit by attention. Pairs with T01.", draw: (l, t) => <Context line={l} t={t} /> },
  { id: "H", name: "Pit board", note: "The sign the team holds over the pit wall, with the headline on it.", draw: (l, t) => <PitBoard line={l} t={t} /> },
];

/** One banner at its real size, on its theme's background. */
function Banner({ id, line, t }: { id: string; line: string; t: Theme }) {
  const x = DESIGNS.find((d) => d.id === id)!;
  return (
    <div className="relative overflow-hidden" style={{ width: W, height: H, background: t.bg, color: t.fg }}>
      {x.draw(line, t)}
    </div>
  );
}

/* ------------------------------------------------------------------ page */

const readSearch = () => (typeof window === "undefined" ? "" : window.location.search);
const noop = () => () => {};

/** A banner scaled to fit its column; optional overlay of LinkedIn's photo and phone crop. */
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
          <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden>
            <circle cx={225} cy={396} r={170} fill="rgba(255,79,0,0.12)" stroke={ORANGE} strokeWidth={2} strokeDasharray="8 6" />
            <line x1={90} x2={90} y1={0} y2={H} stroke={ORANGE} strokeWidth={2} strokeDasharray="8 6" />
            <line x1={W - 90} x2={W - 90} y1={0} y2={H} stroke={ORANGE} strokeWidth={2} strokeDasharray="8 6" />
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
  const [safe, setSafe] = useState(false);

  const exp = DESIGNS.find((x) => x.id === q.get("export"));
  if (exp) {
    const n = Math.min(LINES.length - 1, Math.max(0, Number(q.get("t") ?? 0)));
    return <Banner id={exp.id} line={LINES[n]} t={q.get("theme") === "light" ? LIGHT : DARK} />;
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
          Seven banners, dark and light<span className="text-signal">.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-graphite">
          LinkedIn&apos;s size, 1584 × 396. Pick a line and every banner updates. Turn on safe zones to see where your
          profile photo sits (orange circle) and where phones crop the sides (dashed lines).
        </p>

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
                  <span className={`font-mono text-[11px] ${i === pick || i < PICKS ? "text-signal" : "text-graphite"}`}>T{String(i + 1).padStart(2, "0")}</span>
                  {l}
                  {i < PICKS && <span className="ml-auto font-mono text-[11px] text-signal">your pick</span>}
                </button>
              </li>
            ))}
          </ol>
        </section>

        {DESIGNS.map((x, i) => (
          <section key={x.id} className="mt-14">
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-[13px] text-signal">{String(i + 2).padStart(2, "0")}</span>
              <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
                {x.id} · {x.name}
              </h2>
              <p className="text-[14px] text-graphite">{x.note}</p>
            </div>
            <div className="space-y-4">
              {THEMES.map((t) => (
                <div key={t.id}>
                  <div className="mb-1.5 flex items-center font-mono text-[12px] text-graphite">
                    {t.id === "dark" ? "Dark" : "Light"}
                    <a href={`?export=${x.id}&theme=${t.id}&t=${pick}`} target="_blank" className="ml-auto underline underline-offset-4 hover:text-signal">
                      Open at full size ↗
                    </a>
                  </div>
                  <Frame safe={safe}>
                    <Banner id={x.id} line={line} t={t} />
                  </Frame>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
