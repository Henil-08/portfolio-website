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
        className="group flex items-center whitespace-nowrap"
      >
        {/* until step 6's in-world prompt: the design's diamond with the key, and a mono label */}
        <span className="relative z-10 grid h-9 w-9 rotate-45 place-items-center border-[3px] border-cream bg-[#1f2133] shadow-[0_0_4px_#0007] transition-transform group-hover:scale-110">
          <kbd className="-rotate-45 font-mono text-[13px] font-semibold text-cream">E</kbd>
        </span>
        <span className="hud-chip -ml-1.5 py-1 pl-3.5 pr-2.5 text-[11.5px]">{label}</span>
      </button>
    </Html>
  );
}
