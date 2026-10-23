"use client";

// The little town around the circuit. Soft, bevelled buildings of two to five
// storeys in a warm palette, with chunky window frames, shopfronts and
// awnings at street level, balconies, and pitched, vaulted or garden roofs.
// Everything is merged by material so the whole town is four draw calls:
// the bodies (windows are drawn by their shader, from each building's local
// coordinates), the trims, the roofs, and the roof-garden shrubs.
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { dayNight } from "../daynight";
import { lowSphere, mat } from "../models/props/shared";
import { compose, distToTrack, rng } from "./common";
import { Instances } from "./Instances";
import { C } from "../palette";
import { AWNINGS, BUILDINGS, CREAM, DUSTY_BLUE, FH, G0, ROOF_SAGE, ROOF_SLATE, ROOF_TILE, TERRACOTTA, WARM_WHITE, footing } from "./town";

export { BUILDINGS };

// ------------------------------------------------------------ facade shader

export const facadeUniforms = { uNight: { value: 0 } };

function facadeMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.78, metalness: 0, vertexColors: true });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = facadeUniforms.uNight;
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec3 aLoc; attribute vec3 aLocN; attribute vec3 aSize; attribute vec4 aInfo;
        varying vec3 vLoc; varying vec3 vON; varying vec3 vSz; varying vec4 vInfo;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vLoc = aLoc; vON = aLocN; vSz = aSize; vInfo = aInfo;`
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uNight;
        varying vec3 vLoc; varying vec3 vON; varying vec3 vSz; varying vec4 vInfo;
        float sHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        // 1 inside the rectangle [a, b] (cell fractions), else 0
        float rect(vec2 f, vec2 a, vec2 b) { return step(a.x, f.x) * step(f.x, b.x) * step(a.y, f.y) * step(f.y, b.y); }`
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float wGlass = 0.0; float wFrame = 0.0; float wHash = 0.0; float wShop = 0.0; float wTop = 0.0;
        {
          float side = 1.0 - step(0.6, abs(vON.y));
          bool xFace = abs(vON.x) > abs(vON.z);
          float u = xFace ? vLoc.z : vLoc.x;
          float halfW = xFace ? vSz.z * 0.5 : vSz.x * 0.5;
          float y = vLoc.y;
          float style = vInfo.y;
          bool isFront = !xFace && vON.z * vInfo.z > 0.0;
          float edge = step(abs(u), halfW - 0.55);
          if (y < ${G0.toFixed(1)}) {
            // Ground floor: shop bays on the street side, small windows elsewhere.
            float cw = isFront ? 3.2 : 2.2;
            vec2 cell = vec2(u / cw + 0.5, y / ${G0.toFixed(1)});
            vec2 f = fract(cell);
            vec2 a = isFront ? vec2(0.09, 0.1) : vec2(0.3, 0.32);
            vec2 b = isFront ? vec2(0.91, 0.74) : vec2(0.7, 0.74);
            vec2 t = vec2(0.13 / cw, 0.13 / ${G0.toFixed(1)});
            float inner = rect(f, a, b);
            float outer = rect(f, a - t, b + t);
            wGlass = inner * edge * side;
            wFrame = (outer - inner) * edge * side;
            wTop = smoothstep(b.y - 0.1, b.y, f.y) * wGlass;
            wShop = isFront ? wGlass : 0.0;
            wHash = sHash(floor(cell) + vec2(floor(vInfo.x) * 0.37, xFace ? 7.0 : 3.0) + sign(vON.x + vON.z));
          } else {
            float cw = style < 0.5 ? 2.3 : (style < 1.5 ? 3.1 : 1.7);
            vec2 cell = vec2(u / cw + 0.5, (y - ${G0.toFixed(1)}) / ${FH.toFixed(1)});
            vec2 f = fract(cell);
            float wx = style < 0.5 ? 0.27 : (style < 1.5 ? 0.12 : 0.3);
            vec2 a = vec2(wx, style > 1.5 ? 0.14 : 0.24);
            vec2 b = vec2(1.0 - wx, 0.82);
            vec2 t = vec2(0.14 / cw, 0.14 / ${FH.toFixed(1)});
            float inner = rect(f, a, b);
            float outer = rect(f, a - t, b + t);
            // a deeper sill under each window
            float sill = rect(f, vec2(a.x - t.x * 1.6, a.y - t.y * 2.2), vec2(b.x + t.x * 1.6, a.y - t.y));
            float inside = edge * step(${G0.toFixed(1)} + 0.1, y) * step(y, vSz.y - 0.75) * side;
            wGlass = inner * inside;
            wFrame = max(outer - inner, sill) * inside;
            wTop = smoothstep(b.y - 0.12, b.y, f.y) * wGlass;
            wHash = sHash(floor(cell) + vec2(floor(vInfo.x) * 0.37 + (xFace ? 3.1 : 0.0) * sign(vON.x + vON.z), mod(floor(vInfo.x), 13.0)));
          }
          // a soft string course between floors and a lighter parapet band
          float course = side * (1.0 - wGlass) * (1.0 - wFrame) * step(${G0.toFixed(1)} - 0.12, y) *
            (1.0 - step(0.12, abs(fract((y - ${G0.toFixed(1)}) / ${FH.toFixed(1)} + 0.5) - 0.5) * ${FH.toFixed(1)})) * step(y, vSz.y - 0.75);
          float parapet = side * step(vSz.y - 0.62, y);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.08 + 0.03, max(course, parapet) * 0.8);
        }
        vec3 glass = mix(vec3(0.24, 0.29, 0.34), vec3(0.42, 0.5, 0.56), fract(vLoc.y / 3.0) * 0.6);
        glass *= 1.0 - wTop * 0.35; // the frame shades the top of the pane: reads as an inset
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.98, 0.96, 0.92), wFrame);
        diffuseColor.rgb = mix(diffuseColor.rgb, glass, wGlass);`
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.18, wGlass);`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          // Seeded: about half the rooms are lit; shops all are. Above 1 so they bloom.
          float lit = step(wHash, 0.5);
          vec3 warm = mix(vec3(1.0, 0.62, 0.32), vec3(1.0, 0.8, 0.55), step(0.7, fract(wHash * 9.3)));
          float room = wGlass * (1.0 - wShop) * lit * (1.1 + fract(wHash * 31.0) * 0.9) * (1.0 - wTop * 0.5);
          totalEmissiveRadiance += warm * (room + wShop * 1.7) * uNight;
        }`
      );
  };
  m.customProgramCacheKey = () => "street-facade-v2";
  return m;
}

const facadeMat = facadeMaterial();

// ------------------------------------------------------------ geometry

/** Paint a geometry one colour and drop everything but position/normal/color. */
function prep(g: THREE.BufferGeometry, color: THREE.Color | string) {
  const out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) if (k !== "position" && k !== "normal") out.deleteAttribute(k);
  const c = new THREE.Color(color);
  const n = out.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return out;
}

/** A box part in building-local space (x, y, z = centre), placed in the world. */
function box(world: THREE.Matrix4, color: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, round = 0) {
  const g = round > 0 ? new RoundedBoxGeometry(sx, sy, sz, 1, Math.min(round, sx / 2, sy / 2, sz / 2)) : new THREE.BoxGeometry(sx, sy, sz);
  g.applyMatrix4(compose(cx, cy, cz, ry, 1, 1, 1, rx));
  g.applyMatrix4(world);
  return prep(g, color);
}

function cyl(world: THREE.Matrix4, color: string, cx: number, cy: number, cz: number, r0: number, r1: number, h: number, seg = 14) {
  const g = new THREE.CylinderGeometry(r0, r1, h, seg);
  g.translate(cx, cy, cz);
  g.applyMatrix4(world);
  return prep(g, color);
}

/** Gabled roof with eaves: slopes in the roof colour, gable ends in the wall colour. */
function gable(world: THREE.Matrix4, roof: string, wall: string, w: number, d: number, y: number, rh: number) {
  const alongX = w >= d;
  const L = (alongX ? w : d) / 2 + 0.35; // half length incl. overhang
  const S = (alongX ? d : w) / 2 + 0.45; // half span incl. eaves
  const T = 0.22; // slab thickness
  const P = (l: number, s: number, yy: number) => (alongX ? [l, yy, s] : [s, yy, l]);
  const pos: number[] = [];
  const col: number[] = [];
  const cr = new THREE.Color(roof);
  const cw = new THREE.Color(wall);
  const tri = (a: number[], b: number[], c: number[], k: THREE.Color) => {
    pos.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) col.push(k.r, k.g, k.b);
  };
  const quad = (a: number[], b: number[], c: number[], d2: number[], k: THREE.Color) => {
    tri(a, b, c, k);
    tri(a, c, d2, k);
  };
  const top = y + rh;
  for (const sg of [-1, 1]) {
    // upper and lower faces of the slope, and the eave edge
    quad(P(-L, sg * S, y), P(L, sg * S, y), P(L, 0, top), P(-L, 0, top), cr);
    quad(P(-L, sg * S, y - T), P(-L, 0, top - T), P(L, 0, top - T), P(L, sg * S, y - T), cr);
    quad(P(-L, sg * S, y), P(-L, sg * S, y - T), P(L, sg * S, y - T), P(L, sg * S, y), cr);
  }
  // gable walls, set just inside the overhang
  const g = L - 0.35;
  const s0 = S - 0.45;
  for (const sl of [-1, 1]) {
    tri(P(sl * g, -s0, y - 0.01), P(sl * g, s0, y - 0.01), P(sl * g, 0, top - T - 0.01), cw);
    // the roof's end edges
    quad(P(sl * L, -S, y), P(sl * L, 0, top), P(sl * L, 0, top - T), P(sl * L, -S, y - T), cr);
    quad(P(sl * L, S, y - T), P(sl * L, 0, top - T), P(sl * L, 0, top), P(sl * L, S, y), cr);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  // Winding is mixed: the roof material is double-sided, which flips normals on back faces.
  geom.computeVertexNormals();
  geom.applyMatrix4(world);
  return geom;
}

/** Barrel-vaulted roof along the long side, with flat end caps. */
function vault(world: THREE.Matrix4, color: string, w: number, d: number, y: number, rh: number) {
  const alongX = w >= d;
  const len = (alongX ? w : d) + 0.3;
  const r = (alongX ? d : w) / 2 + 0.2;
  const g = new THREE.CylinderGeometry(r, r, len, 18, 1, false, 0, Math.PI);
  g.rotateZ(Math.PI / 2); // axis along x, half above
  g.scale(1, rh / r, 1);
  if (!alongX) g.rotateY(Math.PI / 2);
  g.translate(0, y, 0);
  g.applyMatrix4(world);
  return prep(g, color);
}

const shrubBatch = { m: [] as THREE.Matrix4[], c: [] as THREE.Color[] };

const PARTS = (() => {
  const r = rng(77);
  const bodies: THREE.BufferGeometry[] = [];
  const trims: THREE.BufferGeometry[] = [];
  const roofs: THREE.BufferGeometry[] = [];
  const greens = ["#6f8f5a", "#5c7a4b", "#7f9670", "#8aa27a"].map((c) => new THREE.Color(c));

  for (const b of BUILDINGS) {
    // The floor sits at the highest ground under the building; on a slope a stone
    // plinth with a sand coping reaches down to the lowest (and a little below).
    const ft = footing(b);
    const ground = ft.floor;
    const sink = 0.3;
    const world = compose(b.x, ground, b.z, b.yaw);
    if (ft.fall > 0.12) {
      const ph = ft.floor - ft.low + 0.4;
      trims.push(box(world, C.rock, 0, 0.12 - ph / 2, 0, b.w + 0.36, ph, b.d + 0.36, 0, 0, 0.08));
      trims.push(box(world, C.sand, 0, 0.14, 0, b.w + 0.5, 0.16, b.d + 0.5, 0, 0, 0.05));
    }
    const fz = b.front * (b.d / 2); // the street face, in local z

    // Body: one bevelled block, with local coordinates for the window shader.
    const bg = new RoundedBoxGeometry(b.w, b.h + sink, b.d, 2, 0.32);
    bg.translate(0, (b.h - sink) / 2, 0);
    const body = prep(bg, b.color);
    const n = body.attributes.position.count;
    const loc = new Float32Array(n * 3);
    const locN = new Float32Array(n * 3);
    const size = new Float32Array(n * 3);
    const info = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      loc.set([body.attributes.position.getX(i), body.attributes.position.getY(i), body.attributes.position.getZ(i)], i * 3);
      locN.set([body.attributes.normal.getX(i), body.attributes.normal.getY(i), body.attributes.normal.getZ(i)], i * 3);
      size.set([b.w, b.h, b.d], i * 3);
      info.set([Math.floor(b.seed) + 0.5, b.style, b.front, b.floors], i * 4); // whole seed + 0.5: floor() is stable after interpolation
    }
    body.setAttribute("aLoc", new THREE.BufferAttribute(loc, 3));
    body.setAttribute("aLocN", new THREE.BufferAttribute(locN, 3));
    body.setAttribute("aSize", new THREE.BufferAttribute(size, 3));
    body.setAttribute("aInfo", new THREE.BufferAttribute(info, 4));
    body.applyMatrix4(world);
    bodies.push(body);

    const trim = b.color === WARM_WHITE || b.color === CREAM ? "#e7dcc8" : WARM_WHITE;

    // Roof.
    if (b.roof === 1) {
      const roofCol = b.color === TERRACOTTA ? ROOF_SLATE : r() < 0.6 ? ROOF_TILE : r() < 0.5 ? ROOF_SLATE : ROOF_SAGE;
      roofs.push(gable(world, roofCol, b.color, b.w, b.d, b.h, b.rh));
      // a chimney or two near the ridge
      const nc = r() < 0.7 ? 1 : 2;
      for (let k = 0; k < nc; k++) {
        const alongX = b.w >= b.d;
        const l = (r() - 0.5) * (alongX ? b.w : b.d) * 0.6;
        const s = (r() < 0.5 ? -1 : 1) * Math.min(b.w, b.d) * 0.18;
        const [cx, cz] = alongX ? [l, s] : [s, l];
        trims.push(box(world, r() < 0.5 ? TERRACOTTA : "#e7dcc8", cx, b.h + b.rh * 0.75, cz, 0.6, b.rh * 0.9 + 0.8, 0.6, 0, 0, 0.08));
        trims.push(box(world, "#66707d", cx, b.h + b.rh * 0.75 + (b.rh * 0.9 + 0.8) / 2 + 0.06, cz, 0.75, 0.12, 0.75, 0, 0, 0.04));
      }
    } else if (b.roof === 3) {
      roofs.push(vault(world, r() < 0.5 ? ROOF_SAGE : ROOF_SLATE, b.w - 0.4, b.d - 0.4, b.h, b.rh));
    } else {
      // Flat: a rounded parapet cap, then a roof garden or a water tank.
      trims.push(box(world, trim, 0, b.h + 0.12, 0, b.w + 0.22, 0.26, b.d + 0.22, 0, 0, 0.1));
      if (b.roof === 2) {
        const pw = b.w - 1.6;
        const pd = b.d - 1.6;
        for (const [lx, lz, sx, sz] of [
          [0, -pd / 2, pw, 0.7],
          [0, pd / 2, pw, 0.7],
          [-pw / 2, 0, 0.7, pd - 0.7],
        ] as const) {
          trims.push(box(world, TERRACOTTA, lx, b.h + 0.5, lz, sx, 0.5, sz, 0, 0, 0.08));
          const count = Math.max(1, Math.round(Math.max(sx, sz) / 1.1));
          for (let k = 0; k < count; k++) {
            const t = (k + 0.5) / count - 0.5;
            const px = lx + (sx > sz ? t * sx : 0);
            const pz = lz + (sz > sx ? t * sz : 0);
            const s = 0.36 + r() * 0.16;
            const m = world.clone().multiply(compose(px, b.h + 0.75 + s * 0.5, pz, r() * 6, s, s * 0.85, s));
            shrubBatch.m.push(m);
            shrubBatch.c.push(greens[Math.floor(r() * greens.length)]);
          }
        }
      }
      if (b.roof === 0 || r() < 0.4) {
        const tx = (r() - 0.5) * (b.w - 3);
        const tz = (r() - 0.5) * (b.d - 3);
        const tc = r() < 0.5 ? "#b89574" : DUSTY_BLUE;
        trims.push(box(world, "#66707d", tx, b.h + 0.5, tz, 1.5, 0.5, 1.5, 0, 0, 0.06));
        trims.push(cyl(world, tc, tx, b.h + 1.45, tz, 0.72, 0.72, 1.4, 16));
        trims.push(cyl(world, tc, tx, b.h + 2.35, tz, 0.05, 0.8, 0.4, 16));
      }
    }

    // Street level: an awning over the shopfronts.
    if (r() < 0.75) {
      const aw = Math.min(b.w - 1.4, 3.2 * Math.max(1, Math.floor((b.w - 1.1) / 3.2)));
      const col = AWNINGS[Math.floor(r() * AWNINGS.length)];
      const depth = 1.15;
      const tilt = 0.32 * b.front; // slopes down, away from the wall
      trims.push(box(world, col, 0, G0 - 0.55, fz + b.front * (depth / 2 + 0.05), aw, 0.08, depth, tilt, 0, 0.03));
      trims.push(box(world, col, 0, G0 - 0.55 - Math.sin(0.32) * depth / 2 - 0.12, fz + b.front * (Math.cos(0.32) * depth + 0.04), aw, 0.26, 0.05, 0, 0, 0.02));
    }

    // Balconies on the upper floors of some buildings, under alternate windows.
    if (b.floors >= 3 && b.style !== 2 && r() < 0.45) {
      const cw = b.style === 1 ? 3.1 : 2.3;
      const cols: number[] = [];
      for (let k = -8; k <= 8; k++) if (Math.abs(k * cw) < b.w / 2 - 0.55 - cw * 0.35) cols.push(k * cw);
      const railCol = r() < 0.5 ? WARM_WHITE : "#3a3f46";
      for (let f = 1; f < b.floors; f++) {
        for (let k = 0; k < cols.length; k++) {
          if ((k + f) % 2) continue;
          const u = cols[k];
          const y = G0 + (f - 1) * FH + 0.55;
          const bw = cw * 0.62;
          trims.push(box(world, trim, u, y, fz + b.front * 0.38, bw, 0.14, 0.76, 0, 0, 0.05));
          trims.push(box(world, railCol, u, y + 0.42, fz + b.front * 0.74, bw, 0.7, 0.06, 0, 0, 0.03));
          for (const sx of [-1, 1]) trims.push(box(world, railCol, u + (sx * bw) / 2, y + 0.42, fz + b.front * 0.42, 0.06, 0.7, 0.66));
        }
      }
    }
  }

  return {
    bodies: mergeGeometries(bodies),
    trims: mergeGeometries(trims),
    roofs: mergeGeometries(roofs),
  };
})();

export function Skyline() {
  useFrame(() => {
    facadeUniforms.uNight.value = dayNight.night;
  });
  return (
    <>
      <mesh geometry={PARTS.bodies} material={facadeMat} castShadow receiveShadow frustumCulled={false} />
      <mesh geometry={PARTS.trims} material={mat("#ffffff", { r: 0.7, vc: true })} castShadow receiveShadow frustumCulled={false} />
      <mesh geometry={PARTS.roofs} material={mat("#ffffff", { r: 0.75, vc: true, side: THREE.DoubleSide })} castShadow receiveShadow frustumCulled={false} />
      <Instances geometry={lowSphere()} material={mat("#ffffff", { r: 0.85 })} batch={shrubBatch} />
      <RigidBody type="fixed" colliders={false}>
        {BUILDINGS.filter((b) => distToTrack(b.x, b.z) < 40).map((b, i) => {
          // from the foot of the plinth to 4 m above the floor
          const { floor, low } = footing(b);
          const h = floor + 4 - (low - 0.3);
          return <CuboidCollider key={i} args={[b.w / 2 + 0.18, h / 2, b.d / 2 + 0.18]} position={[b.x, low - 0.3 + h / 2, b.z]} rotation={[0, b.yaw, 0]} />;
        })}
      </RigidBody>
    </>
  );
}
