"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { setState, useWorld } from "@/components/world/store";
import { unlockAudio } from "@/components/world/sound";

// A single start screen, like Bruno's: the world loads behind it, one click starts
// it (browsers need that click before audio can play). ?skip goes straight in.
export default function Intro() {
  const phase = useWorld((s) => s.phase);
  const ready = useWorld((s) => s.ready);
  const [leaving, setLeaving] = useState(false);

  const start = useCallback(() => {
    if (leaving) return;
    unlockAudio();
    setLeaving(true);
    setState({ phase: "world" });
  }, [leaving]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("skip")) {
      const t = setTimeout(() => {
        setLeaving(true);
        setState({ phase: "world" });
      }, 0);
      return () => clearTimeout(t);
    }
    // Bruno's keys: Enter, or just start driving.
    const k = (e: KeyboardEvent) => {
      if (ready && ["Enter", "Space", "KeyW", "ArrowUp"].includes(e.code)) start();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [ready, start]);

  // Loading: a dark screen. Ready: the screen clears and the world shows only in
  // the reveal circle round the car (Reveal.tsx); a quiet title and the prompt sit
  // at the bottom. Start: the circle sweeps out and the camera eases back.
  return (
    <AnimatePresence>
      {phase !== "world" && !leaving && (
        <motion.div
          key="start"
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-end pb-[9vh] text-white"
          initial={false}
          animate={{ backgroundColor: ready ? "rgba(29,23,33,0)" : "rgba(29,23,33,1)" }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          onClick={() => ready && start()}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          <a
            href="/resume"
            onClick={(e) => e.stopPropagation()}
            className="absolute left-5 top-5 px-1 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/60 transition hover:text-white"
          >
            Resume
          </a>
          <p className="font-racing text-[clamp(1.4rem,3.6vw,2.6rem)] leading-none tracking-wide">
            HENIL <span className="text-[#e10600]">GAJJAR</span>
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">AI/ML Software Engineer · Boston</p>
          <div className="mt-7 h-8">
            {ready ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.6 }}
                className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-white/80"
              >
                <kbd className="grid h-6 min-w-6 place-items-center border border-white/50 px-1.5 text-[10px]">Enter</kbd>
                to start
              </motion.p>
            ) : (
              <div className="h-[2px] w-40 overflow-hidden bg-white/10">
                <motion.div
                  className="h-full w-1/3 bg-[#e88eff]"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            )}
          </div>
          <p className="absolute bottom-5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">Sound on</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Spark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x="11" y="1.5" width="2" height="9" rx="1" transform={`rotate(${i * 45} 12 12)`} />
      ))}
    </svg>
  );
}
