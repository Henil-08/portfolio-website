// The journeys' floating stickers (HTML over the canvas): the brand's sticker, paper with a 2 px
// ink border and a solid 3 px ink shadow (R01), Plex Mono for dates and codes, Plex Sans for the
// title. They flicker on (M08) when what they say changes. The sticker hangs below and to the left
// of the car (behind it and toward the camera), so it never covers the lane ahead or the boards.
export const STICKER_CSS = `
.jx-sticker{min-width:190px;max-width:280px;border:2px solid #111;background:#f3f2ed;box-shadow:3px 3px 0 #111;color:#111;transition:opacity .18s steps(3);white-space:nowrap;transform:translate(calc(-100% - 34px),18px)}
.jx-head{display:flex;align-items:center;gap:8px;background:#111;color:#f3f2ed;padding:3px 8px;font:600 12px/16px var(--font-plex-mono),ui-monospace,monospace;letter-spacing:.02em}
.jx-code{color:#ff4f00}
.jx-date{margin-left:auto}
.jx-title{padding:5px 8px 0;font:600 15px/19px var(--font-plex),system-ui,sans-serif;letter-spacing:.04em}
.jx-line{padding:1px 8px 6px;font:600 11px/15px var(--font-plex-mono),ui-monospace,monospace;color:#5d5d58;letter-spacing:.02em}
.jx-line:empty{display:none}
.jx-flick{animation:jx-flick .55s steps(1) both}
@keyframes jx-flick{0%{opacity:.2}18%{opacity:1}30%{opacity:.35}46%{opacity:1}60%{opacity:.6}72%,100%{opacity:1}}
@media (prefers-reduced-motion:reduce){.jx-flick{animation:none}}
`;
