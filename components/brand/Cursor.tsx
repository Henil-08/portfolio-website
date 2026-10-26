"use client";

// The custom cursor (docs/BRAND.md I09). The page is left alone: only the cursor changes over
// something clickable. It is the small square (7 px ink, 1 px paper outline) sitting on the
// pointer with no lag. Over a clickable thing it becomes one cell of the logo, animated the way
// the mark draws itself: an 11 px outline traces round its edge, then orange fills it from the left
// (owner's pick, "border and fill"). A press shrinks it and turns the fill ink. An I-beam over
// text, DRAG over [data-cursor="drag"], hidden over [data-cursor="none"]. The mode lives on
// <html data-cursor-mode>; press is a flag on the layer. Mouse and pen only. One rAF loop writes
// transforms, no React state.
import { useEffect, useRef } from "react";

const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, [contenteditable="true"]';
const CLICK = 'a[href], button:not(:disabled), [role="button"], summary, label[for], select, [data-cursor="hover"]';

type Mode = "dot" | "hover" | "text" | "drag" | "hidden";

export default function Cursor() {
  const layer = useRef<HTMLDivElement>(null);
  const pt = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    const fx = layer.current;
    root.classList.add("has-cursor");
    try {
      localStorage.removeItem("hg:cursor-style"); // the old A/B preview picker
    } catch {}
    const p = { x: -100, y: -100 };
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
      pick(root);
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (pt.current) pt.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      if (tag.current) tag.current.style.transform = `translate3d(${p.x + 12}px, ${p.y + 12}px, 0)`;
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
      root.classList.remove("has-cursor");
      delete root.dataset.cursorMode;
    };
  }, []);

  return (
    <div ref={layer} className="cursor-layer" aria-hidden>
      <div ref={pt} className="cur-at">
        {/* idle: the square */}
        <div className="cur-sq" />
        {/* over a clickable: one logo cell, the outline traces round, then the fill wipes from the left */}
        <svg className="cur-cell" width="15" height="15" viewBox="-2 -2 15 15">
          <rect className="cur-halo" x="0" y="0" width="11" height="11" />
          <rect className="cur-fill" x="1.5" y="1.5" width="8" height="8" />
          <rect className="cur-trace" x="0.75" y="0.75" width="9.5" height="9.5" pathLength={1} />
        </svg>
        {/* over text: the I-beam */}
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
