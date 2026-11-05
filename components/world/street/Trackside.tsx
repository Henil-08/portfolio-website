"use client";

import { useFrame } from "@react-three/fiber";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { heightAt } from "../terrain";
import { C } from "../palette";
import { geo, mat, unitBox, unitCyl } from "../models/props/shared";
import { BARRIER_H, compose, rng, yawOf } from "./common";
import { Instances } from "./Instances";
import { BOARDS, FENCES, FENCE_H, FLAG_SPOTS as FLAG_AT, MARSHALS } from "./layoutStreet";
import { STAND_SPOTS } from "./standSpots";
import { boardTexture, loadBoardFonts } from "./boardArt";
import { K, debrisFenceMat, km } from "./ink";
import { BuiltInstances } from "../kit/builtInstances";
import { STAND_GAME, STAND_SCALE, STAND_Z, grandstandFrame, grandstandParts, marshalParts, standSeats } from "../kit/builtTrackside";
import { WORLD_SCALE } from "../scale";

// ------------------------------------------------------------ painted parts (one draw call)

const col = (c: string) => new THREE.Color(c);
const ORANGE = col(K.orange);
const CONCRETE_DARK = col(K.concreteDark);
const PAPER = col(K.paper);
const KINK = col(K.ink);

// a restrained crowd: paper, ink and greys (the marshals wear the orange)
const SHIRTS = [K.paper, K.paper, K.paper, K.ink, K.ink, K.graphite, K.concrete, K.concreteDark, "#4d5a61"].map(col);
const SKINS = [C.skin, C.skinShade, "#e3b48f", "#a8714f", "#7c5038"].map(col);

// grandstands: the game's stand (STAND_GAME at STAND_SCALE, as props/Grandstand), its front at FRONT
const W = (STAND_GAME.w ?? 13.3) * STAND_SCALE;
const FRONT = grandstandFrame(STAND_GAME).front * STAND_SCALE + STAND_Z;
const BACK = grandstandFrame(STAND_GAME).back * STAND_SCALE + STAND_Z - 0.3;
const SEATS = standSeats(STAND_GAME);
/** The marshal post at the world's scale (../scale.ts): 1.9 x 2.2 x 1.5 m. */
const MARSHAL_SCALE = WORLD_SCALE;
/**
 * The figures: a capsule body and a head, 0.74 m from the origin to the crown. A seated fan's
 * crown is a real 0.9 m above the seat, a standing marshal a real 1.75 m tall, at the world's scale.
 */
const FAN = (0.9 * WORLD_SCALE) / 0.74;
const STANDING = (1.75 * WORLD_SCALE) / 0.74;
const MARSHAL_MATRICES = MARSHALS.map((m) => compose(m.x, heightAt(m.x, m.z), m.z, m.yaw, MARSHAL_SCALE, MARSHAL_SCALE, MARSHAL_SCALE));
const STAND_MATRICES = STAND_SPOTS.map((s) => compose(s.x, heightAt(s.x, s.z), s.z, s.yaw).multiply(new THREE.Matrix4().compose(new THREE.Vector3(0, s.raise, STAND_Z), new THREE.Quaternion(), new THREE.Vector3(STAND_SCALE, STAND_SCALE, STAND_SCALE))));

type Put = (x: number, y: number, z: number, sx: number, sy: number, sz: number, c: THREE.Color, rx?: number) => void;

function placer(list: { m: THREE.Matrix4[]; c: THREE.Color[] }, x0: number, z0: number, yaw: number): Put {
  const root = compose(x0, heightAt(x0, z0), z0, yaw);
  return (x, y, z, sx, sy, sz, c, rx = 0) => {
    list.m.push(root.clone().multiply(compose(x, y, z, 0, sx, sy, sz, rx)));
    list.c.push(c);
  };
}

