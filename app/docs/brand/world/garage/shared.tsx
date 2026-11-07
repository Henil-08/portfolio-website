"use client";

// Garage experiences (mock): what the four ideas share. A switch clock with its own length, the
// camera move from the establishing shot outside into an experience's own pose, the stand-in's
// way in, and a store the scenes write screen positions into for the DOM overlays (callouts,
// HUDs) drawn over the 3D cell.
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { clamp01, inOut, lerp, out3, seg } from "@/components/world/garage/anim";
import { OUTSIDE } from "./common";

declare global {
  interface Window {
    /** Dev only: hold the switch at this progress, 0 (just switched) to 1 (settled), for stills. */
    __garageSwitch?: number;
  }
}
const frozen = () => (process.env.NODE_ENV !== "production" && typeof window !== "undefined" && typeof window.__garageSwitch === "number" ? window.__garageSwitch : null);

export type Switch = { from: number; to: number; dir: 1 | -1; k: number };
/** A switch between two projects that takes `dur` seconds: `from` leaving, `to` arriving, k 0..1. */
export function useSwitch(sel: number, dir: 1 | -1, dur: number) {
  const r = useRef<Switch>({ from: sel, to: sel, dir: 1, k: 1 });
  const t0 = useRef(-1);
  useFrame((s) => {
    const c = r.current;
    if (c.to !== sel) {
      c.from = c.k < 0.5 ? c.from : c.to;
      c.to = sel;
      c.dir = dir;
      t0.current = s.clock.elapsedTime;
    }
    c.k = frozen() ?? (t0.current < 0 ? 1 : clamp01((s.clock.elapsedTime - t0.current) / dur));
  });
  return r;
}

/** A camera pose. */
export type Pose = { pos: THREE.Vector3; look: THREE.Vector3; fov: number };
export const pose = (pos: [number, number, number], look: [number, number, number], fov: number): Pose => ({ pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look), fov });

/**
 * One move, no cuts: from the establishing shot outside, down behind the stand-in as it rolls in
 * (`chase`, weight a), then on into the experience's own pose (`to`, weight b).
 */
export function blendIn(k: number, chase: Pose, to: Pose, out: Pose, aEnd = 0.5, bFrom = 0.42) {
  const a = inOut(seg(k, 0.02, aEnd));
  const b = inOut(seg(k, bFrom, 1));
  out.pos.lerpVectors(OUTSIDE.pos, chase.pos, a).lerp(to.pos, b);
  out.look.lerpVectors(OUTSIDE.look, chase.look, out3(a)).lerp(to.look, b);
  out.fov = lerp(lerp(OUTSIDE.fov, chase.fov, a), to.fov, b);
  return out;
}

/** The chase pose behind a vehicle at `p` heading `yaw` (nose along (sin yaw, 0, cos yaw)). */
export function chaseOf(p: THREE.Vector3, yaw: number, out: Pose) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  out.pos.set(p.x - fx * 4.2, p.y + 1.9, p.z - fz * 4.2);
  out.look.set(p.x + fx * 4, p.y + 0.9, p.z + fz * 4);
  out.fov = 46;
  return out;
}

/** The camera at a pose. */
export function setPose(c: THREE.PerspectiveCamera, p: Pose) {
  c.position.copy(p.pos);
  c.lookAt(p.look);
  if (Math.abs(c.fov - p.fov) > 1e-3) {
    c.fov = p.fov;
    c.updateProjectionMatrix();
  }
}

/* ------------------------------------------------------------------ screen points for overlays */

/** Points a scene projects for its overlay each frame: x, y as 0..1 of the cell, `on` if in front. */
export type ScreenPt = { x: number; y: number; on: boolean };
export const overlay = {
  pts: [] as ScreenPt[],
  /** bumps whenever a scene writes, so an overlay knows to redraw */
  tick: 0,
};
const v = new THREE.Vector3();
/** Projects world points through the camera into `overlay.pts`. */
export function project(cam: THREE.Camera, pts: THREE.Vector3[]) {
  overlay.pts.length = pts.length;
  pts.forEach((p, i) => {
    v.copy(p).project(cam);
    overlay.pts[i] = { x: (v.x + 1) / 2, y: (1 - v.y) / 2, on: v.z < 1 && v.z > -1 };
  });
  overlay.tick++;
}

/** A canvas texture drawn once (and again when the fonts arrive), for boards and labels. */
export function boardTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, f: { mono: string; sans: string }) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const run = () => {
    const cs = getComputedStyle(document.body);
    const f = { mono: `${cs.getPropertyValue("--font-plex-mono").trim() || "monospace"}, monospace`, sans: `${cs.getPropertyValue("--font-plex").trim() || "sans-serif"}, sans-serif` };
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, w, h);
    draw(g, f);
    t.needsUpdate = true;
  };
  run();
  document.fonts?.ready.then(run);
  return t;
}

export { clamp01, inOut, lerp, out3, seg };
