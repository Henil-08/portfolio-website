"use client";

// The infield garden: soft gravel paths with stone edging linking the places,
// rounded hedges, flower beds, a small pond, benches and garden lamps that
// glow after dark. Everything is instanced or merged so the whole garden stays
// around a dozen draw calls. Paths, beds and the pond are drivable; hedges,
// benches and lamps have small colliders.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { heightAt } from "../terrain";
import { dayNight } from "../daynight";
import { C } from "../palette";
import { geo, lowSphere, mat, unitCyl } from "../models/props/shared";
import { compose } from "../street/common";
import { batch, Instances } from "../street/Instances";
import { seeded } from "../alive/noise";
import { BEDS, BENCHES, HEDGE, HEDGES, LAMPS_GARDEN, PATHS, POND, bedLocal, clearOfRoad, pathDist, pathSamples } from "./layout";

const SAND = "#e9dcc4";
const SAND_DARK = "#d8c7a6";
const EDGE = "#c9b48e";
const HEDGE_A = "#6f8f5a";
const HEDGE_B = "#5c7a4b";
const SOIL = "#8c7461";
const FLOWERS = ["#d9826b", "#f3e9d8", "#d7a6a0", "#f0d48a", "#a99cc0"];

const PATH_Y = 0.035;
const EDGE_Y = 0.07;

// ---------------------------------------------------------------- paths

/** One merged ribbon per material: the gravel and the edging stones either side. */
function pathGeometries() {
  const sand: number[] = [];
  const sandCol: number[] = [];
  const edge: number[] = [];
  const cA = new THREE.Color(SAND);
  const cB = new THREE.Color(SAND_DARK);
  const tmp = new THREE.Color();

  const quad = (out: number[], a: number[], b: number[], c: number[], d: number[]) => out.push(...a, ...b, ...c, ...b, ...d, ...c);

  PATHS.forEach((p, i) => {
    const pts = pathSamples(p, 0.5);
    const half = p.w / 2;
    const side = (k: number) => {
      const [x0, z0] = pts[Math.max(0, k - 1)];
      const [x1, z1] = pts[Math.min(pts.length - 1, k + 1)];
      const len = Math.hypot(x1 - x0, z1 - z0) || 1;
      return [-(z1 - z0) / len, (x1 - x0) / len];
    };
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k];
      const [bx, bz] = pts[k + 1];
      const [anx, anz] = side(k);
      const [bnx, bnz] = side(k + 1);
      const v = (x: number, z: number, nx: number, nz: number, o: number, y: number) => {
        const px = x + nx * o;
        const pz = z + nz * o;
        return [px, heightAt(px, pz) + y, pz];
      };
      // Gravel, with a faint mottle so it doesn't read as plastic.
      const a0 = v(ax, az, anx, anz, -half, PATH_Y);
      const a1 = v(ax, az, anx, anz, half, PATH_Y);
      const b0 = v(bx, bz, bnx, bnz, -half, PATH_Y);
      const b1 = v(bx, bz, bnx, bnz, half, PATH_Y);
      quad(sand, a0, a1, b0, b1);
      // Slow mottle along the path, the same at both ends of a segment's shared edge.
      for (const [x, z] of [a0, a1, b0, a1, b1, b0].map((q) => [q[0], q[2]])) {
        tmp.copy(cA).lerp(cB, 0.18 + 0.18 * Math.sin(x * 0.35 + z * 0.21) * Math.cos(z * 0.29 - x * 0.13));
        sandCol.push(tmp.r, tmp.g, tmp.b);
      }
      // Edging stones: a slightly raised lip each side, broken where another path joins.
      for (const s of [-1, 1]) {
        const mx = (ax + bx) / 2 + ((anx + bnx) / 2) * s * (half + 0.12);
        const mz = (az + bz) / 2 + ((anz + bnz) / 2) * s * (half + 0.12);
        const other = pathDist(mx, mz, i);
        if (other.d < other.half + 0.3) continue;
        const e0 = v(ax, az, anx, anz, s * half, EDGE_Y);
        const e1 = v(ax, az, anx, anz, s * (half + 0.26), EDGE_Y);
        const f0 = v(bx, bz, bnx, bnz, s * half, EDGE_Y);
        const f1 = v(bx, bz, bnx, bnz, s * (half + 0.26), EDGE_Y);
        if (s < 0) quad(edge, e1, e0, f1, f0);
        else quad(edge, e0, e1, f0, f1);
      }
    }
  });

  const mk = (pos: number[], col?: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    if (col) g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  };
  return { sand: mk(sand, sandCol), edge: mk(edge) };
}

