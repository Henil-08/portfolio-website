"use client";

// Garage experience mock: the shared pieces. The real pit building (one bay at
// the origin, the others either side as in the game), the real vehicles at the game's scale,
// the real project objects, and the clocks that drive the drive-in and the project slides.
// Bay frame: x across the door, y up, +z out of the door; floor y = 0, door at z = +3.5,
// back wall's inner face at z = -3.2. Vehicles drive in nose first, facing -z.
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PitBuilding, type Bay, type PitOpts } from "@/components/world/buildings/PitBuilding";
import { CI } from "@/components/world/buildings/concrete";
import { GARAGES, garageLabel, zones } from "@/components/world/layout";
import { VEHICLE_SCALE } from "@/components/world/vehicles/scale";
import { projects, type Domain, type Project } from "@/content/projects";

export type V3 = [number, number, number];

/* ------------------------------------------------------------------ easing and clocks */

export const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const inOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
export const out3 = (k: number) => 1 - Math.pow(1 - k, 3);
/** k mapped from the window [a, b] to 0..1. */
export const seg = (k: number, a: number, b: number) => clamp01((k - a) / (b - a));

declare global {
  interface Window {
    /** Dev only: hold the drive-in at this progress, 0 (outside) to 1 (parked), for stills. */
    __garageDrive?: number;
    /** Dev only: hold the project slide at this progress, 0 (just switched) to 1 (settled). */
    __garageSlide?: number;
  }
}
const dev = process.env.NODE_ENV !== "production";
const frozen = (k: "__garageDrive" | "__garageSlide") => (dev && typeof window !== "undefined" && typeof window[k] === "number" ? window[k]! : null);

/** Drive-in time (s), outside to parked; Esc runs it backwards from wherever it is. */
export const DRIVE = 2.2;
/** A project slide (s). */
export const SLIDE = 0.75;

/** The drive-in's linear progress, 0 outside to 1 parked, stepping toward `inside`. */
export function useDrive(inside: boolean) {
  const k = useRef(0);
  useFrame((_, dt) => {
    const f = frozen("__garageDrive");
    k.current = f ?? clamp01(k.current + ((inside ? 1 : -1) * Math.min(dt, 0.05)) / DRIVE);
  });
  return k;
}

export type SlideClock = { from: number; to: number; dir: 1 | -1; k: number };
/** The slide between two projects: `from` is the one leaving, `to` the one arriving, k 0..1. */
export function useSlide(sel: number, dir: 1 | -1) {
  const r = useRef<SlideClock>({ from: sel, to: sel, dir, k: 1 });
  const t0 = useRef(-1);
  useFrame((s) => {
    const c = r.current;
    if (c.to !== sel) {
      c.from = c.k < 0.5 ? c.from : c.to;
      c.to = sel;
      c.dir = dir;
      t0.current = s.clock.elapsedTime;
    }
    c.k = frozen("__garageSlide") ?? (t0.current < 0 ? 1 : clamp01((s.clock.elapsedTime - t0.current) / SLIDE));
  });
  return r;
}

/* ------------------------------------------------------------------ data */

/** A garage's projects in the game's order (garageShots.ts), with their index in `projects`. */
export function garageList(domain: Domain) {
  return projects.map((p, index) => ({ p, index })).filter(({ p }) => p.domain === domain);
}
export type Item = { p: Project; index: number };

/** The bays exactly as the game builds them (Places.tsx): one per domain, coded like its zone. */
export const BAYS: Bay[] = GARAGES.map((g) => ({
  x: g.x,
  code: zoneCode(g.domain),
  name: garageLabel[g.domain].toUpperCase(),
}));
const PIT_OPTS: PitOpts = { apron: 4.8 };
export function zoneCode(domain: Domain) {
  return `Z${String(zones.findIndex((z) => z.id === `garage-${domain}`) + 1).padStart(2, "0")}`;
}
export const DOMAIN_ORDER: Domain[] = GARAGES.map((g) => g.domain);

/** Where the door is and where the back wall's inner face is (PitBuilding: depth 7, wall 0.3). */
export const DOOR_Z = 3.5;
export const BACK_Z = -3.2;
/** Where a vehicle waits outside, on the pit lane. */
export const OUT_Z = 8.8;
/** The vehicles' scale in the world (scale.ts). */
export const S = VEHICLE_SCALE;

