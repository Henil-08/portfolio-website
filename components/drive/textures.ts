import { CanvasTexture, NearestFilter, RepeatWrapping, SRGBColorSpace } from "three";

/**
 * Small canvas-drawn textures, so the scene needs no image or font files.
 * Only call these on the client (they touch `document`).
 */

const RED = "#e10600";
const INK = "#07080a";
const CHALK = "#eceef2";
const AMBER = "#ffc531";

/** next/font exposes the real family name through a CSS variable. */
function displayFont() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-titillium").trim();
  return v ? `${v}, system-ui, sans-serif` : "system-ui, sans-serif";
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { c, ctx };
}

function finish(c: HTMLCanvasElement, nearest = false) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  if (nearest) {
    t.magFilter = NearestFilter;
    t.minFilter = NearestFilter;
  }
  t.anisotropy = 4;
  return t;
}

export function chequerTexture(cols = 16, rows = 2) {
  const size = 16;
  const { c, ctx } = canvas(cols * size, rows * size);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = (x + y) % 2 ? INK : CHALK;
      ctx.fillRect(x * size, y * size, size, size);
    }
  }
  return finish(c, true);
}

/** Car number decal, white digits with a thin red outline on transparent. */
export function numberTexture(text = "08") {
  const { c, ctx } = canvas(256, 256);
  ctx.font = `900 190px ${displayFont()}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 14;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, 128, 140);
  ctx.fillStyle = CHALK;
  ctx.fillText(text, 128, 140);
  return finish(c);
}

/** Broadcast-style gantry board: red lap tag on the left, place and title on the right. */
export function gantryTexture(lap: number, place: string, title: string) {
  const { c, ctx } = canvas(1024, 256);
  const font = displayFont();
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, 250, 256);
  ctx.fillStyle = CHALK;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.font = `700 40px ${font}`;
  ctx.fillText("LAP", 125, 70);
  ctx.font = `900 130px ${font}`;
  ctx.fillText(String(lap), 125, 165);
  ctx.textAlign = "left";
  ctx.font = `900 92px ${font}`;
  ctx.fillText(place.toUpperCase(), 290, 98);
  ctx.fillStyle = "#8a909c";
  ctx.font = `600 40px ${font}`;
  const short = title.length > 38 ? `${title.slice(0, 36)}...` : title;
  ctx.fillText(short, 292, 186);
  // kerb stripe along the bottom
  for (let x = 0; x < 1024; x += 48) {
    ctx.fillStyle = (x / 48) % 2 ? CHALK : RED;
    ctx.fillRect(x, 240, 48, 16);
  }
  return finish(c);
}

/** Plain sign with big text, used for the garage and scenery boards. */
export function signTexture(text: string, bg = INK, fg = CHALK, w = 1024, h = 256) {
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.font = `900 ${Math.round(h * 0.55)}px ${displayFont()}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + h * 0.04);
  return finish(c);
}

/** Amber outlined pit box marking with "PIT" lettering, transparent inside. */
export function pitBoxTexture() {
  const { c, ctx } = canvas(256, 384);
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 14;
  ctx.strokeRect(10, 10, 236, 364);
  ctx.fillStyle = AMBER;
  ctx.font = `900 84px ${displayFont()}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PIT", 128, 192);
  return finish(c);
}

/** Soft radial blob used as a fake contact shadow. */
export function blobTexture() {
  const { c, ctx } = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.75)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return finish(c);
}

/** Mown stripes for the football pitch with white lines. */
export function pitchTexture() {
  const { c, ctx } = canvas(512, 320);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? "#3f7a3a" : "#468642";
    ctx.fillRect(i * 64, 0, 64, 320);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 5;
  ctx.strokeRect(8, 8, 496, 304);
  ctx.beginPath();
  ctx.moveTo(256, 8);
  ctx.lineTo(256, 312);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(256, 160, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(8, 90, 70, 140);
  ctx.strokeRect(434, 90, 70, 140);
  const t = finish(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}
