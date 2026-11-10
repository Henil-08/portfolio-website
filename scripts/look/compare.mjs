// The look=next comparison set (docs/BRAND.md 2026-11-09, components/world/look.ts): the same
// fixed poses, rendered in the current look and in ?look=next at day, dusk, night and rain,
// then laid side by side. Writes every still to <out>/<look>-<pose>-<cond>.jpg, one contact sheet
// per condition (<out>/sheet-<cond>.jpg, current left, next right) and, with PUBLIC=1, the
// review page's images (public/look/<pose>-<cond>-<look>.webp, /docs/brand/look).
//
//   PW=<dir with node_modules/playwright> node scripts/look/compare.mjs <out dir> [base url]
//   base defaults to http://localhost:3100/ (a running dev server or `next start`).
// Browser rules (AGENTS.md): one headless Chrome on the GPU, muted, 1280x800 at DPR 1, closed at
// the end. The HUD is hidden in the stills: this compares the rendering.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const [out = "look-compare", base = "http://localhost:3100/"] = process.argv.slice(2);
const require = createRequire(join(process.env.PW ?? process.cwd(), "node_modules", "x.js"));
const { chromium } = require("playwright");
const sharp = createRequire(import.meta.url)("sharp");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(out, { recursive: true });

const LOOKS = ["current", "next"];
const CONDS = [
  ["day", "day", "clear"],
  ["dusk", "golden", "clear"],
  ["night", "night", "clear"],
  ["rain", "day", "rain"],
];
// Each pose: how to stand the car (in the page) and where the camera goes ([x, y, z, tx, ty, tz]).
const POSES = [
  { id: "chase", name: "Chase start", car: "spawn", cam: `(() => { const p = __car.pos; return [p.x + 10.5, p.y + 12.5, p.z + 14, p.x, p.y - 0.3, p.z]; })()` },
  { id: "straight", name: "Main straight", car: "__placeT(0.02)", cam: `(() => { const p = __car.pos, f = __car.forward; return [p.x - f.x * 9, p.y + 3.2, p.z - f.z * 9, p.x + f.x * 8, p.y + 0.4, p.z + f.z * 8]; })()` },
  { id: "garage", name: "Garage bay, outside", car: `__perf.zone("garage-agents")`, cam: `(() => { const p = __car.pos, f = __car.forward; return [p.x - f.x * 5.5 + f.z * 3, p.y + 2.6, p.z - f.z * 5.5 - f.x * 3, p.x + f.x * 3, p.y + 1.6, p.z + f.z * 3]; })()` },
  { id: "teardown", name: "Teardown, inside", car: "garage" },
  { id: "town", name: "Town", car: "spawn", cam: `[64, 20, -52, 30, 4, -86]` },
  { id: "waterfront", name: "Waterfront", car: "spawn", cam: `[-48, 6, 64, -5, 1.2, 77]` },
  { id: "top", name: "Top view", car: "spawn", cam: `[0, 210, 70, 0, 0, 4]` },
];

const HIDE_HUD = "body * { visibility: hidden !important } canvas, canvas * { visibility: visible !important } nextjs-portal { display: none !important }";

