"use client";

import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { heightAt } from "../terrain";
import { C } from "../palette";
import { dayNight } from "../daynight";
import { ISLAND_RADIUS, PIT } from "../layout";
import { geo, mat, unitBox, unitCyl } from "../models/props/shared";
import { AWAY, FRAMES, RUNOFF, barrierOffset, compose, distToTrack, farSign, inSectorScene, nearPlace, nearTree, nearestFrame, outSign, rng } from "./common";
import { Instances } from "./Instances";
import { LAMPS } from "./layoutStreet";
import { STAND_SPOTS } from "./standSpots";

// ------------------------------------------------------------ placement

type Bld = { x: number; z: number; w: number; d: number; h: number; yaw: number; style: number; color: string; seed: number };

const COLORS = [C.white, C.white, C.white, C.cream, C.cream, C.sand, C.sand, "#d9cfbf", C.greyLight, C.charcoal, C.charcoal, C.greyDark];

function overlaps(a: Bld, b: Bld, gap: number) {
  // separating axis test for two rotated rectangles
  const axes = [a.yaw, a.yaw + Math.PI / 2, b.yaw, b.yaw + Math.PI / 2].map((t) => [Math.cos(t), -Math.sin(t)]);
  const corners = (r: Bld) => {
    const c = Math.cos(r.yaw);
    const s = Math.sin(r.yaw);
    const hw = r.w / 2 + gap / 2;
    const hd = r.d / 2 + gap / 2;
    return [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ].map(([lx, lz]) => [r.x + lx * c + lz * s, r.z - lx * s + lz * c]);
  };
  const ca = corners(a);
  const cb = corners(b);
  for (const [ax, az] of axes) {
    let amin = Infinity;
    let amax = -Infinity;
    let bmin = Infinity;
    let bmax = -Infinity;
    for (const [x, z] of ca) {
      const p = x * ax + z * az;
      amin = Math.min(amin, p);
      amax = Math.max(amax, p);
    }
    for (const [x, z] of cb) {
      const p = x * ax + z * az;
      bmin = Math.min(bmin, p);
      bmax = Math.max(bmax, p);
    }
    if (amax < bmin || bmax < amin) return false;
  }
  return true;
}

function clear(b: Bld, out: Bld[]) {
  const hd = Math.hypot(b.w, b.d) / 2;
  if (Math.hypot(b.x, b.z) + hd > ISLAND_RADIUS - 1.5) return false;
  if (inSectorScene(b.x, b.z, hd + 1)) return false;
  if (nearPlace(b.x, b.z, hd)) return false;
  if (nearTree(b.x, b.z, Math.min(b.w, b.d) * 0.45)) return false;
  if (LAMPS.some((l) => Math.hypot(l.x - b.x, l.z - b.z) < hd + 1)) return false;
  if (STAND_SPOTS.some((s) => Math.hypot(s.x - b.x, s.z - b.z) < hd + 8)) return false;
  if (distToTrack(b.x, b.z) - Math.min(b.w, b.d) / 2 < 9) return false;
  return !out.some((o) => overlaps(o, b, 1.1));
}

/** A continuous street wall on the far side, close enough to frame the chase camera. */
function frontage(out: Bld[]) {
  const r = rng(404);
  let i = 0;
  while (i < FRAMES.length) {
    const f = FRAMES[i];
    const s = farSign(f);
    const outside = s === outSign(f);
    if (!outside || Math.abs(f.k) > 0.03) {
      i += 2;
      continue;
    }
    const w = 7 + r() * 6;
    const d = 7 + r() * 5;
    const off = Math.abs(barrierOffset(i, s as 1 | -1)) + 6.2 + r() * 2.5 + d / 2;
    const q = f.p.clone().addScaledVector(f.n, s * off);
    const h = 9 + Math.pow(r(), 1.2) * 20;
    const roll = r();
    const color = COLORS[Math.floor(roll * COLORS.length)];
    const style = color === C.charcoal || color === C.greyDark ? (r() < 0.7 ? 1 : 0) : r() < 0.3 ? 2 : 0;
    const b: Bld = { x: q.x, z: q.z, w, d, h, yaw: Math.atan2(-f.tan.z, f.tan.x), style, color, seed: r() * 100 };
    if (clear(b, out)) {
      out.push(b);
      i += Math.max(2, Math.round(((w + 1.4) / LEN_M) * FRAMES.length));
    } else i += 3;
  }
}
const LEN_M = FRAMES.length * FRAMES[1].p.distanceTo(FRAMES[0].p);

