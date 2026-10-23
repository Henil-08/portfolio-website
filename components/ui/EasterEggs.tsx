"use client";

import { useEffect } from "react";
import { achieve, getState, setState, subscribe, toast } from "@/components/world/store";
import { radioBeep, radioLine } from "@/components/world/sound";
import { input } from "@/components/world/input";
import { carState } from "@/components/world/carState";
import { zones } from "@/components/world/layout";
import { ACHIEVEMENTS } from "@/content/achievements";
import { radioExtras, radioText } from "@/content/radio";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyA"];

// Radio line, played from its pre-voiced file if the voice is on.
function radio(line: string, file?: string) {
  const text = radioText(line);
  setState({ radioMsg: { id: Date.now(), text } });
  if (getState().voice && file) void radioLine(file);
  else void radioBeep();
  setTimeout(() => {
    if (getState().radioMsg?.text === text) setState({ radioMsg: null });
  }, 8000);
}

function unlocked(id: string) {
  if (!achieve(id)) return;
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (a) setTimeout(() => toast(a.name, "teal"), 600);
}

// Typed words that do things. Nothing on screen mentions them.
const WORDS: Record<string, () => void> = {
  claude: () => {
    radio(radioExtras.claude, "claude");
    unlocked("claude");
  },
  gpu: () => {
    toast("CUDA OUT OF MEMORY", "red");
    setState((s) => ({ spawns: [...s.spawns.slice(-6), { id: Date.now(), thing: "tyres", count: 16, at: [carState.pos.x + carState.forward.x * 6, carState.pos.z + carState.forward.z * 6] as [number, number] }] }));
    unlocked("gpu");
  },
  attention: () => radio("Attention is all you need. Also, eyes on the road."),
  lora: () => radio("Low-rank adaptation, copy. He's fine-tuned everything from Verilog to emojis with it."),
  overfit: () => {
    toast("TRAINING LOSS 0.000", "yellow");
    radio("Training loss zero, validation loss through the roof. Classic.");
  },
  hello: () => radio(radioExtras.hello, "hello"),
};

export default function EasterEggs() {
  useEffect(() => {
    let buf = "";
    let konami = 0;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (getState().phase !== "world") return;

      konami = e.code === KONAMI[konami] ? konami + 1 : e.code === KONAMI[0] ? 1 : 0;
      if (konami === KONAMI.length) {
        konami = 0;
        const on = !getState().hallucinating;
        setState({ hallucinating: on });
        if (on) {
          radio(radioExtras["temp-on"], "temp-on");
          unlocked("hallucination");
        } else radio(radioExtras["temp-off"], "temp-off");
      }

      if (e.key.length === 1) {
        buf = (buf + e.key.toLowerCase()).slice(-12);
        for (const w of Object.keys(WORDS)) if (buf.endsWith(w)) {
          WORDS[w]();
          buf = "";
        }
      }
    };
    window.addEventListener("keydown", onKey);

    // Achievements that come from state.
    const unsub = subscribe(() => {
      const s = getState();
      if (s.found.length >= zones.length) unlocked("all-places");
      if (s.fitOpen) unlocked("fit");
      if (s.scene.time === "night" && s.scene.weather === "rain") unlocked("night-rain");
      if (s.autopilot.on && s.autopilot.best >= 1) unlocked("autopilot-lap");
    });

    // Sitting still for a minute.
    let still = 0;
    const idle = setInterval(() => {
      const s = getState();
      const moving = input.forward || input.back || input.steer;
      still = moving || s.phase !== "world" || s.askOpen || s.zone ? 0 : still + 1;
      if (still === 60) {
        radio(radioExtras.idle, "idle");
        unlocked("idle");
      }
    }, 1000);

    // Leave the tab and the title calls you back.
    const title = document.title;
    const vis = () => {
      document.title = document.hidden ? "Box box, come back 🏁" : title;
    };
    document.addEventListener("visibilitychange", vis);

    // For the developers who open the console.
    console.log(
      "%c08 HENIL GAJJAR",
      "font: 700 22px system-ui; color: #fff; background: #e10600; padding: 6px 12px; border-radius: 4px"
    );
    console.log(
      "Built with React Three Fiber, Rapier and a lot of Claude Code.\nHiring? henil.gajjar2102@gmail.com\nPsst: in the world, try typing a word an ML engineer would say."
    );

    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", vis);
      clearInterval(idle);
      unsub();
    };
  }, []);
  return null;
}
