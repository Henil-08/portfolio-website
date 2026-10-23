"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/ask";
import { setState, useWorld } from "@/components/world/store";
import { radioBeep, radioSpeak } from "@/components/world/sound";
import { runAction, type Action } from "@/components/world/actions";
import { usePushToTalk } from "./usePushToTalk";

type Entry = ChatMessage | { role: "tool"; content: string };

const starters = ["Show me his agent work", "Make it night", "What does he do at Waters?", "Rain, please"];

// The race engineer: answers questions and drives the world through tool calls.
export default function Ask() {
  const open = useWorld((s) => s.askOpen);
  const [log, setLog] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const radio = useWorld((s) => s.voice);
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [log]);
  useEffect(() => {
    if (open) setTimeout(() => field.current?.focus(), 150);
  }, [open]);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setText("");
    const history = [...log.filter((e): e is ChatMessage => e.role !== "tool"), { role: "user" as const, content: question }];
    setLog((l) => [...l, { role: "user", content: question }]);
    setBusy(true);
    if (radio) radioBeep();
    let reply = "Lost the connection there. Try again?";
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-8), voice: radio ? "radio" : "terminal" }),
      });
      const data = (await res.json()) as { reply: string; actions: Action[] };
      const lines = (data.actions ?? []).map((a) => runAction(a));
      reply = data.reply;
      setLog((l) => [...l, ...lines.map((content) => ({ role: "tool" as const, content })), { role: "assistant", content: reply }]);
    } catch {
      setLog((l) => [...l, { role: "assistant", content: reply }]);
    }
    setBusy(false);
    if (radio) radioSpeak(reply);
  };

  // Hold V (or the mic button) and just say it.
  const ptt = usePushToTalk((t) => {
    setState({ askOpen: true });
    send(t);
  });

  return (
    <>
      {ptt.state !== "idle" && !open && (
        <div className="pointer-events-none fixed bottom-20 left-5 z-30 flex items-center gap-2 rounded-full bg-[#121216]/90 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white">
          <span className={`h-2 w-2 rounded-full ${ptt.state === "listening" ? "animate-pulse bg-[#e10600]" : "bg-white/50"}`} />
          {ptt.state === "listening" ? "Transmitting" : ptt.state === "thinking" ? "Copy, one sec" : "Mic blocked"}
        </div>
      )}
      <button
        onClick={() => setState((s) => ({ askOpen: !s.askOpen }))}
        className="toy-btn fixed right-3 top-[76px] z-30 flex items-center gap-2 rounded-2xl bg-ink px-3.5 py-2.5 text-sm font-semibold text-white sm:bottom-5 sm:left-5 sm:right-auto sm:top-auto sm:px-4 sm:py-3"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e10600] opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#e10600]" />
        </span>
        <span className="font-racing text-[12px] tracking-[0.14em]">{open ? "CLOSE" : "RADIO"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="fixed inset-x-3 top-[128px] z-30 flex max-h-[62svh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#121216]/95 text-white shadow-2xl backdrop-blur sm:inset-x-auto sm:bottom-[84px] sm:left-5 sm:right-auto sm:top-auto sm:w-[400px]"
          >
            <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3">
              <span className="rounded bg-[#e10600] px-2 py-0.5 font-racing text-[10px] tracking-[0.18em]">TEAM RADIO</span>
              <span className="font-mono text-[11px] text-white/45">race engineer</span>
              <button
                onClick={() => setState((s) => ({ voice: !s.voice }))}
                className={`ml-auto rounded-full px-3 py-1 font-mono text-[10.5px] uppercase tracking-wider transition ${
                  radio ? "bg-white text-black" : "bg-white/10 text-white/60 hover:text-white"
                }`}
                aria-pressed={radio}
              >
                Voice {radio ? "on" : "off"}
              </button>
            </div>

            <div ref={box} className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[13.5px] leading-relaxed">
              {log.length === 0 && (
                <div className="space-y-3">
                  <p className="text-white/70">Radio check. Ask me anything about Henil, or ask me to show you something.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {starters.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border border-white/15 px-3 py-1 text-[12px] text-white/80 transition hover:border-white/40"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {log.map((m, i) =>
                m.role === "user" ? (
                  <p key={i} className="text-right">
                    <span className="inline-block rounded-2xl bg-white/10 px-3 py-1.5">{m.content}</span>
                  </p>
                ) : m.role === "tool" ? (
                  <p key={i} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#7ee0b0]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#19d27a]" />
                    Race control · {m.content}
                  </p>
                ) : (
                  <p key={i} className="whitespace-pre-wrap border-l-2 border-[#e10600] pl-3 text-white/90">
                    {m.content}
                  </p>
                )
              )}
              {busy && <p className="caret border-l-2 border-[#e10600] pl-3 text-white/50">&nbsp;</p>}
            </div>

            <form
              className="flex items-center gap-2 border-t border-white/[0.07] px-4 py-3"
              onSubmit={(e) => {
                e.preventDefault();
                send(text);
              }}
            >
              <input
                ref={field}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={400}
                placeholder={ptt.state === "listening" ? "Listening…" : "Talk to your engineer, or hold V…"}
                aria-label="Talk to the race engineer"
                className="flex-1 bg-transparent text-[13.5px] text-white outline-none placeholder:text-white/30"
              />
              <button
                type="button"
                onPointerDown={ptt.start}
                onPointerUp={ptt.stop}
                onPointerLeave={ptt.stop}
                aria-label="Hold to talk"
                className={`grid h-8 w-8 place-items-center rounded-full transition ${
                  ptt.state === "listening" ? "bg-[#e10600]" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              </button>
              <button disabled={busy || !text.trim()} className="rounded-lg bg-[#e10600] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40">
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
