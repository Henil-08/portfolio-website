// 02 Teardown: the drawings on the studio's walls, drawn from the project's own geometry (its
// edges, explode.ts `Rig`): a general-arrangement sheet with three orthographic views (third-angle:
// top over front, right side beside it), overall dimensions in real millimetres, part balloons and
// a title block; an exploded isometric; and the pinned parts list. Paper, ink, one orange.
import * as THREE from "three";
import type { Item } from "@/components/world/garage/anim";
import { WORLD_SCALE } from "@/components/world/scale";
import { pad } from "@/components/brand/tokens";
import { DOMAINS } from "@/content/projects";
import type { Callout, Rig } from "./explode";

const INK = "#151515";
const PAPER = "#f6f5f0";
const ORANGE = "#ff4f00";
const GREY = "#8b8a84";

type F = { mono: string; sans: string };
export const fonts = (): F => {
  const cs = getComputedStyle(document.body);
  return { mono: `${cs.getPropertyValue("--font-plex-mono").trim() || "monospace"}, monospace`, sans: `${cs.getPropertyValue("--font-plex").trim() || "sans-serif"}, sans-serif` };
};

/** A sheet: paper, a double ink border with zone marks along it. */
function frame(g: CanvasRenderingContext2D, W: number, H: number, f: F, zones = true) {
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = INK;
  g.lineWidth = 6;
  g.strokeRect(18, 18, W - 36, H - 36);
  g.lineWidth = 2;
  g.strokeRect(40, 40, W - 80, H - 80);
  if (!zones) return;
  g.font = `500 20px ${f.mono}`;
  g.fillStyle = INK;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const nx = 8, ny = 5;
  for (let i = 0; i < nx; i++) {
    const x = 40 + ((i + 0.5) * (W - 80)) / nx;
    g.fillText(String(i + 1), x, 29);
    g.fillText(String(i + 1), x, H - 29);
    if (i) {
      g.fillRect(40 + (i * (W - 80)) / nx - 1, 18, 2, 22);
      g.fillRect(40 + (i * (W - 80)) / nx - 1, H - 40, 2, 22);
    }
  }
  for (let j = 0; j < ny; j++) {
    const y = 40 + ((j + 0.5) * (H - 80)) / ny;
    g.fillText("ABCDE"[j], 29, y);
    g.fillText("ABCDE"[j], W - 29, y);
  }
}

/** A dimension: extension lines, the arrowed line, the figure over its middle. */
function dim(g: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, off: number, text: string, f: F) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const p = (x: number, y: number, k: number): [number, number] => [x + nx * k, y + ny * k];
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(...p(ax, ay, Math.sign(off) * 6));
  g.lineTo(...p(ax, ay, off + Math.sign(off) * 8));
  g.moveTo(...p(bx, by, Math.sign(off) * 6));
  g.lineTo(...p(bx, by, off + Math.sign(off) * 8));
  const [x0, y0] = p(ax, ay, off);
  const [x1, y1] = p(bx, by, off);
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
  for (const [x, y, s] of [
    [x0, y0, 1],
    [x1, y1, -1],
  ] as const) {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (dx / L) * 14 * s + nx * 4, y + (dy / L) * 14 * s + ny * 4);
    g.lineTo(x + (dx / L) * 14 * s - nx * 4, y + (dy / L) * 14 * s - ny * 4);
    g.closePath();
    g.fillStyle = INK;
    g.fill();
  }
  g.save();
  g.translate((x0 + x1) / 2 + nx * 14 * Math.sign(off), (y0 + y1) / 2 + ny * 14 * Math.sign(off));
  let a = Math.atan2(dy, dx);
  if (a > Math.PI / 2 || a < -Math.PI / 2) a += Math.PI;
  g.rotate(a);
  g.font = `500 22px ${f.mono}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const w = g.measureText(text).width + 10;
  g.fillStyle = PAPER;
  g.fillRect(-w / 2, -13, w, 26);
  g.fillStyle = INK;
  g.fillText(text, 0, 1);
  g.restore();
}

/** A part balloon: a circle with the item number and a leader to the part. */
function balloon(g: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number, n: number, f: F, hot = false) {
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(tx, ty);
  g.lineTo(x, y);
  g.stroke();
  g.fillStyle = INK;
  g.beginPath();
  g.arc(tx, ty, 3.5, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(x, y, 19, 0, Math.PI * 2);
  g.fillStyle = hot ? ORANGE : PAPER;
  g.fill();
  g.stroke();
  g.fillStyle = hot ? "#ffffff" : INK;
  g.font = `600 20px ${f.mono}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(n), x, y + 1);
}

type View = (x: number, y: number, z: number, out: [number, number]) => void;

