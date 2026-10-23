"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { closeZone, getState, openZone, setState, teleport, useWorld } from "@/components/world/store";
import { zones } from "@/components/world/layout";
import { input } from "@/components/world/input";
import { pop } from "@/components/world/sound";
import { PanelBody, ProjectItem, zoneMeta } from "./Panels";
import { projects } from "@/content/projects";
import Ask from "./Ask";
import { Minimap } from "./RaceHud";
import AutopilotHud from "./AutopilotHud";

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
      <Toast />
      <Hints />
      <Joystick />
      <Ask />
      <MapMenu />
    </>
  );
}

function TopBar() {
  const muted = useWorld((s) => s.muted);
  return (
    <motion.div
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.2, type: "spring", stiffness: 200, damping: 20 }}
      className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-3 sm:p-5"
    >
      <div className="toy-card pointer-events-auto flex items-center gap-3 rounded-2xl py-2 pl-2 pr-4">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e10600] font-racing text-sm text-white">
          08
        </span>
        <p className="font-racing text-[14px] tracking-wide text-ink">HENIL GAJJAR</p>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <IconBtn label="Map" onClick={() => setState((s) => ({ menuOpen: !s.menuOpen }))}>
          <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" />
        </IconBtn>
        <IconBtn label={muted ? "Unmute" : "Mute"} onClick={() => setState((s) => ({ muted: !s.muted }))}>
          {muted ? <path d="M11 5 6 9H3v6h3l5 4V5Zm6 4 4 4m0-4-4 4" /> : <path d="M11 5 6 9H3v6h3l5 4V5Zm5 3a5 5 0 0 1 0 8m2.5-10.5a8.5 8.5 0 0 1 0 13" />}
        </IconBtn>
        <Link
          href="/resume"
          className="toy-card toy-btn rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-ink sm:px-4"
        >
          Resume
        </Link>
      </div>
    </motion.div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="toy-card toy-btn grid h-11 w-11 place-items-center rounded-2xl text-ink">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="toy-card fixed inset-x-3 bottom-3 z-30 flex max-h-[58svh] flex-col overflow-hidden rounded-[28px] sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-24 sm:max-h-[calc(100svh-8rem)] sm:w-[420px]"
        >
          <div className="flex items-start gap-3 px-5 pb-3 pt-5">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: zoneMeta[zone].color }} />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">{zoneMeta[zone].kicker}</p>
              <h2 className="mt-1.5 font-racing text-[22px] uppercase leading-[1.05] tracking-wide text-ink">
                {zoneMeta[zone].title}
              </h2>
            </div>
            <button
              onClick={closeZone}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-ink-soft transition hover:bg-line hover:text-ink"
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