const PAINT = (() => {
  const paint = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const bodies = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const heads = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const r = rng(91);

  // ---- grandstands: the approved model (kit/builtTrackside.tsx) instanced below; here the
  // podium under a raised stand and the crowd on its seats
  for (const s of STAND_SPOTS) {
    const put = placer(paint, s.x, s.z, s.yaw);
    const R = s.raise;
    if (R > 0) {
      // podium: a darker concrete plinth with a glazed concourse band
      put(0, R / 2, (FRONT + BACK) / 2, W + 0.8, R, FRONT - BACK + 0.2, CONCRETE_DARK);
      put(0, R * 0.45, FRONT + 0.11, W - 0.6, R * 0.5, 0.02, col(K.glass));
    }
    const pb = placer(bodies, s.x, s.z, s.yaw);
    const ph = placer(heads, s.x, s.z, s.yaw);
    for (const [x, y, z] of SEATS) {
      if (r() < 0.1) continue;
      const sc = (0.95 + r() * 0.1) * FAN;
      pb(x * STAND_SCALE, R + y * STAND_SCALE, z * STAND_SCALE + STAND_Z, sc, sc, sc, SHIRTS[Math.floor(r() * SHIRTS.length)]);
      ph(x * STAND_SCALE, R + y * STAND_SCALE, z * STAND_SCALE + STAND_Z, sc, sc, sc, SKINS[Math.floor(r() * SKINS.length)]);
    }
  }

  // ---- sponsor boards on two legs at the edge of the run-off (local +Z faces the road)
  for (const b of BOARDS) {
    const put = placer(paint, b.x, b.z, b.yaw);
    put(0, BARRIER_H + 0.42, -0.05, 4.2, 0.84, 0.1, KINK);
    put(0, BARRIER_H + 0.44, 0.005, 4.04, 0.66, 0.02, PAPER);
    for (const sx of [-1.7, 1.7]) put(sx, (BARRIER_H + 0.1) / 2, -0.08, 0.1, BARRIER_H + 0.1, 0.1, KINK);
  }

  // ---- marshal posts: the approved post (kit/builtTrackside.tsx) instanced below; here
  // the pad in front and two marshals in orange
  for (const m of MARSHALS) {
    const put = placer(paint, m.x, m.z, m.yaw);
    const k = MARSHAL_SCALE;
    // the pad in front (a real 3.25 x 1.25 m slab) and two marshals on it
    put(0, 0.05, 1.81 * k, 3.25 * k, 0.1, 1.25 * k, CONCRETE_DARK);
    const pb = placer(bodies, m.x, m.z, m.yaw);
    const ph = placer(heads, m.x, m.z, m.yaw);
    for (const sx of [-0.62, 0.56]) {
      pb(sx * k, 0.1, 1.7 * k, STANDING, STANDING, STANDING, ORANGE);
      ph(sx * k, 0.1, 1.7 * k, STANDING, STANDING, STANDING, SKINS[Math.floor(r() * SKINS.length)]);
    }
  }
  return { paint, bodies, heads };
})();

const bodyGeo = () =>
  geo("street-fan-body", () => {
    const g = new THREE.CapsuleGeometry(0.15, 0.2, 3, 8);
    g.translate(0, 0.25, 0);
    return g;
  });
const headGeo = () =>
  geo("street-fan-head", () => {
    const g = new THREE.SphereGeometry(0.12, 10, 7);
    g.translate(0, 0.62, 0);
    return g;
  });

// ------------------------------------------------------------ catch fence (the W04 debris fence: ink wire on ink posts)

/** A catch fence in front of each stand, between the crowd and the road. */
const STAND_FENCES = STAND_SPOTS.map((s) => {
  const c = Math.cos(s.yaw);
  const sn = Math.sin(s.yaw);
  const pts: THREE.Vector3[] = [];
  for (let lx = -W / 2 - 1; lx <= W / 2 + 1.01; lx += (W + 2) / 8) {
    const lz = FRONT + 0.9;
    pts.push(new THREE.Vector3(s.x + lx * c + lz * sn, 0, s.z - lx * sn + lz * c));
  }
  return { pts };
});