async function shoot(browser, look) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    for (const k of ["AudioContext", "webkitAudioContext"]) {
      const A = window[k];
      if (A) window[k] = class extends A { constructor(o) { super(o); this.suspend(); } resume() { return Promise.resolve(); } };
    }
    HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve(); };
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
  const sep = base.includes("?") ? "&" : "?";
  await page.goto(`${base}${sep}skip&perf&quality=high&look=${look}&cam=current&hud=current&bake=off`, { waitUntil: "load", timeout: 120000 });
  for (let i = 0; i < 240; i++) {
    if (await page.evaluate(() => window.__perf?.stage().revealed && window.__car).catch(() => false)) break;
    await sleep(500);
  }
  await page.addStyleTag({ content: HIDE_HUD });
  // let the boot's AO bake (look=next) and the shaders settle
  await sleep(6000);
  const spawn = await page.evaluate(() => [__car.pos.x, __car.pos.z, Math.atan2(-__car.forward.z, __car.forward.x)]);
  for (const [cond, time, weather] of CONDS) {
    await page.evaluate(([t, w]) => { window.__clockStop = false; window.__perf.scene(t, w); }, [time, weather]);
    await sleep(weather === "rain" ? 6000 : 2500);
    await page.evaluate(() => { window.__clockStop = true; });
    for (const pose of POSES) {
      // the clock can't be held in a production build: jump back to the condition's time before each pose
      await page.evaluate(([t, w]) => window.__perf.scene(t, w), [time, weather]);
      await sleep(1500);
      if (pose.car === "garage") {
        await page.evaluate(() => { window.__cam = null; window.__perf.zone("garage-agents"); });
        await sleep(3000);
        await page.evaluate(() => window.__perf.open("garage-agents"));
        await sleep(7500);
        await page.screenshot({ path: join(out, `${look}-${pose.id}-${cond}.jpg`), type: "jpeg", quality: 90 });
        await page.keyboard.press("Escape");
        await sleep(4500);
        continue;
      }
      if (pose.car === "spawn") await page.evaluate(([x, z, h]) => window.__placeXZ(x, z, h), spawn);
      else await page.evaluate(pose.car);
      await sleep(900);
      await page.evaluate(`window.__cam = ${pose.cam}`);
      await sleep(1300);
      await page.screenshot({ path: join(out, `${look}-${pose.id}-${cond}.jpg`), type: "jpeg", quality: 90 });
    }
    await page.evaluate(() => { window.__cam = null; });
  }
  console.log(look, errors.length ? [...new Set(errors)].slice(0, 6).join(" | ") : "no errors");
  await context.close();
}

const label = (text, w, h = 30) =>
  Buffer.from(`<svg width="${w}" height="${h}"><rect width="100%" height="100%" fill="#111"/><text x="10" y="${h - 10}" font-family="IBM Plex Mono, Menlo, monospace" font-size="15" fill="#fff">${text}</text></svg>`);

async function sheets() {
  const W = 640;
  const H = 400;
  for (const [cond] of CONDS) {
    const rows = [];
    for (const pose of POSES) {
      const tiles = await Promise.all(LOOKS.map((l) => sharp(join(out, `${l}-${pose.id}-${cond}.jpg`)).resize(W, H).toBuffer()));
      rows.push({ pose, tiles });
    }
    const top = 40;
    const rowH = H + 30;
    const comp = [{ input: label(`Look comparison · ${cond} · left: current · right: ?look=next`, W * 2 + 10, 40), left: 0, top: 0 }];
    rows.forEach(({ pose, tiles }, i) => {
      const y = top + i * rowH;
      comp.push({ input: label(`${pose.name} · current`, W), left: 0, top: y });
      comp.push({ input: label(`${pose.name} · next`, W), left: W + 10, top: y });
      comp.push({ input: tiles[0], left: 0, top: y + 30 });
      comp.push({ input: tiles[1], left: W + 10, top: y + 30 });
    });
    await sharp({ create: { width: W * 2 + 10, height: top + rows.length * rowH, channels: 3, background: "#f3f2ed" } })
      .composite(comp)
      .jpeg({ quality: 82 })
      .toFile(join(out, `sheet-${cond}.jpg`));
    console.log("sheet", join(out, `sheet-${cond}.jpg`));
  }
  if (process.env.PUBLIC === "1") {
    mkdirSync("public/look", { recursive: true });
    for (const [cond] of CONDS)
      for (const pose of POSES)
        for (const l of LOOKS) await sharp(join(out, `${l}-${pose.id}-${cond}.jpg`)).resize(960, 600).webp({ quality: 74 }).toFile(`public/look/${pose.id}-${cond}-${l}.webp`);
    console.log("review images in public/look");
  }
}

if (process.env.SHEETS_ONLY !== "1") {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio", "--autoplay-policy=no-user-gesture-required"] });
  try {
    for (const l of LOOKS) await shoot(browser, l);
  } finally {
    await browser.close();
  }
}
await sheets();
