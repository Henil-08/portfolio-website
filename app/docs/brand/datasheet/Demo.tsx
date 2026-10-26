"use client";

// The Datasheet direction on its own, with the boot animation switchable on and off and the
// card stepping through every project (buttons or the arrow keys), like a loadout screen.
import Link from "next/link";
import { useEffect, useState } from "react";
import { projects } from "@/content/projects";
import { ChipMark, DsCard, DsLabel, DsResume, MotionStyles, dsMono } from "./parts";

const START = Math.max(0, projects.findIndex((p) => p.slug === "rtl-coverage-agents"));

export default function Demo() {
  const [motion, setMotion] = useState(true);
  const [index, setIndex] = useState(START);
  const [take, setTake] = useState(0);
  const nav = (dir: -1 | 1) => setIndex((i) => (i + dir + projects.length) % projects.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + projects.length) % projects.length);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % projects.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const k = `${motion}-${take}`;
  return (
    <main className="min-h-screen bg-[#f3f2ed] pb-20 text-[#111]" style={{ fontFamily: "var(--b-plex)" }}>
      <MotionStyles />
      <div className={`${dsMono} sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-[#111] px-4 py-2.5 text-[12px] text-[#f3f2ed] sm:px-8`}>
        <Link href="/docs/brand" className="text-[#f3f2ed]/70 transition hover:text-white">
          ← All directions
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex border border-[#f3f2ed]/30">
            {(
              [
                [true, "Animated"],
                [false, "Static"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setMotion(m)}
                className={`px-3 py-1 transition ${motion === m ? "bg-[#ff4f00] text-[#111]" : "text-[#f3f2ed]/70 hover:text-white"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTake((t) => t + 1)}
            disabled={!motion}
            className="border border-[#f3f2ed]/30 px-3 py-1 transition hover:border-white disabled:opacity-30"
          >
            ↻ Replay
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] px-4 pt-10 sm:px-8 sm:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-[3px] border-[#111] pb-4">
          <div className="flex items-center gap-4">
            <ChipMark key={k} motion={motion} />
            <div>
              <p className={`${dsMono} text-[12px] text-[#5d5d58]`}>Direction 1 · {motion ? "with motion" : "without motion"}</p>
              <h1 className="text-[34px] font-semibold leading-none tracking-tight sm:text-[44px]">Datasheet</h1>
            </div>
          </div>
          <p className={`${dsMono} max-w-sm text-right text-[12px] leading-relaxed text-[#5d5d58]`}>
            Step through projects with ← → or the card&rsquo;s footer. {motion ? "Each one boots in; hover the card for the selection brackets." : "Same layout, no motion."}
          </p>
        </div>

        <p className={`${dsMono} mb-3 mt-10 text-[12px] uppercase tracking-[0.1em] text-[#5d5d58]`}>Project card</p>
        <DsCard key={`${k}-${index}`} index={index} motion={motion} onNav={nav} />

        <div className="mt-16 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <p className={`${dsMono} mb-3 text-[12px] uppercase tracking-[0.1em] text-[#5d5d58]`}>Resume (first page)</p>
            <DsResume key={k} motion={motion} />
          </div>
          <div>
            <p className={`${dsMono} mb-3 text-[12px] uppercase tracking-[0.1em] text-[#5d5d58]`}>In the world: a zone label</p>
            <DsLabel key={k} motion={motion} />
          </div>
        </div>
      </div>
    </main>
  );
}
