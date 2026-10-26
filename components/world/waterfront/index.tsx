"use client";

// The waterfront along the south bay, in Concrete & Ink: a concrete promenade with
// an ink railing (paper top rail) on the sea side, lamps with a paper light box that
// glows after dark and the district benches facing the water; a concrete pier on
// graphite piles you can drive out onto, with one orange marker at its head; and
// faceted boats bobbing in the bay. Instanced or merged per material, so it stays a
// handful of draw calls.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import { SEA_FLOOR, SEA_Y, coastR } from "../layout";
import { PIER, PIER_I, PIER_LAMP, PROMENADE, PROM_LAMPS, PROM_W, frame } from "./layout";
import { heightAt } from "../terrain";
import { dayNight } from "../daynight";
import { C } from "../palette";
import { geo, mat, unitBox } from "../models/props/shared";
import { compose } from "../street/common";
import { PROP_SCALE } from "../models/props/kit";
import { batch, Instances } from "../street/Instances";
import { benchGeo } from "../districts/furniture";

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
      posts.m.push(compose(x, y + 0.5, z, 0, 0.08, 1, 0.08));
      const here = new THREE.Vector3(x, y, z);
      if (prev) {
        const mid = prev.clone().add(here).multiplyScalar(0.5);
        const len = prev.distanceTo(here);
        const yaw = Math.atan2(-(here.z - prev.z), here.x - prev.x);
        rails.m.push(compose(mid.x, mid.y + 0.55, mid.z, yaw, len, 0.05, 0.05));
        tops.m.push(compose(mid.x, mid.y + 1.0, mid.z, yaw, len + 0.08, 0.07, 0.14));
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
      const k = 0.68 * PROP_SCALE;
      benches.m.push(compose(x, y + 0.78 * k, z, yaw, k, k, k));
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
      <Instances geometry={benchGeo()} material={mat("#ffffff", { r: 0.8, vc: true })} batch={parts.benches} />
    </>
  );
}

// ------------------------------------------------------------ lamps

const LAMP_H = 3.4;
/** Owned here, so it is safe to animate: a paper box, dim by day, glowing at night. */
const globeMat = new THREE.MeshStandardMaterial({ color: C.paper, emissive: new THREE.Color("#fff3dc"), emissiveIntensity: 0.15, roughness: 0.5, toneMapped: false });

function Lamps() {
  const parts = useMemo(() => {
    // a concrete foot, a square ink pole, a paper light box under a thin ink cap
    const feet = batch();
    const poles = batch();
    const globes = batch();
    const lamp = (x: number, y: number, z: number) => {
      feet.m.push(compose(x, y + 0.12, z, 0, 0.34, 0.24, 0.34));
      poles.m.push(compose(x, y + LAMP_H / 2, z, 0, 0.1, LAMP_H, 0.1));
      poles.m.push(compose(x, y + LAMP_H + 0.4, z, 0, 0.36, 0.05, 0.36));
      globes.m.push(compose(x, y + LAMP_H + 0.2, z, 0, 0.28, 0.34, 0.28));
    };
    for (const [x, z] of PROM_LAMPS) lamp(x, heightAt(x, z) + 0.05, z);
    // and one at the end of the pier
    lamp(PIER_LAMP[0], PIER.y, PIER_LAMP[1]);
    return { feet, poles, globes };
  }, []);
  useFrame(() => {
    globeMat.emissiveIntensity = 0.15 + dayNight.night * 2.8;
  });
  return (
    <>
      <Instances geometry={unitBox()} material={mat(C.concreteDark, { r: 0.9 })} batch={parts.feet} />
      <Instances geometry={unitBox()} material={mat(C.ink, { r: 0.6 })} batch={parts.poles} />
      <Instances geometry={unitBox()} material={globeMat} batch={parts.globes} shadow={false} />
    </>
  );
}

// ------------------------------------------------------------ pier

