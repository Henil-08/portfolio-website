"use client";

// Garage experience · Cockpit + pit wall (owner, approved 2026-11-05): the clocks and the bay's
// layout, shared by the game (GarageShow.tsx) and the docs mock (/docs/brand/world#garage).
// Bay frame: x across the door, y up, +z out of the door; floor y = 0, door at z = +3.5, back
// wall's inner face at z = -3.08. In the game the frame's origin is (garage x, pit y, PIT.garageZ - 1).
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PIT, GARAGES } from "../layout";
import { heightAt } from "../terrain";
import { vehicleScale } from "../vehicles/scale";
import type { VehicleCode } from "../vehicles/liveries";
import { projects, type Domain, type Project } from "@/content/projects";

export type V3 = [number, number, number];

/* ------------------------------------------------------------------ easing */

export const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const inOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
export const out3 = (k: number) => 1 - Math.pow(1 - k, 3);
/** k mapped from the window [a, b] to 0..1. */
export const seg = (k: number, a: number, b: number) => clamp01((k - a) / (b - a));

/* ------------------------------------------------------------------ clocks */

declare global {
  interface Window {
    /** Dev only: hold the drive-in at this progress, 0 (outside) to 1 (parked), for stills. */
    __garageDrive?: number;
    /** Dev only: hold the project slide at this progress, 0 (just switched) to 1 (settled). */
    __garageSlide?: number;
  }
}
const dev = process.env.NODE_ENV !== "production";
export const frozen = (k: "__garageDrive" | "__garageSlide") => (dev && typeof window !== "undefined" && typeof window[k] === "number" ? window[k]! : null);

/** Drive-in time (s), outside to parked; backing out runs it backwards from wherever it is. */
export const DRIVE = 2.2;
/** A project slide (s). */
export const SLIDE = 0.75;

/** One step of the drive-in's linear progress, 0 outside to 1 parked, toward `inside`. */
export const stepDrive = (k: number, inside: boolean, dt: number) => frozen("__garageDrive") ?? clamp01(k + ((inside ? 1 : -1) * Math.min(dt, 0.05)) / DRIVE);

/** The drive-in's progress as a ref, stepping toward `inside` every frame. */
export function useDrive(inside: boolean) {
  const k = useRef(0);
  useFrame((_, dt) => void (k.current = stepDrive(k.current, inside, dt)));
  return k;
}

export type SlideClock = { from: number; to: number; dir: 1 | -1; k: number };
/**
 * The slide between two projects: `from` is the one leaving, `to` the one arriving, k 0..1.
 * Without `dir`, the way it went is the short way round a list of `n`.
 */
export function useSlide(sel: number, dir?: 1 | -1, n = 1) {
  const r = useRef<SlideClock>({ from: sel, to: sel, dir: 1, k: 1 });
  const t0 = useRef(-1);
  useFrame((s) => {
    const c = r.current;
    if (c.to !== sel) {
      const prev = c.k < 0.5 ? c.from : c.to;
      c.dir = dir ?? (((sel - prev + n) % n) <= n / 2 ? 1 : -1);
      c.from = prev;
      c.to = sel;
      t0.current = s.clock.elapsedTime;
    }
    c.k = frozen("__garageSlide") ?? (t0.current < 0 ? 1 : clamp01((s.clock.elapsedTime - t0.current) / SLIDE));
  });
  return r;
}

/* ------------------------------------------------------------------ data */

export type Item = { p: Project; index: number };
/** A garage's projects in the game's order, with their index in `projects`. */
export function garageList(domain: Domain): Item[] {
  return projects.map((p, index) => ({ p, index })).filter(({ p }) => p.domain === domain);
}

/* ------------------------------------------------------------------ the bay */

/** World metres per model metre for this vehicle: the size it drives at in the world (vehicles/scale.ts). */
export const S = vehicleScale;
export const DOOR_Z = 3.5;
/** The back wall's inner face: the game's 7 m deep pit building lines its bays 0.41 m in from the back (kit/builtTown.tsx). */
export const BACK_Z = -3.08;
/** Where the mock's vehicle waits outside, on the pit lane. */
export const OUT_Z = 8.8;

/** The bay frame's origin in the world, for a garage. */
export function bayOrigin(domain: Domain) {
  const g = GARAGES.find((q) => q.domain === domain)!;
  return new THREE.Vector3(g.x, heightAt((PIT.from + PIT.to) / 2, PIT.z), PIT.garageZ - 1);
}

/** The stage in front of the wall, and how far a project travels to leave it. */
export const STAGE_Z = -1.75;
export const STAGE_Y = 0.12;
export const STAGE: V3 = [3.0, STAGE_Y, 1.5];
export const OFF = 3.2;
export const OBJ = 1.2;
export const PLINTH_H = 0.5;
/** Every driver's eye parks this far out from the back of the bay, so the view frames alike. */
export const EYE_Z = 1.9;
/** Where the eye looks once parked: between the stage object and the wall above it. */
export const TARGET = new THREE.Vector3(0, 1.5, -2.2);
export const FOV = 58;