/* ------------------------------------------------------------------ scene pieces */

/** The pit building with `domain`'s bay at the origin, the pit lane in front, the light. */
export function BayScene({ domain, lamp = 14 }: { domain: Domain; lamp?: number }) {
  const g = GARAGES.find((q) => q.domain === domain)!;
  return (
    <>
      <color attach="background" args={["#ebe9e3"]} />
      <fog attach="fog" args={["#ebe9e3", 26, 70]} />
      <hemisphereLight args={["#ffffff", "#b8b4a9", 0.9]} />
      <directionalLight
        position={[9, 16, 14]}
        intensity={2.2}
        color="#fff6ea"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-far={60}
      />
      {/* the bay's own light, as the game puts one in the bay nearest the car */}
      <pointLight color={CI.lamp} intensity={lamp} distance={9} decay={1.6} position={[0, 3.0, 0.2]} />
      <group position={[-g.x, 0, 0]}>
        <PitBuilding bays={BAYS} opts={PIT_OPTS} night={false} />
      </group>
      {/* pit lane asphalt with its paper edge lines, then concrete */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, DOOR_Z + 4.8 + 3]} receiveShadow>
        <planeGeometry args={[120, 6]} />
        <meshStandardMaterial color="#2b2c2f" roughness={0.95} />
      </mesh>
      {[-2.8, 2.8].map((o) => (
        <mesh key={o} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, DOOR_Z + 4.8 + 3 + o]}>
          <planeGeometry args={[120, 0.18]} />
          <meshStandardMaterial color={CI.paper} roughness={0.8} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#d3d0c7" roughness={1} />
      </mesh>
    </>
  );
}

/** The scan line: an orange square round a footprint with a faint fill. Callers move it. */
export function ScanSquare({ size }: { size: number }) {
  const t = 0.018;
  return (
    <group>
      {[
        [0, size / 2],
        [0, -size / 2],
      ].map(([px, pz], i) => (
        <mesh key={`h${i}`} position={[px, 0, pz]}>
          <boxGeometry args={[size + t, t, t]} />
          <meshBasicMaterial color={CI.orange} toneMapped={false} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`v${s}`} position={[(s * size) / 2, 0, 0]}>
          <boxGeometry args={[t, t, size + t]} />
          <meshBasicMaterial color={CI.orange} toneMapped={false} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial color={CI.orange} transparent opacity={0.07} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** A camera pose eased between two, written into the default camera each frame. */
export function setCam(c: THREE.PerspectiveCamera, pos: THREE.Vector3, look: THREE.Vector3, fov: number) {
  c.position.copy(pos);
  c.lookAt(look);
  if (Math.abs(c.fov - fov) > 1e-3) {
    c.fov = fov;
    c.updateProjectionMatrix();
  }
}

/** Plex Mono / Sans families for canvas text. */
export function fonts() {
  const cs = getComputedStyle(document.body);
  const mono = cs.getPropertyValue("--font-plex-mono").trim() || "monospace";
  const sans = cs.getPropertyValue("--font-plex").trim() || "sans-serif";
  return { mono: `${mono}, monospace`, sans: `${sans}, sans-serif` };
}

/** A canvas texture drawn now and again once the fonts arrive, disposed on unmount. */
export function useCanvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, key: string) {
  const pair = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const run = () => {
      const g = c.getContext("2d")!;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, w, h);
      draw(g);
      tex.needsUpdate = true;
    };
    run();
    return { tex, run };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, w, h]);
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => live && pair.run());
    return () => {
      live = false;
      pair.tex.dispose();
    };
  }, [pair]);
  return pair.tex;
}

/** The establishing shot outside the bay, where every option starts and backs out to. */
export const OUTSIDE = { pos: new THREE.Vector3(2.6, 3.2, 18), look: new THREE.Vector3(0, 1.2, 4), fov: 36 };

/** A spotlight aimed at a point in the same frame (its target joins the scene, so it follows). */
export function Spot({ position, target, intensity, angle = 0.5, distance = 8 }: { position: V3; target: V3; intensity: number; angle?: number; distance?: number }) {
  const [t] = useState(() => new THREE.Object3D());
  return (
    <>
      <primitive object={t} position={target} />
      <spotLight position={position} target={t} angle={angle} penumbra={0.65} intensity={intensity} distance={distance} decay={1.5} color={CI.lamp} />
    </>
  );
}
