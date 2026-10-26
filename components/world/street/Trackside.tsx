"use client";

import { useFrame } from "@react-three/fiber";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { heightAt } from "../terrain";
import { C } from "../palette";
import { geo, mat, unitBox, unitCyl } from "../models/props/shared";
import { BARRIER_H, compose, farSpot, inSectorScene, nearPlace, nearTree, rng, yawOf } from "./common";
import { Instances } from "./Instances";
import { BOARDS, FENCES, FENCE_H, MARSHALS } from "./layoutStreet";
import { STAND_SPOTS } from "./standSpots";
import { lensMat } from "./Floodlights";
import { boardTexture, loadBoardFonts } from "./boardArt";
import { K, debrisFenceMat, km } from "./ink";

// ------------------------------------------------------------ painted parts (one draw call)

const col = (c: string) => new THREE.Color(c);
const WHITE = col(C.white);
const ORANGE = col(K.orange);
const CONCRETE = col(K.concrete);
const CONCRETE_DARK = col(K.concreteDark);
const PAPER = col(K.paper);
const GRAPHITE = col(K.graphite);
const KINK = col(K.ink);

// a restrained crowd: paper, ink and greys (the marshals wear the orange)
const SHIRTS = [K.paper, K.paper, K.paper, K.ink, K.ink, K.graphite, K.concrete, K.concreteDark, "#4d5a61"].map(col);
const SKINS = [C.skin, C.skinShade, "#e3b48f", "#a8714f", "#7c5038"].map(col);

// grandstand dimensions, matched to props/Grandstand
const W = 10;
const ROWS = 4;
const STEP_H = 0.5;
const STEP_D = 0.95;
const Z0 = 1.6;
const PER_ROW = 16;

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
  const steel = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const glow = { m: [] as THREE.Matrix4[] };
  const bodies = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const heads = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const r = rng(91);

  // ---- grandstands (W06): concrete tiers, graphite seats with one paper row, an ink frame
  // and cantilever roof with a paper fascia, a darker concrete back wall
  for (const s of STAND_SPOTS) {
    const put = placer(paint, s.x, s.z, s.yaw);
    const pst = placer(steel, s.x, s.z, s.yaw);
    const R = s.raise;
    const backZ = Z0 - ROWS * STEP_D;
    const roofY = R + ROWS * STEP_H + 2.7;
    const ROOF_TILT = 0.12;
    if (R > 0) {
      // podium: a darker concrete plinth with a glazed concourse band
      put(0, R / 2, Z0 - (ROWS * STEP_D) / 2 - 0.1, W + 0.8, R, ROWS * STEP_D + 0.9, CONCRETE_DARK);
      put(0, R * 0.45, Z0 + 0.36, W - 0.6, R * 0.5, 0.02, col(K.glass));
    }
    for (let row = 0; row < ROWS; row++) {
      const h = (row + 1) * STEP_H;
      put(0, R + h / 2, Z0 - row * STEP_D - STEP_D / 2, W, h, STEP_D + 0.02, CONCRETE);
      put(0, R + h + 0.16, Z0 - row * STEP_D - STEP_D * 0.62, W - 0.6, 0.32, 0.4, row === 2 ? PAPER : GRAPHITE);
    }
    if (s.open) {
      // back to the camera: the back wall stops at the top tier, the frame posts carry the roof
      const top = R + ROWS * STEP_H + 0.3;
      put(0, top / 2, backZ - 0.12, W + 0.4, top, 0.25, CONCRETE_DARK);
    } else {
      put(0, roofY / 2, backZ - 0.12, W + 0.4, roofY, 0.25, CONCRETE_DARK);
    }
    // side walls in concrete
    for (const sx of [-1, 1]) put(sx * (W / 2 + 0.06), R + (ROWS * STEP_H + 0.4) / 2, Z0 - (ROWS * STEP_D) / 2 + 0.1, 0.12, ROWS * STEP_H + 0.4, ROWS * STEP_D + 0.4, CONCRETE);
    put(0, R + 0.25, Z0 + 0.1, W, 0.5, 0.08, CONCRETE);
    // named stands carry a printed board on the front (Boards below); the rest an ink line
    if (!s.label) put(0, R + 0.47, Z0 + 0.145, W, 0.05, 0.01, KINK);
    // the ink frame: three posts at the back, a beam over each, the roof slab and a paper fascia
    const span = roofY - R;
    for (const sx of [-W / 2 + 0.3, 0, W / 2 - 0.3]) {
      pst(sx, R + span / 2, backZ - 0.2, 0.25, span, 0.25, KINK);
      pst(sx, roofY - 0.12, backZ + 1.3, 0.2, 0.25, 3.2, KINK, -ROOF_TILT);
    }
    pst(0, roofY + 0.05, backZ + 1.3, W + 0.6, 0.18, 3.4, KINK, -ROOF_TILT);
    put(0, roofY + 0.06, backZ + 3.0, W + 0.6, 0.5, 0.1, PAPER, -ROOF_TILT);
    const g = placer({ m: glow.m, c: [] }, s.x, s.z, s.yaw);
    g(0, roofY - 0.1, backZ + 2.4, W, 0.02, 0.1, WHITE);
    // crowd
    const pb = placer(bodies, s.x, s.z, s.yaw);
    const ph = placer(heads, s.x, s.z, s.yaw);
    for (let row = 0; row < ROWS; row++)
      for (let i = 0; i < PER_ROW; i++) {
        if (r() < 0.1) continue;
        const x = -W / 2 + 0.45 + (i + 0.5) * ((W - 0.9) / PER_ROW);
        const y = R + (row + 1) * STEP_H;
        const z = Z0 - row * STEP_D - STEP_D * 0.45;
        const sc = 0.95 + r() * 0.1;
        pb(x, y, z, sc, sc, sc, SHIRTS[Math.floor(r() * SHIRTS.length)]);
        ph(x, y, z, sc, sc, sc, SKINS[Math.floor(r() * SKINS.length)]);
      }
  }

  // ---- sponsor boards on two legs at the edge of the run-off (local +Z faces the road)
  for (const b of BOARDS) {
    const put = placer(paint, b.x, b.z, b.yaw);
    put(0, BARRIER_H + 0.42, -0.05, 4.2, 0.84, 0.1, KINK);
    put(0, BARRIER_H + 0.44, 0.005, 4.04, 0.66, 0.02, PAPER);
    for (const sx of [-1.7, 1.7]) put(sx, (BARRIER_H + 0.1) / 2, -0.08, 0.1, BARRIER_H + 0.1, 0.1, KINK);
  }

  // ---- marshal posts: concrete booth, thin ink roof, glazed front, two marshals in orange
  for (const m of MARSHALS) {
    const put = placer(paint, m.x, m.z, m.yaw);
    put(0, 1.1, 0, 1.9, 2.2, 1.5, CONCRETE);
    put(0, 1.55, 0.755, 1.6, 0.62, 0.02, col(K.glass));
    put(0, 2.28, 0.05, 2.2, 0.14, 1.8, KINK);
    put(0, 0.05, 1.3, 2.6, 0.1, 1.2, CONCRETE_DARK);
    put(0.95, 2.6, 0.6, 0.05, 0.6, 0.05, KINK);
    put(1.25, 2.75, 0.6, 0.55, 0.36, 0.02, col(C.yellow));
    const pb = placer(bodies, m.x, m.z, m.yaw);
    const ph = placer(heads, m.x, m.z, m.yaw);
    for (const sx of [-0.5, 0.45]) {
      pb(sx, 0.1, 1.35, 1.1, 1.1, 1.1, ORANGE);
      ph(sx, 0.1, 1.35, 1.1, 1.1, 1.1, SKINS[Math.floor(r() * SKINS.length)]);
    }
  }
  return { paint, steel, glow, bodies, heads };
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
    const lz = Z0 + 1.3;
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

