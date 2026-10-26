"use client";

// The in-world HUD in the brand language (docs/BRAND.md S02): tabs top right, place sheets
// on the right, toast top centre, hints and speed along the bottom, touch controls.

import { LINKS, openLink } from "@/components/world/social";
import { zoneById } from "@/components/world/layout";
import { LIVERIES, LIVERY_NAMES } from "@/components/world/liveries";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { closeZone, getState, openZone, setState, useWorld } from "@/components/world/store";
import { input } from "@/components/world/input";
import { pop } from "@/components/world/sound";
import { PanelBody, ProjectItem, zoneCode, zoneMeta } from "./Panels";
import { Decode, Stage, d } from "@/components/brand/motion";
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

// Tabs top right (S02): white stickers with a hard shadow and their key; Resume is the ink
// one. They lift off the screen while a modal is open.
function TopBar() {
  const muted = useWorld((s) => s.muted);
  const modal = useWorld((s) => s.menuOpen || s.controlsOpen || s.settingsOpen);
  return (
    <motion.nav
      initial={{ y: -60 }}
      animate={{ y: modal ? -90 : 0 }}
      transition={modal ? { duration: 0.15 } : { delay: 0.15, duration: 0.3, ease: [0.4, 1.6, 0.65, 1] }}
      className="pointer-events-auto fixed right-3 top-3 z-30 flex gap-2 sm:right-5 sm:top-5"
      aria-label="World controls"
    >
      <Tab label="Map" k="M" onClick={() => setState((s) => ({ menuOpen: !s.menuOpen }))}>
        <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" />
      </Tab>
      <Tab label="Controls" onClick={() => setState((s) => ({ controlsOpen: !s.controlsOpen }))}>
        <path d="M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M7 14h10" />
      </Tab>
      <Tab label="Settings" onClick={() => setState((s) => ({ settingsOpen: !s.settingsOpen }))}>
        <path d="M4 6h10m4 0h2M4 12h4m4 0h8M4 18h12m4 0h0M14 4v4m-6 2v4m8 2v4" />
      </Tab>
      <Tab label={muted ? "Sound off" : "Sound"} onClick={() => setState((s) => ({ muted: !s.muted }))}>
        {muted ? <path d="M11 5 6 9H3v6h3l5 4V5Zm6 4 4 4m0-4-4 4" /> : <path d="M11 5 6 9H3v6h3l5 4V5Zm5 3a5 5 0 0 1 0 8m2.5-10.5a8.5 8.5 0 0 1 0 13" />}
      </Tab>
      <Link href="/resume" className="ds-tab bg-ink text-white shadow-[3px_3px_0_var(--color-signal)] hover:bg-white hover:text-ink">
        Resume ↗
      </Link>
    </motion.nav>
  );
}

