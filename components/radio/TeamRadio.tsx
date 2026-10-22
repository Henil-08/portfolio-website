"use client";

import { useEffect, useRef, useState } from "react";
import { ask, type ChatMessage } from "@/lib/ask";
import { squelch } from "./squelch";

const starters = ["Why should we hire him?", "What's he doing at Waters?", "Best project?", "Is he good with agents?"];

export default function TeamRadio() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [live, setLive] = useState(false);
  const [voice, setVoice] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const speak = (text: string) => {
    if (!voice || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.08;
    u.pitch = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || live) return;
    setInput("");
    const next: ChatMessage[] = [...msgs, { role: "user", content: question }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setLive(true);
    squelch();
    let reply = "";
    try {
      await ask(next, "radio", (chunk) => {
        reply += chunk;
        setMsgs([...next, { role: "assistant", content: reply }]);
      });
    } catch {
      reply = "Radio check, radio check. We lost you there. Try again.";
      setMsgs([...next, { role: "assistant", content: reply }]);
    }
    setLive(false);
    squelch(true);
    speak(reply);
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) squelch();
        }}
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-red/50 bg-ink/90 px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-chalk shadow-[0_0_30px_-6px_rgba(225,6,0,0.6)] backdrop-blur transition hover:border-red sm:bottom-6 sm:right-6"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red" />
        </span>
        {open ? "Close radio" : "Team radio"}
      </button>

      {open && (
        <div className="fixed inset-x-3 bottom-20 z-50 flex max-h-[70svh] flex-col overflow-hidden rounded-2xl border border-line bg-[#0b0c0f]/95 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-6 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-widest">Team radio</p>
              <p className="text-xs text-mute">Henil&apos;s race engineer. Ask anything about him.</p>
            </div>
            <button
              onClick={() => setVoice((v) => !v)}
              className={`rounded border px-2 py-1 font-mono text-[10px] uppercase ${
                voice ? "border-green text-green" : "border-line text-mute"
              }`}
              aria-pressed={voice}
            >
              Voice {voice ? "on" : "off"}
            </button>
          </div>

          <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {msgs.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-chalk/70">Radio check. Go ahead.</p>
                <div className="flex flex-wrap gap-2">
                  {starters.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-line px-3 py-1 text-xs transition hover:border-red"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <p
                  className={`mb-1 font-mono text-[10px] uppercase tracking-widest ${
                    m.role === "user" ? "text-mute" : "text-red"
                  }`}
                >
                  {m.role === "user" ? "You" : "Engineer"}
                </p>
                {m.role === "assistant" && !m.content ? (
                  <Waveform />
                ) : (
                  <p
                    className={`inline-block max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                      m.role === "user" ? "bg-white/[0.06]" : "border-l-2 border-red bg-red/[0.06] text-left"
                    }`}
                  >
                    {m.content}
                  </p>
                )}
              </div>
            ))}
          </div>

          <form
            className="flex gap-2 border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={400}
              placeholder="Press to talk..."
              aria-label="Message the race engineer"
              className="flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-red"
            />
            <button
              disabled={live || !input.trim()}
              className="rounded-lg bg-red px-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Waveform() {
  return (
    <div className="flex h-6 items-end gap-0.5" aria-label="Engineer is talking">
      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-red"
          style={{ height: "30%", animation: `wave 0.9s ease-in-out ${i * 0.05}s infinite alternate` }}
        />
      ))}
      <style>{`@keyframes wave { to { height: 100% } }`}</style>
    </div>
  );
}
