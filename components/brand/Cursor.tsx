"use client";

// The custom cursor (docs/BRAND.md I09): a 7 px ink square with a paper edge that follows the
// pointer and shrinks while pressed. No brackets on hover (owner). Over clickable things the mode
// is "hover"; what happens then depends on <html data-cursor-style> (picked in the I09 lab and kept
// in localStorage; none = no change):
//   d · Tag       a mono prompt beside the square says what the click does; the square turns orange.
//   e · Magnetic  the target leans toward the pointer, the square snaps into its bottom-right corner in
//                 orange (the logo's cell), a click bursts four cells.
//   f · Trail     a short trail of logo-weight cells that folds into a 2x2 attention map on hover.
//   g · Scan      one orange line sweeps the target; the square becomes a crosshair with its code.
// Over text fields it becomes a thin bar; over [data-cursor="drag"] it shows DRAG. Mouse and pen
// only: touch keeps its own. Reduced motion keeps the state changes and drops the movement.
// One rAF loop and DOM writes, no React state.
import { useEffect, useRef } from "react";
import { burst, clickVerb, codeOf, scan } from "./cursorFx";

const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, [contenteditable="true"]';
const CLICK = 'a[href], button:not(:disabled), [role="button"], summary, label[for], select, [data-cursor="hover"]';
export const CURSOR_STYLES = ["d", "e", "f", "g"] as const;
export const CURSOR_STYLE_KEY = "hg:cursor-style";

// F · Trail: the 2x2 cell offsets (px from the pointer) for the square and the three trail cells that fold in.
const FOLD = [
  [-4, -4],
  [4, -4],
  [-4, 4],
  [4, 4],
];
const TRAIL = 4;
const MAG_MAX = 5; // E: how far a target leans, px
const SNAP_MAX = 220; // E: targets wider than this keep the square on the pointer
const CORNER = 6; // E: the snapped square's centre, px in from the target's bottom-right corner

type Mode = "dot" | "hover" | "text" | "drag" | "hidden";