function Pier() {
  const parts = useMemo(() => {
    const planks = batch();
    const piles = batch();
    const rails = batch();
    const tops = batch();
    const marker = batch();
    const yaw = Math.atan2(-PIER.dz, PIER.dx); // local +x along the pier
    // precast concrete deck slabs with a dark joint between them
    const SLAB = 2;
    for (let k = 0; k < PIER.len / SLAB; k++) {
      const d = SLAB / 2 + k * SLAB;
      const x = PIER.x + PIER.dx * d;
      const z = PIER.z + PIER.dz * d;
      planks.m.push(compose(x, PIER.y, z, yaw, SLAB - 0.06, 0.14, PIER.w));
      planks.c.push(new THREE.Color(k % 2 ? C.concrete : "#cfccc3"));
    }
    const sx = -PIER.dz;
    const sz = PIER.dx;
    for (let d = 1; d <= PIER.len; d += 3) {
      for (const s of [-1, 1]) {
        const x = PIER.x + PIER.dx * d + sx * s * (PIER.w / 2 - 0.1);
        const z = PIER.z + PIER.dz * d + sz * s * (PIER.w / 2 - 0.1);
        const bottom = SEA_FLOOR - 0.2;
        piles.m.push(compose(x, (PIER.y + bottom) / 2, z, yaw, 0.26, PIER.y - bottom, 0.26));
        rails.m.push(compose(x, PIER.y + 0.5, z, yaw, 0.08, 1, 0.08));
      }
    }
    for (const s of [-1, 1]) {
      const cx = PIER.x + PIER.dx * (PIER.len / 2 + 0.5) + sx * s * (PIER.w / 2 - 0.1);
      const cz = PIER.z + PIER.dz * (PIER.len / 2 + 0.5) + sz * s * (PIER.w / 2 - 0.1);
      tops.m.push(compose(cx, PIER.y + 1.0, cz, yaw, PIER.len - 1, 0.07, 0.14));
      rails.m.push(compose(cx, PIER.y + 0.55, cz, yaw, PIER.len - 1, 0.05, 0.05));
    }
    // the pier head: an ink rail across the end with one orange marker board on it
    const hx = PIER.x + PIER.dx * (PIER.len - 0.1);
    const hz = PIER.z + PIER.dz * (PIER.len - 0.1);
    tops.m.push(compose(hx, PIER.y + 1.0, hz, yaw, 0.14, 0.07, PIER.w - 0.1));
    rails.m.push(compose(hx, PIER.y + 0.55, hz, yaw, 0.05, 0.05, PIER.w - 0.1));
    marker.m.push(compose(hx + PIER.dx * 0.06, PIER.y + 0.78, hz + PIER.dz * 0.06, yaw, 0.04, 0.34, 0.7));
    return { planks, piles, rails, tops, marker, yaw };
  }, []);
  const mid = { x: PIER.x + PIER.dx * (PIER.len / 2), z: PIER.z + PIER.dz * (PIER.len / 2) };
  return (
    <>
      <Instances geometry={unitBox()} material={mat("#ffffff", { r: 0.9 })} batch={parts.planks} />
      <Instances geometry={unitBox()} material={mat(C.charcoal, { r: 0.8 })} batch={parts.piles} />
      <Instances geometry={unitBox()} material={mat(C.ink, { r: 0.6 })} batch={parts.rails} />
      <Instances geometry={unitBox()} material={mat(C.paper, { r: 0.8 })} batch={parts.tops} />
      <Instances geometry={unitBox()} material={mat(C.red, { r: 0.6 })} batch={parts.marker} />
      <RigidBody type="fixed" colliders={false} position={[mid.x, PIER.y - 0.05, mid.z]} rotation={[0, parts.yaw, 0]}>
        <CuboidCollider args={[PIER.len / 2, 0.08, PIER.w / 2]} friction={1} />
        <CuboidCollider args={[PIER.len / 2, 0.5, 0.06]} position={[0, 0.55, PIER.w / 2 - 0.1]} />
        <CuboidCollider args={[PIER.len / 2, 0.5, 0.06]} position={[0, 0.55, -(PIER.w / 2 - 0.1)]} />
        <CuboidCollider args={[0.06, 0.5, PIER.w / 2]} position={[PIER.len / 2, 0.55, 0]} />
        {/* a gentle ramp up from the promenade */}
        <CuboidCollider args={[1.4, 0.05, PIER.w / 2]} position={[-PIER.len / 2 - 1.1, -0.3, 0]} rotation={[0, 0, 0.24]} />
      </RigidBody>
    </>
  );
}

