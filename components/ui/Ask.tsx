"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/ask";
import { achieve, setState, useWorld } from "@/components/world/store";
import { radioBeep, radioSpeak } from "@/components/world/sound";
import { runAction, type Action } from "@/components/world/actions";
import { usePushToTalk } from "./usePushToTalk";
import { Decode } from "@/components/brand/motion";

type Entry = ChatMessage | { role: "tool"; content: string };

const starters = ["Show me his agent work", "Make it night", "What does he do at Waters?", "Rain, please"];

// The race engineer: answers questions and drives the world through tool calls. The panel is
// the Ask box from docs/BRAND.md I06: ink bar with a live dot, the latest answer decoding in.
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
    achieve("voice");
    setState({ askOpen: true });
    send(t);
  });

  const lastAnswer = log.findLastIndex((e) => e.role === "assistant");
  return (
    <>
      {ptt.state !== "idle" && !open && (
        <div className="pointer-events-none fixed bottom-20 left-5 z-30 flex items-center gap-2 border-2 border-ink bg-white px-3 py-1.5 font-mono text-[12px] shadow-[3px_3px_0_var(--color-ink)]">
          <span className={`h-2 w-2 rounded-full ${ptt.state === "listening" ? "x-blink bg-signal" : "border border-ink"}`} />
          {ptt.state === "listening" ? "Transmitting" : ptt.state === "thinking" ? "Copy, one sec" : "Mic blocked"}
        </div>
      )}
      <button onClick={() => setState((s) => ({ askOpen: !s.askOpen }))} className="ds-tab fixed left-3 top-3 z-30 sm:bottom-5 sm:left-5 sm:top-auto">
        <span className="x-blink h-2 w-2 rounded-full bg-signal" />
        {open ? "Close radio" : "Team radio"}
        <span className="hidden bg-ink px-1.5 font-mono text-[11px] text-white sm:inline">V</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-3 top-[64px] z-30 flex max-h-[62svh] flex-col border-2 border-ink bg-white shadow-[4px_4px_0_var(--color-ink)] sm:inset-x-auto sm:bottom-[76px] sm:left-5 sm:right-auto sm:top-auto sm:w-[420px]"
          >
            <div className="flex items-center gap-2.5 bg-ink px-3 py-2 font-mono text-[12px] text-white">
              <span className="x-blink h-1.5 w-1.5 rounded-full bg-signal" />
              <span>ASK · Race engineer</span>
              <button onClick={() => setState((s) => ({ voice: !s.voice }))} className="ml-auto transition hover:text-signal" aria-pressed={radio}>
                Voice <span className={radio ? "bg-white px-1 text-ink" : "border border-white/40 px-1"}>{radio ? "ON" : "OFF"}</span>
              </button>
            </div>

            <div ref={box} className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[14px] leading-relaxed">
              {log.length === 0 && (
                <div className="space-y-3">
                  <p>Radio check. Ask me anything about Henil, or ask me to show you something.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {starters.map((s) => (
                      <button key={s} onClick={() => send(s)} className="x-chip">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {log.map((m, i) =>
                m.role === "user" ? (
                  <p key={i} className="text-right">
                    <span className="inline-block bg-ink px-3 py-1.5 text-white">{m.content}</span>
                  </p>
                ) : m.role === "tool" ? (
                  <p key={i} className="flex items-center gap-2 font-mono text-[11.5px] text-graphite">
                    <span className="h-1.5 w-1.5 bg-signal" />
                    Race control · {m.content}
                  </p>
                ) : (
                  <p key={i} className="whitespace-pre-wrap border-l-2 border-ink pl-3">
                    {i === lastAnswer ? <Decode text={m.content} run dur={Math.min(1600, 300 + m.content.length * 6)} /> : m.content}
                  </p>
                ),
              )}
              {busy && (
                <p className="flex items-center gap-2 border-l-2 border-ink pl-3 font-mono text-[12px] text-graphite">
                  <span className="x-blink inline-block h-3.5 w-2 bg-signal" /> Thinking
                </p>
              )}
            </div>

            <form
              className="flex items-center gap-2 border-t-2 border-ink px-3 py-2.5"
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
                className="min-w-0 flex-1 bg-transparent text-[14px] caret-signal outline-none placeholder:text-graphite"
              />
              <button
                type="button"
                onPointerDown={ptt.start}
                onPointerUp={ptt.stop}
                onPointerLeave={ptt.stop}
                aria-label="Hold to talk"
                className={`grid h-8 w-8 place-items-center border-2 border-ink transition ${ptt.state === "listening" ? "bg-signal text-white" : "bg-white hover:bg-ink hover:text-white"}`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                  <rect x="9" y="3" width="6" height="11" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              </button>
              <button disabled={busy || !text.trim()} className="h-8 border-2 border-ink bg-ink px-3 font-mono text-[12px] text-white transition hover:bg-white hover:text-ink disabled:opacity-40">
                Send ↵
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
