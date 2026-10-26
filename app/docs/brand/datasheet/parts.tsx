"use client";

// The Datasheet direction's pieces: the chip mark, the project card, the resume page and
// the in-world label. With `motion` on they boot in like a game's loadout screen: frames
// draw, text decodes, figures count up, a scan line passes once. Off, they render still.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { profile, stats } from "@/content/profile";
import { experience } from "@/content/experience";
import { DOMAINS, projects } from "@/content/projects";

import { DS, Figures, LINKS, dsMono, pad } from "./shared";

/* ------------------------------------------------------------------ motion */

/** Animation delay for one element, read by the dsa-* rules below. */
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Starts once the element scrolls into view (and only when motion is on). */
function useRun<T extends Element>(on: boolean) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!on || !ref.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.2 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [on]);
  return [ref, on && seen] as const;
}

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#/<>";

/** Text that decodes left to right through random glyphs. */
function Decode({ text, run, delay = 0, dur = 450 }: { text: string; run: boolean; delay?: number; dur?: number }) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const k = Math.max(0, (now - t0) / dur);
      const n = Math.floor(Math.min(1, k) * text.length);
      let s = text.slice(0, n);
      if (k > 0 && k < 1) for (let i = n; i < Math.min(text.length, n + 3); i++) s += text[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      setOut(s);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, run, delay, dur]);
  return <Hold text={text} shown={run ? out : null} />;
}