// ------------------------------------------------------------ boats

type Boat = { x: number; z: number; yaw: number; hull: string; top: string; sail: boolean; s: number; phase: number };

const BOATS: Boat[] = (() => {
  const out: Boat[] = [];
  const sx = -PIER.dz;
  const sz = PIER.dx;
  out.push({ x: PIER.x + PIER.dx * 9 + sx * 3.4, z: PIER.z + PIER.dz * 9 + sz * 3.4, yaw: Math.atan2(-PIER.dz, PIER.dx), hull: C.paper, top: C.ink, sail: false, s: 1, phase: 0.6 });
  out.push({ x: PIER.x + PIER.dx * 14 - sx * 3.6, z: PIER.z + PIER.dz * 14 - sz * 3.6, yaw: Math.atan2(-PIER.dz, PIER.dx) + 0.2, hull: C.ink, top: C.paper, sail: true, s: 1.1, phase: 2.3 });
  const a = (70 * Math.PI) / 180;
  const r = coastR(a) + 16;
  out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, yaw: 1.2, hull: C.charcoal, top: C.paper, sail: true, s: 1.4, phase: 4.1 });
  return out;
})();

/** A hard-chined hull: the deck outline with a pointed bow over a narrower flat keel, flat shaded. */
const hullGeo = () =>
  geo("boat-hull-ci", () => {
    const deck: [number, number][] = [[-1.7, 0.68], [-0.4, 0.78], [0.8, 0.7], [1.95, 0]];
    const keel: [number, number][] = [[-1.55, 0.42], [0.5, 0.42], [1.45, 0]];
    const pts: THREE.Vector3[] = [];
    for (const [x, z] of deck) pts.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 0, -z));
    for (const [x, z] of keel) pts.push(new THREE.Vector3(x, -0.5, z), new THREE.Vector3(x, -0.5, -z));
    const g = new ConvexGeometry(pts);
    g.deleteAttribute("uv");
    return g;
  });
const sailGeo = () =>
  geo("boat-sail", () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(1.5, 0);
    s.lineTo(0, 2.6);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  });

function BoatModel({ b }: { b: Boat }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime + b.phase;
    g.position.y = SEA_Y + 0.4 + Math.sin(t * 1.1) * 0.05;
    g.rotation.z = Math.sin(t * 0.9) * 0.04;
    g.rotation.x = Math.sin(t * 0.7 + 1) * 0.03;
  });
  return (
    <group position={[b.x, SEA_Y, b.z]} rotation={[0, b.yaw, 0]}>
      <group ref={ref} scale={b.s}>
        <mesh geometry={hullGeo()} material={mat(b.hull, { r: 0.6, flat: true })} castShadow />
        {/* the one orange: a rubbing strake round the gunwale */}
        <mesh geometry={hullGeo()} position={[0, 0.005, 0]} scale={[1.02, 0.12, 1.05]} material={mat(C.red, { r: 0.5, flat: true })} />
        <mesh geometry={hullGeo()} position={[0, 0.05, 0]} scale={[0.92, 0.06, 0.86]} material={mat(C.concrete, { r: 0.9, flat: true })} />
        {b.sail ? (
          <>
            <mesh position={[0.15, 1.6, 0]} scale={[0.06, 3.1, 0.06]} geometry={unitBox()} material={mat(C.ink, { r: 0.6 })} castShadow />
            <mesh geometry={sailGeo()} position={[0.2, 0.35, 0]} material={mat(b.top, { r: 0.8, side: THREE.DoubleSide })} castShadow />
          </>
        ) : (
          <>
            <mesh position={[-0.35, 0.38, 0]} scale={[1.0, 0.6, 0.9]} geometry={unitBox()} material={mat(b.top, { r: 0.6 })} castShadow />
            <mesh position={[0.16, 0.44, 0]} scale={[0.04, 0.26, 0.76]} geometry={unitBox()} material={mat(C.glass, { r: 0.2, m: 0.3 })} />
          </>
        )}
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
