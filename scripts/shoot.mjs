// Headless screenshots of the world (macOS Chrome, software WebGL).
// usage: node scripts/shoot.mjs <outPrefix> "<steps>" [w] [h] [url]
//        node scripts/shoot.mjs --close            close the shared browsers now
// steps are |-separated, each op:arg — wait:ms | shot:name | down:Code | up:Code | key:Code (tap) | eval:js | media:print
// e.g. node scripts/shoot.mjs /tmp/shots/a "wait:16000|shot:spawn" 1280 800 "http://localhost:3100/?skip"
// Shots land at <outPrefix>-<name>.jpg. Physics runs slow here (low fps): judge looks, not speed.
// Env DPR (pixel ratio, default 1) and QUALITY (jpeg 0-100, default 72) for sharp exports.
// Env GPU=1 draws on the Mac's GPU (ANGLE Metal) instead of software GL: 60 fps instead of 1-2, so
// window.__realtime physics and scripts/drive.js can really drive. Audio stays muted either way.
// evalfile:path runs a file's JavaScript in the page (no "|" limits), e.g. evalfile:scripts/drive.js
//
// One browser, reused (AGENTS.md browser rules): every run opens a tab in a shared headless Chrome
// (one for software GL, one for GPU) and closes that tab when it's done. The browser shuts itself
// down after IDLE_S seconds without a run, so nothing is left burning CPU between checks.
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, utimesSync, closeSync, openSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const IDLE_S = 180;
const GPU = process.env.GPU === "1";
const MODES = { sw: 9411, gpu: 9412 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const home = (mode) => join(tmpdir(), `hg-shoot-${mode}`);
const alive = async (port) => {
  try {
    return (await fetch(`http://127.0.0.1:${port}/json/version`)).ok;
  } catch {
    return false;
  }
};

if (process.argv[2] === "--close") {
  for (const port of Object.values(MODES)) {
    try {
      const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      const ws = new WebSocket(webSocketDebuggerUrl);
      await new Promise((r) => ws.addEventListener("open", r));
      ws.send(JSON.stringify({ id: 1, method: "Browser.close" }));
      await sleep(300);
    } catch {}
  }
  console.log("closed");
  process.exit(0);
}

const [out, script, w = "1280", h = "800", url = "http://localhost:3100/"] = process.argv.slice(2);
const mode = GPU ? "gpu" : "sw";
const port = MODES[mode];
const dir = home(mode);
const stamp = join(dir, "last-used");
mkdirSync(dir, { recursive: true });
const touch = () => {
  if (!existsSync(stamp)) closeSync(openSync(stamp, "w"));
  const t = new Date();
  utimesSync(stamp, t, t);
};
touch();

if (!(await alive(port))) {
  const chrome = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      "--hide-scrollbars",
      ...(GPU ? ["--use-angle=metal", "--enable-gpu"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]),
      "--ignore-gpu-blocklist",
      "--autoplay-policy=no-user-gesture-required",
      "--mute-audio",
      // tabs share one browser: keep each tab's frames and timers running while another is in front
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      `--user-data-dir=${join(dir, "profile")}`,
      "about:blank",
    ],
    { stdio: "ignore", detached: true },
  );
  chrome.unref();
  // watchdog: closes the browser once nobody has used it for IDLE_S seconds
  const dog = spawn(
    process.execPath,
    [
      "-e",
      `const fs=require("fs");const s=${JSON.stringify(stamp)};const pid=${chrome.pid};
       const t=setInterval(()=>{let gone=false;try{process.kill(pid,0)}catch{gone=true}
       if(gone){clearInterval(t);return}
       let age=1e9;try{age=(Date.now()-fs.statSync(s).mtimeMs)/1000}catch{}
       if(age>${IDLE_S}){try{process.kill(pid)}catch{};clearInterval(t)}},15000);`,
    ],
    { stdio: "ignore", detached: true },
  );
  dog.unref();
  for (let i = 0; i < 60 && !(await alive(port)); i++) await sleep(250);
}

// a fresh tab for this run
const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let n = 0;
const pending = new Map();
const logs = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.method === "Runtime.exceptionThrown") logs.push("EXCEPTION " + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 400));
  if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type)) logs.push(m.params.type + " " + m.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300));
  if (pending.has(m.id)) {
    pending.get(m.id)(m.result);
    pending.delete(m.id);
  }
});
const send = (method, params = {}) =>
  new Promise((r) => {
    const id = ++n;
    pending.set(id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });
const finish = async (code) => {
  touch();
  try {
    await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`);
  } catch {}
  process.exit(code);
};
process.on("SIGINT", () => finish(130));

try {
  await send("Runtime.enable");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: +(process.env.DPR ?? 1), mobile: +w < 600 });
  if (+w < 600) await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await send("Page.enable");
  await send("Page.navigate", { url });
  const vk = { KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, Space: 32, Enter: 13, ShiftLeft: 16, KeyR: 82, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39 };
  const keyName = { Space: " ", Enter: "Enter", ShiftLeft: "Shift" };
  const key = (type, code) => send("Input.dispatchKeyEvent", { type, code, key: keyName[code] ?? code.replace("Key", "").toLowerCase(), windowsVirtualKeyCode: vk[code] ?? 0 });
  for (const step of script.split("|")) {
    const [op, ...rest] = step.split(":");
    const arg = rest.join(":");
    if (op === "wait") await sleep(+arg);
    if (op === "media") await send("Emulation.setEmulatedMedia", { media: arg }); // media:print checks print styles
    if (op === "down") await key("keyDown", arg);
    if (op === "up") await key("keyUp", arg);
    if (op === "key") {
      await key("keyDown", arg);
      await sleep(60);
      await key("keyUp", arg);
    }
    if (op === "evalfile") {
      const r = await send("Runtime.evaluate", { expression: readFileSync(arg, "utf8"), returnByValue: true });
      console.log("evalfile", JSON.stringify(r.result?.value ?? r.exceptionDetails?.text));
    }
    if (op === "eval") {
      const r = await send("Runtime.evaluate", { expression: arg, returnByValue: true });
      console.log("eval", JSON.stringify(r.result?.value ?? r.exceptionDetails?.text));
    }
    if (op === "shot") {
      await send("Runtime.evaluate", { expression: "document.querySelectorAll('nextjs-portal').forEach(e=>e.remove())" });
      const r = await send("Page.captureScreenshot", { format: "jpeg", quality: +(process.env.QUALITY ?? 72) });
      writeFileSync(`${out}-${arg}.jpg`, Buffer.from(r.data, "base64"));
    }
  }
  console.log(logs.length ? [...new Set(logs)].slice(0, 15).join("\n") : "no errors");
  await finish(0);
} catch (e) {
  console.error(e);
  await finish(1);
}
