"use client";

import { useFrame } from "@react-three/fiber";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { C } from "../palette";
import { geo, mat, unitBox, unitCyl } from "../models/props/shared";
import { Label } from "../models/props/Label";
import { BARRIER_H, compose, farSpot, frameAt, inSectorScene, nearPlace, nearTree, rng, yawOf } from "./common";
import { Instances } from "./Instances";
import { BOARDS, FENCES, FENCE_H, MARSHALS } from "./layoutStreet";
import { STAND_SPOTS } from "./standSpots";
import { lensMat } from "./Lamps";

// ------------------------------------------------------------ painted parts (one draw call)

const col = (c: string) => new THREE.Color(c);
const WHITE = col(C.white);
const INK = col(C.ink);
const RED = col(C.red);
const GREY = col(C.greyDark);
const LIGHT = col(C.greyLight);
const CHAR = col(C.charcoal);
const ORANGE = col(C.orange);

const SHIRTS = [C.red, C.red, C.white, C.white, C.white, C.charcoal, C.charcoal, C.greyLight, C.grey, C.redDark].map(col);
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
  const root = compose(x0, 0, z0, yaw);
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

  // ---- grandstands
  for (const s of STAND_SPOTS) {
    const put = placer(paint, s.x, s.z, s.yaw);
    const pst = placer(steel, s.x, s.z, s.yaw);
    const R = s.raise;
    const backZ = Z0 - ROWS * STEP_D;
    const roofY = R + ROWS * STEP_H + 2.7;
    if (R > 0) {
      // podium: charcoal plinth with a glazed concourse band and a white lip
      put(0, R / 2, Z0 - (ROWS * STEP_D) / 2 - 0.1, W + 0.8, R, ROWS * STEP_D + 0.9, CHAR);
      put(0, R * 0.45, Z0 + 0.36, W - 0.6, R * 0.5, 0.02, INK);
      put(0, R - 0.06, Z0 + 0.38, W + 0.82, 0.14, 0.06, WHITE);
    }
    for (let row = 0; row < ROWS; row++) {
      const h = (row + 1) * STEP_H;
      put(0, R + h / 2, Z0 - row * STEP_D - STEP_D / 2, W, h, STEP_D + 0.02, WHITE);
      put(0, R + h + 0.04, Z0 - row * STEP_D - STEP_D * 0.62, W - 0.3, 0.1, 0.36, row === ROWS - 1 ? RED : GREY);
    }
    put(0, roofY / 2, backZ - 0.12, W + 0.4, roofY, 0.25, INK);
    put(0, roofY - 0.6, backZ - 0.12, W + 0.42, 0.18, 0.26, RED);
    for (const sx of [-1, 1]) put(sx * (W / 2 + 0.06), R + (ROWS * STEP_H + 0.4) / 2, Z0 - (ROWS * STEP_D) / 2 + 0.1, 0.12, ROWS * STEP_H + 0.4, ROWS * STEP_D + 0.4, WHITE);
    put(0, R + 0.25, Z0 + 0.1, W, 0.5, 0.08, WHITE);
    put(-W / 2 + 0.6, R + 0.25, Z0 + 0.105, 1.2, 0.5, 0.08, RED);
    put(0, R + 0.03, Z0 + 0.105, W, 0.03, 0.09, RED);
    // cantilever roof
    for (const sx of [-1, 1]) pst(sx * (W / 2 + 0.1), (roofY - R) / 2 + R, backZ + 0.1, 0.14, roofY - R, 0.14, LIGHT);
    put(0, roofY, backZ + 1.2, W + 1, 0.14, 2.8, WHITE, -0.1);
    put(0, roofY - 0.13, backZ + 2.58, W + 1.02, 0.2, 0.06, RED, -0.1);
    const g = placer({ m: glow.m, c: [] }, s.x, s.z, s.yaw);
    g(0, roofY - 0.1, backZ + 2.1, W, 0.02, 0.1, WHITE);
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

  // ---- sponsor boards on top of the far barrier (local +Z faces the road)
  for (const b of BOARDS) {
    const put = placer(paint, b.x, b.z, b.yaw);
    const face = b.text === "DRS ZONE" ? INK : b.text === "BOX BOX" ? RED : WHITE;
    put(0, BARRIER_H + 0.42, -0.05, 4.2, 0.84, 0.1, CHAR);
    put(0, BARRIER_H + 0.44, 0.005, 4.04, 0.66, 0.02, face);
    put(0, BARRIER_H + 0.16, 0.006, 4.04, 0.08, 0.022, face === RED ? WHITE : RED);
    for (const sx of [-1.7, 1.7]) put(sx, BARRIER_H + 0.02, -0.08, 0.12, 0.08, 0.3, CHAR);
  }

  // ---- marshal posts: white booth, red roof, glazed front, two marshals in orange
  for (const m of MARSHALS) {
    const put = placer(paint, m.x, m.z, m.yaw);
    put(0, 1.1, 0, 1.9, 2.2, 1.5, WHITE);
    put(0, 1.55, 0.755, 1.6, 0.62, 0.02, INK);
    put(0, 2.3, 0.05, 2.2, 0.18, 1.8, RED);
    put(0, 0.05, 1.3, 2.6, 0.1, 1.2, LIGHT);
    put(0.95, 2.6, 0.6, 0.05, 0.6, 0.05, CHAR);
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

// ------------------------------------------------------------ catch fence

function meshTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = "#fff";
  g.lineWidth = 3;
  for (let k = -64; k <= 64; k += 32) {
    g.beginPath();
    g.moveTo(k, 0);
    g.lineTo(k + 64, 64);
    g.stroke();
    g.beginPath();
    g.moveTo(k + 64, 0);
    g.lineTo(k, 64);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

const FENCE = (() => {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const posts = { m: [] as THREE.Matrix4[] };
  const rails = { m: [] as THREE.Matrix4[] };
  const y0 = 0.15;
  for (const run of FENCES) {
    let acc = 0;
    const base = pos.length / 3;
    run.pts.forEach((p, i) => {
      if (i > 0) acc += p.distanceTo(run.pts[i - 1]);
      pos.push(p.x, y0, p.z, p.x, FENCE_H, p.z);
      uv.push(acc / 0.9, 0, acc / 0.9, (FENCE_H - y0) / 0.9);
      if (i > 0) {
        const k = base + (i - 1) * 2;
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
        const q = run.pts[i - 1];
        const len = p.distanceTo(q);
        const yaw = Math.atan2(-(p.z - q.z), p.x - q.x);
        for (const y of [FENCE_H, 1.2]) rails.m.push(compose((p.x + q.x) / 2, y, (p.z + q.z) / 2, yaw, len + 0.04, 0.06, 0.06));
      }
      if (i % 2 === 0 || i === run.pts.length - 1) posts.m.push(compose(p.x, (FENCE_H + 0.3) / 2, p.z, 0, 0.06, FENCE_H + 0.3, 0.06));
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { g, posts, rails };
})();

function makeFenceMat() {
  return new THREE.MeshStandardMaterial({
    color: C.greyDark,
    alphaMap: meshTexture(),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    side: THREE.DoubleSide,
    roughness: 0.5,
    metalness: 0.4,
  });
}

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
  const cols = [RED, WHITE, CHAR, WHITE, RED, WHITE];
  // a line of flags behind the pit-straight stands
  for (let i = 0; i < 6; i++) out.push({ x: -13.5 + i * 5.4, z: 11.6, c: cols[i % cols.length] });
  // and along the far side of the back straight / west
  for (const u of [0.605, 0.637, 0.668, 0.81, 0.836, 0.405, 0.335]) {
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
    poles.m.push(compose(f.x, POLE / 2, f.z, 0, 0.045, POLE, 0.045));
    feet.m.push(compose(f.x, 0.06, f.z, 0, 0.22, 0.12, 0.22));
    cloth.m.push(compose(f.x + 0.04, POLE - FH / 2 - 0.1, f.z, yaw));
    cloth.c.push(f.c);
  }
  return { poles, feet, cloth };
})();

// ------------------------------------------------------------ road paint: DRS zone on the main straight

const TOWARD_CAMERA = new THREE.Vector3(1, 0, 1).normalize();
function groundQuat(tan: THREE.Vector3) {
  const x = tan.clone().setY(0).normalize();
  const z = new THREE.Vector3(0, 1, 0);
  let y = new THREE.Vector3().crossVectors(z, x);
  if (y.dot(TOWARD_CAMERA) > 0) {
    x.negate();
    y = new THREE.Vector3().crossVectors(z, x);
  }
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}
const DRS = (() => {
  const f = frameAt(0.115);
  const line = frameAt(0.095);
  return {
    p: f.p,
    q: groundQuat(f.tan),
    line: compose(line.p.x, 0.052, line.p.z, Math.atan2(-line.tan.z, line.tan.x), 0.35, 0.01, 7.6),
  };
})();

// ------------------------------------------------------------ component

export function Trackside() {
  const fenceMat = useMemo(() => makeFenceMat(), []);
  useFrame(({ clock }) => {
    flagUniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <>
      <Instances geometry={unitBox()} material={mat(C.white, { r: 0.36 })} batch={PAINT.paint} />
      <Instances geometry={unitBox()} material={mat(C.white, { r: 0.3, m: 0.5 })} batch={PAINT.steel} />
      <Instances geometry={unitBox()} material={lensMat} batch={PAINT.glow} shadow={false} />
      <Instances geometry={bodyGeo()} material={mat(C.white, { r: 0.45 })} batch={PAINT.bodies} />
      <Instances geometry={headGeo()} material={mat(C.white, { r: 0.45 })} batch={PAINT.heads} shadow={false} />

      {/* catch fence */}
      <mesh geometry={FENCE.g} material={fenceMat} renderOrder={1} />
      <Instances geometry={unitCyl()} material={mat(C.charcoal, { r: 0.4, m: 0.4 })} batch={FENCE.posts} />
      <Instances geometry={unitBox()} material={mat(C.charcoal, { r: 0.4, m: 0.4 })} batch={FENCE.rails} shadow={false} />

      {/* flags */}
      <Instances geometry={unitCyl()} material={mat(C.metal, { r: 0.3, m: 0.5 })} batch={FLAGS.poles} />
      <Instances geometry={unitCyl()} material={mat(C.ink, { r: 0.45, m: 0.2 })} batch={FLAGS.feet} shadow={false} />
      <Instances geometry={flagGeo()} material={flagMat} batch={FLAGS.cloth} />

      {/* signage text */}
      {BOARDS.map((b, i) => (
        <group key={i} position={[b.x, BARRIER_H + 0.44, b.z]} rotation={[0, b.yaw, 0]}>
          <Label
            position={[0, 0, 0.03]}
            fontSize={b.text.length <= 2 ? 0.55 : 0.4}
            color={b.text === "DRS ZONE" || b.text === "BOX BOX" ? C.white : b.text === "08" ? C.red : C.ink}
            letterSpacing={0.06}
          >
            {b.text}
          </Label>
        </group>
      ))}
      {STAND_SPOTS.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.yaw, 0]}>
          <Label position={[-W / 2 + 1.5, s.raise + 0.27, Z0 + 0.16]} anchorX="left" fontSize={0.24} color={C.ink} letterSpacing={0.1}>
            {`HG RACING   ${s.label}`}
          </Label>
        </group>
      ))}
      <Label position={[DRS.p.x, 0.06, DRS.p.z]} quaternion={DRS.q} fontSize={1.5} color="#f3f1ec" fillOpacity={0.55} letterSpacing={0.1}>
        DRS ZONE
      </Label>
      <Instances geometry={unitBox()} material={mat(C.asphaltLine, { r: 0.8 })} batch={{ m: [DRS.line] }} shadow={false} />

      <RigidBody type="fixed" colliders={false}>
        {STAND_SPOTS.map((s, i) => {
          const c = Math.cos(s.yaw);
          const sn = Math.sin(s.yaw);
          const lz = -0.3 - (s.raise > 0 ? 0.1 : 0);
          return (
            <CuboidCollider
              key={i}
              args={[5.4, (2.4 + s.raise) / 2, 2.4]}
              position={[s.x + lz * sn, (2.4 + s.raise) / 2, s.z + lz * c]}
              rotation={[0, s.yaw, 0]}
            />
          );
        })}
        {MARSHALS.map((m, i) => (
          <CuboidCollider key={i} args={[0.95, 1.1, 0.75]} position={[m.x, 1.1, m.z]} rotation={[0, m.yaw, 0]} />
        ))}
        {FLAG_SPOTS.map((f, i) => (
          <CylinderCollider key={i} args={[1, 0.12]} position={[f.x, 1, f.z]} />
        ))}
      </RigidBody>
    </>
  );
}
