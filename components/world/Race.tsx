"use client";

import { Html } from "@react-three/drei";
import { openZone, useWorld } from "./store";
import { zoneById } from "./layout";
import { heightAt } from "./terrain";

// A small floating key hint over the place you've parked at. Press E or tap it.
export function InteractionPoint() {
  const near = useWorld((s) => s.near);
  const open = useWorld((s) => s.zone);
  if (!near || open) return null;
  const z = zoneById[near];
  return (
    <Html position={[z.pos[0], heightAt(z.pos[0], z.pos[1]) + 2.2, z.pos[1]]} center zIndexRange={[20, 0]}>
      <button
        onClick={() => openZone(near)}
        className="group flex items-center gap-2 whitespace-nowrap rounded-full bg-white/95 py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold text-ink shadow-lg ring-1 ring-black/5 backdrop-blur transition hover:scale-105"
      >
        <kbd className="grid h-6 w-6 place-items-center rounded-full bg-ink font-mono text-[11px] text-white">E</kbd>
        {z.label}
      </button>
    </Html>
  );
}