// Projects the race engineer pinned for the visitor.
function PicksCard() {
  const picks = useWorld((s) => s.picks);
  const zone = useWorld((s) => s.zone);
  const list = picks ? projects.filter((p) => picks.slugs.includes(p.slug)) : [];
  return (
    <AnimatePresence>
      {picks && !zone && list.length > 0 && (
        <motion.aside
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="toy-card fixed inset-x-3 bottom-3 z-30 flex max-h-[58svh] flex-col overflow-hidden rounded-[28px] sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-24 sm:max-h-[calc(100svh-8rem)] sm:w-[420px]"
        >
          <div className="flex items-start gap-3 px-5 pb-3 pt-5">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">Pinned by your engineer</p>
              <h2 className="mt-1.5 font-racing text-[22px] uppercase leading-[1.05] tracking-wide text-ink">{picks.title}</h2>
            </div>
            <button
              onClick={() => setState({ picks: null })}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-ink-soft transition hover:bg-line hover:text-ink"
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

// E (or Enter) opens the place you're parked at; Escape closes the card.
function InteractKey() {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const s = getState();
      if ((e.code === "KeyE" || e.code === "Enter") && s.near && !s.zone) openZone(s.near);
      if (e.code === "Escape" && s.zone) closeZone();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return null;
}

function Toast() {
  const t = useWorld((s) => s.toast);
  const bg = { red: "#ff4b3e", yellow: "#ffd23f", teal: "#2ec4b6" };
  return (
    <AnimatePresence>
      {t && (
        <motion.div
          key={t.id}
          initial={{ y: -20, scale: 0.6, opacity: 0, rotate: -6 }}
          animate={{ y: 0, scale: 1, opacity: 1, rotate: -3 }}
          exit={{ y: -10, scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="pointer-events-none fixed left-1/2 top-24 z-40 -translate-x-1/2"
        >
          <span
            className="block rounded-xl px-6 py-3 font-racing text-3xl tracking-wider text-ink shadow-xl"
            style={{ background: bg[t.tone], color: t.tone === "yellow" ? "#1f2133" : "#fff" }}
          >
            {t.text}
          </span>
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
            className="toy-card pointer-events-none fixed bottom-5 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-5 rounded-2xl px-5 py-3 text-[13px] text-ink-soft [@media(pointer:fine)]:flex"
          >
            <Key k="W A S D" /> drive
            <Key k="Shift" /> boost
            <Key k="Space" /> drift
            <Key k="R" /> reset
            <Key k="H" /> honk
          </motion.div>
        )}
      </AnimatePresence>
      <div className="toy-card pointer-events-none fixed bottom-5 right-5 z-20 hidden rounded-2xl px-4 py-2 sm:block">
        <span className="font-racing text-2xl tabular-nums text-ink">{speed}</span>
        <span className="ml-1 text-[11px] text-ink-soft">km/h</span>
      </div>
    </>
  );
}

function Key({ k }: { k: string }) {
  return <kbd className="rounded-lg border border-line bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-ink shadow-[0_2px_0_#ece3d3]">{k}</kbd>;
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
        className="fixed bottom-6 left-6 z-20 h-32 w-32 touch-none rounded-full border-2 border-white/70 bg-white/25 backdrop-blur"
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
          className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-white shadow-lg"
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>
      <div className="fixed bottom-6 right-6 z-20 flex touch-none items-end gap-3">
        <button
          className="toy-btn grid h-16 w-16 place-items-center rounded-2xl bg-white/85 font-display text-sm font-bold text-ink"
          onPointerDown={pedal("back", 1)}
          onPointerUp={pedal("back", 0)}
          onPointerLeave={pedal("back", 0)}
        >
          BRAKE
        </button>
        <button
          className="toy-btn grid h-20 w-20 place-items-center rounded-2xl bg-red font-display text-sm font-bold text-white"
          onPointerDown={pedal("forward", 1)}
          onPointerUp={pedal("forward", 0)}
          onPointerLeave={pedal("forward", 0)}
        >
          GAS
        </button>
      </div>
    </div>
  );
}

function MapMenu() {
  const open = useWorld((s) => s.menuOpen);
  const found = useWorld((s) => s.found);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 grid place-items-center bg-ink/30 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setState({ menuOpen: false })}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="toy-card w-full max-w-md rounded-[28px] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-end justify-between">
              <p className="font-racing text-2xl tracking-wide text-ink">MAP</p>
              <p className="font-mono text-[11px] text-ink-soft">
                {found.length}/{zones.length} found
              </p>
            </div>
            <div className="mt-3 aspect-square w-full rounded-2xl bg-cream p-2">
              <Minimap />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => teleport(z.id)}
                  className="toy-btn flex items-center gap-2.5 rounded-2xl bg-cream px-3 py-2.5 text-left transition hover:bg-line"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: zoneMeta[z.id].color }} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-ink">{z.label}</span>
                    <span className="block truncate text-[11.5px] text-ink-soft">{z.hint}</span>
                  </span>
                  {found.includes(z.id) && <span className="ml-auto text-green">✓</span>}
                </button>
              ))}
            </div>
            <Link href="/resume" className="mt-4 block text-center text-sm font-semibold text-red">
              In a hurry? Read the one-page version →
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
