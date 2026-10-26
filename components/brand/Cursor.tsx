"use client";

// The custom cursor (docs/BRAND.md I09). The page is left alone: no leaning, docking or bursts.
// Only the cursor changes form over something clickable. Five styles to live with, picked on
// <html data-cursor-style="1..5"> (saved in localStorage "hg:cursor-style", default 1):
//   1 Mark      a 2x2 attention map that opens into the full 4x4 logo
//   2 Reticle   a 6 px square that becomes a four-tick reticle with an orange centre
//   3 Arrow     an angular ink arrow that grows an orange tail and a → / ↗ chip
//   4 Caret     a slow-blinking bar that becomes an orange block, like a selected cell
//   5 Ring      a 4 px dot; a square ring eases out round it and the dot turns orange
// Every style: a press state, an I-beam over text, DRAG over [data-cursor="drag"], hidden over
// [data-cursor="none"]. The mode lives on <html data-cursor-mode>; press and "opens a new tab"
// are flags on the layer. Mouse and pen only. One rAF loop writes transforms, no React state.
import { useEffect, useRef, type CSSProperties } from "react";
import { ATTENTION } from "./mark";

const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, [contenteditable="true"]';
const CLICK = 'a[href], button:not(:disabled), [role="button"], summary, label[for], select, [data-cursor="hover"]';
const KEY = "hg:cursor-style";

export const CURSOR_STYLES = [
  { id: "1", code: "C1", name: "Mark", line: "A 2x2 attention map; over anything clickable it opens into the full logo, cells stepping in on the diagonal." },
  { id: "2", code: "C2", name: "Reticle", line: "A small square; over a clickable it snaps into a four-tick reticle with an orange centre, leaving the label clear." },
  { id: "3", code: "C3", name: "Arrow", line: "An angular ink arrow; over a clickable its tail turns orange and a chip says → (or ↗ for a new tab)." },
  { id: "4", code: "C4", name: "Caret", line: "A slow terminal caret; over a clickable it fills into an orange block, like a selected cell." },
  { id: "5", code: "C5", name: "Ring", line: "A 4 px dot; over a clickable a square ring eases out round it and the dot turns orange." },
] as const;
export type CursorStyle = (typeof CURSOR_STYLES)[number]["id"];

const isStyle = (v: unknown): v is CursorStyle => CURSOR_STYLES.some((s) => s.id === v);

/** Switch the cursor style site-wide and remember it in this browser. */
export function setCursorStyle(id: CursorStyle) {
  document.documentElement.dataset.cursorStyle = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {}
}

type Mode = "dot" | "hover" | "text" | "drag" | "hidden";

// style 1: the 4x4 cells. Idle shows a 2x2 (1 / .2 / .45 / orange) in the top-left corner.
const IDLE: Record<string, number> = { "00": 1, "01": 0.2, "10": 0.45, "11": -1 };
const MARK = ATTENTION.flatMap((row, r) =>
  row.map((w, c) => {
    const i = IDLE[`${r}${c}`];
    return {
      k: `${r}${c}`,
      style: {
        "--x": `${c * 4}px`,
        "--y": `${r * 4}px`,
        "--io": i === undefined ? 0 : i < 0 ? 1 : i,
        "--ic": i !== undefined && i < 0 ? "var(--color-signal)" : "var(--color-ink)",
        "--ho": w < 0 ? 1 : w,
        "--hc": w < 0 ? "var(--color-signal)" : "var(--color-ink)",
        "--is": i === undefined ? 0 : 1,
        "--d": `${(r + c) * 12}ms`,
      } as CSSProperties,
    };
  }),
);

