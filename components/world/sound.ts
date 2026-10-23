"use client";

import { getState } from "./store";

// Real F1 radio notification + pre-rendered radio voice lines, all through WebAudio.
let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function audio() {
  if (getState().muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function load(url: string) {
  let p = buffers.get(url);
  if (!p) {
    p = (async () => {
      const a = audio();
      if (!a) return null;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await a.decodeAudioData(await res.arrayBuffer());
      } catch {
        return null;
      }
    })();
    buffers.set(url, p);
  }
  return p;
}

export function unlockAudio() {
  audio();
  ["/sfx/radio.mp3", "/sfx/ask.mp3", "/sfx/go.mp3", "/sfx/theme.mp3"].forEach(load);
}

// Plays a buffer, optionally through the radio chain (band-pass, drive, compression).
async function play(src: string | AudioBuffer, { radio = false, vol = 1, delay = 0 } = {}) {
  const a = audio();
  if (!a) return 0;
  const buf = typeof src === "string" ? await load(src) : src;
  if (!buf) return 0;
  const node = a.createBufferSource();
  node.buffer = buf;
  const gain = a.createGain();
  gain.gain.value = vol;
  let out: AudioNode = node;
  if (radio) {
    const hp = a.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 380;
    const lp = a.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3300;
    const drive = a.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 2.2);
    }
    drive.curve = curve;
    const comp = a.createDynamicsCompressor();
    comp.threshold.value = -24;
    comp.ratio.value = 8;
    out.connect(hp);
    hp.connect(lp);
    lp.connect(drive);
    drive.connect(comp);
    out = comp;
  }
  out.connect(gain).connect(a.destination);
  node.start(a.currentTime + delay);
  return buf.duration + delay;
}

// The broadcast "radio incoming" sting.
export function radioBeep() {
  return play("/sfx/radio.mp3", { vol: 0.9 });
}

// Pre-rendered engineer lines for the intro. Resolves with the clip length in seconds.
export async function radioLine(name: "ask" | "go") {
  await radioBeep();
  return play(`/sfx/${name}.mp3`, { delay: 0.55 });
}

// Live radio voice for chat replies: Groq Orpheus TTS through the radio chain.
// If the voice endpoint isn't available we stay silent rather than use a robotic browser voice.
export async function radioSpeak(text: string) {
  if (getState().muted) return;
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
    play(buf, { radio: true, delay: 0.55 });
  } catch {}
}

function beep(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.05) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function honk() {
  beep(440, 0, 0.16, "triangle", 0.06);
  beep(554, 0, 0.16, "triangle", 0.05);
}

export function pop() {
  beep(880, 0, 0.06, "sine", 0.04);
  beep(1320, 0.05, 0.08, "sine", 0.03);
}

export function cheer() {
  [523, 659, 784, 1047].forEach((f, i) => beep(f, i * 0.07, 0.16, "sine", 0.04));
}

// Intro theme. Plays /sfx/theme.mp3 if it exists, otherwise stays silent.
let themeGain: GainNode | null = null;
export async function playTheme() {
  const a = audio();
  if (!a) return;
  const buf = await load("/sfx/theme.mp3");
  if (!buf) return;
  const src = a.createBufferSource();
  src.buffer = buf;
  themeGain = a.createGain();
  themeGain.gain.setValueAtTime(0.0001, a.currentTime);
  themeGain.gain.exponentialRampToValueAtTime(0.7, a.currentTime + 0.6);
  src.connect(themeGain).connect(a.destination);
  src.start();
}

export function fadeTheme(seconds = 2.5) {
  const a = ctx;
  if (!a || !themeGain) return;
  themeGain.gain.setTargetAtTime(0.0001, a.currentTime, seconds / 4);
}
