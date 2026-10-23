"use client";

import { Html } from "@react-three/drei";
import { openZone, useWorld } from "./store";
import { zoneById } from "./layout";
import { LINKS, LINK_SPOTS, openLink } from "./social";
import { heightAt } from "./terrain";

// A small floating key hint over the place you've parked at. Press E or tap it.
export function InteractionPoint() {
  const near = useWorld((s) => s.near);
  const link = useWorld((s) => s.nearLink);
  const open = useWorld((s) => s.zone);
  if (open || (!near && !link)) return null;
  const li = link ? LINKS.findIndex((l) => l.key === link) : -1;
  const [px, pz] = li >= 0 ? LINK_SPOTS[li] : zoneById[near!].pos;
  const label = li >= 0 ? LINKS[li].name : zoneById[near!].label;
  return (
    <Html position={[px, heightAt(px, pz) + (li >= 0 ? 2.6 : 2.2), pz]} center zIndexRange={[20, 0]}>
      <button
        onClick={() => (li >= 0 ? openLink(link!) : openZone(near!))}
        className="group flex items-center gap-2 whitespace-nowrap rounded-full bg-white/95 py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold text-ink shadow-lg ring-1 ring-black/5 backdrop-blur transition hover:scale-105"
      >
        <kbd className="grid h-6 w-6 place-items-center rounded-full bg-ink font-mono text-[11px] text-white">E</kbd>
        {label}
      </button>
    </Html>
  );
}
