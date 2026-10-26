"use client";

// Motion helpers (docs/BRAND.md "Motion"). A block inside <Stage motion> gets data-anim while
// it waits and data-run once it is on screen; the dsa-* classes in globals.css then play with
// a per-element delay from d(ms). Decode and Count animate text and figures in place.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/* ------------------------------------------------------------------ motion */

/** Animation delay for one element, read by the dsa-* rules in globals.css. */
export const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Starts once the element scrolls into view (and only when motion is on). */
export function useRun<T extends Element>(on: boolean) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!on || !ref.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [on]);
  return [ref, on && seen] as const;
}

// Scramble glyphs keep the real character's case, so the text stays about the same width
// while it decodes (the wide M and W are left out on purpose).
const UPPER = "ABCDEFGHJKLNPRSTUVXYZ";
const LOWER = "abcdeghknopqrsuvxyz";
const DIGIT = "0123456789";
function glyph(ch: string) {
  const set = /[A-Z]/.test(ch) ? UPPER : /[a-z]/.test(ch) ? LOWER : /\d/.test(ch) ? DIGIT : "#/<>";
  return set[(Math.random() * set.length) | 0];
}

/** Text that decodes left to right through random glyphs. */
export function Decode({ text, run, delay = 0, dur = 450 }: { text: string; run: boolean; delay?: number; dur?: number }) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const k = Math.max(0, (now - t0) / dur);
      const n = Math.floor(Math.min(1, k) * text.length);
      let s = text.slice(0, n);
      if (k > 0 && k < 1) for (let i = n; i < Math.min(text.length, n + 3); i++) s += text[i] === " " ? " " : glyph(text[i]);
      setOut(s);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, run, delay, dur]);
  return <Hold text={text} shown={run ? out : null} />;
}

/** A figure that counts up to its value ("43", "10 / 10", "20K+", "17.3%"); words decode instead. */
export function Count({ value, run, delay = 0, dur = 700 }: { value: string; run: boolean; delay?: number; dur?: number }) {
  const m = value.match(/^([^\d]*)([\d.,]+)(.*)$/);
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!run || !m) return;
    const [, pre, num, post] = m;
    const target = parseFloat(num.replace(/,/g, ""));
    const dp = (num.split(".")[1] ?? "").length;
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / dur));
      const e = 1 - Math.pow(1 - k, 3);
      const v = (target * e).toFixed(dp);
      setOut(k <= 0 ? "" : pre + (num.includes(",") ? Number(v).toLocaleString("en-US") : v) + post);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // the match is derived from value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, run, delay, dur]);
  if (!m) return <Decode text={value} run={run} delay={delay} />;
  return <Hold text={value} shown={run ? out : null} />;
}

// Text that sits on one line stays on one line while it animates; text that wraps keeps wrapping.
// Measured from the invisible copy (its line boxes), set straight on the live copy.
function fit(el: HTMLSpanElement | null) {
  if (!el) return;
  const [ghost, live] = Array.from(el.children) as HTMLElement[];
  live.style.whiteSpace = ghost.getClientRects().length > 1 ? "pre-wrap" : "nowrap";
}

/** Keeps the final text's box so the layout never jumps while it animates. */
function Hold({ text, shown }: { text: string; shown: string | null }) {
  if (shown === null) return <>{text}</>;
  return (
    <span ref={fit} className="relative inline-block">
      <span className="invisible">{text}</span>
      <span className="absolute inset-0" aria-hidden>
        {shown}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

/** Wraps a block: data-anim while motion is on, data-run once it has scrolled into view. */
export function Stage({ motion, className, children }: { motion: boolean; className?: string; children: (run: boolean) => ReactNode }) {
  const [ref, run] = useRun<HTMLDivElement>(motion);
  return (
    <div ref={ref} className={className} data-anim={motion ? "" : undefined} data-run={run ? "" : undefined}>
      {children(run)}
    </div>
  );
}

