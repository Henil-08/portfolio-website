"use client";

// The garage's pieces, shared by the select screen (GarageSelect.tsx) and the vehicle section of
// Settings (Hud.tsx): the vehicle cards with their icons, the livery swatches and the stat bars.
// Choosing in either goes straight to the store (and so to localStorage); in the world the new
// vehicle takes over where the old one stood (Vehicle.tsx).
import type { CSSProperties } from "react";
import { Count, d } from "@/components/brand/motion";
import { setState, useWorld } from "@/components/world/store";
import { LIVERY_NAMES, VEHICLES, liveryOf, vehicleByCode, type VehicleDef } from "@/components/world/vehicles";
import { reenterGarage } from "@/components/world/bloom/state";

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

/**
 * Settings' vehicle section: the four cards two by two, the chosen one's livery and stats, and the
 * way into the full garage (G). A card swaps the vehicle in place, where the car stands.
 */
export function VehicleSettings({ n }: { n: number }) {
  const code = useWorld((s) => s.vehicle);
  const v = vehicleByCode[code];
  return (
    <div className="pt-4">
      <p className="mb-2 flex items-baseline gap-3 border-b border-ink pb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.06em]">
        <span className="font-mono text-signal">{n}</span>Vehicle
      </p>
      <div className="grid grid-cols-2 border-2 border-ink">
        {VEHICLES.map((o, i) => (
          <VehicleCard key={o.code} v={o} on={o.code === code} onClick={() => setState({ vehicle: o.code })} className={`py-2 ${i % 2 === 0 ? "border-r-2" : ""} ${i < 2 ? "border-b-2" : ""}`} />
        ))}
      </div>
      <div key={code} data-anim="" data-run="" className="mt-3 space-y-3">
        <LiverySwatches v={v} />
        <div className="space-y-2.5 pt-1">
          <StatBars v={v} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          setState({ settingsOpen: false });
          reenterGarage();
        }}
        className="mt-4 flex w-full items-center gap-2 border-t border-rule pt-3 text-left text-[13.5px] hover:text-signal"
      >
        <kbd className="x-key">G</kbd> Open the garage
      </button>
    </div>
  );
}
