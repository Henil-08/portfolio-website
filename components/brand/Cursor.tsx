"use client";

// The custom cursor (docs/BRAND.md I09): a 7 px ink square with a paper edge. Magnetic (owner's
// pick): over a clickable thing the target leans a few px toward the pointer, and
//   - a boxed target (a border or a fill: buttons, chips, tabs) gets the square docked just
//     outside its bottom-right corner, small and orange like the logo's cell, so it never covers
//     the label;
//   - an unboxed one (a text link with only an underline) gets orange corner brackets round it
//     instead, and the square steps aside;
//   - very wide rows keep the square on the pointer.
// A press throws four little cells. A thin bar over text fields, DRAG over [data-cursor="drag"].
// Mouse and pen only: touch keeps its own. Reduced motion keeps the states and drops the lean,
// the easing and the burst. One rAF loop and DOM writes, no React state.
import { useEffect, useRef } from "react";

const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, [contenteditable="true"]';
const CLICK = 'a[href], button:not(:disabled), [role="button"], summary, label[for], select, [data-cursor="hover"]';
const MAG_MAX = 5; // how far a target leans, px
const WIDE = 220; // targets wider than this keep the square on the pointer
const OUT = 5; // the docked square's centre, px outside the target's bottom-right corner
const FRAME_PAD = 4; // brackets round an unboxed link, px out from its text

type Mode = "dot" | "hover" | "text" | "drag" | "hidden";
type Lean = { x: number; y: number; r: DOMRect; boxed: boolean };

/** Does the element draw its own box (a border or a fill)? Links with just an underline don't. */
function boxed(el: Element) {
  const s = getComputedStyle(el);
  const border = parseFloat(s.borderTopWidth) + parseFloat(s.borderBottomWidth) > 0 && s.borderTopStyle !== "none";
  const fill = s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent";
  return border || fill;
}

