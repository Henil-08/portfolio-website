"use client";

// The waterfront along the south bay, in Concrete & Ink: a concrete promenade with
// an ink railing (paper top rail) on the sea side, the kit lamps (their paper cube
// glows after dark) and the district benches facing the water, all at the world's scale; the kit pier (concrete
// deck slabs on ink cap beams and piles, ink railings) you can drive out onto, with an
// orange bollard near its head; and kit launches bobbing in the bay. Instanced or merged per material, so it stays a
// handful of draw calls.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { SEA_FLOOR, SEA_Y, coastR } from "../layout";
import { PIER, PIER_I, PIER_LAMP, PROMENADE, PROM_LAMPS, PROM_W, frame } from "./layout";
import { heightAt } from "../terrain";
import { dayNight } from "../daynight";
import { C } from "../palette";
import { mat, unitBox } from "../models/props/shared";
import { KitModel } from "../kit/KitModel";
import { bake, model, part } from "../kit/shared";
import { lampModel } from "../kit/street";
import { BOAT, addPierBollard, addPierHead, addPierSegment, boatModel } from "../kit/water";
import { compose } from "../street/common";
import { WORLD_SCALE } from "../scale";
import { batch, Instances } from "../street/Instances";
import { benchParts } from "../districts/furniture";

// ------------------------------------------------------------ promenade

const STONE = C.concrete;
const STONE_EDGE = C.concreteDark;

function promenadeGeometry() {
  const pave: number[] = [];
  const edge: number[] = [];
  const quad = (out: number[], a: number[], b: number[], c: number[], d: number[]) => out.push(...a, ...b, ...c, ...b, ...d, ...c);
  const v = (x: number, z: number, lift: number) => [x, heightAt(x, z) + lift, z];
  for (let i = 0; i < PROMENADE.length - 1; i++) {
    const A = PROMENADE[i];
    const B = PROMENADE[i + 1];
    const fa = frame(i);
    const fb = frame(i + 1);
    const at = (p: number[], f: { nx: number; nz: number }, o: number, lift: number) => v(p[0] + f.nx * o, p[1] + f.nz * o, lift);
    const h = PROM_W / 2;
    // winding: inner edge (-h) then outer (+h); normals end up up for either side by the sign check below
    quad(pave, at(A, fa, -h, 0.05), at(A, fa, h, 0.05), at(B, fb, -h, 0.05), at(B, fb, h, 0.05));
    for (const [o0, o1] of [
      [-h - 0.3, -h],
      [h, h + 0.3],
    ])
      quad(edge, at(A, fa, o0, 0.09), at(A, fa, o1, 0.09), at(B, fb, o0, 0.09), at(B, fb, o1, 0.09));
  }
  const mk = (pos: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  };
  return { pave: mk(pave), edge: mk(edge) };
}

const POST_STEP = 5; // promenade samples between railing posts (~2 m)
/** The sea railing: a real 1.1 m railing (posts, a mid rail at 0.6 m, a paper top rail) at the world's scale. */
const RAIL = { h: 1.1 * WORLD_SCALE, mid: 0.6 * WORLD_SCALE, post: 0.08 * WORLD_SCALE };