function Paths() {
  const g = useMemo(() => pathGeometries(), []);
  return (
    <>
      <mesh geometry={g.sand} material={mat("#ffffff", { r: 0.95, vc: true })} receiveShadow />
      <mesh geometry={g.edge} material={mat(EDGE, { r: 0.85 })} receiveShadow />
    </>
  );
}

// ---------------------------------------------------------------- hedges

const hedgeGeo = () => geo("garden-hedge", () => new RoundedBoxGeometry(1, 1, 1, 3, 0.32));

function hedgeBlocks() {
  const out: { x: number; z: number; yaw: number; len: number }[] = [];
  for (const [x1, z1, x2, z2] of HEDGES) {
    const L = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.max(1, Math.round(L / HEDGE.block));
    const yaw = Math.atan2(-(z2 - z1), x2 - x1);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      if (!clearOfRoad(x, z, 2.5)) continue;
      out.push({ x, z, yaw, len: L / n - 0.08 });
    }
  }
  return out;
}

function Hedges({ blocks }: { blocks: ReturnType<typeof hedgeBlocks> }) {
  const b = useMemo(() => {
    const r = seeded(5);
    const out = batch();
    const a = new THREE.Color(HEDGE_A);
    const c = new THREE.Color(HEDGE_B);
    for (const h of blocks) {
      const hh = HEDGE.h * (0.9 + r() * 0.2);
      out.m.push(compose(h.x, heightAt(h.x, h.z) + hh / 2 - 0.04, h.z, h.yaw, h.len, hh, HEDGE.d * (0.92 + r() * 0.12)));
      out.c.push(a.clone().lerp(c, r()));
    }
    return out;
  }, [blocks]);
  return <Instances geometry={hedgeGeo()} material={mat("#ffffff", { r: 0.85 })} batch={b} />;
}

// ---------------------------------------------------------------- beds

// A soft mound of soil: a squashed, rounded disc.
const moundGeo = () =>
  geo("garden-mound", () => {
    const g = new THREE.SphereGeometry(1, 28, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1, 0.18, 1);
    return g;
  });
const rimGeo = () =>
  geo("garden-bed-rim", () => {
    const g = new THREE.TorusGeometry(1, 0.1, 6, 40);
    g.rotateX(Math.PI / 2);
    return g;
  });

function Beds() {
  const parts = useMemo(() => {
    const r = seeded(31);
    const mound = batch();
    const rim = batch();
    const leaves = batch();
    const blooms = batch();
    const green = [new THREE.Color(C.leaf), new THREE.Color(C.leafDark)];
    for (const b of BEDS) {
      const y = heightAt(b.x, b.z);
      mound.m.push(compose(b.x, y, b.z, b.yaw, b.rx, 1, b.rz));
      rim.m.push(compose(b.x, y + 0.04, b.z, b.yaw, b.rx + 0.1, 1, b.rz + 0.1));
      // Sparse clumps: a leafy ball with a few blossoms on top, one colour per clump.
      const n = Math.round(b.rx * b.rz * 2.2);
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 0.78;
        const u = Math.cos(a) * d * b.rx;
        const v = Math.sin(a) * d * b.rz;
        const c = Math.cos(b.yaw);
        const s = Math.sin(b.yaw);
        const x = b.x + u * c + v * s;
        const z = b.z - u * s + v * c;
        const [lu, lv] = bedLocal(b, x, z);
        const top = y + 0.18 * Math.sqrt(Math.max(0, 1 - (lu / b.rx) ** 2 - (lv / b.rz) ** 2));
        const sz = 0.22 + r() * 0.14;
        leaves.m.push(compose(x, top + sz * 0.55, z, r() * 6, sz, sz * 0.8, sz));
        leaves.c.push(green[r() < 0.5 ? 0 : 1].clone());
        const col = new THREE.Color(FLOWERS[Math.floor(r() * FLOWERS.length)]);
        for (let k = 0; k < 3; k++) {
          const ba = r() * Math.PI * 2;
          const bd = sz * 0.55;
          const bs = 0.07 + r() * 0.03;
          blooms.m.push(compose(x + Math.cos(ba) * bd * 0.7, top + sz * 1.05 + r() * 0.06, z + Math.sin(ba) * bd * 0.7, 0, bs, bs * 0.8, bs));
          blooms.c.push(col);
        }
      }
    }
    return { mound, rim, leaves, blooms };
  }, []);
  return (
    <>
      <Instances geometry={moundGeo()} material={mat(SOIL, { r: 1 })} batch={parts.mound} shadow={false} />
      <Instances geometry={rimGeo()} material={mat(EDGE, { r: 0.85 })} batch={parts.rim} />
      <Instances geometry={lowSphere()} material={mat("#ffffff", { r: 0.8 })} batch={parts.leaves} />
      <Instances geometry={lowSphere()} material={mat("#ffffff", { r: 0.6 })} batch={parts.blooms} shadow={false} />
    </>
  );
}

