"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { setState, useWorld } from "@/components/world/store";
import { radioSay, squelch, unlockAudio, cheer } from "@/components/world/sound";

const QUESTION = "hey claude, who's henil?";

type Line = { kind: "text"; text: string } | { kind: "tool"; name: string; arg: string; result: string };

const ANSWER: Line[] = [
  { kind: "tool", name: "Read", arg: "henil/profile.md", result: "4 chapters, 7 roles" },
  {
    kind: "text",
    text: "Henil is an ML engineer at Waters Corporation in Boston. He builds agents that do real work, and most of his job is giving models the right context and tools so they stop guessing.",
  },
  { kind: "tool", name: "Search", arg: 'projects "agents OR fine-tuning"', result: "11 projects, 2 side quests" },
  {
    kind: "text",
    text: "Before that: founding engineer at a startup that made it onto Shark Tank India. Before that, a solar car that drove itself.",
  },
  { kind: "text", text: "Honestly, it's easier to show you. Hop in." },
];

const KEY = "hg:intro-seen";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Intro() {
  const phase = useWorld((s) => s.phase);
  const ready = useWorld((s) => s.ready);
  const [step, setStep] = useState<"boot" | "ask" | "claude" | "reveal">("boot");
  const [typed, setTyped] = useState("");
  const [lines, setLines] = useState<(Line & { shown: string; done: boolean })[]>([]);
  const [seen] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  const cancelled = useRef(false);

  const reveal = useCallback(async () => {
    cancelled.current = true;
    setStep("reveal");
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    await sleep(80);
    setState({ phase: "world" });
  }, []);

  const start = useCallback(async () => {
    if (step !== "boot") return;
    unlockAudio();
    if (seen) return reveal();
    cancelled.current = false;
    setState({ phase: "intro" });
    setStep("ask");
    await sleep(500);
    radioSay("Radio check. Hey Claude... who's Henil?", 1);
    for (const ch of QUESTION) {
      if (cancelled.current) return;
      setTyped((t) => t + ch);
      await sleep(45 + Math.random() * 45);
    }
    await sleep(700);
    if (cancelled.current) return;
    squelch(true);
    setStep("claude");
    await sleep(450);

    for (const l of ANSWER) {
      if (cancelled.current) return;
      setLines((ls) => [...ls, { ...l, shown: "", done: false }]);
      if (l.kind === "tool") {
        await sleep(600);
        setLines((ls) => ls.map((x, i) => (i === ls.length - 1 ? { ...x, done: true } : x)));
        await sleep(200);
      } else {
        const words = l.text.split(/(\s+)/);
        for (const w of words) {
          if (cancelled.current) return;
          setLines((ls) => ls.map((x, i) => (i === ls.length - 1 ? { ...x, shown: x.shown + w } : x)));
          await sleep(22 + Math.random() * 20);
        }
        setLines((ls) => ls.map((x, i) => (i === ls.length - 1 ? { ...x, done: true } : x)));
        await sleep(260);
      }
    }
    await sleep(900);
    if (cancelled.current) return;
    cheer();
    reveal();
  }, [reveal, seen, step]);

  // ?skip drops you straight into the world (handy for sharing a direct link).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("skip")) {
      const t = setTimeout(reveal, 0);
      return () => clearTimeout(t);
    }
  }, [reveal]);

  // Any key or click starts it.
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
    <div
      className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-night px-5 text-cream"
      onClick={start}
    >
      {step !== "boot" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            reveal();
          }}
          className="absolute right-5 top-5 rounded-full border border-white/15 px-4 py-1.5 font-mono text-xs text-white/60 transition hover:border-white/40 hover:text-white"
        >
          skip intro
        </button>
      )}

      <AnimatePresence mode="wait">
        {step === "boot" && (
          <motion.div
            key="boot"
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.6 }}
          >
            <Spark className="h-10 w-10 text-red" spin />
            <p className="mt-8 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {seen ? "Welcome back." : "Someone's on the radio."}
            </p>
            <p className="mt-3 text-white/55">{seen ? "The car's where you left it." : "Turn your sound on."}</p>
            <span className="toy-btn mt-10 rounded-full bg-red px-7 py-3.5 font-display text-lg font-semibold text-white">
              {ready ? (seen ? "Jump back in" : "Press to listen") : "Warming up the tyres…"}
            </span>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-white/35">
              or press enter
            </p>
          </motion.div>
        )}

        {(step === "ask" || step === "claude") && (
          <motion.div
            key="talk"
            className="flex w-full max-w-2xl flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div layout className="flex flex-col items-center">
              <Waveform active={step === "ask"} />
              <p className="mt-6 text-center font-display text-[clamp(2.2rem,7vw,4.6rem)] font-semibold leading-[1.02] tracking-tight">
                <span className={step === "ask" ? "caret" : ""}>{typed}</span>
              </p>
            </motion.div>

            {step === "claude" && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 40, scale: 0.92, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="mt-10 w-full overflow-hidden rounded-3xl border border-white/10 bg-[#16161c] text-left shadow-[0_40px_120px_-30px_rgba(255,75,62,0.55)]"
              >
                <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-5 py-3.5">
                  <Spark className="h-4 w-4 text-[#e8825f]" />
                  <span className="font-mono text-xs text-white/70">claude</span>
                  <span className="ml-auto font-mono text-[11px] text-white/30">~/henil</span>
                </div>
                <div className="space-y-3.5 px-5 py-5 font-mono text-[13px] leading-relaxed sm:text-[14px]">
                  {lines.map((l, i) =>
                    l.kind === "tool" ? (
                      <div key={i}>
                        <p>
                          <span className={l.done ? "text-green" : "animate-pulse text-yellow"}>●</span>{" "}
                          <span className="font-semibold text-white">{l.name}</span>
                          <span className="text-white/45">({l.arg})</span>
                        </p>
                        {l.done && <p className="pl-4 text-white/40">⎿ {l.result}</p>}
                      </div>
                    ) : (
                      <p key={i} className={`text-white/90 ${l.done ? "" : "caret"}`}>
                        {l.shown}
                      </p>
                    )
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Black overlay that opens like a camera iris onto the world: a hole that grows from the center.
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
        transition={{ duration: 1.6, ease: [0.65, 0, 0.25, 1] }}
        onAnimationComplete={() => setGone(true)}
      />
    </div>
  );
}

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-10 items-center gap-[3px]" aria-hidden>
      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-red transition-all"
          style={{
            height: active ? `${20 + Math.abs(Math.sin(i * 1.7)) * 80}%` : "12%",
            animation: active ? `wv 0.7s ease-in-out ${i * 0.035}s infinite alternate` : "none",
            opacity: active ? 1 : 0.35,
          }}
        />
      ))}
      <style>{`@keyframes wv { from { transform: scaleY(0.25) } to { transform: scaleY(1) } }`}</style>
    </div>
  );
}

export function Spark({ className = "", spin = false }: { className?: string; spin?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} ${spin ? "animate-[spin_8s_linear_infinite]" : ""}`}
      fill="currentColor"
      aria-hidden
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x="11" y="1.5" width="2" height="9" rx="1" transform={`rotate(${i * 45} 12 12)`} />
      ))}
    </svg>
  );
}
