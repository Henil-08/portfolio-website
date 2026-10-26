// W09 town blocks: concrete boxes with recessed window grids, a glazed ground floor on the
// street face, a concrete-dark parapet under a thin ink roof, and a rare orange door. Built
// as two merged geometries for any number of buildings: the bodies (windows drawn by the
// facade shader from each building's local coordinates) and the trims (parapets, roofs,
// plinths, plant), so a whole town is two draw calls. Shared by the game's Skyline and the
// docs turntable.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CI } from "./concrete";

/** Storeys: a taller ground floor (shops), then even floors, then a 0.7 m parapet. */
export const G0 = 3.0;
export const FH = 2.6;
export const PARAPET = 0.7;
export const blockHeight = (floors: number) => G0 + (floors - 1) * FH + PARAPET;

/** Wall tones: concrete with a little spread, a few in concrete dark. */
export const TONES = [CI.concrete, CI.concrete, "#d2cfc6", "#cdc9bf", "#dedbd4", "#c6c2b8", CI.concreteDark];

export type TownBlock = {
  x: number;
  z: number;
  w: number;
  d: number;
  /** wall top, parapet included */
  h: number;
  yaw: number;
  floors: number;
  /** +1 if local +z faces the street */
  front: 1 | -1;
  seed: number;
  /** 0 regular windows, 1 wide windows, 2 tall narrow windows (landmarks) */
  style: number;
  /** 0 or 2 plain flat roof, 1 rooftop plant, 3 a set-back top floor */
  roof: number;
  /** height of what stands on the roof */
  rh: number;
  color: string;
  /** an orange door on the street face */
  accent?: boolean;
  /** ground under the footprint: the floor, and the foot of the plinth on a slope */
  floor: number;
  low: number;
};

// ------------------------------------------------------------ facade shader

export const facadeUniforms = { uNight: { value: 0 } };

const f1 = (n: number) => n.toFixed(2);

