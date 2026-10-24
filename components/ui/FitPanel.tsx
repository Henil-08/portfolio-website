"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { openZone, setState, teleport, useWorld } from "@/components/world/store";
import { zoneById, type ZoneId } from "@/components/world/layout";
import { projects } from "@/content/projects";
import type { Fit } from "@/app/api/fit/route";

export const FIT_KEY = "hg:fit";

// Recruiters paste a job description; the engineer reads it against Henil's record.
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
        <motion.div
          className="fixed inset-0 z-40 grid place-items-center p-3 pt-14"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setState({ fitOpen: false })}
        >
          <motion.div
            initial={{ scale: 0.94, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="hud-panel no-scrollbar max-h-[84svh] w-full max-w-lg overflow-y-auto p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cream/55">Race strategy</p>
                <h2 className="mt-1 font-racing text-2xl tracking-wide">{fit ? fit.role.toUpperCase() : "FIT FOR YOUR ROLE"}</h2>
              </div>
              <button onClick={() => setState({ fitOpen: false })} className="hud-red grid h-9 w-9 shrink-0 place-items-center text-[14px] hover:brightness-110" aria-label="Close">
                ✕
              </button>
            </div>

            {!fit ? (
              <div className="mt-4 space-y-3">
                <p className="text-[14px] leading-relaxed text-cream/75">
                  Paste a job description. You&apos;ll get an honest read on the fit, the work that matters for it, and a lap
                  through the island built around it.
                </p>
                <textarea
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  rows={8}
                  maxLength={8000}
                  placeholder="Paste the job description here…"
                  className="w-full resize-none border border-cream/25 bg-[#171928] px-4 py-3 text-[14px] text-cream outline-none placeholder:text-cream/35 focus:border-cream/60"
                />
                {err && <p className="text-sm text-red">{err}</p>}
                <button
                  onClick={check}
                  disabled={busy || jd.trim().length < 40}
                  className="w-full bg-red py-3 text-[13.5px] font-semibold text-white disabled:opacity-40"
                >
                  {busy ? "READING THE BRIEF…" : "CHECK THE FIT"}
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-4">
                  <Dial v={fit.score} />
                  <p className="text-[14px] leading-relaxed text-cream/75">{fit.summary}</p>
                </div>
                <ul className="space-y-1.5">
                  {fit.strengths.map((s) => (
                    <li key={s} className="flex gap-2 text-[13.5px] leading-relaxed text-cream">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-green" />
                      {s}
                    </li>
                  ))}
                  {fit.gaps.map((g) => (
                    <li key={g} className="flex gap-2 text-[13.5px] leading-relaxed text-cream/65">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 border border-cream/50" />
                      {g}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-1.5">
                  {projects
                    .filter((p) => fit.slugs.includes(p.slug))
                    .map((p) => (
                      <span key={p.slug} className="hud-chip">
                        {p.name}
                      </span>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={drive} className="bg-red py-3 text-[13px] font-semibold text-white">
                    DRIVE THIS LAP
                  </button>
                  <a
                    href={`/resume?for=${encodeURIComponent(fit.role)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="grid place-items-center bg-cream py-3 text-[13px] font-semibold text-ink"
                  >
                    TAILORED PDF
                  </a>
                </div>
                <button onClick={() => setFit(null)} className="w-full text-center font-mono text-[11px] uppercase tracking-[0.12em] text-cream/55 hover:text-cream">
                  Try another role
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Dial({ v }: { v: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const color = v >= 80 ? "#9b6bff" : v >= 60 ? "#45c46b" : "#ffd23f"; // sector colours: purple, green, yellow
  return (
    <div className="relative grid h-20 w-20 shrink-0 place-items-center">
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#fff8ec26" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="butt" strokeDasharray={`${(v / 100) * c} ${c}`} />
      </svg>
      <span className="font-racing text-xl">{v}</span>
    </div>
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
      <div className="hud-panel flex items-center gap-2.5 py-1.5 pl-3.5 pr-1.5 text-[12.5px]">
        <span className="font-semibold">{lap.role}</span>
        <span className="font-mono text-[11px] text-cream/55">
          {lap.i + 1}/{lap.route.length}
        </span>
        <button onClick={go} className="bg-red px-3 py-1 text-[12px] font-semibold text-white">
          {next ? `${zoneById[next].label} →` : "Done"}
        </button>
        <button onClick={() => setState({ lap: null })} className="px-1.5 text-cream/55 hover:text-cream" aria-label="End lap">
          ✕
        </button>
      </div>
    </div>
  );
}
