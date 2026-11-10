// Shared GPU pieces for the journeys: atlas quads (one InstancedMesh per material, each instance
// showing its own rect of the atlas and wiping in from the left), a "lit up to here" material
// for painted lines, the brand's ground materials and a ribbon builder for curved paint.
"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { dayNight } from "../daynight";
import { C } from "../palette";
import { buildAtlas, type Atlas, type Item } from "./atlas";

/** Builds the atlas on mount (fonts first); null until it is ready. */
export function useAtlas(make: () => Item[]) {
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  useEffect(() => {
    let live = true;
    let made: Atlas | null = null;
    buildAtlas(make()).then((a) => {
      made = a;
      if (live) setAtlas(a);
      else a.texture.dispose();
    });
    return () => {
      live = false;
      made?.texture.dispose();
    };
    // the items are fixed for a journey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return atlas;
}

// ---------------------------------------------------------------- atlas quads

/** A unit quad (1 x 1 in x, y, facing +z) with the per-instance rect and wipe attributes. */
export function quadGeometry(count: number) {
  const g = new THREE.PlaneGeometry(1, 1);
  g.setAttribute("aRect", new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
  const wipe = new Float32Array(count).fill(1);
  g.setAttribute("aWipe", new THREE.InstancedBufferAttribute(wipe, 1));
  return g;
}

/** Points a material's map (and emissive map) at the instance's rect, and wipes it from the left. */
function patchQuads<M extends THREE.Material>(m: M, key: string): M {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec4 aRect;\nattribute float aWipe;\nvarying float vJx;\nvarying float vJw;")
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
vJx = uv.x; vJw = aWipe;
#ifdef USE_MAP
vMapUv = aRect.xy + uv * aRect.zw;
#endif
#ifdef USE_EMISSIVEMAP
vEmissiveMapUv = aRect.xy + uv * aRect.zw;
#endif`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vJx;\nvarying float vJw;")
      .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (vJx > vJw) discard;");
  };
  m.customProgramCacheKey = () => key;
  return m;
}

/** Card faces: lit like paper by day, a little self-lit at night (set `emissiveIntensity` from the night). */
export function cardMaterial(map: THREE.Texture) {
  return patchQuads(new THREE.MeshStandardMaterial({ map, emissive: "#ffffff", emissiveMap: map, emissiveIntensity: 0.05, roughness: 0.85 }), "journey-card");
}

/** Painted glyphs (white in the atlas): tinted by `color` or the instance colour, cut out by alpha. */
export function glyphMaterial(map: THREE.Texture, color: string = C.paper) {
  return patchQuads(
    new THREE.MeshStandardMaterial({ map, color, alphaTest: 0.45, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    "journey-glyph",
  );
}

/** Glyphs that glow orange (lit at night as by day). */
export function glowGlyphMaterial(map: THREE.Texture) {
  return patchQuads(
    new THREE.MeshBasicMaterial({ map, color: C.orange, alphaTest: 0.45, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    "journey-glow-glyph",
  );
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Sets one instance: position, Euler rotation (XYZ), size (w, h). */
export function setQuad(mesh: THREE.InstancedMesh, i: number, pos: [number, number, number], rot: [number, number, number], w: number, h: number) {
  _m.compose(_p.set(...pos), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2], "YXZ")), _s.set(w, h, 1));
  mesh.setMatrixAt(i, _m);
}

/** Sets one instance of a unit box: position, yaw, size. */
export function setBox(mesh: THREE.InstancedMesh, i: number, pos: [number, number, number], yaw: number, size: [number, number, number]) {
  _m.compose(_p.set(...pos), _q.setFromEuler(_e.set(0, yaw, 0, "YXZ")), _s.set(...size));
  mesh.setMatrixAt(i, _m);
}

/** Sets one instance of a unit box: position, Euler rotation (YXZ), size. */
export function setBoxEuler(mesh: THREE.InstancedMesh, i: number, pos: [number, number, number], rot: [number, number, number], size: [number, number, number]) {
  _m.compose(_p.set(...pos), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2], "YXZ")), _s.set(...size));
  mesh.setMatrixAt(i, _m);
}

export function setRect(mesh: THREE.InstancedMesh, i: number, r: [number, number, number, number]) {
  const a = mesh.geometry.getAttribute("aRect") as THREE.InstancedBufferAttribute;
  a.setXYZW(i, r[0], r[1], r[2], r[3]);
  a.needsUpdate = true;
}

export function setWipe(mesh: THREE.InstancedMesh, i: number, w: number) {
  const a = mesh.geometry.getAttribute("aWipe") as THREE.InstancedBufferAttribute;
  if (Math.abs(a.getX(i) - w) < 1e-4) return;
  a.setX(i, w);
  a.needsUpdate = true;
}

/** A card material's night glow: lit like paper by day, a little self-lit at night. */
export function nightGlow(m: THREE.Mesh | null) {
  if (m) (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.04 + 0.5 * dayNight.night;
}

/** Marks instanced meshes' matrices (and aWipe) changed. */
export function dirty(...meshes: (THREE.InstancedMesh | null)[]) {
  for (const m of meshes) {
    if (!m) continue;
    m.instanceMatrix.needsUpdate = true;
    const w = m.geometry.getAttribute("aWipe");
    if (w) w.needsUpdate = true;
  }
}

/** Flat on the ground, reading upright from the default chase camera (its up points north, -z). */
export const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

// ---------------------------------------------------------------- lit-up-to-here paint

/** Orange paint shown only where its `aS` (distance or time along the journey) is behind `u.value`. */
export function progressMaterial(u: { value: number }) {
  const m = new THREE.MeshBasicMaterial({ color: C.orange, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uJS = u;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aS;\nvarying float vJS;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvJS = aS;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uJS;\nvarying float vJS;")
      .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (vJS > uJS) discard;");
  };
  m.customProgramCacheKey = () => "journey-progress";
  return m;
}

// ---------------------------------------------------------------- materials

/** The brand's ground and object materials (palette.ts), one each, shared by the journeys. */
export const MAT = {
  concrete: new THREE.MeshStandardMaterial({ color: C.concrete, roughness: 0.95 }),
  concreteDark: new THREE.MeshStandardMaterial({ color: C.concreteDark, roughness: 0.95 }),
  // the game's tarmac (BRAND.md decision log 2026-10-26: #2b2c2f renders like the proposal's #3a3b3e)
  asphalt: new THREE.MeshStandardMaterial({ color: "#2b2c2f", roughness: 0.92 }),
  paint: new THREE.MeshStandardMaterial({ color: C.paper, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  inkPaint: new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  ink: new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.6, metalness: 0.2 }),
  paper: new THREE.MeshStandardMaterial({ color: C.paper, roughness: 0.8 }),
  orange: new THREE.MeshBasicMaterial({ color: C.orange, toneMapped: false }),
};

// ---------------------------------------------------------------- geometry helpers

/** Merges plain (non-indexed or indexed) geometries that share the same attributes into one. */
export function merge(geos: THREE.BufferGeometry[]) {
  const list = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const names = Object.keys(list[0].attributes);
  const out = new THREE.BufferGeometry();
  for (const n of names) {
    const size = list[0].getAttribute(n).itemSize;
    const total = list.reduce((a, g) => a + g.getAttribute(n).count * size, 0);
    const arr = new Float32Array(total);
    let o = 0;
    for (const g of list) {
      const a = g.getAttribute(n).array as Float32Array;
      arr.set(a, o);
      o += a.length;
    }
    out.setAttribute(n, new THREE.BufferAttribute(arr, size));
  }
  out.computeBoundingSphere();
  return out;
}

/** A box at a place, as its own geometry (for merging). */
export function boxAt(w: number, h: number, d: number, x: number, y: number, z: number, yaw = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (yaw) g.rotateY(yaw);
  g.translate(x, y, z);
  return g;
}

/** A flat rectangle on the ground (y up), centred at x, z, `w` along x, `d` along z. */
export function flatAt(w: number, d: number, x: number, y: number, z: number, yaw = 0) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  if (yaw) g.rotateY(yaw);
  g.translate(x, y, z);
  return g;
}

export type Sample = { x: number; z: number; tx: number; tz: number; s: number };

/**
 * A flat strip along a path of samples, from distance s0 to s1, its centre `off` to the left
 * of travel (negative: right), `w` wide, at height y. Carries `aS` (distance along the path).
 */
export function ribbon(path: Sample[], s0: number, s1: number, off: number, w: number, y: number) {
  const pos: number[] = [];
  const sv: number[] = [];
  const pts = path.filter((p) => p.s > s0 && p.s < s1);
  const at = (s: number) => {
    const i = Math.max(1, path.findIndex((p) => p.s >= s));
    const a = path[i - 1];
    const b = path[Math.min(i, path.length - 1)];
    const k = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
    return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, tx: a.tx + (b.tx - a.tx) * k, tz: a.tz + (b.tz - a.tz) * k, s };
  };
  const all = [at(s0), ...pts, at(s1)];
  for (let i = 0; i < all.length - 1; i++) {
    const quad = [all[i], all[i + 1]].map((p) => {
      const l = Math.hypot(p.tx, p.tz) || 1;
      // left of travel: (tz, -tx) for a tangent (tx, tz) in x-z with y up
      const nx = p.tz / l;
      const nz = -p.tx / l;
      const c = off;
      return {
        l: [p.x + nx * (c + w / 2), y, p.z + nz * (c + w / 2)],
        r: [p.x + nx * (c - w / 2), y, p.z + nz * (c - w / 2)],
        s: p.s,
      };
    });
    const [a, b] = quad;
    // two triangles, counter-clockwise from above
    pos.push(...a.r, ...b.r, ...a.l, ...a.l, ...b.r, ...b.l);
    sv.push(a.s, b.s, a.s, a.s, b.s, b.s);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setAttribute("aS", new THREE.BufferAttribute(new Float32Array(sv), 1));
  return g;
}

/** Adds an `aS` attribute of one value to a geometry (so it merges with ribbons). */
export function withS(g: THREE.BufferGeometry, s: number) {
  const n = g.getAttribute("position").count;
  g.setAttribute("aS", new THREE.BufferAttribute(new Float32Array(n).fill(s), 1));
  return g;
}
