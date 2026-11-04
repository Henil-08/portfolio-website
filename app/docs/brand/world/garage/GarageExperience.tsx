"use client";

// 05 · Garage experience · Cockpit + pit wall: what happens when you drive into a garage, as a
// live mock through the page's one canvas, with the real pit building, the vehicle and livery
// you pick here (your game choice to start with), the garage's real project objects and the
// real datasheet (DsCard). Owner, 2026-11-05: 01 Cockpit and 03 Pit wall screens, combined.
import { useCallback, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { View } from "@react-three/drei";
import { DsCard } from "@/components/brand/sheets";
import { Decode, d } from "@/components/brand/motion";
import { pad } from "@/components/brand/tokens";
import { LIVERY_NAMES, VEHICLES, liveryOf, type LiveryName, type VehicleCode } from "@/components/world/vehicles";
import { getState, subscribe } from "@/components/world/store";
import { garageLabel } from "@/components/world/layout";
import type { Domain } from "@/content/projects";
import { DOMAIN_ORDER, garageList, zoneCode } from "./common";
import CockpitWall from "./CockpitWall";

const NAME = "Garage experience · Cockpit + pit wall";

const CSS = `
.gx-in-1,.gx-in--1{animation:.42s cubic-bezier(.6,0,.2,1) both}
.gx-in-1{animation-name:gx-in-r}.gx-in--1{animation-name:gx-in-l}
@keyframes gx-in-r{from{clip-path:inset(0 0 0 100%);transform:translateX(18px)}to{clip-path:inset(0 0 0 0);transform:none}}
@keyframes gx-in-l{from{clip-path:inset(0 100% 0 0);transform:translateX(-18px)}to{clip-path:inset(0 0 0 0);transform:none}}
@media (prefers-reduced-motion:reduce){.gx-in-1,.gx-in--1{animation-duration:1ms}}
`;

declare global {
  interface Window {
    /** Dev only: drive the mock from a headless browser, e.g. __garageMock.set({ vi: 2, livery: "Orange", inside: true }). */
    __garageMock?: { set: (s: Partial<{ vi: number; livery: LiveryName; domain: Domain; sel: number; inside: boolean }>) => void };
  }
}

/** The vehicle and livery you drive in the game (store.ts, remembered per browser); none on the server. */
const useGameChoice = () =>
  useSyncExternalStore(
    subscribe,
    () => `${getState().vehicle}|${getState().livery}`,
    () => null,
  );

export default function GarageExperience() {
  const box = useRef<HTMLDivElement>(null);
  const game = useGameChoice();
  const [gv, gl] = (game?.split("|") ?? []) as [VehicleCode?, LiveryName?];
  // your own picks here win; until then the mock follows the game's choice
  const [vPick, setVPick] = useState<VehicleCode | null>(null);
  const [lPick, setLPick] = useState<LiveryName | null>(null);
  const [domain, setDomain] = useState<Domain>("agents");
  const [sel, setSel] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [inside, setInside] = useState(false);
  const [down, setDown] = useState<string | null>(null);
  const v = VEHICLES.find((x) => x.code === (vPick ?? gv)) ?? VEHICLES[0];
  const lname = lPick ?? gl ?? LIVERY_NAMES[0];
  const livery = liveryOf(v.code, lname);
  const list = garageList(domain);
  const cur = list[Math.min(sel, list.length - 1)];
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const step = useCallback(
    (k: -1 | 1) => {
      setDir(k);
      setSel((s) => (s + k + list.length) % list.length);
    },
    [list.length],
  );
  const pick = (i: number) => {
    if (i !== sel) setDir(i > sel ? 1 : -1);
    setSel(i);
  };
  /** A new vehicle or garage: back outside, then drive straight in again. */
  const restart = (f: () => void) => {
    clearTimeout(timer.current);
    f();
    setInside(false);
    setSel(0);
    timer.current = setTimeout(() => setInside(true), 450);
  };

  // keys only while the mock is on screen, so the page still scrolls normally elsewhere
  const live = useRef(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (live.current = e.intersectionRatio > 0.4), { threshold: [0, 0.4, 0.8] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // the key handler reads the latest state without re-binding
  const onKey = useEffectEvent((k: string) => {
    if (k === "ArrowRight" || k === "ArrowLeft") {
      if (inside) step(k === "ArrowRight" ? 1 : -1);
    } else if (k === "Enter") setInside(true);
    else if (k === "Escape") setInside(false);
  });
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (!live.current) return;
      const k0 = e.code || e.key;
      const k = k0 === "NumpadEnter" ? "Enter" : k0;
      if (!/^(ArrowRight|ArrowLeft|Enter|Escape)$/.test(k)) return;
      if (k !== "Escape") e.preventDefault();
      onKey(k);
      setDown(k);
    };
    const onUp = () => setDown(null);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    window.__garageMock = {
      set: (s) => {
        if (s.vi !== undefined) setVPick(VEHICLES[s.vi].code);
        if (s.livery !== undefined) setLPick(s.livery);
        if (s.domain !== undefined) setDomain(s.domain);
        if (s.sel !== undefined) pick(s.sel);
        if (s.inside !== undefined) setInside(s.inside);
      },
    };
  });

  const key = (k: string, label: string) => <kbd className={`x-key text-[#111] ${down === k ? "is-down" : ""}`}>{label}</kbd>;
  const zc = zoneCode(domain);
  const tab = (on: boolean) => `-ml-[2px] -mt-[2px] border-2 border-[#111] ${on ? "bg-[#111] text-white" : "bg-white hover:bg-[#f3f2ed]"}`;
  const code = (on: boolean) => `font-mono block text-[10.5px] leading-none ${on ? "text-[#ff4f00]" : "text-[#5d5d58]"}`;

  return (
    <div>
      <style>{CSS}</style>

      {/* vehicle, livery and garage pickers */}
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div role="radiogroup" aria-label="Vehicle" className="flex flex-wrap pl-[2px] pt-[2px]">
          {VEHICLES.map((x, i) => {
            const on = x.code === v.code;
            return (
              <button key={x.code} type="button" role="radio" aria-checked={on} onClick={() => restart(() => setVPick(VEHICLES[i].code))} className={`${tab(on)} flex items-center gap-2 px-2.5 py-1.5`}>
                <svg viewBox="0 0 64 28" className="h-5 w-10 shrink-0" fill="currentColor" aria-hidden>
                  {x.icon}
                </svg>
                <span className="text-left">
                  <span className={code(on)}>{x.code}</span>
                  <span className="block text-[13.5px] font-semibold leading-tight">{x.name}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div role="radiogroup" aria-label="Livery" className="flex flex-wrap pl-[2px] pt-[2px]">
          {v.liveries.map((l) => {
            const on = l.name === livery.name;
            return (
              <button key={l.name} type="button" role="radio" aria-checked={on} title={l.name} onClick={() => setLPick(l.name)} className={`${tab(on)} flex items-center gap-2 px-2.5 py-1.5`}>
                <span aria-hidden className="relative block h-5 w-5 shrink-0 border-2 border-current" style={{ background: l.body }}>
                  <span className="absolute bottom-0 right-0 block h-2 w-2" style={{ background: l.accent }} />
                </span>
                <span className="text-left">
                  <span className={code(on)}>Livery</span>
                  <span className="block whitespace-nowrap text-[13.5px] font-semibold leading-tight">{l.name}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div role="radiogroup" aria-label="Garage" className="flex flex-wrap pl-[2px] pt-[2px]">
          {DOMAIN_ORDER.map((dm) => {
            const on = dm === domain;
            return (
              <button key={dm} type="button" role="radio" aria-checked={on} onClick={() => restart(() => setDomain(dm))} className={`${tab(on)} px-2.5 py-1.5 text-left`}>
                <span className={code(on)}>{zoneCode(dm)}</span>
                <span className="block whitespace-nowrap text-[13.5px] font-semibold leading-tight">{garageLabel[dm]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* the mock */}
      <div ref={box} id="garage-mock" className="relative mt-3 overflow-hidden border-2 border-[#111] bg-white">
        <div className="flex items-center gap-3 bg-[#111] px-3 py-2 text-white">
          <span className="font-mono truncate text-[12px]">
            HG-08 / {zc} · {garageLabel[domain].toUpperCase()} · <span className="text-[#ff4f00]">{NAME}</span>
          </span>
          <span className="font-mono ml-auto hidden shrink-0 items-center gap-2 text-[11.5px] text-white/60 lg:flex">
            <span className="border border-white/40 px-1.5">Enter</span> Drive in
            <span className="ml-2 border border-white/40 px-1.5">← →</span> Project
            <span className="ml-2 border border-white/40 px-1.5">Esc</span> Back out
          </span>
        </div>
        <div className="grid md:h-[620px] md:grid-cols-[minmax(0,1fr)_400px]">
          {/* the 3D cell, with its counter and arrows */}
          <div className="relative h-[360px] border-b-2 border-[#111] sm:h-[440px] md:h-auto md:border-b-0 md:border-r-2">
            <View className="absolute inset-0">
              <CockpitWall v={v} livery={livery} domain={domain} list={list} sel={Math.min(sel, list.length - 1)} dir={dir} inside={inside} onPick={pick} />
            </View>
            <span className="font-mono pointer-events-none absolute left-3 top-3 z-[25] bg-white px-1.5 py-0.5 text-[11.5px] shadow-[3px_3px_0_#111] ring-2 ring-[#111]">
              {v.code} {v.name} · {inside ? "Driver's eye" : "Pit lane"}
            </span>
            {inside ? (
              <div className="absolute bottom-3 left-1/2 z-[25] flex -translate-x-1/2 items-stretch border-2 border-[#111] bg-white shadow-[3px_3px_0_#111]">
                <button type="button" onClick={() => step(-1)} aria-label="Previous project" className="px-3 text-[16px] hover:bg-[#111] hover:text-white">
                  ←
                </button>
                <span key={cur.index} className="font-mono flex items-center gap-2 border-x-2 border-[#111] px-3 py-1.5 text-[12px]">
                  <span className="text-[#ff4f00]">P{pad(cur.index + 1)}</span>
                  <span className="hidden max-w-[220px] truncate sm:inline">
                    <Decode text={cur.p.name} run dur={300} />
                  </span>
                  <span className="text-[#5d5d58]">
                    {pad(sel + 1)}/{pad(list.length)}
                  </span>
                </span>
                <button type="button" onClick={() => step(1)} aria-label="Next project" className="px-3 text-[16px] hover:bg-[#111] hover:text-white">
                  →
                </button>
              </div>
            ) : (
              <div className="absolute bottom-4 left-1/2 z-[25] -translate-x-1/2">
                <button type="button" onClick={() => setInside(true)} className="x-btn x-primary dsa-flicker whitespace-nowrap bg-[#111] text-white">
                  Press {key("Enter", "Enter")} to drive in <span className="x-arrow">→</span>
                </button>
              </div>
            )}
            {inside && (
              <button type="button" onClick={() => setInside(false)} className="font-mono absolute right-3 top-3 z-[25] flex items-center gap-1.5 bg-white px-1.5 py-0.5 text-[11.5px] shadow-[3px_3px_0_#111] ring-2 ring-[#111] hover:bg-[#111] hover:text-white">
                Esc · Back out
              </button>
            )}
          </div>

          {/* the datasheet beside it, scrolling in its own column; outside, the garage's contents */}
          <div className="max-h-[560px] overflow-y-auto overscroll-contain bg-[#f3f2ed] p-3 md:max-h-none">
            {inside ? (
              <div key={cur.index} className={`gx-in-${dir}`}>
                <DsCard index={cur.index} motion onNav={list.length > 1 ? step : undefined} list={list.map((x) => x.index)} />
              </div>
            ) : (
              <div key={`${domain}-out`} data-anim="" data-run="" className="dsa-frame border-2 border-[#111] bg-white" style={d(0)}>
                <div className="font-mono bg-[#111] px-3 py-1.5 text-[12px] text-white">
                  HG-08 / {zc} · Garage
                </div>
                <div className="p-4">
                  <h3 className="text-[26px] font-semibold leading-tight tracking-tight">
                    <Decode text={garageLabel[domain]} run delay={150} dur={360} />
                  </h3>
                  <p className="mt-1 text-[14.5px] text-[#5d5d58]">
                    {list.length} projects on the wall inside. Drive in to see them one at a time.
                  </p>
                  <ol className="mt-4 border-t border-[#111]">
                    {list.map((x, i) => (
                      <li key={x.p.slug}>
                        <button
                          type="button"
                          onClick={() => {
                            pick(i);
                            setInside(true);
                          }}
                          className="dsa-wipe x-row flex w-full items-baseline gap-3 border-b border-[#cfcdc4] py-2 text-left text-[14.5px]"
                          style={d(300 + i * 80)}
                        >
                          <span className="font-mono text-[12px] text-[#ff4f00]">P{pad(x.index + 1)}</span>
                          <span className="min-w-0 flex-1 truncate font-semibold">{x.p.name}</span>
                          <span className="font-mono text-[12px] text-[#5d5d58]">{x.p.headline.value}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="font-mono mt-3 text-[12px] text-[#5d5d58]">
        {v.code} {v.name} · {livery.name} · {zc} {garageLabel[domain]} · {inside ? `P${pad(cur.index + 1)} on the stage and lit on the wall, ← → to switch, Esc to back out` : "outside on the pit lane, Enter to drive in"}
      </p>
    </div>
  );
}
