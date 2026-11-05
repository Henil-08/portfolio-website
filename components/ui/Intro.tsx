"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useWorld } from "@/components/world/store";
import { useOpening } from "@/components/world/bloom/state";
import Boot from "./Boot";

// The start sequence (docs/BRAND.md, 2026-10-26): the boot (Boot.tsx) while the world loads and
// warms its shaders, then the garage select (GarageSelect.tsx), the align and the Bloom
// (world/bloom/*), and driving. ?skip goes straight in. It runs once: G in the world opens the
// quick garage over the game (garageParts.tsx `GaragePicker`).
// The garage chrome loads with the world (it shares its modules), never during the boot.
const GarageSelect = dynamic(() => import("./GarageSelect"), { ssr: false });

export default function Intro() {
  const stage = useOpening((s) => s.stage);
  const ready = useWorld((s) => s.ready);

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
