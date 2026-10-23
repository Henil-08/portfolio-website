"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BallCollider,
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
  Flag,
  Football,
  Gantry,
  Garage,
  Goal,
  Grandstand,
  Letter,
  Pedestal,
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
import { Label } from "./models/props/Label";
import { Avatar } from "./models/Avatar";
import { ProjectObject } from "./models/projects";
import { AhmedabadSector, BostonSector, HyperlabSector, WatersSector } from "./models/sectors";
import { projects } from "@/content/projects";
import { C } from "./palette";
import {
  GANTRY_T,
  GARAGES,
  GRANDSTAND,
  ISLAND_RADIUS,
  LETTERS,
  PIT,
  SECTORS,
  TRACK_WIDTH,
  sectorT,
  garageLabel,
  trackCurve,
  trackPoint,
  zoneById,
  type ZoneId,
} from "./layout";
import { cheer, pop } from "./sound";
import { achieve, toast } from "./store";
import { heightAt } from "./terrain";

type V3 = [number, number, number];

function at(id: ZoneId): V3 {
  const z = zoneById[id];
  return [z.pos[0], heightAt(z.pos[0], z.pos[1]), z.pos[1]];
}

// Deterministic pseudo random so the island looks the same on every visit.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function distToTrack(x: number, z: number) {
  let best = Infinity;
  for (const p of TRACK_SAMPLES) best = Math.min(best, Math.hypot(p.x - x, p.z - z));
  return best;
}
const TRACK_SAMPLES = trackCurve.getSpacedPoints(160);

// ------------------------------------------------------------ dynamic props

function Letters() {
  const colors = [C.red, C.white, C.white, C.white, C.white];
  return (
    <>
      {LETTERS.chars.map((ch, i) => (
        <RigidBody
          key={ch + i}
          colliders={false}
          position={[LETTERS.origin[0] + i * LETTERS.gap, heightAt(LETTERS.origin[0] + i * LETTERS.gap, LETTERS.origin[1]) + 0.8, LETTERS.origin[1]]}
          mass={3}
          linearDamping={0.3}
          angularDamping={0.4}
        >
          <CuboidCollider args={[ch === "I" ? 0.3 : 0.75, 0.8, 0.25]} friction={0.7} restitution={0.15} />
          <group position={[0, -0.8, 0]}>
            <Letter char={ch} color={colors[i]} />
          </group>
        </RigidBody>
      ))}
    </>
  );
}

function ConeBody({ p }: { p: V3 }) {
  return (
    <RigidBody colliders={false} position={[p[0], heightAt(p[0], p[2]) + 0.27, p[2]]} mass={0.25} linearDamping={0.4} angularDamping={0.4}>
      <CylinderCollider args={[0.27, 0.2]} friction={0.6} restitution={0.3} />
      <group position={[0, -0.27, 0]}>
        <Cone />
      </group>
    </RigidBody>
  );
}

