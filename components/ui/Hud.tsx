"use client";

import { LINKS, openLink } from "@/components/world/social";
import { zoneById } from "@/components/world/layout";
import { LIVERIES, LIVERY_NAMES } from "@/components/world/liveries";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { closeZone, getState, openZone, setState, useWorld } from "@/components/world/store";
import { input } from "@/components/world/input";
import { pop } from "@/components/world/sound";
import { PanelBody, ProjectItem, zoneMeta } from "./Panels";
import { projects } from "@/content/projects";
import Ask from "./Ask";
import MapMenu from "./MapMenu";
import AutopilotHud from "./AutopilotHud";
import FitPanel, { LapChip } from "./FitPanel";
import RadioMessages from "./RadioMessages";
import EasterEggs from "./EasterEggs";

export default function Hud() {
  const phase = useWorld((s) => s.phase);
  if (phase !== "world") return null;
  return (
    <>
      <TopBar />
      <InteractKey />
      <ZoneCard />
      <PicksCard />
      <AutopilotHud />
      <FitPanel />
      <LapChip />
      <RadioMessages />
      <EasterEggs />
      <Toast />
      <Hints />
      <Joystick />
      <TouchInteract />
      <Ask />
      <MapMenu />
      <Controls />
      <Settings />
    </>
  );
}

// Edge tabs flush to the right edge, folio-2025's menu and map triggers in the site's ink:
// they slide out 4 px on hover and off the screen while a modal is open.
function TopBar() {
  const muted = useWorld((s) => s.muted);
  const modal = useWorld((s) => s.menuOpen || s.controlsOpen || s.settingsOpen);
  return (
    <motion.nav
      initial={{ x: 60 }}
      animate={{ x: modal ? 160 : 0 }}
      transition={modal ? { duration: 0.15 } : { delay: 0.15, duration: 0.3, ease: [0.4, 1.6, 0.65, 1] }}
      className="pointer-events-auto fixed right-0 top-3 z-30 flex flex-col gap-1.5 sm:top-5"
      aria-label="World controls"
    >
      <EdgeTab label="Map (M)" onClick={() => setState((s) => ({ menuOpen: !s.menuOpen }))}>
        <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" />
      </EdgeTab>
      <EdgeTab label="Controls" onClick={() => setState((s) => ({ controlsOpen: !s.controlsOpen }))}>
        <path d="M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M7 14h10" />
      </EdgeTab>
      <EdgeTab label="Settings" onClick={() => setState((s) => ({ settingsOpen: !s.settingsOpen }))}>
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </EdgeTab>
      <EdgeTab label={muted ? "Unmute" : "Mute"} onClick={() => setState((s) => ({ muted: !s.muted }))}>
        {muted ? <path d="M11 5 6 9H3v6h3l5 4V5Zm6 4 4 4m0-4-4 4" /> : <path d="M11 5 6 9H3v6h3l5 4V5Zm5 3a5 5 0 0 1 0 8m2.5-10.5a8.5 8.5 0 0 1 0 13" />}
      </EdgeTab>
      <Link href="/resume" className="hud-edge hud-red flex h-11 items-center gap-2 pl-3 pr-4 font-mono text-[11px] uppercase tracking-[0.14em]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4" />
        </svg>
        Resume
      </Link>
    </motion.nav>
  );
}

