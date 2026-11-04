// Meshy text-to-3D for the world's models (docs/research/meshy-models.md).
// usage:
//   node scripts/meshy.mjs balance
//   node scripts/meshy.mjs gen <id> "<prompt>"   shape-only preview (20 credits), the brand style suffix appended
//   node scripts/meshy.mjs get <id>              re-download a finished task by its logged id
// Raw GLBs land in assets/meshy/<id>.glb; a centred (base at y = 0), welded copy in public/models/<id>.glb.
// Every task is logged in assets/meshy/log.json (id, task, prompt, credits) so nothing is paid for twice.
// The key is MESHY_API_KEY in .env.local (gitignored).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const API = "https://api.meshy.ai/openapi";
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

async function fetchModel(id, task) {
  let t;
  for (;;) {
    t = await call(`/v2/text-to-3d/${task}`);
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

const [cmd, id, prompt] = process.argv.slice(2);
if (cmd === "balance") console.log(await balance());
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
