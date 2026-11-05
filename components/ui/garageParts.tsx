"use client";

// The garage's pieces, shared by the select screen (GarageSelect.tsx), the quick garage in the
// world (`GaragePicker`) and the vehicle section of Settings (Hud.tsx): the vehicle cards with
// their icons, the livery swatches and the stat bars. Choosing in any of them goes straight to
// the store (and so to localStorage); in the world the new vehicle swaps in place where the old
// one stood (Vehicle.tsx remounts it, bloom/swap.tsx scans it in).
import { useEffect, type CSSProperties } from "react";
import { Count, Decode, Stage, d } from "@/components/brand/motion";
import { getState, setState, useWorld } from "@/components/world/store";
import { LIVERY_NAMES, VEHICLES, liveryOf, vehicleByCode, type VehicleDef } from "@/components/world/vehicles";
import { toggleGarage } from "@/components/world/bloom/state";

export const STATS = ["Speed", "Grip", "Handling"];

/** One vehicle card: icon, code and kind, name; ink when chosen. */
export function VehicleCard({ v, on, onClick, className = "", style }: { v: VehicleDef; on: boolean; onClick: () => void; className?: string; style?: CSSProperties }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`group flex min-w-0 items-center gap-3 border-ink px-3 text-left transition-colors ${on ? "bg-ink text-white" : "bg-white hover:bg-ink hover:text-white"} ${className}`}
      style={style}
    >
      <svg viewBox="0 0 64 28" className="h-7 w-14 shrink-0" fill="currentColor" aria-hidden>
        {v.icon}
      </svg>
      <span className="min-w-0">
        <span className={`block truncate font-mono text-[11px] ${on ? "text-signal" : "text-graphite group-hover:text-white/60"}`}>
          {v.code} · {v.kind}
        </span>
        <span className="block truncate text-[15px] font-semibold leading-tight">{v.name}</span>
      </span>
    </button>
  );
}