export function facadeMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.92, metalness: 0, vertexColors: true });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = facadeUniforms.uNight;
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec3 aLoc; attribute vec3 aLocN; attribute vec3 aSize; attribute vec4 aInfo;
        varying vec3 vLoc; varying vec3 vON; varying vec3 vSz; varying vec4 vInfo;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vLoc = aLoc; vON = aLocN; vSz = aSize; vInfo = aInfo;`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uNight;
        varying vec3 vLoc; varying vec3 vON; varying vec3 vSz; varying vec4 vInfo;
        float sHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float rect(vec2 f, vec2 a, vec2 b) { return step(a.x, f.x) * step(f.x, b.x) * step(a.y, f.y) * step(f.y, b.y); }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float wGlass = 0.0; float wReveal = 0.0; float wMull = 0.0; float wHash = 0.0; float wShop = 0.0;
        {
          float side = 1.0 - step(0.6, abs(vON.y));
          bool xFace = abs(vON.x) > abs(vON.z);
          float u = xFace ? vLoc.z : vLoc.x;
          float halfW = xFace ? vSz.z * 0.5 : vSz.x * 0.5;
          float y = vLoc.y;
          float style = vInfo.y;
          bool isFront = !xFace && vON.z * vInfo.z > 0.0;
          // windows on the long faces; the ends stay blank party walls unless the block is wide-windowed or a tower
          float faced = (!xFace || style > 0.5) ? 1.0 : 0.0;
          float seed = floor(vInfo.x) * 0.37;
          if (y < ${f1(G0)}) {
            if (isFront) {
              // glazed ground floor: one band of dark glass with ink mullions every 3 m
              float band = step(abs(u), halfW - 0.4) * step(0.12, y) * step(y, ${f1(G0 - 0.5)}) * side;
              float m = 1.0 - step(0.05, abs(fract(u / 3.0 + 0.5) - 0.5) * 3.0);
              float rv = step(abs(u), halfW - 0.28) * step(y, ${f1(G0 - 0.38)}) * side - band;
              wGlass = band * (1.0 - m);
              wMull = band * m;
              wReveal = max(rv, 0.0);
              wShop = wGlass;
              wHash = sHash(vec2(floor(u / 3.0), seed));
            } else {
              vec2 cell = vec2(u / 2.4 + 0.5, y / ${f1(G0)});
              vec2 f = fract(cell);
              float inner = rect(f, vec2(0.3, 0.3), vec2(0.7, 0.76));
              float outer = rect(f, vec2(0.26, 0.27), vec2(0.74, 0.79));
              float inside = step(abs(u), halfW - 0.6) * side * faced;
              wGlass = inner * inside;
              wReveal = (outer - inner) * inside;
              wHash = sHash(floor(cell) + vec2(seed, xFace ? 7.0 : 3.0) + sign(vON.x + vON.z));
            }
          } else {
            float cw = style < 1.5 ? 2.4 : 1.6;
            vec2 cell = vec2(u / cw + 0.5, (y - ${f1(G0)}) / ${f1(FH)});
            vec2 f = fract(cell);
            float wx = style < 0.5 ? 0.24 : (style < 1.5 ? 0.12 : 0.28);
            vec2 a = vec2(wx, style > 1.5 ? 0.12 : 0.24);
            vec2 b = vec2(1.0 - wx, 0.86);
            vec2 t = vec2(0.09 / cw, 0.09 / ${f1(FH)});
            float inner = rect(f, a, b);
            float outer = rect(f, a - t, b + t);
            float inside = step(abs(u), halfW - 0.55) * step(${f1(G0 + 0.1)}, y) * step(y, vSz.y - ${f1(PARAPET - 0.05)}) * side * faced;
            wGlass = inner * inside;
            wReveal = (outer - inner) * inside;
            wHash = sHash(floor(cell) + vec2(seed + (xFace ? 3.1 : 0.0) * sign(vON.x + vON.z), mod(floor(vInfo.x), 13.0)));
          }
        }
        // recessed: the reveal is the wall in shade; dark glass, a touch lighter low down
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.62, wReveal);
        vec3 glassC = vec3(0.016, 0.02, 0.026) + vec3(0.01, 0.012, 0.014) * (1.0 - fract(vLoc.y / ${f1(FH)}));
        diffuseColor.rgb = mix(diffuseColor.rgb, glassC, wGlass);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.008), wMull);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.2, wGlass);`,
      )
      .replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.35, wGlass);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          // Seeded: about half the rooms are lit, the shops all are. Above 1 so they bloom.
          float lit = step(wHash, 0.5);
          vec3 warm = mix(vec3(1.0, 0.86, 0.66), vec3(1.0, 0.95, 0.86), step(0.6, fract(wHash * 9.3)));
          float room = wGlass * (1.0 - wShop) * lit * (1.0 + fract(wHash * 31.0) * 0.8);
          totalEmissiveRadiance += warm * (room + wShop * 1.5) * uNight;
        }`,
      );
  };
  m.customProgramCacheKey = () => "town-concrete-v1";
  return m;
}

// ------------------------------------------------------------ geometry

const _o = new THREE.Object3D();
function placed(x: number, y: number, z: number, yaw: number) {
  _o.position.set(x, y, z);
  _o.rotation.set(0, yaw, 0);
  _o.scale.set(1, 1, 1);
  _o.updateMatrix();
  return _o.matrix.clone();
}

/** Paint a geometry one colour and keep only position/normal/color. */
function paint(g: THREE.BufferGeometry, color: string) {
  const out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) if (k !== "position" && k !== "normal") out.deleteAttribute(k);
  const c = new THREE.Color(color);
  const n = out.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return out;
}

/** A box in building-local space (centre, full size), placed in the world. */
function box(world: THREE.Matrix4, color: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) {
  return paint(new THREE.BoxGeometry(sx, sy, sz).translate(cx, cy, cz).applyMatrix4(world), color);
}

/** The town as two merged geometries: bodies (for `facadeMaterial`) and vertex-coloured trims. */
export function townParts(list: TownBlock[]) {
  const bodies: THREE.BufferGeometry[] = [];
  const trims: THREE.BufferGeometry[] = [];
  for (const b of list) {
    const world = placed(b.x, b.floor, b.z, b.yaw);
    const sink = 0.3;
    // on a slope a concrete-dark plinth reaches down to the lowest ground, under a concrete coping
    if (b.floor - b.low > 0.12) {
      const ph = b.floor - b.low + 0.4;
      trims.push(box(world, CI.concreteDark, 0, 0.12 - ph / 2, 0, b.w + 0.36, ph, b.d + 0.36));
      trims.push(box(world, CI.concrete, 0, 0.14, 0, b.w + 0.46, 0.14, b.d + 0.46));
    }

    // Body: one box, with local coordinates for the window shader.
    const body = paint(new THREE.BoxGeometry(b.w, b.h + sink, b.d).translate(0, (b.h - sink) / 2, 0), b.color);
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

    // Parapet in concrete dark under a thin ink roof.
    trims.push(box(world, CI.concreteDark, 0, b.h - 0.2, 0, b.w + 0.2, 0.4, b.d + 0.2));
    trims.push(box(world, CI.ink, 0, b.h + 0.04, 0, b.w + 0.22, 0.08, b.d + 0.22));

    // What stands on the roof.
    const ox = (((b.seed * 7.3) % 1) - 0.5) * Math.max(0, b.w - 4);
    if (b.style === 2) {
      // a tower's glass crown under its own ink roof
      trims.push(box(world, CI.glass, 0, b.h + 0.08 + (b.rh - 0.3) / 2, 0, b.w - 1.2, b.rh - 0.3, b.d - 1.2));
      trims.push(box(world, CI.ink, 0, b.h + b.rh - 0.11, 0, b.w - 0.9, 0.22, b.d - 0.9));
    } else if (b.roof === 3 && b.rh > 1.5) {
      // a set-back top floor: concrete with a glass band toward the street, ink roof
      const pw = b.w * 0.55;
      const pd = b.d * 0.5;
      const pz = -b.front * (b.d - pd) * 0.3;
      trims.push(box(world, b.color, ox * 0.5, b.h + 0.08 + (b.rh - 0.3) / 2, pz, pw, b.rh - 0.3, pd));
      trims.push(box(world, CI.glass, ox * 0.5, b.h + 0.08 + (b.rh - 0.3) * 0.55, pz + b.front * (pd / 2 + 0.01), pw - 0.6, (b.rh - 0.3) * 0.5, 0.04));
      trims.push(box(world, CI.ink, ox * 0.5, b.h + b.rh - 0.11, pz, pw + 0.3, 0.16, pd + 0.3));
    } else if (b.roof === 1 && b.rh > 0.5) {
      // rooftop plant: a graphite box with a paper louvre line
      const pw = Math.min(3.2, b.w * 0.4);
      const pd = Math.min(2.2, b.d * 0.4);
      const pz = -b.front * (b.d / 2 - pd / 2 - 0.8);
      trims.push(box(world, CI.graphite, ox, b.h + 0.08 + (b.rh - 0.1) / 2, pz, pw, b.rh - 0.1, pd));
      trims.push(box(world, CI.concreteDark, ox, b.h + 0.08 + (b.rh - 0.1) * 0.62, pz + b.front * (pd / 2 + 0.01), pw - 0.3, 0.08, 0.03));
    }

    // The rare orange door on the street face.
    if (b.accent) trims.push(box(world, CI.orange, b.w / 2 - 1.2, 1.2, b.front * (b.d / 2 + 0.03), 1.1, 2.3, 0.08));
  }
  return { bodies: mergeGeometries(bodies), trims: mergeGeometries(trims) };
}
