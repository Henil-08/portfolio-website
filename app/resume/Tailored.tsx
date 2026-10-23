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
    <section className="mt-8 rounded-2xl border-2 border-ink/10 bg-cream/60 px-5 py-5 print:border-ink/30 print:bg-transparent">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">Prepared for</p>
        <button onClick={() => window.print()} className="rounded-full bg-ink px-4 py-1.5 text-[12px] font-semibold text-white print:hidden">
          Save as PDF
        </button>
      </div>
      <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">{fit.role}</h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{fit.summary}</p>
      <ul className="mt-3 space-y-1.5">
        {fit.strengths.map((s) => (
          <li key={s} className="relative pl-4 text-[14px] leading-relaxed text-ink before:absolute before:left-0 before:top-[0.65em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-red/80">
            {s}
          </li>
        ))}
      </ul>
      {picks.length > 0 && (
        <p className="mt-3 text-[13px] text-ink-soft">
          <span className="font-semibold text-ink">Most relevant work:</span> {picks.map((p) => p.name).join(" · ")}
        </p>
      )}
    </section>
  );
}