function Cones() {
  // Slalom on the plaza plus a few at the track corners.
  const spots = useMemo<V3[]>(() => {
    const s: V3[] = [];
    for (let i = 0; i < 6; i++) s.push([-6 + i * 2.6, 0, 11 + (i % 2) * 0.6]);
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
          <RigidBody
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
          </RigidBody>
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
    if (p.y < gy - 3 || Math.hypot(p.x, p.z) > ISLAND_RADIUS + 4) {
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

      <RigidBody ref={ball} colliders={false} position={home} mass={0.35} linearDamping={0.35} angularDamping={0.6}>
        <BallCollider args={[BALL_R]} restitution={0.75} friction={0.6} />
        <group position={[0, -BALL_R, 0]}>
          <Football />
        </group>
      </RigidBody>
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
  const ct = at("contact");
  const start = trackPoint(GANTRY_T);
  const sTan = trackCurve.getTangentAt(GANTRY_T);
  const sRot = Math.atan2(sTan.x, sTan.z) + Math.PI / 2;

  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[pd[0], pd[1], pd[2] - 1]}>
        <Podium />
        <CuboidCollider args={[2.5, 0.6, 1]} position={[0, 0.6, 0]} />
      </RigidBody>

      {/* Mailbox and a waving Henil next to it */}
      <group position={ct}>
        <Mailbox />
        <Avatar position={[2, 0, 0.5]} rotation={[0, -0.4, 0]} wave />
        <Flag position={[-3, 0, -1]} color={C.red} />
      </group>

      <group position={[GRANDSTAND.pos[0], heightAt(GRANDSTAND.pos[0], GRANDSTAND.pos[1]), GRANDSTAND.pos[1]]}>
        <Grandstand cheer />
      </group>

      <group position={[start.x, start.y, start.z]} rotation={[0, sRot, 0]}>
        <Gantry lights={0} />
      </group>
    </>
  );
}

// Pit lane: a pit wall between the lane and the main straight, and one garage
// per project domain with that domain's projects on plinths inside.
function PitLane() {
  const pitY = heightAt((PIT.from + PIT.to) / 2, PIT.z);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(PIT.from + PIT.to) / 2, pitY + 0.025, PIT.z]} receiveShadow>
        <planeGeometry args={[PIT.to - PIT.from + 10, 6]} />
        <meshStandardMaterial color={C.asphalt} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} rotation={[-Math.PI / 2, 0, 0]} position={[(PIT.from + PIT.to) / 2, pitY + 0.03, PIT.z + side * 3]}>
          <planeGeometry args={[PIT.to - PIT.from + 10, 0.18]} />
          <meshStandardMaterial color={C.asphaltLine} />
        </mesh>
      ))}
      {[-18, 18].map((x) => (
        <RigidBody key={x} type="fixed" colliders={false} position={[x, pitY, PIT.z + 4.6]}>
          <PitWall />
          <CuboidCollider args={[2.6, 0.6, 0.5]} position={[0, 0.6, 0]} />
        </RigidBody>
      ))}

      {GARAGES.map((g) => {
        const list = projects.filter((p) => p.domain === g.domain);
        const span = Math.min(7, list.length * 1.8);
        return (
          <group key={g.domain} position={[g.x, pitY, PIT.garageZ - 1]}>
            <RigidBody type="fixed" colliders={false}>
              <Garage title={garageLabel[g.domain].toUpperCase()} />
              <CuboidCollider args={[4.5, 2.25, 0.15]} position={[0, 2.25, -3.35]} />
              <CuboidCollider args={[0.15, 2.25, 3.5]} position={[-4.35, 2.25, 0]} />
              <CuboidCollider args={[0.15, 2.25, 3.5]} position={[4.35, 2.25, 0]} />
            </RigidBody>
            {list.map((p, i) => {
              const x = list.length === 1 ? 0 : -span / 2 + (span / (list.length - 1)) * i;
              return (
                <group key={p.slug} position={[x, 0, -1.4]}>
                  <RigidBody type="fixed" colliders={false}>
                    <CylinderCollider args={[0.5, 0.5]} position={[0, 0.5, 0]} />
                  </RigidBody>
                  <Pedestal />
                  <group position={[0, 1.02, 0]} scale={0.8}>
                    <ProjectObject slug={p.slug} />
                  </group>
                </group>
              );
            })}
          </group>
        );
      })}
    </>
  );
}

// Each sector has its own scenery set beside the track.
const SCENES = { ahmedabad: AhmedabadSector, hyperlab: HyperlabSector, boston: BostonSector, waters: WatersSector };

// Painted road text that reacts to light (so it darkens at night).
const GROUND_TEXT = new THREE.MeshStandardMaterial({ color: "#f3f1ec", roughness: 0.8, transparent: true, opacity: 0.55 });

