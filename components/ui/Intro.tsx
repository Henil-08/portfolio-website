"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { setState, useWorld } from "@/components/world/store";
import { unlockAudio } from "@/components/world/sound";

// The start: the world loads behind a dark screen with only its loader ring
// (world/Reveal.tsx), then opens in a small circle round the car. One click or key
// starts it (browsers need that before audio can play). ?skip goes straight in.
export default function Intro() {
  const phase = useWorld((s) => s.phase);
  const opened = useWorld((s) => s.opened);
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
    // Enter, or just start driving.
    const k = (e: KeyboardEvent) => {
      if (opened && ["Enter", "Space", "KeyW", "ArrowUp"].includes(e.code)) start();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [opened, start]);

  return (
    <AnimatePresence>
      {phase !== "world" && !leaving && (
        <motion.div
          key="start"
          className="fixed inset-0 z-50 cursor-pointer"
          onClick={() => opened && start()}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          <a
            href="/resume"
            onClick={(e) => e.stopPropagation()}
            className="absolute left-5 top-5 px-1 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/60 transition hover:text-white"
          >
            Resume
          </a>
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
