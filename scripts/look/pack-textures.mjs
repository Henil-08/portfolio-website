// Packs the look=next micro-textures (docs/BRAND.md 2026-11-09, components/world/look.ts) from
// ambientCG's CC0 1K-JPG downloads into one small tileable WebP per surface family:
// R, G = the tangent normal's x and y (OpenGL convention, 0..1), B = roughness. The shader
// rebuilds z and reads the three planes of a triplanar lookup from this one texture. No colour:
// the palette stays the model's own paint. (KTX2 needs toktx/basisu, which this machine lacks;
// near-lossless WebP keeps the packed channels apart (no chroma subsampling), where lossy WebP's chroma subsampling would not.)
//
//   node scripts/look/pack-textures.mjs <dir with the unzipped ambientCG folders>
// The licence and sources are in public/textures/LICENSE.md.
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const [src] = process.argv.slice(2);
if (!src) throw new Error("usage: node scripts/look/pack-textures.mjs <download dir>");

const SETS = [
  { out: "concrete", id: "Concrete034", size: 512 },
  { out: "asphalt", id: "Asphalt026C", size: 512 },
  { out: "plaster", id: "PaintedPlaster017", size: 256 },
  { out: "metal", id: "Metal009", size: 256 },
];

for (const s of SETS) {
  const base = join(src, s.id, `${s.id}_1K-JPG`);
  const n = await sharp(`${base}_NormalGL.jpg`).resize(s.size, s.size, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer();
  const r = await sharp(`${base}_Roughness.jpg`).resize(s.size, s.size, { kernel: "lanczos3" }).greyscale().raw().toBuffer();
  const px = Buffer.alloc(s.size * s.size * 3);
  let mean = 0;
  for (let i = 0; i < s.size * s.size; i++) {
    px[i * 3] = n[i * 3];
    px[i * 3 + 1] = n[i * 3 + 1];
    px[i * 3 + 2] = r[i];
    mean += r[i];
  }
  const file = `public/textures/${s.out}.webp`;
  const info = await sharp(px, { raw: { width: s.size, height: s.size, channels: 3 } }).webp({ nearLossless: true, quality: 50, effort: 6 }).toFile(file);
  console.log(file, `${(info.size / 1024).toFixed(0)} KB`, "roughness mean", (mean / (s.size * s.size) / 255).toFixed(3));
}