// Text lying flat on the road, running along the track and upright as seen
// from the camera (which looks from +X/+Z).
const TOWARD_CAMERA = new THREE.Vector3(1, 0, 1).normalize();
function groundTextRotation(tan: THREE.Vector3) {
  const x = tan.clone().setY(0).normalize();
  const z = new THREE.Vector3(0, 1, 0);
  let y = new THREE.Vector3().crossVectors(z, x);
  // Text "up" should point away from the camera so it reads the right way round.
  if (y.dot(TOWARD_CAMERA) > 0) {
    x.negate();
    y = new THREE.Vector3().crossVectors(z, x);
  }
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

// Collision boxes for each scenery set, in the set's local space: [centre, full size].
type Box = [[number, number, number], [number, number, number]];
const SCENE_BOXES: Record<keyof typeof SCENES, Box[]> = {
  ahmedabad: [
    [[-5.5, 4, -6.5], [15, 8, 5]],
    [[8, 0.45, -8.75], [10.4, 0.9, 0.5]],
    [[12.95, 0.45, -6], [0.5, 0.9, 6]],
    [[7.8, 1.5, -6], [3.2, 3, 3.2]],
    [[4.3, 1.7, -3.1], [0.3, 3.4, 0.3]],
    [[11.3, 1.7, -3.1], [0.3, 3.4, 0.3]],
    [[-6, 0.6, -1.9], [4.4, 1.2, 1.9]],
  ],
  hyperlab: [
    [[-7.6, 3.2, -6.5], [10.4, 6.4, 5]],
    [[6.4, 0.2, -5.1], [12.8, 0.4, 7.4]],
    [[6.4, 2.8, -8.45], [8.2, 5.6, 0.6]],
    [[-8.2, 0.4, -2.3], [2.8, 0.8, 1.6]],
    [[-1.2, 1.8, -2.4], [1.8, 3.6, 0.9]],
  ],
  boston: [
    [[-6.6, 4.9, -6.3], [12.6, 9.8, 5.4]],
    [[-11.35, 4.6, -3], [2.4, 9.1, 1.2]],
    [[-7.15, 4.6, -3], [2.4, 9.1, 1.2]],
    [[-2.95, 4.6, -3], [2.4, 9.1, 1.2]],
    [[-9.5, 0.7, -2.45], [1.6, 1.4, 2.3]],
    [[-5.3, 0.7, -2.45], [1.6, 1.4, 2.3]],
    [[-1.1, 0.7, -2.45], [1.6, 1.4, 2.3]],
    [[6.8, 3.65, -6.3], [12, 7.3, 5.4]],
    [[6.8, 3.3, -2.45], [6.4, 6.6, 2.3]],
    [[2.4, 0.5, -1.4], [1.8, 1, 0.7]],
  ],
  waters: [
    [[-5.3, 4.1, -6.2], [15.4, 8.2, 6.4]],
    [[6, 1, -3], [2.8, 2, 1.6]],
    [[10.3, 1.2, -5.4], [3.2, 2.4, 2.6]],
    [[-8.8, 0.4, -1.7], [6.6, 0.8, 1]],
  ],
};

function Sectors() {
  return (
    <>
      {SECTORS.map((s, i) => {
        const Scene = SCENES[s.id];
        const t = sectorT(i) - 0.045;
        const p = trackPoint(t);
        const q = groundTextRotation(trackCurve.getTangentAt(t));
        return (
          <group key={s.id}>
            <RigidBody type="fixed" colliders={false} position={[s.scene[0], heightAt(s.scene[0], s.scene[1]) - 0.15, s.scene[1]]} rotation={[0, s.sceneRot, 0]}>
              <Scene />
              {SCENE_BOXES[s.id].map(([c, size], i) => (
                <CuboidCollider key={i} args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={c} />
              ))}
            </RigidBody>
            {/* The place name is painted on the asphalt, like names on a grid slot. */}
            <Label
              position={[p.x, p.y + 0.06, p.z]}
              quaternion={q}
              fontSize={1.6}
              letterSpacing={0.08}
              material={GROUND_TEXT}
            >
              {s.place.toUpperCase()}
            </Label>
          </group>
        );
      })}
    </>
  );
}

function Mailbox() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[0.45, 0.9, 0.35]} position={[0, 0.9, 0]} />
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 1.1, 12]} />
        <meshStandardMaterial color={C.ink} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow>
        <boxGeometry args={[0.9, 0.6, 0.7]} />
        <meshStandardMaterial color={C.red} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.65, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.9, 20, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={C.red} roughness={0.4} />
      </mesh>
      <mesh position={[0.48, 1.55, 0.1]} castShadow>
        <boxGeometry args={[0.05, 0.45, 0.08]} />
        <meshStandardMaterial color={C.gold} roughness={0.4} />
      </mesh>
    </RigidBody>
  );
}

