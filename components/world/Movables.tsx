"use client";

// Things the car can knock about: tyre stacks, wall ends, rocks, benches, crates.
// Each piece is a light dynamic body that sleeps where it was placed until
// something hits it, drawn with one instanced mesh per visual part. A piece that
// has been moved goes back to its place once the car is well away from both its
// place and where it ended up, so the corner is tidy again when you come back
// (and anything knocked into the sea comes back too).
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import * as THREE from "three";
import { carState } from "./carState";
import { SEA_Y } from "./layout";

/** A visual part, drawn at the body's transform times `local` (and the item's scale). */
export type MovablePart = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  local?: THREE.Matrix4;
  /** one colour per item */
  colors?: THREE.Color[];
  shadow?: boolean;
};

/** One piece: where its body's centre rests, its yaw (and optional tilt) and size. */
export type MovableItem = { x: number; y: number; z: number; yaw: number; s?: number; tilt?: [number, number] };

export type MovableShape =
  | { type: "cylinder"; halfHeight: number; radius: number }
  | { type: "box"; hx: number; hy: number; hz: number; round?: number }
  | { type: "ball"; radius: number };

export type MovableKind = {
  items: MovableItem[];
  parts: MovablePart[];
  /** collider at scale 1 (scaled by each item's `s`) */
  shape: MovableShape;
  /** mass at scale 1 (scales with volume); the car is 2.5 */
  mass: number;
  friction?: number;
  restitution?: number;
};

/** Metres the car must be from a moved piece (and its home) before it goes back. */
const RESET_DIST = 45;
const CHECK_EVERY = 0.5; // seconds

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

const registry = new Set<{ moved: boolean[] }>();

/** Flag instance matrices for upload (kept out of the hook for the React Compiler). */
function markDirty(list: (THREE.InstancedMesh | null)[]) {
  for (const mesh of list) if (mesh) mesh.instanceMatrix.needsUpdate = true;
}

function homeQuat(it: MovableItem) {
  _e.set(it.tilt?.[0] ?? 0, it.yaw, it.tilt?.[1] ?? 0, "YXZ");
  return new THREE.Quaternion().setFromEuler(_e);
}

export function Movables({ kind }: { kind: MovableKind }) {
  const { world, rapier } = useRapier();
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const homes = useMemo(() => kind.items.map((it) => ({ p: new THREE.Vector3(it.x, it.y, it.z), q: homeQuat(it), s: it.s ?? 1 })), [kind]);
  const sim = useRef<{ bodies: ReturnType<typeof world.createRigidBody>[]; moved: boolean[]; dirty: boolean[]; clock: number } | null>(null);

  useEffect(() => {
    const bodies = homes.map((h) => {
      const b = world.createRigidBody(
        rapier.RigidBodyDesc.dynamic()
          .setTranslation(h.p.x, h.p.y, h.p.z)
          .setRotation({ x: h.q.x, y: h.q.y, z: h.q.z, w: h.q.w })
          .setLinearDamping(0.35)
          .setAngularDamping(0.6)
          .setCanSleep(true),
      );
      const sh = kind.shape;
      const k = h.s;
      const desc =
        sh.type === "cylinder"
          ? rapier.ColliderDesc.cylinder(sh.halfHeight * k, sh.radius * k)
          : sh.type === "ball"
            ? rapier.ColliderDesc.ball(sh.radius * k)
            : sh.round
              ? rapier.ColliderDesc.roundCuboid((sh.hx - sh.round) * k, (sh.hy - sh.round) * k, (sh.hz - sh.round) * k, sh.round * k)
              : rapier.ColliderDesc.cuboid(sh.hx * k, sh.hy * k, sh.hz * k);
      desc.setMass(kind.mass * k * k * k).setFriction(kind.friction ?? 0.7).setRestitution(kind.restitution ?? 0.15);
      world.createCollider(desc, b);
      b.sleep();
      return b;
    });
    sim.current = { bodies, moved: bodies.map(() => false), dirty: bodies.map(() => false), clock: 0 };
    // Dev and headless checks: window.__movables() counts pieces out of place.
    const sims = registry;
    const me = sim.current;
    sims.add(me);
    (window as unknown as { __movables: () => number }).__movables = () => [...sims].reduce((n, x) => n + x.moved.filter(Boolean).length, 0);
    return () => {
      registry.delete(me);
      sim.current = null;
      for (const b of bodies) if (world.getRigidBody(b.handle)) world.removeRigidBody(b);
    };
  }, [world, rapier, kind, homes]);

  // Rest matrices before the first frame.
  useLayoutEffect(() => {
    homes.forEach((h, i) => {
      _m.compose(h.p, h.q, _s.setScalar(h.s));
      kind.parts.forEach((part, j) => {
        const mesh = meshes.current[j];
        if (!mesh) return;
        mesh.setMatrixAt(i, part.local ? _m.clone().multiply(part.local) : _m);
        if (part.colors) mesh.setColorAt(i, part.colors[i]);
      });
    });
    for (const mesh of meshes.current) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [homes, kind]);

  useFrame((_, dt) => {
    const st = sim.current;
    if (!st) return;
    let changed = false;
    st.clock += dt;
    const check = st.clock > CHECK_EVERY;
    if (check) st.clock = 0;
    const car = carState.pos;
    for (let i = 0; i < st.bodies.length; i++) {
      const b = st.bodies[i];
      const h = homes[i];
      if (!b.isSleeping() || st.dirty[i]) {
        st.dirty[i] = false;
        const t = b.translation();
        const r = b.rotation();
        _p.set(t.x, t.y, t.z);
        _q.set(r.x, r.y, r.z, r.w);
        if (!st.moved[i] && (_p.distanceToSquared(h.p) > 0.0025 || Math.abs(_q.dot(h.q)) < 0.9995)) st.moved[i] = true;
        _m.compose(_p, _q, _s.setScalar(h.s));
        kind.parts.forEach((part, j) => meshes.current[j]?.setMatrixAt(i, part.local ? _m.clone().multiply(part.local) : _m));
        changed = true;
      }
      if (check && st.moved[i]) {
        const t = b.translation();
        const sunk = t.y < SEA_Y - 2;
        const away = Math.hypot(car.x - h.p.x, car.z - h.p.z) > RESET_DIST && Math.hypot(car.x - t.x, car.z - t.z) > RESET_DIST;
        if (away || (sunk && Math.hypot(car.x - h.p.x, car.z - h.p.z) > 12)) {
          b.setTranslation({ x: h.p.x, y: h.p.y, z: h.p.z }, false);
          b.setRotation({ x: h.q.x, y: h.q.y, z: h.q.z, w: h.q.w }, false);
          b.setLinvel({ x: 0, y: 0, z: 0 }, false);
          b.setAngvel({ x: 0, y: 0, z: 0 }, false);
          b.sleep();
          st.moved[i] = false;
          st.dirty[i] = true;
        }
      }
    }
    if (changed) markDirty(meshes.current);
  });

  if (!kind.items.length) return null;
  return (
    <>
      {kind.parts.map((part, j) => (
        <instancedMesh
          key={j}
          ref={(el) => {
            meshes.current[j] = el;
          }}
          args={[part.geometry, part.material, kind.items.length]}
          castShadow={part.shadow ?? true}
          receiveShadow
          frustumCulled={false}
        />
      ))}
    </>
  );
}
