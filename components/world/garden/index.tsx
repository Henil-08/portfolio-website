"use client";

// The infield garden, a modern landscaped garden in Concrete & Ink: gravel paths with a
// concrete kerb linking the places, clipped hedges with chamfered tops, raised concrete
// planters of gravel with muted planting (faceted shrubs, tall grasses, paper blooms), a
// pond in a concrete surround, the district benches and square ink garden lamps with a
// paper light box that glows after dark. Everything is instanced or merged so the whole
// garden stays around a dozen draw calls. Paths, beds and the pond are drivable; hedges,
// benches and lamps have small colliders.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { heightAt } from "../terrain";
import { dayNight } from "../daynight";
import { C } from "../palette";
import { geo, mat, unitBox } from "../models/props/shared";
import { compose } from "../street/common";
import { PROP_SCALE } from "../models/props/kit";
import { batch, Instances } from "../street/Instances";
import { Movables, kindFromMatrices } from "../Movables";
import { seeded } from "../alive/noise";
import { benchGeo } from "../districts/furniture";
import { BEDS, BENCHES, HEDGE, HEDGES, LAMPS_GARDEN, PATHS, POND, clearOfRoad, pathDist, pathSamples, type Bed } from "./layout";

const SAND = C.gravel; // gravel paths, with the gravel ground
const SAND_DARK = "#bfb59f";
const EDGE = C.concreteDark; // the paths' kerb
const HEDGE_A = C.leafDark; // with the grass
const HEDGE_B = "#4c5840";
const BED_FILL = "#a9a08c"; // dark gravel mulch in the planters
const PLANTS = [C.leafDark, C.leaf, "#68755a"];
const BLOOMS = [C.paper, C.paper, C.cream, C.concrete];

const PATH_Y = 0.035;
const EDGE_Y = 0.09;

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
        // the kerb's two faces, so it reads as a crisp concrete edge, not a painted band
        quad(edge, v(ax, az, anx, anz, s * half, PATH_Y), e0, v(bx, bz, bnx, bnz, s * half, PATH_Y), f0);
        quad(edge, e1, v(ax, az, anx, anz, s * (half + 0.26), -0.02), f1, v(bx, bz, bnx, bnz, s * (half + 0.26), -0.02));
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
      <mesh geometry={g.edge} material={mat(EDGE, { r: 0.85, side: THREE.DoubleSide })} receiveShadow />
    </>
  );
}

// ---------------------------------------------------------------- hedges

/** A clipped hedge block: square sides with chamfered top edges, flat shaded (x along the run). */
const hedgeGeo = () =>
  geo("garden-hedge-ci", () => {
    const s = new THREE.Shape();
    s.moveTo(-0.5, -0.5);
    s.lineTo(0.5, -0.5);
    s.lineTo(0.5, 0.25);
    s.lineTo(0.32, 0.5);
    s.lineTo(-0.32, 0.5);
    s.lineTo(-0.5, 0.25);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
    g.translate(0, 0, -0.5);
    g.rotateY(Math.PI / 2); // the profile across the run, extruded along x
    g.deleteAttribute("uv");
    return g.toNonIndexed();
  });

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
      out.push({ x, z, yaw, len: L / n - 0.06 });
    }
  }
  return out;
}

// Hedge blocks are knock-about props (Movables): the car shoves them aside and they tidy
// themselves back into line once it is well away. Clipped to one height, so the run reads level.
function Hedges({ blocks }: { blocks: ReturnType<typeof hedgeBlocks> }) {
  const kind = useMemo(() => {
    const r = seeded(5);
    const out = batch();
    const a = new THREE.Color(HEDGE_A);
    const c = new THREE.Color(HEDGE_B);
    for (const h of blocks) {
      out.m.push(compose(h.x, heightAt(h.x, h.z) + HEDGE.h / 2 - 0.02, h.z, h.yaw, h.len, HEDGE.h, HEDGE.d));
      out.c.push(a.clone().lerp(c, r() * 0.35));
    }
    return kindFromMatrices(out.m, [{ geometry: hedgeGeo(), material: mat("#ffffff", { r: 0.9, flat: true }) }], { mass: 0.3, colors: out.c, shrink: 0.95 });
  }, [blocks]);
  return <Movables kind={kind} />;
}

// ---------------------------------------------------------------- beds

const BED_SIDES = 8;
const BED_WALL = 0.22; // concrete planter wall thickness
const BED_H = 0.3; // planter wall height
const BED_FILL_Y = 0.22;

/** A point on bed `b`'s octagon, `o` metres out from the inside of its wall (bed-local angle k). */
function bedPoint(b: Bed, k: number, o: number) {
  const a = (k / BED_SIDES) * Math.PI * 2 + Math.PI / BED_SIDES;
  // an octagon inside the bed's ellipse (the mask and nearGarden keep to the ellipse)
  const u = Math.cos(a) * (b.rx + o);
  const v = Math.sin(a) * (b.rz + o);
  const c = Math.cos(b.yaw);
  const s = Math.sin(b.yaw);
  return [b.x + u * c + v * s, b.z - u * s + v * c] as const;
}