function Tab({ label, k, onClick, children }: { label: string; k?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="ds-tab">
      {k && <span className="hidden bg-ink px-1.5 font-mono text-[11px] text-white sm:inline">{k}</span>}
      <svg viewBox="0 0 24 24" className="h-4 w-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
        {children}
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/**
 * The frame every place opens in (S02/S03): it draws in, an ink bar wipes across with the
 * place's code and an Esc close, the title decodes. Right side on desktop, a bottom sheet on phones.
 */
function Sheet({ code, kicker, title, onClose, wide, children }: { code: string; kicker: string; title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  return (
    <Stage motion className={`fixed inset-x-3 bottom-3 z-30 flex max-h-[62svh] flex-col sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-[4.5rem] sm:max-h-[calc(100svh-11rem)] ${wide ? "sm:w-[min(640px,calc(100vw-2.5rem))]" : "sm:w-[440px]"}`}>
      {(run) => (
        <aside className="dsa-frame flex min-h-0 flex-col border-2 border-ink bg-white shadow-[4px_4px_0_var(--color-ink)]" style={d(0)}>
          <div className="relative flex items-center gap-3 px-4 py-2 font-mono text-[12px] text-white">
            <span className="dsa-x absolute inset-0 bg-ink" style={d(80)} />
            <span className="relative min-w-0 truncate">
              <Decode text={`${code} · ${kicker}`} run={run} delay={200} />
            </span>
            <button onClick={onClose} aria-label="Close" className="relative ml-auto flex shrink-0 items-center gap-1.5 transition hover:text-signal">
              <span className="bg-white px-1.5 text-ink">Esc</span> Close
            </button>
          </div>
          <div className="no-scrollbar min-h-0 overflow-y-auto px-5 pb-5 pt-4">
            <h2 className="mb-4 text-[24px] font-semibold leading-tight tracking-tight">
              <Decode text={title} run={run} delay={300} dur={450} />
            </h2>
            {children}
          </div>
        </aside>
      )}
    </Stage>
  );
}

function ZoneCard() {
  const zone = useWorld((s) => s.zone);
  useEffect(() => {
    if (zone) pop();
  }, [zone]);
  if (!zone) return null;
  return (
    <Sheet key={zone} code={zoneCode(zone)} kicker={zoneMeta[zone].kicker} title={zoneMeta[zone].title} onClose={closeZone} wide={zone.startsWith("garage-")}>
      <PanelBody zone={zone} />
    </Sheet>
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

// Car paint, remembered in this browser: square swatches, the chosen one framed in ink.
function LiveryPicker() {
  const current = useWorld((s) => s.livery);
  return (
    <div className="pt-4">
      <p className="mb-2 flex items-baseline gap-3 border-b border-ink pb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.06em]">
        <span className="font-mono text-signal">2</span>Livery
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
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
              className={`h-9 w-9 border-2 transition ${on ? "border-ink outline outline-2 outline-offset-2 outline-ink" : "border-rule hover:border-ink"}`}
              style={{ background: `linear-gradient(135deg, ${l.body} 0 55%, ${l.low} 55% 85%, ${l.accent} 85%)` }}
            />
          );
        })}
      </div>
      <p className="mt-2 font-mono text-[12px] text-graphite">{LIVERIES[current].label}</p>
    </div>
  );
}

/** A centred modal in the brand frame (Controls, Settings): draws in, bar with Esc close. */
function Modal({ open, close, title, children }: { open: boolean; close: () => void; title: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 grid place-items-center bg-ink/30 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={close}>
          <Stage motion className="w-full max-w-sm">
            {(run) => (
              <div className="dsa-frame border-2 border-ink bg-white shadow-[4px_4px_0_var(--color-ink)]" style={d(0)} onClick={(e) => e.stopPropagation()}>
                <div className="relative flex items-center px-4 py-2 font-mono text-[12px] text-white">
                  <span className="dsa-x absolute inset-0 bg-ink" style={d(80)} />
                  <span className="relative">
                    <Decode text={`HG-08 / ${title}`} run={run} delay={200} />
                  </span>
                  <button onClick={close} aria-label="Close" className="relative ml-auto flex items-center gap-1.5 transition hover:text-signal">
                    <span className="bg-white px-1.5 text-ink">Esc</span> Close
                  </button>
                </div>
                <div className="p-5">{children}</div>
              </div>
            )}
          </Stage>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Controls() {
  const open = useWorld((s) => s.controlsOpen);
  return (
    <Modal open={open} close={() => setState({ controlsOpen: false })} title="Controls">
      <p className="mb-2 flex items-baseline gap-3 border-b border-ink pb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.06em]">
        <span className="font-mono text-signal">1</span>Keys
      </p>
      {CONTROLS.map(([k, label]) => (
        <div key={k} className="flex items-center justify-between gap-4 border-b border-rule py-2">
          <Key k={k} />
          <span className="text-right text-[13.5px]">{label}</span>
        </div>
      ))}
      <p className="mt-3 text-[12.5px] text-graphite">On a phone: thumb stick to steer, gas and brake on the right. A few keys are secret.</p>
    </Modal>
  );
}

// Settings: sound, the engineer's voice, livery.
function Settings() {
  const open = useWorld((s) => s.settingsOpen);
  const muted = useWorld((s) => s.muted);
  const voice = useWorld((s) => s.voice);
  return (
    <Modal open={open} close={() => setState({ settingsOpen: false })} title="Settings">
      <p className="mb-1 flex items-baseline gap-3 border-b border-ink pb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.06em]">
        <span className="font-mono text-signal">1</span>Audio
      </p>
      <Toggle label="Sound" on={!muted} set={(v) => setState({ muted: !v })} />
      <Toggle label="Engineer's voice" on={voice} set={(v) => setState({ voice: v })} />
      <LiveryPicker />
    </Modal>
  );
}

/** I03: a square switch that says ON or OFF in words. */
function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button onClick={() => set(!on)} aria-pressed={on} className="flex w-full items-center gap-3 border-b border-rule py-2.5 text-left">
      <span className="flex-1 text-[14px]">{label}</span>
      <span className="relative h-6 w-12 border-2 border-ink bg-white">
        <span className={`absolute top-[2px] h-4 w-4 transition-all duration-200 ease-[cubic-bezier(.3,1.6,.5,1)] ${on ? "left-[26px] bg-ink" : "left-[2px] bg-rule"}`} />
      </span>
      <span className={`w-7 font-mono text-[12px] ${on ? "" : "text-graphite"}`}>{on ? "ON" : "OFF"}</span>
    </button>
  );
}

// Projects the race engineer pinned for the visitor, in the same sheet as a place.
function PicksCard() {
  const picks = useWorld((s) => s.picks);
  const zone = useWorld((s) => s.zone);
  const list = picks ? projects.filter((p) => picks.slugs.includes(p.slug)) : [];
  if (!picks || zone || !list.length) return null;
  return (
    <Sheet key={picks.title} code="PIN" kicker="Pinned by your engineer" title={picks.title} onClose={() => setState({ picks: null })}>
      <div className="space-y-3">
        {list.map((p) => (
          <ProjectItem key={p.slug} p={p} />
        ))}
      </div>
    </Sheet>
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

// One toast at a time, top centre (I07): drops in with folio-2025's curve, a sticker with a
// hard shadow, an ink bar counting down its time (store.ts toast: 2.6 s). The tone sets the
// mark on the left: orange for wins, ink otherwise.
function Toast() {
  const t = useWorld((s) => s.toast);
  return (
    <AnimatePresence>
      {t && (
        <motion.div
          key={t.id}
          initial={{ y: "calc(-100% - 20px)" }}
          animate={{ y: 0, scale: 1, transition: { duration: 0.6, ease: [0.4, 1.6, 0.65, 1] } }}
          exit={{ y: "calc(-100% + 20px)", scale: 0, transition: { duration: 0.45, ease: [0.42, 0, 0.47, -0.55] } }}
          className="pointer-events-none fixed left-1/2 top-4 z-40 w-max max-w-[calc(100%-40px)] -translate-x-1/2"
        >
          <div className="border-2 border-ink bg-white shadow-[3px_3px_0_var(--color-ink)]">
            <div className="flex items-center gap-2.5 px-3 py-2">
              <span className={`h-3 w-3 shrink-0 ${t.tone === "red" ? "bg-signal" : "bg-ink"}`} />
              <span className="text-[15px] font-semibold leading-tight">{t.text}</span>
            </div>
            <motion.span className="block h-[3px] origin-left bg-ink" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: 2.6, ease: "linear" }} />
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
            className="pointer-events-none fixed bottom-5 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 border-2 border-ink bg-white px-3 py-2 text-[13px] shadow-[3px_3px_0_var(--color-ink)] [@media(pointer:fine)]:flex"
          >
            <Key k="W A S D" /> <span className="mr-3">Drive</span>
            <Key k="Shift" /> <span className="mr-3">Boost · DRS</span>
            <Key k="Space" /> <span className="mr-3">Brake</span>
            <Key k="R" /> <span className="mr-3">Reset</span>
            <Key k="H" /> Honk
          </motion.div>
        )}
      </AnimatePresence>
      <div className="pointer-events-none fixed bottom-5 right-5 z-20 hidden border-2 border-ink bg-white px-3 py-2 shadow-[3px_3px_0_var(--color-ink)] sm:block">
        <p className="w-[3ch] text-right font-mono text-[34px] font-semibold leading-none tabular-nums">{speed}</p>
        <p className="mt-1 font-mono text-[11px] text-graphite">km/h</p>
      </div>
    </>
  );
}

function Key({ k }: { k: string }) {
  return <kbd className="x-key">{k}</kbd>;
}

// Touch has no E key: like the original's bottom interact button, a tap target for the
// open prompt, as the zone sticker (I08).
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
          className="fixed bottom-36 left-1/2 z-30 flex -translate-x-1/2 items-stretch border-2 border-ink bg-white shadow-[3px_3px_0_var(--color-ink)] [@media(pointer:fine)]:hidden"
        >
          <span className="grid place-items-center bg-ink px-2.5 font-mono text-[12px] font-semibold text-white">Tap</span>
          <span className="px-3 py-2 text-[14px] font-semibold">Open {label}</span>
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
        className="fixed bottom-6 left-6 z-20 h-32 w-32 touch-none rounded-full border-2 border-ink bg-white/60"
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
          className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-ink"
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>
      <div className="fixed bottom-6 right-6 z-20 flex touch-none items-end gap-3">
        <button
          className="grid h-16 w-16 place-items-center border-2 border-ink bg-white font-mono text-[12px] font-semibold shadow-[3px_3px_0_var(--color-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          onPointerDown={pedal("back", 1)}
          onPointerUp={pedal("back", 0)}
          onPointerLeave={pedal("back", 0)}
        >
          Brake
        </button>
        <button
          className="grid h-20 w-20 place-items-center border-2 border-ink bg-ink font-mono text-[12px] font-semibold text-white shadow-[3px_3px_0_var(--color-signal)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
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
