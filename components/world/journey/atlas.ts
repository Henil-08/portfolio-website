// One canvas atlas per journey: every label it draws (role cards, chapter boards, painted years
// and codes) in a single texture, so all of them go out in a few instanced draws instead of one
// troika text per line. Drawn once, after IBM Plex has loaded (street/boardArt.ts).
//
// Cards follow the datasheet (docs/BRAND.md): paper face, ink frame and header bar, the code in
// orange (R02, R04), Plex Sans title, Plex Mono lines. Glyphs are white on transparent, so one
// texture serves ink-on-concrete and paper-on-asphalt through the material or instance colour.
import * as THREE from "three";
import { loadBoardFonts, type BoardFonts } from "../street/boardArt";
import type { Chapter, Role } from "./data";

const INK = "#111111";
const PAPER = "#f3f2ed";
const GRAPHITE = "#5d5d58";
const ORANGE = "#ff4f00";

export type Item = { id: string; w: number; h: number; draw: (g: CanvasRenderingContext2D, w: number, h: number, f: BoardFonts) => void };
/** uv offset (x, y) and size (z, w) inside the atlas, for a quad's 0..1 uvs. */
export type Rect = [number, number, number, number];
export type Atlas = { texture: THREE.CanvasTexture; rect: (id: string) => Rect; aspect: (id: string) => number };

