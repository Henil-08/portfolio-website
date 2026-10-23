"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { setState, useWorld } from "@/components/world/store";
import { fadeTheme, playTheme, radioLine, unlockAudio } from "@/components/world/sound";
import { profile } from "@/content/profile";

const IntroStage = dynamic(() => import("./IntroStage"), { ssr: false });

const STATS = [
  { v: "4+", l: "Years in industry" },
  { v: "7", l: "Papers" },
  { v: "2", l: "Patents" },
  { v: "50K", l: "App downloads" },
];

const KEY = "hg:intro-seen";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Beat = "boot" | "reveal-car" | "card" | "stats" | "radio" | "lights" | "out";
const order: Beat[] = ["boot", "reveal-car", "card", "stats", "radio", "lights", "out"];

export default function Intro() {
  const phase = useWorld((s) => s.phase);
  const [beat, setBeat] = useState<Beat>("boot");
  const [t0, setT0] = useState<number | null>(null);
  const [lights, setLights] = useState(0);
  const [seen] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  const cancelled = useRef(false);
  const at = (b: Beat) => order.indexOf(beat) >= order.indexOf(b);

  const reveal = useCallback(() => {
    cancelled.current = true;
    fadeTheme(1.5);
    setBeat("out");
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    setState({ phase: "world" });
  }, []);

  const start = useCallback(async () => {
    if (beat !== "boot") return;
    unlockAudio();
    if (seen) return reveal();
    cancelled.current = false;
    setState({ phase: "intro" });
    void playTheme();
    setT0(performance.now());
    setBeat("reveal-car");

    const steps: [number, () => void][] = [
      [3200, () => setBeat("card")],
      [2400, () => setBeat("stats")],
      [
        3000,
        () => {
          setBeat("radio");
          void radioLine("go");
        },
      ],
      [3600, () => setBeat("lights")],
    ];
    for (const [ms, fn] of steps) {
      await sleep(ms);
      if (cancelled.current) return;
      fn();
    }
    for (let i = 1; i <= 5; i++) {
      await sleep(560);
      if (cancelled.current) return;
      setLights(i);
    }
    await sleep(500 + Math.random() * 700);
    if (cancelled.current) return;
    setLights(0);
    await sleep(140);
    reveal();
  }, [beat, reveal, seen]);

  // ?skip drops you straight into the world (handy for sharing a direct link).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("skip")) {
      const t = setTimeout(reveal, 0);
      return () => clearTimeout(t);
    }
  }, [reveal]);

  useEffect(() => {
    if (beat !== "boot") return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") start();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [start, beat]);

  if (phase === "world" && beat === "out") return <Iris />;
  if (phase === "world") return null;

  return (
    <div className="fixed inset-0 z-50 cursor-pointer overflow-hidden bg-night text-white" onClick={start}>
      <IntroStage t0={t0} />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_35%,rgba(0,0,0,0.75))]" />

      <a
        href="/resume"
        onClick={(e) => e.stopPropagation()}
        className="absolute left-5 top-5 z-10 rounded-full bg-white/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/80 backdrop-blur transition hover:bg-white hover:text-black"
      >
        Resume
      </a>
      {beat !== "boot" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            reveal();
          }}
          className="absolute right-5 top-5 z-10 rounded-full border border-white/15 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/60 transition hover:border-white/40 hover:text-white"
        >
          Skip
        </button>
      )}

      <AnimatePresence>
        {beat === "boot" && (
          <motion.div
            key="boot"
            className="absolute inset-0 flex flex-col items-center justify-end pb-[14svh] text-center"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">Driver introduction</p>
            <p className="mt-4 font-racing text-[clamp(2.6rem,8vw,6rem)] leading-none tracking-wide">
              {seen ? "BACK ON TRACK" : "PRESS START"}
            </p>
            <p className="mt-4 text-sm text-white/45">{seen ? "Jump straight in." : "Sound on for the full intro."}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Broadcast lower third */}
      <AnimatePresence>
        {at("card") && beat !== "lights" && (
          <motion.div
            key="card"
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.7, ease: [0.7, 0, 0.2, 1] }}
            className="absolute bottom-[12svh] left-4 flex items-stretch shadow-2xl sm:left-12"
          >
            <div className="flex items-center bg-[#e10600] px-4 font-racing text-[clamp(2.4rem,6vw,4.4rem)] leading-none">08</div>
            <div className="bg-white px-5 py-3 text-[#111] sm:px-7 sm:py-4">
              <p className="font-racing text-[clamp(1.4rem,3.6vw,2.6rem)] leading-[0.95] tracking-wide">
                <span className="opacity-60">HENIL </span>GAJJAR
              </p>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[#555] sm:text-[11px]">
                {profile.role} · {profile.company} · {profile.location}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stat tiles */}
      <AnimatePresence>
        {at("stats") && beat !== "lights" && (
          <motion.div
            key="stats"
            exit={{ opacity: 0 }}
            className="absolute right-4 top-[16svh] grid grid-cols-2 gap-2 sm:bottom-[12svh] sm:right-12 sm:top-auto sm:grid-cols-4"
          >
            {STATS.map((s, i) => (
              <motion.div
                key={s.l}
                initial={{ rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                transition={{ delay: i * 0.18, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                className="min-w-[96px] bg-[#15151a]/90 px-4 py-3 backdrop-blur"
                style={{ transformPerspective: 600 }}
              >
                <p className="font-racing text-2xl leading-none text-white">{s.v}</p>
                <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/50">{s.l}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team radio */}
      <AnimatePresence>
        {(beat === "radio" || beat === "lights") && (
          <motion.div
            key="radio"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-4 top-[12svh] mx-auto max-w-xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded bg-[#e10600] px-2.5 py-1 font-racing text-[11px] tracking-[0.2em]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> TEAM RADIO
            </span>
            <p className="mt-4 font-racing text-[clamp(1.3rem,3.4vw,2.2rem)] leading-tight tracking-wide">
              &ldquo;COPY THAT. LIGHTS OUT WHENEVER YOU&apos;RE READY.&rdquo;
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start lights */}
      <AnimatePresence>
        {beat === "lights" && (
          <motion.div
            key="lights"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 bottom-[14svh] flex justify-center"
          >
            <div className="flex gap-2.5 rounded-2xl bg-[#0d0d10] p-3.5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] sm:gap-3.5 sm:p-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex flex-col gap-2 rounded-lg bg-[#1a1a1f] p-2">
                  {[0, 1].map((r) => (
                    <span
                      key={r}
                      className="block h-9 w-9 rounded-full sm:h-12 sm:w-12"
                      style={{
                        background: lights >= n ? "radial-gradient(circle at 40% 35%, #ff6a5c, #e10600 55%, #7a0300)" : "#2a2a30",
                        boxShadow: lights >= n ? "0 0 28px 6px rgba(225,6,0,0.65)" : "inset 0 2px 6px rgba(0,0,0,0.6)",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Black overlay that opens like a camera iris onto the world.
function Iris() {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <motion.div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{ x: "-50%", y: "-50%", boxShadow: "0 0 0 300vmax #0b0b10" }}
        initial={{ width: 0, height: 0 }}
        animate={{ width: "260vmax", height: "260vmax" }}
        transition={{ duration: 1.4, ease: [0.65, 0, 0.25, 1] }}
        onAnimationComplete={() => setGone(true)}
      />
    </div>
  );
}

export function Spark({ className = "", spin = false }: { className?: string; spin?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} ${spin ? "animate-[spin_8s_linear_infinite]" : ""}`} fill="currentColor" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x="11" y="1.5" width="2" height="9" rx="1" transform={`rotate(${i * 45} 12 12)`} />
      ))}
    </svg>
  );
}
