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

/** L1 · the IC package: an outline with the pin-1 notch, pins down both sides. */
const Package: Mark = ({ s, fg, bg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden>
    {[16, 27, 38, 49].map((y) => (
      <g key={y} fill={fg}>
        <rect x="2" y={y - 2.5} width="10" height="5" />
        <rect x="52" y={y - 2.5} width="10" height="5" />
      </g>
    ))}
    <rect x="12" y="6" width="40" height="52" fill={bg} stroke={fg} strokeWidth="4" />
    <path d="M26 6 A6 6 0 0 0 38 6" fill={bg} stroke={fg} strokeWidth="4" />
    <circle cx="20" cy="16" r="3" fill={ORANGE} />
    <text x="32" y="43" textAnchor="middle" fill={fg} fontFamily="var(--b-plex)" fontWeight="700" fontSize="17" letterSpacing="-0.5">
      HG
    </text>
  </svg>
);

/** L2 · the sticker: the zone label's black key tab, with the initials on it. */
const Sticker: Mark = ({ s, fg, bg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden>
    <rect x="6" y="6" width="54" height="54" fill={fg} />
    <rect x="2" y="2" width="54" height="54" fill={bg} stroke={fg} strokeWidth="4" />
    <rect x="2" y="2" width="22" height="54" fill={fg} />
    <text x="13" y="37" textAnchor="middle" fill={bg} fontFamily="var(--b-plex-mono)" fontWeight="600" fontSize="17">
      H
    </text>
    <text x="40" y="37" textAnchor="middle" fill={fg} fontFamily="var(--b-plex-mono)" fontWeight="600" fontSize="17">
      G
    </text>
    <circle cx="49" cy="11" r="2.6" fill={ORANGE} />
  </svg>
);

/** L3 · the selection: the initials inside the orange corner brackets the cards show on hover. */
const Brackets: Mark = ({ s, fg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden fill="none">
    <path d="M4 18 V4 H18 M46 4 H60 V18 M60 46 V60 H46 M18 60 H4 V46" stroke={ORANGE} strokeWidth="5" />
    <text x="32" y="40" textAnchor="middle" fill={fg} fontFamily="var(--b-plex)" fontWeight="700" fontSize="21" letterSpacing="-0.8">
      HG
    </text>
  </svg>
);

/** L4 · pin 1: no letters, just the part seen from above with its pin-1 dot. */
const PinOne: Mark = ({ s, fg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden>
    <rect x="6" y="6" width="52" height="52" fill={fg} />
    <circle cx="18" cy="18" r="5.5" fill={ORANGE} />
  </svg>
);

// H and G in ASCII, as bits: 0x48 = 01001000, 0x47 = 01000111
const BITS = "0100100001000111";
/** L5 · the timing diagram: the bytes for "HG" drawn as a digital signal. */
const Timing: Mark = ({ s, fg }) => {
  const w = 56 / BITS.length;
  let d = "";
  [...BITS].forEach((b, i) => {
    const y = b === "1" ? 18 : 44;
    const x = 4 + i * w;
    d += i === 0 ? `M${x} ${y}` : ` V${y}`;
    d += ` H${x + w}`;
  });
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden fill="none">
      <rect x="2" y="2" width="60" height="60" stroke={fg} strokeWidth="4" />
      <line x1="32" y1="8" x2="32" y2="56" stroke={ORANGE} strokeWidth="2" strokeDasharray="3 3" />
      <path d={d} stroke={fg} strokeWidth="3.5" strokeLinejoin="miter" />
    </svg>
  );
};

/** L6 · the net: an H drawn as a schematic, two rails joined by a wire, junction dots in orange. */
const Net: Mark = ({ s, fg }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden fill="none">
    <path d="M16 6 V58 M48 6 V58 M16 32 H48" stroke={fg} strokeWidth="7" />
    <circle cx="16" cy="32" r="7" fill={ORANGE} />
    <circle cx="48" cy="32" r="7" fill={ORANGE} />
  </svg>
);

const OPTIONS: { id: string; name: string; mark: Mark; why: string }[] = [
  { id: "L1", name: "Package", mark: Package, why: "A real chip drawing: the pin-1 notch and dot, pins on both sides, the initials as the part marking. Clearer than the first draft, which read as a square with spikes." },
  { id: "L2", name: "Sticker", mark: Sticker, why: "The zone label from the world, made into the mark: a hard offset shadow, H on the black key tab. The logo and the UI become the same object." },
  { id: "L3", name: "Brackets", mark: Brackets, why: "The hover state as the logo. Orange corner brackets around the initials, the way a game marks the slot you are on. It moves well: the brackets can snap in." },
  { id: "L4", name: "Pin 1", mark: PinOne, why: "No letters at all. A part from above with its pin-1 dot. The quietest and the most confident; works at 16px better than anything else here." },
  { id: "L5", name: "Timing", mark: Timing, why: "The ASCII for H and G (0x48, 0x47) drawn as a digital signal, with the byte boundary dashed in orange. A detail engineers will spot." },
  { id: "L6", name: "Net", mark: Net, why: "An H drawn as a schematic: two rails, one wire, orange junction dots. Bold and simple; reads as an H and as a circuit." },
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
          Each one is shown four ways: large, reversed on ink, at favicon size (32 and 16 px), and next to your name the way it sits in the site header and on the resume.
        </p>

        <div className="mt-10 space-y-6">
          {OPTIONS.map(({ id, name, mark: M, why }) => (
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
