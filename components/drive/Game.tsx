"use client";

import Link from "next/link";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { story } from "@/content/profile";
import type { RaceEvent } from "./Car";
import { Speedo, TimingTower, type SectorColor, type SectorResult } from "./Hud";
import { clearInput } from "./input";
import { Scene } from "./Scene";
import { ControlsHint, StartLights } from "./StartLights";
import { StoryPanel, type Panel } from "./StoryPanel";
import { resetTelemetry } from "./telemetry";
import { TouchControls } from "./TouchControls";
import { useControls } from "./useControls";

const STORAGE_KEY = "hg-drive-best-v1";

type Stored = { lap: number | null; sectors: (number | null)[] };

function loadBest(): Stored {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<Stored>;
      return {
        lap: typeof v.lap === "number" ? v.lap : null,
        sectors: Array.isArray(v.sectors) ? v.sectors.slice(0, 3) : [null, null, null],
      };
    }
  } catch {
    // private mode or blocked storage: just start fresh
  }
  return { lap: null, sectors: [null, null, null] };
}

function saveBest(v: Stored) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    // ignore
  }
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const media = (q: string) => typeof window !== "undefined" && window.matchMedia(q).matches;

// ---------------------------------------------------------------------------

function ExitLinks() {
  return (
    <nav className="pointer-events-auto flex flex-wrap items-center gap-2 font-mono text-xs">
      <Link
        href="/"
        className="rounded-md border border-line bg-ink/80 px-3 py-1.5 text-chalk backdrop-blur-sm hover:border-red"
      >
        ← Back to pit wall
      </Link>
      <Link
        href="/resume"
        className="rounded-md border border-line bg-ink/80 px-3 py-1.5 text-mute backdrop-blur-sm hover:text-chalk"
      >
        Skip to resume
      </Link>
    </nav>
  );
}

function Fallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink p-4">
      <div className="w-full max-w-md overflow-hidden rounded-md border border-line bg-panel">
        <div className="kerb" />
        <div className="p-6">
          <p className="font-mono text-xs tracking-widest text-red uppercase">Red flag</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-chalk">This browser can&apos;t run the 3D track</h1>
          <p className="mt-2 text-sm leading-relaxed text-mute">
            The drive needs WebGL, and it isn&apos;t available here. Everything on the track is also on the
            regular site, so you&apos;re not missing anything important.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 font-mono text-xs">
            <Link href="/" className="rounded-md bg-red px-3 py-2 text-white hover:bg-red/85">
              ← Back to pit wall
            </Link>
            <Link href="/resume" className="rounded-md border border-line px-3 py-2 text-chalk hover:border-chalk">
              Go to resume
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

