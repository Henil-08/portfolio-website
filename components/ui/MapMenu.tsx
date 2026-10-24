"use client";

// The map (M): a top-down picture of the real world (components/world/MapCapture.tsx) in a
// framed panel, after folio-2025's map modal, in the site's ink and cream.
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { setState, teleport, useWorld } from "@/components/world/store";
import { zones } from "@/components/world/layout";
import { zoneMeta } from "./Panels";
import { Achievements } from "./Hud";

export default function MapMenu() {
  const open = useWorld((s) => s.menuOpen);
  const shot = useWorld((s) => s.mapShot);
  const found = useWorld((s) => s.found);
  const close = () => setState({ menuOpen: false });
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="no-scrollbar fixed inset-0 z-40 flex flex-col items-center overflow-y-auto px-3 pb-6 pt-16 sm:pt-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={close}
        >
          <div
            className="map-frame relative aspect-square w-[min(94vw,calc(100svh-7rem),900px)] shrink-0 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              aria-label="Close map"
              className="map-tab group absolute bottom-full right-2.5 h-11 w-[50px] overflow-hidden"
            >
              <span className="absolute inset-x-0 top-0 h-[calc(100%+4px)] bg-[radial-gradient(ellipse_at_top_right,#ff4b3e,#a3241c)] transition-transform duration-150 group-hover:-translate-y-1" />
              <svg
                viewBox="0 0 24 24"
                className="relative mx-auto h-[18px] w-[18px]"
                fill="none"
                stroke="#fff8ec"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
            <div className="absolute inset-0 overflow-hidden">
              {shot && (
                <motion.img
                  key={shot.url}
                  src={shot.url}
                  alt="Top-down map of the island"
                  className="absolute inset-0 h-full w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  draggable={false}
                />
              )}
            </div>
          </div>

          <div
            className="mt-4 w-[min(94vw,calc(100svh-7rem),900px)] rounded-[22px] bg-[#1f2133] p-4 text-cream"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => teleport(z.id)}
                  className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2 text-left transition hover:bg-white/10"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rotate-45"
                    style={{ background: zoneMeta[z.id].color }}
                  />
                  <span className="min-w-0 truncate text-[13px] font-semibold">
                    {z.label}
                  </span>
                  {found.includes(z.id) && (
                    <span className="ml-auto text-green">✓</span>
                  )}
                </button>
              ))}
            </div>
            <Achievements dark />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setState({ menuOpen: false, fitOpen: true })}
                className="rounded-xl bg-red px-3 py-2.5 text-[13px] font-semibold text-white"
              >
                Hiring? Check the fit
              </button>
              <Link
                href="/resume"
                className="grid place-items-center rounded-xl bg-cream px-3 py-2.5 text-[13px] font-semibold text-ink"
              >
                One-page resume
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
