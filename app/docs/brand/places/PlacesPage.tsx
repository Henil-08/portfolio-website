"use client";

// Every interactable place in the game, for review: a live, orbitable view of the real world
// framed on the place, what interacting does, and the real sheet it opens (Panels.tsx
// PanelBody). The 3D is one canvas for the page (Scene.tsx), loaded after the page itself.
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { pad } from "@/components/brand/tokens";
import { Lockup } from "@/components/brand/mark";
import { PanelBody, zoneCode, zoneMeta } from "@/components/ui/Panels";
import { closeZone, getState, openZone, setState, useWorld } from "@/components/world/store";
import { carState } from "@/components/world/carState";
import { PLAZA, LANES, T0, T1, zOf } from "@/components/world/timeline/data";
import { TIMELINE, zoneById, type ZoneId } from "@/components/world/layout";
import { LINKS, LINK_SPOTS, openLink } from "@/components/world/social";
import { START_SPOT } from "@/components/world/startSpot";
import { heightAt } from "@/components/world/terrain";
import { ALL_PLACES, SECTIONS, type Place } from "./places";
import { registerView } from "./views";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

/** The box a card's live view is drawn into. */
function LiveView({ place }: { place: Place }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    return registerView(place.slug, el, place.view);
  }, [place]);
  return <div ref={box} data-cursor="drag" className="aspect-[4/3] w-full touch-none border-b-2 border-ink bg-[#e9e7e1]" aria-label={`Live view of ${place.name}, drag to turn`} />;
}

/** The sheet a zone opens, as the HUD frames it (Hud.tsx Sheet), drawn in place instead of fixed. */
function SheetPreview({ zone }: { zone: ZoneId }) {
  return (
    <aside className="flex min-h-0 flex-col border-2 border-ink bg-white shadow-[4px_4px_0_var(--color-ink)]">
      <div className="flex items-center gap-3 bg-ink px-4 py-2 font-mono text-[12px] text-white">
        <span className="min-w-0 truncate">
          {zoneCode(zone)} · {zoneMeta[zone].kicker}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <span className="bg-white px-1.5 text-ink">Esc</span> Close
        </span>
      </div>
      <div className="no-scrollbar max-h-[560px] min-h-0 overflow-y-auto px-5 pb-5 pt-4">
        <h2 className="mb-4 text-[24px] font-semibold leading-tight tracking-tight">{zoneMeta[zone].title}</h2>
        <PanelBody zone={zone} />
      </div>
    </aside>
  );
}

function Head({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h4 className="mb-2 flex items-baseline gap-3 border-b border-ink pb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.06em]">
      <span className="font-mono text-signal">{n}</span>
      {children}
    </h4>
  );
}

/** The contact ring: every medallion is its own interactable. */
function Medallions() {
  return (
    <div className="border-2 border-ink bg-white p-4">
      <Head n="M">Medallions · {LINKS.length} links</Head>
      {LINKS.map((l, i) => (
        <button
          key={l.key}
          type="button"
          onMouseEnter={() => setState({ nearLink: l.key })}
          onMouseLeave={() => setState({ nearLink: null })}
          onClick={() => openLink(l.key)}
          className="x-row grid w-full grid-cols-[38px_1fr_auto_18px] items-center gap-3 border-b border-rule px-1 py-2 text-left text-[14px]"
        >
          <span className="font-mono text-[12px] text-signal">L{pad(i + 1)}</span>
          <span className="font-medium">{l.name}</span>
          <span className="x-mute font-mono text-[11.5px] text-graphite">
            {LINK_SPOTS[i][0].toFixed(1)}, {LINK_SPOTS[i][1].toFixed(1)}
          </span>
          <span className="x-arrow">↗</span>
        </button>
      ))}
      <p className="mt-2 text-[13px] text-graphite">Hover a row to open its prompt in the view; click opens the link, as E does in the game.</p>
    </div>
  );
}

// The stand-in car for the timeline: a point on the terrace's centre line at a given year.
function carAtYear(year: number) {
  const lx = (PLAZA.minX + PLAZA.maxX) / 2;
  const lz = zOf(year);
  const c = Math.cos(TIMELINE.rot);
  const s = Math.sin(TIMELINE.rot);
  const x = TIMELINE.pos[0] + lx * c + lz * s;
  const z = TIMELINE.pos[1] - lx * s + lz * c;
  carState.pos.set(x, heightAt(x, z) + 0.5, z);
}
const AWAY = 9999;
const TL_DEFAULT = 2024.6;
// no car on this page: park the telemetry off the island so nothing reacts to (0, 0), which
// is on the timeline terrace (the timeline card moves it when it mounts)
carState.pos.set(AWAY, 0, AWAY);

