"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { setState, useWorld } from "@/components/world/store";
import { unlockAudio } from "@/components/world/sound";
import Boot from "./Boot";

// The start: the world loads behind the boot screen (Boot.tsx, driven by world/Reveal.tsx);
// when it is ready it opens in a small circle round the car. One click or key
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
    // Enter, or just start driving, or click anywhere but the sound toggle and links.
    const k = (e: KeyboardEvent) => {
      if (opened && ["Enter", "Space", "KeyW", "ArrowUp"].includes(e.code)) start();
    };
    const c = (e: PointerEvent) => {
      if (!opened || (e.target as HTMLElement | null)?.closest("button, a")) return;
      start();
    };
    window.addEventListener("keydown", k);
    window.addEventListener("pointerdown", c);
    return () => {
      window.removeEventListener("keydown", k);
      window.removeEventListener("pointerdown", c);
    };
  }, [opened, start]);

  return (
    <AnimatePresence>
      {phase !== "world" && !leaving && (
        <motion.div
          key="start"
          className={`pointer-events-none fixed inset-0 z-50 ${opened ? "cursor-pointer" : ""}`}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          <Boot />
          <a href="/resume" onClick={(e) => e.stopPropagation()} className="x-link pointer-events-auto absolute left-5 top-4 font-mono text-[12px] text-ink">
            Resume ↗
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
