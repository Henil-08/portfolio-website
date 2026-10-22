"use client";

import { useEffect } from "react";
import { clearInput, keyboard, requests, type InputBucket } from "./input";

const KEYMAP: Record<string, keyof InputBucket> = {
  KeyW: "throttle",
  ArrowUp: "throttle",
  KeyS: "brake",
  ArrowDown: "brake",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "handbrake",
};

/** Binds WASD / arrows / Space / R to the shared keyboard input bucket. */
export function useControls() {
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };

    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const action = KEYMAP[e.code];
      if (action) {
        keyboard[action] = true;
        e.preventDefault(); // stop arrows/space from scrolling
      } else if (e.code === "KeyR" && !e.repeat) {
        requests.reset = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      const action = KEYMAP[e.code];
      if (action) keyboard[action] = false;
    };
    // Releasing keys while the tab is in the background would otherwise stick
    const blur = () => clearInput();

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      clearInput();
    };
  }, []);
}
