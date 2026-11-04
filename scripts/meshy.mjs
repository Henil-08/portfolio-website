// Meshy text-to-3D for the world's models (docs/research/meshy-models.md).
// The route that works: design the model as a concept image first (cheap, easy to redo), then turn
// the approved image into a mesh.
// usage:
//   node scripts/meshy.mjs balance
//   node scripts/meshy.mjs img <id> "<subject>"      concept image (nano-banana-2, 6 credits), brand art direction added;
//                                                    saved to public/models/concepts/<id>.png for /docs/brand/models
//   node scripts/meshy.mjs mesh <id> [image.png] [--tex] [--apose]   image -> 3D from the concept (or the image given):
//                                                    shape only at 2k geometry (25 credits), or --tex textured (30); --apose for rigging
//   node scripts/meshy.mjs multi <id> <front> [side back three]   multi-image -> 3D, textured (30 credits)
//   node scripts/meshy.mjs rig <id> | moves <search> | anim <id> <action_id> <name>   humanoid rig (5), library (free), one animation (3)
//   node scripts/meshy.mjs gen <id> "<prompt>"       text -> 3D shape only (20 credits), the old route
//   node scripts/meshy.mjs get <id>                  re-download a finished task by its logged id
// Raw GLBs land in assets/meshy/<id>.glb; a centred (base at y = 0), welded copy in public/models/<id>.glb.
// Every task is logged in assets/meshy/log.json (id, task, prompt, credits) so nothing is paid for twice.
// The key is MESHY_API_KEY in .env.local (gitignored).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const API = "https://api.meshy.ai/openapi";
/** Art direction for concept images: the world's design language (docs/BRAND.md World). */
const ART =
  "Product design render, three-quarter view, whole object in frame, plain light warm-grey studio background, soft even studio light, no text, no logos, no people unless asked. Design language: Dieter Rams / Swiss industrial design, crisp hard-surface faceted forms with sharp chamfered edges and flat planes, matte surfaces only: off-white paper #f3f2ed, matte black ink #151515, warm grey concrete #d9d6ce, and exactly one small international-orange #ff4f00 accent. Precise, calm, premium, architectural-model quality, not cartoony, not toy-like.";
const STYLE =
  "low-poly faceted hard-surface model, flat planar faces, crisp chamfered edges, no fillets, no organic noise, matte, single solid light grey colour, untextured, architectural maquette look, clean silhouette, centred on a flat base, no text, no logos";
const KEY = (readFileSync(".env.local", "utf8").match(/^MESHY_API_KEY=(.+)$/m) ?? [])[1]?.trim();
if (!KEY) throw new Error("MESHY_API_KEY missing from .env.local");
const LOG = "assets/meshy/log.json";
mkdirSync("assets/meshy", { recursive: true });
mkdirSync("public/models", { recursive: true });
const log = existsSync(LOG) ? JSON.parse(readFileSync(LOG, "utf8")) : {};

