"use client";

// The pit building in the game: the approved model (../kit/builtTown.tsx, concept
// pit-building) with a glazed bay per garage and its name plate, plus what the game needs
// on top: the upper glass lit at night, one showroom light in the bay nearest the car,
// and the solid walls for colliders. Front faces +z, floor at y = 0, x and z in metres.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carState } from "../carState";
import { dayNight } from "../daynight";
import { bm, type MatKey } from "../kit/builtShared";
import { PIT, PitBuildingBuilt, pitBuildingSolids, type PitBay, type PitOpts as KitPitOpts } from "../kit/builtTown";
import { CI, type Part } from "./concrete";

export type Bay = PitBay;
/** `bay` door width, `depth` of the block, `end` solid wall past the outer bays, `apron` concrete in front. */
export type PitOpts = KitPitOpts;

const NO_OPTS: PitOpts = {};

/** The solid walls a car can hit (ends, piers, back wall), for colliders. */
export function pitSolids(bays: Bay[], opts: PitOpts = {}): Part[] {
  return pitBuildingSolids(bays, { ...GAME, ...opts });
}
/** The game keeps its 7 m deep block, so the doors stay where the pit lane expects them. */
const GAME: PitOpts = { depth: 7 };
const withGame = new WeakMap<PitOpts, PitOpts>();
const gameOpts = (o: PitOpts) => {
  let v = withGame.get(o);
  if (!v) withGame.set(o, (v = { ...GAME, ...o }));
  return v;
};

const glass = (glow: number) => new THREE.MeshStandardMaterial({ color: "#6e7476", roughness: 0.25, metalness: 0.1, emissive: CI.lamp, emissiveIntensity: glow });
/** Upper glass by day and lit at night for the docs turntables; the game's follows the clock. */
const GLASS = { day: glass(0), night: glass(1.6), live: glass(0) };
/** The bays' pale insides glow a little at night, so the projects still read. */
const inner = (glow: number) => new THREE.MeshStandardMaterial({ color: "#e4e2dc", roughness: 0.85, emissive: CI.lamp, emissiveIntensity: glow });
const INNER = { day: inner(0.05), night: inner(0.25), live: inner(0.05) };
const pick = (g: THREE.Material, i: THREE.Material) => (k: MatKey) => (k === "glassPale" ? g : k === "inner" ? i : bm(k));
const MATS = { day: pick(GLASS.day, INNER.day), night: pick(GLASS.night, INNER.night), live: pick(GLASS.live, INNER.live) };

/**
 * The pit building. `bays` and `opts` should be stable (module constants). `night` fixes day
 * or night (the docs turntables); left out, the glass follows the game's clock.
 */
export function PitBuilding({ bays, opts = NO_OPTS, night }: { bays: Bay[]; opts?: PitOpts; night?: boolean }) {
  const lamp = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (night !== undefined) return;
    GLASS.live.emissiveIntensity = dayNight.night * 1.8;
    INNER.live.emissiveIntensity = 0.05 + dayNight.night * 0.22;
    // one showroom light, in the bay nearest the car (the one you can look into)
    const l = lamp.current;
    if (l?.parent) {
      l.parent.updateWorldMatrix(true, false);
      const lx = carState.pos.x - l.parent.matrixWorld.elements[12];
      let best = bays[0].x;
      for (const b of bays) if (Math.abs(b.x - lx) < Math.abs(best - lx)) best = b.x;
      l.position.x = best;
    }
  });
  return (
    <group>
      {night === undefined && <pointLight ref={lamp} color={CI.lamp} intensity={18} distance={11} decay={1.6} position={[bays[0].x, PIT.OPEN - 0.8, 0.2]} />}
      <PitBuildingBuilt bays={bays} opts={gameOpts(opts)} material={night === undefined ? MATS.live : night ? MATS.night : MATS.day} />
    </group>
  );
}

// ------------------------------------------------------------ plinths

const std = (color: string, roughness: number, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const M = { ink: std(CI.ink, 0.55, 0.2), concrete: std(CI.concrete, 0.95), paper: std(CI.paper, 0.6) };

const plinthGeo = {
  body: new THREE.BoxGeometry(1, 0.9, 1).translate(0, 0.5, 0),
  base: new THREE.BoxGeometry(0.9, 0.06, 0.9).translate(0, 0.03, 0),
  top: new THREE.BoxGeometry(1.02, 0.05, 1.02).translate(0, 0.975, 0),
};

/** A project's plinth in a bay: a concrete block on an ink shadow gap, a paper top. 1 m tall. */
export function Plinth() {
  return (
    <group>
      <mesh geometry={plinthGeo.base} material={M.ink} />
      <mesh geometry={plinthGeo.body} material={M.concrete} castShadow receiveShadow />
      <mesh geometry={plinthGeo.top} material={M.paper} castShadow receiveShadow />
    </group>
  );
}
