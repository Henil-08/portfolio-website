"use client";

// LinkedIn banner options (1584 x 396, LinkedIn's size) in the Datasheet language. Each design
// can switch colour (dark / light), background pattern and headline face, and every headline
// option drops into all of them. `?export=E&theme=dark&bg=grid&font=sans&t=0` draws one banner
// alone at full size for a PNG capture. LinkedIn puts the profile photo over the bottom left, so
// nothing important sits there.
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { profile, stats } from "@/content/profile";
import { Lockup, Mark } from "@/components/brand/mark";
import { TRACK_D } from "./track";
import { CHOSEN } from "./chosen";

const W = 1584;
const H = 396;
const ORANGE = "#ff4f00";

type Theme = { id: "dark" | "light"; bg: string; fg: string; sub: string; rule: string; card: string };
const DARK: Theme = { id: "dark", bg: "#111111", fg: "#f3f2ed", sub: "#a8a7a1", rule: "#2e2e2c", card: "#191918" };
const LIGHT: Theme = { id: "light", bg: "#f3f2ed", fg: "#111111", sub: "#5d5d58", rule: "#cfcdc4", card: "#ffffff" };

const PATTERNS = ["none", "grid", "dots", "pixels", "lines"] as const;
type Pattern = (typeof PATTERNS)[number];
const FONTS = { sans: "var(--font-plex)", cond: "var(--font-plex-cond)", serif: "var(--font-plex-serif)", mono: "var(--font-plex-mono)" } as const;
type Font = keyof typeof FONTS;
const FONT_NAME: Record<Font, string> = { sans: "Plex Sans", cond: "Condensed", serif: "Plex Serif", mono: "Plex Mono" };

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

/** A small seeded rng, so the pixel pattern is the same every render. */
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/* ------------------------------------------------------------------ shared pieces */

/** The headline: big type in the chosen face (the banner's --hl), set right of the profile photo. */
function Headline({ line, t, size = 56, width = 600 }: { line: string; t: Theme; size?: number; width?: number }) {
  return (
    <p className="font-semibold tracking-[-0.025em]" style={{ fontFamily: "var(--hl)", fontSize: size, lineHeight: 1.06, maxWidth: width, color: t.fg }}>
      {line.replace(/\.$/, "")}
      {line.endsWith(".") && <span style={{ color: ORANGE }}>.</span>}
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

/** The background pattern, under everything, in the theme's rule colour. */
function Backdrop({ kind, t, clear }: { kind: Pattern; t: Theme; clear?: [number, number, number, number] }) {
  if (kind === "grid")
    return (
      <>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="absolute inset-y-0 w-px" style={{ left: (i + 1) * (W / 13), background: t.rule, opacity: 0.7 }} />
        ))}
      </>
    );
  if (kind === "dots")
    return <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(${t.rule} 1.6px, transparent 1.8px)`, backgroundSize: "24px 24px", backgroundPosition: "12px 12px" }} />;
  if (kind === "lines")
    return <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(0deg, ${t.rule} 0 1px, transparent 1px 22px)`, opacity: 0.8 }} />;
  if (kind === "pixels") {
    // a field of 18 px cells, denser to the right, like the mark's cells drifting off the edge
    const r = rng(8);
    const cells: ReactNode[] = [];
    for (let y = 0; y < H; y += 18)
      for (let x = 0; x < W; x += 18) {
        const v = r();
        const lean = x / W;
        const inside = clear && x > clear[0] - 18 && x < clear[2] && y > clear[1] - 18 && y < clear[3];
        if (!inside && v < 0.12 + lean * 0.3) cells.push(<rect key={`${x}-${y}`} x={x + 2} y={y + 2} width={14} height={14} fill={t.fg} opacity={0.03 + r() * 0.06 * (0.5 + lean)} />);
      }
    return (
      <svg className="absolute inset-0" width={W} height={H} aria-hidden>
        {cells}
      </svg>
    );
  }
  return null;
}

/* ------------------------------------------------------------------ designs */

