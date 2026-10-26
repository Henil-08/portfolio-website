"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { getState, useWorld } from "@/components/world/store";
import { reenterGarage, useOpening } from "@/components/world/bloom/state";
import Boot from "./Boot";

// The start sequence (docs/BRAND.md, 2026-10-26): the boot (Boot.tsx) while the world loads and
// warms its shaders, then the garage select (GarageSelect.tsx), the align and the Bloom
// (world/bloom/*), and driving. ?skip goes straight in. G in the world opens the garage again.
// The garage chrome loads with the world (it shares its modules), never during the boot.
const GarageSelect = dynamic(() => import("./GarageSelect"), { ssr: false });

export default function Intro() {
  const stage = useOpening((s) => s.stage);
  const ready = useWorld((s) => s.ready);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.code !== "KeyG" || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))) return;
      const s = getState();
      if (s.phase !== "world" || s.askOpen || s.menuOpen || s.zone || s.controlsOpen || s.settingsOpen) return;
      reenterGarage();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  return (
    <>
      {ready && <GarageSelect />}
      <AnimatePresence>
        {stage === "boot" && (
          <motion.div key="boot" className="pointer-events-none fixed inset-0 z-50" exit={{ opacity: 0, transition: { duration: 0.3 } }}>
            <Boot />
            <a href="/resume" className="x-link pointer-events-auto absolute left-5 top-4 font-mono text-[12px] text-ink">
              Resume ↗
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
