"use client";

import { useSyncExternalStore } from "react";
import { projects } from "@/content/projects";
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
    <section className="hud-panel border-l-2 border-red px-5 py-5 sm:px-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cream/55">Prepared for</p>
        <button onClick={() => window.print()} className="r-btn r-btn-red print:hidden">
          Save as PDF
        </button>
      </div>
      <h2 className="mt-1 font-racing text-[24px] uppercase tracking-wide">{fit.role}</h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-cream/75">{fit.summary}</p>
      <ul className="mt-3 space-y-1.5">
        {fit.strengths.map((s) => (
          <li key={s} className="relative pl-4 text-[14px] leading-relaxed text-cream before:absolute before:left-0 before:top-[0.62em] before:h-1.5 before:w-1.5 before:rotate-45 before:bg-green">
            {s}
          </li>
        ))}
      </ul>
      {picks.length > 0 && (
        <p className="mt-3 text-[13px] text-cream/65">
          <span className="font-semibold text-cream">Most relevant work:</span> {picks.map((p) => p.name).join(" · ")}
        </p>
      )}
    </section>
  );
}
