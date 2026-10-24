"use client";

// The map (M): a top-down picture of the real world (components/world/MapCapture.tsx) in a
// framed panel, after folio-2025's map modal (sources/Game/Map.js, style/map.styl), in the
// site's ink and cream. Diamond pins for every place and contact medallion; labels pop
// on hover with the original's springy curves (on touch, the first tap shows the label
// and the second goes); the player arrow turns with the car.
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { carState } from "@/components/world/carState";
import { worldToMap } from "@/components/world/MapCapture";
import { setState, useWorld } from "@/components/world/store";
import { wipeTo } from "@/components/world/Overlay";
import { zones, type ZoneId } from "@/components/world/layout";
import { LINKS, LINK_SPOTS } from "@/components/world/social";
import { ACHIEVEMENTS } from "@/content/achievements";

type Pin = { id: string; label: string; x: number; y: number; zone: ZoneId; small?: boolean };

const PINS: Pin[] = [
  ...zones.map((z) => ({ id: z.id, label: z.label, zone: z.id, ...worldToMap(z.pos[0], z.pos[1]) })),
  ...LINKS.map((l, i) => ({ id: `link-${l.key}`, label: l.name, zone: "contact" as ZoneId, small: true, ...worldToMap(LINK_SPOTS[i][0], LINK_SPOTS[i][1]) })),
];

export default function MapMenu() {
  const open = useWorld((s) => s.menuOpen);
  const shot = useWorld((s) => s.mapShot);
  const found = useWorld((s) => s.found);
  const got = useWorld((s) => s.achievements);
  const [tab, setTab] = useState<"map" | "achievements">("map");
  const close = () => setState({ menuOpen: false });
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 grid place-items-center px-3 pb-3 pt-14"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={close}
        >
          <div className="map-frame relative aspect-square w-[min(94vw,calc(100svh-5.5rem),900px)] select-none" onClick={(e) => e.stopPropagation()}>
            <div className="absolute bottom-full left-2.5 flex gap-1">
              {(["map", "achievements"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`map-tab relative h-9 px-3 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors sm:h-10 sm:px-4 ${
                    tab === t ? "bg-[#1f2133] text-cream" : "bg-[#171928]/80 text-cream/55 hover:text-cream"
                  }`}
                >
                  {t === "map" ? "Map" : `Achievements ${got.length}/${ACHIEVEMENTS.length}`}
                </button>
              ))}
            </div>
            <button onClick={close} aria-label="Close map" className="map-tab group absolute bottom-full right-2.5 h-11 w-[50px] overflow-hidden">
              <span className="absolute inset-x-0 top-0 h-[calc(100%+4px)] bg-[radial-gradient(ellipse_at_top_right,#ff4b3e,#a3241c)] transition-transform duration-150 group-hover:-translate-y-1" />
              <svg viewBox="0 0 24 24" className="relative mx-auto h-[18px] w-[18px]" fill="none" stroke="#fff8ec" strokeWidth="2.4" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
            {tab === "map" ? (
              <div className="absolute inset-0 overflow-hidden">
                {shot && (
                  <motion.img
                    key={shot.url}
                    src={shot.url}
                    alt="Top-down map of the island"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    draggable={false}
                  />
                )}
                <Pins found={found} />
                <Player />
              </div>
            ) : (
              <AchievementList got={got} />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Earned ones show their name; the rest stay "???" with how to get them as the hint.
function AchievementList({ got }: { got: string[] }) {
  return (
    <div className="no-scrollbar absolute inset-0 flex flex-col overflow-y-auto p-5 text-cream sm:p-8">
      <div className="grid gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const on = got.includes(a.id);
          return (
            <div key={a.id} className={`flex items-start gap-3 border px-3 py-2.5 ${on ? "border-cream/40" : "border-dashed border-cream/15"}`}>
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rotate-45 ${on ? "bg-red" : "border border-cream/30"}`} />
              <span className="min-w-0">
                <span className={`block text-[14px] font-semibold ${on ? "" : "text-cream/45"}`}>{on ? a.name : "???"}</span>
                <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-cream/50">{a.how}</span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
        <button onClick={() => setState({ menuOpen: false, fitOpen: true })} className="bg-red px-3 py-2.5 text-[13px] font-semibold text-white">
          Hiring? Check the fit
        </button>
        <Link href="/resume" className="grid place-items-center bg-cream px-3 py-2.5 text-[13px] font-semibold text-ink">
          One-page resume
        </Link>
      </div>
    </div>
  );
}

function Pins({ found }: { found: ZoneId[] }) {
  const [touch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const [active, setActive] = useState<string | null>(null);
  const go = (p: Pin) => {
    if (touch && active !== p.id) return setActive(p.id);
    wipeTo(p.zone);
  };
  return (
    <>
      {PINS.map((p) => (
        <button
          key={p.id}
          onClick={() => go(p)}
          aria-label={p.label}
          className={`map-pin group absolute -ml-5 -mt-5 h-10 w-10 ${active === p.id ? "is-active" : ""}`}
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, zIndex: Math.round(p.y * 1000) }}
        >
          <span
            className={`absolute left-1/2 top-1/2 rotate-45 border-ink shadow-[0_0_4px_#1f213377] ${found.includes(p.zone) && !p.small ? "bg-red" : "bg-cream"} ${
              p.small ? "-ml-[5px] -mt-[5px] h-[10px] w-[10px] border-[2.5px]" : "-ml-2 -mt-2 h-4 w-4 border-[3.5px] sm:-ml-2.5 sm:-mt-2.5 sm:h-5 sm:w-5 sm:border-4"
            }`}
          />
          <span className="pointer-events-none absolute bottom-[calc(100%-6px)] left-1/2 flex w-0 justify-center">
            <span className="map-pin-name whitespace-nowrap bg-[#171928] px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-cream shadow-[0_0_4px_#0007] sm:text-[12.5px]">
              {p.label}
            </span>
          </span>
        </button>
      ))}
    </>
  );
}

// The car on the map: a red arrow that points where the car points.
function Player() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let lx = NaN;
    let lz = NaN;
    let la = NaN;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = ref.current;
      if (!el) return;
      const x = Math.round(carState.pos.x * 2) / 2;
      const z = Math.round(carState.pos.z * 2) / 2;
      // +x right and +z down on the map, so the bearing on screen is atan2(fz, fx)
      const a = Math.round(Math.atan2(carState.forward.z, carState.forward.x) * 50) / 50;
      if (x === lx && z === lz && a === la) return;
      lx = x;
      lz = z;
      la = a;
      const m = worldToMap(x, z);
      el.style.left = `${m.x * 100}%`;
      el.style.top = `${m.y * 100}%`;
      el.style.transform = `rotate(${a}rad)`;
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div ref={ref} className="pointer-events-none absolute z-[2000] h-0 w-0">
      <svg viewBox="-20 -20 40 40" className="absolute -left-4 -top-4 h-8 w-8 drop-shadow-[0_0_3px_#1f2133aa] sm:-left-5 sm:-top-5 sm:h-10 sm:w-10">
        <path d="M14 0 -10 -11 -5 0 -10 11Z" fill="#ff4b3e" stroke="#fff8ec" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
