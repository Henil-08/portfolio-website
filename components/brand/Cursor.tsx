"use client";

// The custom cursor (docs/BRAND.md I09). A small ink square with a paper edge follows the
// pointer. Over anything clickable it hides and orange corner brackets lock onto the
// target, the same signal as hover and keyboard focus; pressing tightens them. Over text
// fields it becomes a thin bar; over [data-cursor="drag"] it shows DRAG. Mouse and pen only:
// touch screens keep their own behaviour. Everything moves in one rAF loop, no React state.
import { useEffect, useRef } from "react";

const CLICKABLE = 'a[href], button:not(:disabled), [role="button"], summary, label[for], select, .x-sel, [data-cursor="hover"]';
const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, [contenteditable="true"]';
const PAD = 6;

export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    root.classList.add("has-cursor");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const p = { x: -100, y: -100 };
    const b = { x: -100, y: -100, w: 0, h: 0, on: 0 };
    let target: Element | null = null;
    let mode: "dot" | "hover" | "text" | "drag" | "hidden" = "dot";
    let down = false;
    let raf = 0;

    const pick = (el: Element | null) => {
      if (!el) return;
      const off = el.closest('[data-cursor="none"]');
      const t = el.closest(TEXT);
      const c = el.closest(CLICKABLE);
      const g = el.closest('[data-cursor="drag"]');
      target = c;
      mode = off ? "hidden" : t ? "text" : c ? "hover" : g ? "drag" : "dot";
      root.dataset.cursorMode = mode;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      p.x = e.clientX;
      p.y = e.clientY;
      pick(e.target as Element);
    };
    const press = (e: PointerEvent) => {
      if (e.pointerType !== "touch") down = true;
    };
    const lift = () => {
      down = false;
    };
    const leave = () => {
      p.x = p.y = -100;
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const k = calm ? 1 : 0.32;
      // brackets: around the target when hovering, collapsed onto the pointer otherwise
      let tx = p.x;
      let ty = p.y;
      let tw = 0;
      let th = 0;
      if (mode === "hover" && target?.isConnected) {
        const r = target.getBoundingClientRect();
        const pad = down ? PAD - 3 : PAD;
        tx = r.left - pad;
        ty = r.top - pad;
        tw = r.width + pad * 2;
        th = r.height + pad * 2;
      }
      b.x += (tx - b.x) * k;
      b.y += (ty - b.y) * k;
      b.w += (tw - b.w) * k;
      b.h += (th - b.h) * k;
      b.on += ((mode === "hover" ? 1 : 0) - b.on) * (calm ? 1 : 0.4);
      if (box.current) {
        box.current.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`;
        box.current.style.width = `${b.w}px`;
        box.current.style.height = `${b.h}px`;
        box.current.style.opacity = String(b.on);
      }
      if (dot.current) {
        const s = mode === "hover" ? 0.5 : down ? 0.7 : 1;
        dot.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) scale(${s})`;
      }
      if (tag.current) tag.current.style.transform = `translate3d(${p.x + 14}px, ${p.y + 14}px, 0)`;
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", lift);
    document.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", lift);
      document.removeEventListener("pointerleave", leave);
      root.classList.remove("has-cursor");
      delete root.dataset.cursorMode;
    };
  }, []);

  return (
    <div className="cursor-layer" aria-hidden>
      <div ref={box} className="cursor-box">
        <span className="cursor-corner left-0 top-0 border-l-2 border-t-2" />
        <span className="cursor-corner right-0 top-0 border-r-2 border-t-2" />
        <span className="cursor-corner bottom-0 left-0 border-b-2 border-l-2" />
        <span className="cursor-corner bottom-0 right-0 border-b-2 border-r-2" />
      </div>
      <div ref={dot} className="cursor-dot" />
      <div ref={tag} className="cursor-tag font-mono">
        Drag
      </div>
    </div>
  );
}