/** The object's edges through a projection into a box, fitted with one scale; returns the mapping. */
function drawView(g: CanvasRenderingContext2D, rig: Rig, proj: View, cx: number, cy: number, scale: number, explode = false) {
  const s = rig.segs;
  const a: [number, number] = [0, 0], b: [number, number] = [0, 0];
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.lineCap = "round";
  g.beginPath();
  for (let i = 0, k = 0; i < s.length; i += 6, k++) {
    const o = explode ? rig.parts[rig.segPart[k]]?.off : null;
    const ox = o?.x ?? 0, oy = o?.y ?? 0, oz = o?.z ?? 0;
    proj(s[i] + ox, s[i + 1] + oy, s[i + 2] + oz, a);
    proj(s[i + 3] + ox, s[i + 4] + oy, s[i + 5] + oz, b);
    g.moveTo(cx + a[0] * scale, cy - a[1] * scale);
    g.lineTo(cx + b[0] * scale, cy - b[1] * scale);
  }
  g.stroke();
}

const mm = (local: number, s: number) => `${Math.round((local * s * 1000) / WORLD_SCALE)}`;

/**
 * The general-arrangement sheet (W x H px): top, front and right-side views of the assembled
 * object, overall width, height and depth in real mm, a balloon per callout part on the front
 * view, the projection symbol and the title block.
 */
export function drawGA(g: CanvasRenderingContext2D, W: number, H: number, rig: Rig, it: Item, scale: number, f: F) {
  frame(g, W, H, f);
  const size = rig.box.getSize(new THREE.Vector3());
  const c = rig.box.getCenter(new THREE.Vector3());
  // room for views: left 64 %, top view above front, side view right of front
  const areaW = W * 0.62, areaH = H - 200;
  const k = Math.min((areaW - 240) / (size.x + size.z), (areaH - 220) / (size.y + size.z));
  const gap = 90;
  const fx = 120 + (size.x * k) / 2;
  const fy = 140 + size.z * k + gap + (size.y * k) / 2;
  const sx = fx + (size.x * k) / 2 + gap + (size.z * k) / 2;
  const front: View = (x, y, _z, o) => {
    o[0] = x - c.x;
    o[1] = y - c.y;
  };
  const top: View = (x, _y, z, o) => {
    o[0] = x - c.x;
    o[1] = -(z - c.z);
  };
  const side: View = (_x, y, z, o) => {
    o[0] = -(z - c.z);
    o[1] = y - c.y;
  };
  drawView(g, rig, front, fx, fy, k);
  drawView(g, rig, top, fx, fy - (size.y * k) / 2 - gap - (size.z * k) / 2, k);
  drawView(g, rig, side, sx, fy, k);
  g.font = `600 22px ${f.mono}`;
  g.fillStyle = INK;
  g.textAlign = "center";
  g.fillText("FRONT", fx, fy + (size.y * k) / 2 + 92);
  g.fillText("PLAN", fx, fy - (size.y * k) / 2 - gap - size.z * k - 22);
  g.fillText("SIDE", sx, fy + (size.y * k) / 2 + 92);
  // overall dimensions in real millimetres
  const L = fx - (size.x * k) / 2, Rr = fx + (size.x * k) / 2, T = fy - (size.y * k) / 2, Bt = fy + (size.y * k) / 2;
  dim(g, L, Bt, Rr, Bt, 46, mm(size.x, scale), f);
  dim(g, L, Bt, L, T, 46, mm(size.y, scale), f);
  dim(g, sx - (size.z * k) / 2, Bt, sx + (size.z * k) / 2, Bt, 46, mm(size.z, scale), f);
  // balloons on the front view, fanned out above and to the right
  rig.labels.forEach((pi, j) => {
    const p = rig.parts[pi];
    const tx = fx + (p.centre.x - c.x) * k, ty = fy - (p.centre.y - c.y) * k;
    const bx = Math.min(sx + (size.z * k) / 2 + 70, Rr + 120 + j * 10), by = T - 40 + j * ((Bt - T + 60) / Math.max(1, rig.labels.length));
    balloon(g, Math.max(bx, Rr + 70), by, tx, ty, j + 1, f, j === 0);
  });
  // third-angle symbol and the title block
  titleBlock(g, W, H, it, "GENERAL ARRANGEMENT", "NTS · mm", f);
}

