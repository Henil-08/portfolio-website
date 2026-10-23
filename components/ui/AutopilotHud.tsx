"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { getState, setState, useWorld } from "@/components/world/store";

export function toggleAutopilot(on?: boolean) {
  setState((s) => ({ autopilot: { ...s.autopilot, on: on ?? !s.autopilot.on } }));
}

// Live readout of the neuroevolution run. P toggles it (hidden on purpose).
export default function AutopilotHud() {
  const a = useWorld((s) => s.autopilot);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.code === "KeyP" && getState().phase === "world") toggleAutopilot();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const h = a.history;
  const max = Math.max(1, ...h);
  const pts = h.map((v, i) => `${(i / Math.max(1, h.length - 1)) * 100},${30 - (v / max) * 28}`).join(" ");

  return (
    <AnimatePresence>
      {a.on && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-24 right-3 z-20 w-[230px] rounded-2xl bg-[#121216]/92 p-4 text-white shadow-2xl backdrop-blur sm:right-5"
        >
          <div className="flex items-center justify-between">
            <span className="font-racing text-[11px] tracking-[0.18em] text-[#c9a7ff]">NEUROEVOLUTION</span>
            <button onClick={() => toggleAutopilot(false)} className="text-white/40 hover:text-white" aria-label="Stop">
              ✕
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 font-mono">
            <Stat k="Gen" v={a.gen} />
            <Stat k="Alive" v={`${a.alive}/40`} />
            <Stat k="Best" v={`${Math.round(Math.min(a.best, 1) * 100)}%`} />
          </div>
          <svg viewBox="0 0 100 32" className="mt-3 h-10 w-full" preserveAspectRatio="none">
            <polyline points={pts} fill="none" stroke="#b14cff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
          <p className="mt-2 text-[10.5px] leading-snug text-white/45">
            {a.best >= 1
              ? "A ghost can lap the circuit. It learned that from scratch, in your browser."
              : "40 tiny neural nets, evolving to lap the circuit."}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-widest text-white/40">{k}</p>
      <p className="text-[15px] tabular-nums">{v}</p>
    </div>
  );
}
