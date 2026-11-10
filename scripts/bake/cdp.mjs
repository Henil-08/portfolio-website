// A tab in the shared headless Chrome that scripts/shoot.mjs keeps (AGENTS.md browser rules: one
// browser, muted, closed after; it quits itself after 3 idle minutes). If none is running, a no-op
// shoot.mjs run starts it with its watchdog. Used by scripts/bake/export.mjs.
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { utimesSync, existsSync, closeSync, openSync } from "node:fs";

const PORTS = { sw: 9411, gpu: 9412 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function alive(port) {
  try {
    return (await fetch(`http://127.0.0.1:${port}/json/version`)).ok;
  } catch {
    return false;
  }
}

/** Opens a tab (GPU browser by default) and returns { send, evaluate, close, logs }. */
export async function openTab({ gpu = true, width = 1280, height = 800, init } = {}) {
  const mode = gpu ? "gpu" : "sw";
  const port = PORTS[mode];
  if (!(await alive(port))) {
    spawnSync(process.execPath, ["scripts/shoot.mjs", join(tmpdir(), "hg-bake-boot"), "wait:10", "320", "200", "about:blank"], {
      env: { ...process.env, GPU: gpu ? "1" : "0" },
      stdio: "ignore",
    });
  }
  // keep the shared browser's idle watchdog from closing it under us
  const stamp = join(tmpdir(), `hg-shoot-${mode}`, "last-used");
  const touch = () => {
    try {
      if (!existsSync(stamp)) closeSync(openSync(stamp, "w"));
      const t = new Date();
      utimesSync(stamp, t, t);
    } catch {}
  };
  touch();
  const keep = setInterval(touch, 20000);
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
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      const id = ++n;
      pending.set(id, r);
      ws.send(JSON.stringify({ id, method, params }));
    });
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  if (init) await send("Page.addScriptToEvaluateOnNewDocument", { source: init });
  const evaluate = async (expression) => {
    const m = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (m.result?.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description ?? m.result.exceptionDetails.text);
    return m.result?.result?.value;
  };
  const waitFor = async (expression, ms = 120000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await evaluate(expression).catch(() => false)) return true;
      await sleep(500);
    }
    throw new Error(`timed out waiting for ${expression}`);
  };
  const close = async () => {
    clearInterval(keep);
    touch();
    try {
      ws.close();
      await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`);
    } catch {}
  };
  return { send, evaluate, waitFor, close, logs, navigate: (url) => send("Page.navigate", { url }) };
}

export { sleep };
