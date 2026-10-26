"use client";

import { useSyncExternalStore } from "react";
import { projects } from "@/content/projects";
import { Decode, Stage, d } from "@/components/brand/motion";
import { pad } from "@/components/brand/tokens";
import type { Fit } from "@/app/api/fit/route";

const noop = () => () => {};

// When a recruiter arrives from the fit check (?for=role), lead with what matters for their role.
export default function Tailored() {
  const raw = useSyncExternalStore(
    noop,
    () => {
      try {
        return new URLSearchParams(location.search).has("for") ? sessionStorage.getItem("hg:fit") : null;
      } catch {
        return null;
      }
    },
    () => null
  );
  if (!raw) return null;
  let fit: Fit;
  try {
    fit = JSON.parse(raw);
  } catch {
    return null;
  }
  const picks = fit.slugs.map((s) => projects.find((p) => p.slug === s)).filter((p) => !!p);

  return (
    <Stage motion className="mt-8">
      {(run) => (
        <section className="dsa-frame border-2 border-ink break-inside-avoid" style={d(0)}>
          <div className="relative flex items-center justify-between gap-4 px-4 py-2 font-mono text-[12px] text-paper sm:px-5">
            <span className="dsa-x ds-bar absolute inset-0 bg-ink" style={d(120)} />
            <span className="relative">
              <Decode text="Prepared for" run={run} delay={250} />
            </span>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h2 className="min-w-0 text-[22px] font-semibold leading-tight">
                <Decode text={fit.role} run={run} delay={300} dur={400} />
              </h2>
              <button type="button" onClick={() => window.print()} className="x-btn x-primary dsa-rise font-mono print:hidden" style={d(450)}>
                Save as PDF <span className="x-arrow">↓</span>
              </button>
            </div>
            <p className="dsa-rise mt-2 text-[15px] leading-relaxed text-graphite" style={d(500)}>
              {fit.summary}
            </p>
            <ul className="mt-3 border-t border-rule">
              {fit.strengths.map((s, i) => (
                <li key={s} className="grid grid-cols-[14px_1fr] gap-1.5 border-b border-rule py-2 text-[15px] leading-relaxed">
                  <span className="dsa-pop mt-[0.62em] h-[6px] w-[6px] bg-ink" style={d(600 + i * 90)} />
                  <span className="dsa-wipe" style={d(620 + i * 90)}>
                    {s}
                  </span>
                </li>
              ))}
            </ul>
            {picks.length > 0 && (
              <>
                <p className="dsa-rise mt-5 text-[15px] font-semibold" style={d(700 + fit.strengths.length * 90)}>
                  Most relevant work
                </p>
                {/* each row jumps to the project further down the sheet */}
                <div className="mt-1.5 border-t-2 border-ink">
                  {picks.map((p, i) => (
                    <a
                      key={p.slug}
                      href={`#${p.slug}`}
                      className="x-row dsa-wipe grid grid-cols-[36px_1fr_auto] items-center gap-3 sm:grid-cols-[40px_1fr_auto_18px] border-b border-rule px-2 py-2.5"
                      style={d(760 + fit.strengths.length * 90 + i * 90)}
                    >
                      <span className="x-mute font-mono text-[13px] text-graphite">P{pad(projects.indexOf(p) + 1)}</span>
                      <span className="min-w-0 text-[15px] font-medium leading-snug">{p.name}</span>
                      <span className="font-mono text-[14px] font-semibold">{p.headline.value}</span>
                      <span className="x-arrow hidden sm:inline print:hidden">→</span>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}
    </Stage>
  );
}
