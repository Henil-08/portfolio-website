"use client";

// The 404 (docs/BRAND.md S06): the panel draws in on paper, the code and title decode, and one
// button takes you back. Coordinates and the revision sit in the corners like the boot.
import Link from "next/link";
import { profile } from "@/content/profile";
import { Mark } from "@/components/brand/mark";
import { Decode, Stage, d } from "@/components/brand/motion";
import Corners from "@/components/brand/Corners";

export default function NotFound() {
  return (
    <main className="relative grid min-h-svh place-items-center bg-paper px-4 py-16 text-ink">
      <Stage motion className="w-full max-w-[520px]">
        {(run) => (
          <div className="dsa-frame border-2 border-ink bg-white" style={d(0)}>
            <div className="relative flex justify-between px-4 py-2 font-mono text-[12px] text-paper">
              <span className="dsa-x absolute inset-0 bg-ink" style={d(100)} />
              <span className="relative">
                <Decode text="E404 · Off track" run={run} delay={250} />
              </span>
              <span className="relative">HG-08</span>
            </div>
            <div className="flex flex-col items-start gap-5 p-6 sm:flex-row">
              <Mark size={64} />
              <div>
                <h1 className="text-[30px] font-semibold leading-none tracking-tight">
                  <Decode text="Track limits" run={run} delay={350} />
                </h1>
                <p className="dsa-rise mt-2 text-[15px] text-graphite" style={d(600)}>
                  You went off the island. Lap time deleted.
                </p>
                <Link href="/" className="x-sel x-btn x-primary dsa-rise mt-5" style={d(800)}>
                  <Corners />
                  Back to the island <span className="x-arrow">→</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </Stage>
      <span className="absolute bottom-4 left-5 font-mono text-[12px] text-graphite">{profile.coords}</span>
      <span className="absolute bottom-4 right-5 font-mono text-[12px] text-graphite">Rev 2026.10</span>
    </main>
  );
}
