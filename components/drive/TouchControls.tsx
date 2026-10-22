"use client";

import { useState, type PointerEvent, type ReactNode } from "react";
import { requests, touch, type InputBucket } from "./input";

/**
 * A hold-to-press pad. Each pad captures its own pointer, so steering with
 * one thumb and holding throttle with the other works at the same time.
 */
function Pad({
  action,
  label,
  className,
  children,
}: {
  action: keyof InputBucket;
  label: string;
  className: string;
  children: ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const press = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    touch[action] = true;
    setPressed(true);
  };
  const release = () => {
    touch[action] = false;
    setPressed(false);
  };
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
      className={`pointer-events-auto flex touch-none items-center justify-center rounded-xl border select-none transition-transform ${
        pressed ? "scale-95 border-chalk/60 bg-chalk/20" : "border-line bg-ink/60"
      } backdrop-blur-sm ${className}`}
    >
      {children}
    </button>
  );
}

const Arrow = ({ dir }: { dir: "left" | "right" }) => (
  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" aria-hidden>
    {dir === "left" ? <path d="M15 4 7 12l8 8V4Z" /> : <path d="m9 4 8 8-8 8V4Z" />}
  </svg>
);

export function TouchControls() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex gap-3">
        <Pad action="left" label="Steer left" className="h-20 w-20 text-chalk">
          <Arrow dir="left" />
        </Pad>
        <Pad action="right" label="Steer right" className="h-20 w-20 text-chalk">
          <Arrow dir="right" />
        </Pad>
      </div>
      <button
        type="button"
        onClick={() => {
          requests.reset = true;
        }}
        className="pointer-events-auto mb-1 rounded-md border border-line bg-ink/70 px-3 py-2 font-mono text-[11px] text-mute"
      >
        Reset
      </button>
      <div className="flex items-end gap-3">
        <Pad action="brake" label="Brake" className="h-20 w-16 font-display text-xs font-bold tracking-widest text-chalk uppercase">
          Brake
        </Pad>
        <Pad action="throttle" label="Throttle" className="h-28 w-20 font-display text-xs font-bold tracking-widest text-green uppercase">
          Go
        </Pad>
      </div>
    </div>
  );
}