/** Catches a failed WebGL context (or any render crash in the scene) and shows the fallback. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}

// ---------------------------------------------------------------------------

function Drive() {
  useControls();

  const [reducedMotion] = useState(() => media("(prefers-reduced-motion: reduce)"));
  const [isTouch] = useState(() => media("(pointer: coarse)") || "ontouchstart" in window);
  const [fontsReady, setFontsReady] = useState(false);

  const [lit, setLit] = useState(0);
  const [racing, setRacing] = useState(false);
  const [lightsOut, setLightsOut] = useState(false);
  const [hint, setHint] = useState(true);

  const [panel, setPanel] = useState<Panel | null>(null);
  const [collected, setCollected] = useState<number[]>([]);
  const [sectors, setSectors] = useState<SectorResult[]>([null, null, null]);
  const [lastLap, setLastLap] = useState<number | null>(null);
  const [bestLap, setBestLap] = useState<number | null>(() => loadBest().lap);
  const [lapCount, setLapCount] = useState(0);
  const [toast, setToast] = useState<{ id: number; text: string; tone: "purple" | "amber" } | null>(null);

  // Bests live in a ref: they are only needed when an event arrives
  const bests = useRef({ stored: loadBest(), session: [null, null, null] as (number | null)[] });
  const collectedRef = useRef<number[]>([]);
  const lightTimers = useRef<number[]>([]);

  // Canvas textures draw text, so wait (briefly) for the display font
  useEffect(() => {
    let done = false;
    const go = () => {
      if (!done) {
        done = true;
        setFontsReady(true);
      }
    };
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-titillium").trim();
    const fonts = document.fonts;
    if (family && fonts) {
      Promise.all([fonts.load(`900 40px ${family}`), fonts.load(`700 40px ${family}`)]).then(go, go);
    } else {
      queueMicrotask(go);
    }
    const t = window.setTimeout(go, 1500);
    return () => {
      done = true;
      window.clearTimeout(t);
    };
  }, []);

  const goRacing = useCallback(() => {
    lightTimers.current.splice(0).forEach((t) => window.clearTimeout(t));
    setLit(5);
    setRacing(true);
    setLightsOut(true);
    lightTimers.current.push(window.setTimeout(() => setLightsOut(false), 1400));
    lightTimers.current.push(window.setTimeout(() => setHint(false), 7000));
  }, []);

  // Start sequence: five lights, one a second, then a random hold before they go out
  useEffect(() => {
    if (!fontsReady) return;
    resetTelemetry();
    const timers = lightTimers.current;
    for (let i = 1; i <= 5; i++) {
      timers.push(window.setTimeout(() => setLit(i), 700 + (i - 1) * 900));
    }
    const hold = 700 + 4 * 900 + 700 + Math.random() * 1300;
    timers.push(window.setTimeout(goRacing, hold));
    return () => {
      timers.splice(0).forEach((t) => window.clearTimeout(t));
      clearInput();
    };
  }, [fontsReady, goRacing]);

  // Keyboard shortcuts for the overlay: Enter skips the lights, Escape closes a panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !racing) goRacing();
      if (e.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [racing, goRacing]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const onEvent = useCallback((e: RaceEvent) => {
    switch (e.type) {
      case "checkpoint": {
        if (collectedRef.current.includes(e.index)) return;
        collectedRef.current = [...collectedRef.current, e.index].sort((a, b) => a - b);
        setCollected(collectedRef.current);
        setPanel({ kind: "story", index: e.index });
        return;
      }
      case "sector": {
        const b = bests.current;
        const i = e.sector;
        const stored = b.stored.sectors[i];
        const session = b.session[i];
        let color: SectorColor = "amber";
        if (e.valid) {
          if (stored == null || e.time < stored) color = "purple";
          else if (session == null || e.time < session) color = "green";
          if (session == null || e.time < session) b.session[i] = e.time;
          if (stored == null || e.time < stored) {
            b.stored.sectors[i] = e.time;
            saveBest(b.stored);
          }
        }
        setSectors((prev) => {
          const next = i === 0 ? [null, null, null] : [...prev];
          next[i] = { time: e.time, color };
          return next;
        });
        return;
      }
      case "lap": {
        setLastLap(e.time);
        setLapCount((n) => n + 1);
        const b = bests.current;
        if (e.valid && (b.stored.lap == null || e.time < b.stored.lap)) {
          const first = b.stored.lap == null;
          b.stored.lap = e.time;
          saveBest(b.stored);
          setBestLap(e.time);
          setToast({ id: Date.now(), text: first ? "First lap on the board" : "New best lap", tone: "purple" });
        } else if (!e.valid) {
          setToast({ id: Date.now(), text: "Lap not counted, you cut the track", tone: "amber" });
        }
        return;
      }
      case "invalid": {
        setToast({ id: Date.now(), text: "Shortcut spotted. This lap won't count", tone: "amber" });
        return;
      }
      case "zone": {
        if (e.zone === "garage") setPanel({ kind: "garage" });
        else if (e.zone) setPanel({ kind: "offtrack", key: e.zone });
        else setPanel((p) => (p && p.kind !== "story" ? null : p));
        return;
      }
    }
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink text-chalk select-none">
      <div className="absolute inset-0 touch-none">
        {fontsReady && <Scene enabled={racing} reducedMotion={reducedMotion} onEvent={onEvent} />}
      </div>

      {/* top left: exits and timing */}
      <div className="pointer-events-none absolute top-0 left-0 flex flex-col gap-3 p-4">
        <ExitLinks />
        <TimingTower
          sectors={sectors}
          lastLap={lastLap}
          bestLap={bestLap}
          lapCount={lapCount}
          collected={collected}
          onChip={(i) => setPanel({ kind: "story", index: i })}
        />
        {reducedMotion && (
          <p className="pointer-events-auto max-w-64 rounded-md border border-line bg-ink/85 px-3 py-2 font-mono text-[11px] leading-relaxed text-mute">
            Reduced motion is on, so the camera stays steady. You can still drive.
          </p>
        )}
      </div>

      {/* right side (bottom sheet on phones): story, garage and off-track panels */}
      {panel && (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex justify-end max-sm:top-auto max-sm:bottom-40 sm:left-auto">
          <StoryPanel panel={panel} collected={collected.length} onClose={() => setPanel(null)} />
        </div>
      )}

      {/* centre: start lights and controls hint */}
      {(!racing || lightsOut || hint) && (
        <div className="pointer-events-none absolute inset-x-0 top-[14%] flex flex-col items-center gap-4 px-4 max-sm:top-[38%]">
          {(!racing || lightsOut) && <StartLights lit={lit} out={lightsOut} onSkip={goRacing} />}
          {hint && !panel && <ControlsHint isTouch={isTouch} />}
        </div>
      )}

      {toast && (
        <div
          key={toast.id}
          className={`pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-md px-4 py-2 font-display text-sm font-bold max-sm:top-auto max-sm:bottom-64 ${
            toast.tone === "purple" ? "bg-purple text-white" : "bg-amber text-ink"
          }`}
        >
          {toast.text}
        </div>
      )}

      <Speedo raised={isTouch} />
      {isTouch && <TouchControls />}

      {!fontsReady && (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-mute">
          Warming the tyres...
        </div>
      )}

      <span className="sr-only">
        A small driving game. The same story is on the home page and the resume, if you would rather read it:
        {story.map((s) => ` Lap ${s.lap}, ${s.place}.`)}
      </span>
    </div>
  );
}

export default function Game() {
  const [webgl] = useState(hasWebGL);
  if (!webgl) return <Fallback />;
  return (
    <SceneBoundary>
      <Drive />
    </SceneBoundary>
  );
}
