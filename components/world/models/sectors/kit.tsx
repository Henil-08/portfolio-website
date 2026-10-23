// Shared building kit for the sector sets: instanced parts, metre-UV boxes,
// a cached brick texture and plain-type canvas signage. Pure visuals.
"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { geo } from "../props/shared";

/** Transform tuple: x, y, z, sx, sy, sz, rx, ry, rz (scale defaults 1, rotation 0). */
export type T9 = [number, number, number, number?, number?, number?, number?, number?, number?];

const _o = new THREE.Object3D();
function toMatrix(t: T9) {
  const [x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0] = t;
  _o.position.set(x, y, z);
  _o.rotation.set(rx, ry, rz);
  _o.scale.set(sx, sy, sz);
  _o.updateMatrix();
  return _o.matrix.clone();
}

/** Ground-placed parent transform: x, z, yaw (and optional y). */
export const at = (x: number, z: number, ry = 0, y = 0): T9 => [x, y, z, 1, 1, 1, 0, ry, 0];

/**
 * One instanced mesh for many copies of a part. `items` are local transforms;
 * when `at` is given every item is repeated under every parent transform.
 */
export function Inst({
  geometry,
  material,
  items,
  at: parents,
  cast = true,
  receive = true,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  items: T9[];
  at?: T9[];
  cast?: boolean;
  receive?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mats = useMemo(() => {
    const local = items.map(toMatrix);
    if (!parents) return local;
    const out: THREE.Matrix4[] = [];
    for (const p of parents) {
      const pm = toMatrix(p);
      for (const l of local) out.push(new THREE.Matrix4().multiplyMatrices(pm, l));
    }
    return out;
  }, [items, parents]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    mats.forEach((mx, i) => m.setMatrixAt(i, mx));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [mats]);
  return <instancedMesh key={mats.length} ref={ref} args={[geometry, material, mats.length]} castShadow={cast} receiveShadow={receive} />;
}

/** Blend two palette colours (keeps everything derived from the palette). */
export function mix(a: string, b: string, t: number) {
  return "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
}

/** Box whose UVs are in metres, so tiling textures keep their scale on any size. */
export function mBox(w: number, h: number, d: number) {
  return geo(`mbox-${w}-${h}-${d}`, () => {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const dims = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ];
    for (let f = 0; f < 6; f++)
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
      }
    return g;
  });
}

let brickTex: THREE.CanvasTexture | null = null;
/** Greyscale running-bond brick tile, 1.2 m x 0.8 m in metre UV space. Multiplied by the material colour. */
function brickTexture() {
  if (brickTex) return brickTex;
  const c = document.createElement("canvas");
  c.width = 384;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f2efea";
  g.fillRect(0, 0, c.width, c.height);
  const rows = 4;
  const cols = 3;
  const bh = c.height / rows;
  const bw = c.width / cols;
  const mortar = 5;
  let s = 7;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? bw / 2 : 0;
    for (let k = -1; k < cols + 1; k++) {
      const v = Math.round(200 + rnd() * 28);
      g.fillStyle = `rgb(${v},${v - 3},${v - 6})`;
      g.fillRect(k * bw + off + mortar / 2, r * bh + mortar / 2, bw - mortar, bh - mortar);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 1.2, 1 / 0.8);
  t.anisotropy = 8;
  brickTex = t;
  return t;
}

const brickMats = new Map<string, THREE.MeshStandardMaterial>();
/** Satin painted-resin brick: palette colour multiplied by the brick tile. Needs metre UVs (mBox / extrusions). */
export function brickMat(color: string, r = 0.75) {
  const key = color + r;
  let m = brickMats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: r, metalness: 0, map: brickTexture() });
    brickMats.set(key, m);
  }
  return m;
}

const textMats = new Map<string, THREE.MeshStandardMaterial>();
/**
 * Plain sans-serif wordmark on a transparent canvas (system font, no network).
 * Returns a material for a plane of aspect `w / h`.
 */
export function plainTextMat(text: string, color: string, opts: { weight?: number; spacing?: number; glow?: number; w?: number; h?: number } = {}) {
  const { weight = 500, spacing = 0.18, glow = 0, w = 1024, h = 192 } = opts;
  const key = [text, color, weight, spacing, glow, w, h].join("|");
  let m = textMats.get(key);
  if (!m) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    const size = h * 0.62;
    g.font = `${weight} ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    g.fillStyle = "#ffffff";
    g.textBaseline = "middle";
    g.textAlign = "center";
    // manual letter spacing for an even wordmark
    const chars = [...text];
    const widths = chars.map((ch) => g.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * size * (chars.length - 1);
    let x = (w - total) / 2;
    chars.forEach((ch, i) => {
      g.fillText(ch, x + widths[i] / 2, h / 2 + size * 0.04);
      x += widths[i] + spacing * size;
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    m = new THREE.MeshStandardMaterial({ color, map: t, transparent: true, roughness: 0.4, alphaTest: 0.05 });
    if (glow) {
      m.emissive.set(color);
      m.emissiveMap = t;
      m.emissiveIntensity = glow;
      m.toneMapped = false;
    }
    textMats.set(key, m);
  }
  return m;
}

export const unitPlane = () => geo("plane", () => new THREE.PlaneGeometry(1, 1));
/** Upper half cylinder (theta 0..PI on local +X), axis Y. Rotate z by PI/2 to lay it along X as a vault. */
export const halfCyl = () => geo("half-cyl", () => new THREE.CylinderGeometry(1, 1, 1, 24, 1, false, 0, Math.PI));
/** Hemisphere dome, radius 1, base at y=0. */
export const dome = () => geo("dome", () => new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2));
