// Dynamic. Name letters: real extruded IBM Plex Sans SemiBold glyphs (the UI's face) with a
// hard chamfer, matte like painted steel. Origin at ground centre. All letters are 1.55 m
// tall and 0.5 m deep (z -0.25..0.25); widths in LETTER_WIDTH (H 1.24, I 0.73, J 0.99...).
// A single cuboid of LETTER_WIDTH x 1.55 x 0.5 centred at y=0.775 is a good collider.
// `letterBoxes(char)` returns that box (center, size, rotZ) for compound colliders.
// The font loads once (opentype.js) and is cached; the letter renders nothing until then.
"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import opentype from "opentype.js";
import { C } from "../../palette";
import { FONT_SANS } from "./Label";
import { mat, type GroupProps } from "./shared";

export type LetterChar = "H" | "E" | "N" | "I" | "L" | "G" | "A" | "J" | "R";

const LH = 1.55; // total height incl. bevel
const DEPTH = 0.5; // total depth incl. bevel
const BEVEL_T = 0.03; // chamfer depth (z)
const BEVEL_S = 0.025; // chamfer size (outline growth)
const CAP = 698; // Plex Sans cap height in font units

export type LetterBar = { pos: [number, number, number]; size: [number, number, number]; rotZ: number };

// Plex Sans SemiBold glyph boxes (x1..x2 in font units), scaled to LH.
const GLYPH_X: Record<LetterChar, [number, number]> = {
  H: [82, 637],
  E: [82, 542],
  N: [82, 637],
  I: [53, 370],
  L: [82, 489],
  G: [52, 641],
  A: [21, 651],
  J: [26, 467],
  R: [82, 616],
};
const SCALE = (LH - 2 * BEVEL_S) / CAP;

export const LETTER_WIDTH: Record<LetterChar, number> = Object.fromEntries(
  (Object.keys(GLYPH_X) as LetterChar[]).map((k) => [k, Math.round(((GLYPH_X[k][1] - GLYPH_X[k][0]) * SCALE + 2 * BEVEL_S) * 100) / 100]),
) as Record<LetterChar, number>;

/** Collider-friendly box for a letter, in the letter's local space. */
export function letterBoxes(char: LetterChar): LetterBar[] {
  return [{ pos: [0, LH / 2, 0], size: [LETTER_WIDTH[char], LH, DEPTH], rotZ: 0 }];
}

// ------------------------------------------------------------ font -> geometry

let fontPromise: Promise<opentype.Font> | null = null;
export function loadFont() {
  fontPromise ??= fetch(FONT_SANS)
    .then((r) => r.arrayBuffer())
    .then((b) => opentype.parse(b));
  return fontPromise;
}

const glyphCache = new Map<LetterChar, THREE.BufferGeometry>();

/** Split an opentype path into closed THREE.Paths (font units, y up). */
function contours(cmds: opentype.PathCommand[]): THREE.Path[] {
  const out: THREE.Path[] = [];
  let p: THREE.Path | null = null;
  for (const c of cmds) {
    switch (c.type) {
      case "M":
        p = new THREE.Path();
        p.moveTo(c.x, c.y);
        out.push(p);
        break;
      case "L":
        p?.lineTo(c.x, c.y);
        break;
      case "Q":
        p?.quadraticCurveTo(c.x1, c.y1, c.x, c.y);
        break;
      case "C":
        p?.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
        break;
      case "Z":
        p?.closePath();
        p = null;
        break;
    }
  }
  return out;
}

const area = (pts: THREE.Vector2[]) => THREE.ShapeUtils.area(pts);

function inside(pt: THREE.Vector2, poly: THREE.Vector2[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/** Glyph outline -> shapes with holes. The biggest contour's winding is "outer"; the opposite winding is a hole. */
function glyphShapes(font: opentype.Font, char: LetterChar): THREE.Shape[] {
  return commandShapes(font.charToGlyph(char).path.commands);
}

/** Path commands of one glyph -> extrudable shapes with holes. */
export function commandShapes(cmds: opentype.PathCommand[]): THREE.Shape[] {
  const paths = contours(cmds);
  const items = paths.map((path) => {
    const pts = path.getPoints(8);
    return { path, pts, a: area(pts) };
  });
  if (!items.length) return [];
  const outerSign = Math.sign(items.reduce((m, it) => (Math.abs(it.a) > Math.abs(m.a) ? it : m)).a);
  const outers = items.filter((it) => Math.sign(it.a) === outerSign);
  const holes = items.filter((it) => Math.sign(it.a) !== outerSign);
  const shapes = outers.map((o) => {
    const s = new THREE.Shape();
    s.curves = o.path.curves;
    s.currentPoint = o.path.currentPoint;
    return { s, pts: o.pts, a: Math.abs(o.a) };
  });
  for (const h of holes) {
    // smallest outer that contains the hole
    const host = shapes.filter((s) => inside(h.pts[0], s.pts)).sort((x, y) => x.a - y.a)[0] ?? shapes[0];
    host?.s.holes.push(h.path);
  }
  return shapes.map((s) => s.s);
}

function glyphGeometry(font: opentype.Font, char: LetterChar) {
  let g = glyphCache.get(char);
  if (g) return g;
  // built in font units, then scaled uniformly to meters
  const e = new THREE.ExtrudeGeometry(glyphShapes(font, char), {
    depth: (DEPTH - 2 * BEVEL_T) / SCALE,
    bevelEnabled: true,
    bevelThickness: BEVEL_T / SCALE,
    bevelSize: BEVEL_S / SCALE,
    bevelSegments: 1,
    curveSegments: 10,
  });
  const [x1, x2] = GLYPH_X[char];
  e.translate(-(x1 + x2) / 2, BEVEL_S / SCALE, -(DEPTH - 2 * BEVEL_T) / SCALE / 2);
  e.scale(SCALE, SCALE, SCALE);
  e.computeBoundingBox();
  e.computeBoundingSphere();
  g = e;
  glyphCache.set(char, g);
  return g;
}

function useGlyph(char: LetterChar) {
  const [g, setG] = useState<THREE.BufferGeometry | null>(() => glyphCache.get(char) ?? null);
  useEffect(() => {
    if (g && glyphCache.get(char) === g) return;
    let alive = true;
    loadFont().then((f) => {
      if (alive) setG(glyphGeometry(f, char));
    });
    return () => {
      alive = false;
    };
  }, [char, g]);
  return g && glyphCache.get(char) === g ? g : null;
}

/** One extruded Plex letter, 1.55 m tall, matte painted steel (ink by default). */
export function Letter({ char, color = C.ink, ...props }: GroupProps & { char: LetterChar; color?: string }) {
  const g = useGlyph(char);
  const m = mat(color, { r: 0.6, m: 0.1 });
  return <group {...props}>{g ? <mesh geometry={g} material={m} castShadow receiveShadow /> : null}</group>;
}