export const BUILDINGS: Bld[] = (() => {
  const r = rng(2026);
  const out: Bld[] = [];
  frontage(out);
  for (let tries = 0; tries < 16000 && out.length < 280; tries++) {
    const a = r() * Math.PI * 2;
    const rad = 30 + Math.sqrt(r()) * (ISLAND_RADIUS - 34);
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad;
    const g = (x * AWAY.x + z * AWAY.z) / rad; // 1 far, -1 near
    const far01 = (g + 1) / 2;
    const w = 5.5 + r() * (6 + far01 * 5);
    const d = 5.5 + r() * (5 + far01 * 4);
    const hd = Math.hypot(w, d) / 2;
    if (rad + hd > ISLAND_RADIUS - 1.5) continue;
    const f = nearestFrame(x, z);
    const dt = distToTrack(x, z);
    const ri = Math.round(f.u * RUNOFF.length) % RUNOFF.length;
    if (dt - hd * 0.85 < 9.5 + RUNOFF[ri]) continue;
    // keep the infield open: only build outside the loop
    const vx = x - f.p.x;
    const vz = z - f.p.z;
    const outside = vx * f.p.x + vz * (f.p.z + 3) > 0;
    if (!outside) continue;
    if (inSectorScene(x, z, hd + 1)) continue;
    if (nearPlace(x, z, hd)) continue;
    if (nearTree(x, z, Math.min(w, d) * 0.45)) continue;
    if (LAMPS.some((l) => Math.hypot(l.x - x, l.z - z) < hd + 1)) continue;
    if (STAND_SPOTS.some((s) => Math.hypot(s.x - x, s.z - z) < hd + 8)) continue;
    if (z > PIT.garageZ - 8 && z < 44 && Math.abs(x) < 46) continue;
    // orientation: square to the road close by, square to the shore further out
    const yaw = dt < 34 ? Math.atan2(-f.tan.z, f.tan.x) : Math.atan2(z, -x) + Math.PI / 2;
    // height: tall on the far side, low where the camera looks over them
    const camSide = vx * AWAY.x + vz * AWAY.z < 0;
    let h = 6 + Math.pow(r(), 1.3) * (7 + far01 * far01 * 24);
    if (camSide) h = Math.min(h, Math.max(5, (dt - 8) * 0.32));
    const roll = r();
    const color = COLORS[Math.floor(roll * COLORS.length)];
    const style = color === C.charcoal || color === C.greyDark ? (r() < 0.7 ? 1 : 0) : r() < 0.25 ? 2 : r() < 0.15 ? 1 : 0;
    const b: Bld = { x, z, w, d, h, yaw, style, color, seed: r() * 100 };
    if (out.some((o) => overlaps(o, b, 1.1))) continue;
    out.push(b);
  }
  return out;
})();

// ------------------------------------------------------------ facade shader

export const facadeUniforms = { uNight: { value: 0 } };

function facadeMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.62, metalness: 0.04 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = facadeUniforms.uNight;
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec3 aSize; attribute vec2 aInfo;
        varying vec3 vLoc; varying vec3 vON; varying vec3 vSz; varying vec2 vInfo;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vLoc = position * aSize; vON = normal; vSz = aSize; vInfo = aInfo;`
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uNight;
        varying vec3 vLoc; varying vec3 vON; varying vec3 vSz; varying vec2 vInfo;
        float sHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float wMask = 0.0; float wShop = 0.0; float wHash = 0.0;
        {
          float side = 1.0 - step(0.5, abs(vON.y));
          bool xFace = abs(vON.x) > 0.5;
          float u = xFace ? vLoc.z : vLoc.x;
          float halfW = xFace ? vSz.z * 0.5 : vSz.x * 0.5;
          float y = vLoc.y;
          float style = vInfo.y;
          float cw = style < 0.5 ? 1.9 : (style < 1.5 ? 1.3 : 3.0);
          float ch = 3.1;
          float g0 = 3.6;
          vec2 cell = vec2(u / cw + 0.5, (y - g0) / ch);
          vec2 id = floor(cell);
          vec2 f = fract(cell);
          float wx = style < 0.5 ? 0.27 : (style < 1.5 ? 0.05 : 0.0);
          float wy0 = style < 0.5 ? 0.28 : (style < 1.5 ? 0.1 : 0.4);
          float wy1 = style < 0.5 ? 0.84 : (style < 1.5 ? 0.95 : 0.88);
          float win = step(wx, f.x) * step(f.x, 1.0 - wx) * step(wy0, f.y) * step(f.y, wy1);
          float inside = step(abs(u), halfW - 0.55) * step(g0 + 0.1, y) * step(y, vSz.y - 0.8);
          wMask = win * inside * side;
          wHash = sHash(id + vec2(vInfo.x * 13.7 + (xFace ? 3.1 : 0.0) * sign(vON.x + vON.z), vInfo.x));
          float bay = fract(u / 3.4 + 0.5);
          wShop = side * step(0.35, y) * step(y, g0 - 0.55) * step(abs(u), halfW - 0.45) * step(0.1, bay) * step(bay, 0.9);
        }
        float wAny = max(wMask, wShop);
        vec3 glass = mix(vec3(0.11, 0.135, 0.165), vec3(0.3, 0.36, 0.42), fract(vLoc.y / 3.1) * 0.45);
        diffuseColor.rgb = mix(diffuseColor.rgb, glass, wAny);`
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.14, wAny);`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          float lit = step(wHash, vInfo.y > 0.5 && vInfo.y < 1.5 ? 0.32 : 0.48);
          vec3 warm = mix(vec3(1.0, 0.68, 0.38), vec3(1.0, 0.86, 0.66), step(0.78, fract(wHash * 9.3)));
          totalEmissiveRadiance += warm * (wMask * lit * (0.5 + fract(wHash * 31.0) * 0.7) + wShop * 0.7) * uNight;
        }`
      );
  };
  m.customProgramCacheKey = () => "street-facade-v1";
  return m;
}

