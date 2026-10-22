"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Object3D,
  type InstancedMesh,
} from "three";
import { story } from "@/content/profile";
import {
  CHECKPOINTS,
  GRANDSTANDS,
  HALF_WIDTH,
  KERB_WIDTH,
  SAMPLES,
  SAMPLE_SPACING,
  TREES,
  headingAt,
  kerbAt,
  rand,
  samples,
} from "./circuit";
import { chequerTexture, gantryTexture } from "./textures";

/** Builds flat strips that follow the centre line between pairs of lateral offsets. */
function ribbon(strips: [number, number][], y: number) {
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  for (const [a, b] of strips) {
    const base = pos.length / 3;
    for (let i = 0; i <= SAMPLES; i++) {
      const s = samples[i % SAMPLES];
      pos.push(s.x + s.nx * a, y, s.z + s.nz * a, s.x + s.nx * b, y, s.z + s.nz * b);
      nor.push(0, 1, 0, 0, 1, 0);
    }
    for (let i = 0; i < SAMPLES; i++) {
      const l = base + i * 2;
      // a is the more-left offset, so this winding faces up
      idx.push(l, l + 1, l + 2, l + 1, l + 3, l + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** Fills an instanced mesh once from a list of transforms (and optional colours). */
function useInstances(
  items: { x: number; y: number; z: number; ry?: number; sx?: number; sy?: number; sz?: number; color?: string }[],
) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const d = new Object3D();
    const c = new Color();
    items.forEach((it, i) => {
      d.position.set(it.x, it.y, it.z);
      d.rotation.set(0, it.ry ?? 0, 0);
      d.scale.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      if (it.color) mesh.setColorAt(i, c.set(it.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return ref;
}

// ---------------------------------------------------------------------------
// Static instance lists, computed once

const KERBS = (() => {
  const out: { x: number; y: number; z: number; ry: number; sz: number; color: string }[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    if (!kerbAt[i]) continue;
    const s = samples[i];
    for (const side of [1, -1]) {
      const off = side * (HALF_WIDTH + KERB_WIDTH / 2);
      out.push({
        x: s.x + s.nx * off,
        y: 0.04,
        z: s.z + s.nz * off,
        ry: headingAt(i),
        sz: SAMPLE_SPACING * 1.02,
        color: i % 2 ? "#e10600" : "#f2f2f2",
      });
    }
  }
  return out;
})();

/** Rotate a stand-local offset into world space. */
function standPoint(g: (typeof GRANDSTANDS)[number], lx: number, lz: number) {
  const c = Math.cos(g.yaw);
  const s = Math.sin(g.yaw);
  return { x: g.x + lx * c + lz * s, z: g.z - lx * s + lz * c };
}

const STEPS = 4;
const STEP_H = 1.6;
const STEP_D = 3;
const CROWD_COLORS = ["#e10600", "#eceef2", "#ffc531", "#36d6ff", "#19d27a", "#1b1f27", "#b14cff", "#ff7a1a"];

const STAND_PARTS = (() => {
  const steps: { x: number; y: number; z: number; ry: number; sx: number; sy: number; sz: number }[] = [];
  const roofs: typeof steps = [];
  const crowd: { x: number; y: number; z: number; ry: number; color: string }[] = [];
  for (const g of GRANDSTANDS) {
    for (let k = 0; k < STEPS; k++) {
      const h = (k + 1) * STEP_H;
      const p = standPoint(g, 0, k * STEP_D + STEP_D / 2);
      steps.push({ ...p, y: h / 2, ry: g.yaw, sx: g.width, sy: h, sz: STEP_D });
      for (let x = -g.width / 2 + 1; x < g.width / 2 - 0.5; x += 1.3) {
        if (rand() > 0.82) continue; // a few empty seats
        const q = standPoint(g, x, k * STEP_D + 1.1);
        crowd.push({ ...q, y: h + 0.45, ry: g.yaw, color: CROWD_COLORS[Math.floor(rand() * CROWD_COLORS.length)] });
      }
    }
    const r = standPoint(g, 0, (STEPS * STEP_D) / 2);
    roofs.push({ ...r, y: STEPS * STEP_H + 4.5, ry: g.yaw, sx: g.width + 2, sy: 0.4, sz: STEPS * STEP_D + 2 });
    // back wall doubles as roof support
    const w = standPoint(g, 0, STEPS * STEP_D + 0.2);
    roofs.push({ ...w, y: (STEPS * STEP_H + 4.5) / 2, ry: g.yaw, sx: g.width, sy: STEPS * STEP_H + 4.5, sz: 0.4 });
  }
  return { steps, roofs, crowd };
})();

const TREE_PARTS = (() => {
  const greens = ["#2f5a2c", "#3b6b33", "#284d26", "#46773a"];
  return {
    trunks: TREES.map((t) => ({ x: t.x, y: 1.2 * t.s, z: t.z, sx: t.s, sy: t.s, sz: t.s })),
    tops: TREES.map((t, i) => ({
      x: t.x,
      y: (2.4 + 3) * t.s,
      z: t.z,
      ry: i,
      sx: t.s,
      sy: t.s,
      sz: t.s,
      color: greens[i % greens.length],
    })),
  };
})();

const GANTRY_PARTS = (() => {
  const posts: { x: number; y: number; z: number; ry: number }[] = [];
  const beams: { x: number; y: number; z: number; ry: number }[] = [];
  CHECKPOINTS.forEach((i) => {
    const s = samples[i];
    const ry = headingAt(i);
    for (const side of [1, -1]) {
      const off = side * (HALF_WIDTH + 3);
      posts.push({ x: s.x + s.nx * off, y: 4.5, z: s.z + s.nz * off, ry });
    }
    beams.push({ x: s.x, y: 9, z: s.z, ry });
  });
  return { posts, beams };
})();

// ---------------------------------------------------------------------------

function Road() {
  const road = useMemo(() => ribbon([[HALF_WIDTH, -HALF_WIDTH]], 0.02), []);
  const lines = useMemo(
    () =>
      ribbon(
        [
          [HALF_WIDTH - 0.35, HALF_WIDTH - 0.7],
          [-(HALF_WIDTH - 0.7), -(HALF_WIDTH - 0.35)],
        ],
        0.03,
      ),
    [],
  );
  return (
    <group>
      <mesh geometry={road}>
        <meshLambertMaterial color="#2a2c31" polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      <mesh geometry={lines}>
        <meshLambertMaterial color="#d9dce2" polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
    </group>
  );
}

function StartLine() {
  const tex = useMemo(() => chequerTexture(16, 2), []);
  const s = samples[0];
  return (
    <group position={[s.x, 0.04, s.z]} rotation={[0, headingAt(0), 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HALF_WIDTH * 2, 2]} />
        <meshLambertMaterial map={tex} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
      </mesh>
      {/* grid slots behind the line */}
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} rotation={[-Math.PI / 2, 0, 0]} position={[k % 2 ? -3 : 3, 0, -10 - k * 8]}>
          <planeGeometry args={[3, 0.3]} />
          <meshBasicMaterial color="#d9dce2" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
        </mesh>
      ))}
    </group>
  );
}

function Kerbs() {
  const ref = useInstances(KERBS);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, KERBS.length]}>
      <boxGeometry args={[KERB_WIDTH, 0.08, 1]} />
      <meshLambertMaterial />
    </instancedMesh>
  );
}

