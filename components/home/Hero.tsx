"use client";

import { useCallback, useState } from "react";
import Terminal from "@/components/terminal/Terminal";
import { profile } from "@/content/profile";

export default function Hero() {
  const [revealed, setRevealed] = useState(false);
  const onReveal = useCallback(() => setRevealed(true), []);

  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-24">
      <Backdrop />

      <h1 className="relative mb-6 text-center font-mono text-xs uppercase tracking-[0.3em] text-mute">
        {profile.name} <span className="text-red">·</span> {profile.role} <span className="text-red">·</span>{" "}
        {profile.location}
      </h1>

      <div className="relative w-full">
        <Terminal onReveal={onReveal} />
      </div>

      <a
        href="#story"
        className={`relative mt-10 flex flex-col items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-mute transition duration-700 hover:text-chalk ${
          revealed ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        Scroll for the story
        <span className="block h-8 w-px animate-pulse bg-gradient-to-b from-red to-transparent" />
      </a>
    </section>
  );
}

// Perspective track grid with light streaks rushing past.
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(225,6,0,0.18),transparent_60%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[55%] [perspective:500px]">
        <div
          className="absolute inset-0 origin-bottom [transform:rotateX(62deg)]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            animation: "grid-run 1.2s linear infinite",
            maskImage: "linear-gradient(to top, black 10%, transparent 90%)",
          }}
        />
      </div>
      {[12, 28, 71, 86].map((left, i) => (
        <span
          key={left}
          className="absolute bottom-0 h-40 w-px bg-gradient-to-t from-transparent via-red/70 to-transparent"
          style={{ left: `${left}%`, animation: `streak ${1.6 + i * 0.35}s linear ${i * 0.4}s infinite` }}
        />
      ))}
      <style>{`
        @keyframes grid-run { to { background-position: 0 60px, 0 0; } }
        @keyframes streak { from { transform: translateY(20%); opacity: 0 } 30% { opacity: 1 } to { transform: translateY(-140%); opacity: 0 } }
      `}</style>
    </div>
  );
}
