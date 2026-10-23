"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { getState, setState, useWorld } from "@/components/world/store";
import { radioBeep, radioLine } from "@/components/world/sound";
import { radioLines } from "@/content/radio";
import type { ZoneId } from "@/components/world/layout";

let msgId = 0;

// The engineer chimes in the first time you reach a place.
export default function RadioMessages() {
  const near = useWorld((s) => s.near);
  const msg = useWorld((s) => s.radioMsg);
  const heard = useRef(new Set<ZoneId>());

  useEffect(() => {
    if (!near || heard.current.has(near)) return;
    heard.current.add(near);
    const line = radioLines[near];
    if (!line) return;
    const id = ++msgId;
    setState({ radioMsg: { id, text: line } });
    if (getState().voice) void radioLine(near);
    else void radioBeep();
    const t = setTimeout(() => {
      if (getState().radioMsg?.id === id) setState({ radioMsg: null });
    }, 6500);
    return () => clearTimeout(t);
  }, [near]);

  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          className="pointer-events-none fixed bottom-[84px] left-3 z-20 max-w-[340px] overflow-hidden rounded-xl bg-[#121216]/90 text-white shadow-xl backdrop-blur sm:left-5"
        >
          <div className="flex items-center gap-2 bg-[#e10600] px-3 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            <span className="font-racing text-[10px] tracking-[0.18em]">TEAM RADIO</span>
          </div>
          <p className="px-3 py-2.5 font-racing text-[13px] leading-snug tracking-wide">&ldquo;{msg.text.toUpperCase()}&rdquo;</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
