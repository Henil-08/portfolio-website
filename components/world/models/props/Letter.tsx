// Dynamic. Chunky name letters built from rounded bars. Origin at ground center.
// All letters are 1.6 m tall and 0.5 m deep. Approximate bounding boxes (W x H x D):
//   H: 1.40 x 1.6 x 0.5    E: 1.15 x 1.6 x 0.5    N: 1.45 x 1.6 x 0.5
//   I: 0.52 x 1.6 x 0.5    L: 1.10 x 1.6 x 0.5
// `letterBoxes(char)` returns the bars (center, size, rotZ) if you want compound colliders.
"use client";

import { RoundedBox } from "@react-three/drei";
import { C } from "../../palette";
import { mat, type GroupProps } from "./shared";

export type LetterChar = "H" | "E" | "N" | "I" | "L";

const LH = 1.6;
const DEPTH = 0.5;
const S = 0.46; // stroke

export type LetterBar = { pos: [number, number, number]; size: [number, number, number]; rotZ: number };

const bar = (x: number, y: number, w: number, h: number, rotZ = 0): LetterBar => ({
  pos: [x, y, 0],
  size: [w, h, DEPTH],
  rotZ,
});

export const LETTER_WIDTH: Record<LetterChar, number> = { H: 1.4, E: 1.15, N: 1.45, I: 0.52, L: 1.1 };

/** The rounded bars that make up a letter, in the letter's local space. */
export function letterBoxes(char: LetterChar): LetterBar[] {
  const w = LETTER_WIDTH[char];
  const xl = -w / 2 + S / 2;
  const xr = w / 2 - S / 2;
  const v = (x: number) => bar(x, LH / 2, S, LH);
  switch (char) {
    case "H":
      return [v(xl), v(xr), bar(0, LH / 2, w - 2 * S + 0.2, S * 0.9)];
    case "E": {
      const armW = w - S + 0.02;
      const ax = xl + S / 2 + armW / 2 - 0.02;
      return [v(xl), bar(ax, LH - S / 2, armW, S), bar(ax - 0.06, LH / 2, armW - 0.12, S * 0.85), bar(ax, S / 2, armW, S)];
    }
    case "N": {
      const dx = xr - xl;
      const dy = LH - S;
      const len = Math.hypot(dx, dy);
      return [v(xl), v(xr), bar(0, LH / 2, S * 1.02, len, Math.atan2(dx, dy))];
    }
    case "I":
      return [bar(0, LH / 2, w, LH)];
    case "L":
      return [v(xl), bar(xl + S / 2 + (w - S) / 2 - 0.02, S / 2, w - S + 0.04, S)];
  }
}

/** One chunky 3D letter (H, E, N, I or L), 1.6 m tall, toy-block style. */
export function Letter({ char, color = C.red, ...props }: GroupProps & { char: LetterChar; color?: string }) {
  const m = mat(color, { r: 0.55 });
  return (
    <group {...props}>
      {letterBoxes(char).map((b, i) => (
        <RoundedBox
          key={i}
          args={b.size}
          radius={0.12}
          smoothness={3}
          position={b.pos}
          rotation={[0, 0, b.rotZ]}
          material={m}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}
