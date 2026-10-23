// Geometry for Bruno Simon's baked props (./brunoProps.ts, MIT, (c) 2025 Bruno Simon).
// His palette is brighter than ours: each of his colours maps to one of ours here.
import * as THREE from "three";
import type { PropModel } from "./brunoProps";

const REMAP: Record<string, string> = {
  "#f8a658": "#b98a62", // his orange wood -> weathered oak
  "#f29246": "#b98a62",
  "#7c7691": "#4d5058", // his lilac metal -> slate iron
};

const cache = new Map<PropModel, THREE.BufferGeometry>();

/** One BufferGeometry per prop, with our colours as vertex colours (linear). */
export function propGeometry(model: PropModel) {
  let g = cache.get(model);
  if (g) return g;
  g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(model.position, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(model.normal, 3));
  const col = new Float32Array(model.color.length);
  const c = new THREE.Color();
  for (let i = 0; i < model.color.length; i += 3) {
    const hex = "#" + model.color.slice(i, i + 3).map((v) => v.toString(16).padStart(2, "0")).join("");
    c.set(REMAP[hex] ?? hex);
    col.set([c.r, c.g, c.b], i);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setIndex(model.index);
  g.computeBoundingSphere();
  cache.set(model, g);
  return g;
}

/**
 * Props (benches, lanterns, fences, garden lamps) are scaled up by this so they read
 * chunky next to the car, like in Bruno's world (owner, 4b-b; the car is CAR_SCALE).
 */
export const PROP_SCALE = 1.3;

/** Height of the prop's origin above its lowest point: place it at ground + this. */
export function propFoot(model: PropModel) {
  let lo = Infinity;
  for (let i = 1; i < model.position.length; i += 3) lo = Math.min(lo, model.position[i]);
  return -lo;
}
