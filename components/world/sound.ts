"use client";

import { getState, subscribe } from "./store";

// All audio is WebAudio. Sounds are pre-generated with ElevenLabs into public/sfx
// (see scripts/gen-audio.mjs); live replies use /api/voice.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function audio() {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = getState().muted ? 0 : 1;
      master.connect(ctx.destination);
      // Mute affects everything, smoothly.
      subscribe(() => {
        if (ctx && master) master.gain.setTargetAtTime(getState().muted ? 0 : 1, ctx.currentTime, 0.08);
      });
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function load(name: string) {
  let p = buffers.get(name);
  if (!p) {
    p = (async () => {
      const a = audio();
      if (!a) return null;
      try {
        const res = await fetch(`/sfx/${name}.mp3`);
        if (!res.ok) return null;
        return await a.decodeAudioData(await res.arrayBuffer());
      } catch {
        return null;
      }
    })();
    buffers.set(name, p);
  }
  return p;
}

async function play(name: string | AudioBuffer, { vol = 1, rate = 1, delay = 0, radio = false } = {}) {
  const a = audio();
  if (!a || !master) return 0;
  const buf = typeof name === "string" ? await load(name) : name;
  if (!buf) return 0;
  const src = a.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = a.createGain();
  g.gain.value = vol;
  let node: AudioNode = src;
  if (radio) node = radioChain(a, src);
  node.connect(g).connect(master);
  src.start(a.currentTime + delay);
  return buf.duration / rate + delay;
}

// Band-pass, drive and compression: for live TTS that isn't pre-filtered.
function radioChain(a: AudioContext, input: AudioNode) {
  const hp = a.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 350;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3400;
  const drive = a.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / 1023) * 2 - 1) * 2);
  drive.curve = curve;
  const comp = a.createDynamicsCompressor();
  comp.threshold.value = -24;
  comp.ratio.value = 6;
  input.connect(hp);
  hp.connect(lp);
  lp.connect(drive);
  drive.connect(comp);
  return comp;
}

export function unlockAudio() {
  audio();
  ["sting", "engine", "music-1", "music-2", "boost", "honk", "pop"].forEach((n) => void load(n));
  startMusic();
  startEngine();
}

// ------------------------------------------------------------ music

let musicGain: GainNode | null = null;
let musicStarted = false;
async function startMusic() {
  const a = audio();
  if (!a || !master || musicStarted) return;
  musicStarted = true;
  musicGain = a.createGain();
  musicGain.gain.value = 0.0001;
  musicGain.connect(master);
  musicGain.gain.exponentialRampToValueAtTime(0.22, a.currentTime + 3);
  // Alternate the two loops so it doesn't feel like one short track.
  let i = 0;
  const next = async () => {
    const buf = await load(i++ % 2 ? "music-2" : "music-1");
    if (!buf || !musicGain) return;
    const src = a.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(musicGain);
    src.start();
    src.stop(a.currentTime + buf.duration * 3);
    src.onended = () => void next();
  };
  void next();
}

// ------------------------------------------------------------ engine

let engine: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
async function startEngine() {
  const a = audio();
  if (!a || !master || engine) return;
  const buf = await load("engine");
  if (!buf) return;
  const src = a.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const gain = a.createGain();
  gain.gain.value = 0;
  src.connect(gain).connect(master);
  src.start();
  engine = { src, gain };
}

let lastSkid = 0;
// Called every frame from the world: pitch follows speed, volume follows throttle.
export function engineUpdate(speedKmh: number, throttle: number, boost: boolean, sliding: boolean) {
  const a = ctx;
  if (!a || !engine) return;
  const s = Math.min(speedKmh / 140, 1.3);
  engine.src.playbackRate.setTargetAtTime(0.7 + s * 0.8 + (boost ? 0.08 : 0), a.currentTime, 0.12);
  // Quiet under the music, silent when parked.
  const moving = speedKmh > 3 || throttle > 0;
  engine.gain.gain.setTargetAtTime(moving ? 0.012 + s * 0.035 + throttle * 0.01 : 0, a.currentTime, 0.25);
  if (sliding && a.currentTime - lastSkid > 1.2 && speedKmh > 30) {
    lastSkid = a.currentTime;
    void play("skid", { vol: 0.35 });
  }
}

export function engineIdle() {
  if (ctx && engine) engine.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
}

// ------------------------------------------------------------ radio

export function radioBeep() {
  return play("sting", { vol: 0.7 });
}

// Pre-voiced line from public/sfx (already radio-filtered), after the sting.
export async function radioLine(name: string) {
  const sting = await radioBeep();
  return play(`radio-${name}`, { delay: Math.min(0.5, sting * 0.6) });
}

// Live line (chat replies): ElevenLabs via /api/voice, filtered here. Silent if unavailable.
export async function radioSpeak(text: string) {
  try {
    const res = await fetch("/api/voice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 400) }),
    });
    if (!res.ok) return;
    const a = audio();
    if (!a) return;
    const buf = await a.decodeAudioData(await res.arrayBuffer());
    await radioBeep();
    void play(buf, { radio: true, delay: 0.45 });
  } catch {}
}

// ------------------------------------------------------------ one-shots

export function honk() {
  void play("honk", { vol: 0.6 });
}

export function pop() {
  void play("sting", { vol: 0.35, rate: 1.3 });
}

export function cheer() {
  void play("crowd", { vol: 0.5 });
}

export function bump(strength = 1) {
  void play("bump", { vol: Math.min(0.6, 0.2 * strength) });
}
