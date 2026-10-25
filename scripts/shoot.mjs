// Headless screenshots of the world (macOS Chrome, software WebGL).
// usage: node scripts/shoot.mjs <outPrefix> "<steps>" [w] [h] [url]
// steps are |-separated, each op:arg — wait:ms | shot:name | down:Code | up:Code | key:Code (tap) | eval:js | media:print
// e.g. node scripts/shoot.mjs /tmp/shots/a "wait:16000|shot:spawn" 1400 850 "http://localhost:3100/?skip"
// Shots land at <outPrefix>-<name>.jpg. Physics runs slow here (low fps): judge looks, not speed.
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const [out, script, w = "1280", h = "800", url = "http://localhost:3100/"] = process.argv.slice(2);
const port = 9400 + Math.floor(Math.random() * 500);
const prof = mkdtempSync(join(tmpdir(), "world-"));
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ["--headless=new", `--remote-debugging-port=${port}`, "--hide-scrollbars", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required", `--user-data-dir=${prof}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 60 && !ws; i++) {
  try { const t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = t.find((x) => x.type === "page" && x.url === "about:blank"); if (p) ws = new WebSocket(p.webSocketDebuggerUrl); } catch {}
  await sleep(250);
}
if (ws.readyState !== 1) await new Promise((r) => ws.addEventListener("open", r));
let n = 0; const pending = new Map(); const logs = [];
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data);
  if (m.method === "Runtime.exceptionThrown") logs.push("EXCEPTION " + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 400));
  if (m.method === "Runtime.consoleAPICalled" && ["error","warning"].includes(m.params.type)) logs.push(m.params.type + " " + m.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300));
  if (pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const id = ++n; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 600 });
if (+w < 600) await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await send("Page.enable");
await send("Page.navigate", { url });
const vk = { KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, Space: 32, Enter: 13, ShiftLeft: 16, KeyR: 82, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39 };
const keyName = { Space: " ", Enter: "Enter", ShiftLeft: "Shift" };
const key = (type, code) => send("Input.dispatchKeyEvent", { type, code, key: keyName[code] ?? code.replace("Key", "").toLowerCase(), windowsVirtualKeyCode: vk[code] ?? 0 });
for (const step of script.split("|")) {
  const [op, ...rest] = step.split(":"); const arg = rest.join(":");
  if (op === "wait") await sleep(+arg);
  if (op === "media") await send("Emulation.setEmulatedMedia", { media: arg }); // media:print checks print styles
  if (op === "down") await key("keyDown", arg);
  if (op === "up") await key("keyUp", arg);
  if (op === "key") { await key("keyDown", arg); await sleep(60); await key("keyUp", arg); }
  if (op === "eval") { const r = await send("Runtime.evaluate", { expression: arg, returnByValue: true }); console.log("eval", JSON.stringify(r.result?.value ?? r.exceptionDetails?.text)); }
  if (op === "shot") {
    await send("Runtime.evaluate", { expression: "document.querySelectorAll('nextjs-portal').forEach(e=>e.remove())" });
    const r = await send("Page.captureScreenshot", { format: "jpeg", quality: 72 });
    writeFileSync(`${out}-${arg}.jpg`, Buffer.from(r.data, "base64"));
  }
}
console.log(logs.length ? [...new Set(logs)].slice(0, 15).join("\n") : "no errors");
chrome.kill(); process.exit(0);