// ---------------------------------------------------------------- pond

function Pond() {
  const y = heightAt(POND.x, POND.z);
  const stones = useMemo(() => {
    const r = seeded(9);
    const out = batch();
    const a = new THREE.Color(C.rock);
    const b = new THREE.Color(EDGE);
    const n = 44;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + r() * 0.05;
      const rr = POND.r + 0.22 + r() * 0.1;
      const x = POND.x + Math.cos(ang) * rr;
      const z = POND.z + Math.sin(ang) * rr;
      const s = 0.24 + r() * 0.08;
      out.m.push(compose(x, heightAt(x, z) + 0.03, z, -ang, s * 1.25, s * 0.42, s));
      out.c.push(a.clone().lerp(b, r() * 0.6));
    }
    return out;
  }, []);
  const pads = useMemo(() => {
    const r = seeded(13);
    const out = batch();
    for (let i = 0; i < 5; i++) {
      const a = r() * Math.PI * 2;
      const d = 0.8 + r() * (POND.r - 1.6);
      out.m.push(compose(POND.x + Math.cos(a) * d, y + 0.075, POND.z + Math.sin(a) * d, r() * 6, 0.35 + r() * 0.15, 0.02, 0.35 + r() * 0.15));
      out.c.push(new THREE.Color(r() < 0.5 ? C.leaf : HEDGE_A));
    }
    return out;
  }, [y]);
  return (
    <>
      {/* Still water just above the lawn, held by a ring of flat stones. */}
      <mesh position={[POND.x, y + 0.06, POND.z]} rotation={[-Math.PI / 2, 0, 0]} material={mat(C.water, { r: 0.12, m: 0.1 })} receiveShadow>
        <circleGeometry args={[POND.r + 0.05, 48]} />
      </mesh>
      <Instances geometry={lowSphere()} material={mat("#ffffff", { r: 0.85 })} batch={stones} />
      <Instances geometry={unitCyl()} material={mat("#ffffff", { r: 0.7 })} batch={pads} shadow={false} />
    </>
  );
}

// ---------------------------------------------------------------- benches and lamps

const slatGeo = () => geo("garden-slat", () => new RoundedBoxGeometry(1, 1, 1, 2, 0.4));

