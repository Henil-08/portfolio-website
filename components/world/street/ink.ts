// Trackside colours and parts in the approved world palette ("Concrete & Ink", docs/BRAND.md):
// matte concrete, ink steel, paper paint and one orange per object.
import * as THREE from "three";
import { geo, mat } from "../models/props/shared";

export const K = {
  concrete: "#d9d6ce",
  concreteDark: "#b8b4a9",
  ink: "#151515",
  graphite: "#2b2c2e",
  paper: "#f3f2ed",
  orange: "#ff4f00",
  glass: "#1f262b",
};

/** Cached materials for the trackside models (never dispose). */
export const km = {
  concrete: () => mat(K.concrete, { r: 0.95 }),
  concreteDark: () => mat(K.concreteDark, { r: 0.95 }),
  ink: () => mat(K.ink, { r: 0.55, m: 0.2 }),
  inkMatte: () => mat(K.ink, { r: 0.8 }),
  graphite: () => mat(K.graphite, { r: 0.6, m: 0.3 }),
  paper: () => mat(K.paper, { r: 0.6 }),
  orange: () => mat(K.orange, { r: 0.55 }),
  /** white base so per-instance colours show as painted */
  painted: () => mat("#ffffff", { r: 0.8 }),
};

/** The W04 debris fence: ink wire in a diamond weave, see-through between the wires. */
export function debrisFenceMat() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = "#fff";
  g.lineWidth = 3;
  g.beginPath();
  for (const k of [-64, 0, 64]) {
    g.moveTo(k, 0);
    g.lineTo(k + 64, 64);
    g.moveTo(k + 64, 0);
    g.lineTo(k, 64);
  }
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ color: K.ink, alphaMap: t, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.2 });
}

/**
 * The W04 concrete wall section, 1 m long along +X (scale x per piece), base on y = 0:
 * a wide foot that steps in to a slim upright, 1 m tall.
 */
export const WALL_H = 1.0;
export const WALL_FOOT = 0.6;
export const wallGeo = () =>
  geo("ink-wall", () => {
    const s = new THREE.Shape();
    s.moveTo(-0.3, 0);
    s.lineTo(0.3, 0);
    s.lineTo(0.12, 0.25);
    s.lineTo(0.1, WALL_H);
    s.lineTo(-0.1, WALL_H);
    s.lineTo(-0.12, 0.25);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
    g.translate(0, 0, -0.5);
    g.rotateY(Math.PI / 2);
    return g;
  });