/** The livery: square swatches, the chosen one framed in ink with an orange tick under it. */
export function LiverySwatches({ v }: { v: VehicleDef }) {
  const liveryName = useWorld((s) => s.livery);
  const livery = liveryOf(v.code, liveryName);
  return (
    <>
      <div className="flex items-baseline justify-between gap-3 text-[12px] font-semibold uppercase tracking-[0.06em]">
        <span>Livery</span>
        <span className="font-mono text-[12px] normal-case tracking-normal text-graphite">{livery.name}</span>
      </div>
      <div role="radiogroup" aria-label="Livery" className="mt-1.5 flex gap-2">
        {v.liveries.map((o, i) => {
          const on = o.name === livery.name;
          return (
            <button
              key={o.name}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.name}
              title={o.name}
              onClick={() => setState({ livery: LIVERY_NAMES[i] })}
              className={`relative h-8 w-8 border-2 border-ink p-[3px] transition-colors ${on ? "bg-ink" : "bg-white hover:bg-rule"}`}
            >
              <span className="relative block h-full w-full overflow-hidden ring-1 ring-ink/25" style={{ background: o.body }}>
                <span className="absolute bottom-0 right-0 h-1/2 w-1/2" style={{ background: o.accent }} />
                <span className="absolute bottom-0 left-0 h-[3px] w-1/2" style={{ background: o.trim }} />
              </span>
              {on && <span className="absolute -bottom-[7px] left-1/2 h-[3px] w-3 -translate-x-1/2 bg-signal" />}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Speed, grip and handling as ink bars that count and draw in. */
export function StatBars({ v }: { v: VehicleDef }) {
  return (
    <>
      {STATS.map((s, i) => (
        <div key={s}>
          <div className="flex items-baseline justify-between text-[12px] font-semibold uppercase tracking-[0.06em]">
            <span>{s}</span>
            <span className="font-mono text-[13px]">
              <Count value={String(v.stats[i])} run delay={140 + i * 70} dur={420} />
            </span>
          </div>
          <div className="mt-1 h-[10px] border-2 border-ink bg-paper">
            <div className="h-full origin-left" style={{ width: `${v.stats[i]}%` }}>
              <div className="dsa-x h-full bg-ink" style={d(140 + i * 70)} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/** The four cards two by two, then the chosen one's livery and stats: Settings and the quick garage. */
function VehiclePick({ code }: { code: VehicleDef["code"] }) {
  const v = vehicleByCode[code];
  return (
    <>
      <div className="grid grid-cols-2 border-2 border-ink">
        {VEHICLES.map((o, i) => (
          <VehicleCard key={o.code} v={o} on={o.code === code} onClick={() => setState({ vehicle: o.code })} className={`py-2 ${i % 2 === 0 ? "border-r-2" : ""} ${i < 2 ? "border-b-2" : ""}`} />
        ))}
      </div>
      <div key={code} data-anim="" data-run="" className="mt-3 space-y-3">
        <LiverySwatches v={v} />
        {/* three across on a phone, so the sheet stays short */}
        <div className="grid grid-cols-3 gap-3 pt-1 sm:block sm:space-y-2.5">
          <StatBars v={v} />
        </div>
      </div>
    </>
  );
}

/**
 * Settings' vehicle section: the four cards two by two, the chosen one's livery and stats, and the
 * way into the quick garage (G). A card swaps the vehicle in place, where the car stands.
 */
export function VehicleSettings({ n }: { n: number }) {
  const code = useWorld((s) => s.vehicle);
  return (
    <div className="pt-4">
      <p className="mb-2 flex items-baseline gap-3 border-b border-ink pb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.06em]">
        <span className="font-mono text-signal">{n}</span>Vehicle
      </p>
      <VehiclePick code={code} />
      <button type="button" onClick={() => toggleGarage(true)} className="mt-4 flex w-full items-center gap-2 border-t border-rule pt-3 text-left text-[13.5px] hover:text-signal">
        <kbd className="x-key">G</kbd> Open the garage
      </button>
    </div>
  );
}

const typing = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
};

/**
 * The garage in the world (owner, 2026-11-05: "Make it simple"). G or the HUD's Garage tab opens
 * it over the running game, where the place sheets open: the four cards, the livery swatches and
 * the stats, compact. A pick swaps the vehicle in place, where the car stands (bloom/swap.tsx);
 * the camera stays on the chase view. ← → choose; Esc, Enter or G close. The full garage (select,
 * align, bloom) is the boot's only.
 */
export function GaragePicker() {
  const open = useWorld((s) => s.garageOpen);
  const code = useWorld((s) => s.vehicle);
  const other = useWorld((s) => s.askOpen || s.menuOpen || !!s.zone || s.controlsOpen || s.settingsOpen);

  // another sheet or modal takes the screen: the garage gives way
  useEffect(() => {
    if (other && getState().garageOpen) toggleGarage(false);
  }, [other]);

  // keys, caught before the driving keys (world/input.ts) so ← → choose instead of steering
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const s = getState();
      if (s.phase !== "world") return;
      if (e.code === "KeyG") {
        if (e.repeat || (!s.garageOpen && (s.askOpen || s.menuOpen || s.zone || s.controlsOpen || s.settingsOpen))) return;
        toggleGarage();
        return;
      }
      if (!s.garageOpen) return;
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        const i = VEHICLES.findIndex((o) => o.code === s.vehicle);
        setState({ vehicle: VEHICLES[(i + (e.code === "ArrowRight" ? 1 : -1) + VEHICLES.length) % VEHICLES.length].code });
      } else if (e.code === "Escape" || e.code === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();
        e.stopPropagation();
        toggleGarage(false);
      }
    };
    window.addEventListener("keydown", onDown, true);
    return () => window.removeEventListener("keydown", onDown, true);
  }, []);

  if (!open) return null;
  const v = vehicleByCode[code];
  return (
    <Stage motion className="fixed inset-x-3 bottom-3 z-30 sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-[4.5rem] sm:w-[380px]">
      {(run) => (
        <aside aria-label="Garage" className="dsa-frame border-2 border-ink bg-white shadow-[4px_4px_0_var(--color-ink)]" style={d(0)}>
          <div className="relative flex items-center gap-3 px-3 py-2 font-mono text-[12px] text-white">
            <span className="dsa-x absolute inset-0 bg-ink" style={d(60)} />
            <span className="relative min-w-0 truncate">
              <Decode text="HG-08 / GARAGE" run={run} delay={160} /> · <span className="text-signal">Swap</span>
            </span>
            <span className="relative ml-auto hidden shrink-0 items-center gap-1.5 text-white/60 pointer-fine:flex">
              <span className="border border-white/40 px-1">← →</span> Choose
            </span>
            <button type="button" onClick={() => toggleGarage(false)} aria-label="Close" className="relative flex shrink-0 items-center gap-1.5 transition hover:text-signal pointer-coarse:ml-auto">
              <span className="bg-white px-1.5 text-ink">Esc</span> Close
            </button>
          </div>
          <div className="no-scrollbar max-h-[56svh] overflow-y-auto px-4 pb-4 pt-3 sm:max-h-[calc(100svh-11rem)]">
            <div key={code} data-anim="" data-run="" className="mb-3">
              <p className="font-mono text-[12px] text-signal">
                <Decode text={`${v.code} · ${v.kind}`} run delay={40} dur={260} />
              </p>
              <h2 className="mt-1 text-[24px] font-semibold leading-none tracking-tight">
                <Decode text={v.name} run delay={80} dur={360} />
              </h2>
            </div>
            <VehiclePick code={code} />
          </div>
        </aside>
      )}
    </Stage>
  );
}