const FENCE = (() => {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const posts = { m: [] as THREE.Matrix4[] };
  const rails = { m: [] as THREE.Matrix4[] };
  const y0 = 0.15;
  for (const run of [...FENCES, ...STAND_FENCES]) {
    let acc = 0;
    const base = pos.length / 3;
    run.pts.forEach((p, i) => {
      if (i > 0) acc += p.distanceTo(run.pts[i - 1]);
      pos.push(p.x, y0, p.z, p.x, FENCE_H, p.z);
      uv.push(acc / 0.5, 0, acc / 0.5, (FENCE_H - y0) / 0.5);
      if (i > 0) {
        const k = base + (i - 1) * 2;
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
        const q = run.pts[i - 1];
        const len = p.distanceTo(q);
        const yaw = Math.atan2(-(p.z - q.z), p.x - q.x);
        for (const y of [FENCE_H]) rails.m.push(compose((p.x + q.x) / 2, heightAt((p.x + q.x) / 2, (p.z + q.z) / 2) + y, (p.z + q.z) / 2, yaw, len + 0.04, 0.06, 0.06));
      }
      if (i % 2 === 0 || i === run.pts.length - 1) posts.m.push(compose(p.x, heightAt(p.x, p.z) + (FENCE_H + 0.3) / 2, p.z, 0, 0.08, FENCE_H + 0.3, 0.08));
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { g, posts, rails };
})();

// ------------------------------------------------------------ flags

export const flagUniforms = { uTime: { value: 0 } };
const FW = 1.5;
const FH = 0.95;
const POLE = 6.2;

const flagGeo = () =>
  geo("street-flag", () => {
    const g = new THREE.PlaneGeometry(FW, FH, 10, 4);
    g.translate(FW / 2, 0, 0);
    return g;
  });
const flagMat = (() => {
  const m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.65, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = flagUniforms.uTime;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        {
          float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.3;
          float k = position.x / ${FW.toFixed(2)};
          float t = uTime * 3.0 + ph;
          transformed.z += sin(position.x * 3.0 - t + position.y * 0.8) * 0.17 * k;
          transformed.y += -k * k * 0.07 + sin(position.x * 2.0 - t * 0.7) * 0.03 * k;
        }`
      );
  };
  m.customProgramCacheKey = () => "street-flag-v1";
  return m;
})();

/** The flags where layoutStreet.ts placed them, in turn orange, paper and ink. */
const FLAG_SPOTS = (() => {
  const cols = [ORANGE, PAPER, KINK, PAPER, KINK, PAPER];
  return FLAG_AT.map((s, i) => ({ x: s.x, z: s.z, c: cols[i % cols.length] }));
})();

const FLAGS = (() => {
  const poles = { m: [] as THREE.Matrix4[] };
  const feet = { m: [] as THREE.Matrix4[] };
  const cloth = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  // the wind blows across the camera's view so the cloth reads broadside
  const yaw = yawOf(-1, 1);
  for (const f of FLAG_SPOTS) {
    const fy = heightAt(f.x, f.z);
    poles.m.push(compose(f.x, fy + POLE / 2, f.z, 0, 0.045, POLE, 0.045));
    feet.m.push(compose(f.x, fy + 0.06, f.z, 0, 0.22, 0.12, 0.22));
    cloth.m.push(compose(f.x + 0.04, fy + POLE - FH / 2 - 0.1, f.z, yaw));
    cloth.c.push(f.c);
  }
  return { poles, feet, cloth };
})();

// ------------------------------------------------------------ printed boards

const BOARD_W = 4.04;
const BOARD_H = 0.66;
const FASCIA_H = 0.5;

/** "HG-08" and "08" are codes, so they set in mono; words in sans. */
const parts = (text: string) => text.split("   ").map((t) => ({ text: t, mono: /^(HG-08|08)$/.test(t) }));

const boardPlane = () => geo("street-board-plane", () => new THREE.PlaneGeometry(1, 1));

/**
 * Sponsor boards and the named stands' fascias: one canvas texture per text, drawn once the
 * Plex fonts are in. Nothing shows until then (the white face is painted underneath).
 */
function Boards() {
  const [mats, setMats] = useState<Map<string, THREE.MeshStandardMaterial> | null>(null);
  useEffect(() => {
    let dead = false;
    const made = new Map<string, THREE.MeshStandardMaterial>();
    void loadBoardFonts().then((fonts) => {
      if (dead) return;
      const add = (key: string, w: number, h: number) => {
        if (!made.has(key)) made.set(key, new THREE.MeshStandardMaterial({ map: boardTexture(parts(key), w, h, fonts), roughness: 0.55, metalness: 0.02 }));
      };
      for (const b of BOARDS) add(b.text, BOARD_W, BOARD_H);
      for (const s of STAND_SPOTS) if (s.label) add(`HG-08   ${s.label}`, W - 0.6, FASCIA_H);
      setMats(made);
    });
    return () => {
      dead = true;
      for (const m of made.values()) {
        m.map?.dispose();
        m.dispose();
      }
    };
  }, []);
  if (!mats) return null;
  return (
    <>
      {BOARDS.map((b, i) => (
        <group key={i} position={[b.x, heightAt(b.x, b.z) + BARRIER_H + 0.44, b.z]} rotation={[0, b.yaw, 0]}>
          <mesh geometry={boardPlane()} material={mats.get(b.text)} position={[0, 0, 0.02]} scale={[BOARD_W, BOARD_H, 1]} />
        </group>
      ))}
      {STAND_SPOTS.filter((s) => s.label).map((s, i) => (
        <group key={i} position={[s.x, heightAt(s.x, s.z), s.z]} rotation={[0, s.yaw, 0]}>
          <mesh geometry={boardPlane()} material={mats.get(`HG-08   ${s.label}`)} position={[0, s.raise + 0.34, FRONT + 0.02]} scale={[W - 0.6, FASCIA_H, 1]} />
        </group>
      ))}
    </>
  );
}

// ------------------------------------------------------------ component

export function Trackside() {
  const fenceMat = useMemo(() => debrisFenceMat(), []);
  useFrame(({ clock }) => {
    flagUniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <>
      <BuiltInstances parts={grandstandParts(STAND_GAME)} matrices={STAND_MATRICES} />
      <BuiltInstances parts={marshalParts()} matrices={MARSHAL_MATRICES} />
      <Instances geometry={unitBox()} material={km.painted()} batch={PAINT.paint} />
      <Instances geometry={bodyGeo()} material={mat(C.white, { r: 0.45 })} batch={PAINT.bodies} />
      <Instances geometry={headGeo()} material={mat(C.white, { r: 0.45 })} batch={PAINT.heads} shadow={false} />

      {/* catch fence */}
      <mesh geometry={FENCE.g} material={fenceMat} />
      <Instances geometry={unitBox()} material={km.ink()} batch={FENCE.posts} />
      <Instances geometry={unitBox()} material={km.ink()} batch={FENCE.rails} shadow={false} />

      {/* flags */}
      <Instances geometry={unitCyl()} material={mat(C.metal, { r: 0.3, m: 0.5 })} batch={FLAGS.poles} />
      <Instances geometry={unitCyl()} material={mat(C.ink, { r: 0.45, m: 0.2 })} batch={FLAGS.feet} shadow={false} />
      <Instances geometry={flagGeo()} material={flagMat} batch={FLAGS.cloth} />

      <Boards />

      <RigidBody type="fixed" colliders={false}>
        {STAND_SPOTS.map((s, i) => {
          const c = Math.cos(s.yaw);
          const sn = Math.sin(s.yaw);
          const lz = (FRONT + BACK) / 2;
          return (
            <CuboidCollider
              key={i}
              args={[W / 2 + 0.2, (2.4 + s.raise) / 2, (FRONT - BACK) / 2]}
              position={[s.x + lz * sn, heightAt(s.x, s.z) + (2.4 + s.raise) / 2, s.z + lz * c]}
              rotation={[0, s.yaw, 0]}
            />
          );
        })}
        {MARSHALS.map((m, i) => (
          <CuboidCollider key={i} args={[1.45 * MARSHAL_SCALE, 1.63 * MARSHAL_SCALE, 1.15 * MARSHAL_SCALE]} position={[m.x, heightAt(m.x, m.z) + 1.63 * MARSHAL_SCALE, m.z]} rotation={[0, m.yaw, 0]} />
        ))}
        {FLAG_SPOTS.map((f, i) => (
          <CylinderCollider key={i} args={[1, 0.12]} position={[f.x, heightAt(f.x, f.z) + 1, f.z]} />
        ))}
      </RigidBody>
    </>
  );
}