function Gantries() {
  const posts = useInstances(GANTRY_PARTS.posts);
  const beams = useInstances(GANTRY_PARTS.beams);
  const boards = useMemo(() => story.map((ch) => gantryTexture(ch.lap, ch.place, ch.title)), []);
  return (
    <group>
      <instancedMesh ref={posts} args={[undefined, undefined, GANTRY_PARTS.posts.length]}>
        <boxGeometry args={[0.5, 9, 0.5]} />
        <meshLambertMaterial color="#3a3f48" />
      </instancedMesh>
      <instancedMesh ref={beams} args={[undefined, undefined, GANTRY_PARTS.beams.length]}>
        <boxGeometry args={[HALF_WIDTH * 2 + 7, 0.6, 0.6]} />
        <meshLambertMaterial color="#3a3f48" />
      </instancedMesh>
      {CHECKPOINTS.map((i, k) => {
        const s = samples[i];
        return (
          <group key={i} position={[s.x, 9 + 2.2, s.z]} rotation={[0, headingAt(i) + Math.PI, 0]}>
            <mesh position={[0, 0, -0.12]}>
              <boxGeometry args={[14.4, 3.8, 0.2]} />
              <meshLambertMaterial color="#0f1115" />
            </mesh>
            <mesh>
              <planeGeometry args={[14, 3.5]} />
              <meshBasicMaterial map={boards[k]} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Grandstands() {
  const steps = useInstances(STAND_PARTS.steps);
  const roofs = useInstances(STAND_PARTS.roofs);
  const crowd = useInstances(STAND_PARTS.crowd);
  return (
    <group>
      <instancedMesh ref={steps} args={[undefined, undefined, STAND_PARTS.steps.length]}>
        <boxGeometry />
        <meshLambertMaterial color="#5b616d" />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[undefined, undefined, STAND_PARTS.roofs.length]}>
        <boxGeometry />
        <meshLambertMaterial color="#1c2027" />
      </instancedMesh>
      <instancedMesh ref={crowd} args={[undefined, undefined, STAND_PARTS.crowd.length]}>
        <boxGeometry args={[0.6, 0.9, 0.5]} />
        <meshLambertMaterial />
      </instancedMesh>
    </group>
  );
}

function Trees() {
  const trunks = useInstances(TREE_PARTS.trunks);
  const tops = useInstances(TREE_PARTS.tops);
  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, TREES.length]}>
        <cylinderGeometry args={[0.25, 0.4, 2.4, 5]} />
        <meshLambertMaterial color="#4a3526" />
      </instancedMesh>
      <instancedMesh ref={tops} args={[undefined, undefined, TREES.length]}>
        <coneGeometry args={[2.4, 6, 6]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
    </group>
  );
}

export function Track() {
  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 40]}>
        <planeGeometry args={[2400, 2400]} />
        <meshLambertMaterial color="#2b4227" />
      </mesh>
      <Road />
      <StartLine />
      <Kerbs />
      <Gantries />
      <Grandstands />
      <Trees />
    </group>
  );
}