/** Four cells fly out from (x, y) and fade: three ink at the logo's weights, one orange. */
function burst(layer: HTMLElement, x: number, y: number) {
  for (const [dx, dy, o] of [
    [-1, -1, 1],
    [1, -1, 0.45],
    [-1, 1, 0.2],
    [1, 1, -1],
  ]) {
    const s = document.createElement("div");
    s.className = "cursor-spark";
    if (o < 0) s.dataset.signal = "";
    else s.style.opacity = String(o);
    layer.appendChild(s);
    const a = s.animate(
      [{ transform: `translate3d(${x}px, ${y}px, 0)` }, { transform: `translate3d(${x + dx * 14}px, ${y + dy * 14}px, 0) scale(.5)`, opacity: 0 }],
      { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
    a.onfinish = a.oncancel = () => s.remove();
  }
}

export default function Cursor() {
  const layer = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    root.classList.add("has-cursor");
    try {
      localStorage.removeItem("hg:cursor-style"); // the old preview picker (options D–G)
    } catch {}
    delete root.dataset.cursorStyle;
    const p = { x: -100, y: -100 };
    const d = { x: -100, y: -100 }; // where the square is drawn
    const f = { x: 0, y: 0, w: 0, h: 0 }; // the brackets
    const leaning = new Map<HTMLElement, Lean>();
    let mode: Mode = "dot";
    let hov: HTMLElement | null = null;
    let down = false;
    let raf = 0;

    const enter = (el: HTMLElement | null) => {
      if (el === hov) return;
      hov = el;
      if (!el) return;
      const cur = leaning.get(el);
      // the rect without its current lean, so the lean never feeds itself
      const r = el.getBoundingClientRect();
      leaning.set(el, { x: cur?.x ?? 0, y: cur?.y ?? 0, r: new DOMRect(r.x - (cur?.x ?? 0), r.y - (cur?.y ?? 0), r.width, r.height), boxed: boxed(el) });
      el.setAttribute("data-cursor-magnet", "");
      if (!cur) Object.assign(f, { x: r.x - FRAME_PAD, y: r.y - FRAME_PAD, w: r.width + FRAME_PAD * 2, h: r.height + FRAME_PAD * 2 });
    };

    const pick = (el: Element | null) => {
      if (!el) return;
      const off = el.closest('[data-cursor="none"]');
      const t = el.closest(TEXT);
      const g = el.closest('[data-cursor="drag"]');
      const c = off || t || g ? null : (el.closest(CLICK) as HTMLElement | null);
      mode = off ? "hidden" : t ? "text" : g ? "drag" : c ? "hover" : "dot";
      // The mode lives in data-cursor-mode, never data-cursor, or the whole page would match [data-cursor="hover"].
      if (root.dataset.cursorMode !== mode) root.dataset.cursorMode = mode;
      enter(c);
      const unboxed = !!c && !leaning.get(c)?.boxed;
      if (unboxed !== "cursorFrame" in root.dataset) {
        if (unboxed) root.dataset.cursorFrame = "";
        else delete root.dataset.cursorFrame;
      }
      if (tag.current) tag.current.dataset.on = mode === "drag" ? "1" : "";
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      p.x = e.clientX;
      p.y = e.clientY;
      pick(e.target as Element);
    };
    const press = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      down = true;
      if (mode === "hover" && !still.matches && layer.current) burst(layer.current, d.x, d.y);
    };
    const lift = () => {
      down = false;
    };
    const leave = () => {
      p.x = p.y = -100;
      pick(document.documentElement);
    };
    const release = (el: HTMLElement) => {
      el.removeAttribute("data-cursor-magnet");
      el.style.removeProperty("--cursor-mx");
      el.style.removeProperty("--cursor-my");
      leaning.delete(el);
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const motion = !still.matches;
      const on = mode === "hover" && hov ? (leaning.get(hov) ?? null) : null;

      // lean the hovered target toward the pointer; ease every other one back and let it go
      leaning.forEach((m, el) => {
        let tx = 0;
        let ty = 0;
        if (el === hov && mode === "hover" && motion) {
          tx = Math.max(-MAG_MAX, Math.min(MAG_MAX, (p.x - (m.r.x + m.r.width / 2)) * 0.18));
          ty = Math.max(-MAG_MAX, Math.min(MAG_MAX, (p.y - (m.r.y + m.r.height / 2)) * 0.18));
        }
        m.x += (tx - m.x) * 0.3;
        m.y += (ty - m.y) * 0.3;
        if (el !== hov && Math.abs(m.x) < 0.1 && Math.abs(m.y) < 0.1) return release(el);
        el.style.setProperty("--cursor-mx", `${m.x.toFixed(2)}px`);
        el.style.setProperty("--cursor-my", `${m.y.toFixed(2)}px`);
      });

      // the square: docked outside a boxed target's corner, else on the pointer
      let tx = p.x;
      let ty = p.y;
      if (on?.boxed && on.r.width <= WIDE) {
        tx = on.r.x + on.r.width + OUT + on.x;
        ty = on.r.y + on.r.height + OUT + on.y;
      }
      const k = on?.boxed && motion ? 0.35 : 1;
      d.x += (tx - d.x) * k;
      d.y += (ty - d.y) * k;
      if (dot.current) dot.current.style.transform = `translate3d(${d.x}px, ${d.y}px, 0) scale(${down ? 0.7 : 1})`;

      // the brackets round an unboxed link, riding its lean
      if (on && !on.boxed && frame.current) {
        const goal = { x: on.r.x - FRAME_PAD + on.x, y: on.r.y - FRAME_PAD + on.y, w: on.r.width + FRAME_PAD * 2, h: on.r.height + FRAME_PAD * 2 };
        const fk = motion ? 0.4 : 1;
        f.x += (goal.x - f.x) * fk;
        f.y += (goal.y - f.y) * fk;
        f.w += (goal.w - f.w) * fk;
        f.h += (goal.h - f.h) * fk;
        frame.current.style.transform = `translate3d(${f.x}px, ${f.y}px, 0)`;
        frame.current.style.width = `${f.w}px`;
        frame.current.style.height = `${f.h}px`;
      }
      if (tag.current) tag.current.style.transform = `translate3d(${p.x + 14}px, ${p.y + 14}px, 0)`;
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", lift);
    window.addEventListener("pointercancel", lift);
    document.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(tick);
    const fx = layer.current;
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", lift);
      window.removeEventListener("pointercancel", lift);
      document.removeEventListener("pointerleave", leave);
      leaning.forEach((_, el) => release(el));
      fx?.querySelectorAll(".cursor-spark").forEach((s) => s.remove());
      root.classList.remove("has-cursor");
      delete root.dataset.cursorMode;
      delete root.dataset.cursorFrame;
    };
  }, []);

  return (
    <div ref={layer} className="cursor-layer" aria-hidden>
      <div ref={frame} className="cursor-frame">
        <span className="left-0 top-0 border-l-2 border-t-2" />
        <span className="right-0 top-0 border-r-2 border-t-2" />
        <span className="bottom-0 left-0 border-b-2 border-l-2" />
        <span className="bottom-0 right-0 border-b-2 border-r-2" />
      </div>
      <div ref={dot} className="cursor-dot" />
      <div ref={tag} className="cursor-tag font-mono">
        Drag
      </div>
    </div>
  );
}
