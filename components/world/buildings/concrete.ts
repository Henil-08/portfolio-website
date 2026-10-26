// Concrete & Ink for buildings (docs/BRAND.md, World, approved 2026-10-26): the garages (W02)
// and the town blocks (W09). Local to the buildings so they keep their look while palette.ts
// `C` is retuned; the values are the brand's.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const CI = {
  concrete: "#d9d6ce",
  concreteDark: "#b8b4a9",
  ink: "#151515",
  graphite: "#2b2c2e",
  paper: "#f3f2ed",
  orange: "#ff4f00",
  glass: "#1f262b",
  lamp: "#fff3dc",
};

/** A box part: full size `s`, centre `p`, both in the parent's frame. */
export type Part = [s: [number, number, number], p: [number, number, number]];

/** Boxes merged into one geometry (one draw call per material). */
export function mergeBoxes(parts: Part[]) {
  if (!parts.length) return new THREE.BufferGeometry();
  const gs = parts.map(([s, p]) => new THREE.BoxGeometry(...s).translate(...p));
  const g = mergeGeometries(gs);
  for (const x of gs) x.dispose();
  return g;
}

const labels = new Map<string, THREE.MeshStandardMaterial>();

/**
 * Mono caps on a plate (bay codes, names), drawn to a canvas once per text and redrawn
 * when IBM Plex Mono has loaded. `w` x `h` is the plate's aspect in pixels.
 */
export function plateMaterial(text: string, { fg = CI.paper, bg = CI.ink, w = 512, h = 96, size = 56 } = {}) {
  const key = [text, fg, bg, w, h, size].join("|");
  let m = labels.get(key);
  if (m) return m;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const draw = () => {
    const g = c.getContext("2d")!;
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    const fam = getComputedStyle(document.body).getPropertyValue("--font-plex-mono").trim();
    g.font = `500 ${size}px ${fam ? `${fam}, ` : ""}monospace`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + 3);
    t.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 });
  labels.set(key, m);
  return m;
}
