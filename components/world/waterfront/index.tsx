"use client";

// The waterfront along the south bay: a paved promenade with a railing on the
// sea side, lamps that glow after dark and benches facing the water; a wooden
// pier you can drive out onto; and little boats bobbing in the harbour and the
// bay. Instanced or merged per material, so it stays a handful of draw calls.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { CANALS, SEA_FLOOR, SEA_Y, coastR } from "../layout";
import { PIER, PIER_I, PIER_LAMP, PROMENADE, PROM_LAMPS, PROM_W, frame } from "./layout";
import { heightAt } from "../terrain";
import { dayNight } from "../daynight";
import { C } from "../palette";
import { geo, lowSphere, mat, unitBox, unitCyl } from "../models/props/shared";
import { compose } from "../street/common";
import { PROP_SCALE } from "../models/props/kit";
import { batch, Instances } from "../street/Instances";

// ------------------------------------------------------------ promenade

const STONE = "#ddd0b6";
const STONE_EDGE = "#cbb895";

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
      posts.m.push(compose(x, y + 0.5, z, 0, 0.07, 1, 0.07));
      const here = new THREE.Vector3(x, y, z);
      if (prev) {
        const mid = prev.clone().add(here).multiplyScalar(0.5);
        const len = prev.distanceTo(here);
        const yaw = Math.atan2(-(here.z - prev.z), here.x - prev.x);
        for (const ry of [0.95, 0.55]) rails.m.push(compose(mid.x, mid.y + ry, mid.z, yaw, len, 0.06, 0.06));
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
      const yaw = Math.atan2(f.nx, f.nz); // local +z toward the sea
      const s = PROP_SCALE;
      benches.m.push(compose(x, y + 0.45 * s, z, yaw, 1.6 * s, 0.08 * s, 0.42 * s));
      benches.m.push(compose(x - f.nx * 0.22 * s, y + 0.75 * s, z - f.nz * 0.22 * s, yaw, 1.6 * s, 0.36 * s, 0.07 * s));
    }
    return { posts, rails, benches };
  }, []);
  return (
    <>
      <mesh geometry={g.pave} material={mat(STONE, { r: 0.9, side: THREE.DoubleSide })} receiveShadow />
      <mesh geometry={g.edge} material={mat(STONE_EDGE, { r: 0.85, side: THREE.DoubleSide })} receiveShadow />
      <Instances geometry={unitCyl()} material={mat(C.charcoal, { r: 0.45, m: 0.3 })} batch={parts.posts} />
      <Instances geometry={unitBox()} material={mat(C.charcoal, { r: 0.45, m: 0.3 })} batch={parts.rails} />
      <Instances geometry={unitBox()} material={mat(C.wood, { r: 0.7 })} batch={parts.benches} />
    </>
  );
}

// ------------------------------------------------------------ lamps

const LAMP_H = 3.4;
/** Owned here, so it is safe to animate: dim by day, warm and blooming at night. */
const globeMat = new THREE.MeshStandardMaterial({ color: "#fff1dc", emissive: new THREE.Color("#ffc47e"), emissiveIntensity: 0.15, roughness: 0.35, toneMapped: false });

function Lamps() {
  const parts = useMemo(() => {
    const poles = batch();
    const globes = batch();
    for (const [x, z] of PROM_LAMPS) {
      const y = heightAt(x, z) + 0.05;
      poles.m.push(compose(x, y + LAMP_H / 2, z, 0, 0.06, LAMP_H, 0.06));
      poles.m.push(compose(x, y + 0.12, z, 0, 0.16, 0.24, 0.16));
      globes.m.push(compose(x, y + LAMP_H + 0.2, z, 0, 0.24, 0.26, 0.24));
    }
    // and one at the end of the pier
    const [ex, ez] = PIER_LAMP;
    poles.m.push(compose(ex, PIER.y + LAMP_H / 2, ez, 0, 0.06, LAMP_H, 0.06));
    globes.m.push(compose(ex, PIER.y + LAMP_H + 0.2, ez, 0, 0.24, 0.26, 0.24));
    return { poles, globes };
  }, []);
  useFrame(() => {
    globeMat.emissiveIntensity = 0.15 + dayNight.night * 2.8;
  });
  return (
    <>
      <Instances geometry={unitCyl()} material={mat(C.charcoal, { r: 0.45, m: 0.35 })} batch={parts.poles} />
      <Instances geometry={lowSphere()} material={globeMat} batch={parts.globes} shadow={false} />
    </>
  );
}

// ------------------------------------------------------------ pier

