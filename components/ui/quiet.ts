"use client";

// The quiet driving HUD (`?hud=next`, components/world/look.ts HUD_NEXT; art-direction.md 2.7):
// while the car is moving and nothing is open, only the speed and the power meter stay, in thin
// 1 px frames; the tabs, the radio key and the key hints fade out and come back on a stop (a
// second under walking pace) or when the pointer reaches them. Sheets, modals and prompts keep
// their heavy frames and hard shadows: the chrome is loud only when it has focus.
import { useEffect, useState } from "react";
import { useWorld } from "@/components/world/store";
import { HUD_NEXT } from "@/components/world/look";

/** True while the HUD should be quiet (always false without ?hud=next). */
export function useQuietHud() {
  const moving = useWorld((s) => s.speed > 4);
  const busy = useWorld((s) => !!s.zone || s.menuOpen || s.controlsOpen || s.settingsOpen || s.askOpen || s.garageOpen || s.fitOpen);
  // stays quiet for a second after the car stops, so a brake into a corner doesn't flash the tabs
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!HUD_NEXT) return;
    const t = setTimeout(() => setHeld(moving), moving ? 0 : 1000);
    return () => clearTimeout(t);
  }, [moving]);
  return HUD_NEXT && !busy && (moving || held);
}

/** Classes for a piece of chrome that fades out while quiet (back on hover or keyboard focus). */
export const quietFade = (quiet: boolean) => (HUD_NEXT ? `transition-opacity duration-300 ${quiet ? "opacity-0 hover:opacity-100 focus-within:opacity-100" : ""}` : "");
