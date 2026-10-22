"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ask, type ChatMessage } from "@/lib/ask";
import { HELP, QUESTION, easterEggs, intro, suggestions } from "./script";

type Line =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "text"; text: string; live?: boolean }
  | { id: number; kind: "tool"; name: string; arg: string; result?: string }
  | { id: number; kind: "help" }
  | { id: number; kind: "suggest" };

const SECTIONS = ["story", "work", "projects", "ai", "side-quest", "research", "off-track", "contact"];
const PLAYED_KEY = "hg:intro-played";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let nextId = 1;
const id = () => nextId++;

export default function Terminal({ onReveal }: { onReveal?: () => void }) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState("");
  const [busy, setBusy] = useState(true);
  const [introDone, setIntroDone] = useState(false);
  const history = useRef<ChatMessage[]>([]);
  const skip = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const push = useCallback((line: Line) => setLines((l) => [...l, line]), []);
  const patch = useCallback(
    (lineId: number, fn: (l: Line) => Line) =>
      setLines((ls) => ls.map((l) => (l.id === lineId ? fn(l) : l))),
    []
  );

  // Instant version of the intro, for repeat visits and the skip button.
  const finishIntro = useCallback(() => {
    const out: Line[] = [{ id: id(), kind: "user", text: QUESTION }];
    for (const s of intro) {
      if (s.kind === "text") out.push({ id: id(), kind: "text", text: s.text });
      if (s.kind === "tool") out.push({ id: id(), kind: "tool", name: s.name, arg: s.arg, result: s.result });
    }
    out.push({ id: id(), kind: "suggest" });
    setLines(out);
    setTyping("");
    setBusy(false);
    setIntroDone(true);
    onReveal?.();
  }, [onReveal]);

  useEffect(() => {
    let cancelled = false;
    let played = false;
    try {
      played = sessionStorage.getItem(PLAYED_KEY) === "1";
    } catch {}
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (played || reduced) {
      finishIntro();
      return;
    }

    (async () => {
      await sleep(700);
      for (const ch of QUESTION) {
        if (cancelled || skip.current) break;
        setTyping((t) => t + ch);
        await sleep(38 + Math.random() * 50);
      }
      if (cancelled) return;
      if (skip.current) return finishIntro();
      await sleep(350);
      setTyping("");
      push({ id: id(), kind: "user", text: QUESTION });
      await sleep(500);

      for (const s of intro) {
        if (cancelled) return;
        if (skip.current) return finishIntro();
        if (s.kind === "pause") await sleep(s.ms);
        if (s.kind === "tool") {
          const lineId = id();
          push({ id: lineId, kind: "tool", name: s.name, arg: s.arg });
          await sleep(650);
          patch(lineId, (l) => ({ ...l, result: s.result }));
          if (s.reveal) onReveal?.();
          await sleep(250);
        }
        if (s.kind === "text") {
          const lineId = id();
          push({ id: lineId, kind: "text", text: "", live: true });
          const words = s.text.split(/(\s+)/);
          for (const w of words) {
            if (skip.current) break;
            patch(lineId, (l) => (l.kind === "text" ? { ...l, text: l.text + w } : l));
            await sleep(18 + Math.random() * 22);
          }
          patch(lineId, (l) => (l.kind === "text" ? { ...l, text: s.text, live: false } : l));
          await sleep(200);
        }
      }
      if (cancelled) return;
      push({ id: id(), kind: "suggest" });
      setBusy(false);
      setIntroDone(true);
      try {
        sessionStorage.setItem(PLAYED_KEY, "1");
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [finishIntro, onReveal, patch, push]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines, typing]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus({ preventScroll: true });
  }, [busy]);

  const run = useCallback(
    async (raw: string) => {
      const cmd = raw.trim();
      if (!cmd) return;
      const lower = cmd.toLowerCase();
      push({ id: id(), kind: "user", text: cmd });

      if (lower === "clear") return setLines([]);
      if (lower === "help" || lower === "/help") return push({ id: id(), kind: "help" });
      if (lower === "/drive") {
        push({ id: id(), kind: "text", text: "Lights out. Loading the circuit..." });
        return router.push("/drive");
      }
      if (lower === "/resume") return router.push("/resume");
      if (lower === "/mcp") return document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
      const section = lower.replace(/^\//, "");
      if (lower.startsWith("/") && SECTIONS.includes(section)) {
        return document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
      }
      if (easterEggs[lower]) return push({ id: id(), kind: "text", text: easterEggs[lower] });

      // Anything else goes to the model.
      setBusy(true);
      history.current.push({ role: "user", content: cmd });
      const lineId = id();
      push({ id: lineId, kind: "text", text: "", live: true });
      let reply = "";
      try {
        await ask(history.current, "terminal", (chunk) => {
          reply += chunk;
          patch(lineId, (l) => (l.kind === "text" ? { ...l, text: reply } : l));
        });
      } catch {
        reply = "Lost the connection to the pit wall. Try again in a second.";
      }
      patch(lineId, (l) => (l.kind === "text" ? { ...l, text: reply, live: false } : l));
      history.current.push({ role: "assistant", content: reply });
      setBusy(false);
    },
    [patch, push, router]
  );

  return (
    <div
      className="relative mx-auto flex h-[min(620px,72svh)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-line bg-[#0b0c0f]/90 shadow-[0_0_80px_-20px_rgba(225,6,0,0.35)] backdrop-blur"
      onClick={() => inputRef.current?.focus({ preventScroll: true })}
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-xs text-mute">henil@pitwall: ~ claude</span>
        {!introDone && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              skip.current = true;
            }}
            className="ml-auto font-mono text-xs text-mute underline-offset-4 hover:text-chalk hover:underline"
          >
            skip intro
          </button>
        )}
      </div>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 font-mono text-[13px] leading-relaxed sm:px-6 sm:text-sm">
        <Welcome />
        {lines.map((l) => (
          <LineView key={l.id} line={l} onPick={run} />
        ))}
        {typing && (
          <div className="text-chalk">
            <span className="mr-2 text-red">&gt;</span>
            <span className="caret">{typing}</span>
          </div>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-line px-4 py-3 font-mono text-sm sm:px-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          const v = input;
          setInput("");
          run(v);
        }}
      >
        <span className="text-red">&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          maxLength={400}
          placeholder={busy ? "" : "ask anything, or type help"}
          aria-label="Ask about Henil"
          className="flex-1 bg-transparent text-chalk outline-none placeholder:text-mute/60 disabled:opacity-50"
        />
      </form>
    </div>
  );
}

