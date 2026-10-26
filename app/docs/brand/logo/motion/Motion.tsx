"use client";

// Three marks (L10 Attention, L9 Tokens, L12 Cursor), each still and in motion side by side.
// The animated ones play on load, on hover and on Replay; only the cursor keeps moving after.
import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";

const INK = "#111111";
const PAPER = "#f3f2ed";
const ORANGE = "#ff4f00";
const mono = "[font-family:var(--b-plex-mono)]";

type Mark = (p: { s: number; fg: string; bg: string; motion: boolean }) => ReactNode;
const d = (ms: number, more: Record<string, string | number> = {}) => ({ "--d": `${ms}ms`, ...more }) as CSSProperties;

// Every rule is scoped under [data-motion], so the still versions ignore it.
const CSS = `
[data-motion] .lm{transform-box:fill-box}
[data-motion] .lm-cell{transform-origin:center;animation:lm-cell .2s cubic-bezier(.3,1.5,.5,1) var(--d,0ms) both}
[data-motion] .lm-hit{transform-origin:center;animation:lm-hit .32s cubic-bezier(.3,1.8,.5,1) var(--d,0ms) both}
[data-motion] .lm-draw{animation:lm-draw .45s cubic-bezier(.6,0,.2,1) var(--d,0ms) both}
[data-motion] .lm-fill{transform-origin:left;animation:lm-fill .35s cubic-bezier(.6,0,.2,1) var(--d,0ms) both}
[data-motion] .lm-cut{transform-origin:top;animation:lm-cut .3s cubic-bezier(.3,1.6,.5,1) var(--d,0ms) both}
[data-motion] .lm-flick{animation:lm-flick .4s steps(1,end) var(--d,0ms) both}
[data-motion] .lm-type{animation:lm-type 1ms steps(1,end) var(--d,0ms) both}
[data-motion] .lm-caret{animation:lm-caret .75s steps(1,end) both,lm-blink 1.06s steps(1,end) .9s infinite}
@keyframes lm-cell{from{opacity:0;transform:scale(.3)}to{opacity:var(--w);transform:none}}
@keyframes lm-hit{0%{opacity:0;transform:scale(.2)}60%{opacity:1;transform:scale(1.25)}100%{opacity:1;transform:none}}
@keyframes lm-draw{from{stroke-dasharray:1;stroke-dashoffset:1}99%{stroke-dasharray:1;stroke-dashoffset:0}to{stroke-dasharray:none;stroke-dashoffset:0}}
@keyframes lm-fill{from{transform:scaleX(0)}to{transform:none}}
@keyframes lm-cut{from{transform:scaleY(0)}to{transform:none}}
@keyframes lm-flick{0%{opacity:0}25%{opacity:1}45%{opacity:.2}65%,100%{opacity:1}}
@keyframes lm-type{from{opacity:0}to{opacity:1}}
@keyframes lm-caret{0%{transform:translateX(-38px)}40%{transform:translateX(-20px)}75%,100%{transform:none}}
@keyframes lm-blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){[data-motion] .lm{animation:none!important}}
`;

// attention weights, row by row: heavy on the diagonal, -1 is the cell in orange
const ATT = [
  [1, 0.25, 0.1, 0.1],
  [0.45, 1, 0.2, 0.1],
  [0.15, 0.4, 1, 0.25],
  [0.1, 0.2, 0.5, -1],
];

