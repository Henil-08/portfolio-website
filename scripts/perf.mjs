// Perf harness (docs/research/performance.md). Boots the real opening on a production build,
// presses Enter, then drives the same fixed lap (scripts/drive.js) at day, night and rain and
// reads window.__perf (components/world/perf.tsx, on with ?perf) for each: frame times, draw
// calls, triangles, memory, the quality tier. Audio is muted in every engine.
//
//   npx next build && npx next start -p 3160
//   npm i --prefix <dir> playwright && npx --prefix <dir> playwright install firefox webkit
//   PW=<dir> node scripts/perf.mjs <out.json> [configs] [url]
//
// configs (comma-separated, default all): chrome, chrome4x, mobile, firefox, webkit
// Env: SECS (seconds per condition, default 40), CONDS (default day,night,rain,garage; garage is
// the teardown garage, flipping to the next project every 4 s), QUALITY (sets the Settings quality
// before the run: auto, high, balanced, low), SHOTS=<prefix> (stills per condition at two pinned
// cameras, the same poses every run, for before/after comparisons).
// Browser rules (AGENTS.md): headless, muted, 1280x800, one browser per engine reused across its
// configs and always closed. Motion stays on (no reducedMotion): this measures smoothness.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [out = "perf.json", which = "chrome,chrome4x,mobile,firefox,webkit", base = "http://localhost:3160/"] = process.argv.slice(2);
const require = createRequire(join(process.env.PW ?? process.cwd(), "node_modules", "x.js"));
const { chromium, firefox, webkit } = require("playwright");
const SECS = +(process.env.SECS ?? 40);
const CONDS = (process.env.CONDS ?? "day,night,rain,garage").split(",");
const drive = readFileSync(new URL("./drive.js", import.meta.url), "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Silence: a suspended AudioContext never plays, whatever the page asks.
const MUTE = `(() => {
  for (const k of ["AudioContext", "webkitAudioContext"]) {
    const A = window[k];
    if (!A) continue;
    window[k] = class extends A { constructor(o) { super(o); this.suspend(); } resume() { return Promise.resolve(); } };
  }
  HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve(); };
  try { localStorage.setItem("hg-quality", ${JSON.stringify(process.env.QUALITY ?? "")} || localStorage.getItem("hg-quality") || ""); } catch {}
})();`;

const GPU_ARGS = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio", "--autoplay-policy=no-user-gesture-required"];
const CONFIGS = {
  chrome: { engine: chromium, launch: { channel: "chrome", headless: true, args: GPU_ARGS }, ctx: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 } },
  chrome4x: { engine: chromium, throttle: 4, launch: { channel: "chrome", headless: true, args: GPU_ARGS }, ctx: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 } },
  mobile: { engine: chromium, throttle: 4, launch: { channel: "chrome", headless: true, args: GPU_ARGS }, ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
  firefox: { engine: firefox, launch: { headless: true, firefoxUserPrefs: { "media.volume_scale": "0.0", "webgl.force-enabled": true } }, ctx: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 } },
  webkit: { engine: webkit, launch: { headless: true }, ctx: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 } },
};

const browsers = new Map();
async function browserFor(cfg) {
  const key = cfg.engine.name();
  // one browser at a time: the last engine's closes before the next one starts
  for (const [k, b] of browsers) if (k !== key) { await b.close(); browsers.delete(k); }
  if (!browsers.has(key)) browsers.set(key, await cfg.engine.launch(cfg.launch));
  return browsers.get(key);
}

