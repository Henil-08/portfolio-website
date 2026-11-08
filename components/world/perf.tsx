"use client";

// The perf probe (docs/research/performance.md): with ?perf in the URL, in any build, the page
// exposes window.__perf for scripts/perf.mjs, which drives a fixed lap (scripts/drive.js) and
// reads frame times, draw calls, memory and the quality tier per browser and device. Without
// ?perf nothing here is mounted.
//
//   __perf.stage()                 { stage, phase, revealed, bootMs, worldMs }
//   __perf.scene("night", "rain")  jumps the clock and the weather
//   __perf.start() / __perf.stop() samples every frame in between; stop() returns the stats
//   __perf.info()                  what is drawn and held right now
import { useEffect } from "react";
import { addAfterEffect, addEffect, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getState, setState } from "./store";
import { opening } from "./bloom/state";

export const PERF = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("perf");

type Sample = { dt: number; cpu: number; calls: number; tris: number };

const rec = {
  on: false,
  last: 0,
  /** when this frame's work began (r3f's before-effects), for the main-thread cost of a frame */
  begin: 0,
  cpu: 0,
  samples: [] as Sample[],
  longTasks: [] as number[],
  bootMs: 0,
  worldMs: 0,
};

const pct = (a: number[], p: number) => (a.length ? a[Math.min(a.length - 1, Math.floor((a.length - 1) * p))] : 0);
const r1 = (x: number) => Math.round(x * 10) / 10;

/** Rough GPU memory held by what the scene draws: unique buffers, textures, the framebuffer and the shadow map. */
function gpuEstimate(gl: THREE.WebGLRenderer, scene: THREE.Scene) {
  const geos = new Set<THREE.BufferGeometry>();
  const texs = new Set<THREE.Texture>();
  const addTex = (v: unknown) => {
    if (v && (v as THREE.Texture).isTexture) texs.add(v as THREE.Texture);
  };
  let shadow = 0;
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) geos.add(m.geometry);
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    for (const mat of mats) {
      for (const v of Object.values(mat)) addTex(v);
      const u = (mat as THREE.ShaderMaterial).uniforms;
      if (u) for (const x of Object.values(u)) addTex(x?.value);
    }
    const l = o as THREE.DirectionalLight;
    if (l.isLight && l.castShadow && l.shadow) shadow += l.shadow.mapSize.x * l.shadow.mapSize.y * 4;
  });
  if (scene.environment) texs.add(scene.environment);
  let geo = 0;
  for (const g of geos) {
    for (const a of Object.values(g.attributes)) geo += (a as THREE.BufferAttribute).array?.byteLength ?? 0;
    if (g.index) geo += g.index.array.byteLength;
    if ((g as THREE.InstancedBufferGeometry).isInstancedBufferGeometry) continue;
  }
  scene.traverse((o) => {
    const im = o as THREE.InstancedMesh;
    if (im.isInstancedMesh) geo += im.instanceMatrix.array.byteLength + (im.instanceColor?.array.byteLength ?? 0);
  });
  let tex = 0;
  for (const t of texs) {
    const img = t.image as { width?: number; height?: number; data?: ArrayBufferView } | undefined;
    if (!img) continue;
    if (img.data && !(t as THREE.CubeTexture).isCubeTexture) tex += img.data.byteLength * (t.generateMipmaps ? 1.33 : 1);
    else if (img.width && img.height) tex += img.width * img.height * 4 * ((t as THREE.CubeTexture).isCubeTexture ? 6 : 1) * (t.generateMipmaps ? 1.33 : 1);
  }
  const size = gl.getDrawingBufferSize(new THREE.Vector2());
  const fb = size.x * size.y * 8;
  return { mb: r1((geo + tex + fb + shadow) / 1048576), geoMb: r1(geo / 1048576), texMb: r1(tex / 1048576), fbMb: r1(fb / 1048576), shadowMb: r1(shadow / 1048576) };
}