export default function Cursor() {
  const layer = useRef<HTMLDivElement>(null);
  const pt = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    const fx = layer.current;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    root.classList.add("has-cursor");
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    root.dataset.cursorStyle = isStyle(saved) ? saved : "1";
    const p = { x: -100, y: -100 };
    const r = { x: -100, y: -100 }; // the ring trails a little
    let mode: Mode = "dot";
    let raf = 0;

    const flag = (name: string, on: boolean) => {
      if (!fx || on === name in fx.dataset) return;
      if (on) fx.dataset[name] = "";
      else delete fx.dataset[name];
    };

    const pick = (el: Element | null) => {
      if (!el) return;
      const off = el.closest('[data-cursor="none"]');
      const t = el.closest(TEXT);
      const g = el.closest('[data-cursor="drag"]');
      const c = off || t || g ? null : el.closest(CLICK);
      mode = off ? "hidden" : t ? "text" : g ? "drag" : c ? "hover" : "dot";
      // The mode lives in data-cursor-mode, never data-cursor, or the whole page would match [data-cursor="hover"].
      if (root.dataset.cursorMode !== mode) root.dataset.cursorMode = mode;
      flag("ext", !!c?.matches('a[target="_blank"]'));
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      p.x = e.clientX;
      p.y = e.clientY;
      pick(e.target as Element);
    };
    const press = (e: PointerEvent) => {
      if (e.pointerType !== "touch") flag("down", true);
    };
    const lift = () => flag("down", false);
    const leave = () => {
      p.x = p.y = -100;
      r.x = r.y = -100;
      pick(root);
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const k = still.matches ? 1 : 0.4;
      r.x += (p.x - r.x) * k;
      r.y += (p.y - r.y) * k;
      if (pt.current) pt.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${r.x.toFixed(2)}px, ${r.y.toFixed(2)}px, 0)`;
      if (tag.current) tag.current.style.transform = `translate3d(${p.x + 14}px, ${p.y + 14}px, 0)`;
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", lift);
    window.addEventListener("pointercancel", lift);
    document.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", lift);
      window.removeEventListener("pointercancel", lift);
      document.removeEventListener("pointerleave", leave);
      flag("down", false);
      flag("ext", false);
      root.classList.remove("has-cursor");
      delete root.dataset.cursorMode;
      delete root.dataset.cursorStyle;
    };
  }, []);

  return (
    <div ref={layer} className="cursor-layer" aria-hidden>
      <div ref={ring} className="cur-at">
        <div className="cur-ring" />
      </div>
      <div ref={pt} className="cur-at">
        {/* 1 · Mark */}
        <div className="cur-form cur-mark" data-s="1">
          <b className="cur-plate" />
          {MARK.map((m) => (
            <span key={m.k} style={m.style} />
          ))}
        </div>
        {/* 2 · Reticle */}
        <div className="cur-form cur-ret" data-s="2">
          <span className="cur-ret-sq" />
          <span className="cur-ret-ticks">
            <i data-t="n" />
            <i data-t="e" />
            <i data-t="s" />
            <i data-t="w" />
          </span>
        </div>
        {/* 3 · Arrow */}
        <div className="cur-form cur-arrow" data-s="3">
          <svg width="16" height="21" viewBox="-2 -2 16 21">
            <path className="cur-arrow-head" d="M0 0V14L4 10.4H10.4Z" />
            <path className="cur-arrow-tail" d="M4.3 10.4L7.5 17L9.8 16L6.9 10.4Z" />
          </svg>
          <span className="cur-chip">
            <svg width="9" height="9" viewBox="0 0 9 9">
              <path d="M1 4.5H8M5 1.5L8 4.5L5 7.5" />
            </svg>
            <svg width="9" height="9" viewBox="0 0 9 9">
              <path d="M1.5 7.5L7.5 1.5M3 1.5H7.5V6" />
            </svg>
          </span>
        </div>
        {/* 4 · Caret */}
        <div className="cur-form cur-caret" data-s="4" />
        {/* 5 · Ring (the dot; the ring rides the trailing layer above) */}
        <div className="cur-form cur-dot" data-s="5" />
        {/* every style: the I-beam over text */}
        <svg className="cur-ibeam" width="10" height="22" viewBox="-2 -2 10 22">
          <path d="M0 0H6V2H4V16H6V18H0V16H2V2H0Z" />
        </svg>
      </div>
      <div ref={tag} className="cur-at">
        <div className="cursor-tag font-mono">Drag</div>
      </div>
    </div>
  );
}