function TimelineDrive() {
  const [year, setYear] = useState(TL_DEFAULT);
  useEffect(() => {
    carAtYear(TL_DEFAULT);
    return () => {
      carState.pos.set(AWAY, 0, AWAY);
    };
  }, []);
  return (
    <div className="border-2 border-ink bg-white p-4">
      <Head n="1">Drive along</Head>
      <label className="flex items-center gap-3 text-[13px]">
        <span className="font-mono text-[12px]">{T0}</span>
        <input
          type="range"
          min={T0}
          max={T1}
          step={0.05}
          value={year}
          onChange={(e) => {
            const y = Number(e.target.value);
            setYear(y);
            carAtYear(y);
          }}
          className="min-w-0 flex-1 accent-[#111]"
          aria-label="Stand-in car position, in years"
        />
        <span className="font-mono text-[12px]">{T1}</span>
      </label>
      <p className="mt-1 font-mono text-[12px] text-graphite">
        Car at <span className="text-signal">{year.toFixed(1)}</span>
      </p>
      <div className="mt-4">
        <Head n="2">Stones · {LANES.length} lanes</Head>
        {LANES.map((l) => {
          const up = (year > l.start - 0.2 && year < l.end + 0.2) || (year >= l.end && l.ongoing);
          return (
            <div key={l.key} className="grid grid-cols-[22px_1fr_auto] items-baseline gap-2 border-b border-rule py-2 text-[13.5px]">
              <span className={`mt-1 h-[8px] w-[8px] ${up ? "bg-signal" : "border border-ink"}`} />
              <span className="min-w-0">
                <span className="block font-semibold">{l.title}</span>
                <span className="block text-[12.5px] text-graphite">{l.lines.join(" · ")}</span>
              </span>
              <span className="font-mono text-[11.5px] text-graphite">
                {l.start.toFixed(1)}–{l.ongoing ? "now" : l.end.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StartData() {
  return (
    <div className="border-2 border-ink bg-white p-4">
      <Head n="1">Spawn</Head>
      <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 font-mono text-[12.5px]">
        <dt className="text-graphite">Position</dt>
        <dd>
          {START_SPOT[0]}, {START_SPOT[1]}
        </dd>
        <dt className="text-graphite">Heading</dt>
        <dd>{START_SPOT[2]} rad</dd>
        <dt className="text-graphite">Sheet</dt>
        <dd>None</dd>
      </dl>
    </div>
  );
}

/** ← → in an open garage, as Hud.tsx InteractKey does. */
function stepGarage(zone: ZoneId, d: -1 | 1) {
  const n = projects.filter((p) => `garage-${p.domain}` === zone).length;
  setState((s) => ({ garageSel: (s.garageSel + d + n) % n }));
}

function PlaceCard({ place, i }: { place: Place; i: number }) {
  const open = useWorld((s) => s.zone);
  const zone = place.zone;
  return (
    <article
      id={place.slug}
      className="scroll-mt-20 border-2 border-ink bg-white"
      onMouseEnter={() => zone && setState({ near: zone })}
      onMouseLeave={() => zone && getState().near === zone && setState({ near: null })}
    >
      <div className="flex justify-between gap-4 bg-ink px-3 py-1.5 font-mono text-[12px] text-white">
        <span>
          HG-08 / <span className="text-signal">{place.code}</span> · {pad(i + 1)}
        </span>
        <span className="truncate text-white/60">{zone ? `zone "${zone}"` : "no zone"} · live world, pinned camera</span>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="min-w-0 border-ink lg:border-r-2">
          <LiveView place={place} />
          <div className="p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-[22px] font-semibold tracking-tight">{place.name}</h3>
              <span className="font-mono text-[12px] text-graphite">{place.kicker}</span>
              {zone && (
                <button type="button" onClick={() => (open === zone ? closeZone() : openZone(zone))} className={`x-btn ml-auto ${open === zone ? "x-primary" : "x-secondary"}`}>
                  <span className="x-key !h-[20px] !min-w-[20px] !text-[11px] text-ink">E</span>
                  {open === zone ? "Close in world" : "Open in world"}
                </button>
              )}
              {zone?.startsWith("garage-") && open === zone && (
                <span className="flex gap-1.5">
                  {([-1, 1] as const).map((d) => (
                    <button key={d} type="button" onClick={() => stepGarage(zone, d)} className="x-key" aria-label={d < 0 ? "Previous project" : "Next project"}>
                      {d < 0 ? "←" : "→"}
                    </button>
                  ))}
                </span>
              )}
            </div>
            <dl className="mt-3 grid gap-x-4 gap-y-2 text-[14px] leading-relaxed sm:grid-cols-[110px_1fr]">
              <dt className="font-mono text-[12px] uppercase text-graphite">Trigger</dt>
              <dd>{place.trigger}</dd>
              <dt className="font-mono text-[12px] uppercase text-graphite">Interact</dt>
              <dd>
                <ul className="space-y-1">
                  {place.interact.map((t) => (
                    <li key={t} className="grid grid-cols-[12px_1fr] gap-1.5">
                      <span className="mt-[0.6em] h-[5px] w-[5px] bg-ink" />
                      {t}
                    </li>
                  ))}
                </ul>
              </dd>
              <dt className="font-mono text-[12px] uppercase text-graphite">Drawn by</dt>
              <dd className="font-mono text-[12px]">{place.parts}</dd>
              {zone && (
                <>
                  <dt className="font-mono text-[12px] uppercase text-graphite">Hotspot</dt>
                  <dd className="font-mono text-[12px]">
                    {zoneById[zone].size[0]} × {zoneById[zone].size[1]} m · spawn {zoneById[zone].spawn[0].toFixed(1)}, {zoneById[zone].spawn[1].toFixed(1)}
                  </dd>
                </>
              )}
            </dl>
          </div>
        </div>
        <div className="min-w-0 space-y-4 bg-paper p-4">
          <p className="font-mono text-[12px] uppercase text-graphite">{zone ? "Opens" : "Data"}</p>
          {zone && <SheetPreview zone={zone} />}
          {zone === "contact" && <Medallions />}
          {place.slug === "timeline" && <TimelineDrive />}
          {place.slug === "start" && <StartData />}
        </div>
      </div>
    </article>
  );
}

export default function PlacesPage() {
  useEffect(() => {
    // the E prompts stay hidden until the opening has played; here there is no opening
    setState({ revealed: true });
  }, []);
  return (
    <div className="relative min-h-screen bg-paper pb-24 text-ink">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-4 py-2.5 sm:px-8">
          <Link href="/docs/brand/system">
            <Lockup size={17} name={profile.name} />
          </Link>
          <span className="hidden font-mono text-[12px] text-graphite sm:inline">HG-08 · Places</span>
          <nav className="ml-auto flex gap-4 font-mono text-[12px] text-graphite">
            <Link href="/docs/brand/system" className="hover:text-ink">
              Design system
            </Link>
            <Link href="/docs/brand/world" className="hover:text-ink">
              World
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-4 sm:px-8">
        <div className="pt-12 sm:pt-16">
          <p className="font-mono text-[12px] text-graphite">HG-08 · Places · For review</p>
          <h1 className="mt-2 max-w-3xl text-[40px] font-semibold leading-[1.02] tracking-tight sm:text-[64px]">
            Every place you can stop at<span className="text-signal">.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-graphite">
            {`${ALL_PLACES.length} places`}, read from the game&apos;s own data. Each view is the live world, the same components the game draws, so it changes when they do. Drag a view to turn
            it; hover a card to open its prompt. Beside it: what you do there and the sheet it opens.
          </p>
        </div>

        {/* index */}
        <nav aria-label="Places" className="mt-10 grid grid-cols-1 gap-px border-2 border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((s) => (
            <div key={s.n} className="bg-white p-3">
              <p className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.06em]">
                <span className="mr-2 font-mono text-signal">{s.n}</span>
                {s.title}
              </p>
              {s.places.map((p) => (
                <a key={p.slug} href={`#${p.slug}`} className="x-row grid grid-cols-[38px_1fr_18px] items-center gap-2 border-b border-rule px-1 py-1.5 text-[14px]">
                  <span className="font-mono text-[12px] text-signal">{p.code}</span>
                  <span className="truncate">{p.name}</span>
                  <span className="x-arrow">→</span>
                </a>
              ))}
            </div>
          ))}
        </nav>

        {SECTIONS.map((s) => (
          <section key={s.n} className="pt-16">
            <div className="flex items-baseline gap-4 border-b-[3px] border-ink pb-3">
              <span className="font-mono text-[15px] text-signal">{s.n}</span>
              <h2 className="text-[30px] font-semibold leading-none tracking-tight sm:text-[40px]">{s.title}</h2>
            </div>
            <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-graphite">{s.note}</p>
            <div className="mt-6 space-y-6">
              {s.places.map((p) => (
                <PlaceCard key={p.slug} place={p} i={ALL_PLACES.indexOf(p)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <Scene />
    </div>
  );
}
