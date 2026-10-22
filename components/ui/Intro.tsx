"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { setState, useWorld } from "@/components/world/store";
import { radioLine, unlockAudio } from "@/components/world/sound";

const QUESTION = ["HEY", "CLAUDE,", "WHO'S", "HENIL?"];

type Line = { kind: "text"; text: string } | { kind: "tool"; name: string; arg: string; result: string };

const ANSWER: Line[] = [
  { kind: "tool", name: "Read", arg: "henil/profile.md", result: "4 chapters, 7 roles" },
  {
    kind: "text",
    text: "Henil is an ML engineer at Waters Corporation in Boston. He builds agents that do real work, and most of his job is giving models the right context and tools so they stop guessing.",
  },
  { kind: "tool", name: "Search", arg: 'projects "agents OR fine-tuning"', result: "17 projects across 5 domains" },
  {
    kind: "text",
    text: "Before that: founding engineer at a startup that made it onto Shark Tank India. Before that, a solar car that drove itself. Easier to show you than tell you.",
  },
];

const KEY = "hg:intro-seen";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Step = "boot" | "radio" | "claude" | "lights" | "reveal";

export default function Intro() {
  const phase = useWorld((s) => s.phase);
  const ready = useWorld((s) => s.ready);
  const [step, setStep] = useState<Step>("boot");
  const [words, setWords] = useState(0);
  const [talking, setTalking] = useState(false);
  const [lines, setLines] = useState<(Line & { shown: string; done: boolean })[]>([]);
  const [lights, setLights] = useState(0);
  const [seen] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  const cancelled = useRef(false);

  const reveal = useCallback(() => {
    cancelled.current = true;
    setStep("reveal");
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    setState({ phase: "world" });
  }, []);

  const start = useCallback(async () => {
    if (step !== "boot") return;
    unlockAudio();
    if (seen) return reveal();
    cancelled.current = false;
    setState({ phase: "intro" });
    setStep("radio");

    // Engineer on the radio. Words land in time with the clip.
    await sleep(250);
    setTalking(true);
    const dur = await radioLine("ask");
    const per = Math.max(260, ((dur || 3.6) * 1000 - 900) / QUESTION.length);
    await sleep(700);
    for (let i = 1; i <= QUESTION.length; i++) {
      if (cancelled.current) return;
      setWords(i);
      await sleep(per);
    }
    setTalking(false);
    await sleep(500);
    if (cancelled.current) return;

    // Claude answers.
    setStep("claude");
    await sleep(500);
    for (const l of ANSWER) {
      if (cancelled.current) return;
      setLines((ls) => [...ls, { ...l, shown: "", done: false }]);
      if (l.kind === "tool") {
        await sleep(550);
        setLines((ls) => ls.map((x, i) => (i === ls.length - 1 ? { ...x, done: true } : x)));
        await sleep(180);
      } else {
        for (const w of l.text.split(/(\s+)/)) {
          if (cancelled.current) return;
          setLines((ls) => ls.map((x, i) => (i === ls.length - 1 ? { ...x, shown: x.shown + w } : x)));
          await sleep(16 + Math.random() * 16);
        }
        setLines((ls) => ls.map((x, i) => (i === ls.length - 1 ? { ...x, done: true } : x)));
        await sleep(250);
      }
    }
    await sleep(700);
    if (cancelled.current) return;

    // "Copy that. Lights out whenever you're ready." Then the start sequence.
    setStep("lights");
    void radioLine("go");
    await sleep(3400);
    for (let i = 1; i <= 5; i++) {
      if (cancelled.current) return;
      setLights(i);
      await sleep(620);
    }
    await sleep(500 + Math.random() * 700);
    if (cancelled.current) return;
    setLights(0);
    await sleep(160);
    reveal();
  }, [reveal, seen, step]);

  // ?skip drops you straight into the world (handy for sharing a direct link).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("skip")) {
      const t = setTimeout(reveal, 0);
      return () => clearTimeout(t);
    }
  }, [reveal]);

  useEffect(() => {
    if (step !== "boot") return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") start();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [start, step]);

  if (phase === "world" && step === "reveal") return <Iris />;
  if (phase === "world") return null;

  return (
    <div className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-night px-5 text-white" onClick={start}>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(225,6,0,0.16),transparent_60%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:repeating-linear-gradient(0deg,#fff_0_1px,transparent_1px_3px)]" />

      <a
        href="/resume"
        onClick={(e) => e.stopPropagation()}
        className="absolute left-5 top-5 z-10 rounded-full bg-white/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/80 backdrop-blur transition hover:bg-white hover:text-black"
      >
        Resume
      </a>

      {step !== "boot" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            reveal();
          }}
          className="absolute right-5 top-5 z-10 rounded-full border border-white/15 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/55 transition hover:border-white/40 hover:text-white"
        >
          Skip
        </button>
      )}

      <AnimatePresence mode="wait">
        {step === "boot" && (
          <motion.div
            key="boot"
            className="relative flex flex-col items-center text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.6 }}
          >
            <RadioBadge live={false} />
            <p className="mt-8 font-racing text-[clamp(2.4rem,7vw,5rem)] leading-none tracking-wide">
              {seen ? "WELCOME BACK" : "INCOMING"}
            </p>
            <p className="mt-4 text-sm text-white/50">{seen ? "The car's where you left it." : "Sound on. Someone's asking about Henil."}</p>
            <span className="mt-10 inline-flex items-center gap-3 rounded-full bg-[#e10600] px-7 py-3.5 font-racing text-sm tracking-[0.18em] text-white shadow-[0_10px_40px_-10px_rgba(225,6,0,0.9)] transition hover:bg-[#ff1a12]">
              {ready ? (seen ? "JUMP BACK IN" : "OPEN RADIO") : "WARMING UP TYRES"}
            </span>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">or press enter</p>
          </motion.div>
        )}

        {(step === "radio" || step === "claude") && (
          <motion.div key="talk" className="relative flex w-full max-w-3xl flex-col items-center" exit={{ opacity: 0, scale: 0.98 }}>
            <motion.div layout transition={{ type: "spring", stiffness: 200, damping: 26 }} className="flex w-full flex-col items-center">
              <motion.div
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                transition={{ duration: 0.5, ease: [0.7, 0, 0.2, 1] }}
                className="flex items-center gap-3"
              >
                <RadioBadge live={talking} />
                <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/45">Engineer → Claude</span>
              </motion.div>

              <h1
                className={`mt-6 text-center font-racing leading-[0.95] tracking-wide transition-all duration-500 ${
                  step === "claude" ? "text-[clamp(1.8rem,4.5vw,3rem)]" : "text-[clamp(2.6rem,8vw,6.2rem)]"
                }`}
              >
                <span className="text-white/30">&ldquo;</span>
                {QUESTION.map((w, i) => (
                  <span key={w} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                    <motion.span
                      className="inline-block"
                      initial={{ y: "105%", opacity: 0, filter: "blur(10px)" }}
                      animate={i < words ? { y: "0%", opacity: 1, filter: "blur(0px)" } : {}}
                      transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
                    >
                      {w}
                    </motion.span>
                    {i < QUESTION.length - 1 && " "}
                  </span>
                ))}
                <span className="text-white/30">&rdquo;</span>
              </h1>

              <Waveform active={talking} />
            </motion.div>

            {step === "claude" && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className="mt-8 w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121216]/90 text-left shadow-[0_40px_120px_-40px_rgba(225,6,0,0.5)] backdrop-blur"
              >
                <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-3">
                  <Spark className="h-4 w-4 text-[#d97757]" />
                  <span className="font-mono text-[12px] text-white/70">claude</span>
                  <span className="ml-auto font-mono text-[11px] text-white/25">~/henil</span>
                </div>
                <div className="space-y-3 px-5 py-5 font-mono text-[13px] leading-relaxed sm:text-[13.5px]">
                  {lines.map((l, i) =>
                    l.kind === "tool" ? (
                      <div key={i}>
                        <p>
                          <span className={l.done ? "text-[#4ade80]" : "animate-pulse text-[#facc15]"}>●</span>{" "}
                          <span className="font-semibold text-white">{l.name}</span>
                          <span className="text-white/40">({l.arg})</span>
                        </p>
                        {l.done && <p className="pl-4 text-white/35">⎿ {l.result}</p>}
                      </div>
                    ) : (
                      <p key={i} className={`text-white/85 ${l.done ? "" : "caret"}`}>
                        {l.shown}
                      </p>
                    )
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {step === "lights" && (
          <motion.div
            key="lights"
            className="relative flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <RadioBadge live={lights === 0} />
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/45">Engineer</span>
            </div>
            <p className="mt-5 text-center font-racing text-[clamp(1.6rem,4vw,2.6rem)] tracking-wide text-white/90">
              &ldquo;COPY THAT. LIGHTS OUT WHENEVER YOU&apos;RE READY.&rdquo;
            </p>
            <div className="mt-12 flex gap-3 rounded-2xl bg-[#111] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] sm:gap-4 sm:p-5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex flex-col gap-2 rounded-lg bg-[#1b1b1f] p-2">
                  {[0, 1].map((r) => (
                    <span
                      key={r}
                      className="block h-9 w-9 rounded-full transition-all duration-100 sm:h-12 sm:w-12"
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

function RadioBadge({ live }: { live: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md bg-[#e10600] px-2.5 py-1 font-racing text-[11px] tracking-[0.2em] text-white">
      <span className="relative flex h-2 w-2">
        {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      TEAM RADIO
    </span>
  );
}

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="mt-8 flex h-8 items-center gap-[3px]" aria-hidden>
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="w-[2px] rounded-full bg-[#e10600]"
          style={{
            height: `${18 + Math.abs(Math.sin(i * 1.3) * Math.cos(i * 0.7)) * 82}%`,
            transform: active ? undefined : "scaleY(0.12)",
            opacity: active ? 0.95 : 0.3,
            transition: "transform 300ms, opacity 300ms",
            animation: active ? `wv ${0.45 + (i % 5) * 0.08}s ease-in-out ${i * 0.02}s infinite alternate` : "none",
          }}
        />
      ))}
      <style>{`@keyframes wv { from { transform: scaleY(0.2) } to { transform: scaleY(1) } }`}</style>
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
        transition={{ duration: 1.5, ease: [0.65, 0, 0.25, 1] }}
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
