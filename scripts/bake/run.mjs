// The light bake, one command (docs/ROADMAP.md "Working rules": rebake when the static world
// changes). Lusion's rule (docs/research/art-direction.md): bake what doesn't move.
//
//   npx next dev -p 3100            (if it isn't running already)
//   node scripts/bake/run.mjs       [--only=name,name] [--skip-export] [--url=http://localhost:3100/]
//
// 1. export.mjs: the static world out of the running game (components/world/bake/export.ts), one
//    GLB per area chunk: terrain (planar map), wide (road, long kerbs), and four quadrants.
// 2. bake.py in Blender (headless, one chunk at a time, closed after each): light-map uv, the
//    look=next day light (Effects.tsx SCENES_NEXT, Rig.tsx sun at the day clock, the HDRI in
//    public/env), AO + sun visibility + bounce baked in Cycles, packed into one PNG per chunk.
// 3. Compress to near-lossless WebP (the three channels stay apart) and write public/bake/:
//    <chunk>.webp, <chunk>.uv.bin and manifest.json, which components/world/bake/apply.ts reads.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { exportWorld } from "./export.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? true]));
const WORK = join(tmpdir(), "hg-bake");
const OUT = join(ROOT, "public/bake");
const BLENDER = process.env.BLENDER ?? (existsSync("/Applications/Blender.app/Contents/MacOS/Blender") ? "/Applications/Blender.app/Contents/MacOS/Blender" : "blender");

