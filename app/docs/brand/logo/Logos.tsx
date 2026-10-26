// Logo options for the Datasheet identity. Every mark is drawn from the same parts the UI
// uses (hard ink lines, one orange, Plex), and each is shown big, reversed, at favicon
// size and in the lockup with the name, because a mark has to survive all four.
import Link from "next/link";
import type { ReactNode } from "react";

const INK = "#111111";
const PAPER = "#f3f2ed";
const ORANGE = "#ff4f00";
const mono = "[font-family:var(--b-plex-mono)]";

type Mark = (p: { s: number; fg: string; bg: string }) => ReactNode;

/** The selection: the initials inside the orange corner brackets the cards show on hover. */
const Brackets: Mark = ({ s, fg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden fill="none">
    <path d="M4 18 V4 H18 M46 4 H60 V18 M60 46 V60 H46 M18 60 H4 V46" stroke={ORANGE} strokeWidth="5" />
    <text x="32" y="40" textAnchor="middle" fill={fg} fontFamily="var(--b-plex)" fontWeight="700" fontSize="21" letterSpacing="-0.8">
      HG
    </text>
  </svg>
);

/** The dot: a solid square with one orange point. No letters. */
const Dot: Mark = ({ s, fg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden>
    <rect x="6" y="6" width="52" height="52" fill={fg} />
    <circle cx="18" cy="18" r="5.5" fill={ORANGE} />
  </svg>
);

/** Focus: the two you liked, together. Orange brackets locked on to a square. */
const Focus: Mark = ({ s, fg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden fill="none">
    <path d="M4 18 V4 H18 M46 4 H60 V18 M60 46 V60 H46 M18 60 H4 V46" stroke={ORANGE} strokeWidth="5" />
    <rect x="18" y="18" width="28" height="28" fill={fg} />
  </svg>
);

/** Apex: one curve that is a racing line and a loss curve at once; the dot is the apex and the minimum. */
const Apex: Mark = ({ s, fg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden fill="none">
    <path d="M6 8 C14 40 22 52 34 52 S54 40 58 24" stroke={fg} strokeWidth="6" strokeLinecap="square" />
    <circle cx="34" cy="52" r="6.5" fill={ORANGE} />
  </svg>
);

/** Tokens: the initials split the way a tokenizer would, the boundary in orange. */
const Tokens: Mark = ({ s, fg, bg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden>
    <rect x="3" y="14" width="27" height="36" fill={bg} stroke={fg} strokeWidth="4" />
    <rect x="34" y="14" width="27" height="36" fill={fg} />
    <rect x="30.5" y="8" width="3" height="48" fill={ORANGE} />
    <text x="16.5" y="39" textAnchor="middle" fill={fg} fontFamily="var(--b-plex-mono)" fontWeight="600" fontSize="20">
      H
    </text>
    <text x="47.5" y="39" textAnchor="middle" fill={bg} fontFamily="var(--b-plex-mono)" fontWeight="600" fontSize="20">
      G
    </text>
  </svg>
);

// attention weights, row by row: heavy on the diagonal, one cell picked out
const ATT = [
  [1, 0.25, 0.1, 0.1],
  [0.45, 1, 0.2, 0.1],
  [0.15, 0.4, 1, 0.25],
  [0.1, 0.2, 0.5, -1],
];
/** Attention: a 4x4 attention map, the strongest cell in orange. */
const Attention: Mark = ({ s, fg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden>
    {ATT.flatMap((row, r) =>
      row.map((w, c) => <rect key={`${r}${c}`} x={4 + c * 14.5} y={4 + r * 14.5} width="12.5" height="12.5" fill={w < 0 ? ORANGE : fg} opacity={w < 0 ? 1 : w} />),
    )}
  </svg>
);

/** Graph: an agent graph, square nodes and edges, one step running in orange. */
const Graph: Mark = ({ s, fg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden fill="none">
    <path d="M14 32 L48 12 M14 32 L48 52 M48 12 V52" stroke={fg} strokeWidth="4" />
    <rect x="4" y="22" width="20" height="20" fill={fg} />
    <rect x="40" y="4" width="16" height="16" fill={fg} />
    <rect x="40" y="44" width="16" height="16" fill={ORANGE} />
  </svg>
);

/** Cursor: the initials as streamed text, the orange block where the next token lands. */
const Cursor: Mark = ({ s, fg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden>
    <text x="2" y="44" fill={fg} fontFamily="var(--b-plex-mono)" fontWeight="600" fontSize="30" letterSpacing="-1.5">
      hg
    </text>
    <rect x="40" y="20" width="14" height="28" fill={ORANGE} />
  </svg>
);

/** Flag: the chequered flag cut down to nine squares, the last one orange. */
const Flag: Mark = ({ s, fg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden>
    {[0, 1, 2].flatMap((r) =>
      [0, 1, 2].map((c) => ((r + c) % 2 === 0 ? <rect key={`${r}${c}`} x={5 + c * 18} y={5 + r * 18} width="18" height="18" fill={r === 2 && c === 2 ? ORANGE : fg} /> : null)),
    )}
    <rect x="5" y="5" width="54" height="54" fill="none" stroke={fg} strokeWidth="3" />
  </svg>
);

/** Monogram: just the letters, lowercase and tight, closed with an orange full stop. */
const Monogram: Mark = ({ s, fg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden>
    <text x="3" y="44" fill={fg} fontFamily="var(--b-plex)" fontWeight="700" fontSize="38" letterSpacing="-2.5">
      hg
    </text>
    <rect x="45" y="37" width="10" height="10" fill={ORANGE} />
  </svg>
);

const OPTIONS: { id: string; name: string; mark: Mark; why: string; liked?: boolean }[] = [
  { id: "L3", name: "Brackets", mark: Brackets, liked: true, why: "The hover state as the logo. Orange corner brackets around the initials, the way a game marks the slot you are on. The brackets can snap in on load." },
  { id: "L4", name: "Dot", mark: Dot, liked: true, why: "No letters. A solid square and one orange point. The quietest and the most confident; the best at 16px." },
  { id: "L7", name: "Focus", mark: Focus, why: "Your two picks in one: the brackets locked on to the square. On load they snap in from the corners, like a target being acquired." },
  { id: "L8", name: "Apex", mark: Apex, why: "One curve, two readings: a racing line through a corner and a loss curve going down. The orange dot is the apex and the minimum." },
  { id: "L9", name: "Tokens", mark: Tokens, why: "HG split the way a tokenizer splits text, with the boundary in orange. Says LLMs without a single neural-net cliché." },
  { id: "L10", name: "Attention", mark: Attention, why: "A small attention map: strong on the diagonal, the one cell that matters in orange. Abstract, reads as a pattern at any size." },
  { id: "L11", name: "Graph", mark: Graph, why: "An agent graph: square nodes, edges, the step that is running in orange. Agents are most of your work, from Edlight to Waters." },
  { id: "L12", name: "Cursor", mark: Cursor, why: "hg as streamed output, with the orange block where the next token goes. It can blink, and it can type itself out in the boot." },
  { id: "L13", name: "Flag", mark: Flag, why: "The chequered flag cut down to nine squares, the last one orange. The F1 side of you, said quietly." },
  { id: "L14", name: "Monogram", mark: Monogram, why: "Just the letters, lowercase and tight, with a square orange full stop. Plain and typographic, like a signature." },
];

export default function Logos() {
  return (
    <main className="min-h-screen bg-[#f3f2ed] pb-20 text-[#111]" style={{ fontFamily: "var(--b-plex)" }}>
      <div className={`${mono} flex items-center justify-between bg-[#111] px-4 py-2.5 text-[12px] text-[#f3f2ed] sm:px-8`}>
        <Link href="/docs/brand/datasheet" className="text-[#f3f2ed]/70 transition hover:text-white">
          ← Datasheet
        </Link>
        <span>Logo options · {OPTIONS.length}</span>
      </div>
      <div className="mx-auto max-w-[1180px] px-4 pt-10 sm:px-8 sm:pt-14">
        <div className="border-b-[3px] border-[#111] pb-4">
          <p className={`${mono} text-[12px] text-[#5d5d58]`}>HG-26 · Identity</p>
          <h1 className="text-[34px] font-semibold leading-none tracking-tight sm:text-[44px]">Pick a mark</h1>
        </div>
        <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#5d5d58]">
          Your shortlist (L3, L4) first, then eight new ones. Each one is shown four ways: large, reversed on ink, at favicon size (32 and 16 px), and next to your name the way it sits in the site header and on the resume.
        </p>

        <div className="mt-10 space-y-6">
          {OPTIONS.map(({ id, name, mark: M, why, liked }) => (
            <section key={id} className="group grid border-2 border-[#111] bg-white md:grid-cols-[1fr_1.4fr]">
              <div className="grid grid-cols-2 border-b-2 border-[#111] md:border-b-0 md:border-r-2">
                <div className="grid place-items-center p-6">
                  <M s={120} fg={INK} bg="#ffffff" />
                </div>
                <div className="grid place-items-center bg-[#111] p-6">
                  <M s={120} fg={PAPER} bg={INK} />
                </div>
              </div>
              <div className="flex flex-col p-5 sm:p-6">
                <div className="flex items-baseline gap-3 border-b border-[#111] pb-1.5">
                  <span className={`${mono} text-[13px] text-[#ff4f00]`}>{id}</span>
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em]">{name}</h2>
                  {liked && <span className={`${mono} ml-auto bg-[#111] px-2 py-0.5 text-[11px] text-white`}>Shortlisted</span>}
                </div>
                <p className="mt-3 text-[15px] leading-relaxed">{why}</p>
                <div className="mt-auto flex flex-wrap items-end gap-6 pt-6">
                  <div className="flex items-end gap-3">
                    <M s={32} fg={INK} bg="#ffffff" />
                    <M s={16} fg={INK} bg="#ffffff" />
                    <span className={`${mono} text-[11px] text-[#5d5d58]`}>32 · 16 px</span>
                  </div>
                  <div className="flex items-center gap-3 border-l border-[#cfcdc4] pl-6">
                    <M s={40} fg={INK} bg="#ffffff" />
                    <div>
                      <p className="text-[18px] font-semibold leading-none tracking-tight">Henil Gajjar</p>
                      <p className={`${mono} mt-1 text-[11px] text-[#5d5d58]`}>HG-26 · AI/ML engineer</p>
                    </div>
                  </div>
                  <div className={`${mono} flex items-center gap-2.5 bg-[#111] px-3 py-1.5 text-[12px] text-[#f3f2ed]`}>
                    <M s={18} fg={PAPER} bg={INK} />
                    HG-26 / P01
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