/** Flat-shaded faceted shrub (an icosahedron with no subdivision). */
const shrubGeo = () => geo("garden-shrub", () => new THREE.IcosahedronGeometry(1, 0).toNonIndexed());
/** A tall ornamental grass: a slim four-sided spike. */
export const grassGeo = () => geo("garden-grass", () => new THREE.ConeGeometry(1, 1, 4).translate(0, 0.5, 0).toNonIndexed());
/** An octagonal plate (the planter's gravel and the pond's water). */
const octGeo = () => geo("garden-oct", () => new THREE.CircleGeometry(1, BED_SIDES, Math.PI / BED_SIDES).rotateX(-Math.PI / 2));

function Beds() {
  const parts = useMemo(() => {
    const r = seeded(31);
    const walls = batch();
    const fill = batch();
    const shrubs = batch();
    const grasses = batch();
    const blooms = batch();
    for (const b of BEDS) {
      const y = heightAt(b.x, b.z);
      // raised concrete planter: one wall block per octagon side
      for (let k = 0; k < BED_SIDES; k++) {
        const [x0, z0] = bedPoint(b, k, BED_WALL / 2);
        const [x1, z1] = bedPoint(b, k + 1, BED_WALL / 2);
        const len = Math.hypot(x1 - x0, z1 - z0) + BED_WALL * 0.42;
        walls.m.push(compose((x0 + x1) / 2, y + BED_H / 2 - 0.04, (z0 + z1) / 2, Math.atan2(-(z1 - z0), x1 - x0), len, BED_H, BED_WALL));
      }
      fill.m.push(compose(b.x, y + BED_FILL_Y, b.z, b.yaw, b.rx, 1, b.rz));
      // planting: faceted shrubs, tall grasses through them and a few paper blooms
      const n = Math.round(b.rx * b.rz * 1.8);
      const c = Math.cos(b.yaw);
      const s = Math.sin(b.yaw);
      const spot = (d: number) => {
        const a = r() * Math.PI * 2;
        const u = Math.cos(a) * Math.sqrt(r()) * d * b.rx;
        const v = Math.sin(a) * Math.sqrt(r()) * d * b.rz;
        return [b.x + u * c + v * s, b.z - u * s + v * c] as const;
      };
      for (let i = 0; i < n; i++) {
        const [x, z] = spot(0.72);
        const sz = 0.2 + r() * 0.16;
        shrubs.m.push(compose(x, y + BED_FILL_Y + sz * 0.6, z, r() * 6, sz * 1.1, sz * 0.85, sz));
        shrubs.c.push(new THREE.Color(PLANTS[Math.floor(r() * PLANTS.length)]));
      }
      for (let i = 0; i < n * 0.8; i++) {
        const [x, z] = spot(0.7);
        const h = 0.45 + r() * 0.4;
        grasses.m.push(compose(x, y + BED_FILL_Y, z, r() * 6, 0.05, h, 0.05));
        grasses.c.push(new THREE.Color(r() < 0.6 ? "#8b9270" : C.leaf));
      }
      for (let i = 0; i < n * 0.6; i++) {
        const [x, z] = spot(0.65);
        const bs = 0.07 + r() * 0.03;
        blooms.m.push(compose(x, y + BED_FILL_Y + 0.42 + r() * 0.12, z, r() * 6, bs, bs, bs));
        blooms.c.push(new THREE.Color(BLOOMS[Math.floor(r() * BLOOMS.length)]));
      }
    }
    return { walls, fill, shrubs, grasses, blooms };
  }, []);
  return (
    <>
      <Instances geometry={unitBox()} material={mat(C.concrete, { r: 0.9 })} batch={parts.walls} />
      <Instances geometry={octGeo()} material={mat(BED_FILL, { r: 1 })} batch={parts.fill} shadow={false} />
      <Instances geometry={shrubGeo()} material={mat("#ffffff", { r: 0.9, flat: true })} batch={parts.shrubs} />
      <Instances geometry={grassGeo()} material={mat("#ffffff", { r: 0.9, flat: true })} batch={parts.grasses} shadow={false} />
      <Instances geometry={unitBox()} material={mat("#ffffff", { r: 0.8 })} batch={parts.blooms} shadow={false} />
    </>
  );
}

// ---------------------------------------------------------------- pond

const POND_SIDES = 12;