/** A · Datasheet: the part-number sheet. Header row, the headline, contacts on the right. */
function Datasheet({ line, t }: { line: string; t: Theme }) {
  return (
    <>
      <div className="absolute inset-x-0 top-0 flex items-center gap-4 px-14 py-5 font-mono text-[17px]" style={{ borderBottom: `2px solid ${t.fg}`, color: t.sub, background: t.bg }}>
        <span className="px-2 py-0.5" style={{ background: t.fg, color: t.bg }}>
          HG-08
        </span>
        <span style={{ color: t.fg }}>Datasheet</span>· {profile.role} · {profile.location}
        <span className="ml-auto">Rev 2026.10</span>
      </div>
      <div className="absolute" style={{ left: 470, top: 108 }}>
        <Lockup size={30} name={profile.name} fg={t.fg} />
        <div className="mt-5">
          <Headline line={line} t={t} size={56} width={660} />
        </div>
      </div>
      <ul className="absolute font-mono text-[16px]" style={{ right: 56, top: 112, color: t.fg }}>
        {[
          ["GH", "github.com/Henil-08"],
          ["HF", "huggingface.co/henil08"],
          ["@", profile.email],
        ].map(([k, v]) => (
          <li key={k} className="flex items-baseline gap-3 py-1.5" style={{ borderBottom: `1px solid ${t.rule}` }}>
            <span className="w-7" style={{ color: ORANGE }}>
              {k}
            </span>
            {v}
          </li>
        ))}
      </ul>
      <div className="absolute flex gap-8 font-mono text-[15px]" style={{ right: 56, bottom: 22, color: t.sub }}>
        <span>Now · {profile.company}</span>
        <span>{profile.coords}</span>
      </div>
    </>
  );
}

