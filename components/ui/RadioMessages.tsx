"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { getState, setState, useWorld } from "@/components/world/store";
import { radioBeep, radioLine } from "@/components/world/sound";
import { radioLines, radioText } from "@/content/radio";
import type { ZoneId } from "@/components/world/layout";

let msgId = 0;

// The engineer speaks when you open a place (Enter), once per place. Never on a drive-by.
export default function RadioMessages() {
  const near = useWorld((s) => s.zone);
  const msg = useWorld((s) => s.radioMsg);
  const live = useWorld((s) => s.phase === "world");
  const heard = useRef(new Set<ZoneId>());

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
          className="pointer-events-none fixed inset-x-0 bottom-[96px] z-20 flex justify-center px-6"
        >
          {/* Broadcast-style subtitle: who's talking, then the line. */}
          <p className="hud-panel max-w-[560px] px-4 py-2.5 text-[14.5px] leading-relaxed">
            <span className="mr-2.5 inline-block bg-red px-1.5 py-px align-[1px] font-mono text-[10px] uppercase tracking-[0.16em] text-white">Pit wall</span>
            {msg.text}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
