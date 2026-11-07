"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  CylinderCollider,
  RigidBody,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import {
  Bail,
  Billboard,
  Bush,
  Cone,
  CricketPitch,
  FootballBody,
  Gantry,
  Goal,
  Grandstand,
  Letter,
  PitWall,
  Podium,
  Rock,
  Stump,
  Tree,
  Tyre,
  BALL_R,
  STUMP_GAP,
  STUMP_H,
  STUMP_R,
  TYRE_H,
  TYRE_R,
  type Compound,
} from "./models/props";
import { LETTER_WIDTH, type LetterChar } from "./models/props/Letter";
import PitRoads from "./PitRoads";
import PitWallRun from "./PitWallRun";
import Timeline from "./Timeline";
import Groves from "./Groves";
import Garden from "./garden";
import Social from "./social";
import Waterfront from "./waterfront";
import { HomeBody } from "./Movables";
import Bridge from "./Bridge";
import { AHMEDABAD_BOXES, AhmedabadSector, BOSTON_BOXES, BostonSector, HYPERLAB_BOXES, HyperlabSector, WATERS_BOXES, WatersSector } from "./models/sectors";
import ZoneDebug from "./ui3d/ZoneDebug";
import { C } from "./palette";
import {
  GANTRY_T,
  GARAGES,
  GRANDSTAND,
  inLand,
  LETTERS,
  TIMELINE,
  PIT,
  pitWallZ,
  SECTORS,
  TRACK_WIDTH,
  garageLabel,
  trackCurve,
  trackPoint,
  zoneById,
  zones,
  type ZoneId,
} from "./layout";
import { cheer, pop } from "./sound";
import { achieve, toast } from "./store";
import GarageShow from "./garage/GarageShow";
import { PitBuilding, pitSolids, type Bay, type PitOpts } from "./buildings/PitBuilding";
import { heightAt } from "./terrain";
import { pitAsphalt, roadPaint } from "./Island";
import Park from "./park";
import { NATURE } from "./street/trees";

type V3 = [number, number, number];

function at(id: ZoneId): V3 {
  const z = zoneById[id];
  return [z.pos[0], heightAt(z.pos[0], z.pos[1]), z.pos[1]];
}

// ------------------------------------------------------------ dynamic props

// HENIL GAJJAR, set tight like the name at the original's landing: glyph widths plus
// a small gap, a wider one between the words. Ink letters, the first H the one orange.
const NAME = (() => {
  const s = LETTERS.scale;
  const gap = 0.16 * s;
  const space = 1.1 * s;
  const items: { ch: LetterChar; x: number; w: number; red: boolean }[] = [];
  let x = 0;
  for (const c of LETTERS.text) {
    if (c === " ") {
      x += space - gap;
      continue;
    }
    const ch = c as LetterChar;
    const w = LETTER_WIDTH[ch] * s;
    items.push({ ch, x: x + w / 2, w, red: items.length === 0 });
    x += w + gap;
  }
  const total = x - gap;
  return items.map((it) => ({ ...it, x: LETTERS.center[0] - total / 2 + it.x }));
})();

function Letters() {
  const s = LETTERS.scale;
  const h = 1.55 * s;
  const z = LETTERS.center[1];
  return (
    <>
      {NAME.map((l, i) => (
        <HomeBody key={l.ch + i} colliders={false} position={[l.x, heightAt(l.x, z) + h / 2 + 0.02, z]} mass={3 * s} linearDamping={0.3} angularDamping={0.4}>
          <CuboidCollider args={[l.w / 2, h / 2, 0.25 * s]} friction={0.7} restitution={0.15} />
          <group position={[0, -h / 2, 0]} scale={s}>
            <Letter char={l.ch} color={l.red ? C.red : C.ink} />
          </group>
        </HomeBody>
      ))}
    </>
  );
}

function ConeBody({ p }: { p: V3 }) {
  return (
    <HomeBody colliders={false} position={[p[0], heightAt(p[0], p[2]) + 0.27, p[2]]} mass={0.25} linearDamping={0.4} angularDamping={0.4}>
      <CylinderCollider args={[0.27, 0.2]} friction={0.6} restitution={0.3} />
      <group position={[0, -0.27, 0]}>
        <Cone />
      </group>
    </HomeBody>
  );
}

function Cones() {
  // A few at the track corners.
  const spots = useMemo<V3[]>(() => {
    const s: V3[] = [];
    for (const t of [0.18, 0.44, 0.68, 0.9]) {
      const p = trackPoint(t);
      const tan = trackCurve.getTangentAt(t);
      const n = new THREE.Vector3(-tan.z, 0, tan.x);
      for (let k = 0; k < 3; k++) {
        const q = p.clone().addScaledVector(n, TRACK_WIDTH / 2 + 2 + k * 0.7).addScaledVector(tan, k * 1.1);
        s.push([q.x, 0, q.z]);
      }
    }
    return s;
  }, []);
  return (
    <>
      {spots.map((p, i) => (
        <ConeBody key={i} p={p} />
      ))}
    </>
  );
}

