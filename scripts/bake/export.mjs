// Step 1 of the light bake: the static world out of the running game, one GLB per area chunk.
// Drives components/world/bake/export.ts (window.__bake, dev only) in a tab of the shared headless
// browser. Needs the dev server (npx next dev -p 3100).
//
//   node scripts/bake/export.mjs [workDir] [url]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openTab, sleep } from "./cdp.mjs";

export async function exportWorld(work, base = "http://localhost:3100/") {
  mkdirSync(work, { recursive: true });
  // look=current: the export must see the world's own geometry, never an earlier bake laid over it
  const url = base + (base.includes("?") ? "&" : "?") + "skip&quality=low&look=current";
  const t = await openTab({ gpu: true });
  try {
    await t.navigate(url);
    await t.waitFor("!!window.__bake", 180000);
    // the trees' registry and the deferred parts settle
    await sleep(15000);
    const r = await t.evaluate("window.__bake.export()");
    const chunks = [];
    for (let i = 0; i < r.chunks.length; i++) {
      const c = r.chunks[i];
      const b64 = await t.evaluate(`window.__bake.chunk(${i})`);
      const file = join(work, `${c.name}.glb`);
      writeFileSync(file, Buffer.from(b64, "base64"));
      chunks.push({ name: c.name, file, receivers: c.receivers, tris: c.tris, occluderTris: c.occluderTris, area: c.area, list: c.list });
      console.log(`export ${c.name}: ${c.receivers} receivers, ${c.tris} tris, ${Math.round(c.area)} m², ${c.occluderTris} occluder tris`);
    }
    const errors = t.logs.filter((l) => !/THREE\.Clock|deprecated parameters/.test(l));
    if (errors.length) console.log(errors.slice(0, 10).join("\n"));
    const out = { stats: r.stats, chunks };
    writeFileSync(join(work, "export.json"), JSON.stringify(out, null, 1));
    return out;
  } finally {
    await t.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [work = join(tmpdir(), "hg-bake"), url] = process.argv.slice(2);
  await exportWorld(work, url);
}