// Small signposts so the infield places explain themselves.
function Signposts() {
  return (
    <>
      {(
        [
          ["playbook", "TYRE WALL", "How I use AI", C.yellow, [0, 0, 4.5]],
          ["podium", "PODIUM", "Papers and patents", C.purple, [0, 0, 4.5]],
          ["contact", "MAILBOX", "Say hi", C.red, [-5, 0, 3]],
          ["cricket", "CRICKET", "Off the clock", C.green, [0, 0, 6]],
          ["football", "FOOTBALL", "Off the clock", C.blue, [-10, 0, 8]],
        ] as const
      ).map(([id, t, sub, c, off]) => {
        const p = at(id);
        return (
          <group key={id} position={[p[0] + off[0], heightAt(p[0] + off[0], p[2] + off[2]), p[2] + off[2]]} scale={0.7}>
            <Billboard title={t} subtitle={sub} accent={c} />
          </group>
        );
      })}
    </>
  );
}

// ------------------------------------------------------------ nature

function Nature() {
  const items = useMemo(() => {
    const r = rng(42);
    const out: { kind: "round" | "pine" | "palm" | "bush" | "rock"; p: V3; s: number; rot: number; seed: number }[] = [];
    const avoid = Object.values(zoneById).map((z) => [z.pos[0], z.pos[1], Math.max(z.size[0], z.size[1]) / 2 + 6]);
    avoid.push([0, 3, 14], [LETTERS.origin[0] + 5, LETTERS.origin[1], 9], [GRANDSTAND.pos[0], GRANDSTAND.pos[1], 10]);
    for (const sc of SECTORS) avoid.push([sc.scene[0], sc.scene[1], 17]);
    for (let x = PIT.from - 6; x <= PIT.to + 6; x += 6) avoid.push([x, PIT.garageZ, 8], [x, PIT.z, 6]);
    let tries = 0;
    while (out.length < 90 && tries++ < 4000) {
      const a = r() * Math.PI * 2;
      const rad = Math.sqrt(r()) * (ISLAND_RADIUS - 3);
      const x = Math.cos(a) * rad;
      const z = Math.sin(a) * rad;
      if (distToTrack(x, z) < TRACK_WIDTH / 2 + 4) continue;
      if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      const beach = rad > ISLAND_RADIUS - 10;
      const roll = r();
      const kind = beach ? (roll < 0.7 ? "palm" : "rock") : roll < 0.4 ? "round" : roll < 0.7 ? "pine" : roll < 0.88 ? "bush" : "rock";
      out.push({ kind, p: [x, heightAt(x, z), z], s: 0.85 + r() * 0.5, rot: r() * Math.PI * 2, seed: Math.floor(r() * 1000) });
    }
    return out;
  }, []);

  return (
    <>
      {items.map((it, i) => {
        const solid = it.kind === "round" || it.kind === "pine" || it.kind === "palm";
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
      <Sectors />
      <Signposts />
      <Letters />
      <Cones />
      <TyreWall />
      <FootballPitch />
      <Cricket />
      <Nature />
    </>
  );
}