async function run(name) {
  const cfg = CONFIGS[name];
  const browser = await browserFor(cfg);
  const context = await browser.newContext(cfg.ctx);
  await context.addInitScript(MUTE);
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()} ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror ${String(e).slice(0, 240)}`));
  if (cfg.throttle) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: cfg.throttle });
  }
  const url = base + (base.includes("?") ? "&" : "?") + "perf";
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  const res = { name, ua: await page.evaluate(() => navigator.userAgent), errors, conds: {} };
  const until = async (fn, ms) => {
    const end = Date.now() + ms;
    for (;;) {
      const v = await page.evaluate(fn).catch(() => null);
      if (v) return v;
      if (Date.now() > end) return null;
      await sleep(250);
    }
  };
  const sel = await until(() => window.__perf && window.__perf.stage().stage === "select" && window.__perf.stage(), 240000);
  res.bootMs = sel ? sel.bootMs : null;
  res.bootWallMs = Date.now() - t0;
  if (!sel) {
    res.fail = "never reached the garage";
    await page.screenshot({ path: `${out}.${name}.fail.jpg`, type: "jpeg", quality: 70 }).catch(() => {});
    await context.close();
    return res;
  }
  await sleep(800);
  await page.keyboard.press("Enter");
  const w = await until(() => window.__perf.stage().revealed && window.__perf.stage(), 120000);
  res.worldMs = w ? w.worldMs : null;
  res.info = await page.evaluate(() => window.__perf.info());
  await sleep(2500);
  await page.evaluate(drive);
  for (const c of CONDS) {
    if (c === "garage") {
      // the teardown garage: in, then a new project every 4 s (as a visitor flips through them)
      await page.evaluate(() => { window.__qa.stop(); window.__perf.scene("day", "clear"); window.__perf.zone("garage-agents"); });
      await sleep(3500);
      await page.evaluate(() => window.__perf.open("garage-agents"));
      await sleep(7000);
      await page.evaluate(() => window.__perf.start());
      const end = Date.now() + SECS * 1000;
      while (Date.now() < end) {
        await sleep(4000);
        await page.keyboard.press("ArrowRight");
      }
      const st = await page.evaluate(() => window.__perf.stop());
      res.conds[c] = st;
      if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}-${name}-${c}.jpg`, type: "jpeg", quality: 80 });
      await page.keyboard.press("Escape");
      await sleep(4000);
      console.log(name, c, JSON.stringify(st));
      continue;
    }
    const [time, weather] = c === "rain" ? ["day", "rain"] : c === "night" ? ["night", "clear"] : ["day", "clear"];
    await page.evaluate(([t, wx]) => window.__perf.scene(t, wx), [time, weather]);
    await page.evaluate(() => { window.__qa.stop(); window.__placeT(0.02); });
    await sleep(c === "rain" ? 5000 : 2500); // the rain eases in over a few seconds
    await page.evaluate(() => { window.__qa.maxSpeed = 0; window.__qa.lap(220, 0.02); window.__perf.start(); });
    await sleep(SECS * 1000);
    const st = await page.evaluate(() => ({ ...window.__perf.stop(), lapI: window.__qa.i, maxSpeed: Math.round(window.__qa.maxSpeed) }));
    res.conds[c] = st;
    if (process.env.SHOTS) {
      await page.evaluate(() => { window.__qa.stop(); window.__placeT(0.3); });
      await sleep(3000);
      // the chase pose over the car where it stands, and a wide one over the pit and the park
      await page.evaluate(() => { const p = window.__car.pos; window.__cam = [+(p.x + 10.5).toFixed(1), +(p.y + 12.5).toFixed(1), +(p.z + 14).toFixed(1), +p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)]; });
      await sleep(1200);
      await page.screenshot({ path: `${process.env.SHOTS}-${name}-${c}-chase.jpg`, type: "jpeg", quality: 85 });
      await page.evaluate(() => { window.__cam = [30, 40, 60, 0, 0, 0]; });
      await sleep(1200);
      await page.screenshot({ path: `${process.env.SHOTS}-${name}-${c}-wide.jpg`, type: "jpeg", quality: 85 });
      await page.evaluate(() => { window.__cam = null; });
    }
    console.log(name, c, JSON.stringify(st));
  }
  await context.close();
  return res;
}

const all = [];
for (const n of which.split(",")) {
  try {
    all.push(await run(n));
  } catch (e) {
    all.push({ name: n, fail: String(e).slice(0, 400) });
    console.log(n, "FAILED", String(e).slice(0, 400));
  }
  writeFileSync(out, JSON.stringify(all, null, 1));
}
for (const b of browsers.values()) await b.close();
for (const r of all) {
  console.log(`\n${r.name}: boot ${r.bootMs} ms, world ${r.worldMs} ms ${r.fail ?? ""}`);
  for (const [c, s] of Object.entries(r.conds ?? {})) console.log(`  ${c.padEnd(6)} fps ${s.fps} mean ${s.mean} p95 ${s.p95} p99 ${s.p99} max ${s.max} cpu ${s.cpu}/${s.cpu95}/${s.cpuMax} >33ms ${s.over33} calls ${s.calls} tris ${s.tris} heap ${s.heapMb} gpu~${s.gpu.mb}MB dpr ${s.dpr} ${s.quality ? s.quality.mode + '/' + s.quality.tier : ''}`);
  console.log(`  errors: ${r.errors?.length ? [...new Set(r.errors)].slice(0, 8).join(" | ") : "none"}`);
}
