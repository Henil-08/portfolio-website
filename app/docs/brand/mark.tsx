// The logo (L10 · A, "draw and fill"): a 4x4 attention map, heavy on the diagonal, the one
// cell that matters in orange. With `motion` each cell's outline traces, the cell fills from
// the left to its weight, then the orange cell flickers on (about 0.8 s). Remount to replay.
import type { CSSProperties } from "react";

export const INK = "#111111";
export const ORANGE = "#ff4f00";

// row by row; -1 is the orange cell
export const ATTENTION = [
  [1, 0.25, 0.1, 0.1],
  [0.45, 1, 0.2, 0.1],
  [0.15, 0.4, 1, 0.25],
  [0.1, 0.2, 0.5, -1],
];

export const MARK_CSS = `
.hgm{transform-box:fill-box}
.hgm-trace{animation:hgm-trace .5s cubic-bezier(.6,0,.2,1) var(--d,0ms) both}
.hgm-fill{transform-origin:left;animation:hgm-fill .35s cubic-bezier(.6,0,.2,1) var(--d,0ms) both}
.hgm-flick{animation:hgm-flick .4s steps(1,end) var(--d,0ms) both}
@keyframes hgm-trace{0%{stroke-dasharray:1;stroke-dashoffset:1;opacity:1}55%{stroke-dasharray:1;stroke-dashoffset:0;opacity:1}100%{stroke-dasharray:1;stroke-dashoffset:0;opacity:0}}
@keyframes hgm-fill{from{transform:scaleX(0)}to{transform:none}}
@keyframes hgm-flick{0%{opacity:0}25%{opacity:1}45%{opacity:.2}65%,100%{opacity:1}}
@media (prefers-reduced-motion:reduce){.hgm{animation:none!important}}
`;

const cell = (r: number, c: number) => ({ x: 4 + c * 14.5, y: 4 + r * 14.5, width: 12.5, height: 12.5 });
const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export function Mark({ size = 32, fg = INK, motion = false, delay = 0 }: { size?: number; fg?: string; motion?: boolean; delay?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="shrink-0">
      {ATTENTION.flatMap((row, r) =>
        row.map((w, c) => {
          const t = delay + (r + c) * 45;
          if (w < 0) return <rect key={`${r}${c}`} className={motion ? "hgm hgm-flick" : undefined} style={at(delay + 560)} {...cell(r, c)} fill={ORANGE} />;
          return (
            <g key={`${r}${c}`}>
              {motion && <rect className="hgm hgm-trace" style={at(t)} pathLength={1} {...cell(r, c)} fill="none" stroke={fg} strokeWidth="1.4" opacity={0} />}
              <rect className={motion ? "hgm hgm-fill" : undefined} style={at(t + 170)} {...cell(r, c)} fill={fg} opacity={w} />
            </g>
          );
        }),
      )}
    </svg>
  );
}

/**
 * The mark beside the name. Rule: the visible square is as tall as the name's font size, and
 * the gap is 0.4 of it. The cells fill 56 of the mark's 64 units, so the svg is drawn a little
 * larger than the font size to make the square itself match.
 */
export function Lockup({ size, name, motion = false, fg = INK }: { size: number; name: string; motion?: boolean; fg?: string }) {
  return (
    <span className="inline-flex items-center" style={{ gap: size * 0.4, fontSize: size, lineHeight: 1, color: fg }}>
      <Mark size={Math.round((size * 64) / 56)} motion={motion} fg={fg} />
      <span className="font-semibold tracking-[-0.02em]">{name}</span>
    </span>
  );
}