/** L10 · the map fills in as a diagonal sweep, then the orange cell lands. About half a second. */
const Attention: Mark = ({ s, fg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden>
    {ATT.flatMap((row, r) =>
      row.map((w, c) =>
        w < 0 ? (
          <rect key={`${r}${c}`} className="lm lm-hit" style={d(300)} x={4 + c * 14.5} y={4 + r * 14.5} width="12.5" height="12.5" fill={ORANGE} />
        ) : (
          <rect key={`${r}${c}`} className="lm lm-cell" style={d((r + c) * 40, { "--w": w })} x={4 + c * 14.5} y={4 + r * 14.5} width="12.5" height="12.5" fill={fg} opacity={w} />
        ),
      ),
    )}
  </svg>
);

// 9x9 attention map whose strongest cells spell HG in a 3x5 pixel font. # is a letter
// pixel, o is the orange cell (the G's spur), anything else is a faint background weight.
const HG_ROWS = [
  ".........",
  ".........",
  ".#.#.###.",
  ".#.#.#...",
  ".###.#.o.",
  ".#.#.#.#.",
  ".#.#.###.",
  ".........",
  ".........",
];
// faint, uneven background weights so it still reads as a map, not a stencil (fixed, not random)
const bgW = (r: number, c: number) => 0.05 + (((r * 7 + c * 13) % 5) / 4) * 0.1;

/** L10b · the background sweeps in faint, then the letter cells take the weight, then the orange cell. */
const AttentionHG: Mark = ({ s, fg }) => {
  const cell = 60 / 9;
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden>
      {HG_ROWS.flatMap((row, r) =>
        [...row].map((ch, c) => {
          const x = 2 + c * cell;
          const y = 2 + r * cell;
          const sz = cell - 0.9;
          if (ch === "o") return <rect key={`${r}${c}`} className="lm lm-hit" style={d(420)} x={x} y={y} width={sz} height={sz} fill={ORANGE} />;
          const w = ch === "#" ? 1 : bgW(r, c);
          const at = ch === "#" ? 160 + c * 22 : (r + c) * 12;
          return <rect key={`${r}${c}`} className="lm lm-cell" style={d(at, { "--w": w })} x={x} y={y} width={sz} height={sz} fill={fg} opacity={w} />;
        }),
      )}
    </svg>
  );
};