function Promenade() {
  const g = useMemo(() => promenadeGeometry(), []);
  const parts = useMemo(() => {
    const posts = batch();
    const rails = batch();
    const tops = batch();
    const benches = batch();
    const off = PROM_W / 2 + 0.15;
    let prev: THREE.Vector3 | null = null;
    for (let i = 0; i < PROMENADE.length; i += POST_STEP) {
      // leave a gap where the pier starts
      if (Math.abs(i - PIER_I) < POST_STEP * 1.5) {
        prev = null;
        continue;
      }
      const f = frame(i);
      const x = PROMENADE[i][0] + f.nx * off;
      const z = PROMENADE[i][1] + f.nz * off;
      const y = heightAt(x, z) + 0.09;
      posts.m.push(compose(x, y + RAIL.h / 2, z, 0, RAIL.post, RAIL.h, RAIL.post));
      const here = new THREE.Vector3(x, y, z);
      if (prev) {
        const mid = prev.clone().add(here).multiplyScalar(0.5);
        const len = prev.distanceTo(here);
        const yaw = Math.atan2(-(here.z - prev.z), here.x - prev.x);
        rails.m.push(compose(mid.x, mid.y + RAIL.mid, mid.z, yaw, len, 0.035, 0.035));
        tops.m.push(compose(mid.x, mid.y + RAIL.h, mid.z, yaw, len + 0.06, 0.05, 0.1));
      }
      prev = here;
    }
    // benches on the land side of the walk, facing the sea
    for (let i = 20; i < PROMENADE.length - 10; i += 55) {
      if (Math.abs(i - PIER_I) < 20) continue;
      const f = frame(i);
      const x = PROMENADE[i][0] - f.nx * (PROM_W / 2 - 0.45);
      const z = PROMENADE[i][1] - f.nz * (PROM_W / 2 - 0.45);
      const y = heightAt(x, z) + 0.05;
      const yaw = Math.atan2(f.nx, f.nz); // local +z toward the sea, the back toward -z
      benches.m.push(compose(x, y, z, yaw));
    }
    return { posts, rails, tops, benches };
  }, []);
  return (
    <>
      <mesh geometry={g.pave} material={mat(STONE, { r: 0.9, side: THREE.DoubleSide })} receiveShadow />
      <mesh geometry={g.edge} material={mat(STONE_EDGE, { r: 0.85, side: THREE.DoubleSide })} receiveShadow />
      <Instances geometry={unitBox()} material={mat(C.ink, { r: 0.6 })} batch={parts.posts} />
      <Instances geometry={unitBox()} material={mat(C.ink, { r: 0.6 })} batch={parts.rails} />
      <Instances geometry={unitBox()} material={mat(C.paper, { r: 0.8 })} batch={parts.tops} />
      {benchParts().map((b, i) => (
        <Instances key={i} geometry={b.geometry} material={b.material} batch={parts.benches} />
      ))}
    </>
  );
}

// ------------------------------------------------------------ lamps

/** Owned here, so it is safe to animate: the kit lamp's paper cube, dim by day, glowing at night. */
const globeMat = new THREE.MeshStandardMaterial({ color: C.paper, emissive: new THREE.Color("#fff3dc"), emissiveIntensity: 0.15, roughness: 0.5, toneMapped: false, flatShading: true });

/** The promenade lamps and the one at the pier's end: the kit street lamp. */
function Lamps() {
  const parts = useMemo(() => {
    const at = batch();
    const k = WORLD_SCALE;
    for (const [x, z] of PROM_LAMPS) at.m.push(compose(x, heightAt(x, z) + 0.05, z, 0, k, k, k));
    at.m.push(compose(PIER_LAMP[0], PIER.y, PIER_LAMP[1], 0, k, k, k));
    return { at, post: bake(lampModel(), { skip: ["glow"] }), head: part(lampModel(), "glow")! };
  }, []);
  useFrame(() => {
    globeMat.emissiveIntensity = 0.15 + dayNight.night * 2.8;
  });
  return (
    <>
      <Instances geometry={parts.post} material={mat("#ffffff", { r: 0.8, vc: true, flat: true })} batch={parts.at} />
      <Instances geometry={parts.head} material={globeMat} batch={parts.at} shadow={false} />
    </>
  );
}

// ------------------------------------------------------------ pier

/** Pile foot below the sea floor; the kit pier is built up from here to the deck. */
const PILE_FOOT = SEA_FLOOR - 0.2;
const SEG = PIER.len / 4;

/**
 * The kit pier (the approved concept) along local +x, its deck top at PIER.y, an orange bollard
 * near the head: built in real metres (the world's length and width over WORLD_SCALE) and drawn at
 * the world's scale, so its rails, caps and piles are their real size.
 */
const P = 1 / WORLD_SCALE;
const pierModel = () =>
  model("world-pier-v2", (k) => {
    const o = { h: (PIER.y - PILE_FOOT) * P, w: PIER.w * P, seg: SEG * P };
    for (let i = 0; i < 4; i++) addPierSegment(k, i * o.seg, o);
    addPierHead(k, (PIER.len - 0.1) * P, o);
    addPierBollard(k, (PIER.len - 1.4) * P, (PIER.w / 2 - 0.5) * P, o.h);
  });
