"use client";

// The custom cursor (docs/BRAND.md I09): a 7 px ink square with a paper edge that follows the
// pointer and shrinks while pressed. No brackets on hover (owner). Over clickable things the mode
// is "hover"; what that looks like depends on <html data-cursor-style> (a, b or c, picked in the
// I09 lab and kept in localStorage; none = no change). Over text fields it becomes a thin bar; over
// [data-cursor="drag"] it shows DRAG. Mouse and pen only: touch keeps its own. One rAF loop, no React state.
import { useEffect, useRef } from "react";

const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, [contenteditable="true"]';
const CLICK = 'a[href], button:not(:disabled), [role="button"], summary, label[for], select, [data-cursor="hover"]';
export const CURSOR_STYLES = ["a", "b", "c"] as const;
export const CURSOR_STYLE_KEY = "hg:cursor-style";

export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    root.classList.add("has-cursor");
    try {
      const saved = localStorage.getItem(CURSOR_STYLE_KEY);
      if (saved && (CURSOR_STYLES as readonly string[]).includes(saved)) root.dataset.cursorStyle = saved;
    } catch {}
    const p = { x: -100, y: -100 };
    let mode: "dot" | "hover" | "text" | "drag" | "hidden" = "dot";
    let down = false;
    let raf = 0;

    const pick = (el: Element | null) => {
      if (!el) return;
      const off = el.closest('[data-cursor="none"]');
      const t = el.closest(TEXT);
      const g = el.closest('[data-cursor="drag"]');
      // The mode lives in data-cursor-mode, never data-cursor, or the whole page would match [data-cursor="hover"].
      mode = off ? "hidden" : t ? "text" : g ? "drag" : el.closest(CLICK) ? "hover" : "dot";
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
      if (dot.current) dot.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) scale(${down ? 0.7 : 1})`;
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
      <div ref={dot} className="cursor-dot" />
      <div ref={tag} className="cursor-tag font-mono">
        Drag
      </div>
    </div>
  );
}
