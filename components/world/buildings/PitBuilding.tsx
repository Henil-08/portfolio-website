"use client";

// The pit building in the game: the approved model (../kit/builtTown.tsx, concept
// pit-building) with a glazed bay per garage and its name plate, plus what the game needs
// on top: the upper glass lit at night, one showroom light in the bay nearest the car,
// and the solids for colliders (walls, closed doors, a lid). Front faces +z, floor at y = 0,
// x and z in metres.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carState } from "../carState";
import { dayNight } from "../daynight";
import { GARAGES } from "../layout";
import { garageView } from "../garage/state";
import { bm, type MatKey } from "../kit/builtShared";
import { PIT, PitBuildingBuilt, pitBuildingSolids, type PitBay, type PitOpts as KitPitOpts } from "../kit/builtTown";
import { CI, type Part } from "./concrete";

export type Bay = PitBay;
/** `bay` door width, `depth` of the block, `end` solid wall past the outer bays, `apron` concrete in front. */
export type PitOpts = KitPitOpts;

const NO_OPTS: PitOpts = {};

/** How thick the closed doors' colliders are, back from the building's front face. */
const DOOR_T = 0.3;
/** The lid's height, from the ground floor's top (H1) to the roof slab's top (kit/builtTown.tsx: an 0.18 m slab at H1 + UP + 0.12). */
const LID_H = PIT.UP + 0.21;

/**
 * The kit's walls (ends, piers, back wall) and what they leave: the block's ends x0, x1, its
 * depth D, and each bay's door opening (from a to b across), the gaps between the ends and piers.
 */
function pitShell(bays: Bay[], opts: PitOpts) {
  const walls = pitBuildingSolids(bays, { ...GAME, ...opts });
  // the ends and piers run the block's full depth
  const blocks = walls.filter(([s]) => s[2] > 1).sort((p, q) => p[1][0] - q[1][0]);
  const edge = (i: number, side: -1 | 1) => blocks[i][1][0] + (side * blocks[i][0][0]) / 2;
  const doors: { a: number; b: number }[] = [];
  for (let i = 1; i < blocks.length; i++) if (edge(i, -1) - edge(i - 1, 1) > 0.01) doors.push({ a: edge(i - 1, 1), b: edge(i, -1) });
  return { walls, doors, D: blocks[0][0][2], x0: edge(0, -1), x1: edge(blocks.length - 1, 1) };
}

/**
 * Everything a car can hit, for colliders: the ends, piers and back wall, then each bay's
 * closed door from the floor to the header's top, flush with the front face, and a lid over
 * the whole block up to the roof, so nothing gets in over the top either. The bays only open
 * for the garage's own drive-in (E, garage/GarageShow.tsx), which has no physics.
 */
export function pitSolids(bays: Bay[], opts: PitOpts = {}): Part[] {
  const { walls, doors, D, x0, x1 } = pitShell(bays, opts);
  return [
    ...walls,
    ...doors.map(({ a, b }): Part => [[b - a, PIT.H1, DOOR_T], [(a + b) / 2, PIT.H1 / 2, D / 2 - DOOR_T / 2]]),
    [[x1 - x0, LID_H, D], [(x0 + x1) / 2, PIT.H1 + LID_H / 2, 0]],
  ];
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

// The door (game only): while a garage's stand-in drives in and backs out (garage/GarageShow.tsx),
// that bay's glass front, its pane, mullions and sill, is cut away from the floor up, as if it
// rolled up into the header. x0, x1, the cut's height and the front face's z, in the building's frame.
const doorCut = { value: new THREE.Vector4(0, 0, -1, 0) };
function withDoor<M extends THREE.Material>(m: M) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDoor = doorCut;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vDoor;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvDoor = transformed;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vDoor;\nuniform vec4 uDoor;")
      .replace("void main() {", "void main() {\n  if (vDoor.x > uDoor.x && vDoor.x < uDoor.y && vDoor.y < uDoor.z && vDoor.z > uDoor.w - 0.2 && vDoor.z < uDoor.w) discard;");
  };
  m.customProgramCacheKey = () => "pit-door";
  return m;
}
const DOOR = { clear: withDoor(bm("clear").clone()), ink: withDoor(bm("ink").clone()) };

const pick = (g: THREE.Material, i: THREE.Material, door = false) => (k: MatKey) =>
  k === "glassPale" ? g : k === "inner" ? i : door && (k === "clear" || k === "ink") ? DOOR[k] : bm(k);
const MATS = { day: pick(GLASS.day, INNER.day), night: pick(GLASS.night, INNER.night), live: pick(GLASS.live, INNER.live, true) };

/**
 * The pit building. `bays` and `opts` should be stable (module constants). `night` fixes day
 * or night (the docs turntables); left out, the glass follows the game's clock.
 */
export function PitBuilding({ bays, opts = NO_OPTS, night }: { bays: Bay[]; opts?: PitOpts; night?: boolean }) {
  const lamp = useRef<THREE.PointLight>(null);
  const root = useRef<THREE.Group>(null);
  const shell = useMemo(() => pitShell(bays, opts), [bays, opts]);
  useFrame(() => {
    if (night !== undefined) return;
    GLASS.live.emissiveIntensity = dayNight.night * 1.8;
    INNER.live.emissiveIntensity = 0.05 + dayNight.night * 0.22;
    // the open garage's door: up before the stand-in moves, down once it has backed out
    const g = GARAGES.find((q) => q.domain === garageView.dom);
    const up = g ? THREE.MathUtils.smoothstep(garageView.k, 0, 0.12) : 0;
    if (up > 0 && root.current) {
      root.current.updateWorldMatrix(true, false);
      const x = g!.x - root.current.matrixWorld.elements[12];
      const d = shell.doors.find((q) => x > q.a && x < q.b);
      if (d) doorCut.value.set(d.a + 0.01, d.b - 0.01, up * (PIT.OPEN + 0.05), shell.D / 2 - 0.005);
    } else doorCut.value.z = -1;
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
    <group ref={root}>
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
