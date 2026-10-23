"use client";

// Any short word as extruded Racero letters (same glyph pipeline as Letter.tsx).
import { useEffect, useState } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import type { ReactNode } from "react";
import { commandShapes, loadFont } from "./Letter";

type Props = ThreeElements["group"] & {
  text: string;
  /** Cap height in metres. */
  height?: number;
  depth?: number;
  /** Scales the whole word down if it would be wider than this. */
  maxWidth?: number;
  /** Material element(s) for the letters. */
  children: ReactNode;
};

const cache = new Map<string, THREE.BufferGeometry>();

async function wordGeometry(text: string, height: number, depth: number, maxWidth: number) {
  const key = `${text}|${height}|${depth}|${maxWidth}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const font = await loadFont();
  const size = 1000;
  const glyphs = font.getPaths(text, 0, 0, size);
  const shapes = glyphs.flatMap((p) =>
    commandShapes(p.commands.map((c) => ({ ...c, y: -("y" in c ? c.y : 0), y1: -("y1" in c ? c.y1 : 0), y2: -("y2" in c ? c.y2 : 0) }) as typeof c))
  );
  const g = new THREE.ExtrudeGeometry(shapes, {
    depth: depth * 0.8,
    bevelEnabled: true,
    bevelThickness: depth * 0.1,
    bevelSize: depth * 0.06,
    bevelSegments: 2,
    curveSegments: 6,
  });
  // font units -> metres by cap height, centred on x, sitting on y = 0
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const capH = font.charToGlyph("H").getBoundingBox().y2 || bb.max.y - bb.min.y;
  const s = Math.min(height / capH, maxWidth / (bb.max.x - bb.min.x));
  g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, 0);
  g.scale(s, s, 1);
  g.computeVertexNormals();
  cache.set(key, g);
  return g;
}

export function Word3D({ text, height = 0.6, depth = 0.12, maxWidth = Infinity, children, ...props }: Props) {
  const [geo, setGeo] = useState<THREE.BufferGeometry | null>(null);
  useEffect(() => {
    let live = true;
    void wordGeometry(text, height, depth, maxWidth).then((g) => live && setGeo(g));
    return () => {
      live = false;
    };
  }, [text, height, depth, maxWidth]);
  if (!geo) return null;
  return (
    <group {...props}>
      <mesh geometry={geo} castShadow>
        {children}
      </mesh>
    </group>
  );
}