// ---------------------------------------------------------------- the game's light
const effects = readFileSync(join(ROOT, "components/world/Effects.tsx"), "utf8");
const day = effects.match(/SCENES_NEXT = \{\s*day: \{[^}]*sun: ([\d.]+), sunColor: "(#[0-9a-f]{6})"[^}]*env: ([\d.]+)/i);
if (!day) console.warn("SCENES_NEXT.day not found in Effects.tsx: using the values of 2026-11-09");
const SUN = day ? +day[1] : 3.1;
const SUN_COLOR = day ? day[2] : "#ffecd6";
const ENV = day ? +day[3] : 0.85;
const timeOf = effects.match(/TIME_OF = \{ day: ([\d.]+)/);
const T = timeOf ? +timeOf[1] : 0.24;
// Rig.tsx Sun: the light sits at (cos a * 40, 40 * elev + 8, 14 + sin a * 10) from the car
const a = T * Math.PI * 2;
const elev = Math.max(0.35, Math.abs(Math.sin(a)));
const sunVec = [Math.cos(a) * 40, 40 * elev + 8, 14 + Math.sin(a) * 10];
const len = Math.hypot(...sunVec);
const SUN_DIR = sunVec.map((v) => +(v / len).toFixed(4));
const lin = (h) => [1, 3, 5].map((i) => {
  const c = parseInt(h.slice(i, i + 2), 16) / 255;
  return +(c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4).toFixed(4);
});
const HDRI = join(ROOT, "public/env", readdirOne(join(ROOT, "public/env"), ".hdr"));

function readdirOne(dir, ext) {
  const f = require("node:fs").readdirSync(dir).find((n) => n.endsWith(ext));
  if (!f) throw new Error(`no ${ext} in ${dir}`);
  return f;
}

// texels per metre: the structures at ~0.15 m a texel, the island-wide terrain at ~0.22 m (GPU
// memory: ~6.5 Mpx in all, ~35 MB with mipmaps; download ~5 MB)
const DENSITY = { planar: 4.5, unwrap: 6.5 };
const SAMPLES = { ao: 256, shadow: 64, bounce: 512 };

// ---------------------------------------------------------------- 1. export
mkdirSync(WORK, { recursive: true });
let exp;
if (args["skip-export"] && existsSync(join(WORK, "export.json"))) exp = JSON.parse(readFileSync(join(WORK, "export.json"), "utf8"));
else exp = await exportWorld(WORK, args.url ?? "http://localhost:3100/");
const only = typeof args.only === "string" ? new Set(args.only.split(",")) : null;
const chunks = exp.chunks.filter((c) => !only || only.has(c.name)).sort((x, y) => x.area - y.area);

// ---------------------------------------------------------------- 2. Blender, one chunk at a time
const bakeDir = join(WORK, "out");
mkdirSync(bakeDir, { recursive: true });
for (const c of chunks) {
  const planar = c.name === "terrain";
  const cfg = {
    glb: c.file,
    out: bakeDir,
    name: c.name,
    planar,
    density: planar ? DENSITY.planar : DENSITY.unwrap,
    packing: 0.6,
    maxSize: 2048,
    minSize: 256,
    marginPx: 1.5,
    samples: SAMPLES,
    aoDistance: 2.5,
    aoCurve: 0.8,
    cell: 10,
    angle: 50,
    sun: { dir: SUN_DIR, color: lin(SUN_COLOR), strength: SUN, angle: 2.0 },
    env: { hdri: HDRI, strength: ENV },
  };
  const cfgFile = join(WORK, `${c.name}.cfg.json`);
  writeFileSync(cfgFile, JSON.stringify(cfg));
  const t = Date.now();
  rmSync(join(bakeDir, `${c.name}.json`), { force: true });
  const r = spawnSync(BLENDER, ["-b", "--factory-startup", "--python-exit-code", "1", "--python", join(ROOT, "scripts/bake/bake.py"), "--", cfgFile], { encoding: "utf8", timeout: 30 * 60 * 1000, maxBuffer: 64 << 20 });
  const lines = (r.stdout + r.stderr).split("\n").filter((l) => l.startsWith("[bake") || /Error|Traceback/.test(l));
  console.log(lines.join("\n"));
  if (r.status !== 0 || !existsSync(join(bakeDir, `${c.name}.json`))) throw new Error(`Blender failed on ${c.name}`);
  console.log(`baked ${c.name} in ${((Date.now() - t) / 1000).toFixed(0)} s`);
}

// ---------------------------------------------------------------- 3. compress, manifest
mkdirSync(OUT, { recursive: true });
const prev = existsSync(join(OUT, "manifest.json")) ? JSON.parse(readFileSync(join(OUT, "manifest.json"), "utf8")) : null;
const entries = new Map((prev?.chunks ?? []).map((c) => [c.name, c]));
for (const c of chunks) {
  const meta = JSON.parse(readFileSync(join(bakeDir, `${c.name}.json`), "utf8"));
  const tex = `${c.name}.webp`;
  await sharp(join(bakeDir, `${c.name}.png`)).removeAlpha().webp({ nearLossless: true, quality: 60, effort: 6 }).toFile(join(OUT, tex));
  let uv = null;
  if (!meta.planar) {
    uv = `${c.name}.uv.bin`;
    copyFileSync(join(bakeDir, uv), join(OUT, uv));
  } else rmSync(join(OUT, `${c.name}.uv.bin`), { force: true });
  entries.set(c.name, {
    name: c.name,
    tex,
    size: meta.size,
    bounce: +meta.bounce.toFixed(5),
    planar: meta.planar && meta.planar.map((v) => +v.toFixed(4)),
    uv,
    receivers: meta.receivers.map((r) => [r.id, r.corners, r.verts]),
  });
}
const manifest = {
  version: 1,
  built: new Date().toISOString().slice(0, 10),
  // towards the sun the bake was lit from (three.js axes), and the light it used
  sun: SUN_DIR,
  light: { sun: SUN, sunColor: SUN_COLOR, env: ENV, hdri: HDRI.split("/").pop() },
  chunks: [...entries.values()].sort((x, y) => x.name.localeCompare(y.name)),
};
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest));
let bytes = 0;
for (const c of manifest.chunks) {
  const s = statSync(join(OUT, c.tex)).size + (c.uv ? statSync(join(OUT, c.uv)).size : 0);
  bytes += s;
  console.log(`${c.name.padEnd(8)} ${String(c.size).padStart(5)}²  ${c.receivers.length} meshes  ${(s / 1024).toFixed(0)} KB`);
}
console.log(`public/bake: ${(bytes / 1048576).toFixed(2)} MB`);