/** The screens: 16:10 datasheets, up to four across, two rows. */
export const SW = 1.04;
export const SH = 0.65;
export const GAP = 0.14;
export const WALL_Z = BACK_Z + 0.06;
/** A garage with four projects or fewer has one row, at this height. */
export const ROW1 = 2.3;
/** How far the lit screen steps out of the wall. */
export const POP = 0.22;

export function slots(n: number) {
  const cols = n <= 4 ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / cols);
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const c = i - r * cols;
    return new THREE.Vector3((c - (inRow - 1) / 2) * (SW + GAP), rows === 1 ? ROW1 : 2.88 - r * (SH + GAP), WALL_Z);
  });
}

/**
 * The driver's eye in each model's own frame (nose +z, ground 0, true metres), placed so the
 * stage and the wall both clear the bodywork: TH-18 just under the halo, E14 low in the seat so
 * the cage's front hoop frames the wall rather than crossing it, Atlas at head height under the
 * canopy (the glass goes see-through once you are in), Apollo sat up over the tank so the
 * screen and bars stay below the stage.
 */
export const EYE: Record<VehicleCode, V3> = {
  V01: [0, 0.98, -0.36],
  V02: [0, 1.1, -0.02],
  V03: [0, 1.0, -0.3],
  V04: [0, 1.42, -0.3],
};
/** Where a vehicle's centre parks (bay frame z), facing the wall, so its eye is at EYE_Z. */
export const parkZ = (code: VehicleCode) => EYE_Z + EYE[code][2] * S(code);

/* ------------------------------------------------------------------ the camera */

/** The poses the cockpit camera blends through, worked out from where the car is. */
export type CockpitPoses = { chase: THREE.Vector3; chaseLook: THREE.Vector3; eye: THREE.Vector3; look: THREE.Vector3; a: number; b: number };
export const newPoses = (): CockpitPoses => ({ chase: new THREE.Vector3(), chaseLook: new THREE.Vector3(), eye: new THREE.Vector3(), look: new THREE.Vector3(), a: 0, b: 0 });

/**
 * One camera move, no cuts: from wherever it was, down behind the car as it rolls in (weight a),
 * then forward into the driver's seat as it stops (weight b). `car` and `yaw` are the vehicle's
 * centre and heading (nose along (sin yaw, 0, cos yaw)); `glance` turns the eye a little the way
 * the stage is sliding. All in one frame (the bay's, or the world's with `origin`).
 */
export function cockpitPoses(out: CockpitPoses, k: number, code: VehicleCode, car: THREE.Vector3, yaw: number, glance = 0, origin?: THREE.Vector3) {
  out.a = inOut(seg(k, 0.02, 0.5));
  out.b = inOut(seg(k, 0.42, 1));
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const e = EYE[code];
  const sc = S(code);
  out.chase.set(car.x - fx * 4.2, car.y + 1.9, car.z - fz * 4.2);
  out.chaseLook.set(car.x + fx * 4, car.y + 0.9, car.z + fz * 4);
  // the eye: the model's frame turned by yaw
  out.eye.set(car.x + (e[0] * fz + e[2] * fx) * sc, car.y + e[1] * sc, car.z + (-e[0] * fx + e[2] * fz) * sc);
  out.look.copy(TARGET);
  out.look.x += glance * out.b;
  if (origin) out.look.add(origin);
  return out;
}

/** How wide the seat's view is: FOV (vertical) at the approved picture's 1.08 aspect, as the tangent of half its horizontal angle. */
const WIDE = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * 1.08;
/**
 * The cockpit lens (vertical fov) for a picture of this aspect: it keeps the approved width of
 * the bay in view, the whole pit wall, so a narrow picture beside the garage's reading panel
 * widens and a wide strip over a phone's sheet closes in (36 to 80 degrees).
 */
export const cockpitFov = (aspect: number) => Math.min(80, Math.max(36, THREE.MathUtils.radToDeg(2 * Math.atan(WIDE / aspect))));

/**
 * The camera at progress k: from `fromPos`/`fromLook`/`fromFov` through the poses. Returns the
 * fov; with the picture's `aspect`, the seat's lens fits it (cockpitFov), else it is FOV.
 */
export function blendCamera(p: CockpitPoses, fromPos: THREE.Vector3, fromLook: THREE.Vector3, fromFov: number, pos: THREE.Vector3, look: THREE.Vector3, aspect?: number) {
  pos.lerpVectors(fromPos, p.chase, p.a).lerp(p.eye, p.b);
  look.lerpVectors(fromLook, p.chaseLook, out3(p.a)).lerp(p.look, p.b);
  return lerp(lerp(fromFov, 46, p.a), aspect ? cockpitFov(aspect) : FOV, p.b);
}

/** The glance for a slide clock: the eye turns a little the way the stage moves. */
export const glanceOf = (c: SlideClock) => (c.from === c.to ? 0 : Math.sin(c.k * Math.PI) * 0.18 * c.dir);