function Pond() {
  const y = heightAt(POND.x, POND.z);
  const parts = useMemo(() => {
    // a concrete surround, one coping block per side of a 12-gon
    const coping = batch();
    const ap = (k: number) => (k / POND_SIDES) * Math.PI * 2;
    const R = POND.r + 0.25;
    for (let k = 0; k < POND_SIDES; k++) {
      const a0 = ap(k);
      const a1 = ap(k + 1);
      const x0 = POND.x + Math.cos(a0) * R;
      const z0 = POND.z + Math.sin(a0) * R;
      const x1 = POND.x + Math.cos(a1) * R;
      const z1 = POND.z + Math.sin(a1) * R;
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      coping.m.push(compose(mx, heightAt(mx, mz) + 0.06, mz, Math.atan2(-(z1 - z0), x1 - x0), Math.hypot(x1 - x0, z1 - z0) + 0.14, 0.16, 0.5));
    }
    // a few square stepping stones out into the water
    const steps = batch();
    for (const [d, a] of [
      [POND.r - 0.9, 2.4],
      [POND.r - 2.0, 2.65],
    ])
      steps.m.push(compose(POND.x + Math.cos(a) * d, y + 0.1, POND.z + Math.sin(a) * d, -a, 0.75, 0.08, 0.75));
    return { coping, steps };
  }, [y]);
  return (
    <>
      {/* Still water just above the lawn, in a 12-sided concrete surround. */}
      <mesh position={[POND.x, y + 0.06, POND.z]} rotation={[-Math.PI / 2, 0, 0]} material={mat(C.water, { r: 0.12, m: 0.1 })} receiveShadow>
        <circleGeometry args={[POND.r + 0.1, POND_SIDES]} />
      </mesh>
      <Instances geometry={unitBox()} material={mat(C.concrete, { r: 0.9 })} batch={parts.coping} />
      <Instances geometry={unitBox()} material={mat(C.concreteDark, { r: 0.9 })} batch={parts.steps} />
    </>
  );
}

// ---------------------------------------------------------------- benches and lamps

const BENCH_K = 0.72 * PROP_SCALE;

function Benches() {
  const parts = useMemo(() => {
    const out = batch();
    // the district bench: seat toward local +z, back toward -z
    for (const b of BENCHES) out.m.push(compose(b.x, heightAt(b.x, b.z) + 0.78 * BENCH_K, b.z, b.yaw, BENCH_K, BENCH_K, BENCH_K));
    return out;
  }, []);
  return <Instances geometry={benchGeo()} material={mat("#ffffff", { r: 0.8, vc: true })} batch={parts} />;
}

const LAMP_H = 1.1 * PROP_SCALE; // low square garden bollard lamps
const LS = PROP_SCALE;
/** Owned by the garden, so it is safe to animate: a paper box, dim by day, glowing at night. */
const lampHeadMat = new THREE.MeshStandardMaterial({
  color: C.paper,
  emissive: new THREE.Color("#fff3dc"),
  emissiveIntensity: 0.15,
  roughness: 0.5,
  toneMapped: false,
});

function Lamps() {
  const parts = useMemo(() => {
    const posts = batch();
    const heads = batch();
    for (const [x, z] of LAMPS_GARDEN) {
      const y = heightAt(x, z);
      posts.m.push(compose(x, y + LAMP_H / 2, z, 0, 0.16 * LS, LAMP_H, 0.16 * LS));
      heads.m.push(compose(x, y + LAMP_H + 0.12 * LS, z, 0, 0.17 * LS, 0.24 * LS, 0.17 * LS));
      posts.m.push(compose(x, y + LAMP_H + 0.26 * LS, z, 0, 0.22 * LS, 0.04 * LS, 0.22 * LS));
    }
    return { posts, heads };
  }, []);
  useFrame(() => {
    lampHeadMat.emissiveIntensity = 0.15 + dayNight.night * 2.6;
  });
  return (
    <>
      <Instances geometry={unitBox()} material={mat(C.ink, { r: 0.6 })} batch={parts.posts} />
      <Instances geometry={unitBox()} material={lampHeadMat} batch={parts.heads} shadow={false} />
    </>
  );
}

// ---------------------------------------------------------------- colliders

function Colliders() {
  return (
    <RigidBody type="fixed" colliders={false}>
      {BENCHES.map((b, i) => (
        <CuboidCollider key={`b${i}`} args={[0.85 * PROP_SCALE, 0.45 * PROP_SCALE, 0.3 * PROP_SCALE]} position={[b.x, heightAt(b.x, b.z) + 0.45 * PROP_SCALE, b.z]} rotation={[0, b.yaw, 0]} />
      ))}
      {LAMPS_GARDEN.map(([x, z], i) => (
        <CuboidCollider key={`l${i}`} args={[0.1 * PROP_SCALE, LAMP_H / 2, 0.1 * PROP_SCALE]} position={[x, heightAt(x, z) + LAMP_H / 2, z]} />
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
      <Colliders />
    </group>
  );
}
