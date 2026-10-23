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
    const k = (e: KeyboardEvent) => {
      if (ready && (e.key === "Enter" || e.key === " ")) start();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [ready, start]);

  return (
    <AnimatePresence>
      {phase !== "world" && !leaving && (
        <motion.div
          key="start"
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-[#0d0d10] text-white"
          onClick={() => ready && start()}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
        >
          <a
            href="/resume"
            onClick={(e) => e.stopPropagation()}
            className="absolute left-5 top-5 rounded-full bg-white/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/80 transition hover:bg-white hover:text-black"
          >
            Resume
          </a>
          <p className="font-racing text-[clamp(2.4rem,8vw,5.5rem)] leading-none tracking-wide">
            HENIL <span className="text-[#e10600]">GAJJAR</span>
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">AI/ML Software Engineer · Boston</p>
          <div className="mt-12 h-10">
            {ready ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="font-racing text-sm tracking-[0.3em]"
              >
                CLICK TO START
              </motion.p>
            ) : (
              <div className="h-[2px] w-40 overflow-hidden rounded bg-white/10">
                <motion.div
                  className="h-full w-1/3 bg-[#e10600]"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            )}
          </div>
          <p className="absolute bottom-6 font-mono text-[10px] uppercase tracking-[0.25em] text-white/25">Sound on</p>
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
