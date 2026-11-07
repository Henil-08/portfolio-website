"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { getState, setState, useWorld } from "@/components/world/store";
import { radioBeep, radioLine } from "@/components/world/sound";
import { radioLines, radioText } from "@/content/radio";
import type { ZoneId } from "@/components/world/layout";
import { Decode, Stage, d } from "@/components/brand/motion";
import { useSheetBox } from "./Panels";

let msgId = 0;

// The engineer speaks when you open a place (Enter), once per place. Never on a drive-by.
export default function RadioMessages() {
  const near = useWorld((s) => s.zone);
  const msg = useWorld((s) => s.radioMsg);
  const live = useWorld((s) => s.phase === "world");
  const heard = useRef(new Set<ZoneId>());
  // The line plays as a place's sheet opens: keep it beside the sheet, never under it. A side sheet
  // (Hud.tsx Sheet, 440 px from sm; the garage's reading panel, Panels.tsx useSheetBox) leaves the
  // radio the screen to its left; a bottom sheet (phones, a portrait garage) sends it up under the tabs.
  const box = useSheetBox(near);
  const side = box && "width" in box ? { paddingRight: Number(box.width) + Number(box.right ?? 0) + 24 } : undefined;
  const place = !near ? "bottom-[96px]" : box ? (side ? "bottom-[96px]" : "top-[64px]") : "max-sm:top-[60px] sm:bottom-[96px] sm:pr-[484px]";

  useEffect(() => {
    // Nothing plays behind the start screen.
    if (!live || !near || heard.current.has(near)) return;
    heard.current.add(near);
    const line = radioLines[near];
    if (!line) return;
    const id = ++msgId;
    setState({ radioMsg: { id, text: radioText(line) } });
    if (getState().voice) void radioLine(near);
    else void radioBeep();
    const t = setTimeout(() => {
      if (getState().radioMsg?.id === id) setState({ radioMsg: null });
    }, 8500);
    return () => clearTimeout(t);
  }, [near, live]);

  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className={`pointer-events-none fixed inset-x-0 z-20 flex justify-center px-6 ${place}`}
          style={side}
        >
          {/* The radio panel (docs/BRAND.md S02): who is talking on an ink bar with the live
              waveform, then the line decoding in as it is said. */}
          <Stage motion className="w-full max-w-[560px]">
            {(run) => (
              <div className="dsa-frame border-2 border-ink bg-white shadow-[3px_3px_0_var(--color-ink)]" style={d(0)}>
                <div className="flex items-center justify-between bg-ink px-3 py-1.5 font-mono text-[11.5px] text-white">
                  <span>RADIO · Race engineer</span>
                  <span className="flex h-3 items-end gap-[2px]" aria-hidden>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span key={i} className="x-wave block h-3 w-[3px] bg-signal" style={{ animationDelay: `${i * 90}ms` }} />
                    ))}
                  </span>
                </div>
                <p className="px-3 py-2.5 text-[14.5px] leading-relaxed">
                  <Decode text={msg.text} run={run} delay={150} dur={1400} />
                </p>
              </div>
            )}
          </Stage>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