// Tyre wall: four stacks, one per compound. Tyres are separate bodies so they topple.
function TyreWall() {
  const [x, gy, z] = at("playbook");
  const compounds: Compound[] = ["soft", "medium", "hard", "inter"];
  return (
    <>
      {compounds.map((c, i) =>
        [0, 1, 2, 3].map((k) => (
          <HomeBody
            key={c + k}
            colliders={false}
            position={[x - 3.3 + i * 2.2, gy + TYRE_H / 2 + k * (TYRE_H + 0.005), z - 1]}
            mass={0.6}
            linearDamping={0.3}
            angularDamping={0.5}
          >
            <CylinderCollider args={[TYRE_H / 2, TYRE_R]} friction={0.9} restitution={0.25} />
            <group position={[0, -TYRE_H / 2, 0]}>
              <Tyre compound={c} />
            </group>
          </HomeBody>
        ))
      )}
    </>
  );
}

function FootballPitch() {
  const [x, gy, z] = at("football");
  const ball = useRef<RapierRigidBody>(null);
  const scored = useRef(0);
  const goals = useRef(0);
  const home: V3 = [x, gy + BALL_R + 0.05, z + 2];
  const goalZ = z - 6;

  useFrame(({ clock }) => {
    const b = ball.current;
    if (!b) return;
    // Dev and headless checks: window.__ball is the football's body.
    if (process.env.NODE_ENV !== "production") (window as unknown as { __ball: RapierRigidBody }).__ball = b;
    const p = b.translation();
    // Goal: ball inside the mouth volume.
    if (Math.abs(p.x - x) < 1.9 && p.z < goalZ + 0.6 && p.z > goalZ - 0.9 && p.y < gy + 1.8) {
      if (clock.elapsedTime - scored.current > 3) {
        scored.current = clock.elapsedTime;
        toast("GOAL!", "yellow");
        cheer();
        goals.current++;
        achieve("goal");
        if (goals.current === 3 && achieve("hat-trick")) setTimeout(() => toast("Hat-trick", "teal"), 900);
        setTimeout(() => {
          b.setTranslation({ x: home[0], y: home[1] + 1, z: home[2] }, true);
          b.setLinvel({ x: 0, y: 0, z: 0 }, true);
          b.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }, 1500);
      }
    }
    if (p.y < gy - 3 || !inLand(p.x, p.z, -4)) {
      b.setTranslation({ x: home[0], y: home[1] + 1, z: home[2] }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  });

  return (
    <>
      {/* Pitch paint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, gy + 0.015, z]} receiveShadow>
        <planeGeometry args={[16, 13]} />
        <meshStandardMaterial color={C.grassDark} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, gy + 0.02, z]}>
        <ringGeometry args={[2, 2.2, 40]} />
        <meshStandardMaterial color={C.white} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, gy + 0.02, z + 6.4]}>
        <planeGeometry args={[16, 0.2]} />
        <meshStandardMaterial color={C.white} />
      </mesh>

      <RigidBody type="fixed" colliders={false} position={[x, gy, goalZ]}>
        <Goal />
        <CylinderCollider args={[0.9, 0.1]} position={[-2, 0.9, 0.75]} />
        <CylinderCollider args={[0.9, 0.1]} position={[2, 0.9, 0.75]} />
        <CuboidCollider args={[2, 0.08, 0.08]} position={[0, 1.8, 0.75]} />
        <CuboidCollider args={[2, 0.6, 0.05]} position={[0, 0.6, -0.75]} />
        <CuboidCollider args={[0.05, 0.75, 0.75]} position={[-2, 0.75, 0]} />
        <CuboidCollider args={[0.05, 0.75, 0.75]} position={[2, 0.75, 0]} />
      </RigidBody>

      <FootballBody ref={ball} position={home} />
    </>
  );
}

function Cricket() {
  const [x, gy, z] = at("cricket");
  const stumps = useRef<(RapierRigidBody | null)[]>([]);
  const out = useRef(false);
  const wickets = useRef(0);
  const ends = [-8.8, 8.8];

  const reset = () => {
    stumps.current.forEach((b, i) => {
      if (!b) return;
      const end = Math.floor(i / 5);
      const k = i % 5;
      const sx = x + ends[end];
      const pos =
        k < 3
          ? { x: sx, y: gy + STUMP_H / 2, z: z + (k - 1) * STUMP_GAP }
          : { x: sx, y: gy + STUMP_H + 0.04, z: z + (k === 3 ? -0.5 : 0.5) * STUMP_GAP };
      b.setTranslation(pos, true);
      b.setRotation(k < 3 ? { x: 0, y: 0, z: 0, w: 1 } : new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    });
  };

  useFrame(() => {
    if (out.current) return;
    for (const b of stumps.current) {
      if (!b) continue;
      const v = b.linvel();
      if (Math.hypot(v.x, v.y, v.z) > 1.2) {
        out.current = true;
        toast("HOWZAT!", "red");
        pop();
        wickets.current++;
        achieve("howzat");
        if (wickets.current === 3 && achieve("hat-trick")) setTimeout(() => toast("Hat-trick", "teal"), 900);
        setTimeout(() => {
          reset();
          out.current = false;
        }, 4500);
        return;
      }
    }
  });

  return (
    <>
      <group position={[x, gy, z]} rotation={[0, Math.PI / 2, 0]}>
        <CricketPitch />
      </group>
      {ends.map((ex, e) => (
        <group key={e}>
          {[-1, 0, 1].map((k, j) => (
            <RigidBody
              key={k}
              ref={(r) => {
                stumps.current[e * 5 + j] = r;
              }}
              colliders={false}
              position={[x + ex, gy + STUMP_H / 2, z + k * STUMP_GAP]}
              mass={0.15}
              ccd
            >
              <CylinderCollider args={[STUMP_H / 2, STUMP_R]} friction={0.5} />
              <group position={[0, -STUMP_H / 2, 0]}>
                <Stump />
              </group>
            </RigidBody>
          ))}
          {[-0.5, 0.5].map((k, j) => (
            <RigidBody
              key={k}
              ref={(r) => {
                stumps.current[e * 5 + 3 + j] = r;
              }}
              colliders={false}
              position={[x + ex, gy + STUMP_H + 0.04, z + k * STUMP_GAP]}
              rotation={[0, Math.PI / 2, 0]}
              mass={0.03}
              ccd
            >
              <CuboidCollider args={[0.13, 0.03, 0.03]} />
              <Bail />
            </RigidBody>
          ))}
        </group>
      ))}
    </>
  );
}

// ------------------------------------------------------------ fixed buildings

function Buildings() {
  const pd = at("podium");
  const start = trackPoint(GANTRY_T);
  const sTan = trackCurve.getTangentAt(GANTRY_T);
  const sRot = Math.atan2(sTan.x, sTan.z); // local +Z (through the arch) along the road

  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[pd[0], pd[1], pd[2] - 1]}>
        <Podium />
        <CuboidCollider args={[2.5, 0.6, 1]} position={[0, 0.6, 0]} />
      </RigidBody>


      <group position={[GRANDSTAND.pos[0], heightAt(GRANDSTAND.pos[0], GRANDSTAND.pos[1]), GRANDSTAND.pos[1]]} rotation={[0, GRANDSTAND.rot, 0]}>
        <Grandstand cheer />
      </group>

      <group position={[start.x, start.y, start.z]} rotation={[0, sRot, 0]}>
        <Gantry lights={0} />
      </group>
    </>
  );
}

// The pit building's bays, one per project domain, coded like their zones (Z05…).
const BAYS: Bay[] = GARAGES.map((g) => ({
  x: g.x,
  code: `Z${String(zones.findIndex((z) => z.id === `garage-${g.domain}`) + 1).padStart(2, "0")}`,
  name: garageLabel[g.domain].toUpperCase(),
}));
// a concrete apron in front, as far as the grass mask allows (Grass.tsx)
const PIT_OPTS: PitOpts = { apron: 4.8 };

// Pit lane: a pit wall between the lane and the main straight, and the pit building
// with a bay per project domain, that domain's projects on its pit wall and stage inside.
function PitLane() {
  const pitY = heightAt((PIT.from + PIT.to) / 2, PIT.z);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(PIT.from + PIT.to) / 2, pitY + 0.025, PIT.z]} receiveShadow>
        <planeGeometry args={[PIT.to - PIT.from + 10, 6]} />
        <primitive object={pitAsphalt} attach="material" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} rotation={[-Math.PI / 2, 0, 0]} position={[(PIT.from + PIT.to) / 2, pitY + 0.03, PIT.z + side * 3]} material={roadPaint}>
          <planeGeometry args={[PIT.to - PIT.from + 10, 0.18]} />
        </mesh>
      ))}
      {/* the pit wall stand on the lane side of the wall: four booths, one per vehicle */}
      <RigidBody type="fixed" colliders={false} position={[-29, pitY, (pitWallZ(-29) ?? PIT.z + 4) - 0.8]}>
        <PitWall />
        <CuboidCollider args={[4.4, 0.6, 0.7]} position={[0, 0.6, -0.25]} />
      </RigidBody>

      <RigidBody type="fixed" colliders={false} position={[0, pitY, PIT.garageZ - 1]}>
        <PitBuilding bays={BAYS} opts={PIT_OPTS} />
        {pitSolids(BAYS, PIT_OPTS).map(([s, c], i) => (
          <CuboidCollider key={i} args={[s[0] / 2, s[1] / 2, s[2] / 2]} position={c} />
        ))}
      </RigidBody>
      {/* each bay's pit wall of screens and stage, and the drive-in when a garage opens */}
      <GarageShow />
    </>
  );
}

// Each sector has its own scenery set beside the track.
const SCENES = { ahmedabad: AhmedabadSector, hyperlab: HyperlabSector, boston: BostonSector, waters: WatersSector };

// Painted road text that reacts to light (so it darkens at night).

// Collision boxes for each scenery set, in the set's local space: [centre, full size].
type Box = [[number, number, number], [number, number, number]];
const SCENE_BOXES: Record<keyof typeof SCENES, Box[]> = {
  ahmedabad: AHMEDABAD_BOXES,
  hyperlab: HYPERLAB_BOXES,
  boston: BOSTON_BOXES,
  waters: WATERS_BOXES,
};

function Sectors() {
  return (
    <>
      {/* dev only: window.__zones = true draws every hotspot, prompt, spawn and collider from above */}
      {process.env.NODE_ENV !== "production" && <ZoneDebug />}
      {SECTORS.map((s) => {
        const Scene = SCENES[s.id];
        return (
          <group key={s.id}>
            <RigidBody type="fixed" colliders={false} position={[s.scene[0], heightAt(s.scene[0], s.scene[1]) - 0.15, s.scene[1]]} rotation={[0, s.sceneRot, 0]}>
              <Scene />
              {SCENE_BOXES[s.id].map(([c, size], i) => (
                <CuboidCollider key={i} args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={c} />
              ))}
            </RigidBody>
          </group>
        );
      })}
    </>
  );
}

// Small signposts so the infield places explain themselves.
function Signposts() {
  return (
    <>
      {(
        [
          ["playbook", "TYRE WALL", "How I use AI", [0, 0, 4.5]],
          ["podium", "PODIUM", "Papers and patents", [0, 0, 4.5]],
          ["cricket", "CRICKET", "Off the clock", [0, 0, 6]],
          ["football", "FOOTBALL", "Off the clock", [-10, 0, 8]],
        ] as const
      ).map(([id, t, sub, off]) => {
        const p = at(id);
        return (
          <group key={id} position={[p[0] + off[0], heightAt(p[0] + off[0], p[2] + off[2]), p[2] + off[2]]} scale={0.7}>
            <Billboard title={t} subtitle={sub} />
          </group>
        );
      })}
    </>
  );
}

// ------------------------------------------------------------ nature

// The island's scatter: one list (street/trees.ts), grown after every structure is placed,
// that the street, the bushes and the birds read too.
function Nature() {
  const items = useMemo(() => NATURE.map((it) => ({ ...it, p: [it.x, heightAt(it.x, it.z), it.z] as V3 })), []);

  return (
    <>
      {items.map((it, i) => {
        const solid = it.kind === "round" || it.kind === "cypress";
        const visual =
          it.kind === "bush" ? (
            <Bush seed={it.seed} />
          ) : it.kind === "rock" ? (
            <Rock seed={it.seed} />
          ) : (
            <Tree variant={it.kind} seed={it.seed} />
          );
        return solid ? (
          <RigidBody key={i} type="fixed" colliders={false} position={it.p}>
            <CylinderCollider args={[1, 0.3 * it.s]} position={[0, 1, 0]} />
            <group rotation={[0, it.rot, 0]} scale={it.s}>
              {visual}
            </group>
          </RigidBody>
        ) : (
          <group key={i} position={it.p} rotation={[0, it.rot, 0]} scale={it.s}>
            {visual}
          </group>
        );
      })}
    </>
  );
}

export default function Places() {
  return (
    <>
      <Buildings />
      <PitLane />
      <PitRoads />
      <PitWallRun />
      <Timeline position={[TIMELINE.pos[0], heightAt(TIMELINE.pos[0], TIMELINE.pos[1]), TIMELINE.pos[1]]} rotation={TIMELINE.rot} />
      <Sectors />
      <Signposts />
      <Letters />
      <Cones />
      <TyreWall />
      <FootballPitch />
      <Cricket />
      <Nature />
      <Groves />
      <Garden />
      <Social />
      <Park />
      <Waterfront />
      <Bridge />
    </>
  );
}
