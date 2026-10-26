"use client";

// W02 garages: one long concrete block like a modern pit building. A glazed bay per garage
// (the sectional glass door raised, so the projects show through), concrete piers between
// them, a code plate over each door, a set-back upper floor with a full-width dark glass band
// and a thin ink roof on slim ink columns. Merged by material: a handful of draw calls for the
// whole building. Front faces +z, floor at y = 0, x and z in metres.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carState } from "../carState";
import { dayNight } from "../daynight";
import { CI, mergeBoxes, plateMaterial, type Part } from "./concrete";

export type Bay = { x: number; code: string; name?: string };
/** `bay` door width, `depth` of the block, `end` solid wall past the outer bays, `apron` concrete in front. */
export type PitOpts = { bay?: number; depth?: number; end?: number; apron?: number };

const H1 = 4.6; // ground floor top
const OPEN = 3.6; // door opening height
const DOOR = 2.7; // bottom of the raised glass door
const H2 = 2.6; // upper floor
const WALL = 0.3;
const plateW = (b: Bay) => (b.name ? 3.6 : 1.6);

const std = (color: string, roughness: number, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const M = {
  concrete: std(CI.concrete, 0.95),
  apron: std(CI.concreteDark, 0.95),
  floor: std("#e9e7e1", 0.55),
  // inside: pale walls and a ceiling that glows a little, so the projects read by day and night
  inner: new THREE.MeshStandardMaterial({ color: "#e4e2dc", roughness: 0.85, emissive: CI.lamp, emissiveIntensity: 0.12 }),
  ink: std(CI.ink, 0.55, 0.2),
  graphite: std(CI.graphite, 0.8),
  paper: std(CI.paper, 0.6),
  orange: std(CI.orange, 0.55),
  strip: new THREE.MeshStandardMaterial({ color: CI.paper, emissive: CI.lamp, emissiveIntensity: 1.6, toneMapped: false }),
};
const glass = (glow = 0) => new THREE.MeshStandardMaterial({ color: CI.glass, roughness: 0.15, metalness: 0.4, emissive: CI.lamp, emissiveIntensity: glow });
/** Glass by day and lit at night for the docs turntables; the game's pair follows the clock. */
const GLASS = {
  day: { bay: glass(), band: glass() },
  night: { bay: glass(0.18), band: new THREE.MeshStandardMaterial({ color: CI.paper, emissive: CI.lamp, emissiveIntensity: 2.4, toneMapped: false }) },
  live: { bay: glass(), band: glass() },
};

const NO_OPTS: PitOpts = {};

function span(bays: Bay[], { bay = 8.4, end = 1.8 }: PitOpts) {
  const x0 = bays[0].x - bay / 2 - end;
  const x1 = bays[bays.length - 1].x + bay / 2 + end;
  return { x0, x1, w: x1 - x0, cx: (x0 + x1) / 2 };
}

/** The solid walls a car can hit (back wall and piers), for colliders. */
export function pitSolids(bays: Bay[], opts: PitOpts = {}): Part[] {
  const { bay = 8.4, depth: D = 7 } = opts;
  const { x0, x1, w, cx } = span(bays, opts);
  const out: Part[] = [[[w, H1, WALL], [cx, H1 / 2, -D / 2 + WALL / 2]]];
  const edges = [x0, ...bays.flatMap((b) => [b.x - bay / 2, b.x + bay / 2]), x1];
  for (let i = 0; i < edges.length; i += 2) out.push([[edges[i + 1] - edges[i], H1, D], [(edges[i] + edges[i + 1]) / 2, H1 / 2, 0]]);
  return out;
}

function parts(bays: Bay[], opts: PitOpts) {
  const { bay = 8.4, depth: D = 7, apron = 0 } = opts;
  const { x0, x1, w, cx } = span(bays, opts);
  const zf = D / 2;
  const up = D - 1.6; // upper floor depth: set back to leave a terrace over the doors
  const p = { concrete: [] as Part[], apron: [] as Part[], floor: [] as Part[], ink: [] as Part[], graphite: [] as Part[], inner: [] as Part[], paper: [] as Part[], orange: [] as Part[], strip: [] as Part[], bay: [] as Part[], band: [] as Part[] };
  if (apron > 0) p.apron.push([[w + 1, 0.04, apron], [cx, 0.01, zf + apron / 2]]);

  // ground floor: back wall, piers, a deep header over each door
  p.concrete.push(...pitSolids(bays, opts));
  // upper floor, set back, with the dark glass band across its face
  p.concrete.push([[w, H2, up], [cx, H1 + H2 / 2, -zf + up / 2]]);
  p.band.push([[w - 0.6, 1.5, 0.06], [cx, H1 + 1.4, -zf + up + 0.03]]);
  // thin ink roof, a little proud all round, on slim columns along the terrace
  p.ink.push([[w + 1, 0.3, D + 0.7], [cx, H1 + H2 + 0.15, 0.25]]);
  const cols = [x0 + 0.3, ...bays.slice(1).map((b, i) => (b.x + bays[i].x) / 2), x1 - 0.3];
  for (const x of cols) p.ink.push([[0.2, H2, 0.2], [x, H1 + H2 / 2, zf - 0.35]]);

  for (const b of bays) {
    const x = b.x;
    p.concrete.push([[bay, H1 - OPEN, D - WALL], [x, (H1 + OPEN) / 2, WALL / 2]]);
    // inside: pale epoxy floor with a paper line at the threshold, graphite back wall, light strips
    p.floor.push([[bay, 0.03, D - WALL], [x, 0.015, WALL / 2]]);
    p.paper.push([[bay - 0.4, 0.035, 0.12], [x, 0.018, zf - 0.25]]);
    p.inner.push([[bay, OPEN, 0.02], [x, OPEN / 2, -zf + WALL + 0.01]]);
    for (const s of [-1, 1]) p.inner.push([[0.02, OPEN, D - WALL], [x + s * (bay / 2 - 0.01), OPEN / 2, WALL / 2]]);
    p.inner.push([[bay, 0.02, D - WALL], [x, OPEN - 0.01, WALL / 2]]);
    // a graphite skirting along the back wall, and paper light panels across the ceiling
    p.graphite.push([[bay, 0.3, 0.03], [x, 0.15, -zf + WALL + 0.02]]);
    for (const sz of [-0.28, 0.12]) for (const sx of [-0.25, 0.25]) p.strip.push([[bay * 0.34, 0.03, D * 0.22], [x + sx * bay, OPEN - 0.035, sz * D]]);
    // ink door frame, and the glass door raised into the head with its rails and mullions
    p.ink.push([[bay + 0.32, 0.16, 0.16], [x, OPEN + 0.08, zf + 0.02]]);
    for (const s of [-1, 1]) p.ink.push([[0.16, OPEN + 0.16, 0.16], [x + s * (bay / 2 + 0.08), (OPEN + 0.16) / 2, zf + 0.02]]);
    p.bay.push([[bay, OPEN - DOOR, 0.04], [x, (DOOR + OPEN) / 2, zf - 0.3]]);
    p.ink.push([[bay, 0.07, 0.09], [x, DOOR + 0.035, zf - 0.3]]);
    for (let k = 1; k < 4; k++) p.ink.push([[0.05, OPEN - DOOR, 0.07], [x - bay / 2 + (bay * k) / 4, (DOOR + OPEN) / 2, zf - 0.3]]);
    // the one orange: a small square beside the code plate
    p.orange.push([[0.2, 0.2, 0.04], [x + plateW(b) / 2 + 0.3, (OPEN + 0.16 + H1) / 2, zf + 0.02]]);
  }
  const out = {} as Record<keyof typeof p, THREE.BufferGeometry>;
  for (const k of Object.keys(p) as (keyof typeof p)[]) out[k] = mergeBoxes(p[k]);
  return out;
}

/**
 * The pit building. `bays` and `opts` should be stable (module constants). `night` fixes day
 * or night (the docs turntables); left out, the glass follows the game's clock.
 */
export function PitBuilding({ bays, opts = NO_OPTS, night }: { bays: Bay[]; opts?: PitOpts; night?: boolean }) {
  const g = useMemo(() => parts(bays, opts), [bays, opts]);
  const glassMats = night === undefined ? GLASS.live : night ? GLASS.night : GLASS.day;
  const lamp = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (night !== undefined) return;
    const n = dayNight.night;
    GLASS.live.bay.emissiveIntensity = n * 0.35;
    GLASS.live.band.emissiveIntensity = n * 2.6;
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
  const zf = (opts.depth ?? 7) / 2;
  const mesh = (geo: THREE.BufferGeometry, m: THREE.Material, shadow = true) => <mesh geometry={geo} material={m} castShadow={shadow} receiveShadow />;
  return (
    <group>
      {night === undefined && <pointLight ref={lamp} color={CI.lamp} intensity={14} distance={9} decay={1.6} position={[bays[0].x, OPEN - 0.6, 0.2]} />}
      {mesh(g.concrete, M.concrete)}
      {mesh(g.apron, M.apron, false)}
      {mesh(g.floor, M.floor, false)}
      {mesh(g.ink, M.ink)}
      {mesh(g.graphite, M.graphite, false)}
      {mesh(g.inner, M.inner, false)}
      {mesh(g.paper, M.paper, false)}
      {mesh(g.orange, M.orange, false)}
      {mesh(g.strip, M.strip, false)}
      {mesh(g.bay, glassMats.bay, false)}
      {mesh(g.band, glassMats.band, false)}
      {bays.map((b) => (
        <mesh key={b.code} position={[b.x, (OPEN + 0.16 + H1) / 2, zf + 0.02]} material={b.name ? plateMaterial(`${b.code} · ${b.name}`, { w: 1024, h: 128, size: 64 }) : plateMaterial(b.code, { w: 448, h: 128, size: 64 })}>
          <planeGeometry args={[plateW(b), 0.45]} />
        </mesh>
      ))}
    </group>
  );
}

// ------------------------------------------------------------ plinths

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
