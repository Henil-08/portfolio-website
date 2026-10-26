// Board artwork in the brand (docs/BRAND.md): white face, the still mark on the left, ink text
// in IBM Plex, one thin orange rule. Drawn once per text on a canvas, after the fonts load.
import * as THREE from "three";
import { ATTENTION, INK, ORANGE } from "@/components/brand/mark";

const fontVar = (v: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fallback;

export type BoardFonts = { sans: string; mono: string };

/** Waits for Plex Sans and Mono so canvas text never falls back. */
export async function loadBoardFonts(): Promise<BoardFonts> {
  const sans = fontVar("--font-plex", "system-ui, sans-serif");
  const mono = fontVar("--font-plex-mono", "ui-monospace, monospace");
  await Promise.all([document.fonts.load(`600 40px ${sans}`), document.fonts.load(`600 40px ${mono}`)]).catch(() => {});
  return { sans, mono };
}

/** The still mark: 4x4 cells in a 64-unit box, ink at its weight, the last cell orange. */
function drawMark(g: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const k = size / 64;
  ATTENTION.forEach((row, r) =>
    row.forEach((w, c) => {
      g.globalAlpha = w < 0 ? 1 : w;
      g.fillStyle = w < 0 ? ORANGE : INK;
      g.fillRect(x + (4 + c * 14.5) * k, y + (4 + r * 14.5) * k, 12.5 * k, 12.5 * k);
    }),
  );
  g.globalAlpha = 1;
}

/**
 * One board face. `parts` are drawn left to right after the mark: mono parts for codes
 * (HG-08, 08), sans for words. `w`/`h` in metres set the canvas aspect.
 */
export function boardTexture(parts: { text: string; mono?: boolean }[], w: number, h: number, fonts: BoardFonts) {
  const H = 128;
  const W = Math.round((H * w) / h);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);
  // the mark: its visible square as tall as the cap height and a bit, clear space of one cell
  const m = H * 0.68;
  const pad = H * 0.18;
  drawMark(g, pad, (H - m) / 2 - H * 0.03, m);
  let x = pad + m + H * 0.28;
  g.fillStyle = INK;
  g.textBaseline = "middle";
  const size = Math.round(H * 0.5);
  for (const p of parts) {
    g.font = `600 ${size}px ${p.mono ? fonts.mono : fonts.sans}`;
    g.letterSpacing = p.mono ? "0px" : `${Math.round(size * 0.06)}px`;
    g.fillText(p.text, x, H * 0.47);
    x += g.measureText(p.text).width + H * 0.4;
  }
  // one thin orange rule along the foot
  g.fillStyle = ORANGE;
  g.fillRect(0, H - Math.round(H * 0.05), W, Math.round(H * 0.05));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