export default function Cursor() {
  const layer = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const scanBox = useRef<HTMLDivElement>(null);
  const cells = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    root.classList.add("has-cursor");
    try {
      const saved = localStorage.getItem(CURSOR_STYLE_KEY);
      if (saved && (CURSOR_STYLES as readonly string[]).includes(saved)) root.dataset.cursorStyle = saved;
      else if (saved) localStorage.removeItem(CURSOR_STYLE_KEY); // an old option (a, b, c)
    } catch {}
    const p = { x: -100, y: -100 };
    const d = { x: -100, y: -100 }; // where the square is drawn (E eases it to the target)
    const trail = Array.from({ length: TRAIL }, () => ({ x: -100, y: -100 }));
    const leaning = new Map<HTMLElement, { x: number; y: number; r: DOMRect }>();
    let mode: Mode = "dot";
    let hov: Element | null = null; // the clickable under the pointer
    let last: Element | null = null; // the last pointer target, to re-pick when the style changes
    let style = root.dataset.cursorStyle ?? "";
    let down = false;
    let raf = 0;

    const setTag = (kind: string, text: string) => {
      const t = tag.current;
      if (!t) return;
      if (t.dataset.kind !== kind) t.dataset.kind = kind;
      if (t.textContent !== text) t.textContent = text;
    };

    const enter = (el: Element | null) => {
      if (el === hov) return;
      hov = el;
      if (!el) return;
      const motion = !still.matches;
      if (style === "e" && motion && el instanceof HTMLElement) {
        const cur = leaning.get(el);
        // the rect without its current lean, so the lean never feeds itself
        const r = el.getBoundingClientRect();
        leaning.set(el, { x: cur?.x ?? 0, y: cur?.y ?? 0, r: new DOMRect(r.x - (cur?.x ?? 0), r.y - (cur?.y ?? 0), r.width, r.height) });
        el.setAttribute("data-cursor-magnet", "");
      }
      if (style === "g" && motion && scanBox.current) scan(scanBox.current, el.getBoundingClientRect());
    };

    const pick = (el: Element | null) => {
      if (!el) return;
      last = el;
      const off = el.closest('[data-cursor="none"]');
      const t = el.closest(TEXT);
      const g = el.closest('[data-cursor="drag"]');
      const c = off || t || g ? null : el.closest(CLICK);
      // The mode lives in data-cursor-mode, never data-cursor, or the whole page would match [data-cursor="hover"].
      mode = off ? "hidden" : t ? "text" : g ? "drag" : c ? "hover" : "dot";
      if (root.dataset.cursorMode !== mode) root.dataset.cursorMode = mode;
      enter(c);
      if (mode === "drag") setTag("drag", "Drag");
      else if (c && style === "d") setTag("label", clickVerb(c));
      else if (c && style === "g") {
        const code = codeOf(c);
        setTag(code ? "code" : "", code);
      } else setTag("", "");
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
      root.dataset.cursorDown = "";
      if (style === "e" && mode === "hover" && !still.matches && layer.current) burst(layer.current, d.x, d.y);
    };
    const lift = () => {
      down = false;
      delete root.dataset.cursorDown;
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
      const s = root.dataset.cursorStyle ?? "";
      if (s !== style) {
        style = s;
        hov = null;
        leaning.forEach((_, el) => release(el));
        trail.forEach((c) => Object.assign(c, d));
        pick(last);
      }
      const motion = !still.matches;
      const box = mode === "hover" && hov ? leaning.get(hov as HTMLElement)?.r ?? null : null;

      // E · Magnetic: lean the hovered target toward the pointer; ease every other one back.
      leaning.forEach((m, el) => {
        let tx = 0;
        let ty = 0;
        if (el === hov && mode === "hover") {
          const cx = m.r.x + m.r.width / 2;
          const cy = m.r.y + m.r.height / 2;
          tx = Math.max(-MAG_MAX, Math.min(MAG_MAX, (p.x - cx) * 0.18));
          ty = Math.max(-MAG_MAX, Math.min(MAG_MAX, (p.y - cy) * 0.18));
        }
        m.x += (tx - m.x) * 0.3;
        m.y += (ty - m.y) * 0.3;
        if (el !== hov && Math.abs(m.x) < 0.1 && Math.abs(m.y) < 0.1) return release(el);
        el.style.setProperty("--cursor-mx", `${m.x.toFixed(2)}px`);
        el.style.setProperty("--cursor-my", `${m.y.toFixed(2)}px`);
      });

      // Where the square goes.
      let tx = p.x;
      let ty = p.y;
      const fold = style === "f" && mode === "hover";
      if (box && box.width <= SNAP_MAX) {
        const m = leaning.get(hov as HTMLElement)!;
        // into the target's bottom-right corner, like the logo's orange cell, so it never covers the label
        tx = box.x + box.width - CORNER + m.x;
        ty = box.y + box.height - CORNER + m.y;
      } else if (fold) {
        tx = p.x + FOLD[0][0];
        ty = p.y + FOLD[0][1];
      }
      const ease = box || fold ? (motion ? 0.35 : 1) : 1;
      d.x += (tx - d.x) * ease;
      d.y += (ty - d.y) * ease;
      if (Math.abs(tx - d.x) < 0.05) d.x = tx;
      if (Math.abs(ty - d.y) < 0.05) d.y = ty;
      const shrink = down && !fold ? 0.7 : 1;
      if (dot.current) dot.current.style.transform = `translate3d(${d.x}px, ${d.y}px, 0) scale(${shrink})`;

      // F · Trail: each cell chases the one before it; on hover three fold into the 2x2 map.
      if (style === "f") {
        trail.forEach((c, i) => {
          const fx = fold && i < 3 ? p.x + FOLD[i + 1][0] : fold ? d.x : i === 0 ? d.x : trail[i - 1].x;
          const fy = fold && i < 3 ? p.y + FOLD[i + 1][1] : fold ? d.y : i === 0 ? d.y : trail[i - 1].y;
          const k = motion ? (fold ? 0.35 : 0.45) : 1;
          c.x += (fx - c.x) * k;
          c.y += (fy - c.y) * k;
          const el = cells.current[i];
          if (el) el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
        });
      }

      if (tag.current) {
        const kind = tag.current.dataset.kind;
        const [ox, oy] = kind === "drag" ? [14, 14] : kind === "code" ? [12, 8] : [11, 0];
        tag.current.style.transform = `translate3d(${d.x + ox}px, ${d.y + oy}px, 0)`;
      }
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
      delete root.dataset.cursorDown;
    };
  }, []);

  return (
    <div ref={layer} className="cursor-layer" aria-hidden>
      <div ref={scanBox} className="cursor-scan">
        <div className="cursor-scan-line" />
      </div>
      {Array.from({ length: TRAIL }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            cells.current[i] = el;
          }}
          className="cursor-trail"
          data-i={i}
        />
      ))}
      <div ref={dot} className="cursor-dot" />
      <div ref={tag} className="cursor-tag font-mono" data-kind="" />
    </div>
  );
}