const call = async (path, init = {}) => {
  const r = await fetch(API + path, { ...init, headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...init.headers } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
};
const balance = async () => (await call("/v1/balance")).balance;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function poll(path, id) {
  let t;
  for (;;) {
    t = await call(path);
    if (["SUCCEEDED", "FAILED", "CANCELED"].includes(t.status)) break;
    process.stdout.write(`\r${id} ${t.status} ${t.progress ?? 0}%   `);
    await sleep(4000);
  }
  console.log(`\r${id} ${t.status}          `);
  if (t.status !== "SUCCEEDED") throw new Error(JSON.stringify(t.task_error));
  return t;
}

async function fetchModel(id, task, kind = "v2/text-to-3d") {
  let t;
  for (;;) {
    t = await call(`/${kind}/${task}`);
    if (["SUCCEEDED", "FAILED", "CANCELED"].includes(t.status)) break;
    process.stdout.write(`\r${id} ${t.status} ${t.progress ?? 0}%   `);
    await sleep(5000);
  }
  console.log(`\r${id} ${t.status}          `);
  if (t.status !== "SUCCEEDED") throw new Error(JSON.stringify(t.task_error));
  const raw = `assets/meshy/${id}.glb`;
  writeFileSync(raw, Buffer.from(await (await fetch(t.model_urls.glb)).arrayBuffer()));
  if (t.thumbnail_url) writeFileSync(`assets/meshy/${id}.png`, Buffer.from(await (await fetch(t.thumbnail_url)).arrayBuffer()));
  // base at y = 0, centred in x/z, duplicate vertices welded
  const mid = join(tmpdir(), `${id}-c.glb`);
  execFileSync("npx", ["-y", "@gltf-transform/cli", "center", raw, mid, "--pivot", "below"], { stdio: "ignore" });
  execFileSync("npx", ["-y", "@gltf-transform/cli", "weld", mid, `public/models/${id}.glb`], { stdio: "ignore" });
  console.log(`saved public/models/${id}.glb`);
}

const save = (id, entry) => {
  log[id] = { ...log[id], ...entry };
  writeFileSync(LOG, JSON.stringify(log, null, 2) + "\n");
};

const [cmd, id, prompt] = process.argv.slice(2);
if (cmd === "balance") console.log(await balance());
else if (cmd === "img") {
  if (!id || !prompt) throw new Error('img <id> "<subject>"');
  const before = await balance();
  const { result: task } = await call("/v1/text-to-image", { method: "POST", body: JSON.stringify({ ai_model: "nano-banana-2", prompt: `${prompt}. ${ART}`, aspect_ratio: "1:1" }) });
  const t = await poll(`/v1/text-to-image/${task}`, id);
  mkdirSync("public/models/concepts", { recursive: true });
  writeFileSync(`public/models/concepts/${id}.png`, Buffer.from(await (await fetch(t.image_urls[0])).arrayBuffer()));
  const spent = before - (await balance());
  save(id, { concept: { task, prompt, credits: spent, at: new Date().toISOString() } });
  console.log(`saved public/models/concepts/${id}.png · ${spent} credits`);
} else if (cmd === "mesh") {
  if (!id) throw new Error("mesh <id> [image.png]");
  if (log[id]?.mesh) throw new Error(`${id} already meshed (task ${log[id].mesh.task}); delete log entry to redo`);
  const flags = process.argv.slice(4);
  const tex = flags.includes("--tex");
  const pose = flags.includes("--apose") ? "a-pose" : "";
  const src = prompt && !prompt.startsWith("--") ? prompt : `public/models/concepts/${id}.png`;
  const uri = `data:image/png;base64,${readFileSync(src).toString("base64")}`;
  const before = await balance();
  const { result: task } = await call("/v1/image-to-3d", {
    method: "POST",
    body: JSON.stringify({
      image_url: uri,
      ai_model: "latest",
      geometry_resolution: tex ? "standard" : "2k",
      should_texture: tex,
      ...(tex ? { texture_resolution: "2k", remove_lighting: true } : {}),
      pose_mode: pose,
      should_remesh: true,
      topology: "triangle",
      target_polycount: 20000,
    }),
  });
  save(id, { mesh: { task, src, at: new Date().toISOString() } });
  await fetchModel(id, task, "v1/image-to-3d");
  const spent = before - (await balance());
  save(id, { mesh: { ...log[id].mesh, credits: spent } });
  console.log(`${spent} credits`);
}
else if (cmd === "multi") {
  // up to 4 reference images (first = front), textured so the colour-coded parts survive
  const imgs = process.argv.slice(4);
  if (!id || !imgs.length) throw new Error("multi <id> <front.jpg> [more.jpg ...]");
  if (log[id]?.mesh) throw new Error(`${id} already meshed (task ${log[id].mesh.task})`);
  const uris = imgs.slice(0, 4).map((f) => `data:image/${f.endsWith(".png") ? "png" : "jpeg"};base64,${readFileSync(f).toString("base64")}`);
  const before = await balance();
  const { result: task } = await call("/v1/multi-image-to-3d", {
    method: "POST",
    body: JSON.stringify({ image_urls: uris, ai_model: "latest", should_texture: true, texture_resolution: "2k", should_remesh: true, topology: "triangle", target_polycount: 30000, remove_lighting: true }),
  });
  save(id, { mesh: { task, src: imgs, at: new Date().toISOString() } });
  await fetchModel(id, task, "v1/multi-image-to-3d");
  const spent = before - (await balance());
  save(id, { mesh: { ...log[id].mesh, credits: spent } });
  console.log(`${spent} credits`);
}
else if (cmd === "rig") {
  // rig a meshed humanoid (5 credits); the rigged GLB replaces public/models/<id>.glb's source as <id>-rig.glb
  if (!log[id]?.mesh) throw new Error(`mesh ${id} first`);
  const before = await balance();
  const { result: task } = await call("/v1/rigging", { method: "POST", body: JSON.stringify({ input_task_id: log[id].mesh.task, height_meters: 1.78 }) });
  const t = await poll(`/v1/rigging/${task}`, `${id} rig`);
  writeFileSync(`public/models/${id}-rig.glb`, Buffer.from(await (await fetch(t.result.rigged_character_glb_url)).arrayBuffer()));
  save(id, { rig: { task, credits: before - (await balance()) } });
  console.log(`saved public/models/${id}-rig.glb`);
} else if (cmd === "moves") {
  // free: search the animation library, e.g. moves wave
  const r = await call(`/v1/animations/library?search=${encodeURIComponent(id ?? "")}`);
  for (const a of (r.result ?? r).slice?.(0, 30) ?? []) console.log(a.id ?? a.action_id, a.name, a.category ?? "");
} else if (cmd === "anim") {
  // anim <id> <action_id> <name>: one animation on the rig (3 credits) -> public/models/<id>-<name>.glb
  const [, , , , action, name = "anim"] = process.argv;
  if (!log[id]?.rig) throw new Error(`rig ${id} first`);
  const before = await balance();
  const { result: task } = await call("/v1/animations", { method: "POST", body: JSON.stringify({ rig_task_id: log[id].rig.task, action_id: Number(action) }) });
  const t = await poll(`/v1/animations/${task}`, `${id} ${name}`);
  writeFileSync(`public/models/${id}-${name}.glb`, Buffer.from(await (await fetch(t.result.animation_glb_url)).arrayBuffer()));
  save(id, { [`anim-${name}`]: { task, action, credits: before - (await balance()) } });
  console.log(`saved public/models/${id}-${name}.glb`);
}
else if (cmd === "gen") {
  if (!id || !prompt) throw new Error('gen <id> "<prompt>"');
  if (log[id]) throw new Error(`${id} already generated (task ${log[id].task}); use get, or delete it from the log to re-roll`);
  const before = await balance();
  const full = `${prompt}. ${STYLE}`;
  const { result: task } = await call("/v2/text-to-3d", {
    method: "POST",
    body: JSON.stringify({ mode: "preview", prompt: full, topology: "triangle", target_polycount: 6000, should_remesh: true }),
  });
  log[id] = { task, prompt, at: new Date().toISOString() };
  writeFileSync(LOG, JSON.stringify(log, null, 2) + "\n");
  await fetchModel(id, task);
  const after = await balance();
  log[id].credits = before - after;
  writeFileSync(LOG, JSON.stringify(log, null, 2) + "\n");
  console.log(`${before - after} credits, ${after} left`);
} else if (cmd === "get") {
  if (!log[id]) throw new Error(`no task logged for ${id}`);
  await fetchModel(id, log[id].task);
} else console.log("usage: balance | gen <id> \"<prompt>\" | get <id>");
