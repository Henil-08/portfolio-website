"use client";

import { Component, type ReactNode } from "react";
import { profile } from "@/content/profile";

/**
 * Whether this browser can draw the world: three.js needs WebGL 2. Checked once, before the
 * world's code loads, so a browser without it gets a card instead of a boot that never ends.
 */
export function webglOk() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** The card shown when the world can't be drawn: why, in a line, and the way to the same facts. */
export function NoWorld({ broke }: { broke?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-paper p-4">
      <div className="w-full max-w-md border-2 border-ink bg-white shadow-[4px_4px_0_var(--color-ink)]">
        <div className="bg-ink px-4 py-2 font-mono text-[12px] text-white">HG-08 / {broke ? "Stalled" : "No 3D here"}</div>
        <div className="space-y-3 p-5 text-[14px]">
          <p>
            {broke
              ? "The island stalled while it was drawing. A reload usually gets it going again."
              : "This site is an island you drive around, and this browser can't draw it: WebGL 2 is off or missing. Turning on hardware acceleration, or a current Chrome, Firefox or Safari, will fix it."}
          </p>
          <p className="text-graphite">Everything on the island is also here:</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12.5px]">
            <a href="/resume" className="x-link">Resume ↗</a>
            <a href={`mailto:${profile.email}`} className="x-link">Email ↗</a>
            <a href={profile.links.github} className="x-link" target="_blank" rel="noreferrer">GitHub ↗</a>
            <a href={profile.links.linkedin} className="x-link" target="_blank" rel="noreferrer">LinkedIn ↗</a>
          </div>
          {broke && (
            <button type="button" onClick={() => window.location.reload()} className="x-btn x-primary mt-1">
              Reload <span className="x-arrow">→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Catches a crash anywhere in the world (a lost context, a failed WASM load) so the page never goes black. */
export class WorldGuard extends Component<{ children: ReactNode }, { broke: boolean }> {
  state = { broke: false };
  static getDerivedStateFromError() {
    return { broke: true };
  }
  componentDidCatch(e: unknown) {
    console.warn("world stalled", e);
  }
  render() {
    return this.state.broke ? <NoWorld broke /> : this.props.children;
  }
}