const facadeMat = facadeMaterial();

/** Red aviation lights and rooftop beacons: off by day, blinking at night. */
const beaconMat = new THREE.MeshStandardMaterial({ color: C.red, emissive: new THREE.Color("#ff3b3b"), emissiveIntensity: 0, roughness: 0.4, toneMapped: false });

// ------------------------------------------------------------ instances

type Block = { x: number; y: number; z: number; w: number; h: number; d: number; yaw: number; style: number; seed: number; color: THREE.Color };

const PARTS = (() => {
  const r = rng(77);
  const blocks: Block[] = [];
  const caps = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const units = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  const masts = { m: [] as THREE.Matrix4[] };
  const beacons = { m: [] as THREE.Matrix4[] };
  const trims = { m: [] as THREE.Matrix4[] };
  const capWhite = new THREE.Color(C.white);
  const capGrey = new THREE.Color(C.greyLight);
  const unitCols = [new THREE.Color(C.metal), new THREE.Color(C.greyLight), new THREE.Color(C.white)];

  const local = (b: Bld, lx: number, lz: number) => {
    const c = Math.cos(b.yaw);
    const s = Math.sin(b.yaw);
    return [b.x + lx * c + lz * s, b.z - lx * s + lz * c];
  };

  for (const b of BUILDINGS) {
    // Buildings stand on the terrain (sunk a little so slopes never show a gap).
    const base = heightAt(b.x, b.z) - 0.4;
    const cmp = (x: number, y: number, z: number, ...rest: number[]) => compose(x, y + base, z, ...rest);
    const col = new THREE.Color(b.color);
    const dark = b.color === C.charcoal || b.color === C.greyDark;
    blocks.push({ x: b.x, y: base, z: b.z, w: b.w, h: b.h, d: b.d, yaw: b.yaw, style: b.style, seed: b.seed, color: col });
    let top = b.h;
    let tw = b.w;
    let td = b.d;
    let ox = 0;
    let oz = 0;
    // parapet cap
    caps.m.push(cmp(b.x, top + 0.12, b.z, b.yaw, tw + 0.25, 0.24, td + 0.25));
    caps.c.push(dark ? capGrey : b.color === C.white ? capGrey : capWhite);
    // tall ones step back once or twice
    if (b.h > 13 && r() < 0.6) {
      const sw = tw * (0.55 + r() * 0.2);
      const sd = td * (0.55 + r() * 0.2);
      const sh = 3 + r() * Math.min(9, b.h * 0.35);
      ox = (r() - 0.5) * (tw - sw) * 0.8;
      oz = (r() - 0.5) * (td - sd) * 0.8;
      const [sx, sz] = local(b, ox, oz);
      const c2 = r() < 0.3 ? new THREE.Color(dark ? C.greyLight : C.charcoal) : col;
      blocks.push({ x: sx, y: base + top + 0.24, z: sz, w: sw, h: sh, d: sd, yaw: b.yaw, style: c2 === col ? b.style : 1, seed: b.seed + 1, color: c2 });
      top += 0.24 + sh;
      tw = sw;
      td = sd;
      caps.m.push(cmp(sx, top + 0.1, sz, b.yaw, tw + 0.2, 0.2, td + 0.2));
      caps.c.push(capWhite);
    }
    const [cx, cz] = local(b, ox, oz);
    // rooftop plant
    const nU = 1 + Math.floor(r() * 3);
    for (let k = 0; k < nU; k++) {
      const uw = 1 + r() * Math.min(2.6, tw * 0.3);
      const ud = 1 + r() * Math.min(2.2, td * 0.3);
      const uh = 0.6 + r() * 1.2;
      const lx = ox + (r() - 0.5) * (tw - uw - 0.8);
      const lz = oz + (r() - 0.5) * (td - ud - 0.8);
      const [ux, uz] = local(b, lx, lz);
      units.m.push(cmp(ux, top + 0.2 + uh / 2, uz, b.yaw, uw, uh, ud));
      units.c.push(unitCols[Math.floor(r() * unitCols.length)]);
    }
    // masts with an aviation light on the tallest
    if (top > 18 && r() < 0.65) {
      const mh = 3 + r() * 5;
      masts.m.push(cmp(cx, top + 0.2 + mh / 2, cz, 0, 0.07, mh, 0.07));
      beacons.m.push(cmp(cx, top + 0.25 + mh, cz, 0, 0.22, 0.22, 0.22));
    } else if (top > 12) {
      for (const sx of [-1, 1]) {
        const [bx, bz] = local(b, ox + (sx * tw) / 2 - sx * 0.3, oz + td / 2 - 0.3);
        beacons.m.push(cmp(bx, top + 0.35, bz, 0, 0.13, 0.13, 0.13));
      }
    }
    // a few carry the team red as a thin floor band
    if (r() < 0.16 && b.h > 8) {
      const y = 3.6 + 3.1 * Math.floor(1 + r() * Math.min(4, (b.h - 6) / 3.1)) - 0.1;
      trims.m.push(cmp(b.x, y, b.z, b.yaw, b.w + 0.08, 0.22, b.d + 0.08));
    } else if (r() < 0.35) {
      // or a white ground-floor canopy
      const [qx, qz] = local(b, 0, b.d / 2 + 0.5);
      caps.m.push(cmp(qx, 3.5, qz, b.yaw, b.w * 0.6, 0.12, 1.1));
      caps.c.push(capWhite);
    }
  }

  // one geometry with per-instance size + info for the window shader
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  const size = new Float32Array(blocks.length * 3);
  const info = new Float32Array(blocks.length * 2);
  const facades = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };
  blocks.forEach((k, i) => {
    size.set([k.w, k.h, k.d], i * 3);
    info.set([k.seed, k.style], i * 2);
    facades.m.push(compose(k.x, k.y, k.z, k.yaw, k.w, k.h, k.d));
    facades.c.push(k.color);
  });
  g.setAttribute("aSize", new THREE.InstancedBufferAttribute(size, 3));
  g.setAttribute("aInfo", new THREE.InstancedBufferAttribute(info, 2));
  return { g, facades, caps, units, masts, beacons, trims };
})();

