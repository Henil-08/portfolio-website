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
  Chip,
  Cone,
  CricketPitch,
  Flag,
  Football,
  Gantry,
  Garage,
  Goal,
  Grandstand,
  Headset,
  Lab,
  Laptop,
  Letter,
  Pedestal,
  Phone,
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
import { Avatar } from "./models/Avatar";
import { C } from "./palette";
import {
  GRANDSTAND,
  ISLAND_RADIUS,
  LETTERS,
  TRACK_WIDTH,
  trackCurve,
  trackPoint,
  zoneById,
  type ZoneId,
} from "./layout";
import { cheer, pop } from "./sound";
import { toast } from "./store";

type V3 = [number, number, number];

function at(id: ZoneId): V3 {
  const z = zoneById[id];
  return [z.pos[0], 0, z.pos[1]];
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
  const colors = [C.red, C.yellow, C.blue, C.teal, C.purple];
  return (
    <>
      {LETTERS.chars.map((ch, i) => (
        <RigidBody
          key={ch + i}
          colliders={false}
          position={[LETTERS.origin[0] + i * LETTERS.gap, 0.8, LETTERS.origin[1]]}
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
    <RigidBody colliders={false} position={[p[0], 0.27, p[2]]} mass={0.25} linearDamping={0.4} angularDamping={0.4}>
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
  const [x, , z] = at("playbook");
  const compounds: Compound[] = ["soft", "medium", "hard", "inter"];
  return (
    <>
      {compounds.map((c, i) =>
        [0, 1, 2, 3].map((k) => (
          <RigidBody
            key={c + k}
            colliders={false}
            position={[x - 3.3 + i * 2.2, TYRE_H / 2 + k * (TYRE_H + 0.005), z - 1]}
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
  const [x, , z] = at("football");
  const ball = useRef<RapierRigidBody>(null);
  const scored = useRef(0);
  const home: V3 = [x, BALL_R + 0.05, z + 2];
  const goalZ = z - 6;

  useFrame(({ clock }) => {
    const b = ball.current;
    if (!b) return;
    const p = b.translation();
    // Goal: ball inside the mouth volume.
    if (Math.abs(p.x - x) < 1.9 && p.z < goalZ + 0.6 && p.z > goalZ - 0.9 && p.y < 1.8) {
      if (clock.elapsedTime - scored.current > 3) {
        scored.current = clock.elapsedTime;
        toast("GOAL!", "yellow");
        cheer();
        setTimeout(() => {
          b.setTranslation({ x: home[0], y: home[1] + 1, z: home[2] }, true);
          b.setLinvel({ x: 0, y: 0, z: 0 }, true);
          b.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }, 1500);
      }
    }
    if (p.y < -3 || Math.hypot(p.x, p.z) > ISLAND_RADIUS + 4) {
      b.setTranslation({ x: home[0], y: home[1] + 1, z: home[2] }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  });

  return (
    <>
      {/* Pitch paint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, z]} receiveShadow>
        <planeGeometry args={[16, 13]} />
        <meshStandardMaterial color={C.grassDark} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, z]}>
        <ringGeometry args={[2, 2.2, 40]} />
        <meshStandardMaterial color={C.white} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, z + 6.4]}>
        <planeGeometry args={[16, 0.2]} />
        <meshStandardMaterial color={C.white} />
      </mesh>

      <RigidBody type="fixed" colliders={false} position={[x, 0, goalZ]}>
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
  const [x, , z] = at("cricket");
  const stumps = useRef<(RapierRigidBody | null)[]>([]);
  const out = useRef(false);
  const ends = [-8.8, 8.8];

  const reset = () => {
    stumps.current.forEach((b, i) => {
      if (!b) return;
      const end = Math.floor(i / 5);
      const k = i % 5;
      const sx = x + ends[end];
      const pos =
        k < 3
          ? { x: sx, y: STUMP_H / 2, z: z + (k - 1) * STUMP_GAP }
          : { x: sx, y: STUMP_H + 0.04, z: z + (k === 3 ? -0.5 : 0.5) * STUMP_GAP };
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
      <group position={[x, 0, z]} rotation={[0, Math.PI / 2, 0]}>
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
              position={[x + ex, STUMP_H / 2, z + k * STUMP_GAP]}
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
              position={[x + ex, STUMP_H + 0.04, z + k * STUMP_GAP]}
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
  const g = at("garage");
  const l = at("sidequest");
  const w = at("work");
  const pd = at("podium");
  const ct = at("contact");
  const gantry = trackPoint(0.98);
  const gTan = trackCurve.getTangentAt(0.98);
  const gRot = Math.atan2(gTan.x, gTan.z) + Math.PI / 2;

  return (
    <>
      {/* Garage faces the track (+X) */}
      <RigidBody type="fixed" colliders={false} position={[g[0] - 2, 0, g[2]]} rotation={[0, Math.PI / 2, 0]}>
        <Garage />
        <CuboidCollider args={[4.5, 2.25, 0.15]} position={[0, 2.25, -3.35]} />
        <CuboidCollider args={[0.15, 2.25, 3.5]} position={[-4.35, 2.25, 0]} />
        <CuboidCollider args={[0.15, 2.25, 3.5]} position={[4.35, 2.25, 0]} />
      </RigidBody>
      <Showcase pos={[g[0] + 4, 0, g[2]]} />

      {/* Side quest lab faces back toward the track (-X) */}
      <RigidBody type="fixed" colliders={false} position={[l[0] + 2, 0, l[2]]} rotation={[0, -Math.PI / 2, 0]}>
        <Lab />
        <CuboidCollider args={[3.5, 2.5, 2.5]} position={[0, 2.5, -0.5]} />
      </RigidBody>

      <RigidBody type="fixed" colliders={false} position={[w[0], 0, w[2] + 1]}>
        <PitWall />
        <CuboidCollider args={[2.5, 0.8, 0.6]} position={[0, 0.8, 0]} />
      </RigidBody>

      <RigidBody type="fixed" colliders={false} position={[pd[0], 0, pd[2] - 1]}>
        <Podium />
        <CuboidCollider args={[2.5, 0.6, 1]} position={[0, 0.6, 0]} />
      </RigidBody>

      {/* Mailbox and a waving Henil next to it */}
      <group position={ct}>
        <Mailbox />
        <Avatar position={[2, 0, 0.5]} rotation={[0, -0.4, 0]} wave />
        <Flag position={[-3, 0, -1]} color={C.red} />
      </group>

      <group position={[GRANDSTAND.pos[0], 0, GRANDSTAND.pos[1]]}>
        <Grandstand cheer />
      </group>

      <group position={[gantry.x, 0, gantry.z]} rotation={[0, gRot, 0]}>
        <Gantry lights={0} />
      </group>
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
        <meshStandardMaterial color={C.red} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.65, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.9, 20, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={C.red} roughness={0.5} />
      </mesh>
      <mesh position={[0.48, 1.55, 0.1]} castShadow>
        <boxGeometry args={[0.05, 0.45, 0.08]} />
        <meshStandardMaterial color={C.yellow} roughness={0.5} />
      </mesh>
    </RigidBody>
  );
}

// Gadgets on pedestals in front of the garage.
function Showcase({ pos }: { pos: V3 }) {
  const items = [Phone, Laptop, Headset, Chip];
  return (
    <group position={pos}>
      {items.map((Item, i) => (
        <group key={i} position={[0, 0, -4.5 + i * 3]}>
          <RigidBody type="fixed" colliders={false}>
            <CylinderCollider args={[0.5, 0.55]} position={[0, 0.5, 0]} />
          </RigidBody>
          <Pedestal />
          <Spin>
            <Item />
          </Spin>
        </group>
      ))}
    </group>
  );
}

function Spin({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.6;
  });
  return (
    <group ref={g} position={[0, 1.05, 0]}>
      {children}
    </group>
  );
}

// ------------------------------------------------------------ story boards

function StoryBoards() {
  const boards = [
    { id: "story-1" as const, title: "2021", sub: "The solar car", color: C.red },
    { id: "story-2" as const, title: "2022", sub: "Shark Tank", color: C.orange },
    { id: "story-3" as const, title: "2023", sub: "Boston", color: C.blue },
    { id: "story-4" as const, title: "NOW", sub: "Waters", color: C.green },
  ];
  return (
    <>
      {boards.map((b, i) => {
        const z = zoneById[b.id];
        const tan = trackCurve.getTangentAt([0.06, 0.31, 0.56, 0.8][i]);
        const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
        // Put the board on whichever side of the track is closer to the camera (+Z).
        const side = n.z > 0 ? 1 : -1;
        const p = new THREE.Vector3(z.pos[0], 0, z.pos[1]).addScaledVector(n, side * (TRACK_WIDTH / 2 + 3));
        return (
          <RigidBody key={b.id} type="fixed" colliders={false} position={[p.x, 0, p.z]}>
            <Billboard title={b.title} subtitle={b.sub} accent={b.color} index={i + 1} />
            <CylinderCollider args={[0.65, 0.14]} position={[-1.15, 0.65, 0]} />
            <CylinderCollider args={[0.65, 0.14]} position={[1.15, 0.65, 0]} />
          </RigidBody>
        );
      })}
      {/* Zone signposts for the places off the track */}
      {(
        [
          ["garage", "GARAGE", "Projects", C.red, [6, 0, 7]],
          ["sidequest", "SIDE QUEST", "AI for chips", C.teal, [-8, 0, 7]],
          ["playbook", "TYRE WALL", "How I use AI", C.yellow, [0, 0, 4]],
          ["podium", "PODIUM", "Papers", C.purple, [0, 0, 4]],
          ["work", "PIT WALL", "Experience", C.ink, [6, 0, 2]],
          ["contact", "MAILBOX", "Say hi", C.red, [-5, 0, 3]],
        ] as const
      ).map(([id, t, s, c, off]) => {
        const p = at(id);
        return (
          <group key={id} position={[p[0] + off[0], 0, p[2] + off[2]]} scale={0.75}>
            <Billboard title={t} subtitle={s} accent={c} />
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
      out.push({ kind, p: [x, 0, z], s: 0.85 + r() * 0.5, rot: r() * Math.PI * 2, seed: Math.floor(r() * 1000) });
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
      <StoryBoards />
      <Letters />
      <Cones />
      <TyreWall />
      <FootballPitch />
      <Cricket />
      <Nature />
    </>
  );
}