/** Wires window.__perf to this renderer; returns the teardown. */
function setup(gl: THREE.WebGLRenderer, scene: THREE.Scene) {
  // read whole frames (shadow pass, scene and every post pass) instead of the last render call
  gl.info.autoReset = false;
  let obs: PerformanceObserver | null = null;
  try {
    obs = new PerformanceObserver((l) => {
      if (rec.on) for (const e of l.getEntries()) rec.longTasks.push(e.duration);
    });
    obs.observe({ type: "longtask", buffered: false });
  } catch {
    obs = null; // Firefox and Safari have no long task timing
  }
  const t0 = performance.timeOrigin;
  // the main thread's share of a frame: every useFrame, the physics step and the GL calls of
  // every pass (the GPU's own time is not in it)
  const offBefore = addEffect(() => {
    rec.begin = performance.now();
  });
  const offAfter = addAfterEffect(() => {
    rec.cpu = performance.now() - rec.begin;
  });
  const unsub = setInterval(() => {
    const st = opening.get().stage;
    if (!rec.bootMs && (st === "select" || getState().phase === "world")) rec.bootMs = performance.now();
    if (!rec.worldMs && getState().phase === "world" && getState().revealed) rec.worldMs = performance.now();
  }, 50);
  const w = window as unknown as { __perf: object };
  w.__perf = {
    t0,
    stage: () => ({ stage: opening.get().stage, phase: getState().phase, revealed: getState().revealed, bootMs: Math.round(rec.bootMs), worldMs: Math.round(rec.worldMs) }),
    scene: (time: "day" | "golden" | "night", weather: "clear" | "rain" | "snow") => setState({ scene: { time, weather } }),
    start: () => {
      rec.samples = [];
      rec.longTasks = [];
      rec.last = 0;
      rec.on = true;
    },
    stop: () => {
      rec.on = false;
      const s = rec.samples.slice(2); // the first frames still carry the call's own delay
      const dts = s.map((x) => x.dt).sort((a, b) => a - b);
      const cpus = s.map((x) => x.cpu).sort((a, b) => a - b);
      const mean = dts.reduce((a, b) => a + b, 0) / Math.max(1, dts.length);
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      return {
        frames: dts.length,
        fps: r1(1000 / mean),
        mean: r1(mean),
        p50: r1(pct(dts, 0.5)),
        p95: r1(pct(dts, 0.95)),
        p99: r1(pct(dts, 0.99)),
        max: r1(dts[dts.length - 1] ?? 0),
        cpu: r1(cpus.reduce((a, b) => a + b, 0) / Math.max(1, cpus.length)),
        cpu95: r1(pct(cpus, 0.95)),
        cpuMax: r1(cpus[cpus.length - 1] ?? 0),
        over33: dts.filter((d) => d > 33.4).length,
        over50: dts.filter((d) => d > 50).length,
        calls: Math.round(s.reduce((a, x) => a + x.calls, 0) / Math.max(1, s.length)),
        tris: Math.round(s.reduce((a, x) => a + x.tris, 0) / Math.max(1, s.length)),
        longTasks: rec.longTasks.length,
        longTaskMs: Math.round(rec.longTasks.reduce((a, b) => a + b, 0)),
        heapMb: mem ? r1(mem.usedJSHeapSize / 1048576) : null,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length ?? 0,
        gpu: gpuEstimate(gl, scene),
        dpr: gl.getPixelRatio(),
      };
    },
    info: () => ({ geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, programs: gl.info.programs?.length ?? 0, gpu: gpuEstimate(gl, scene), dpr: gl.getPixelRatio(), renderer: rendererName(gl) }),
  };
  return () => {
    obs?.disconnect();
    offBefore();
    offAfter();
    clearInterval(unsub);
    gl.info.autoReset = true;
  };
}

export function PerfProbe() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => setup(gl, scene), [gl, scene]);

  useFrame(() => {
    const now = performance.now();
    if (rec.on) {
      if (rec.last) rec.samples.push({ dt: now - rec.last, cpu: rec.cpu, calls: gl.info.render.calls, tris: gl.info.render.triangles });
      rec.last = now;
    }
    resetInfo(gl);
  });

  return null;
}

const resetInfo = (gl: THREE.WebGLRenderer) => gl.info.reset();

function rendererName(gl: THREE.WebGLRenderer) {
  try {
    const c = gl.getContext();
    const ext = c.getExtension("WEBGL_debug_renderer_info");
    return ext ? String(c.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(c.getParameter(c.RENDERER));
  } catch {
    return "?";
  }
}