/** A figure that counts up to its value ("43", "10 / 10", "20K+", "17.3%"); words decode instead. */
function Count({ value, run, delay = 0, dur = 700 }: { value: string; run: boolean; delay?: number; dur?: number }) {
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

/** Keeps the final text's box so the layout never jumps while it animates. */
function Hold({ text, shown }: { text: string; shown: string | null }) {
  if (shown === null) return <>{text}</>;
  return (
    <span className="relative inline-block">
      <span className="invisible">{text}</span>
      <span className="absolute inset-0 whitespace-pre-wrap" aria-hidden>
        {shown}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

// Hidden while [data-anim] waits, played once [data-run] is set. Static mode sets neither.
const CSS = `
[data-anim] .dsa-wipe{clip-path:inset(0 100% 0 0)}
[data-anim] .dsa-rise,[data-anim] .dsa-flicker,[data-anim] .dsa-scan{opacity:0}
[data-anim] .dsa-x{transform:scaleX(0);transform-origin:left}
[data-anim] .dsa-y{transform:scaleY(0);transform-origin:top}
[data-anim] .dsa-pop{transform:scale(0)}
[data-anim] .dsa-frame{clip-path:inset(0 0 100% 0)}
.dsa-pop{transform-box:fill-box;transform-origin:center}
[data-run] .dsa-wipe{animation:dsa-wipe .45s cubic-bezier(.2,.7,.2,1) var(--d,0ms) both}
[data-run] .dsa-rise{animation:dsa-rise .4s ease-out var(--d,0ms) both}
[data-run] .dsa-x{animation:dsa-x .5s cubic-bezier(.6,0,.2,1) var(--d,0ms) both}
[data-run] .dsa-y{animation:dsa-y .22s ease-out var(--d,0ms) both}
[data-run] .dsa-pop{animation:dsa-pop .28s cubic-bezier(.3,1.7,.5,1) var(--d,0ms) both}
[data-run] .dsa-frame{animation:dsa-frame .6s cubic-bezier(.6,0,.2,1) var(--d,0ms) both}
[data-run] .dsa-flicker{animation:dsa-flicker .55s steps(1,end) var(--d,0ms) both}
[data-run] .dsa-scan{animation:dsa-scan 1.2s cubic-bezier(.5,0,.5,1) var(--d,0ms) both}
[data-run] .dsa-blink{animation:dsa-blink 1.2s steps(1,end) 1.5s infinite}
@keyframes dsa-wipe{to{clip-path:inset(0 0 0 0)}}
@keyframes dsa-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes dsa-x{to{transform:scaleX(1)}}
@keyframes dsa-y{to{transform:scaleY(1)}}
@keyframes dsa-pop{to{transform:scale(1)}}
@keyframes dsa-frame{to{clip-path:inset(0 0 0 0)}}
@keyframes dsa-flicker{0%{opacity:0}15%{opacity:1}30%{opacity:.15}45%{opacity:1}60%{opacity:.4}75%,100%{opacity:1}}
@keyframes dsa-scan{0%{top:0;opacity:0}10%,85%{opacity:1}100%{top:100%;opacity:0}}
@keyframes dsa-blink{50%{opacity:0}}
[data-anim] .dsa-corner{position:absolute;width:14px;height:14px;border-color:${DS.orange};opacity:0;transition:opacity .15s,transform .2s;pointer-events:none}
[data-anim] .dsa-card:hover .dsa-corner{opacity:1;transform:translate(var(--cx),var(--cy))}
@media (prefers-reduced-motion:reduce){[data-run] *{animation-duration:1ms!important;animation-delay:0ms!important}}
`;

export function MotionStyles() {
  return <style>{CSS}</style>;
}

/** Wraps a block: data-anim while motion is on, data-run once it has scrolled into view. */
function Stage({ motion, className, children }: { motion: boolean; className?: string; children: (run: boolean) => ReactNode }) {
  const [ref, run] = useRun<HTMLDivElement>(motion);
  return (
    <div ref={ref} className={className} data-anim={motion ? "" : undefined} data-run={run ? "" : undefined}>
      {children(run)}
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

export function ChipMark({ size = 56, motion = false }: { size?: number; motion?: boolean }) {
  const pins = [10, 22, 34, 46];
  const [ref, run] = useRun<SVGSVGElement>(motion);
  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 56 56" aria-hidden data-anim={motion ? "" : undefined} data-run={run ? "" : undefined}>
      {pins.map((p, i) => (
        <g key={p} fill={DS.ink}>
          <rect className="dsa-pop" style={d(300 + i * 60)} x={p - 2} y="0" width="4" height="7" />
          <rect className="dsa-pop" style={d(360 + i * 60)} x="49" y={p - 2} width="7" height="4" />
          <rect className="dsa-pop" style={d(420 + i * 60)} x={p - 2} y="49" width="4" height="7" />
          <rect className="dsa-pop" style={d(480 + i * 60)} x="0" y={p - 2} width="7" height="4" />
        </g>
      ))}
      <rect className="dsa-frame" style={d(0)} x="7" y="7" width="42" height="42" fill={DS.ink} />
      <circle className="dsa-pop dsa-blink" style={d(700)} cx="14" cy="14" r="2.4" fill={DS.orange} />
      <text x="28" y="35" textAnchor="middle" fill={DS.paper} fontFamily="var(--b-plex)" fontWeight="600" fontSize="17" letterSpacing="-0.5">
        {motion ? <DecodeText text="HG" run={run} delay={450} /> : "HG"}
      </text>
    </svg>
  );
}

/** Decode for inside an SVG <text>, where the layout-holding spans can't go. */
function DecodeText({ text, run, delay }: { text: string; run: boolean; delay: number }) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const k = (now - t0) / 400;
      setOut(k <= 0 ? "" : k >= 1 ? text : text.slice(0, Math.floor(k * text.length)) + GLYPHS[(Math.random() * GLYPHS.length) | 0]);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, run, delay]);
  return <>{out}</>;
}

function DsHead({ n, children, at, run }: { n: string; children: ReactNode; at: number; run: boolean }) {
  return (
    <h4 className="relative mb-3 mt-7 flex items-baseline gap-3 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] first:mt-0">
      <span className={`${dsMono} dsa-pop inline-block text-[#ff4f00]`} style={d(at)}>
        {n}
      </span>
      <Decode text={String(children)} run={run} delay={at + 60} dur={300} />
      <span className="dsa-x absolute inset-x-0 bottom-0 h-px bg-[#111]" style={d(at)} />
    </h4>
  );
}

/** One project as a datasheet page. Remount it (key) to replay the boot. */
export function DsCard({ index, motion = false, onNav }: { index: number; motion?: boolean; onNav?: (dir: -1 | 1) => void }) {
  const p = projects[index];
  const prev = projects[(index + projects.length - 1) % projects.length];
  const next = projects[(index + 1) % projects.length];
  const domain = DOMAINS.find((x) => x.id === p.domain)!.label;
  const specs = p.specs ?? [[p.headline.label.charAt(0).toUpperCase() + p.headline.label.slice(1), p.headline.value]];
  const rowsEnd = 900 + specs.length * 90;
  const busAt = Math.max(rowsEnd, 1300);
  const srcAt = busAt + 400 + p.stack.length * 60;
  return (
    <Stage motion={motion}>
      {(run) => (
        <article className="dsa-card dsa-frame relative border-2 border-[#111] bg-white" style={d(0)}>
          {/* hover: selection brackets, the way a game menu marks the focused slot */}
          {(
            [
              ["-left-[7px] -top-[7px] border-l-2 border-t-2", "-3px", "-3px"],
              ["-right-[7px] -top-[7px] border-r-2 border-t-2", "3px", "-3px"],
              ["-bottom-[7px] -left-[7px] border-b-2 border-l-2", "-3px", "3px"],
              ["-bottom-[7px] -right-[7px] border-b-2 border-r-2", "3px", "3px"],
            ] as const
          ).map(([c, cx, cy]) => motion && <span key={c} className={`dsa-corner ${c}`} style={{ "--cx": cx, "--cy": cy } as CSSProperties} />)}
          {motion && <span className="dsa-scan absolute inset-x-0 z-10 h-[2px] bg-[#ff4f00] shadow-[0_0_12px_#ff4f00]" style={d(250)} />}

          <div className={`${dsMono} relative flex flex-wrap justify-between gap-x-6 gap-y-1 px-4 py-2 text-[12px] text-[#f3f2ed]`}>
            <span className="dsa-x absolute inset-0 bg-[#111]" style={d(150)} />
            <span className="relative">
              <Decode text={`HG-26 / P${pad(index + 1)}`} run={run} delay={350} />
            </span>
            <span className="relative text-[#f3f2ed]/60">
              <Decode text={domain} run={run} delay={450} />
            </span>
            <span className="relative">
              <Decode text="Project datasheet" run={run} delay={550} />
            </span>
          </div>

          <div className="grid md:grid-cols-[1.45fr_1fr]">
            <div className="relative min-w-0 p-5 sm:p-7">
              <span className="dsa-y absolute bottom-0 right-0 top-0 hidden w-[2px] bg-[#111] md:block" style={d(300)} />
              <h3 className="text-[30px] font-semibold leading-tight tracking-tight sm:text-[38px]">
                <Decode text={p.name} run={run} delay={400} dur={500} />
              </h3>
              <p className="dsa-rise mt-1 text-[17px] text-[#5d5d58]" style={d(750)}>
                {p.tagline}
              </p>
              <div className="mt-7">
                <DsHead n="1" at={700} run={run}>
                  Features
                </DsHead>
                <ul className="space-y-2.5 text-[15px] leading-relaxed">
                  {p.points.map((t, i) => (
                    <li key={t} className="grid grid-cols-[14px_1fr] gap-2">
                      <span className="dsa-pop mt-[0.55em] h-[7px] w-[7px] bg-[#111]" style={d(820 + i * 110)} />
                      <span className="dsa-wipe" style={d(850 + i * 110)}>
                        <Figures text={t} className="font-semibold" />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="min-w-0 border-t-2 border-[#111] p-5 sm:p-7 md:border-t-0">
              <DsHead n="2" at={750} run={run}>
                Key specifications
              </DsHead>
              <div className="text-[14.5px]">
                {specs.map(([k, v], i) => (
                  <div key={k} className="relative flex items-baseline justify-between gap-3 py-2">
                    <span className="dsa-rise text-[#5d5d58]" style={d(880 + i * 90)}>
                      {k}
                    </span>
                    <span className={`${dsMono} text-right text-[16px] font-semibold`}>
                      <Count value={v} run={run} delay={900 + i * 90} />
                    </span>
                    <span className="dsa-x absolute inset-x-0 bottom-0 h-px bg-[#cfcdc4]" style={d(860 + i * 90)} />
                  </div>
                ))}
              </div>
              <DsHead n="3" at={busAt - 100} run={run}>
                Built with
              </DsHead>
              {/* the stack hangs off one bus line, like a block diagram */}
              <div className="relative">
                <span className="dsa-x absolute inset-x-0 top-0 h-[2px] bg-[#111]" style={d(busAt)} />
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {p.stack.map((s, i) => (
                    <span key={s} className="relative mt-3">
                      <span className="dsa-y absolute -top-3 left-1/2 h-3 w-px bg-[#111]" style={d(busAt + 350 + i * 60)} />
                      <span className={`${dsMono} dsa-rise block border border-[#111] px-2 py-1 text-[12.5px]`} style={d(busAt + 420 + i * 60)}>
                        {s}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              {p.links.length > 0 && (
                <>
                  <DsHead n="4" at={srcAt} run={run}>
                    Source
                  </DsHead>
                  {p.links.map((l, i) => (
                    <a
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="dsa-wipe group flex items-center justify-between gap-4 border-b border-[#cfcdc4] py-2 text-[14.5px] hover:border-[#111]"
                      style={d(srcAt + 100 + i * 80)}
                    >
                      <span className="shrink-0 font-medium">{l.label}</span>
                      <span className={`${dsMono} truncate text-[12.5px] text-[#5d5d58] group-hover:text-[#ff4f00]`}>{l.href.replace("https://", "")} ↗</span>
                    </a>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className={`${dsMono} dsa-wipe flex items-center justify-between gap-4 border-t-2 border-[#111] text-[12px] text-[#5d5d58]`} style={d(500)}>
            <button type="button" onClick={() => onNav?.(-1)} disabled={!onNav} className="min-w-0 truncate px-4 py-2 text-left transition enabled:hover:bg-[#111] enabled:hover:text-white">
              ← {prev.name}
            </button>
            <span className="shrink-0">
              {pad(index + 1)} / {projects.length}
            </span>
            <button type="button" onClick={() => onNav?.(1)} disabled={!onNav} className="min-w-0 truncate px-4 py-2 text-right transition enabled:hover:bg-[#111] enabled:hover:text-white">
              {next.name} →
            </button>
          </div>
        </article>
      )}
    </Stage>
  );
}

export function DsResume({ motion = false }: { motion?: boolean }) {
  return (
    <Stage motion={motion}>
      {(run) => (
        <div className="dsa-frame border-2 border-[#111] bg-white p-5 sm:p-8" style={d(0)}>
          <div className="relative flex flex-wrap items-start justify-between gap-4 pb-4">
            <span className="dsa-x absolute inset-x-0 bottom-0 h-[3px] bg-[#111]" style={d(200)} />
            <div>
              <h3 className="text-[32px] font-semibold leading-none tracking-tight">
                <Decode text={profile.name} run={run} delay={250} />
              </h3>
              <p className="dsa-rise mt-2 text-[15px]" style={d(500)}>
                {profile.role}, {profile.company}
              </p>
            </div>
            <dl className={`${dsMono} grid grid-cols-[auto_auto] gap-x-3 text-[12px] leading-[1.7]`}>
              {LINKS.map(([k, v, h], i) => (
                <div key={k} className="contents">
                  <dt className="dsa-wipe text-[#5d5d58]" style={d(400 + i * 70)}>
                    {k}
                  </dt>
                  <dd className="dsa-wipe" style={d(440 + i * 70)}>
                    <a href={h} className="hover:text-[#ff4f00]">
                      {v}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative grid grid-cols-2 sm:grid-cols-5">
            <span className="dsa-x absolute inset-x-0 bottom-0 h-px bg-[#111]" style={d(500)} />
            {stats.map((s, i) => (
              <div key={s.label} className="border-b border-[#cfcdc4] py-3 pr-2 sm:border-b-0">
                <p className={`${dsMono} text-[20px] font-semibold`}>
                  <Count value={s.value} run={run} delay={550 + i * 90} />
                </p>
                <p className="dsa-rise text-[12px] leading-tight text-[#5d5d58]" style={d(600 + i * 90)}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-7">
            <DsHead n="1" at={900} run={run}>
              Experience
            </DsHead>
          </div>
          {experience.slice(0, 2).map((r, j) => (
            <div key={r.title} className="relative grid gap-x-6 py-3 sm:grid-cols-[130px_1fr]">
              <span className="dsa-x absolute inset-x-0 bottom-0 h-px bg-[#cfcdc4]" style={d(1000 + j * 400)} />
              <p className={`${dsMono} dsa-wipe text-[12px] leading-6 text-[#5d5d58]`} style={d(1000 + j * 400)}>
                {r.dates}
              </p>
              <div>
                <p className="dsa-wipe text-[15px] font-semibold" style={d(1050 + j * 400)}>
                  {r.title} <span className="font-normal text-[#5d5d58]">· {r.company}</span>
                </p>
                <ul className="mt-1.5 space-y-1 text-[14px] leading-relaxed">
                  {r.points.slice(0, 3).map((t, i) => (
                    <li key={t} className="grid grid-cols-[12px_1fr] gap-1.5">
                      <span className="dsa-pop mt-[0.6em] h-[5px] w-[5px] bg-[#111]" style={d(1100 + j * 400 + i * 90)} />
                      <span className="dsa-wipe" style={d(1120 + j * 400 + i * 90)}>
                        <Figures text={t} className="font-semibold" />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </Stage>
  );
}

export function DsLabel({ motion = false }: { motion?: boolean }) {
  return (
    <Stage motion={motion} className="bg-[#7d8a3a] p-6">
      {(run) => (
        <div className="dsa-flicker inline-flex items-stretch border-2 border-[#111] bg-white shadow-[4px_4px_0_#111]" style={d(200)}>
          <span className={`${dsMono} grid place-items-center bg-[#111] px-3 text-[14px] font-semibold text-white`}>E</span>
          <div className="px-3 py-2">
            <p className={`${dsMono} flex items-center gap-1.5 text-[11px] text-[#5d5d58]`}>
              <span className="dsa-blink h-1.5 w-1.5 rounded-full bg-[#ff4f00]" />
              <Decode text="Z03 · Garage" run={run} delay={450} />
            </p>
            <p className="text-[15px] font-semibold">
              <Count value={`${projects.length} projects`} run={run} delay={600} />
            </p>
          </div>
        </div>
      )}
    </Stage>
  );
}