const mastGeo = () => geo("street-mast", () => new THREE.CylinderGeometry(1, 1, 1, 6));

export function Skyline() {
  useFrame(({ clock }) => {
    const n = dayNight.night;
    facadeUniforms.uNight.value = n;
    const blink = Math.sin(clock.elapsedTime * 2.4) > 0.55 ? 1 : 0.15;
    beaconMat.emissiveIntensity = n * 3.5 * blink;
  });
  return (
    <>
      <Instances geometry={PARTS.g} material={facadeMat} batch={PARTS.facades} />
      <Instances geometry={unitBox()} material={mat(C.white, { r: 0.45 })} batch={PARTS.caps} />
      <Instances geometry={unitBox()} material={mat(C.white, { r: 0.5, m: 0.15 })} batch={PARTS.units} />
      <Instances geometry={unitBox()} material={mat(C.red, { r: 0.4 })} batch={PARTS.trims} />
      <Instances geometry={mastGeo()} material={mat(C.ink, { r: 0.4, m: 0.3 })} batch={PARTS.masts} shadow={false} />
      <Instances geometry={unitCyl()} material={beaconMat} batch={PARTS.beacons} shadow={false} />
      <RigidBody type="fixed" colliders={false}>
        {BUILDINGS.filter((b) => distToTrack(b.x, b.z) < 40).map((b, i) => (
          <CuboidCollider key={i} args={[b.w / 2, Math.min(b.h, 4) / 2, b.d / 2]} position={[b.x, heightAt(b.x, b.z) + Math.min(b.h, 4) / 2, b.z]} rotation={[0, b.yaw, 0]} />
        ))}
      </RigidBody>
    </>
  );
}