/** L9 · the H box draws, the G box fills, the orange boundary cuts down between them. */
const Tokens: Mark = ({ s, fg, bg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden>
    <rect className="lm lm-draw" style={d(0)} pathLength={1} x="3" y="14" width="27" height="36" fill={bg} stroke={fg} strokeWidth="4" />
    <rect className="lm lm-fill" style={d(250)} x="34" y="14" width="27" height="36" fill={fg} />
    <text className="lm lm-flick" style={d(500)} x="16.5" y="39" textAnchor="middle" fill={fg} fontFamily="var(--b-plex-mono)" fontWeight="600" fontSize="20">
      H
    </text>
    <text className="lm lm-flick" style={d(600)} x="47.5" y="39" textAnchor="middle" fill={bg} fontFamily="var(--b-plex-mono)" fontWeight="600" fontSize="20">
      G
    </text>
    <rect className="lm lm-cut" style={d(750)} x="30.5" y="8" width="3" height="48" fill={ORANGE} />
  </svg>
);

/** L12 · the cursor types h, then g, then keeps blinking where the next token goes. */
const Cursor: Mark = ({ s, fg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden>
    <text x="2" y="44" fill={fg} fontFamily="var(--b-plex-mono)" fontWeight="600" fontSize="30" letterSpacing="-1.5">
      <tspan className="lm lm-type" style={d(300)}>
        h
      </tspan>
      <tspan className="lm lm-type" style={d(560)}>
        g
      </tspan>
    </text>
    <rect className="lm lm-caret" x="40" y="20" width="14" height="28" fill={ORANGE} />
  </svg>
);

const MARKS: { id: string; name: string; mark: Mark; motion: string; kept?: boolean }[] = [
  { id: "L10", name: "Attention", mark: Attention, kept: true, motion: "Cells sweep in diagonally, each to its own weight, and the orange cell lands with a small overshoot. About half a second, then it holds still." },
  { id: "L10b", name: "Attention · HG", mark: AttentionHG, motion: "A bigger map where the strongest cells spell HG in pixels. The faint weights sweep in first, the letter cells take the weight left to right, then the orange cell (the G's spur) lands. About 0.6 s." },
  { id: "L9", name: "Tokens", mark: Tokens, motion: "The H box draws its outline, the G box fills from the left, both letters flicker on, then the orange boundary cuts down between them. Then it holds still." },
  { id: "L12", name: "Cursor", mark: Cursor, motion: "The orange block types h, then g, and stays blinking where the next token would go. The only one that keeps moving; in the header it could stop after a few blinks." },
];

/** One animated tile: plays on mount, again on hover and on the page's Replay. */
function Play({ take, children, className }: { take: number; children: (k: string) => ReactNode; className: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className={className} data-motion="" onMouseEnter={() => setHover((h) => h + 1)}>
      {children(`${take}-${hover}`)}
    </div>
  );
}

function Tile({ label, dark, children }: { label: string; dark?: boolean; children: ReactNode }) {
  return (
    <div className={`relative grid min-h-[190px] place-items-center p-6 ${dark ? "bg-[#111]" : "bg-white"}`}>
      <span className={`${mono} absolute left-3 top-2 text-[10.5px] uppercase tracking-[0.1em] ${dark ? "text-white/45" : "text-[#5d5d58]"}`}>{label}</span>
      {children}
    </div>
  );
}

export default function Motion() {
  const [take, setTake] = useState(0);
  return (
    <main className="min-h-screen bg-[#f3f2ed] pb-20 text-[#111]" style={{ fontFamily: "var(--b-plex)" }}>
      <style>{CSS}</style>
      <div className={`${mono} sticky top-0 z-20 flex items-center justify-between gap-3 bg-[#111] px-4 py-2.5 text-[12px] text-[#f3f2ed] sm:px-8`}>
        <Link href="/docs/brand/logo" className="text-[#f3f2ed]/70 transition hover:text-white">
          ← All marks
        </Link>
        <button type="button" onClick={() => setTake((t) => t + 1)} className="border border-[#f3f2ed]/30 px-3 py-1 transition hover:border-white">
          ↻ Replay all
        </button>
      </div>
      <div className="mx-auto max-w-[1180px] px-4 pt-10 sm:px-8 sm:pt-14">
        <div className="border-b-[3px] border-[#111] pb-4">
          <p className={`${mono} text-[12px] text-[#5d5d58]`}>HG-26 · Identity · Motion</p>
          <h1 className="text-[34px] font-semibold leading-none tracking-tight sm:text-[44px]">Still and in motion</h1>
        </div>
        <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#5d5d58]">
          Left, the mark as it sits still (favicon, print, the resume). Right, the same mark animating, the way it would on the boot screen and the site header. Hover any animated tile to
          play it again.
        </p>

        <div className="mt-10 space-y-8">
          {MARKS.map(({ id, name, mark: M, motion, kept }) => (
            <section key={id} className="border-2 border-[#111] bg-white">
              <div className="flex flex-wrap items-baseline gap-3 border-b-2 border-[#111] px-5 py-3">
                <span className={`${mono} text-[13px] text-[#ff4f00]`}>{id}</span>
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em]">{name}</h2>
                {kept && <span className={`${mono} ml-auto bg-[#111] px-2 py-0.5 text-[11px] text-white`}>Kept</span>}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4">
                <Tile label="Still">
                  <M s={120} fg={INK} bg="#ffffff" motion={false} />
                </Tile>
                <Tile label="Still" dark>
                  <M s={120} fg={PAPER} bg={INK} motion={false} />
                </Tile>
                <Play take={take} className="contents">
                  {(k) => (
                    <>
                      <Tile label="Animated">
                        <M key={k} s={120} fg={INK} bg="#ffffff" motion />
                      </Tile>
                      <Tile label="Animated" dark>
                        <M key={k} s={120} fg={PAPER} bg={INK} motion />
                      </Tile>
                    </>
                  )}
                </Play>
              </div>
              <div className="grid gap-5 border-t-2 border-[#111] p-5 md:grid-cols-[1fr_auto] md:items-center">
                <p className="text-[15px] leading-relaxed">{motion}</p>
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex items-end gap-2.5">
                    <M s={32} fg={INK} bg="#ffffff" motion={false} />
                    <M s={16} fg={INK} bg="#ffffff" motion={false} />
                    <span className={`${mono} text-[11px] text-[#5d5d58]`}>favicon</span>
                  </div>
                  <Play take={take} className="flex items-center gap-2.5 bg-[#111] px-3 py-2">
                    {(k) => (
                      <>
                        <M key={k} s={26} fg={PAPER} bg={INK} motion />
                        <span className="text-[14px] font-semibold text-white">Henil Gajjar</span>
                      </>
                    )}
                  </Play>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