/** B · Attention: the mark grown to an 8 x 8 attention map, one square block, one orange cell. */
function Attention({ line, t }: { line: string; t: Theme }) {
  const n = 8;
  const cell = 30;
  const gap = 4;
  const r = rng(21);
  return (
    <>
      <svg className="absolute" style={{ right: 64, top: (H - n * (cell + gap)) / 2 }} width={n * (cell + gap)} height={n * (cell + gap)} aria-hidden>
        {Array.from({ length: n }, (_, y) =>
          Array.from({ length: n }, (_, x) => {
            // heavy on the diagonal, a little off it, faint elsewhere: what a head attends to
            const hit = x === n - 1 && y === n - 1;
            const d = Math.abs(x - y);
            const w = d === 0 ? 1 : d === 1 ? 0.35 + r() * 0.2 : 0.06 + r() * 0.14;
            return <rect key={`${x}-${y}`} x={x * (cell + gap)} y={y * (cell + gap)} width={cell} height={cell} fill={hit ? ORANGE : t.fg} opacity={hit ? 1 : w} />;
          }),
        )}
      </svg>
      <div className="absolute" style={{ left: 470, top: 72 }}>
        <p className="font-mono text-[16px]" style={{ color: t.sub }}>
          HG-08 · attention · 8 × 8
        </p>
        <div className="mt-4">
          <Headline line={line} t={t} size={56} width={640} />
        </div>
        <div className="mt-6">
          <NameRow t={t} size={24} />
        </div>
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
          <p className="mt-3 font-semibold leading-[1.1] tracking-[-0.02em]" style={{ fontFamily: "var(--hl)", fontSize: 40, color: t.fg }}>
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

/** E · Telemetry: a full lap of data like an F1 timing screen: speed, throttle and brake, sectors. */
function Telemetry({ line, t, contacts = [] }: { line: string; t: Theme; contacts?: readonly string[] }) {
  const cw = 540;
  const ch = 170;
  const x0 = W - 56 - 72 - cw;
  // a hand-shaped lap: 40 samples of speed (0..1), braking where it drops
  const v = [0.55, 0.7, 0.84, 0.93, 0.97, 0.6, 0.34, 0.3, 0.48, 0.66, 0.78, 0.52, 0.4, 0.58, 0.72, 0.8, 0.86, 0.5, 0.28, 0.24, 0.36, 0.52, 0.68, 0.82, 0.92, 0.98, 1, 0.99, 0.62, 0.38, 0.33, 0.47, 0.63, 0.75, 0.56, 0.44, 0.6, 0.74, 0.82, 0.62];
  const step = cw / (v.length - 1);
  const y = (k: number) => ch - k * (ch - 10);
  const d = v.map((k, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)} ${y(k).toFixed(1)}`).join(" ");
  const peak = 26;
  const sectors = [0, 10, 20, 30, 39];
  const times = ["26.104", "22.711", "19.438", "15.902"];
  return (
    <>
      {/* timing row */}
      <div className="absolute flex items-center gap-6 font-mono text-[15px]" style={{ left: x0, right: 56, top: 30, color: t.sub }}>
        <span className="px-2 py-0.5" style={{ background: t.fg, color: t.bg }}>
          HG-08
        </span>
        <span>LAP 01</span>
        <span style={{ color: t.fg }}>1:24.155</span>
        <span className="ml-auto">
          Δ <span style={{ color: t.fg }}>−0.214</span>
        </span>
      </div>
      <svg className="absolute" style={{ left: x0, top: 70 }} width={cw + 72} height={ch + 96} aria-hidden>
        {/* speed axis */}
        {[0, 0.5, 1].map((k) => (
          <g key={k}>
            <line x1={0} x2={cw} y1={y(k)} y2={y(k)} stroke={t.rule} />
            <text x={cw + 8} y={y(k) + 4} fontFamily="var(--font-plex-mono)" fontSize={12} fill={t.sub}>
              {Math.round(80 + k * 240)} km/h
            </text>
          </g>
        ))}
        {sectors.slice(1, -1).map((s) => (
          <line key={s} x1={s * step} x2={s * step} y1={0} y2={ch + 56} stroke={t.rule} strokeDasharray="4 5" />
        ))}
        <path d={`${d} L${cw} ${ch} L0 ${ch} Z`} fill={t.fg} opacity={0.07} />
        <path d={d} fill="none" stroke={t.fg} strokeWidth={2.6} strokeLinejoin="round" />
        <rect x={peak * step - 6} y={y(v[peak]) - 6} width={12} height={12} fill={ORANGE} />
        <text x={peak * step + 12} y={y(v[peak]) + 4} fontFamily="var(--font-plex-mono)" fontSize={12} fill={t.fg}>
          320
        </text>
        {/* throttle and brake: a band per sample, full throttle ink, braking hatched */}
        {v.map((k, i) => {
          const braking = i > 0 && k < v[i - 1] - 0.08;
          return <rect key={i} x={i * step} y={ch + 14} width={step - 1.5} height={10} fill={t.fg} opacity={braking ? 0.15 : k > 0.75 ? 0.9 : 0.45} />;
        })}
        <text x={0} y={ch + 40} fontFamily="var(--font-plex-mono)" fontSize={12} fill={t.sub}>
          THR / BRK
        </text>
        {/* sectors */}
        {times.map((s, i) => (
          <g key={s}>
            <text x={sectors[i] * step + 6} y={ch + 76} fontFamily="var(--font-plex-mono)" fontSize={13} fill={t.sub}>
              S{i + 1}
            </text>
            <text x={sectors[i] * step + 34} y={ch + 76} fontFamily="var(--font-plex-mono)" fontSize={13} fill={t.fg}>
              {s}
            </text>
          </g>
        ))}
      </svg>
      <div className="absolute" style={{ left: 470, top: 74 }}>
        <Headline line={line} t={t} size={48} width={390} />
        <div className="mt-6">
          <Lockup size={24} name={profile.name} fg={t.fg} />
          <p className="mt-2 font-mono text-[15px]" style={{ color: t.sub }}>
            {profile.role} · {profile.location}
          </p>
          {contacts.map((c) => (
            <p key={c} className="font-mono text-[15px]" style={{ color: t.sub }}>
              {c}
            </p>
          ))}
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
          const x = i * 12;
          return <line key={i} x1={x} x2={x} y1={55} y2={i % 10 === 0 ? 22 : i % 5 === 0 ? 34 : 44} stroke={i === 120 ? ORANGE : t.fg} strokeWidth={i === 120 ? 3 : 1} />;
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
            <p className="font-semibold uppercase tracking-[0.02em]" style={{ fontFamily: "var(--hl)", fontSize: 46, lineHeight: 1.12, color: ink }}>
              {line.replace(/\.$/, "")}
            </p>
          </div>
        </div>
        <span className="absolute -top-3 right-10 h-3 w-24" style={{ background: ORANGE }} />
      </div>
    </>
  );
}

type Design = { id: string; name: string; note: string; bg: Pattern; font: Font; draw: (line: string, t: Theme, contacts: readonly string[]) => ReactNode; clear?: [number, number, number, number] };
const DESIGNS: Design[] = [
  { id: "E", name: "Telemetry", note: "A whole lap of data like an F1 timing screen: speed with the top speed in orange, throttle and brake, sector times.", bg: "grid", font: "sans", draw: (l, t, c) => <Telemetry line={l} t={t} contacts={c} /> },
  { id: "B", name: "Attention", note: "The mark grown to an 8 × 8 attention map: one square block, heavy on the diagonal, one orange cell.", bg: "pixels", font: "sans", draw: (l, t) => <Attention line={l} t={t} />, clear: [W - 64 - 272 - 24, 62 - 24, W - 40, 334 + 24] },
  { id: "A", name: "Datasheet", note: "The part-number sheet: header row, the headline, contacts on the right.", bg: "grid", font: "sans", draw: (l, t) => <Datasheet line={l} t={t} /> },
  { id: "G", name: "Context", note: "Your real facts as a model's context window, rows lit by attention. Pairs with T01.", bg: "none", font: "sans", draw: (l, t) => <Context line={l} t={t} /> },
  { id: "D", name: "Prompt", note: "A terminal sticker: the question, the headline as the answer. Pairs with T02.", bg: "dots", font: "mono", draw: (l, t) => <Prompt line={l} t={t} /> },
  { id: "C", name: "Lap", note: "The island's real circuit in plan, the start line in orange.", bg: "none", font: "sans", draw: (l, t) => <Lap line={l} t={t} /> },
  { id: "F", name: "Ruler", note: "Just type, big, over a measuring scale. The quietest one.", bg: "none", font: "sans", draw: (l, t) => <Ruler line={l} t={t} /> },
  { id: "H", name: "Pit board", note: "The sign the team holds over the pit wall, with the headline on it.", bg: "none", font: "mono", draw: (l, t) => <PitBoard line={l} t={t} /> },
];

type Look = { theme: "dark" | "light"; bg: Pattern; font: Font };

/** One banner at its real size. */
function Banner({ d, line, look, contacts = [] }: { d: Design; line: string; look: Look; contacts?: readonly string[] }) {
  const t = look.theme === "light" ? LIGHT : DARK;
  return (
    <div className="relative overflow-hidden" style={{ width: W, height: H, background: t.bg, color: t.fg, "--hl": FONTS[look.font] } as CSSProperties}>
      <Backdrop kind={look.bg} t={t} clear={d.clear} />
      {d.draw(line, t, contacts)}
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

/** A row of small segmented buttons. */
function Seg<T extends string>({ label, value, options, names, onPick }: { label: string; value: T; options: readonly T[]; names?: Record<string, string>; onPick: (v: T) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-graphite">{label}</span>
      <div className="flex border-2 border-ink">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => onPick(o)} className={`border-r border-ink px-2 py-0.5 font-mono text-[11.5px] last:border-r-0 ${o === value ? "bg-ink text-white" : "bg-white hover:bg-paper"}`}>
            {names?.[o] ?? o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Card({ d, i, line, pick, safe }: { d: Design; i: number; line: string; pick: number; safe: boolean }) {
  const [look, setLook] = useState<Look>({ theme: "dark", bg: d.bg, font: d.font });
  const set = (p: Partial<Look>) => setLook((l) => ({ ...l, ...p }));
  return (
    <section className="mt-14">
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-[13px] text-signal">{String(i + 2).padStart(2, "0")}</span>
        <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
          {d.id} · {d.name}
        </h2>
        <p className="text-[14px] text-graphite">{d.note}</p>
      </div>
      <div className="mb-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Seg label="Colour" value={look.theme} options={["dark", "light"] as const} names={{ dark: "Black", light: "White" }} onPick={(theme) => set({ theme })} />
        <Seg label="Pattern" value={look.bg} options={PATTERNS} onPick={(bg) => set({ bg })} />
        <Seg label="Font" value={look.font} options={Object.keys(FONTS) as Font[]} names={FONT_NAME} onPick={(font) => set({ font })} />
        <a href={`?export=${d.id}&theme=${look.theme}&bg=${look.bg}&font=${look.font}&t=${pick}`} target="_blank" className="ml-auto font-mono text-[12px] underline underline-offset-4 hover:text-signal">
          Open at full size ↗
        </a>
      </div>
      <Frame safe={safe}>
        <Banner d={d} line={line} look={look} />
      </Frame>
    </section>
  );
}

export default function BannerPage() {
  const search = useSyncExternalStore(noop, readSearch, () => "");
  const q = new URLSearchParams(search);
  const [pick, setPick] = useState(0);
  const [safe, setSafe] = useState(false);

  const chosen = DESIGNS.find((x) => x.id === CHOSEN.design)!;
  const chosenLook: Look = { theme: CHOSEN.theme, bg: CHOSEN.bg, font: CHOSEN.font };
  if (q.get("export") === "chosen") return <Banner d={chosen} line={LINES[CHOSEN.line]} look={chosenLook} contacts={CHOSEN.contacts} />;
  const exp = DESIGNS.find((x) => x.id === q.get("export"));
  if (exp) {
    const n = Math.min(LINES.length - 1, Math.max(0, Number(q.get("t") ?? 0)));
    const bg = (PATTERNS as readonly string[]).includes(q.get("bg") ?? "") ? (q.get("bg") as Pattern) : exp.bg;
    const font = (q.get("font") ?? "") in FONTS ? (q.get("font") as Font) : exp.font;
    return <Banner d={exp} line={LINES[n]} look={{ theme: q.get("theme") === "light" ? "light" : "dark", bg, font }} />;
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
          Eight banners, your way<span className="text-signal">.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-graphite">
          LinkedIn&apos;s size, 1584 × 396. Pick a line and every banner updates; each banner has its own colour,
          pattern and font. Turn on safe zones to see where your profile photo sits (orange circle) and where phones
          crop the sides (dashed lines).
        </p>

        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-[13px] text-signal">00</span>
            <h2 className="text-[26px] font-semibold tracking-[-0.02em]">Your banner</h2>
            <p className="text-[14px] text-graphite">
              {chosen.id} · {chosen.name}, {CHOSEN.theme === "light" ? "white" : "black"}, {CHOSEN.bg}, {FONT_NAME[CHOSEN.font]}. Saved in chosen.ts; exported to linkedin-banner.jpg.
            </p>
            <a href="?export=chosen" target="_blank" className="ml-auto font-mono text-[12px] underline underline-offset-4 hover:text-signal">
              Open at full size ↗
            </a>
          </div>
          <Frame safe={safe}>
            <Banner d={chosen} line={LINES[CHOSEN.line]} look={chosenLook} contacts={CHOSEN.contacts} />
          </Frame>
        </section>

        <section className="mt-12 border-2 border-ink bg-white">
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

        {DESIGNS.map((d, i) => (
          <Card key={d.id} d={d} i={i} line={line} pick={pick} safe={safe} />
        ))}
      </div>
    </main>
  );
}