function Welcome() {
  return (
    <div className="mb-4 rounded-md border border-red/40 px-4 py-3">
      <p className="text-chalk">
        <span className="text-red">✻</span> Welcome to Henil&apos;s pit wall
      </p>
      <p className="mt-1 text-xs text-mute">I know his whole career. Answers are live, so go easy on me.</p>
    </div>
  );
}

function LineView({ line, onPick }: { line: Line; onPick: (cmd: string) => void }) {
  switch (line.kind) {
    case "user":
      return (
        <div className="text-chalk">
          <span className="mr-2 text-red">&gt;</span>
          {line.text}
        </div>
      );
    case "text":
      return <p className={`whitespace-pre-wrap text-chalk/90 ${line.live ? "caret" : ""}`}>{line.text}</p>;
    case "tool":
      return (
        <div>
          <p>
            <span className={line.result ? "text-green" : "animate-pulse text-amber"}>⏺</span>{" "}
            <span className="font-semibold text-chalk">{line.name}</span>
            <span className="text-mute">({line.arg})</span>
          </p>
          {line.result && <p className="pl-4 text-mute">⎿ {line.result}</p>}
        </div>
      );
    case "help":
      return (
        <div className="grid gap-1">
          {HELP.map(([c, d]) => (
            <p key={c}>
              <span className="text-cyan">{c}</span> <span className="text-mute">· {d}</span>
            </p>
          ))}
        </div>
      );
    case "suggest":
      return (
        <div className="flex flex-wrap gap-2 pt-1">
          {suggestions.map((s) => (
            <button
              key={s.cmd}
              onClick={(e) => {
                e.stopPropagation();
                onPick(s.cmd);
              }}
              className="rounded border border-line px-2.5 py-1 text-xs text-chalk transition hover:border-red hover:text-white"
            >
              {s.cmd}
              {s.hint && <span className="ml-2 text-mute">{s.hint}</span>}
            </button>
          ))}
        </div>
      );
  }
}