function EdgeTab({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="hud-edge ml-auto grid h-11 w-12 place-items-center pr-1">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}

function ZoneCard() {
  const zone = useWorld((s) => s.zone);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (zone) {
      pop();
      scroller.current?.scrollTo({ top: 0 });
    }
  }, [zone]);

  return (
    <AnimatePresence>
      {zone && (
        <motion.aside
          key={zone}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="hud-panel fixed inset-x-3 bottom-3 z-30 flex max-h-[58svh] flex-col overflow-hidden sm:inset-x-auto sm:bottom-auto sm:right-16 sm:top-5 sm:max-h-[calc(100svh-2.5rem)] sm:w-[420px]"
        >
          <div className="flex items-start gap-3 px-5 pb-3 pt-5">
            <span className="mt-1 h-3 w-3 shrink-0 rotate-45 border-2 border-cream/80" style={{ background: zoneMeta[zone].color }} />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cream/55">{zoneMeta[zone].kicker}</p>
              <h2 className="mt-1.5 font-racing text-[22px] uppercase leading-[1.05] tracking-wide">
                {zoneMeta[zone].title}
              </h2>
            </div>
            <button
              onClick={closeZone}
              aria-label="Close"
              className="hud-red grid h-9 w-9 shrink-0 place-items-center text-[14px] transition hover:brightness-110"
            >
              ✕
            </button>
          </div>
          <div ref={scroller} className="no-scrollbar overflow-y-auto px-5 pb-6">
            <PanelBody zone={zone} />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

const CONTROLS: [string, string][] = [
  ["W A S D / arrows", "Drive"],
  ["Shift", "Boost, opens DRS"],
  ["Space", "Brake"],
  ["E", "Look at the place you're parked at"],
  ["V (hold)", "Talk to your race engineer"],
  ["R", "Reset the car"],
  ["H", "Honk"],
  ["Esc", "Close a card"],
];

// Car paint, remembered in this browser.
function LiveryPicker() {
  const current = useWorld((s) => s.livery);
  return (
    <div className="mt-5 border-t border-cream/15 pt-4">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-cream/55">Livery</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {LIVERY_NAMES.map((n) => {
          const l = LIVERIES[n];
          const on = n === current;
          return (
            <button
              key={n}
              title={l.label}
              aria-label={l.label}
              aria-pressed={on}
              onClick={() => setState({ livery: n })}
              className={`h-9 w-9 overflow-hidden transition ${on ? "outline outline-2 outline-offset-2 outline-cream" : "opacity-75 hover:opacity-100"}`}
              style={{ background: `linear-gradient(135deg, ${l.body} 0 55%, ${l.low} 55% 85%, ${l.accent} 85%)` }}
            />
          );
        })}
      </div>
      <p className="mt-2 text-[12.5px] text-cream/70">{LIVERIES[current].label}</p>
    </div>
  );
}

