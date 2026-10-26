"use client";

// The map (M), docs/BRAND.md S04: the tactical map of the real island (components/brand/
// TacticalMap.tsx) with the car live on it, and a side panel: where you are, the objective
// (the nearest place you haven't opened yet), the legend and the achievements. Click a pin to
// go there (the wipe, world/Overlay.tsx).
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { carState } from "@/components/world/carState";
import { setState, useWorld } from "@/components/world/store";
import { wipeTo } from "@/components/world/Overlay";
import { zones, type ZoneId } from "@/components/world/layout";
import { ACHIEVEMENTS } from "@/content/achievements";
import TacticalMap, { Compass, gridRef } from "@/components/brand/TacticalMap";
import { Count, Decode, Stage, d } from "@/components/brand/motion";
import { pad } from "@/components/brand/tokens";

const nearest = (x: number, z: number, list = zones) => list.reduce((b, zn) => (Math.hypot(zn.pos[0] - x, zn.pos[1] - z) < Math.hypot(b.pos[0] - x, b.pos[1] - z) ? zn : b), list[0]);

export default function MapMenu() {
  const open = useWorld((s) => s.menuOpen);
  const found = useWorld((s) => s.found);
  const got = useWorld((s) => s.achievements);
  const close = () => setState({ menuOpen: false });
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 grid place-items-center bg-ink/30 p-3 pt-14 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={close}>
          <Stage motion className="w-full max-w-[1120px]">
            {(run) => (
              <div className="dsa-frame flex max-h-[calc(100svh-5rem)] flex-col border-2 border-ink bg-paper shadow-[4px_4px_0_var(--color-ink)] select-none" style={d(0)} onClick={(e) => e.stopPropagation()}>
                <div className="relative flex items-center gap-4 px-4 py-2 font-mono text-[12px] text-white">
                  <span className="dsa-x absolute inset-0 bg-ink" style={d(120)} />
                  <span className="relative">
                    <Decode text="HG-08 / MAP · The island" run={run} delay={250} />
                  </span>
                  <span className="relative ml-auto hidden items-center gap-1.5 text-white/70 sm:flex">
                    <span className="x-blink h-1.5 w-1.5 rounded-full bg-signal" /> Live
                  </span>
                  <button onClick={close} aria-label="Close map" className="relative flex items-center gap-1.5 transition hover:text-signal">
                    <span className="bg-white px-1.5 text-ink">Esc</span> Close
                  </button>
                </div>
                <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[1fr_300px] md:overflow-hidden">
                  <div className="relative aspect-square min-h-0 border-b-2 border-ink bg-[#e9e7e0] md:aspect-auto md:h-[min(calc(100svh-8rem),800px)] md:border-b-0 md:border-r-2">
                    <TacticalMap player="live" found={found} objective={objectiveFor(found)} onPick={(z) => wipeTo(z)} className="absolute inset-0 h-full w-full" />
                    <span className="dsa-scan pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-signal" style={d(150)} />
                    <Compass />
                  </div>
                  <Side run={run} found={found} got={got} />
                </div>
              </div>
            )}
          </Stage>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The nearest place to the car that hasn't been opened yet. */
function objectiveFor(found: ZoneId[]) {
  const left = zones.filter((z) => !found.includes(z.id));
  return left.length ? nearest(carState.pos.x, carState.pos.z, left).id : null;
}

function Head({ n, children, extra }: { n: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <h4 className="mb-1.5 flex items-baseline gap-3 border-b border-ink pb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em]">
      <span className="font-mono text-signal">{n}</span>
      {children}
      {extra && <span className="ml-auto font-mono text-[11.5px] font-normal normal-case text-graphite">{extra}</span>}
    </h4>
  );
}

function Side({ run, found, got }: { run: boolean; found: ZoneId[]; got: string[] }) {
  // position readout, refreshed a few times a second while the map is open
  const [pos, setPos] = useState({ x: carState.pos.x, z: carState.pos.z });
  useEffect(() => {
    const t = setInterval(() => setPos({ x: carState.pos.x, z: carState.pos.z }), 300);
    return () => clearInterval(t);
  }, []);
  const here = nearest(pos.x, pos.z);
  const goal = zones.find((z) => z.id === objectiveFor(found));
  const rows: [string, string][] = [
    ["You", gridRef(pos.x, pos.z)],
    ["Nearest", here.label],
    ...(goal ? ([["Objective", `${goal.label} · ${gridRef(goal.pos[0], goal.pos[1])}`], ["Distance", `${Math.round(Math.hypot(goal.pos[0] - pos.x, goal.pos[1] - pos.z))} m`]] as [string, string][]) : [["Objective", "Every place found"] as [string, string]]),
  ];
  return (
    <div className="min-h-0 overflow-y-auto bg-white p-4 text-[13px]">
      <Head n="1">Position</Head>
      {rows.map(([k, v], i) => (
        <div key={k} className="dsa-wipe flex justify-between gap-3 border-b border-rule py-1.5" style={d(500 + i * 70)}>
          <span className="text-graphite">{k}</span>
          <span className="truncate font-mono font-semibold">{v}</span>
        </div>
      ))}
      <div className="mt-5">
        <Head n="2" extra={`${found.length} / ${zones.length}`}>
          Places
        </Head>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 text-[12.5px]">
          {(
            [
              [<span key="t" className="h-2.5 w-5 border border-ink bg-[#c9c6bd]" />, "Track, pit lane"],
              [<span key="b" className="h-3 w-3 bg-ink/80" />, "Building"],
              [<span key="z" className="border border-ink px-0.5 font-mono text-[9px] font-semibold">Z</span>, "Place"],
              [<span key="o" className="h-3 w-3 rounded-full border-2 border-signal" />, "Objective"],
              [<span key="y" className="h-0 w-0 border-y-[5px] border-l-[9px] border-y-transparent border-l-signal" />, "You"],
              [<span key="s" className="h-2 w-2 bg-ink" />, "Opened"],
            ] as const
          ).map(([icon, t]) => (
            <span key={t} className="flex items-center gap-2">
              <span className="grid w-5 place-items-center">{icon}</span>
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <Head n="3" extra={<><Count value={String(got.length)} run={run} delay={500} /> / {ACHIEVEMENTS.length}</>}>
          Achievements
        </Head>
        {ACHIEVEMENTS.map((a, k) => {
          const on = got.includes(a.id);
          return (
            <div key={a.id} className="dsa-wipe grid grid-cols-[30px_1fr_10px] items-center gap-2 border-b border-rule py-1" style={d(700 + k * 50)}>
              <span className="font-mono text-[11px] text-graphite">A{pad(k + 1)}</span>
              <span className="min-w-0">
                <span className={`block truncate font-medium ${on ? "" : "text-graphite"}`}>{on ? a.name : "• • • • •"}</span>
                <span className="block truncate text-[11.5px] text-graphite">{a.how}</span>
              </span>
              <span className={`h-2 w-2 rounded-full ${on ? "bg-signal" : "border border-ink"}`} />
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={() => setState({ menuOpen: false, fitOpen: true })} className="x-btn x-primary">
          Hiring? Check the fit <span className="x-arrow">→</span>
        </button>
        <Link href="/resume" className="x-link text-[13px] font-semibold">
          One-page resume ↗
        </Link>
      </div>
    </div>
  );
}
