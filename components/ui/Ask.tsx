"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ask, type ChatMessage } from "@/lib/ask";
import { setState, useWorld } from "@/components/world/store";
import { radioSay, squelch } from "@/components/world/sound";
import { Spark } from "./Intro";

const starters = ["What does he do at Waters?", "Best project?", "Is he good with agents?", "Why hire him?"];

export default function Ask() {
  const open = useWorld((s) => s.askOpen);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [radio, setRadio] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);
  useEffect(() => {
    if (open) setTimeout(() => field.current?.focus(), 150);
  }, [open]);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setText("");
    const next: ChatMessage[] = [...msgs, { role: "user", content: question }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setBusy(true);
    if (radio) squelch();
    let reply = "";
    try {
      await ask(next, radio ? "radio" : "terminal", (c) => {
        reply += c;
        setMsgs([...next, { role: "assistant", content: reply }]);
      });
    } catch {
      reply = "Lost the connection there. Try again?";
      setMsgs([...next, { role: "assistant", content: reply }]);
    }
    setBusy(false);
    if (radio) radioSay(reply);
  };

  return (
    <>
      <button
        onClick={() => setState((s) => ({ askOpen: !s.askOpen }))}
        className="toy-btn fixed right-3 top-[76px] z-30 flex items-center gap-2 rounded-2xl bg-ink px-3.5 py-2.5 text-sm font-semibold text-white sm:bottom-5 sm:left-5 sm:right-auto sm:top-auto sm:px-4 sm:py-3"
      >
        <Spark className="h-4 w-4 text-[#e8825f]" />
        <span className="hidden sm:inline">{open ? "Close" : "Ask Claude about me"}</span>
        <span className="sm:hidden">{open ? "Close" : "Ask"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="fixed inset-x-3 top-[128px] z-30 flex max-h-[62svh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#16161c]/95 text-white shadow-2xl backdrop-blur sm:inset-x-auto sm:bottom-[84px] sm:left-5 sm:right-auto sm:top-auto sm:w-[400px]"
          >
            <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3">
              <Spark className="h-4 w-4 text-[#e8825f]" />
              <span className="font-mono text-xs text-white/70">{radio ? "team radio" : "claude"}</span>
              <button
                onClick={() => setRadio((r) => !r)}
                className={`ml-auto rounded-full px-3 py-1 font-mono text-[10.5px] uppercase tracking-wider transition ${
                  radio ? "bg-red text-white" : "bg-white/10 text-white/60 hover:text-white"
                }`}
                aria-pressed={radio}
              >
                📻 Radio {radio ? "on" : "off"}
              </button>
            </div>

            <div ref={box} className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4 font-mono text-[13px] leading-relaxed">
              {msgs.length === 0 && (
                <div className="space-y-3">
                  <p className="text-white/70">
                    {radio
                      ? "Radio check. This is Henil's race engineer. Go ahead."
                      : "I know Henil's whole career. Ask me anything."}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {starters.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border border-white/15 px-3 py-1 font-sans text-[12px] text-white/80 transition hover:border-white/40"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) =>
                m.role === "user" ? (
                  <p key={i} className="text-white">
                    <span className="mr-2 text-red">&gt;</span>
                    {m.content}
                  </p>
                ) : (
                  <p key={i} className={`whitespace-pre-wrap text-white/85 ${!m.content || (busy && i === msgs.length - 1) ? "caret" : ""}`}>
                    {m.content}
                  </p>
                )
              )}
            </div>

            <form
              className="flex items-center gap-2 border-t border-white/[0.07] px-4 py-3"
              onSubmit={(e) => {
                e.preventDefault();
                send(text);
              }}
            >
              <span className="font-mono text-red">&gt;</span>
              <input
                ref={field}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={400}
                placeholder="ask about Henil…"
                aria-label="Ask about Henil"
                className="flex-1 bg-transparent font-mono text-[13px] text-white outline-none placeholder:text-white/30"
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