function Controls() {
  const open = useWorld((s) => s.controlsOpen);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => setState({ controlsOpen: false })}
        >
          <motion.div
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            exit={{ y: 8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="hud-panel w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setState({ controlsOpen: false })}
              aria-label="Close"
              className="hud-tab hud-red absolute bottom-full right-2.5 grid h-10 w-12 place-items-center text-[15px]"
            >
              ✕
            </button>
            <p className="font-racing text-[24px] uppercase tracking-wide">Controls</p>
            <div className="mt-4 divide-y divide-cream/10">
              {CONTROLS.map(([k, d]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-2.5">
                  <Key k={k} />
                  <span className="text-right text-[13px] text-cream/70">{d}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12px] text-cream/50">On a phone: thumb stick to steer, gas and brake on the right. A few keys are secret.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Settings behind the gear tab: livery, sound, the engineer's voice.
function Settings() {
  const open = useWorld((s) => s.settingsOpen);
  const muted = useWorld((s) => s.muted);
  const voice = useWorld((s) => s.voice);
  const close = () => setState({ settingsOpen: false });
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} onClick={close}>
          <motion.div
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            exit={{ y: 8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="hud-panel w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={close} aria-label="Close" className="hud-tab hud-red absolute bottom-full right-2.5 grid h-10 w-12 place-items-center text-[15px]">
              ✕
            </button>
            <p className="font-racing text-[24px] uppercase tracking-wide">Settings</p>
            <div className="mt-4 divide-y divide-cream/10">
              <Toggle label="Sound" on={!muted} set={(v) => setState({ muted: !v })} />
              <Toggle label="Engineer's voice" on={voice} set={(v) => setState({ voice: v })} />
            </div>
            <LiveryPicker />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button onClick={() => set(!on)} aria-pressed={on} className="flex w-full items-center justify-between py-3 text-left">
      <span className="text-[14px]">{label}</span>
      <span className={`px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] ${on ? "bg-cream text-ink" : "border border-cream/30 text-cream/60"}`}>{on ? "On" : "Off"}</span>
    </button>
  );
}

// Projects the race engineer pinned for the visitor.
function PicksCard() {
  const picks = useWorld((s) => s.picks);
  const zone = useWorld((s) => s.zone);
  const list = picks ? projects.filter((p) => picks.slugs.includes(p.slug)) : [];
  return (
    <AnimatePresence>
      {picks && !zone && list.length > 0 && (
        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="hud-panel fixed inset-x-3 bottom-3 z-30 flex max-h-[58svh] flex-col overflow-hidden sm:inset-x-auto sm:bottom-auto sm:right-16 sm:top-5 sm:max-h-[calc(100svh-2.5rem)] sm:w-[420px]"
        >
          <div className="flex items-start gap-3 px-5 pb-3 pt-5">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cream/55">Pinned by your engineer</p>
              <h2 className="mt-1.5 font-racing text-[22px] uppercase leading-[1.05] tracking-wide">{picks.title}</h2>
            </div>
            <button
              onClick={() => setState({ picks: null })}
              aria-label="Close"
              className="hud-red grid h-9 w-9 shrink-0 place-items-center text-[14px] transition hover:brightness-110"
            >
              ✕
            </button>
          </div>
          <div className="no-scrollbar space-y-3 overflow-y-auto px-5 pb-6">
            {list.map((p) => (
              <ProjectItem key={p.slug} p={p} />
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// E (or Enter) opens the place you're parked at; M toggles the map; Escape closes either.
function InteractKey() {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const s = getState();
      if ((e.code === "KeyE" || e.code === "Enter") && s.nearLink && !s.zone) openLink(s.nearLink);
      else if ((e.code === "KeyE" || e.code === "Enter") && s.near && !s.zone) openZone(s.near);
      if (e.code === "Escape" && s.zone) closeZone();
      // garage open: the arrow keys move along its plinths (the camera follows, Rig.tsx)
      if (s.zone?.startsWith("garage-") && (e.code === "ArrowRight" || e.code === "ArrowLeft")) {
        const n = projects.filter((p) => `garage-${p.domain}` === s.zone).length;
        setState({ garageSel: (s.garageSel + (e.code === "ArrowRight" ? 1 : -1) + n) % n });
      }
      if (e.code === "KeyM" && s.phase === "world") setState((w) => ({ menuOpen: !w.menuOpen }));
      if (e.code === "Escape" && (s.menuOpen || s.controlsOpen || s.settingsOpen)) setState({ menuOpen: false, controlsOpen: false, settingsOpen: false });
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return null;
}

// One toast at a time, top centre, folio-2025's drop-in and suck-away curves, with a 2 px
// bar counting down its time (store.ts toast: 2.6 s) in the toast's tone.
function Toast() {
  const t = useWorld((s) => s.toast);
  const bar = { red: "#ff4b3e", yellow: "#ffd23f", teal: "#2ec4b6" };
  return (
    <AnimatePresence>
      {t && (
        <motion.div
          key={t.id}
          initial={{ y: "calc(-100% - 20px)" }}
          animate={{ y: 0, scale: 1, transition: { duration: 0.6, ease: [0.4, 1.6, 0.65, 1] } }}
          exit={{ y: "calc(-100% + 20px)", scale: 0, transition: { duration: 0.45, ease: [0.42, 0, 0.47, -0.55] } }}
          className="pointer-events-none fixed left-1/2 top-4 z-40 w-[min(350px,calc(100%-40px))] -translate-x-1/2"
        >
          <div className="hud-panel px-5 pb-3.5 pt-4 text-center shadow-[0_0_4px_#0007]">
            <motion.span
              className="absolute inset-x-0 top-0 h-[2px] origin-right"
              style={{ background: bar[t.tone] }}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 2.6, ease: "linear" }}
            />
            <span className="font-racing text-[22px] uppercase leading-none tracking-wide">{t.text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Hints() {
  const [show, setShow] = useState(true);
  const speed = useWorld((s) => s.speed);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 14000);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 1.6 }}
            className="hud-panel pointer-events-none fixed bottom-5 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2.5 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-cream/70 [@media(pointer:fine)]:flex"
          >
            <Key k="W A S D" /> <span className="mr-3">drive</span>
            <Key k="Shift" /> <span className="mr-3">boost · DRS</span>
            <Key k="Space" /> <span className="mr-3">brake</span>
            <Key k="R" /> <span className="mr-3">reset</span>
            <Key k="H" /> honk
          </motion.div>
        )}
      </AnimatePresence>
      <div className="hud-panel pointer-events-none fixed bottom-5 right-5 z-20 hidden items-baseline px-4 py-2.5 sm:flex">
        {/* Racero's digits change width: each sits in a fixed cell so the number never jitters */}
        <span className="flex font-racing text-[26px] leading-none">
          {String(speed).padStart(3, " ").split("").map((d, i) => (
            <span key={i} className="inline-block w-[0.72em] text-center">
              {d.trim()}
            </span>
          ))}
        </span>
        <span className="ml-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-cream/55">km/h</span>
      </div>
    </>
  );
}

function Key({ k }: { k: string }) {
  return <kbd className="hud-key">{k}</kbd>;
}

// Touch has no E key: like the original's bottom interact button, a tap target for the
// open prompt (the in-world diamond can be tapped too).
function TouchInteract() {
  const near = useWorld((s) => s.near);
  const link = useWorld((s) => s.nearLink);
  const zone = useWorld((s) => s.zone);
  const label = link ? LINKS.find((l) => l.key === link)?.name : near ? zoneById[near].label : null;
  return (
    <AnimatePresence>
      {label && !zone && (
        <motion.button
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.4, 1.6, 0.65, 1] } }}
          exit={{ y: 20, opacity: 0, transition: { duration: 0.3 } }}
          onClick={() => (link ? openLink(link) : near && openZone(near))}
          className="hud-panel fixed bottom-36 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 py-2.5 pl-3 pr-4 [@media(pointer:fine)]:hidden"
        >
          <span className="h-3.5 w-3.5 rotate-45 border-2 border-cream bg-red" />
          <span className="font-mono text-[11.5px] uppercase tracking-[0.14em]">Open {label}</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// Touch: a thumb stick on the left, gas and brake on the right.
function Joystick() {
  const zone = useWorld((s) => s.zone);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const R = 46;

  const move = (cx: number, cy: number) => {
    const o = origin.current;
    if (!o) return;
    let dx = cx - o.x;
    let dy = cy - o.y;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setKnob({ x: dx, y: dy });
    input.steer = Math.abs(dx) > 6 ? dx / R : 0;
  };

  const pedal = (k: "forward" | "back", v: number) => () => {
    input[k] = v;
  };

  return (
    <div className={`[@media(pointer:fine)]:hidden ${zone ? "hidden" : ""}`}>
      <div
        className="fixed bottom-6 left-6 z-20 h-32 w-32 touch-none rounded-full border border-cream/50 bg-[#171928]/45"
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.pointerId };
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => origin.current?.id === e.pointerId && move(e.clientX, e.clientY)}
        onPointerUp={() => {
          origin.current = null;
          setKnob({ x: 0, y: 0 });
          input.steer = 0;
        }}
        onPointerCancel={() => {
          origin.current = null;
          setKnob({ x: 0, y: 0 });
          input.steer = 0;
        }}
      >
        <span
          className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-2 border-[#171928] bg-cream shadow-[0_2px_0_#0006]"
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>
      <div className="fixed bottom-6 right-6 z-20 flex touch-none items-end gap-3">
        <button
          className="hud-panel grid h-16 w-16 place-items-center font-mono text-[11px] font-semibold uppercase tracking-[0.12em] active:translate-y-0.5"
          onPointerDown={pedal("back", 1)}
          onPointerUp={pedal("back", 0)}
          onPointerLeave={pedal("back", 0)}
        >
          Brake
        </button>
        <button
          className="hud-red grid h-20 w-20 place-items-center font-mono text-[12px] font-semibold uppercase tracking-[0.12em] shadow-[0_3px_0_#0006] active:translate-y-0.5"
          onPointerDown={pedal("forward", 1)}
          onPointerUp={pedal("forward", 0)}
          onPointerLeave={pedal("forward", 0)}
        >
          Gas
        </button>
      </div>
    </div>
  );
}