function Pier() {
  const parts = useMemo(() => {
    const planks = batch();
    const piles = batch();
    const rails = batch();
    const yaw = Math.atan2(-PIER.dz, PIER.dx); // local +x along the pier
    for (let k = 0; k < PIER.len / 0.5; k++) {
      const d = 0.25 + k * 0.5;
      const x = PIER.x + PIER.dx * d;
      const z = PIER.z + PIER.dz * d;
      planks.m.push(compose(x, PIER.y, z, yaw, 0.44, 0.1, PIER.w));
      planks.c.push(new THREE.Color(k % 3 ? C.wood : "#a98668"));
    }
    const sx = -PIER.dz;
    const sz = PIER.dx;
    for (let d = 1; d <= PIER.len; d += 3) {
      for (const s of [-1, 1]) {
        const x = PIER.x + PIER.dx * d + sx * s * (PIER.w / 2 - 0.1);
        const z = PIER.z + PIER.dz * d + sz * s * (PIER.w / 2 - 0.1);
        const bottom = SEA_FLOOR - 0.2;
        piles.m.push(compose(x, (PIER.y + bottom) / 2, z, 0, 0.14, PIER.y - bottom, 0.14));
        piles.m.push(compose(x, PIER.y + 0.5, z, 0, 0.07, 1, 0.07));
      }
    }
    for (const s of [-1, 1]) {
      const cx = PIER.x + PIER.dx * (PIER.len / 2 + 0.5) + sx * s * (PIER.w / 2 - 0.1);
      const cz = PIER.z + PIER.dz * (PIER.len / 2 + 0.5) + sz * s * (PIER.w / 2 - 0.1);
      rails.m.push(compose(cx, PIER.y + 0.95, cz, yaw, PIER.len - 1, 0.07, 0.07));
      rails.m.push(compose(cx, PIER.y + 0.55, cz, yaw, PIER.len - 1, 0.06, 0.06));
    }
    return { planks, piles, rails, yaw };
  }, []);
  const mid = { x: PIER.x + PIER.dx * (PIER.len / 2), z: PIER.z + PIER.dz * (PIER.len / 2) };
  return (
    <>
      <Instances geometry={unitBox()} material={mat("#ffffff", { r: 0.8 })} batch={parts.planks} />
      <Instances geometry={unitCyl()} material={mat(C.woodDark, { r: 0.8 })} batch={parts.piles} />
      <Instances geometry={unitBox()} material={mat(C.woodDark, { r: 0.7 })} batch={parts.rails} />
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

type Boat = { x: number; z: number; yaw: number; hull: string; cabin: string; sail: boolean; s: number; phase: number };

const BOATS: Boat[] = (() => {
  const out: Boat[] = [];
  // moored along the harbour quay, bows west toward the sea
  const arm = CANALS[0];
  for (const [i, f, hull, cabin, sc, ph] of [
    [0, 0.45, C.cream, "#d9826b", 0.8, 0],
    [1, 0.35, "#8fa9c4", C.cream, 0.75, 1.7],
    [2, 0.5, C.white, "#9fb79a", 0.9, 3.1],
  ] as const) {
    const [ax, az] = arm.pts[i];
    const [bx, bz] = arm.pts[i + 1];
    const x = ax + (bx - ax) * f;
    const z = az + (bz - az) * f;
    const l = Math.hypot(bx - ax, bz - az);
    // toward the quay: canalSide is the sign of d x r, so r = (-dz, dx) * quay / |d|
    const q = arm.quay ?? 1;
    const off = (arm.w[i] + (arm.w[i + 1] - arm.w[i]) * f) / 2 - 1.4;
    out.push({ x: x + ((bz - az) / l) * -q * off, z: z + (-(bx - ax) / l) * -q * off, yaw: Math.atan2(-(bz - az), bx - ax), hull, cabin, sail: false, s: sc, phase: ph });
  }
  const sx = -PIER.dz;
  const sz = PIER.dx;
  out.push({ x: PIER.x + PIER.dx * 9 + sx * 3.4, z: PIER.z + PIER.dz * 9 + sz * 3.4, yaw: Math.atan2(-PIER.dz, PIER.dx), hull: C.cream, cabin: "#9fb79a", sail: false, s: 1, phase: 0.6 });
  out.push({ x: PIER.x + PIER.dx * 14 - sx * 3.6, z: PIER.z + PIER.dz * 14 - sz * 3.6, yaw: Math.atan2(-PIER.dz, PIER.dx) + 0.2, hull: "#d9826b", cabin: C.cream, sail: true, s: 1.1, phase: 2.3 });
  const a = (70 * Math.PI) / 180;
  const r = coastR(a) + 16;
  out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, yaw: 1.2, hull: C.white, cabin: C.cream, sail: true, s: 1.4, phase: 4.1 });
  return out;
})();

const hullGeo = () =>
  geo("boat-hull", () => {
    // a soft bowl: the bottom half of a sphere, stretched long, with a pointed bow
    const g = new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setX(i, x > 0 ? x * (1 + 0.35 * (1 - Math.abs(p.getZ(i)))) : x);
    }
    g.scale(1.7, 0.55, 0.75);
    g.computeVertexNormals();
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
    g.position.y = SEA_Y + 0.05 + Math.sin(t * 1.1) * 0.05;
    g.rotation.z = Math.sin(t * 0.9) * 0.04;
    g.rotation.x = Math.sin(t * 0.7 + 1) * 0.03;
  });
  return (
    <group position={[b.x, SEA_Y, b.z]} rotation={[0, b.yaw, 0]}>
      <group ref={ref} scale={b.s}>
        <mesh geometry={hullGeo()} rotation={[Math.PI, 0, 0]} position={[0, 0.02, 0]} material={mat(b.hull, { r: 0.45 })} castShadow />
        {/* deck rim stripe */}
        <mesh position={[0, 0.06, 0]} scale={[1.75, 0.06, 0.78]} geometry={unitCyl()} material={mat(C.red, { r: 0.4 })} />
        <mesh position={[0, 0.09, 0]} scale={[1.6, 0.05, 0.7]} geometry={unitCyl()} material={mat(C.wood, { r: 0.7 })} />
        {b.sail ? (
          <>
            <mesh position={[0.15, 1.6, 0]} scale={[0.04, 3.1, 0.04]} geometry={unitCyl()} material={mat(C.woodDark, { r: 0.6 })} castShadow />
            <mesh geometry={sailGeo()} position={[0.2, 0.35, 0]} material={mat(C.cream, { r: 0.8, side: THREE.DoubleSide })} castShadow />
          </>
        ) : (
          <RoundedBox args={[0.9, 0.55, 0.85]} radius={0.12} smoothness={2} position={[-0.3, 0.38, 0]} material={mat(b.cabin, { r: 0.55 })} castShadow />
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