/** The pier's railing height (a real 1.03 m rail). */
const PIER_RAIL = 1.03 * WORLD_SCALE;

function Pier() {
  const yaw = Math.atan2(-PIER.dz, PIER.dx); // local +x along the pier
  const mid = { x: PIER.x + PIER.dx * (PIER.len / 2), z: PIER.z + PIER.dz * (PIER.len / 2) };
  return (
    <>
      <KitModel model={pierModel()} position={[PIER.x, PILE_FOOT, PIER.z]} rotation={[0, yaw, 0]} scale={WORLD_SCALE} />
      <RigidBody type="fixed" colliders={false} position={[mid.x, PIER.y - 0.05, mid.z]} rotation={[0, yaw, 0]}>
        <CuboidCollider args={[PIER.len / 2, 0.08, PIER.w / 2]} friction={1} />
        <CuboidCollider args={[PIER.len / 2, PIER_RAIL / 2, 0.06]} position={[0, 0.05 + PIER_RAIL / 2, PIER.w / 2 - 0.1]} />
        <CuboidCollider args={[PIER.len / 2, PIER_RAIL / 2, 0.06]} position={[0, 0.05 + PIER_RAIL / 2, -(PIER.w / 2 - 0.1)]} />
        <CuboidCollider args={[0.06, PIER_RAIL / 2, PIER.w / 2]} position={[PIER.len / 2, 0.05 + PIER_RAIL / 2, 0]} />
        {/* a gentle ramp up from the promenade */}
        <CuboidCollider args={[1.4, 0.05, PIER.w / 2]} position={[-PIER.len / 2 - 1.1, -0.3, 0]} rotation={[0, 0, 0.24]} />
      </RigidBody>
    </>
  );
}

// ------------------------------------------------------------ boats

type Boat = { x: number; z: number; yaw: number; s: number; phase: number };

/**
 * Three kit launches (the approved boat concept, a real 6.6 m launch, at the world's scale): two
 * moored either side of the pier, a hand's width off it, one out in the bay.
 */
const BOATS: Boat[] = (() => {
  const out: Boat[] = [];
  const sx = -PIER.dz;
  const sz = PIER.dx;
  const s = WORLD_SCALE;
  const off = PIER.w / 2 + (BOAT.beam / 2) * s + 0.35;
  out.push({ x: PIER.x + PIER.dx * 9 + sx * off, z: PIER.z + PIER.dz * 9 + sz * off, yaw: Math.atan2(-PIER.dz, PIER.dx), s, phase: 0.6 });
  out.push({ x: PIER.x + PIER.dx * 14 - sx * off, z: PIER.z + PIER.dz * 14 - sz * off, yaw: Math.atan2(-PIER.dz, PIER.dx) + 0.2, s, phase: 2.3 });
  const a = (70 * Math.PI) / 180;
  const r = coastR(a) + 16;
  out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, yaw: 1.2, s, phase: 4.1 });
  return out;
})();

function BoatModel({ b }: { b: Boat }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime + b.phase;
    g.position.y = SEA_Y - BOAT.waterline * b.s + Math.sin(t * 1.1) * 0.05;
    g.rotation.z = Math.sin(t * 0.9) * 0.04;
    g.rotation.x = Math.sin(t * 0.7 + 1) * 0.03;
  });
  return (
    <group position={[b.x, 0, b.z]} rotation={[0, b.yaw, 0]}>
      <group ref={ref} scale={b.s}>
        <KitModel model={boatModel()} />
      </group>
    </group>
  );
}

function Boats() {
  return (
    <>
      {BOATS.map((b, i) => (
        <BoatModel key={i} b={b} />
      ))}
    </>
  );
}

// ------------------------------------------------------------ root

export default function Waterfront() {
  return (
    <group>
      <Promenade />
      <Lamps />
      <Pier />
      <Boats />
    </group>
  );
}