function Benches() {
  const parts = useMemo(() => {
    const wood = batch();
    const legs = batch();
    const local = new THREE.Object3D();
    const world = new THREE.Object3D();
    const put = (out: ReturnType<typeof batch>, bx: number, by: number, bz: number, yaw: number, lx: number, ly: number, lz: number, sx: number, sy: number, sz: number, tilt = 0) => {
      world.position.set(bx, by, bz);
      world.rotation.set(0, yaw, 0);
      world.updateMatrix();
      local.position.set(lx, ly, lz);
      local.rotation.set(tilt, 0, 0);
      local.scale.set(sx, sy, sz);
      local.updateMatrix();
      out.m.push(world.matrix.clone().multiply(local.matrix));
    };
    for (const b of BENCHES) {
      const y = heightAt(b.x, b.z);
      for (const k of [-0.15, 0.15]) put(wood, b.x, y, b.z, b.yaw, 0, 0.46, k, 1.7, 0.07, 0.26);
      for (const k of [0.62, 0.84]) put(wood, b.x, y, b.z, b.yaw, 0, k, -0.33, 1.7, 0.14, 0.06, -0.12);
      for (const s of [-0.7, 0.7]) {
        put(legs, b.x, y, b.z, b.yaw, s, 0.21, 0, 0.08, 0.42, 0.5);
        put(legs, b.x, y, b.z, b.yaw, s, 0.62, -0.31, 0.07, 0.48, 0.07, -0.12);
      }
    }
    return { wood, legs };
  }, []);
  return (
    <>
      <Instances geometry={slatGeo()} material={mat(C.wood, { r: 0.7 })} batch={parts.wood} />
      <Instances geometry={slatGeo()} material={mat(C.charcoal, { r: 0.5, m: 0.3 })} batch={parts.legs} />
    </>
  );
}

const LAMP_H = 2.3;
/** Owned by the garden, so it is safe to animate: dim by day, warm and blooming at night. */
const lampHeadMat = new THREE.MeshStandardMaterial({
  color: "#fff1dc",
  emissive: new THREE.Color("#ffc47e"),
  emissiveIntensity: 0.15,
  roughness: 0.35,
  toneMapped: false,
});
const capGeo = () =>
  geo("garden-lamp-cap", () => {
    const g = new THREE.CylinderGeometry(0.06, 0.2, 0.12, 20);
    return g;
  });

function Lamps() {
  const parts = useMemo(() => {
    const posts = batch();
    const heads = batch();
    const caps = batch();
    for (const [x, z] of LAMPS_GARDEN) {
      const y = heightAt(x, z);
      posts.m.push(compose(x, y + LAMP_H / 2, z, 0, 0.05, LAMP_H, 0.05));
      posts.m.push(compose(x, y + 0.08, z, 0, 0.12, 0.16, 0.12));
      heads.m.push(compose(x, y + LAMP_H + 0.14, z, 0, 0.16, 0.18, 0.16));
      caps.m.push(compose(x, y + LAMP_H + 0.36, z));
    }
    return { posts, heads, caps };
  }, []);
  useFrame(() => {
    lampHeadMat.emissiveIntensity = 0.15 + dayNight.night * 2.6;
  });
  return (
    <>
      <Instances geometry={unitCyl()} material={mat(C.charcoal, { r: 0.45, m: 0.35 })} batch={parts.posts} />
      <Instances geometry={lowSphere()} material={lampHeadMat} batch={parts.heads} shadow={false} />
      <Instances geometry={capGeo()} material={mat(C.charcoal, { r: 0.45, m: 0.35 })} batch={parts.caps} />
    </>
  );
}

// ---------------------------------------------------------------- colliders

function Colliders({ blocks }: { blocks: ReturnType<typeof hedgeBlocks> }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      {blocks.map((h, i) => (
        <CuboidCollider key={`h${i}`} args={[h.len / 2, HEDGE.h / 2, HEDGE.d / 2]} position={[h.x, heightAt(h.x, h.z) + HEDGE.h / 2, h.z]} rotation={[0, h.yaw, 0]} />
      ))}
      {BENCHES.map((b, i) => (
        <CuboidCollider key={`b${i}`} args={[0.85, 0.45, 0.3]} position={[b.x, heightAt(b.x, b.z) + 0.45, b.z]} rotation={[0, b.yaw, 0]} />
      ))}
      {LAMPS_GARDEN.map(([x, z], i) => (
        <CylinderCollider key={`l${i}`} args={[LAMP_H / 2, 0.12]} position={[x, heightAt(x, z) + LAMP_H / 2, z]} />
      ))}
    </RigidBody>
  );
}

export default function Garden() {
  const blocks = useMemo(() => hedgeBlocks(), []);
  return (
    <group>
      <Paths />
      <Hedges blocks={blocks} />
      <Beds />
      <Pond />
      <Benches />
      <Lamps />
      <Colliders blocks={blocks} />
    </group>
  );
}