/** Bottom-right title block: HG-08 / Pxx, the project's name, what the sheet is, scale, revision. */
function titleBlock(g: CanvasRenderingContext2D, W: number, H: number, it: Item, what: string, sc: string, f: F) {
  const w = Math.min(720, W * 0.42), h = 210, x = W - 40 - w, y = H - 40 - h;
  g.fillStyle = PAPER;
  g.fillRect(x, y, w, h);
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.strokeRect(x, y, w, h);
  const rows = [70, 120, 165];
  for (const r of rows) {
    g.beginPath();
    g.moveTo(x, y + r);
    g.lineTo(x + w, y + r);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(x + w * 0.55, y + 120);
  g.lineTo(x + w * 0.55, y + h);
  g.stroke();
  g.fillStyle = ORANGE;
  g.fillRect(x + 18, y + 20, 30, 30);
  g.fillStyle = INK;
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.font = `600 40px ${f.mono}`;
  g.fillText(`HG-08 / P${pad(it.index + 1)}`, x + 62, y + 37);
  let s = 34;
  g.font = `600 ${s}px ${f.sans}`;
  while (g.measureText(it.p.name).width > w - 36 && s > 18) g.font = `600 ${(s -= 2)}px ${f.sans}`;
  g.fillText(it.p.name, x + 18, y + 96);
  g.font = `500 19px ${f.mono}`;
  g.fillStyle = GREY;
  g.fillText("TITLE", x + 18, y + 136);
  g.fillText("SCALE", x + w * 0.55 + 14, y + 136);
  g.fillText(DOMAINS.find((d) => d.id === it.p.domain)!.label.toUpperCase().slice(0, 30), x + 18, y + 188);
  g.fillText("REV", x + w * 0.55 + 14, y + 188);
  g.fillStyle = INK;
  g.font = `600 21px ${f.mono}`;
  g.fillText(what, x + 18, y + 156);
  g.fillText(sc, x + w * 0.55 + 14, y + 156);
  g.fillText("A · HG", x + w * 0.55 + 70, y + 188);
}

/** The exploded isometric: every part at its exploded place, balloons on the callout parts. */
export function drawIso(g: CanvasRenderingContext2D, W: number, H: number, rig: Rig, it: Item, f: F) {
  frame(g, W, H, f, false);
  const cos = Math.cos(Math.PI / 6), sin = Math.sin(Math.PI / 6);
  const iso: View = (x, y, z, o) => {
    o[0] = (x - z) * cos;
    o[1] = y + (x + z) * sin * 0.5;
  };
  // fit the exploded bounds
  const pts: [number, number][] = [];
  const o: [number, number] = [0, 0];
  const b = rig.apart;
  for (const x of [b.min.x, b.max.x])
    for (const y of [b.min.y, b.max.y])
      for (const z of [b.min.z, b.max.z]) {
        iso(x, y, z, o);
        pts.push([o[0], o[1]]);
      }
  const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1])), maxY = Math.max(...pts.map((p) => p[1]));
  const k = Math.min((W - 260) / (maxX - minX || 1), (H - 260) / (maxY - minY || 1));
  const cx = W / 2 - ((minX + maxX) / 2) * k - 40, cy = H / 2 + ((minY + maxY) / 2) * k + 20;
  drawView(g, rig, iso, cx, cy, k, true);
  rig.labels.forEach((pi, j) => {
    const p = rig.parts[pi];
    iso(p.centre.x + p.off.x, p.centre.y + p.off.y, p.centre.z + p.off.z, o);
    const tx = cx + o[0] * k, ty = cy - o[1] * k;
    balloon(g, W - 120, 120 + j * ((H - 260) / Math.max(1, rig.labels.length - 1 || 1)), tx, ty, j + 1, f, j === 0);
  });
  g.fillStyle = INK;
  g.font = `600 30px ${f.mono}`;
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.fillText(`EXPLODED VIEW · P${pad(it.index + 1)}`, 70, H - 70);
}

/** The pinned parts list: item, part number, description, quantity. */
export function drawParts(g: CanvasRenderingContext2D, W: number, H: number, rig: Rig, it: Item, callouts: Callout[], f: F) {
  frame(g, W, H, f, false);
  g.fillStyle = INK;
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.font = `600 34px ${f.mono}`;
  g.fillText("PARTS LIST", 70, 100);
  g.fillStyle = ORANGE;
  g.fillRect(W - 110, 82, 36, 36);
  g.fillStyle = INK;
  g.font = `500 22px ${f.mono}`;
  g.fillText(`HG-08 / P${pad(it.index + 1)}`, 70, 142);
  const cols = [70, 150, 330, W - 120];
  let y = 200;
  g.fillRect(60, y - 26, W - 120, 3);
  g.font = `600 19px ${f.mono}`;
  ["ITEM", "PART NO", "DESCRIPTION", "QTY"].forEach((h, i) => g.fillText(h, cols[i], y));
  g.fillRect(60, y + 22, W - 120, 2);
  y += 64;
  const rows = rig.labels.map((pi, j) => ({ j, c: callouts[j], qty: 1 + rig.parts.filter((p) => p.rides === pi).length }));
  for (const r of rows) {
    g.fillStyle = r.j === 0 ? ORANGE : INK;
    g.font = `600 22px ${f.mono}`;
    g.fillText(String(r.j + 1), cols[0], y);
    g.fillStyle = INK;
    g.font = `500 20px ${f.mono}`;
    g.fillText(r.c?.code ?? "", cols[1], y);
    let s = 22;
    const t = r.c?.text ?? "";
    g.font = `500 ${s}px ${f.sans}`;
    while (g.measureText(t).width > cols[3] - cols[2] - 24 && s > 13) g.font = `500 ${(s -= 1)}px ${f.sans}`;
    g.fillText(t, cols[2], y);
    g.font = `500 20px ${f.mono}`;
    g.fillText(String(r.qty), cols[3], y);
    g.fillStyle = "#cfcdc4";
    g.fillRect(60, y + 30, W - 120, 2);
    y += 66;
  }
  g.fillStyle = GREY;
  g.font = `500 18px ${f.mono}`;
  g.fillText(`${rig.parts.length} PARTS · ${rig.segs.length / 6} EDGES`, 70, H - 70);
}
