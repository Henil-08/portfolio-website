"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { openZone, setState, teleport, useWorld } from "@/components/world/store";
import { zoneById, type ZoneId } from "@/components/world/layout";
import { projects } from "@/content/projects";
import type { Fit } from "@/app/api/fit/route";
import { Count, Decode, Stage, d } from "@/components/brand/motion";

export const FIT_KEY = "hg:fit";

// Recruiters paste a job description; the engineer reads it against Henil's record. A brand
// modal (docs/BRAND.md): ink bar, the score as a counted figure with a bar, rows for the read.
export default function FitPanel() {
  const open = useWorld((s) => s.fitOpen);
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [fit, setFit] = useState<Fit | null>(null);
  const [err, setErr] = useState("");

  const check = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/fit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jd }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setFit(data);
      try {
        sessionStorage.setItem(FIT_KEY, JSON.stringify(data));
      } catch {}
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    }
    setBusy(false);
  };

  const drive = () => {
    if (!fit?.route.length) return;
    const route = fit.route as ZoneId[];
    setState({ fitOpen: false, lap: { role: fit.role, route, i: 0 }, picks: { title: `For ${fit.role}`, slugs: fit.slugs } });
    teleport(route[0]);
    setTimeout(() => openZone(route[0]), 700);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 grid place-items-center bg-ink/30 p-3 pt-14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setState({ fitOpen: false })}>
          <Stage key={fit ? fit.role : "brief"} motion className="w-full max-w-lg">
            {(run) => (
              <div className="dsa-frame no-scrollbar max-h-[84svh] overflow-y-auto border-2 border-ink bg-white shadow-[4px_4px_0_var(--color-ink)]" style={d(0)} onClick={(e) => e.stopPropagation()}>
                <div className="relative flex items-center px-4 py-2 font-mono text-[12px] text-white">
                  <span className="dsa-x absolute inset-0 bg-ink" style={d(80)} />
                  <span className="relative">
                    <Decode text="HG-08 / Fit check" run={run} delay={200} />
                  </span>
                  <button onClick={() => setState({ fitOpen: false })} className="relative ml-auto flex items-center gap-1.5 transition hover:text-signal" aria-label="Close">
                    <span className="bg-white px-1.5 text-ink">Esc</span> Close
                  </button>
                </div>
                <div className="p-5 sm:p-6">
                  <h2 className="text-[24px] font-semibold leading-tight tracking-tight">
                    <Decode text={fit ? fit.role : "Fit for your role"} run={run} delay={300} />
                  </h2>
                  {!fit ? (
                    <div className="mt-3 space-y-3">
                      <p className="text-[14.5px] leading-relaxed text-graphite">
                        Paste a job description. You&apos;ll get an honest read on the fit, the work that matters for it, and a lap through the island built around it.
                      </p>
                      <textarea
                        value={jd}
                        onChange={(e) => setJd(e.target.value)}
                        rows={8}
                        maxLength={8000}
                        placeholder="Paste the job description here…"
                        className="w-full resize-none border-2 border-ink bg-paper px-3 py-2.5 text-[14px] caret-signal outline-none placeholder:text-graphite"
                      />
                      {err && <p className="font-mono text-[12.5px] text-signal">{err}</p>}
                      <button onClick={check} disabled={busy || jd.trim().length < 40} className="x-btn x-primary w-full justify-center disabled:opacity-40">
                        {busy ? "Reading the brief…" : "Check the fit"} <span className="x-arrow">→</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-5">
                      <div className="grid grid-cols-[auto_1fr] items-center gap-4">
                        <div>
                          <p className="font-mono text-[40px] font-semibold leading-none text-signal">
                            <Count value={String(fit.score)} run={run} delay={300} />
                          </p>
                          <p className="font-mono text-[11px] text-graphite">fit / 100</p>
                        </div>
                        <div>
                          <div className="h-2 border border-ink">
                            <span className="dsa-x block h-full bg-ink" style={{ ...d(300), width: `${fit.score}%` }} />
                          </div>
                          <p className="mt-2 text-[14px] leading-relaxed">{fit.summary}</p>
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 flex items-baseline gap-3 border-b border-ink pb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.06em]">
                          <span className="font-mono text-signal">1</span>The read
                        </p>
                        {fit.strengths.map((x, i) => (
                          <p key={x} className="dsa-wipe grid grid-cols-[14px_1fr] gap-2 border-b border-rule py-2 text-[13.5px] leading-relaxed" style={d(500 + i * 90)}>
                            <span className="mt-[0.45em] h-2 w-2 bg-ink" />
                            {x}
                          </p>
                        ))}
                        {fit.gaps.map((g, i) => (
                          <p key={g} className="dsa-wipe grid grid-cols-[14px_1fr] gap-2 border-b border-rule py-2 text-[13.5px] leading-relaxed text-graphite" style={d(500 + (fit.strengths.length + i) * 90)}>
                            <span className="mt-[0.45em] h-2 w-2 border border-ink" />
                            {g}
                          </p>
                        ))}
                      </div>
                      <div>
                        <p className="mb-2 flex items-baseline gap-3 border-b border-ink pb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.06em]">
                          <span className="font-mono text-signal">2</span>Work that matters
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {projects
                            .filter((p) => fit.slugs.includes(p.slug))
                            .map((p) => (
                              <span key={p.slug} className="x-chip">
                                {p.name}
                              </span>
                            ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button onClick={drive} className="x-btn x-primary">
                          Drive this lap <span className="x-arrow">→</span>
                        </button>
                        <a href={`/resume?for=${encodeURIComponent(fit.role)}`} target="_blank" rel="noreferrer" className="x-btn x-secondary">
                          Tailored PDF <span className="x-arrow">↗</span>
                        </a>
                      </div>
                      <button onClick={() => setFit(null)} className="x-link font-mono text-[12px]">
                        Try another role
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Stage>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// While driving a tailored lap: a small chip to hop to the next stop.
export function LapChip() {
  const lap = useWorld((s) => s.lap);
  if (!lap) return null;
  const next = lap.route[lap.i + 1];
  const go = () => {
    if (!next) return setState({ lap: null });
    setState({ lap: { ...lap, i: lap.i + 1 } });
    teleport(next);
    setTimeout(() => openZone(next), 700);
  };
  return (
    <div className="fixed left-1/2 top-[72px] z-20 -translate-x-1/2 sm:top-5">
      <div className="flex items-stretch border-2 border-ink bg-white text-[13px] shadow-[3px_3px_0_var(--color-ink)]">
        <span className="grid place-items-center bg-ink px-2.5 font-mono text-[11.5px] text-white">
          LAP {lap.i + 1}/{lap.route.length}
        </span>
        <span className="flex items-center px-3 font-semibold">{lap.role}</span>
        <button onClick={go} className="border-l-2 border-ink px-3 py-1.5 font-medium transition hover:bg-ink hover:text-white">
          {next ? `${zoneById[next].label} →` : "Done"}
        </button>
        <button onClick={() => setState({ lap: null })} className="border-l-2 border-ink px-2.5 font-mono text-[12px] transition hover:bg-ink hover:text-white" aria-label="End lap">
          Esc
        </button>
      </div>
    </div>
  );
}