/** Shelf-packs the items into one power-of-two canvas, 2 px apart, and draws them. */
function pack(items: Item[], fonts: BoardFonts, width = 2048): Atlas {
  const sorted = [...items].sort((a, b) => b.h - a.h);
  const pos = new Map<string, [number, number, number, number]>();
  let x = 0;
  let y = 0;
  let row = 0;
  for (const it of sorted) {
    if (x + it.w > width) {
      x = 0;
      y += row + 2;
      row = 0;
    }
    pos.set(it.id, [x, y, it.w, it.h]);
    x += it.w + 2;
    row = Math.max(row, it.h);
  }
  const height = 2 ** Math.ceil(Math.log2(y + row));
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const g = c.getContext("2d")!;
  for (const it of items) {
    const [px, py, w, h] = pos.get(it.id)!;
    g.save();
    g.translate(px, py);
    g.beginPath();
    g.rect(0, 0, w, h);
    g.clip();
    it.draw(g, w, h, fonts);
    g.restore();
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return {
    texture,
    rect: (id) => {
      const p = pos.get(id);
      if (!p) return [0, 0, 0, 0];
      return [p[0] / width, 1 - (p[1] + p[3]) / height, p[2] / width, p[3] / height];
    },
    aspect: (id) => {
      const p = pos.get(id);
      return p ? p[2] / p[3] : 1;
    },
  };
}

/** Builds the atlas once the fonts are in (never with a fallback face). */
export async function buildAtlas(items: Item[]) {
  const fonts = await loadBoardFonts();
  return pack(items, fonts);
}

// ---------------------------------------------------------------- drawing

/** Sets the font and shrinks it until `text` fits `maxW`. Returns the size used. */
function fit(g: CanvasRenderingContext2D, text: string, weight: number, size: number, family: string, maxW: number, spacing = 0) {
  let s = size;
  for (;;) {
    g.font = `${weight} ${s}px ${family}`;
    g.letterSpacing = `${Math.round(s * spacing)}px`;
    if (g.measureText(text).width <= maxW || s <= 8) return s;
    s = Math.floor(s * 0.94);
  }
}

/**
 * A role's card: ink header bar with the code (orange) and the dates, the title, then up to two
 * lines. `w`:`h` is 2:1. An ongoing role gets the live status dot.
 */
export function cardItem(id: string, r: Role, w = 512, h = 256): Item {
  return {
    id,
    w,
    h,
    draw: (g, W, H, f) => {
      const pad = Math.round(H * 0.075);
      const bar = Math.round(H * 0.23);
      const line = Math.max(4, Math.round(H * 0.025));
      g.fillStyle = PAPER;
      g.fillRect(0, 0, W, H);
      g.fillStyle = INK;
      g.fillRect(0, 0, W, bar);
      g.lineWidth = line * 2;
      g.strokeStyle = INK;
      g.strokeRect(0, 0, W, H);
      g.textBaseline = "middle";
      // header: code left (orange), dates right (paper)
      g.fillStyle = ORANGE;
      fit(g, r.code, 600, Math.round(bar * 0.56), f.mono, W * 0.2);
      g.textAlign = "left";
      g.fillText(r.code, pad, bar / 2 + 1);
      const codeW = g.measureText(r.code).width;
      g.fillStyle = PAPER;
      const dw = W - pad * 2 - codeW - pad;
      fit(g, r.dates, 600, Math.round(bar * 0.42), f.mono, dw - (r.ongoing ? bar * 0.4 : 0), 0.02);
      g.textAlign = "right";
      g.fillText(r.dates, W - pad, bar / 2 + 1);
      if (r.ongoing) {
        const tw = g.measureText(r.dates).width;
        g.fillStyle = ORANGE;
        g.beginPath();
        g.arc(W - pad - tw - bar * 0.24, bar / 2, bar * 0.11, 0, Math.PI * 2);
        g.fill();
      }
      // title, then the lines
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      g.fillStyle = INK;
      const ts = fit(g, r.title, 600, Math.round(H * 0.21), f.sans, W - pad * 2, 0.01);
      const ty = bar + pad + ts * 0.82;
      g.fillText(r.title, pad, ty);
      let ly = ty + pad * 0.6;
      r.lines.slice(0, 2).forEach((t, i) => {
        g.fillStyle = i ? GRAPHITE : INK;
        const s = fit(g, t, i ? 500 : 600, Math.round(H * (i ? 0.095 : 0.11)), f.mono, W - pad * 2, 0.02);
        ly += s * 1.15;
        g.fillText(t, pad, ly);
      });
    },
  };
}

/** A chapter board (ink face): the sector code in orange, the place, the story's own title. */
export function chapterItem(id: string, c: Chapter, w = 1024, h = 224): Item {
  return {
    id,
    w,
    h,
    draw: (g, W, H, f) => {
      const pad = Math.round(H * 0.12);
      g.fillStyle = INK;
      g.fillRect(0, 0, W, H);
      g.textBaseline = "alphabetic";
      g.textAlign = "left";
      g.fillStyle = ORANGE;
      const cs = fit(g, c.code, 600, Math.round(H * 0.42), f.mono, W * 0.2);
      g.fillText(c.code, pad, pad + cs * 0.8);
      const cw = g.measureText(c.code).width;
      g.fillStyle = PAPER;
      fit(g, c.place, 600, Math.round(H * 0.42), f.sans, W * 0.55, 0.04);
      g.fillText(c.place, pad + cw + pad, pad + cs * 0.8);
      g.textAlign = "right";
      g.fillStyle = PAPER;
      fit(g, c.years.toUpperCase(), 600, Math.round(H * 0.2), f.mono, W * 0.3);
      g.fillText(c.years.toUpperCase(), W - pad, pad + cs * 0.8);
      g.textAlign = "left";
      g.fillStyle = "#b9b6ab";
      const ss = fit(g, c.title, 400, Math.round(H * 0.2), f.sans, W - pad * 2);
      g.fillText(c.title, pad, H - pad - ss * 0.15);
      g.fillStyle = ORANGE;
      g.fillRect(0, H - Math.round(H * 0.04), W, Math.round(H * 0.04));
    },
  };
}

/** White text on transparent (tinted by its material). `align` sets where the text sits in the cell. */
export function glyphItem(id: string, text: string, opts: { mono?: boolean; w?: number; h?: number; weight?: number; align?: CanvasTextAlign; spacing?: number } = {}): Item {
  const { mono = true, h = 128, weight = 600, align = "center", spacing = 0.02 } = opts;
  const w = opts.w ?? Math.max(64, Math.ceil((text.length * 0.66 + 0.4) * h * 0.8));
  return {
    id,
    w,
    h,
    draw: (g, W, H, f) => {
      g.clearRect(0, 0, W, H);
      g.fillStyle = "#ffffff";
      g.textBaseline = "middle";
      g.textAlign = align;
      fit(g, text, weight, Math.round(H * 0.8), mono ? f.mono : f.sans, W - H * 0.2, spacing);
      g.fillText(text, align === "left" ? H * 0.1 : align === "right" ? W - H * 0.1 : W / 2, H * 0.54);
    },
  };
}

/** A row label for the datasheet (C): code, title, and its first line under it, white on transparent. */
export function rowItem(id: string, r: Role, w = 1024, h = 192): Item {
  return {
    id,
    w,
    h,
    draw: (g, W, H, f) => {
      g.clearRect(0, 0, W, H);
      g.fillStyle = "#ffffff";
      g.textBaseline = "alphabetic";
      g.textAlign = "left";
      const pad = H * 0.08;
      const cs = fit(g, r.code, 600, Math.round(H * 0.4), f.mono, W * 0.14);
      g.fillText(r.code, pad, H * 0.5);
      const x = pad + W * 0.15;
      fit(g, r.title, 600, Math.round(H * 0.4), f.sans, W - x - pad, 0.03);
      g.fillText(r.title, x, H * 0.5);
      fit(g, r.lines[0] ?? "", 600, Math.round(H * 0.26), f.mono, W - x - pad, 0.02);
      g.fillText(r.lines[0] ?? "", x, H * 0.5 + cs * 0.85);
    },
  };
}