const FLAG_SPOTS = (() => {
  const out: { x: number; z: number; c: THREE.Color }[] = [];
  const cols = [ORANGE, PAPER, KINK, PAPER, KINK, PAPER];
  // along the far side of the tunnel straight, the loop and the west
  for (const u of [0.45, 0.47, 0.56, 0.6, 0.81, 0.836, 0.335]) {
    const s = farSpot(u, 6.6);
    if (inSectorScene(s.x, s.z, 1) || nearPlace(s.x, s.z, 0) || nearTree(s.x, s.z, 1)) continue;
    if (STAND_SPOTS.some((st) => Math.hypot(st.x - s.x, st.z - s.z) < 5.5)) continue;
    out.push({ x: s.x, z: s.z, c: cols[out.length % cols.length] });
  }
  return out;
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
      for (const s of STAND_SPOTS) if (s.label) add(`HG-08   ${s.label}`, W, FASCIA_H);
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
          <mesh geometry={boardPlane()} material={mats.get(`HG-08   ${s.label}`)} position={[0, s.raise + FASCIA_H / 2, Z0 + 0.15]} scale={[W, FASCIA_H, 1]} />
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
      <Instances geometry={unitBox()} material={km.painted()} batch={PAINT.paint} />
      <Instances geometry={unitBox()} material={mat("#ffffff", { r: 0.55, m: 0.2 })} batch={PAINT.steel} />
      <Instances geometry={unitBox()} material={lensMat} batch={PAINT.glow} shadow={false} />
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
          const lz = -0.3 - (s.raise > 0 ? 0.1 : 0);
          return (
            <CuboidCollider
              key={i}
              args={[5.4, (2.4 + s.raise) / 2, 2.4]}
              position={[s.x + lz * sn, heightAt(s.x, s.z) + (2.4 + s.raise) / 2, s.z + lz * c]}
              rotation={[0, s.yaw, 0]}
            />
          );
        })}
        {MARSHALS.map((m, i) => (
          <CuboidCollider key={i} args={[0.95, 1.1, 0.75]} position={[m.x, heightAt(m.x, m.z) + 1.1, m.z]} rotation={[0, m.yaw, 0]} />
        ))}
        {FLAG_SPOTS.map((f, i) => (
          <CylinderCollider key={i} args={[1, 0.12]} position={[f.x, heightAt(f.x, f.z) + 1, f.z]} />
        ))}
      </RigidBody>
    </>
  );
}
